/* ==========================================================================
   VaultPulse - Cross-Device Wi-Fi & Local Share Engine v1.5
   ========================================================================== */

(function() {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. WEB AUDIO SYNTHESIZER (Sci-Fi UI Sound Effects)
    // --------------------------------------------------------------------------
    class SoundFX {
        constructor() {
            this.ctx = null;
            this.muted = localStorage.getItem('vaultpulse_muted') === 'true';
            this.updateIcon();
        }

        initContext() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('vaultpulse_muted', this.muted);
            this.updateIcon();
            if (!this.muted) this.playClick();
        }

        updateIcon() {
            const onIcon = document.getElementById('sound-on-icon');
            const offIcon = document.getElementById('sound-off-icon');
            if (onIcon && offIcon) {
                if (this.muted) {
                    onIcon.classList.add('hidden');
                    offIcon.classList.remove('hidden');
                } else {
                    onIcon.classList.remove('hidden');
                    offIcon.classList.add('hidden');
                }
            }
        }

        playUpload() {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        }

        playReceive() {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.setValueAtTime(1040, now + 0.08);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        }

        playDelete() {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        }

        playClick() {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        }
    }

    const sound = new SoundFX();

    // --------------------------------------------------------------------------
    // 2. NETWORK QR CODE GENERATOR (Real Downloadable / Connect Links)
    // --------------------------------------------------------------------------
    function generateSVGQRCode(text) {
        const encodedText = encodeURIComponent(text);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedText}`;
        return `<img src="${qrApiUrl}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 8px;" onerror="this.outerHTML='<div style=\'padding:20px;color:#ff4d6d\'>QR Code creation failed. Text too long.</div>'">`;
    }

    // --------------------------------------------------------------------------
    // 3. INTERACTIVE BACKGROUND CANVAS
    // --------------------------------------------------------------------------
    class ParticleBackground {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.mouse = { x: null, y: null, radius: 140 };
            this.init();
        }

        init() {
            this.resize();
            window.addEventListener('resize', () => this.resize());

            const updateMouse = (x, y) => {
                this.mouse.x = x;
                this.mouse.y = y;
            };

            window.addEventListener('mousemove', (e) => updateMouse(e.clientX, e.clientY));
            window.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) {
                    updateMouse(e.touches[0].clientX, e.touches[0].clientY);
                }
            });
            window.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    updateMouse(e.touches[0].clientX, e.touches[0].clientY);
                }
            });

            this.createParticles();
            this.animate();
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.createParticles();
        }

        createParticles() {
            const count = Math.min(80, Math.floor((this.canvas.width * this.canvas.height) / 14000));
            this.particles = [];
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: (Math.random() - 0.5) * 0.8,
                    radius: Math.random() * 2.2 + 1,
                    color: Math.random() > 0.5 ? 'rgba(0, 242, 254, 0.45)' : 'rgba(127, 0, 255, 0.45)'
                });
            }
        }

        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (let i = 0; i < this.particles.length; i++) {
                let p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();

                if (this.mouse.x !== null) {
                    let mdx = p.x - this.mouse.x;
                    let mdy = p.y - this.mouse.y;
                    let mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                    if (mdist < this.mouse.radius) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(p.x, p.y);
                        this.ctx.lineTo(this.mouse.x, this.mouse.y);
                        this.ctx.strokeStyle = `rgba(0, 242, 254, ${0.35 * (1 - mdist / this.mouse.radius)})`;
                        this.ctx.lineWidth = 0.8;
                        this.ctx.stroke();
                    }
                }

                for (let j = i + 1; j < this.particles.length; j++) {
                    let p2 = this.particles[j];
                    let dx = p.x - p2.x;
                    let dy = p.y - p2.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 100) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(p.x, p.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.strokeStyle = `rgba(0, 242, 254, ${0.15 * (1 - dist / 100)})`;
                        this.ctx.lineWidth = 0.6;
                        this.ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(() => this.animate());
        }
    }

    // --------------------------------------------------------------------------
    // 4. MAIN APPLICATION UI & NETWORK SYNC CONTROLLER
    // --------------------------------------------------------------------------
    class AppUI {
        constructor() {
            this.items = [];
            this.activeFilter = 'all';
            this.activeSort = 'newest';
            this.searchQuery = '';
            this.networkUrl = window.location.origin;
            this.localIP = '127.0.0.1';
            this.sseSource = null;
        }

        async init() {
            new ParticleBackground('bg-canvas');
            this.bindEvents();
            await this.fetchNetworkInfo();
            this.initRealtimeSSE();
            await this.refreshVaultData();
        }

        getNetworkBaseUrl() {
            const savedTunnel = localStorage.getItem('vaultpulse_custom_tunnel_url');
            if (savedTunnel && savedTunnel.trim() !== '') {
                return savedTunnel.trim();
            }
            if (this.networkUrl && !this.networkUrl.includes('localhost') && !this.networkUrl.includes('127.0.0.1')) {
                return this.networkUrl;
            }
            const hostIp = (this.localIP && this.localIP !== '127.0.0.1') ? this.localIP : '10.254.30.8';
            return `http://${hostIp}:3000`;
        }

        async fetchNetworkInfo() {
            try {
                const savedTunnel = localStorage.getItem('vaultpulse_custom_tunnel_url');
                const tunnelInput = document.getElementById('custom-tunnel-url-input');
                if (savedTunnel && tunnelInput) {
                    tunnelInput.value = savedTunnel;
                }

                const res = await fetch('/api/info');
                if (res.ok) {
                    const info = await res.json();
                    this.localIP = info.localIP;
                    this.networkUrl = info.networkUrl;

                    const displayEl = document.getElementById('network-ip-display');
                    if (displayEl) {
                        displayEl.textContent = savedTunnel ? '4G/5G Tunnel Active' : `Wi-Fi: ${info.localIP}:${info.port}`;
                    }
                }
            } catch (e) {
                console.log('Running in static mode / standalone');
            }
        }

        initRealtimeSSE() {
            if ('EventSource' in window) {
                this.sseSource = new EventSource('/api/events');
                this.sseSource.addEventListener('ADD_ITEM', (e) => {
                    const data = JSON.parse(e.data);
                    sound.playReceive();
                    showToast(`⚡ Live Wi-Fi: New file received (${data.name})!`, 'sync');
                    this.refreshVaultData();
                });

                this.sseSource.addEventListener('DELETE_ITEM', (e) => {
                    showToast('🗑️ Live Wi-Fi: Item removed on another device', 'sync');
                    this.refreshVaultData();
                });

                this.sseSource.addEventListener('CLEAR_VAULT', (e) => {
                    showToast('⚠️ Live Wi-Fi: Vault wiped', 'sync');
                    this.refreshVaultData();
                });
            }
        }

        bindEvents() {
            // Audio toggle
            const audioBtn = document.getElementById('audio-toggle-btn');
            if (audioBtn) audioBtn.addEventListener('click', () => sound.toggleMute());

            // Phone Connect Header Button
            const phoneBtn = document.getElementById('phone-connect-btn');
            if (phoneBtn) phoneBtn.addEventListener('click', () => this.openPhoneConnectQRModal());

            // Tab Navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    sound.playClick();
                    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

                    btn.classList.add('active');
                    const tabId = btn.getAttribute('data-tab');
                    const targetTab = document.getElementById(`tab-${tabId}`);
                    if (targetTab) targetTab.classList.add('active');
                    if (tabId === 'analytics') this.updateStorageAnalytics();
                });
            });

            // Quick drop button header
            const quickAddBtn = document.getElementById('quick-add-btn');
            if (quickAddBtn) {
                quickAddBtn.addEventListener('click', () => {
                    const shareNavBtn = document.querySelector('[data-tab="share"]');
                    if (shareNavBtn) shareNavBtn.click();
                });
            }

            // Dropzone setup
            const dropzone = document.getElementById('main-dropzone');
            const fileInput = document.getElementById('file-input');
            const browseBtn = document.getElementById('browse-files-btn');

            if (browseBtn && fileInput) browseBtn.addEventListener('click', () => fileInput.click());
            if (dropzone && fileInput) {
                dropzone.addEventListener('click', (e) => {
                    if (browseBtn && e.target !== browseBtn && !browseBtn.contains(e.target)) {
                        fileInput.click();
                    }
                });

                ['dragenter', 'dragover'].forEach(eventName => {
                    dropzone.addEventListener(eventName, (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dropzone.classList.add('dragover');
                    }, false);
                });

                ['dragleave', 'drop'].forEach(eventName => {
                    dropzone.addEventListener(eventName, (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dropzone.classList.remove('dragover');
                    }, false);
                });

                dropzone.addEventListener('drop', (e) => {
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) this.handleFileUpload(files);
                });

                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files.length > 0) this.handleFileUpload(e.target.files);
                });
            }

            // Text / Link Share Form
            const textForm = document.getElementById('text-share-form');
            if (textForm) {
                textForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleTextShareSubmit();
                });
            }

            // Vault Filters
            document.querySelectorAll('#category-filters .chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    sound.playClick();
                    document.querySelectorAll('#category-filters .chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    this.activeFilter = chip.getAttribute('data-filter');
                    this.renderVaultGrid();
                });
            });

            // Search Bar
            const searchInput = document.getElementById('vault-search-input');
            const searchTriggerBtn = document.getElementById('search-trigger-btn');
            const clearSearchBtn = document.getElementById('clear-search-btn');

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchQuery = e.target.value.trim().toLowerCase();
                    if (clearSearchBtn) {
                        if (this.searchQuery) clearSearchBtn.classList.remove('hidden');
                        else clearSearchBtn.classList.add('hidden');
                    }
                    this.renderVaultGrid();
                });
            }

            if (searchTriggerBtn) {
                searchTriggerBtn.addEventListener('click', () => {
                    sound.playClick();
                    if (searchInput) this.searchQuery = searchInput.value.trim().toLowerCase();
                    this.renderVaultGrid();
                });
            }

            if (clearSearchBtn && searchInput) {
                clearSearchBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    this.searchQuery = '';
                    clearSearchBtn.classList.add('hidden');
                    this.renderVaultGrid();
                });
            }

            // Sort Select
            document.getElementById('sort-select').addEventListener('change', (e) => {
                this.activeSort = e.target.value;
                this.renderVaultGrid();
            });

            // Modals Close Events
            document.getElementById('close-preview-btn').addEventListener('click', () => this.closePreviewModal());
            document.getElementById('close-qr-btn').addEventListener('click', () => this.closeQRModal());

            // Backup & Clear Vault Tools
            document.getElementById('export-vault-btn').addEventListener('click', () => this.exportVaultBackup());

            // Import Vault Trigger Button
            const importBtn = document.getElementById('import-vault-trigger-btn');
            const importInput = document.getElementById('import-vault-input');
            if (importBtn && importInput) {
                importBtn.addEventListener('click', () => {
                    sound.playClick();
                    importInput.click();
                });
                importInput.addEventListener('change', (e) => this.importVaultBackup(e));
            }



            // Save Custom 4G/5G Tunnel URL
            const saveTunnelBtn = document.getElementById('save-tunnel-url-btn');
            if (saveTunnelBtn) {
                saveTunnelBtn.addEventListener('click', () => {
                    sound.playClick();
                    const val = document.getElementById('custom-tunnel-url-input').value.trim();
                    if (val) {
                        localStorage.setItem('vaultpulse_custom_tunnel_url', val);
                        this.networkUrl = val;
                        showToast('4G/5G Remote Tunnel URL Saved!', 'success');
                    } else {
                        localStorage.removeItem('vaultpulse_custom_tunnel_url');
                        this.fetchNetworkInfo();
                        showToast('Reset to Local Wi-Fi Network Mode', 'info');
                    }
                });
            }
        }

        async refreshVaultData() {
            try {
                const res = await fetch('/api/items');
                if (res.ok) {
                    this.items = await res.json();
                }
                document.getElementById('vault-count-badge').textContent = this.items.length;
                this.renderRecentStrip();
                this.renderVaultGrid();
                this.updateStorageAnalytics();
            } catch (err) {
                console.error('Failed to load items from server:', err);
            }
        }

        // --- FILE UPLOAD PROCESSING (HIGH SPEED STREAMING FOR LARGE FILES 5GB+) ---
        async handleFileUpload(fileList) {
            sound.playClick();
            const progressOverlay = document.getElementById('upload-progress');
            const progressFill = document.getElementById('upload-progress-fill');
            const progressPct = document.getElementById('upload-progress-pct');
            const statusText = document.getElementById('upload-status-text');

            if (progressOverlay) progressOverlay.classList.remove('hidden');

            const total = fileList.length;
            for (let i = 0; i < total; i++) {
                const file = fileList[i];
                try {
                    await this.uploadSingleFileStream(file, (pct, speedMBps, loaded, totalBytes) => {
                        if (progressFill) progressFill.style.width = `${pct}%`;
                        if (progressPct) progressPct.textContent = `${pct}% (${speedMBps} MB/s)`;
                        if (statusText) statusText.textContent = `Processing ${file.name} (${this.formatBytes(loaded)} / ${this.formatBytes(totalBytes)})...`;
                    });
                } catch (err) {
                    console.warn('Server upload endpoint offline/static mode, saving file to Browser Local Vault:', err);
                    const base64 = await this.fileToBase64(file);
                    const itemRecord = {
                        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                        name: file.name,
                        size: file.size,
                        mimeType: file.type || 'application/octet-stream',
                        category: this.detectCategory(file.type || '', file.name),
                        content: base64,
                        timestamp: Date.now(),
                        downloadUrl: base64
                    };
                    this.vaultData.unshift(itemRecord);
                    this.saveVaultToLocalStorage();
                }
            }

            sound.playUpload();
            if (progressOverlay) progressOverlay.classList.add('hidden');
            showToast(`Successfully added ${total} file(s) to Vault!`, 'success');
            this.renderVaultGrid();
            this.renderRecentStrip();
            this.updateStorageAnalytics();
        }

        uploadSingleFileStream(file, onProgress) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const itemId = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                const startTime = Date.now();

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable && onProgress) {
                        const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
                        const elapsedTime = Math.max(0.1, (Date.now() - startTime) / 1000);
                        const speedMBps = ((e.loaded / (1024 * 1024)) / elapsedTime).toFixed(1);
                        if (pct >= 100) {
                            const statusText = document.getElementById('upload-status-text');
                            if (statusText) statusText.textContent = `Finalizing ${file.name}...`;
                        }
                        onProgress(pct, speedMBps, e.loaded, e.total);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during file upload'));

                xhr.open('POST', '/api/upload-stream');
                xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
                xhr.setRequestHeader('X-File-Size', file.size.toString());
                xhr.setRequestHeader('X-File-Type', encodeURIComponent(file.type || 'application/octet-stream'));
                xhr.setRequestHeader('X-Item-Id', itemId);
                xhr.send(file);
            });
        }

        fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }

        detectCategory(mimeType, filename) {
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) return 'audio-video';
            if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml') || mimeType.includes('html') || filename.match(/\.(js|py|html|css|json|cpp|c|cs|java|ts|php|xml)$/i)) return 'code';
            if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('word') || filename.match(/\.(pdf|doc|docx|txt|md)$/i)) return 'document';
            return 'document';
        }

        // --- TEXT & LINK SUBMIT ---
        async handleTextShareSubmit() {
            sound.playClick();
            const titleInput = document.getElementById('snippet-title');
            const contentInput = document.getElementById('snippet-content');
            const categorySelect = document.getElementById('snippet-category');

            const content = contentInput.value.trim();
            if (!content) return;

            let category = categorySelect.value;
            if (category === 'auto') {
                if (content.match(/^https?:\/\/[^\s]+$/i)) {
                    category = 'link';
                } else if (content.includes('{') || content.includes('function') || content.includes('<html') || content.includes('const ')) {
                    category = 'code';
                } else {
                    category = 'text';
                }
            }

            const title = titleInput.value.trim() || (category === 'link' ? content : (content.substring(0, 30) + '...'));

            const itemRecord = {
                id: 'text_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name: title,
                size: new Blob([content]).size,
                mimeType: category === 'link' ? 'text/url' : 'text/plain',
                category: category,
                content: content,
                timestamp: Date.now(),
                isSnippet: true
            };

            await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemRecord)
            });

            sound.playUpload();
            titleInput.value = '';
            contentInput.value = '';
            showToast('Snippet saved & broadcasted across devices!', 'success');
            await this.refreshVaultData();
        }

        // --- RENDER RECENT STRIP ---
        renderRecentStrip() {
            const container = document.getElementById('recent-items-container');
            if (this.items.length === 0) {
                container.innerHTML = '<div class="empty-state-mini">No items shared yet. Drop a file or paste text above!</div>';
                return;
            }

            const sorted = [...this.items].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
            let html = '';

            sorted.forEach(item => {
                const icon = this.getCategoryIcon(item.category);
                const timeAgo = this.formatTimeAgo(item.timestamp);

                html += `
                    <div class="mini-item-card" onclick="appUI.openPreviewModal('${item.id}')">
                        <div class="mini-icon">${icon}</div>
                        <div class="mini-details">
                            <div class="mini-title">${this.escapeHTML(item.name)}</div>
                            <div class="mini-time">${timeAgo} • ${this.formatBytes(item.size)}</div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        // --- RENDER VAULT GRID ---
        renderVaultGrid() {
            const grid = document.getElementById('vault-grid');
            const emptyState = document.getElementById('vault-empty-state');

            let filtered = this.items.filter(item => {
                if (this.activeFilter !== 'all') {
                    if (this.activeFilter === 'image' && item.category !== 'image') return false;
                    if (this.activeFilter === 'document' && item.category !== 'document' && item.category !== 'text') return false;
                    if (this.activeFilter === 'audio-video' && item.category !== 'audio-video') return false;
                    if (this.activeFilter === 'code' && item.category !== 'code') return false;
                    if (this.activeFilter === 'link' && item.category !== 'link') return false;
                }

                if (this.searchQuery) {
                    const matchName = item.name.toLowerCase().includes(this.searchQuery);
                    const matchCategory = item.category.toLowerCase().includes(this.searchQuery);
                    const matchContent = item.isSnippet ? item.content.toLowerCase().includes(this.searchQuery) : false;
                    return matchName || matchCategory || matchContent;
                }

                return true;
            });

            filtered.sort((a, b) => {
                if (this.activeSort === 'newest') return b.timestamp - a.timestamp;
                if (this.activeSort === 'oldest') return a.timestamp - b.timestamp;
                if (this.activeSort === 'size-desc') return b.size - a.size;
                if (this.activeSort === 'name') return a.name.localeCompare(b.name);
                return 0;
            });

            if (filtered.length === 0) {
                grid.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');
            let html = '';

            filtered.forEach(item => {
                const icon = this.getCategoryIcon(item.category);
                let thumbnailHTML = `<div class="large-icon">${icon}</div>`;

                if (item.category === 'image' && item.content && item.content.startsWith('data:image')) {
                    thumbnailHTML = `<img src="${item.content}" alt="preview">`;
                } else if (item.isSnippet) {
                    thumbnailHTML = `<div class="snippet-preview">${this.escapeHTML(item.content.substring(0, 150))}</div>`;
                }

                html += `
                    <div class="glass-card vault-card">
                        <div class="vault-card-thumb" onclick="appUI.openPreviewModal('${item.id}')">
                            ${thumbnailHTML}
                        </div>
                        <div class="vault-card-info">
                            <div class="vault-card-title" title="${this.escapeHTML(item.name)}">${this.escapeHTML(item.name)}</div>
                            <div class="vault-card-meta">
                                <span>${this.formatBytes(item.size)}</span>
                                <span>${this.formatTimeAgo(item.timestamp)}</span>
                            </div>
                            <div class="vault-card-actions">
                                <button class="btn btn-secondary" onclick="appUI.openPreviewModal('${item.id}')">View</button>
                                <button class="btn btn-secondary" onclick="appUI.openQRModal('${item.id}')">Phone QR</button>
                                <button class="btn btn-danger" onclick="appUI.deleteVaultItem('${item.id}')">Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            });

            grid.innerHTML = html;
        }

        // --- PREVIEW MODAL ---
        openPreviewModal(id) {
            sound.playClick();
            const item = this.items.find(i => i.id === id);
            if (!item) return;

            document.getElementById('modal-item-title').textContent = item.name;
            document.getElementById('modal-item-meta').textContent = `Size: ${this.formatBytes(item.size)} • Type: ${item.category.toUpperCase()}`;

            const body = document.getElementById('modal-preview-body');
            const downloadBtn = document.getElementById('modal-download-btn');
            const qrBtn = document.getElementById('modal-qr-btn');

            qrBtn.onclick = () => this.openQRModal(id);
            downloadBtn.onclick = () => this.downloadItem(item);

            if (item.category === 'image' && item.content && item.content.startsWith('data:image')) {
                body.innerHTML = `<img src="${item.content}" class="modal-preview-img" alt="preview">`;
            } else if (item.category === 'audio-video' && item.content && item.content.startsWith('data:audio')) {
                body.innerHTML = `<audio controls src="${item.content}" class="modal-preview-audio"></audio>`;
            } else if (item.isSnippet) {
                body.innerHTML = `<pre class="modal-preview-text"><code>${this.escapeHTML(item.content)}</code></pre>`;
            } else {
                body.innerHTML = `<div class="empty-state">
                    <div class="empty-icon">${this.getCategoryIcon(item.category)}</div>
                    <p>File ready. Click below to download directly onto your device.</p>
                </div>`;
            }

            document.getElementById('preview-modal').classList.remove('hidden');
        }

        closePreviewModal() {
            sound.playClick();
            document.getElementById('preview-modal').classList.add('hidden');
        }

        // --- CONNECT PHONE QR MODAL ---
        openPhoneConnectQRModal() {
            sound.playClick();
            const qrContainer = document.getElementById('qr-code-container');
            const qrText = document.getElementById('qr-share-text');
            const copyBtn = document.getElementById('copy-qr-text-btn');
            const titleEl = document.getElementById('qr-modal-title');
            const hintEl = document.getElementById('qr-modal-hint');

            titleEl.textContent = '📱 Smartphone Connect QR';
            hintEl.textContent = 'Scan this QR code with your smartphone camera to open VaultPulse instantly on your mobile device!';

            const connectUrl = this.getNetworkBaseUrl();
            qrContainer.innerHTML = generateSVGQRCode(connectUrl);
            qrText.value = connectUrl;

            copyBtn.textContent = 'Copy Wi-Fi URL';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(connectUrl);
                sound.playClick();
                showToast('Wi-Fi URL copied to clipboard!', 'success');
            };

            document.getElementById('qr-modal').classList.remove('hidden');
        }

        // --- FILE ITEM QR MODAL ---
        openQRModal(id) {
            sound.playClick();
            const item = this.items.find(i => i.id === id);
            if (!item) return;

            const qrContainer = document.getElementById('qr-code-container');
            const qrText = document.getElementById('qr-share-text');
            const copyBtn = document.getElementById('copy-qr-text-btn');
            const titleEl = document.getElementById('qr-modal-title');
            const hintEl = document.getElementById('qr-modal-hint');

            titleEl.textContent = `File Share: ${item.name}`;
            hintEl.textContent = 'Scan with smartphone camera to download this file directly to your phone over Wi-Fi!';

            const downloadUrl = `${this.getNetworkBaseUrl()}/api/download/${item.id}`;
            qrContainer.innerHTML = generateSVGQRCode(downloadUrl);
            qrText.value = downloadUrl;

            copyBtn.textContent = 'Copy Download Link';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(downloadUrl);
                sound.playClick();
                showToast('Direct download link copied!', 'success');
            };

            document.getElementById('qr-modal').classList.remove('hidden');
        }

        closeQRModal() {
            sound.playClick();
            document.getElementById('qr-modal').classList.add('hidden');
        }

        // --- ITEM ACTIONS ---
        downloadItem(item) {
            sound.playClick();
            const downloadUrl = `${this.networkUrl}/api/download/${item.id}`;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = item.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        async deleteVaultItem(id) {
            sound.playDelete();
            await fetch(`/api/items/${id}`, { method: 'DELETE' });
            showToast('Item deleted across devices', 'info');
            await this.refreshVaultData();
        }

        async clearVaultData() {
            sound.playClick();
            if (confirm('Are you sure you want to wipe all stored items from server and browser storage?')) {
                sound.playDelete();
                try {
                    await fetch('/api/clear', { method: 'POST' });
                } catch(e) {}
                try {
                    await vaultDB.clearAll();
                } catch(e) {}
                this.items = [];
                showToast('Vault wiped completely clean!', 'info');
                await this.refreshVaultData();
            }
        }

        // --- STORAGE ANALYTICS ---
        async updateStorageAnalytics() {
            const usedBytesEl = document.getElementById('stat-used-bytes');
            const totalBytesEl = document.getElementById('stat-total-bytes');
            const itemCountEl = document.getElementById('stat-item-count');
            const pctText = document.getElementById('storage-pct-text');
            const gaugeCircle = document.getElementById('gauge-circle');

            let totalSize = this.items.reduce((acc, item) => acc + item.size, 0);
            usedBytesEl.textContent = this.formatBytes(totalSize);
            itemCountEl.textContent = `${this.items.length} items`;

            if ('storage' in navigator && 'estimate' in navigator.storage) {
                try {
                    const estimate = await navigator.storage.estimate();
                    const quota = estimate.quota || 1073741824;
                    totalBytesEl.textContent = this.formatBytes(quota);

                    const pct = Math.min(100, Math.round((estimate.usage / quota) * 100));
                    pctText.textContent = `${pct}%`;

                    const offset = 471 - (471 * pct) / 100;
                    gaugeCircle.style.strokeDashoffset = offset;
                } catch (e) {
                    totalBytesEl.textContent = 'Standard Quota';
                }
            }
        }

        // --- BACKUP EXPORT & IMPORT ---
        exportVaultBackup() {
            sound.playClick();
            if (this.items.length === 0) {
                showToast('Vault is empty, nothing to export!', 'error');
                return;
            }

            const exportObj = {
                version: 'VaultPulse_v1.5',
                exportedAt: new Date().toISOString(),
                items: this.items
            };

            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `VaultPulse_Backup_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();

            showToast('Exported vault backup (.json)', 'success');
        }

        async importVaultBackup(event) {
            const file = event.target.files[0];
            if (!file) return;

            sound.playClick();
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (parsed.items && Array.isArray(parsed.items)) {
                        for (const item of parsed.items) {
                            await fetch('/api/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(item)
                            });
                        }
                        showToast(`Restored ${parsed.items.length} items to vault!`, 'success');
                        await this.refreshVaultData();
                    } else {
                        showToast('Invalid backup file format.', 'error');
                    }
                } catch (err) {
                    showToast('Failed to parse backup JSON file.', 'error');
                }
            };
            reader.readAsText(file);
        }

        // --- UTILITIES ---
        getCategoryIcon(category) {
            switch(category) {
                case 'image': return '🖼️';
                case 'audio-video': return '🎵';
                case 'code': return '💻';
                case 'link': return '🔗';
                default: return '📄';
            }
        }

        formatBytes(bytes, decimals = 1) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }

        formatTimeAgo(timestamp) {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            if (seconds < 60) return 'Just now';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        }

        escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>'"]/g, 
                tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
            );
        }
    }

    // --- GLOBAL TOAST NOTIFICATION ---
    window.showToast = function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // Initialize App safely regardless of DOM load state
    function startApp() {
        if (!window.appUI) {
            window.appUI = new AppUI();
            window.appUI.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }

})();
