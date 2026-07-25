// visibility-controller.js
if (!window.visibilityControllerLoaded) {
    window.visibilityControllerLoaded = true;
    
    class VisibilityController {
        constructor() {
            console.log('VisibilityController initialized');
            this.settings = null;
            this.loadSettings();
        }
        
        async loadSettings() {
            console.log('Requesting settings from visibility controller...');
            ipcRenderer.send('get-settings');
            
            ipcRenderer.once('load-settings', (event, settings) => {
                console.log('Settings received in visibility controller:', settings);
                this.settings = settings;
                this.applyVisibilitySettings();
            });
        }
        
        applyVisibilitySettings() {
            console.log('Applying visibility settings...');
            if (!this.settings) {
                console.log('No settings found');
                return;
            }
            
            const { appearanceSettings, editorSettings, gamificationSettings } = this.settings;
            console.log('Appearance settings:', appearanceSettings);
            console.log('Editor settings:', editorSettings);
            console.log('Gamification settings:', gamificationSettings);
            
            // Hide Statistics Page in navigation - ONLY if explicitly true
            if (appearanceSettings && appearanceSettings.hideStatsPage === true) {
                console.log('hideStatsPage is TRUE, hiding statistics nav item...');
                this.hideStatisticsNavItem();
            }
            
            // Hide Homepage Stats Sidebar (only on homepage)
            if (appearanceSettings && appearanceSettings.hideStatsSidebar === true && this.isHomepage()) {
                console.log('Hiding stats sidebar...');
                this.hideStatsSidebar();
            }
            
            // Hide Today's Progress with new logic (only on homepage)
            if (this.isHomepage()) {
                const shouldHideProgress = this.shouldHideTodayProgress(appearanceSettings, this.settings.dailyGoals);
                console.log('Today progress visibility check:', {
                    manualHide: appearanceSettings?.hideTodayProgress,
                    dailyGoalsType: this.settings.dailyGoals?.type,
                    hasActiveGoal: this.settings.dailyGoals && this.settings.dailyGoals.type !== 'disabled',
                    shouldHide: shouldHideProgress
                });
                
                if (shouldHideProgress) {
                    console.log('Hiding today progress...');
                    this.hideTodayProgress();
                } else {
                    console.log('Showing today progress...');
                    this.showTodayProgress();
                }
            }
            
            // Editor visibility settings (only on editor page)
            if (this.isEditorPage() && editorSettings) {
                if (editorSettings.hideTimer === true) {
                    console.log('Hiding timer...');
                    this.hideTimer();
                }
                if (editorSettings.hideWordCount === true) {
                    console.log('Hiding word count...');
                    this.hideWordCount();
                }
                // Handle lockExit - when TRUE, hide the exit button
                if (editorSettings.lockExit === true) {
                    console.log('Lock exit is enabled, hiding exit button...');
                    this.hideExitButton();
                }
            }
            
            // Gamification settings
            if (gamificationSettings && gamificationSettings.disableStreak === true) {
                console.log('Disabling streak tracking...');
                this.hideStreakElements();
            }
        }
        
        hideStatisticsNavItem() {
            const navItems = document.querySelectorAll('.optionsnav ul li');
            
            navItems.forEach((li, index) => {
                const hasStatisticsLink = li.querySelector('a[href="statistics.html"]');
                const textContent = li.textContent.trim();
                
                if (textContent === 'Statistics' || hasStatisticsLink) {
                    li.style.display = 'none';
                }
            });
        }
        
        hideStatsSidebar() {
            const sidebar = document.querySelector('.sidebar-right');
            if (sidebar) {
                sidebar.style.display = 'none';
                document.body.style.gridTemplateColumns = '320px 1fr';
                document.body.style.gridTemplateAreas = '"header header" "sidebar-left main"';
            }
        }
        
        shouldHideTodayProgress(appearanceSettings, dailyGoals) {
            // If user manually set "Always Hide Today's Progress", respect that choice
            if (appearanceSettings && appearanceSettings.hideTodayProgress === true) {
                return true;
            }
            
            // Auto-hide if no active daily goal
            // Show progress for indefinite and longterm goals (not disabled/freewrite)
            const hasActiveGoal = dailyGoals && dailyGoals.type !== 'disabled';
            
            if (!hasActiveGoal) {
                return true;  // Hide by default when no active goal
            }
            
            // Show when there's an active goal (unless manually hidden)
            return false;
        }
        
        hideTodayProgress() {
            const progressSection = document.querySelector('.progressoverview');
            if (progressSection) {
                progressSection.style.display = 'none';
            }
        }
        
        showTodayProgress() {
            const progressSection = document.querySelector('.progressoverview');
            if (progressSection) {
                progressSection.style.display = 'block';
            }
        }
        
        hideTimer() {
            const timerElements = document.querySelectorAll('#progressLabel, #progressValue');
            const timerContainer = document.querySelector('.session-progress');
            
            if (timerContainer) {
                const label = timerContainer.querySelector('#progressLabel');
                if (label && (label.textContent.includes('Time') || label.textContent.includes('Session'))) {
                    timerContainer.style.display = 'none';
                }
            }
        }
        
        hideWordCount() {
            const wordCountElements = document.querySelectorAll('.session-progress');
            
            wordCountElements.forEach(element => {
                const label = element.querySelector('.progress-label');
                if (label && label.textContent.includes('Words')) {
                    element.style.display = 'none';
                }
            });
            
            const wordCountDisplay = document.getElementById('wordCount');
            if (wordCountDisplay) {
                const parent = wordCountDisplay.closest('.session-progress');
                if (parent) {
                    parent.style.display = 'none';
                }
            }
        }
        
        // Update this method in visibility-controller.js
        hideExitButton() {
            // Check if we're in freewrite mode by looking at the session mode text
            const sessionModeElement = document.getElementById('sessionMode');
            const isFreewrite = sessionModeElement && sessionModeElement.textContent.includes('Freewrite');
            
            // Always show exit button in freewrite mode
            if (isFreewrite) {
                const exitButton = document.getElementById('exitBtn');
                if (exitButton) {
                    console.log('Showing exit button (freewrite mode)');
                    exitButton.style.display = 'block';
                }
                return; // Don't hide it
            }
            
            // Otherwise hide it if lockExit is enabled
            const exitButton = document.getElementById('exitBtn');
            if (exitButton) {
                console.log('Hiding exit button (lockExit enabled, not freewrite)');
                exitButton.style.display = 'none';
            }
            
            const endSessionBtn = document.querySelector('.end-session-btn');
            if (endSessionBtn) {
                endSessionBtn.style.display = 'none';
            }
        }
        
        hideStreakElements() {
            console.log('hideStreakElements called');
            
            // On homepage - hide streak in sidebar
            if (this.isHomepage()) {
                console.log('On homepage, looking for streak elements...');
                
                // Look for stat-card containing streak
                const statCards = document.querySelectorAll('.stat-card');
                console.log('Found stat cards:', statCards.length);
                
                statCards.forEach(card => {
                    const label = card.querySelector('.stat-label');
                    if (label && label.textContent.trim() === 'Streak') {
                        console.log('Found and hiding streak stat card');
                        card.style.display = 'none';
                    }
                });
            }
            
            // On statistics page
            if (this.isStatisticsPage()) {
                console.log('On statistics page, looking for streak elements...');
                
                // Hide current streak summary card
                const summaryCards = document.querySelectorAll('.summary-card');
                summaryCards.forEach(card => {
                    const cardText = card.textContent;
                    if (cardText.toLowerCase().includes('streak')) {
                        console.log('Found and hiding streak summary card');
                        card.style.display = 'none';
                    }
                });
                
                // Clear and disable calendar
                const calendarGrid = document.getElementById('calendarGrid');
                if (calendarGrid) {
                    // First, remove all "wrote" classes from calendar days
                    const calendarDays = document.querySelectorAll('.calendar-day');
                    calendarDays.forEach(day => {
                        day.classList.remove('wrote');
                        // Remove any visual indicators of writing
                        const checkmark = day.querySelector('::after');
                        if (checkmark) {
                            day.style.setProperty('--after-display', 'none');
                        }
                    });
                    
                    // Then add the overlay
                    const chartCard = calendarGrid.closest('.chart-card');
                    if (chartCard && !document.getElementById('streak-disabled-overlay')) {
                        chartCard.style.position = 'relative';
                        
                        const overlay = document.createElement('div');
                        overlay.id = 'streak-disabled-overlay';
                        overlay.style.cssText = `
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: rgba(26, 26, 26, 0.95);
                            border-radius: 12px;
                            z-index: 100;
                        `;
                        
                        const message = document.createElement('div');
                        message.style.cssText = `
                            color: #666;
                            font-size: 1.2rem;
                            text-align: center;
                        `;
                        message.textContent = 'Streak tracking disabled';
                        
                        overlay.appendChild(message);
                        chartCard.appendChild(overlay);
                    }
                }
            }
        }
        
        isHomepage() {
            return window.location.pathname.includes('index.html') || 
                   window.location.pathname === '/' ||
                   document.title === 'Cadence Writer';
        }
        
        isEditorPage() {
            return window.location.pathname.includes('editor.html') ||
                   document.title.includes('Writing Session');
        }
        
        isStatisticsPage() {
            return window.location.pathname.includes('statistics.html') ||
                   document.title.includes('Statistics');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.visibilityController = new VisibilityController();
        });
    } else {
        setTimeout(() => {
            window.visibilityController = new VisibilityController();
        }, 100);
    }
}