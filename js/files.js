        let allFiles = [];

        // Track page visit for achievements
        ipcRenderer.send('page-visited', 'files');

        // Load files when page loads
        function loadFiles() {
            console.log('Requesting files...');
            ipcRenderer.send('get-all-files');
        }

        ipcRenderer.on('files-list', (event, data) => {
            console.log('Files received:', data);
            if (data.error) {
                console.error('Error loading files:', data.error);
                if (data.error === 'No folder set') {
                    document.querySelector('.empty-state h3').textContent = 'No folder selected';
                    document.querySelector('.empty-state p').textContent = 'Please select a documents folder in Settings';
                }
                showEmptyState();
                return;
            }
            
            allFiles = data.files;
            displayFiles(allFiles);
        });

        function displayFiles(files) {
            const grid = document.getElementById('filesGrid');
            
            if (files.length === 0) {
                showEmptyState();
                return;
            }
            
            // Hide empty state
            document.querySelector('.empty-state').style.display = 'none';
            
            // Clear existing content
            grid.innerHTML = '';
            
            files.forEach(file => {
                const card = document.createElement('div');
                card.className = 'file-card';
                card.dataset.path = file.path;
                
                // Create safe strings for onclick handlers
                const safePathString = file.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const safeName = file.name.replace(/'/g, "\\'");
                
                card.innerHTML = `
                    <div class="file-actions">
                        <button class="action-btn" onclick="openFile('${safePathString}')">Open</button>
                        <button class="action-btn" onclick="showInExplorer('${safePathString}')">Show in Folder</button>
                        <button class="action-btn" onclick="startRename('${safePathString}', '${safeName}')">Rename</button>
                        <div class="export-wrap">
                            <button class="action-btn" onclick="toggleExportMenu(event, '${safePathString}')">Export ▾</button>
                            <div class="export-menu">
                                <button onclick="exportFile(event, '${safePathString}', 'docx')">Word (.docx)</button>
                                <button onclick="exportFile(event, '${safePathString}', 'html')">HTML (.html)</button>
                                <button onclick="exportFile(event, '${safePathString}', 'md')">Markdown (.md)</button>
                            </div>
                        </div>
                    </div>
                    <div class="file-icon">📄</div>
                    <div class="file-name" id="name-${file.path.replace(/[\\/:]/g, '-')}">${file.name}</div>
                    <div class="file-meta">
                        <div class="file-date">Modified: ${formatDate(file.modified)}</div>
                        <div class="file-words">${file.words} words</div>
                    </div>
                `;
                
                grid.appendChild(card);
            });
        }

        function showEmptyState() {
            document.getElementById('filesGrid').innerHTML = '';
            document.querySelector('.empty-state').style.display = 'block';
        }

        function formatDate(date) {
            const now = new Date();
            const fileDate = new Date(date);
            const diff = now - fileDate;
            
            if (diff < 3600000) return Math.floor(diff / 60000) + ' minutes ago';
            if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
            if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago';
            return fileDate.toLocaleDateString();
        }

        // Global functions for onclick handlers
        window.openFile = function(filePath) {
            ipcRenderer.send('open-file-in-editor', filePath);
        }

        // --- Export ---------------------------------------------------------
        function closeAllExportMenus() {
            document.querySelectorAll('.export-wrap.open').forEach(w => {
                w.classList.remove('open', 'drop-up');
                const card = w.closest('.file-card');
                if (card) card.classList.remove('menu-open');
            });
        }

        window.toggleExportMenu = function(event, filePath) {
            event.stopPropagation();
            const wrap = event.currentTarget.parentElement;
            const isOpen = wrap.classList.contains('open');
            closeAllExportMenus();
            if (isOpen) return;

            wrap.classList.add('open');
            // Lift the whole card so the menu isn't painted under its neighbours.
            const card = wrap.closest('.file-card');
            if (card) card.classList.add('menu-open');

            // If the menu would run off the bottom of the window, flip it above
            // the button instead.
            const menu = wrap.querySelector('.export-menu');
            if (menu) {
                const spaceBelow = window.innerHeight - wrap.getBoundingClientRect().bottom;
                if (spaceBelow < menu.offsetHeight + 16) wrap.classList.add('drop-up');
            }
        }

        document.addEventListener('click', closeAllExportMenus);
        window.addEventListener('scroll', closeAllExportMenus, true);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllExportMenus();
        });

        window.exportFile = function(event, filePath, format) {
            event.stopPropagation();
            document.querySelectorAll('.export-wrap.open').forEach(w => w.classList.remove('open'));
            ipcRenderer.send('export-file', filePath, format);
        }

        ipcRenderer.on('export-complete', (event, result) => {
            if (result.canceled) return;
            showToast(result.success
                ? 'Exported to ' + result.path
                : 'Export failed: ' + (result.error || 'unknown error'), !result.success);
        });

        // --- Import ---------------------------------------------------------
        function showToast(message, isError) {
            const toast = document.createElement('div');
            toast.className = 'files-toast' + (isError ? ' error' : '');
            toast.textContent = message;
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                ipcRenderer.send('start-import-document');
            });
        }

        window.showInExplorer = function(filePath) {
            ipcRenderer.send('show-in-explorer', filePath);
        }

        window.startRename = function(filePath, currentName) {
            const nameElement = document.getElementById('name-' + filePath.replace(/[\\/:]/g, '-'));
            if (!nameElement) {
                console.error('Could not find name element for', filePath);
                return;
            }
            
            // Store original name as data attribute
            nameElement.dataset.originalName = currentName;
            nameElement.dataset.filePath = filePath;
            
            // Create input element
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.id = 'rename-input';
            input.style.width = '100%';
            input.style.background = '#2a2a2a';
            input.style.border = '1px solid #14b8a6';
            input.style.color = '#fff';
            input.style.padding = '0.25rem';
            
            // Replace content with input
            nameElement.innerHTML = '';
            nameElement.appendChild(input);
            
            // Set up event handlers
            input.addEventListener('blur', function() {
                finishRename(filePath, this.value, currentName);
            });
            
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    this.blur();
                }
                if (e.key === 'Escape') {
                    this.value = currentName;
                    this.blur();
                }
            });
            
            input.focus();
            input.select();
        }

        window.finishRename = function(filePath, newName, originalName) {
            if (newName && newName !== originalName && newName.trim() !== '') {
                // Ensure proper extension
                if (!newName.endsWith('.rtf') && !newName.endsWith('.txt')) {
                    newName += '.rtf';
                }
                ipcRenderer.send('rename-file', filePath, newName);
            } else {
                // Reload to restore original display
                loadFiles();
            }
        }

        ipcRenderer.on('file-renamed', (event, result) => {
            if (!result.success) {
                // Name clashes are an ordinary mistake, not a crash — show the
                // message inline rather than in a blocking dialog.
                showToast(result.error || 'Could not rename that file.', true);
            }
            loadFiles();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allFiles.filter(file => 
                file.name.toLowerCase().includes(query)
            );
            displayFiles(filtered);
        });

        // Sort functionality
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            const sortBy = e.target.value;
            const sorted = [...allFiles];
            
            switch(sortBy) {
                case 'date':
                    sorted.sort((a, b) => new Date(b.modified) - new Date(a.modified));
                    break;
                case 'name':
                    sorted.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'words':
                    sorted.sort((a, b) => b.words - a.words);
                    break;
            }
            
            displayFiles(sorted);
        });

        // Fullscreen toggle
        document.getElementById('fullscreenToggle').addEventListener('click', () => {
            ipcRenderer.send('toggle-fullscreen');
        });
        
        ipcRenderer.on('fullscreen-changed', (event, isFullscreen) => {
            const btn = document.getElementById('fullscreenToggle');
            if (isFullscreen) {
                btn.title = 'Exit Fullscreen';
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                    </svg>`;
            } else {
                btn.title = 'Enter Fullscreen';
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>`;
            }
        });

        // Load files on page load
        loadFiles();
