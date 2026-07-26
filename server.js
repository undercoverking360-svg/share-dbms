const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'items_db.json');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]), 'utf-8');
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}

const localIP = getLocalIP();
const networkUrl = `http://${localIP}:${PORT}`;

function getItemsDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        const items = JSON.parse(data || '[]');
        return items.map(item => {
            if (item.downloadUrl && (item.downloadUrl.includes('localhost') || item.downloadUrl.includes('127.0.0.1'))) {
                item.downloadUrl = item.downloadUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):3000/, networkUrl);
            }
            return item;
        });
    } catch (e) {
        return [];
    }
}

function saveItemsDB(items) {
    fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

const sseClients = new Set();

function broadcastSSE(eventType, data) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        client.write(payload);
    }
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.txt': 'text/plain',
    '.xml': 'text/xml',
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.iso': 'application/x-iso9660-image',
    '.exe': 'application/x-msdownload',
    '.mkv': 'video/x-matroska'
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-File-Size, X-File-Type, X-Item-Id, Range');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname;

    // 1. GET /api/info
    if (pathname === '/api/info' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            localIP: localIP,
            port: PORT,
            networkUrl: networkUrl
        }));
        return;
    }

    // 2. GET /api/events (SSE Stream)
    if (pathname === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('retry: 3000\n\n');
        sseClients.add(res);

        req.on('close', () => {
            sseClients.delete(res);
        });
        return;
    }

    // 3. GET /api/items
    if (pathname === '/api/items' && req.method === 'GET') {
        const items = getItemsDB();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(items));
        return;
    }

    // 4. POST /api/upload-stream (HIGH SPEED DIRECT BINARY STREAMING WITH ZERO DELAY)
    if (pathname === '/api/upload-stream' && req.method === 'POST') {
        const fileName = decodeURIComponent(req.headers['x-file-name'] || 'file.bin');
        const fileSize = parseInt(req.headers['x-file-size'] || '0', 10);
        const fileType = decodeURIComponent(req.headers['x-file-type'] || 'application/octet-stream');
        const itemId = req.headers['x-item-id'] || ('item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

        const ext = path.extname(fileName) || '.bin';
        const fileNameOnDisk = `${itemId}${ext}`;
        const filePathOnDisk = path.join(UPLOADS_DIR, fileNameOnDisk);

        const writeStream = fs.createWriteStream(filePathOnDisk, { highWaterMark: 1024 * 1024 });

        req.pipe(writeStream);

        const finishHandler = () => {
            const itemRecord = {
                id: itemId,
                name: fileName,
                size: fileSize,
                mimeType: fileType,
                category: detectCategory(fileType, fileName),
                filePath: fileNameOnDisk,
                downloadUrl: `${networkUrl}/api/download/${itemId}`,
                timestamp: Date.now(),
                isSnippet: false
            };

            const items = getItemsDB();
            items.unshift(itemRecord);
            saveItemsDB(items);

            broadcastSSE('ADD_ITEM', itemRecord);

            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, item: itemRecord }));
            }
        };

        writeStream.on('finish', finishHandler);

        req.on('end', () => {
            writeStream.end();
        });

        writeStream.on('error', (err) => {
            console.error('Stream Write Error:', err);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Stream write error' }));
            }
        });
        return;
    }

    // 5. POST /api/upload (JSON text / snippet upload)
    if (pathname === '/api/upload' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const itemData = JSON.parse(body);
                const items = getItemsDB();
                itemData.downloadUrl = `${networkUrl}/api/download/${itemData.id}`;

                items.unshift(itemData);
                saveItemsDB(items);

                broadcastSSE('ADD_ITEM', itemData);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, item: itemData }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
        });
        return;
    }

    // 6. GET /api/download/:id (HIGH-SPEED STREAM DOWNLOAD WITH HTTP RANGE SUPPORT FOR MOBILE)
    if (pathname.startsWith('/api/download/') && req.method === 'GET') {
        const id = pathname.replace('/api/download/', '');
        const items = getItemsDB();
        const item = items.find(i => i.id === id);

        if (!item) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 File Not Found</h1>');
            return;
        }

        if (item.filePath) {
            const diskPath = path.join(UPLOADS_DIR, item.filePath);
            if (fs.existsSync(diskPath)) {
                const stat = fs.statSync(diskPath);
                const fileSize = stat.size;
                const ext = path.extname(item.name || diskPath).toLowerCase();
                const contentType = MIME_TYPES[ext] || item.mimeType || 'application/octet-stream';

                // Disable TCP Nagle algorithm for maximum download speed
                if (req.socket) req.socket.setNoDelay(true);

                const range = req.headers.range;
                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = (end - start) + 1;

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': contentType,
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(item.name)}"`
                    });

                    const stream = fs.createReadStream(diskPath, { start, end, highWaterMark: 1024 * 1024 });
                    stream.pipe(res);
                } else {
                    res.writeHead(200, {
                        'Content-Length': fileSize,
                        'Accept-Ranges': 'bytes',
                        'Content-Type': contentType,
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(item.name)}"`
                    });

                    const stream = fs.createReadStream(diskPath, { highWaterMark: 1024 * 1024 });
                    stream.pipe(res);
                }
                return;
            }
        }

        if (item.isSnippet) {
            const contentBuffer = Buffer.from(item.content || '', 'utf-8');
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Length': contentBuffer.length,
                'Content-Disposition': `inline; filename="${encodeURIComponent(item.name)}.txt"`
            });
            res.end(contentBuffer);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>File Data Missing</h1>');
        return;
    }

    // 7. DELETE /api/items/:id
    if (pathname.startsWith('/api/items/') && req.method === 'DELETE') {
        const id = pathname.replace('/api/items/', '');
        let items = getItemsDB();
        const item = items.find(i => i.id === id);

        if (item && item.filePath) {
            const diskPath = path.join(UPLOADS_DIR, item.filePath);
            if (fs.existsSync(diskPath)) {
                try { fs.unlinkSync(diskPath); } catch (e) {}
            }
        }

        items = items.filter(i => i.id !== id);
        saveItemsDB(items);

        broadcastSSE('DELETE_ITEM', { id });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // 8. POST /api/clear
    if (pathname === '/api/clear' && req.method === 'POST') {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
            try { fs.unlinkSync(path.join(UPLOADS_DIR, file)); } catch(e) {}
        }
        saveItemsDB([]);
        broadcastSSE('CLEAR_VAULT', {});

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // STATIC FILES
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content, 'utf-8');
        }
    });
});

function detectCategory(mimeType, filename) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) return 'audio-video';
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml') || mimeType.includes('html') || filename.match(/\.(js|py|html|css|json|cpp|c|cs|java|ts|php|xml)$/i)) return 'code';
    if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('word') || filename.match(/\.(pdf|doc|docx|txt|md)$/i)) return 'document';
    return 'document';
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
===================================================
🚀 VaultPulse High-Speed Download & Upload Server LIVE!
💻 Local PC Access:      http://localhost:${PORT}
📱 Smartphone / Wi-Fi:   ${networkUrl}
===================================================
    `);
});
