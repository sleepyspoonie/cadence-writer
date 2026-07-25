    
    // Track page visit for achievements
    ipcRenderer.send('page-visited', 'settings');
    
    // Track unsaved changes
    let originalSettings = {};
    let hasUnsavedChanges = false;
    
    // Function to capture current form state
    function captureCurrentSettings() {
        const currentSettings = {
            // Files & Storage - only update if it's not the default "Not set" text
            documentsFolder: document.getElementById('currentPath').textContent === 'Not set' ? 
                (originalSettings.documentsFolder || document.getElementById('currentPath').textContent) : 
                document.getElementById('currentPath').textContent,
            
            // Daily Goals
            hideTodayProgress: document.getElementById('hideTodayProgress').checked,
            dailyGoalType: document.getElementById('dailyGoalType').value,
            dailyWordTarget: document.getElementById('dailyWordTarget').value,
            longtermTotalWords: document.getElementById('longtermTotalWords').value,
            longtermTotalDays: document.getElementById('longtermTotalDays').value,
            streakPreservation: document.querySelector('input[name="streakPreservation"]:checked')?.value,
            
            // Appearance
            theme: document.querySelector('input[name="theme"]:checked')?.value,
            bgColor: document.getElementById('bgColor').value,
            textColor: document.getElementById('textColor').value,
            accentColor: document.getElementById('accentColor').value,
            cardColor: document.getElementById('cardColor').value,
            hideStatsPage: document.getElementById('hideStatsPage').checked,
            hideStatsSidebar: document.getElementById('hideStatsSidebar').checked,
            
            // Editor
            fontSize: document.getElementById('fontSize').value,
            fontFamily: document.getElementById('fontFamily').value,
            hideTimer: document.getElementById('hideTimer').checked,
            hideWordCount: document.getElementById('hideWordCount').checked,
            autoFullscreen: document.getElementById('autoFullscreen').checked,
            lockExit: document.getElementById('lockExit').checked,
            
            // Gamification
            writingMode: document.querySelector('input[name="writingMode"]:checked')?.value,
            rewardWords: document.getElementById('rewardWords').value,
            rewardType: document.querySelector('input[name="rewardType"]:checked')?.value,
            gracePeriod: document.getElementById('gracePeriod').value,
            punishType: document.querySelector('input[name="punishType"]:checked')?.value,
            nuclearGracePeriod: document.getElementById('nuclearGracePeriod').value,
            deletionSpeed: document.getElementById('deletionSpeed').value,
            hardcoreMode: document.getElementById('hardcoreMode').checked,
            disableStreak: document.getElementById('disableStreak').checked,
            disableAchievements: document.getElementById('disableAchievements').checked
        };
        
        return currentSettings;
    }
    
    // Function to check if settings have changed
    function checkForChanges() {
        const currentSettings = captureCurrentSettings();
        const changed = JSON.stringify(originalSettings) !== JSON.stringify(currentSettings);
        
        console.log('Settings check:', {
            original: originalSettings,
            current: currentSettings,
            changed: changed
        });
        
        if (changed !== hasUnsavedChanges) {
            hasUnsavedChanges = changed;
            console.log('Updating save button, hasUnsavedChanges:', hasUnsavedChanges);
            updateStickySaveButton();
        }
    }
    
    // Function to show/hide sticky save button
    function updateStickySaveButton() {
        const stickySaveSection = document.getElementById('stickySaveSection');
        if (hasUnsavedChanges) {
            stickySaveSection.classList.add('show');
        } else {
            stickySaveSection.classList.remove('show');
        }
    }
    
    // Function to mark settings as saved (reset original state)
    function markSettingsAsSaved() {
        originalSettings = captureCurrentSettings();
        hasUnsavedChanges = false;
        updateStickySaveButton();
    }
    
    // Updated function for new visibility logic
    function updateTodayProgressState() {
        // The "Always Hide Today's Progress" toggle is now independent
        // It's always enabled and represents user's permanent choice
        // No automatic forcing based on goal prompting state
        
        const hideTodayProgressToggle = document.getElementById('hideTodayProgress');
        const hideTodayProgressParent = hideTodayProgressToggle.closest('.setting-item');
        
        if (hideTodayProgressToggle && hideTodayProgressParent) {
            // Always keep it enabled - user has full control
            hideTodayProgressToggle.disabled = false;
            hideTodayProgressParent.style.opacity = '1';
            hideTodayProgressParent.style.cursor = 'default';
            hideTodayProgressParent.title = '';
            
            const toggleSlider = hideTodayProgressToggle.nextElementSibling;
            if (toggleSlider) {
                toggleSlider.classList.remove('disabled');
                toggleSlider.style.pointerEvents = 'auto';
            }
        }
    }

    // Long-term goals modal functionality
    function updateWordsPerDay() {
        const totalWords = parseInt(document.getElementById('settingsGoalTotalWords').value);
        const totalDays = parseInt(document.getElementById('settingsGoalTotalDays').value);
        const wordsPerDay = Math.ceil(totalWords / totalDays);
        document.getElementById('wordsPerDay').textContent = `${wordsPerDay.toLocaleString()} words per day`;
    }

    function showModal() {
        const overlay = document.getElementById('goalOverlay');
        overlay.style.display = 'flex';
        overlay.style.opacity = '0';
        overlay.querySelector('.goal-modal').style.transform = 'scale(0.7) translateY(-50px)';

        setTimeout(() => {
            overlay.style.opacity = '1';
            overlay.querySelector('.goal-modal').style.transform = 'scale(1) translateY(0)';
        }, 150);
    }

    function hideModal() {
        const overlay = document.getElementById('goalOverlay');
        overlay.style.opacity = '0';
        overlay.querySelector('.goal-modal').style.transform = 'scale(0.7) translateY(-50px)';

        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
    
    // Theme selector
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const customPanel = document.getElementById('customThemePanel');
            if (e.target.value === 'custom') {
                customPanel.classList.add('active');
                // Apply custom theme if it exists
                if (window.themeManager) {
                    const colors = {
                        background: document.getElementById('bgColor').value,
                        text: document.getElementById('textColor').value,
                        accent: document.getElementById('accentColor').value,
                        card: document.getElementById('cardColor').value
                    };
                    window.themeManager.applyCustomTheme(colors);
                }
            } else {
                customPanel.classList.remove('active');
                // Apply selected preset theme
                if (window.themeManager && window.themeManager.themes[e.target.value]) {
                    window.themeManager.applyTheme(e.target.value);
                }
            }
        });
    });
    
    // Writing mode selector
    document.querySelectorAll('input[name="writingMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Hide all configs
            document.querySelectorAll('.mode-config').forEach(config => {
                config.classList.remove('active');
            });
            
            // Update description based on selected mode
            const descriptionEl = document.getElementById('writingModeDescription');
            
            // Show selected config and update description
            if (e.target.value === 'focus') {
                document.getElementById('focusConfig').classList.add('active');
                descriptionEl.textContent = 'No rewards or punishments. Just you and your writing.';
            } else if (e.target.value === 'reward') {
                document.getElementById('rewardConfig').classList.add('active');
                descriptionEl.textContent = 'Get rewarded with pleasant sounds and celebrations every few words.';
            } else if (e.target.value === 'punishment') {
                document.getElementById('punishmentConfig').classList.add('active');
                descriptionEl.textContent = 'Face consequences like annoying sounds or red screen when you stop writing.';
            } else if (e.target.value === 'nuclear') {
                document.getElementById('nuclearConfig').classList.add('active');
                descriptionEl.textContent = 'DANGER: Text gets deleted if you stop writing. Use with extreme caution.';
            }
        });
    });

    // Show/hide nuclear warning
    document.querySelectorAll('input[name="punishType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const warning = document.getElementById('nuclearWarning');
            if (e.target.value === 'nuclear') {
                warning.style.display = 'block';
            } else {
                warning.style.display = 'none';
            }
        });
    });

    // Color picker interactions
    document.querySelectorAll('input[type="color"]').forEach(picker => {
        picker.addEventListener('input', (e) => {
            const valueSpan = e.target.parentElement.querySelector('.color-value');
            if (valueSpan) {
                valueSpan.textContent = e.target.value;
            }
            
            // Apply custom theme in real-time if custom is selected
            if (document.getElementById('themeCustom').checked && window.themeManager) {
                const colors = {
                    background: document.getElementById('bgColor').value,
                    text: document.getElementById('textColor').value,
                    accent: document.getElementById('accentColor').value,
                    card: document.getElementById('cardColor').value
                };
                window.themeManager.applyCustomTheme(colors);
            }
        });
    });

    // Font size slider
    document.getElementById('fontSize').addEventListener('input', function() {
        document.getElementById('fontSizeValue').textContent = this.value + 'px';
    });

    // Browse folder button
    document.getElementById('browseFolder').addEventListener('click', () => {
        ipcRenderer.send('select-folder');
    });

    ipcRenderer.on('folder-selected', (event, folderPath) => {
        document.getElementById('currentPath').textContent = folderPath;
        checkForChanges(); // Trigger change detection
    });

    // Open rewards folder (removed since we no longer have image rewards)
    // document.getElementById('openRewardFolder').addEventListener('click', () => {
    //     ipcRenderer.send('open-rewards-folder');
    // });

    // Long-term goals interdependency handler
    const disableLongTermGoals = document.getElementById('disableLongTermGoals');
    if (disableLongTermGoals) {
        disableLongTermGoals.addEventListener('change', function() {
            updateTodayProgressState();
            
            // If toggling FROM disabled TO enabled, show modal and re-enable prompting
            if (!this.checked) {
                ipcRenderer.send('enable-goal-prompting');
                showModal();
            }
        });
    }

    // Function to update reset button visibility
    function updateResetButtonVisibility() {
        try {
            const resetBtn = document.getElementById('resetGoalBtn');
            if (!resetBtn) {
                console.log('Reset button not found');
                return;
            }
            
            // Find the entire setting-item div (resetBtn -> setting-control -> setting-item)
            const settingItem = resetBtn.closest('.setting-item');
            if (!settingItem) {
                console.log('Setting item container not found');
                return;
            }
            
            const hasActiveGoal = checkForActiveGoal();
            console.log('Setting reset goal visibility. Has active goal:', hasActiveGoal);
            
            if (hasActiveGoal) {
                settingItem.style.removeProperty('display');
                console.log('Reset goal setting should now be visible');
            } else {
                settingItem.style.setProperty('display', 'none', 'important');
                console.log('Reset goal setting should now be hidden');
            }
            
            // Double check the actual computed style
            const computedStyle = window.getComputedStyle(settingItem);
            console.log('Setting item computed display style:', computedStyle.display);
            
        } catch (error) {
            console.error('Error in updateResetButtonVisibility:', error);
        }
    }

    // Function to check if there's an active goal
    function checkForActiveGoal() {
        console.log('CHECKING FOR ACTIVE GOAL');
        console.log('currentSettings:', currentSettings);
        
        // Check old longTermGoals system
        if (currentSettings.longTermGoals && currentSettings.longTermGoals.enabled) {
            console.log('Found active longTermGoals');
            return true;
        }
        
        // Check new dailyGoals system
        if (currentSettings.dailyGoals && 
            currentSettings.dailyGoals.type && 
            currentSettings.dailyGoals.type !== 'disabled') {
            console.log('Found active dailyGoals type:', currentSettings.dailyGoals.type);
            return true;
        }
        
        console.log('No active goal found');
        console.log('dailyGoals type:', currentSettings.dailyGoals ? currentSettings.dailyGoals.type : 'undefined');
        return false;
    }

    // Reset goal button handler - button is only visible when there's an active goal
    document.getElementById('resetGoalBtn').addEventListener('click', function() {
        console.log('Reset goal button clicked');
        
        const confirmed = confirm('Are you sure you want to reset your current goal?\n\nThis will:\n• Delete all progress data for your current goal\n• Remove goal tracking from your homepage\n• Allow you to set up a new goal immediately\n\nThis action cannot be undone.');
        
        if (confirmed) {
            ipcRenderer.send('reset-long-term-goal');
            
            // Show success message
            const resetBtn = document.getElementById('resetGoalBtn');
            const originalText = resetBtn.textContent;
            resetBtn.textContent = 'Goal Reset!';
            resetBtn.style.background = '#16a34a';
            resetBtn.disabled = true;
            
            setTimeout(() => {
                resetBtn.textContent = originalText;
                resetBtn.style.background = '#dc2626';
                resetBtn.disabled = false;
                
                // Settings window will remain open - user can close manually or set up new goal from homepage
            }, 2000);
        }
    });

    // Handle goal reset errors
    ipcRenderer.on('goal-reset-error', (event, errorMessage) => {
        console.error('Goal reset failed:', errorMessage);
        const resetBtn = document.getElementById('resetGoalBtn');
        resetBtn.textContent = 'Reset Failed!';
        resetBtn.style.background = '#dc2626';
        resetBtn.disabled = false;
        
        alert('Failed to reset goal: ' + errorMessage);
        
        setTimeout(() => {
            resetBtn.textContent = 'Reset Goal';
        }, 3000);
    });

    // Long-term goals modal event listeners
    document.getElementById('settingsGoalTotalWords').addEventListener('input', updateWordsPerDay);
    document.getElementById('settingsGoalTotalDays').addEventListener('input', updateWordsPerDay);

    document.getElementById('startGoalBtn').addEventListener('click', () => {
        const totalWords = parseInt(document.getElementById('settingsGoalTotalWords').value);
        const totalDays = parseInt(document.getElementById('settingsGoalTotalDays').value);
        
        ipcRenderer.send('set-long-term-goal', {
            enabled: true,
            totalWords: totalWords,
            totalDays: totalDays,
            startDate: new Date().toISOString()
        });
        
        hideModal();
    });

    document.getElementById('disableGoalBtn').addEventListener('click', () => {
        // Update the UI immediately
        document.getElementById('disableLongTermGoals').checked = true;
        updateTodayProgressState();
        
        // Send to backend and auto-save
        
        // Auto-save the settings
        const editorSettings = {
            fontSize: parseInt(document.getElementById('fontSize').value),
            fontFamily: document.getElementById('fontFamily').value,
            hardcoreMode: document.getElementById('hardcoreMode').checked,
            autoFullscreen: document.getElementById('autoFullscreen').checked,
            hideTimer: document.getElementById('hideTimer').checked,
            hideWordCount: document.getElementById('hideWordCount').checked,
            lockExit: document.getElementById('lockExit').checked
        };
        
        const appearanceSettings = {
            theme: document.querySelector('input[name="theme"]:checked').value,
            customColors: {
                background: document.getElementById('bgColor').value,
                text: document.getElementById('textColor').value,
                accent: document.getElementById('accentColor').value,
                card: document.getElementById('cardColor').value
            },
            hideStatsPage: document.getElementById('hideStatsPage').checked,
            hideStatsSidebar: document.getElementById('hideStatsSidebar').checked,
            hideTodayProgress: document.getElementById('hideTodayProgress').checked
        };
        
        const gamificationSettings = {
            mode: document.querySelector('input[name="writingMode"]:checked').value,
            rewardWords: parseInt(document.getElementById('rewardWords').value),
            rewardType: 'sound', // Fixed since we removed image rewards
            gracePeriod: parseInt(document.getElementById('gracePeriod').value),
            punishType: document.querySelector('input[name="punishType"]:checked').value,
            nuclearGracePeriod: parseInt(document.getElementById('nuclearGracePeriod').value),
            deletionSpeed: parseInt(document.getElementById('deletionSpeed').value),
            disableStreak: document.getElementById('disableStreak').checked,
            disableAchievements: document.getElementById('disableAchievements').checked
        };

        const longTermGoalsSettings = null; // Legacy system disabled
        
        ipcRenderer.send('save-all-settings', {
            documentsFolder: document.getElementById('currentPath').textContent !== 'Not set' ?
                document.getElementById('currentPath').textContent : undefined,
            editorSettings,
            appearanceSettings,
            gamificationSettings,
            dailyGoalsSettings
        });

        // Always notify homepage to refresh when settings are saved
        ipcRenderer.send('goal-settings-changed');

        hideModal();
    });

    // Close button handler
    document.getElementById('goalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'goalOverlay') {
                hideModal();
        }
    });

    // Overlay click handler
    document.getElementById('goalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'goalOverlay') {
                hideModal();
        }
    });

    // Modal close button handler
    document.getElementById('modalClose').addEventListener('click', () => {
        hideModal();
    });

    // Load current settings - delay to let visibility controller load first
    setTimeout(() => {
        ipcRenderer.send('get-settings');
    }, 500);
    
    let currentSettings = {}; // Store current settings to preserve values when saving
    
    ipcRenderer.on('load-settings', (event, settings) => {
        console.log('Settings loaded:', settings);
        console.log('Loading settings:', settings);
        currentSettings = settings; // Store current settings
        
        // Set document path
        if (settings.documentsFolder) {
            document.getElementById('currentPath').textContent = settings.documentsFolder;
        }

        // Update reset button visibility based on active goals
        updateResetButtonVisibility();
        
        // Load daily goals settings
        if (settings.dailyGoals) {
            document.getElementById('dailyGoalType').value = settings.dailyGoals.type || 'disabled';
            document.getElementById('dailyWordTarget').value = settings.dailyGoals.dailyWordTarget || 500;
            document.getElementById('longtermTotalWords').value = settings.dailyGoals.longtermTotalWords || 50000;
            document.getElementById('longtermTotalDays').value = settings.dailyGoals.longtermTotalDays || 30;
            
            // Set streak preservation setting
            const streakPreservation = settings.dailyGoals.streakPreservation || 'any';
            const streakRadio = document.querySelector(`input[name="streakPreservation"][value="${streakPreservation}"]`);
            if (streakRadio) {
                streakRadio.checked = true;
            }
            
            // disablePrompting removed - no longer needed
            
            // Update UI based on goal type
            setTimeout(() => {
                updateDailyGoalUI();
            }, 100);
        } else {
            // Handle backward compatibility - if user has old longTermGoals, migrate to dailyGoals
            if (settings.longTermGoals && settings.longTermGoals.enabled) {
                document.getElementById('dailyGoalType').value = 'longterm';
                document.getElementById('longtermTotalWords').value = settings.longTermGoals.totalWords || 50000;
                document.getElementById('longtermTotalDays').value = settings.longTermGoals.totalDays || 30;
            } else {
                document.getElementById('dailyGoalType').value = 'disabled';
            }
            
            if (settings.longTermGoals) {
                // disablePrompting removed - no longer needed
            }
            
            // Update UI
            setTimeout(() => {
                updateDailyGoalUI();
            }, 100);
        }
        
        // Load editor settings if they exist
        if (settings.editorSettings) {
            document.getElementById('fontSize').value = settings.editorSettings.fontSize || 18;
            document.getElementById('fontSizeValue').textContent = (settings.editorSettings.fontSize || 18) + 'px';
            document.getElementById('fontFamily').value = settings.editorSettings.fontFamily || 'Georgia';
            document.getElementById('hardcoreMode').checked = settings.editorSettings.hardcoreMode || false;
            document.getElementById('autoFullscreen').checked = settings.editorSettings.autoFullscreen || false;
            document.getElementById('hideTimer').checked = settings.editorSettings.hideTimer || false;
            document.getElementById('hideWordCount').checked = settings.editorSettings.hideWordCount || false;
            document.getElementById('lockExit').checked = settings.editorSettings?.lockExit !== false; // Default true
        }
        
        // Load appearance settings
        if (settings.appearanceSettings) {
            const theme = settings.appearanceSettings.theme || 'dark';
            document.getElementById('theme' + theme.charAt(0).toUpperCase() + theme.slice(1)).checked = true;
            
            if (theme === 'custom' && settings.appearanceSettings.customColors) {
                document.getElementById('customThemePanel').classList.add('active');
                document.getElementById('bgColor').value = settings.appearanceSettings.customColors.background || '#1a1a1a';
                document.getElementById('textColor').value = settings.appearanceSettings.customColors.text || '#e0e0e0';
                document.getElementById('accentColor').value = settings.appearanceSettings.customColors.accent || '#14b8a6';
                document.getElementById('cardColor').value = settings.appearanceSettings.customColors.card || '#252525';
                
                // Update color value displays
                document.querySelector('#bgColor + .color-value').textContent = settings.appearanceSettings.customColors.background || '#1a1a1a';
                document.querySelector('#textColor + .color-value').textContent = settings.appearanceSettings.customColors.text || '#e0e0e0';
                document.querySelector('#accentColor + .color-value').textContent = settings.appearanceSettings.customColors.accent || '#14b8a6';
                document.querySelector('#cardColor + .color-value').textContent = settings.appearanceSettings.customColors.card || '#252525';
            }
            
            document.getElementById('hideStatsPage').checked = settings.appearanceSettings.hideStatsPage || false;
            document.getElementById('hideStatsSidebar').checked = settings.appearanceSettings.hideStatsSidebar || false;
            document.getElementById('hideTodayProgress').checked = settings.appearanceSettings.hideTodayProgress || false;
        }
        
        // Load gamification settings
        console.log('Full settings object:', settings);
        console.log('gamificationSettings:', settings.gamificationSettings);
        if (settings.gamificationSettings) {
            const mode = settings.gamificationSettings.mode || 'focus';
            console.log('Extracted mode:', mode);
            updateGamificationModeUI(mode);
            
            document.getElementById('rewardWords').value = settings.gamificationSettings.rewardWords || 100;
            document.getElementById('gracePeriod').value = settings.gamificationSettings.gracePeriod || 10;
            document.getElementById('nuclearGracePeriod').value = settings.gamificationSettings.nuclearGracePeriod !== undefined ? settings.gamificationSettings.nuclearGracePeriod : 10;
            document.getElementById('deletionSpeed').value = settings.gamificationSettings.deletionSpeed !== undefined ? settings.gamificationSettings.deletionSpeed : 5;
            
            // Reward type removed since we simplified reward mode
            // if (settings.gamificationSettings.rewardType) {
            //     document.querySelector(`input[name="rewardType"][value="${settings.gamificationSettings.rewardType}"]`).checked = true;
            // }
            
            if (settings.gamificationSettings.punishType) {
                document.querySelector(`input[name="punishType"][value="${settings.gamificationSettings.punishType}"]`).checked = true;
                if (settings.gamificationSettings.punishType === 'nuclear') {
                    document.getElementById('nuclearWarning').style.display = 'block';
                }
            }
            
            document.getElementById('disableStreak').checked = settings.gamificationSettings.disableStreak || false;
            document.getElementById('disableAchievements').checked = settings.gamificationSettings.disableAchievements || false;
        }

        updateTodayProgressState();
        
        // Ensure mode description is set correctly on load by triggering change event
        setTimeout(() => {
            const checkedMode = document.querySelector('input[name="writingMode"]:checked');
            if (checkedMode) {
                console.log('Triggering change event for mode:', checkedMode.value);
                checkedMode.dispatchEvent(new Event('change'));
            }
        }, 150);
        
        // Capture original settings after loading
        setTimeout(() => {
            originalSettings = captureCurrentSettings();
        }, 600);
    });

    console.log('Script is running, looking for save button...');
    
    // Save settings
    const saveButton = document.getElementById('saveSettings');
    console.log('Save button found:', saveButton);
    if (saveButton) {
        saveButton.addEventListener('click', () => {
        console.log('Save button clicked!');
        try {
        const editorSettings = {
            fontSize: parseInt(document.getElementById('fontSize').value),
            fontFamily: document.getElementById('fontFamily').value,
            hardcoreMode: document.getElementById('hardcoreMode').checked,
            autoFullscreen: document.getElementById('autoFullscreen').checked,
            hideTimer: document.getElementById('hideTimer').checked,
            hideWordCount: document.getElementById('hideWordCount').checked,
            lockExit: document.getElementById('lockExit').checked
        };
        
        const appearanceSettings = {
            theme: document.querySelector('input[name="theme"]:checked').value,
            customColors: {
                background: document.getElementById('bgColor').value,
                text: document.getElementById('textColor').value,
                accent: document.getElementById('accentColor').value,
                card: document.getElementById('cardColor').value
            },
            hideStatsPage: document.getElementById('hideStatsPage').checked,
            hideStatsSidebar: document.getElementById('hideStatsSidebar').checked,
            hideTodayProgress: document.getElementById('hideTodayProgress').checked
        };
        
        const gamificationSettings = {
            mode: document.querySelector('input[name="writingMode"]:checked').value,
            rewardWords: parseInt(document.getElementById('rewardWords').value),
            rewardType: 'sound', // Fixed since we removed image rewards
            gracePeriod: parseInt(document.getElementById('gracePeriod').value),
            punishType: document.querySelector('input[name="punishType"]:checked').value,
            nuclearGracePeriod: parseInt(document.getElementById('nuclearGracePeriod').value),
            deletionSpeed: parseInt(document.getElementById('deletionSpeed').value),
            disableStreak: document.getElementById('disableStreak').checked,
            disableAchievements: document.getElementById('disableAchievements').checked
        };

        const goalType = document.getElementById('dailyGoalType').value;
        const isNewLongtermGoal = goalType === 'longterm' &&
            (currentSettings.dailyGoals?.type !== 'longterm' ||
             !currentSettings.dailyGoals?.longtermStartDate);

        const dailyGoalsSettings = {
            type: goalType,
            dailyWordTarget: parseInt(document.getElementById('dailyWordTarget').value) || 500,
            longtermTotalWords: parseInt(document.getElementById('longtermTotalWords').value) || 50000,
            longtermTotalDays: parseInt(document.getElementById('longtermTotalDays').value) || 30,
            streakPreservation: document.querySelector('input[name="streakPreservation"]:checked')?.value || 'any',
            // Set new start date for new long-term goals, preserve for existing goals
            longtermStartDate: isNewLongtermGoal ? new Date().toISOString() : currentSettings.dailyGoals?.longtermStartDate,
            completed: isNewLongtermGoal ? false : currentSettings.dailyGoals?.completed,
            completedDate: isNewLongtermGoal ? null : currentSettings.dailyGoals?.completedDate
        };
        
        console.log('Saving theme:', appearanceSettings.theme);
        
        ipcRenderer.send('save-all-settings', {
            documentsFolder: document.getElementById('currentPath').textContent !== 'Not set' ? 
                document.getElementById('currentPath').textContent : undefined,
            editorSettings,
            appearanceSettings,
            gamificationSettings,
            dailyGoalsSettings
        });
        
        // Update current settings and reset button visibility after saving
        currentSettings.dailyGoals = dailyGoalsSettings;
        updateResetButtonVisibility();
        
        // Show save message
        const saveMessage = document.getElementById('saveMessage');
        saveMessage.classList.add('show');
        setTimeout(() => {
            saveMessage.classList.remove('show');
        }, 3000);
        
        // Mark settings as saved to reset change detection
        markSettingsAsSaved();
        console.log('Save completed successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
        }
        });
    } else {
        console.error('Save button not found!');
    }

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

    // Listen for window focus to reload settings and sync with homepage changes
    window.addEventListener('focus', () => {
        console.log('Settings window focused, reloading settings...');
        ipcRenderer.send('get-settings');
    });

    // Function to update gamification mode UI
    function updateGamificationModeUI(mode) {
        console.log('Updating gamification mode UI to:', mode);
        
        // Update radio button selection
        const modeRadio = document.getElementById('mode' + mode.charAt(0).toUpperCase() + mode.slice(1));
        if (modeRadio) {
            // Clear all mode selections
            document.querySelectorAll('input[name="writingMode"]').forEach(radio => {
                radio.checked = false;
            });
            
            // Check the new mode
            modeRadio.checked = true;
            
            // Hide all configs
            document.querySelectorAll('.mode-config').forEach(config => {
                config.classList.remove('active');
            });
            
            // Show selected config
            document.getElementById(mode + 'Config').classList.add('active');
            
            // Update description
            const descriptionEl = document.getElementById('writingModeDescription');
            if (descriptionEl) {
                if (mode === 'focus') {
                    descriptionEl.textContent = 'No rewards or punishments. Just you and your writing.';
                } else if (mode === 'reward') {
                    descriptionEl.textContent = 'Get rewarded with pleasant sounds and celebrations every few words.';
                } else if (mode === 'punishment') {
                    descriptionEl.textContent = 'Face consequences like annoying sounds or red screen when you stop writing.';
                } else if (mode === 'nuclear') {
                    descriptionEl.textContent = 'DANGER: Text gets deleted if you stop writing. Use with extreme caution.';
                }
            }
        }
    }

    // Preset theme buttons functionality
    const presetThemes = {
        dark: {
            background: '#0d0d0d',
            text: '#ffffff',
            accent: '#14b8a6',
            card: '#252525'
        },
        light: {
            background: '#ffffff',
            text: '#1a1a1a',
            accent: '#14b8a6',
            card: '#f5f5f5'
        },
        midnight: {
            background: '#0f0f23',
            text: '#e0e0ff',
            accent: '#7c3aed',
            card: '#1a1a35'
        },
        forest: {
            background: '#6ab486',
            text: '#e0f0e0',
            accent: '#ca9381',
            card: '#2e5642'
        },
        sepia: {
            background: '#f4f1ea',
            text: '#3e2f1f',
            accent: '#b8860b',
            card: '#e8e2d5'
        },
        crystalline: {
            background: '#7e6ab4',
            text: '#ffffff',
            accent: '#14b8a6',
            card: '#372e56'
        }
    };

    // Handle preset button clicks
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const preset = e.target.dataset.preset;
            if (presetThemes[preset]) {
                // Update color pickers
                document.getElementById('bgColor').value = presetThemes[preset].background;
                document.getElementById('textColor').value = presetThemes[preset].text;
                document.getElementById('accentColor').value = presetThemes[preset].accent;
                document.getElementById('cardColor').value = presetThemes[preset].card;
                
                // Update color value displays
                document.querySelector('#bgColor + .color-value').textContent = presetThemes[preset].background;
                document.querySelector('#textColor + .color-value').textContent = presetThemes[preset].text;
                document.querySelector('#accentColor + .color-value').textContent = presetThemes[preset].accent;
                document.querySelector('#cardColor + .color-value').textContent = presetThemes[preset].card;
                
                // Apply theme immediately
                if (window.themeManager) {
                    window.themeManager.applyCustomTheme(presetThemes[preset]);
                }
                
                // Update active button
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Trigger save bar
                checkForChanges();
            }
        });
    });

    // Show focus mode config by default
    document.getElementById('focusConfig').classList.add('active');
    
    // Daily goal type handler
    function updateDailyGoalUI() {
        const goalType = document.getElementById('dailyGoalType').value;
        const indefiniteSettings = document.getElementById('indefiniteGoalSettings');
        const longtermSettings = document.getElementById('longtermGoalSettings');
        const streakSettings = document.getElementById('streakPreservationSettings');
        
        console.log('Updating daily goal UI for type:', goalType);
        
        // Hide all settings first
        indefiniteSettings.style.display = 'none';
        longtermSettings.style.display = 'none';
        streakSettings.style.display = 'none';
        
        if (goalType === 'indefinite') {
            console.log('Showing indefinite goal settings');
            indefiniteSettings.style.display = 'flex';
            streakSettings.style.display = 'flex';
        } else if (goalType === 'longterm') {
            console.log('Showing longterm goal settings');
            longtermSettings.style.display = 'flex';
            streakSettings.style.display = 'flex';
            updateLongtermWordsPerDay();
            
            // Ensure the text boxes are not disabled
            const wordsInput = document.getElementById('longtermTotalWords');
            const daysInput = document.getElementById('longtermTotalDays');
            if (wordsInput) {
                wordsInput.disabled = false;
                wordsInput.readOnly = false;
            }
            if (daysInput) {
                daysInput.disabled = false;
                daysInput.readOnly = false;
            }
            console.log('Longterm text boxes enabled', {
                wordsDisabled: wordsInput?.disabled,
                wordsReadOnly: wordsInput?.readOnly,
                daysDisabled: daysInput?.disabled,
                daysReadOnly: daysInput?.readOnly
            });
        }
        // For 'disabled' (freewrite), all settings remain hidden
        
        // Update the currentSettings to reflect the UI change and update reset button visibility
        if (currentSettings.dailyGoals) {
            currentSettings.dailyGoals.type = goalType;
        }
        updateResetButtonVisibility();
    }
    
    function updateLongtermWordsPerDay() {
        const totalWords = parseInt(document.getElementById('longtermTotalWords').value) || 50000;
        const totalDays = parseInt(document.getElementById('longtermTotalDays').value) || 30;
        const wordsPerDay = Math.ceil(totalWords / totalDays);
        document.getElementById('longtermWordsPerDay').textContent = `= ${wordsPerDay.toLocaleString()} words per day`;
    }
    
    // Add event listeners for daily goal type
    document.getElementById('dailyGoalType').addEventListener('change', updateDailyGoalUI);
    document.getElementById('longtermTotalWords').addEventListener('input', updateLongtermWordsPerDay);
    document.getElementById('longtermTotalDays').addEventListener('input', updateLongtermWordsPerDay);
    
    // Add change tracking to all form elements
    function addChangeTracking() {
        // Track all checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            console.log('Adding change tracking to checkbox:', checkbox.id);
            checkbox.addEventListener('change', checkForChanges);
        });
        
        // Track all radio buttons
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', checkForChanges);
        });
        
        // Track all text inputs, number inputs, and selects
        document.querySelectorAll('input[type="text"], input[type="number"], input[type="range"], input[type="color"], select').forEach(input => {
            input.addEventListener('input', checkForChanges);
            input.addEventListener('change', checkForChanges);
        });
    }
    
    // Initialize change tracking after settings are loaded
    setTimeout(addChangeTracking, 700);
    
    // Wire up sticky save button
    document.getElementById('stickySaveButton').addEventListener('click', () => {
        // Use the same save logic as the main save button
        document.getElementById('saveSettings').click();
    });
