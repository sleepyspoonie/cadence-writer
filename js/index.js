    
    console.log('Script initialized - waiting for settings...');
    
    // New Tutorial System
    const tutorialSteps = [
      {
        target: '.optionsnav li:first-child',
        title: 'Home',
        text: 'This is your homepage - your writing command center. Configure sessions and start writing from here.',
        position: 'bottom-left'
      },
      {
        target: '.optionsnav a[href="about.html"]',
        title: 'About',
        text: 'Version information and helpful resources for Cadence Writer.',
        position: 'bottom'
      },
      {
        target: '.optionsnav a[href="files.html"]',
        title: 'Files',
        text: 'Manage all your writing projects. Browse, open, and organize your documents.',
        position: 'bottom'
      },
      {
        target: '.optionsnav a[href="statistics.html"]',
        title: 'Statistics',
        text: 'Track your progress, view achievements, and monitor your writing streaks.',
        position: 'bottom'
      },
      {
        target: '.optionsnav a[href="settings.html"]',
        title: 'Settings',
        text: 'Customize Cadence Writer - themes, gamification modes, and editor preferences.',
        position: 'bottom'
      },
      {
        target: '.settings-toggle',
        title: 'Writing Modes',
        text: 'Choose between Timer mode (write for a set time) or Word Count mode (write until you reach your goal).',
        position: 'right'
      },
      {
        target: '.mode-selection',
        title: 'Writing Modes',
        text: 'Select your writing style: Focus, Reward, Punishment, or Nuclear mode to stay motivated.',
        position: 'right'
      },
      {
        target: '.documentselect',
        title: 'Start Writing',
        text: 'Choose to start a new project, open your most recent work, or browse existing documents.',
        position: 'right'
      }
    ];
    
    let currentStep = 0;
    let spotlightElement = null;
    
    function showWelcome() {
      console.log('✓ showWelcome() called - setting up welcome modal');
      const overlay = document.getElementById('welcomeOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '0';
        console.log('✓ Welcome overlay found and display set to flex');
      } else {
        console.error('✗ Welcome overlay element not found!');
        return;
      }

      setTimeout(() => {
        overlay.style.opacity = '1';
      }, 150);
    }
    
    function hideWelcome() {
      const overlay = document.getElementById('welcomeOverlay');
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
    
    function showStep2() {
      document.getElementById('welcomeStep1').style.display = 'none';
      document.getElementById('welcomeStep2').style.display = 'block';
    }
    
    function startSpotlightTour() {
      hideWelcome();
      currentStep = 0;
      setTimeout(() => {
        showSpotlightStep(currentStep);
      }, 500);
    }
    
    function showSpotlightStep(stepIndex) {
      const step = tutorialSteps[stepIndex];
      const target = document.querySelector(step.target);
      
      if (!target) {
        console.error('Target not found:', step.target);
        return;
      }
      
      // Show spotlight overlay
      const spotlight = document.getElementById('tutorialSpotlight');
      spotlight.style.display = 'block';
      
      // Create spotlight effect
      createSpotlight(target);
      
      // Position and show tooltip
      positionTooltip(target, step);
      
      // Update tooltip content
      document.getElementById('tooltipTitle').textContent = step.title;
      document.getElementById('tooltipText').textContent = step.text;
      document.getElementById('tutorialProgress').textContent = `${stepIndex + 1} / ${tutorialSteps.length}`;
      
      // Update navigation buttons
      const prevBtn = document.getElementById('tutorialPrev');
      const nextBtn = document.getElementById('tutorialNext');
      
      prevBtn.style.display = stepIndex > 0 ? 'inline-flex' : 'none';
      nextBtn.textContent = stepIndex === tutorialSteps.length - 1 ? 'Finish Tour' : 'Next';
    }
    
    function createSpotlight(target) {
      const rect = target.getBoundingClientRect();
      const overlay = document.querySelector('.tutorial-overlay-dark');
      
      // Create spotlight effect with CSS custom properties
      const spotlightX = rect.left + rect.width / 2;
      const spotlightY = rect.top + rect.height / 2;
      const spotlightWidth = rect.width + 20;
      const spotlightHeight = rect.height + 20;
      
      overlay.style.setProperty('--spotlight-x', spotlightX + 'px');
      overlay.style.setProperty('--spotlight-y', spotlightY + 'px');
      overlay.style.setProperty('--spotlight-width', spotlightWidth + 'px');
      overlay.style.setProperty('--spotlight-height', spotlightHeight + 'px');
      
      // Ensure target is above overlay
      target.style.position = 'relative';
      target.style.zIndex = '1001';
      spotlightElement = target;
    }
    
    function positionTooltip(target, step) {
      const tooltip = document.getElementById('tutorialTooltip');
      const rect = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      tooltip.style.position = 'fixed';
      tooltip.style.zIndex = '1002';
      
      // Get tooltip dimensions (show it temporarily to measure)
      tooltip.style.visibility = 'hidden';
      tooltip.style.display = 'block';
      const tooltipRect = tooltip.getBoundingClientRect();
      tooltip.style.visibility = 'visible';
      
      let finalLeft, finalTop, transform;
      
      switch(step.position) {
        case 'bottom':
          finalTop = rect.bottom + 20;
          finalLeft = rect.left + rect.width / 2;
          transform = 'translateX(-50%)';
          
          // Special handling for navigation items that might be at screen edge
          const minLeft = 20; // More margin for nav items
          const maxRight = viewportWidth - 20;
          
          // Prevent horizontal overflow with better margins
          if (finalLeft - tooltipRect.width / 2 < minLeft) {
            finalLeft = minLeft + tooltipRect.width / 2;
            // For items near the left edge, align tooltip to the left side of target
            if (rect.left < 100) { // If target is very close to left edge
              finalLeft = Math.max(minLeft + tooltipRect.width / 2, rect.left + tooltipRect.width / 2);
              transform = 'translateX(-25%)'; // Less centering for edge items
            }
          } else if (finalLeft + tooltipRect.width / 2 > maxRight) {
            finalLeft = maxRight - tooltipRect.width / 2;
          }
          
          // If tooltip would go below viewport, position above instead
          if (finalTop + tooltipRect.height > viewportHeight - 10) {
            finalTop = rect.top - 20;
            // Keep the same horizontal positioning but change vertical transform
            if (transform === 'translateX(-25%)') {
              transform = 'translate(-25%, -100%)';
            } else {
              transform = 'translate(-50%, -100%)';
            }
          }
          break;
          
        case 'bottom-left':
          finalTop = rect.bottom + 20;
          finalLeft = rect.left;
          transform = 'translateX(0)'; // No centering, align to left edge of target
          
          // Ensure tooltip doesn't go off left edge
          if (finalLeft < 20) {
            finalLeft = 20;
          }
          
          // Ensure tooltip doesn't go off right edge  
          if (finalLeft + tooltipRect.width > viewportWidth - 20) {
            finalLeft = viewportWidth - 20 - tooltipRect.width;
          }
          
          // If tooltip would go below viewport, position above instead
          if (finalTop + tooltipRect.height > viewportHeight - 10) {
            finalTop = rect.top - 20;
            transform = 'translate(0, -100%)';
          }
          break;
          
        case 'right':
          finalTop = rect.top + rect.height / 2;
          finalLeft = rect.right + 20;
          transform = 'translateY(-50%)';
          
          // If tooltip would go off right edge, position left instead
          if (finalLeft + tooltipRect.width > viewportWidth - 10) {
            finalLeft = rect.left - 20;
            transform = 'translate(-100%, -50%)';
          }
          
          // Prevent vertical overflow
          if (finalTop - tooltipRect.height / 2 < 10) {
            finalTop = 10 + tooltipRect.height / 2;
          } else if (finalTop + tooltipRect.height / 2 > viewportHeight - 10) {
            finalTop = viewportHeight - 10 - tooltipRect.height / 2;
          }
          break;
          
        case 'left':
          finalTop = rect.top + rect.height / 2;
          finalLeft = rect.left - 20;
          transform = 'translate(-100%, -50%)';
          
          // If tooltip would go off left edge, position right instead
          if (finalLeft - tooltipRect.width < 10) {
            finalLeft = rect.right + 20;
            transform = 'translateY(-50%)';
          }
          
          // Prevent vertical overflow
          if (finalTop - tooltipRect.height / 2 < 10) {
            finalTop = 10 + tooltipRect.height / 2;
          } else if (finalTop + tooltipRect.height / 2 > viewportHeight - 10) {
            finalTop = viewportHeight - 10 - tooltipRect.height / 2;
          }
          break;
          
        case 'top':
          finalTop = rect.top - 20;
          finalLeft = rect.left + rect.width / 2;
          transform = 'translate(-50%, -100%)';
          
          // Prevent horizontal overflow
          if (finalLeft - tooltipRect.width / 2 < 10) {
            finalLeft = 10 + tooltipRect.width / 2;
          } else if (finalLeft + tooltipRect.width / 2 > viewportWidth - 10) {
            finalLeft = viewportWidth - 10 - tooltipRect.width / 2;
          }
          
          // If tooltip would go above viewport, position below instead
          if (finalTop - tooltipRect.height < 10) {
            finalTop = rect.bottom + 20;
            transform = 'translateX(-50%)';
          }
          break;
      }
      
      tooltip.style.top = finalTop + 'px';
      tooltip.style.left = finalLeft + 'px';
      tooltip.style.transform = transform;
    }
    
    function nextTutorialStep() {
      if (spotlightElement) {
        spotlightElement.style.position = '';
        spotlightElement.style.zIndex = '';
        spotlightElement = null;
      }
      
      if (currentStep < tutorialSteps.length - 1) {
        currentStep++;
        showSpotlightStep(currentStep);
      } else {
        // Tour complete
        hideSpotlight();
        showTutorialComplete();
      }
    }
    
    function prevTutorialStep() {
      if (spotlightElement) {
        spotlightElement.style.position = '';
        spotlightElement.style.zIndex = '';
        spotlightElement = null;
      }
      
      if (currentStep > 0) {
        currentStep--;
        showSpotlightStep(currentStep);
      }
    }
    
    function hideSpotlight() {
      const spotlight = document.getElementById('tutorialSpotlight');
      spotlight.style.display = 'none';
      
      if (spotlightElement) {
        spotlightElement.style.position = '';
        spotlightElement.style.zIndex = '';
        spotlightElement = null;
      }
    }
    
    
    function showTutorialComplete() {
      const overlay = document.getElementById('tutorialCompleteOverlay');
      overlay.style.display = 'flex';
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        overlay.style.opacity = '1';
      }, 150);
    }
    
    function hideTutorialComplete() {
      const overlay = document.getElementById('tutorialCompleteOverlay');
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        overlay.style.display = 'none';
        // Mark tutorial as completed
        ipcRenderer.send('tutorial-completed');
      }, 300);
    }
    
    function checkFirstTime() {
      console.log('checkFirstTime() called - sending check-first-time to main process');
      ipcRenderer.send('check-first-time');
    }
    
    // Celebration modal functions (global scope)
    function showCelebrationModal(completionInfo = null) {
        console.log('showCelebrationModal called', completionInfo);
        const overlay = document.getElementById('celebrationOverlay');
        const messageElement = document.getElementById('celebrationMessage');

        if (!overlay) {
            console.error('celebrationOverlay element not found!');
            return;
        }

        // Customize the message based on completion info
        if (completionInfo && completionInfo.completedEarly && completionInfo.daysAhead > 0) {
            const daysWord = completionInfo.daysAhead === 1 ? 'day' : 'days';
            messageElement.innerHTML = `
                <div style="font-size: 1.2em; margin-bottom: 12px;">
                    🎉 Incredible! You've completed your ${completionInfo.totalWords.toLocaleString()}-word goal!
                </div>
                <div style="font-size: 1em; color: var(--color-accent); font-weight: bold;">
                    You finished ${completionInfo.daysAhead} ${daysWord} ahead of schedule!
                </div>
                <div style="font-size: 0.9em; margin-top: 8px; color: var(--color-text-muted);">
                    Completed in ${completionInfo.daysTaken} days instead of ${completionInfo.totalDays}
                </div>
            `;
        } else if (completionInfo) {
            messageElement.innerHTML = `
                <div style="font-size: 1.2em; margin-bottom: 12px;">
                    🎉 Congratulations! You've completed your ${completionInfo.totalWords.toLocaleString()}-word goal!
                </div>
                <div style="font-size: 0.9em; color: var(--color-text-muted);">
                    ${completionInfo.wordsWritten.toLocaleString()} words written in ${completionInfo.daysTaken} days
                </div>
            `;
        } else {
            messageElement.textContent = "You've completed your writing goal!";
        }

        overlay.style.display = 'flex';
        overlay.style.opacity = '0';

        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 150);
    }

    function hideCelebrationModal() {
        console.log('hideCelebrationModal called');
        const overlay = document.getElementById('celebrationOverlay');
        if (!overlay) return;
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
    
    // Debug: Add window function to manually trigger celebration
    window.debugShowCelebration = function() {
        console.log('Manually triggering celebration modal');
        showCelebrationModal(null);
    };
    
    // Request settings on load
    ipcRenderer.send('get-settings');
    
    // Long-term goals functionality (define outside DOMContentLoaded)
    function updateWordsPerDay() {
        const totalWords = parseInt(document.getElementById('goalTotalWords').value);
        const totalDays = parseInt(document.getElementById('goalTotalDays').value);
        const wordsPerDay = Math.ceil(totalWords / totalDays);
        document.getElementById('wordsPerDay').textContent = `${wordsPerDay.toLocaleString()} words per day`;
    }

    function checkForGoalSetup() {
        ipcRenderer.send('check-goal-setup');
    }

    function showModal() {
        try {
            const overlay = document.getElementById('goalOverlay');
            
            if (!overlay) {
                console.error('goalOverlay element not found!');
                return;
            }
            
            overlay.style.display = 'flex';
            overlay.style.opacity = '0';
            
            const modalElement = overlay.querySelector('.goal-modal');
            
            if (modalElement) {
                modalElement.style.transform = 'scale(0.7) translateY(-50px)';
            }
        
            setTimeout(() => {
                try {
                    overlay.style.opacity = '1';
                    if (modalElement) {
                        modalElement.style.transform = 'scale(1) translateY(0)';
                    }
                } catch (animError) {
                    console.error('Error in modal animation:', animError);
                }
            }, 150);
        } catch (error) {
            console.error('Error in showModal():', error);
        }
    }

    function hideModal() {
        const overlay = document.getElementById('goalOverlay');
        overlay.style.opacity = '0';
        overlay.querySelector('.goal-modal').style.transform = 'scale(0.7) translateY(-50px)';
    
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500); // Increased from 300ms to 500ms for slower hide
    }

    ipcRenderer.on('show-goal-setup', () => {
        try {
            console.log('Received show-goal-setup event');
            showModal();
        } catch (error) {
            console.error('Error showing goal setup modal:', error);
        }
    });
    
    // New Tutorial IPC Event Listeners
    ipcRenderer.on('show-welcome', () => {
        console.log('✓ RECEIVED show-welcome event - calling showWelcome()');
        showWelcome();
    });
    
    ipcRenderer.on('tutorial-folder-selected', (event, folderPath) => {
        console.log('Tutorial folder selected:', folderPath);
        showStep2();
    });
    
    // Update existing goal setup completion to show tutorial complete
    const originalStartGoal = document.getElementById('startGoalBtn');
    const originalDisableGoal = document.getElementById('disableGoalBtn');
    const originalCloseModal = document.getElementById('modalClose');
    
    // Achievement unlocks are handled by achievement-notifications.js system

    // Handle queued achievements from completed writing sessions
    ipcRenderer.on('queued-achievements', (event, achievements) => {
        console.log('Queued achievements received:', achievements);
        console.log('Achievement notifier available:', !!window.achievementNotifications);
        
        if (achievements.length > 0) {
            if (window.achievementNotifications) {
                console.log('Displaying', achievements.length, 'queued achievements');
                // Show queued achievements with a small delay between each
                achievements.forEach((achievement, index) => {
                    setTimeout(() => {
                        console.log('Showing queued achievement:', achievement.title);
                        // Only play sound for the first achievement to avoid overlapping chimes
                        const playSound = index === 0;
                        window.achievementNotifications.showNotification(achievement, playSound);
                    }, index * 800); // 800ms delay between each achievement
                });
            } else {
                console.warn('Achievement notifier not available, cannot show achievements');
                // Try again after a short delay in case the script is still loading
                setTimeout(() => {
                    if (window.achievementNotifications) {
                        console.log('Achievement notifier now available, showing achievements');
                        achievements.forEach((achievement, index) => {
                            setTimeout(() => {
                                console.log('Showing queued achievement:', achievement.title);
                                // Only play sound for the first achievement to avoid overlapping chimes
                                const playSound = index === 0;
                                window.achievementNotifications.showNotification(achievement, playSound);
                            }, index * 800);
                        });
                    } else {
                        console.error('Achievement notifier still not available after delay');
                    }
                }, 1000);
            }
        } else {
            console.log('No queued achievements to display');
        }
    });
    
    // Check for recent file and request stats on load
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded - adding event listeners');
        updateRecentFileOption();
        
        // Check for first time initialization instead of goal setup immediately
        console.log('Calling checkFirstTime on DOMContentLoaded...');
        checkFirstTime();
        
        // Request homepage stats and queued achievements
        ipcRenderer.send('get-homepage-stats');
        ipcRenderer.send('get-queued-achievements');
        
        // Refresh stats when window regains focus (after returning from editor)
        window.addEventListener('focus', () => {
            console.log('Homepage window focused, refreshing stats...');
            ipcRenderer.send('get-homepage-stats');
            // Also check for queued achievements from completed sessions
            ipcRenderer.send('get-queued-achievements');
        });
        
        // New Tutorial System Event Listeners
        document.getElementById('selectFolderBtn').addEventListener('click', () => {
          ipcRenderer.send('select-tutorial-folder');
        });
        
        document.getElementById('startTourBtn').addEventListener('click', () => {
          startSpotlightTour();
        });
        
        document.getElementById('tutorialNext').addEventListener('click', () => {
          nextTutorialStep();
        });
        
        document.getElementById('tutorialPrev').addEventListener('click', () => {
          prevTutorialStep();
        });
        
        
        document.getElementById('finishTutorialBtn').addEventListener('click', () => {
          hideTutorialComplete();
          // Show daily goals setup after tutorial completion
          setTimeout(() => {
            showModal();
          }, 500);
        });
        
        // Daily goals modal functionality
        function updateModalGoalUI() {
            const selectedType = document.querySelector('input[name="modalGoalType"]:checked')?.value;
            const indefiniteInputs = document.getElementById('modalIndefiniteInputs');
            const longTermInputs = document.getElementById('modalLongTermInputs');
            const streakSetting = document.getElementById('modalStreakSetting');
            const startBtn = document.getElementById('startGoalBtn');
            
            // Hide all inputs first
            indefiniteInputs.style.display = 'none';
            longTermInputs.style.display = 'none';
            streakSetting.style.display = 'none';
            
            if (selectedType === 'freewrite') {
                startBtn.disabled = false;
                startBtn.textContent = 'Start Freewriting!';
            } else if (selectedType === 'indefinite') {
                indefiniteInputs.style.display = 'block';
                streakSetting.style.display = 'block';
                startBtn.disabled = false;
                startBtn.textContent = 'Start my goal!';
            } else if (selectedType === 'longterm') {
                longTermInputs.style.display = 'block';
                streakSetting.style.display = 'block';
                startBtn.disabled = false;
                startBtn.textContent = 'Start my goal!';
                updateWordsPerDay();
            } else {
                startBtn.disabled = true;
                startBtn.textContent = 'Start my goal!';
            }
        }
        
        // Add event listeners for modal goal type selection
        document.querySelectorAll('input[name="modalGoalType"]').forEach(radio => {
            radio.addEventListener('change', updateModalGoalUI);
        });
        
        // Long-term goals event listeners
        document.getElementById('goalTotalWords').addEventListener('input', updateWordsPerDay);
        document.getElementById('goalTotalDays').addEventListener('input', updateWordsPerDay);

        document.getElementById('startGoalBtn').addEventListener('click', () => {
            const selectedType = document.querySelector('input[name="modalGoalType"]:checked')?.value;
            const streakPreservation = document.querySelector('input[name="modalStreakPreservation"]:checked')?.value || 'any';
            
            let goalData;
            if (selectedType === 'freewrite') {
                goalData = {
                    type: 'disabled'
                };
            } else if (selectedType === 'indefinite') {
                goalData = {
                    type: 'indefinite',
                    dailyWordTarget: parseInt(document.getElementById('modalDailyTarget').value) || 500,
                    streakPreservation: streakPreservation
                };
            } else if (selectedType === 'longterm') {
                const totalWords = parseInt(document.getElementById('goalTotalWords').value);
                const totalDays = parseInt(document.getElementById('goalTotalDays').value);
                goalData = {
                    type: 'longterm',
                    longtermTotalWords: totalWords,
                    longtermTotalDays: totalDays,
                    streakPreservation: streakPreservation,
                    longtermStartDate: new Date().toISOString()
                };
            }
            
            if (goalData) {
                ipcRenderer.send('set-daily-goal', goalData);
            }

            hideModal();
            // Complete tutorial since goal setup is now part of tutorial flow
            ipcRenderer.send('tutorial-completed');

            // Refresh page to show Today's Progress widget with new goal
            setTimeout(() => {
                window.location.reload();
            }, 500);
        });

        document.getElementById('disableGoalBtn').addEventListener('click', () => {
            ipcRenderer.send('disable-goal-prompting');
            hideModal();
            // Complete tutorial since goal setup is now part of tutorial flow
            ipcRenderer.send('tutorial-completed');
        });
        
        // Mode toggle handler
        document.getElementById('modeToggle').addEventListener('change', function() {
            console.log('Mode toggled:', this.checked ? 'wordcount' : 'timer');
            if (this.checked) {
                document.getElementById('wordCountSettings').style.display = 'block';
                document.getElementById('timerSettings').style.display = 'none';
            } else {
                document.getElementById('wordCountSettings').style.display = 'none';
                document.getElementById('timerSettings').style.display = 'block';
            }
            // Don't save settings on every toggle to avoid async issues
        });

        // Mode selection buttons handler
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                const selectedMode = this.dataset.mode;
                console.log('Writing mode selected:', selectedMode);
                
                // Save gamification mode to settings immediately
                saveGamificationMode(selectedMode);
            });
        });

        // Close button handler
        document.getElementById('modalClose').addEventListener('click', () => {
            ipcRenderer.send('disable-goal-prompting');
            hideModal();
            // If this is during tutorial, show completion
            if (document.getElementById('tutorialCompleteOverlay')) {
                showTutorialComplete();
            }
        });

        // Overlay click handler (but not when clicking the modal itself)
        document.getElementById('goalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'goalOverlay') {
                ipcRenderer.send('disable-goal-prompting');
                hideModal();
                // If this is during tutorial, show completion
                if (document.getElementById('tutorialCompleteOverlay')) {
                    showTutorialComplete();
                }
            }
        });

        // Save when sliders change
        document.getElementById('wordCountSlider').addEventListener('change', function() {
            console.log('Word count slider changed:', this.value);
            saveSliderValues(); // Save just slider values without reloading
        });
        
        document.getElementById('timerSlider').addEventListener('change', function() {
            console.log('Timer slider changed:', this.value);
            saveSliderValues(); // Save just slider values without reloading
        });

        
        // Save when document option changes
        document.querySelectorAll('input[name="docOption"]').forEach(radio => {
            radio.addEventListener('change', function() {
                console.log('Document option changed:', this.value);
                // Settings will be saved when starting session
            });
        });

        // Update display while dragging sliders
        const wordCountSlider = document.getElementById('wordCountSlider');
        const wordCountValue = document.getElementById('wordCountValue');
        
        wordCountSlider.addEventListener('input', function() {
            wordCountValue.textContent = this.value;
            // Don't update progress bar from slider changes - it's independent now
        });

        const timerSlider = document.getElementById('timerSlider');
        const timerValue = document.getElementById('timerValue');
        
        timerSlider.addEventListener('input', function() {
            timerValue.textContent = this.value + ' min';
        });

        // Fullscreen toggle button
        document.getElementById('fullscreenToggle').addEventListener('click', () => {
            ipcRenderer.send('toggle-fullscreen');
        });

        // Start button handler
        document.getElementById('startWriting').addEventListener('click', function() {
            console.log('Start Writing button clicked');
            const selectedOption = document.querySelector('input[name="docOption"]:checked').value;
            const mode = document.getElementById('modeToggle').checked ? 'wordcount' : 'timer';
            const goal = mode === 'wordcount' 
                ? parseInt(document.getElementById('wordCountSlider').value)
                : parseInt(document.getElementById('timerSlider').value);
            
            const sessionSettings = {
                mode: mode,
                goal: goal,
                documentOption: selectedOption
            };
            
            // Save settings first, then proceed
            saveCurrentSettingsSync(sessionSettings);
            
            ipcRenderer.send('check-folder');
            
            ipcRenderer.once('folder-check', async (event, result) => {
                if (result.needsSetup || !result.exists) {
                    const message = result.needsSetup 
                        ? 'Welcome! Please select a folder where your writing will be saved.'
                        : `Cannot find your writing folder: ${result.path}\nPlease select a new folder.`;
                    
                    alert(message);
                    ipcRenderer.send('select-folder');
                    
                    ipcRenderer.once('folder-selected', (event, folderPath) => {
                        console.log('Folder selected:', folderPath);
                        startWritingSession(selectedOption, sessionSettings);
                    });
                } else {
                    startWritingSession(selectedOption, sessionSettings);
                }
            });
        });

        // Hover effect for disabled recent option
        document.querySelector('input[value="recent"]').parentElement.addEventListener('mouseenter', function(e) {
            const radio = this.querySelector('input[type="radio"]');
            if (radio.disabled) {
                this.style.cursor = 'not-allowed';
            }
        });
        
      document.getElementById('newGoalBtn').addEventListener('click', () => {
        hideCelebrationModal();
        // Show the goal setup modal
        showModal();
      });
      
      document.getElementById('freewriteBtn').addEventListener('click', () => {
        // Disable long-term goal tracking
        ipcRenderer.send('disable-long-term-goals');
        hideCelebrationModal();

        // Force page refresh to immediately hide Today's Progress section
        setTimeout(() => {
          window.location.reload();
        }, 100);
      });
    });
    
    // Load saved settings
    ipcRenderer.on('load-settings', (event, settings) => {
        console.log('Settings received:', settings);
        
        if (!settings) {
            console.log('No settings to apply');
            return;
        }
        
        // Store long-term goal info
        if (settings.longTermGoals) {
            longTermGoal = settings.longTermGoals;
        }
        
        // Store daily goals info
        if (settings.dailyGoals) {
            dailyGoals = settings.dailyGoals;
            console.log('Daily goals loaded from settings:', dailyGoals);
            
            // If we already have stats, refresh the progress bar immediately
            if (currentStats) {
                console.log('Refreshing progress bar with current stats:', currentStats.todayWords);
                updateProgressBar(currentStats.todayWords, currentStats.goalProgressToday, currentStats.totalWords, currentStats.wordsFromGoalStart);
            }
        }
        
        if (settings.mode === 'wordcount') {
            document.getElementById('modeToggle').checked = true;
            document.getElementById('wordCountSettings').style.display = 'block';
            document.getElementById('timerSettings').style.display = 'none';
        } else {
            document.getElementById('modeToggle').checked = false;
            document.getElementById('wordCountSettings').style.display = 'none';
            document.getElementById('timerSettings').style.display = 'block';
        }
        
        document.getElementById('timerSlider').value = settings.timerDuration || 25;
        document.getElementById('timerValue').textContent = (settings.timerDuration || 25) + ' min';
        
        document.getElementById('wordCountSlider').value = settings.wordCountGoal || 1000;
        document.getElementById('wordCountValue').textContent = settings.wordCountGoal || 1000;
        
        const docOption = document.querySelector(`input[value="${settings.documentOption}"]`);
        if (docOption) {
            docOption.checked = true;
        }
        
        // Set active mode button based on saved gamification mode
        const savedMode = settings.gamificationSettings?.mode || settings.gamificationMode || 'focus';
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === savedMode) {
                btn.classList.add('active');
            }
        });
        
        // Progress bar will be updated when stats are received
    });

    // Listen for settings updates from other windows (like settings page)
    ipcRenderer.on('settings-updated', (event, settings) => {
        console.log('Homepage received settings update:', settings);
        
        // Update the active gamification mode button
        const savedMode = settings.gamificationSettings?.mode || 'focus';
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === savedMode) {
                btn.classList.add('active');
            }
        });
    });

    // Update the homepage stats handler
    ipcRenderer.on('homepage-stats', (event, stats) => {
        console.log('Homepage received stats:', stats);
        
        // Store current stats globally for immediate access
        currentStats = stats;
        
        const statCards = document.querySelectorAll('.stat-card');
        
        if (statCards[0]) {
            statCards[0].querySelector('.stat-value').textContent = `${stats.todayWords} words`;
        }
        if (statCards[1]) {
            statCards[1].querySelector('.stat-value').textContent = `${stats.weekWords} words`;
        }
        if (statCards[2]) {
            statCards[2].querySelector('.stat-value').textContent = `${stats.streak} days`;
        }
        
        // Set long-term goal data and words from goal start
        longTermGoal = stats.longTermGoals;
        totalWordsWritten = stats.wordsFromGoalStart || 0;
        
        // Set daily goals data
        if (stats.dailyGoals) {
            dailyGoals = stats.dailyGoals;
            console.log('Daily goals loaded:', dailyGoals);
        }
        
        console.log('Updated longTermGoal:', longTermGoal);
        console.log('Words from goal start:', totalWordsWritten);
        
        // Update progress bar immediately with today's words and goal progress
        console.log('Updating progress bar with:', {
            todayWords: stats.todayWords,
            goalProgressToday: stats.goalProgressToday
        });
        updateProgressBar(stats.todayWords, stats.goalProgressToday, stats.totalWords, stats.wordsFromGoalStart);
        
        // Show celebration modal if goal completed
        if (stats.goalCompleted) {
            setTimeout(() => {
                showCelebrationModal(stats.goalCompletionInfo);
            }, 1000); // Small delay for better UX
        }
        
        // Show celebration modal for already completed goals on page load (one-time per goal)
        if (stats.longTermGoals && stats.longTermGoals.completed) {
            const goalKey = `celebrationShown_${stats.longTermGoals.startDate}`;
            console.log('Checking celebration modal for completed goal:', {
                completed: stats.longTermGoals.completed,
                goalKey: goalKey,
                alreadyShown: sessionStorage.getItem(goalKey)
            });
            
            if (!sessionStorage.getItem(goalKey)) {
                sessionStorage.setItem(goalKey, 'true');
                console.log('Showing celebration modal for completed goal');
                setTimeout(() => {
                    showCelebrationModal(null);
                }, 2000); // Longer delay for page load
            }
        }
        
        // Show celebration modal for completed dailyGoals with long-term targets
        if (stats.dailyGoals && stats.dailyGoals.completed && stats.dailyGoals.longtermStartDate) {
            const dailyGoalKey = `celebrationShown_dailyGoal_${stats.dailyGoals.longtermStartDate}`;
            console.log('Checking celebration modal for completed daily goal:', {
                completed: stats.dailyGoals.completed,
                goalKey: dailyGoalKey,
                alreadyShown: sessionStorage.getItem(dailyGoalKey)
            });
            
            if (!sessionStorage.getItem(dailyGoalKey)) {
                sessionStorage.setItem(dailyGoalKey, 'true');
                console.log('Showing celebration modal for completed daily goal');
                setTimeout(() => {
                    showCelebrationModal(null);
                }, 2000); // Longer delay for page load
            }
        }
    });
    
    // Handle goal completion notification from session end
    ipcRenderer.on('goal-completed', () => {
        console.log('Received goal-completed notification');
        setTimeout(() => {
            showCelebrationModal(null);
        }, 2000); // Longer delay when coming from session
    });
    
    function applySettings(settings) {
        console.log('Applying settings to UI:', settings);
        
        if (!settings) {
            console.log('No settings to apply');
            return;
        }
        
        if (settings.mode === 'wordcount') {
            document.getElementById('modeToggle').checked = true;
            document.getElementById('wordCountSettings').style.display = 'block';
            document.getElementById('timerSettings').style.display = 'none';
        } else {
            document.getElementById('modeToggle').checked = false;
            document.getElementById('wordCountSettings').style.display = 'none';
            document.getElementById('timerSettings').style.display = 'block';
        }
        
        document.getElementById('timerSlider').value = settings.timerDuration || 25;
        document.getElementById('timerValue').textContent = (settings.timerDuration || 25) + ' min';
        
        document.getElementById('wordCountSlider').value = settings.wordCountGoal || 1000;
        document.getElementById('wordCountValue').textContent = settings.wordCountGoal || 1000;
        
        const docOption = document.querySelector(`input[value="${settings.documentOption}"]`);
        if (docOption) {
            docOption.checked = true;
        }
        
        // Progress bar will be updated when stats load, not from settings
    }

    function saveCurrentSettingsSync(sessionSettings) {
        // This function is called when starting a session, so we need to preserve existing gamification settings
        // We'll use an async approach to ensure we don't overwrite the detailed settings
        
        // Get current active mode
        const activeModeBtn = document.querySelector('.mode-btn.active');
        const gamificationMode = activeModeBtn ? activeModeBtn.dataset.mode : 'focus';
        
        // Get current settings first to preserve gamification settings
        ipcRenderer.send('get-settings');
        ipcRenderer.once('load-settings', (event, currentSettings) => {
            // Merge with default gamification settings to ensure all properties exist
            const defaultGamificationSettings = {
                mode: 'focus',
                rewardWords: 100,
                rewardType: 'sound',
                gracePeriod: 10,
                punishType: 'sound',
                nuclearGracePeriod: 10,
                deletionSpeed: 5,
                disableStreak: false,
                disableAchievements: false
            };
            
            const existingGamificationSettings = currentSettings?.gamificationSettings || {};
            
            const settings = {
                mode: document.getElementById('modeToggle').checked ? 'wordcount' : 'timer',
                timerDuration: parseInt(document.getElementById('timerSlider').value),
                wordCountGoal: parseInt(document.getElementById('wordCountSlider').value),
                documentOption: document.querySelector('input[name="docOption"]:checked').value,
                gamificationSettings: {
                    ...defaultGamificationSettings,
                    ...existingGamificationSettings,
                    mode: gamificationMode
                }
            };
            
            // Merge with session settings if provided
            const finalSettings = { ...settings, ...sessionSettings };
            
            ipcRenderer.send('save-settings', finalSettings);
            console.log('Session settings saved:', finalSettings);
        });
    }
    
    // Keep the old async version for other uses
    // Simple function to save just slider values without reloading settings
    function saveSliderValues() {
        const sliderSettings = {
            mode: document.getElementById('modeToggle').checked ? 'wordcount' : 'timer',
            timerDuration: parseInt(document.getElementById('timerSlider').value),
            wordCountGoal: parseInt(document.getElementById('wordCountSlider').value),
            documentOption: document.querySelector('input[name="docOption"]:checked').value
        };
        
        console.log('Saving slider values:', sliderSettings);
        ipcRenderer.send('save-slider-settings', sliderSettings);
    }

    function saveCurrentSettings() {
        // Get current active mode
        const activeModeBtn = document.querySelector('.mode-btn.active');
        const gamificationMode = activeModeBtn ? activeModeBtn.dataset.mode : 'focus';
        
        // Get current settings to preserve existing gamificationSettings
        ipcRenderer.send('get-settings');
        ipcRenderer.once('load-settings', (event, currentSettings) => {
            // Merge with default gamification settings to ensure all properties exist
            const defaultGamificationSettings = {
                mode: 'focus',
                rewardWords: 100,
                rewardType: 'sound',
                gracePeriod: 10,
                punishType: 'sound',
                nuclearGracePeriod: 10,
                deletionSpeed: 5,
                disableStreak: false,
                disableAchievements: false
            };
            
            const existingGamificationSettings = currentSettings?.gamificationSettings || {};
            
            const settings = {
                mode: document.getElementById('modeToggle').checked ? 'wordcount' : 'timer',
                timerDuration: parseInt(document.getElementById('timerSlider').value),
                wordCountGoal: parseInt(document.getElementById('wordCountSlider').value),
                documentOption: document.querySelector('input[name="docOption"]:checked').value,
                gamificationSettings: {
                    ...defaultGamificationSettings,
                    ...existingGamificationSettings,
                    mode: gamificationMode
                }
            };
            
            ipcRenderer.send('save-settings', settings);
            console.log('Settings saved:', settings);
        });
    }

    function saveGamificationMode(selectedMode) {
        // Get current settings to preserve everything else
        ipcRenderer.send('get-settings');
        ipcRenderer.once('load-settings', (event, currentSettings) => {
            // Merge with default gamification settings to ensure all properties exist
            const defaultGamificationSettings = {
                mode: 'focus',
                rewardWords: 100,
                rewardType: 'sound',
                gracePeriod: 10,
                punishType: 'sound',
                nuclearGracePeriod: 10,
                deletionSpeed: 5,
                disableStreak: false,
                disableAchievements: false
            };
            
            const existingGamificationSettings = currentSettings?.gamificationSettings || {};
            
            const settings = {
                ...currentSettings,
                gamificationSettings: {
                    ...defaultGamificationSettings,
                    ...existingGamificationSettings,
                    mode: selectedMode
                }
            };
            
            ipcRenderer.send('save-settings', settings);
            console.log('Gamification mode saved:', selectedMode, 'with full settings:', settings.gamificationSettings);
        });
    }

    function updateRecentFileOption() {
        const recentRadio = document.querySelector('input[value="recent"]');
        const recentLabel = recentRadio.nextElementSibling;
        
        ipcRenderer.send('get-settings');
        
        ipcRenderer.once('load-settings', (event, settings) => {
            if (!settings || !settings.lastOpenedFile) {
                recentRadio.disabled = true;
                recentLabel.style.opacity = '0.5';
                recentLabel.style.cursor = 'not-allowed';
                recentLabel.title = 'This is your first project!';
            } else {
                recentRadio.disabled = false;
                recentLabel.style.opacity = '1';
                recentLabel.style.cursor = 'pointer';
                const filename = settings.lastOpenedFile.split(/[\\\/]/).pop();
                recentLabel.title = `Open: ${filename}`;
            }
        });
    }

    function startWritingSession(documentOption, sessionSettings) {
        console.log('startWritingSession called with:', documentOption, sessionSettings);
        switch(documentOption) {
            case 'new':
                console.log('Sending start-new-document IPC message');
                ipcRenderer.send('start-new-document', sessionSettings);
                break;
            case 'browse':
                ipcRenderer.send('browse-document', sessionSettings);
                break;
            case 'recent':
                const recentRadio = document.querySelector('input[value="recent"]');
                if (recentRadio.disabled) {
                    alert('No recent files found. Starting a new document instead.');
                    ipcRenderer.send('start-new-document', sessionSettings);
                } else {
                    ipcRenderer.send('open-recent-document', sessionSettings);
                }
                break;
        }
    }

    // This function has been moved below to avoid duplication

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

    // File handling responses
    ipcRenderer.on('needs-folder-setup', () => {
        alert('Please select a folder for your documents first.');
    });

    ipcRenderer.on('no-recent-file', () => {
        alert('No recent files found. Starting a new document instead.');
        const sessionSettings = {
            mode: document.getElementById('modeToggle').checked ? 'wordcount' : 'timer',
            goal: document.getElementById('modeToggle').checked 
                ? parseInt(document.getElementById('wordCountSlider').value)
                : parseInt(document.getElementById('timerSlider').value)
        };
        ipcRenderer.send('start-new-document', sessionSettings);
    });

    ipcRenderer.on('recent-file-not-found', (event, filepath) => {
        const filename = filepath.split(/[\\\/]/).pop();
        alert(`Could not find recent file: ${filename}\nStarting a new document instead.`);
        const sessionSettings = {
            mode: document.getElementById('modeToggle').checked ? 'wordcount' : 'timer',
            goal: document.getElementById('modeToggle').checked 
                ? parseInt(document.getElementById('wordCountSlider').value)
                : parseInt(document.getElementById('timerSlider').value)
        };
        ipcRenderer.send('start-new-document', sessionSettings);
    });

    ipcRenderer.on('file-error', (event, message) => {
        alert(`Error: ${message}`);
    });

    ipcRenderer.on('save-before-close', () => {
        console.log('Saving settings before close...');
        saveCurrentSettings();
    });

    let longTermGoal = null;
    let dailyGoals = null;
    let currentStats = null;

    function updateProgressBar(todayWords = 0, goalProgressToday = 0, totalWords = 0, wordsFromGoalStart = 0) {
        console.log('updateProgressBar called with:', { todayWords, goalProgressToday, totalWords, wordsFromGoalStart });
        console.log('Current dailyGoals:', dailyGoals);

        const progressFill = document.getElementById('progressFill');
        const todayProgressText = document.getElementById('todayProgress');
        const goalMetaText = document.getElementById('goalMeta');
        const todayWordsDisplay = document.getElementById('todayWordsDisplay');


        let dailyGoalWords = 1000; // Default fallback
        let goalWords = dailyGoalWords;
        let totalProgress = 0; // For long-term goal progress

        // Hide the redundant today's words display since it's shown in the progress bar
        if (todayWordsDisplay) {
            todayWordsDisplay.style.display = 'none';
        }
        
        // Use daily goals if available
        if (dailyGoals && dailyGoals.type !== 'disabled') {
            if (dailyGoals.type === 'indefinite') {
                // Indefinite daily goal
                dailyGoalWords = dailyGoals.dailyWordTarget || 500;
                goalWords = dailyGoalWords;

                goalMetaText.style.display = 'none';
            } else if (dailyGoals.type === 'longterm') {
                // Long-term goal with daily targets
                dailyGoalWords = Math.ceil(dailyGoals.longtermTotalWords / dailyGoals.longtermTotalDays);
                goalWords = dailyGoalWords;
                
                // Calculate days remaining
                let startDate;
                if (dailyGoals.longtermStartDate) {
                    startDate = new Date(dailyGoals.longtermStartDate);
                } else {
                    startDate = new Date(); // Default to today if missing
                }

                // Always show the long-term goal display when we have goal parameters
                if (dailyGoals.longtermTotalWords && dailyGoals.longtermTotalDays) {
                    const today = new Date();
                    const daysPassed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
                    const daysRemaining = Math.max(0, dailyGoals.longtermTotalDays - daysPassed);

                    
                    // Show goal meta info with cumulative progress
                    // Use backend wordsFromGoalStart if available
                    totalProgress = wordsFromGoalStart;

                    // If backend calculation is 0, we need a smarter fallback
                    if (totalProgress === 0 && dailyGoals.longtermStartDate) {
                        // Only use fallback if we have a valid start date
                        const goalStart = new Date(dailyGoals.longtermStartDate);
                        const now = new Date();
                        const goalStartTime = goalStart.getTime();
                        const timeSinceGoalStart = now.getTime() - goalStartTime;

                        // Only count progress if goal was set more than 5 minutes ago
                        // This prevents counting pre-existing words when setting a new goal
                        if (timeSinceGoalStart > 5 * 60 * 1000) { // 5 minutes
                            const todayStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                            if (goalStartTime >= todayStartTime) {
                                // Goal started today, use today's words as progress (but this might overcount)
                                totalProgress = todayWords;
                                console.log('Goal started today (>5min ago), using todayWords as fallback:', todayWords);
                            } else {
                                // Goal started earlier, use total words as fallback
                                totalProgress = totalWords;
                                console.log('Goal started earlier, using totalWords as fallback:', totalWords);
                            }
                        } else {
                            // Goal was just set, don't count any existing words
                            totalProgress = 0;
                            console.log('Goal just set (<5min ago), starting progress at 0');
                        }
                    } else if (totalProgress === 0) {
                        // No start date (brand new goal), progress stays at 0
                        console.log('New goal with no start date, progress remains 0');
                    }

                    const progressPercentage = Math.min((totalProgress / dailyGoals.longtermTotalWords) * 100, 100);

                    // Check for goal completion in frontend as fallback
                    // Only trigger celebration if goal was actually completed through writing since goal start
                    if (totalProgress >= dailyGoals.longtermTotalWords && !dailyGoals.completed && dailyGoals.longtermStartDate) {
                        const goalStart = new Date(dailyGoals.longtermStartDate);
                        const timeSinceGoalStart = new Date().getTime() - goalStart.getTime();

                        // Celebrate if we have actual progress (regardless of time since goal was set)
                        if (totalProgress > 0) {
                            // Check if we've already shown celebration for this goal
                            const celebrationKey = `frontendCelebrationShown_${dailyGoals.longtermTotalWords}_${dailyGoals.longtermTotalDays}_${dailyGoals.longtermStartDate}`;

                            if (!sessionStorage.getItem(celebrationKey)) {
                                console.log('Frontend detected goal completion! Triggering celebration modal...');
                                sessionStorage.setItem(celebrationKey, 'true');

                            setTimeout(() => {
                                const completionInfo = {
                                    completed: true,
                                    totalWords: dailyGoals.longtermTotalWords,
                                    wordsWritten: totalProgress,
                                    daysTaken: 1, // Since start date is null, assume 1 day
                                    totalDays: dailyGoals.longtermTotalDays,
                                    completedEarly: true,
                                    daysAhead: dailyGoals.longtermTotalDays - 1
                                };
                                showCelebrationModal(completionInfo);
                            }, 1000);
                        }
                    }
                }

                    console.log('Progress calculation debug:', {
                        wordsFromGoalStart,
                        totalProgress,
                        totalWords,
                        todayWords,
                        longtermTotalWords: dailyGoals.longtermTotalWords,
                        progressPercentage,
                        startDate: dailyGoals.longtermStartDate,
                        hasStartDate: !!dailyGoals.longtermStartDate,
                        goalType: dailyGoals.type
                    });


                    goalMetaText.innerHTML = `
                        <div style="margin-bottom: 4px; font-size: 0.9em; display: flex; justify-content: space-between; width: 100%; gap: 5px;">
                            <span><strong>Goal:</strong> ${dailyGoals.longtermTotalWords.toLocaleString()} words</span>
                            <span><strong>Progress:</strong> ${totalProgress.toLocaleString()} words (${Math.round(progressPercentage)}%)</span>
                        </div>
                        <div style="margin-bottom: 4px; font-size: 0.9em; display: flex; justify-content: space-between; width: 100%; gap: 5px;">
                            <span>Day ${Math.min(dailyGoals.longtermTotalDays - daysRemaining + 1, dailyGoals.longtermTotalDays)} of ${dailyGoals.longtermTotalDays}</span>
                            <span style="color: ${daysRemaining > 7 ? 'var(--color-text-muted)' : daysRemaining > 3 ? '#f39c12' : '#e74c3c'};">${daysRemaining} days left</span>
                        </div>
                    `;
                    goalMetaText.style.display = 'block';
                } else {
                    goalMetaText.style.display = 'none';
                }
            }
        } else {
            // Fallback to old long-term goal system for backward compatibility
            if (longTermGoal && longTermGoal.enabled) {
                dailyGoalWords = Math.ceil(longTermGoal.totalWords / longTermGoal.totalDays);
                goalWords = dailyGoalWords;
                
                // Calculate days remaining
                const startDate = new Date(longTermGoal.startDate);
                const today = new Date();
                const daysPassed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.max(0, longTermGoal.totalDays - daysPassed);
                
                // Calculate total words written since goal started
                const totalWordsFromGoalStart = getCurrentTotalWords();
                

                // Show goal meta info
                if (longTermGoal.completed) {
                    goalMetaText.innerHTML = `
                        <div style="font-size: 0.9em; text-align: center; font-weight: bold; color: var(--color-accent);">
                            🎉 Goal Completed! 🎉
                        </div>
                        <div style="font-size: 0.9em; text-align: center;">
                            ${totalWordsFromGoalStart.toLocaleString()} / ${longTermGoal.totalWords.toLocaleString()} words (100%)
                        </div>
                    `;
                } else {
                    // For legacy long-term goals, totalWordsFromGoalStart is the cumulative total since goal started
                    const actualProgress = totalWordsFromGoalStart || 0;
                    const progressPercentage = Math.min((actualProgress / longTermGoal.totalWords) * 100, 100);
                    goalMetaText.innerHTML = `
                        <div style="margin-bottom: 4px; font-size: 0.9em; display: flex; justify-content: space-between; width: 100%; gap: 5px;">
                            <span><strong>Goal:</strong> ${longTermGoal.totalWords.toLocaleString()} words</span>
                            <span><strong>Progress:</strong> ${actualProgress.toLocaleString()} words (${Math.round(progressPercentage)}%)</span>
                        </div>
                        <div style="margin-bottom: 4px; font-size: 0.9em; display: flex; justify-content: space-between; width: 100%; gap: 5px;">
                            <span>Day ${Math.min(longTermGoal.totalDays - daysRemaining + 1, longTermGoal.totalDays)} of ${longTermGoal.totalDays}</span>
                            <span style="color: ${daysRemaining > 7 ? 'var(--color-text-muted)' : daysRemaining > 3 ? '#f39c12' : '#e74c3c'};">${daysRemaining} days left</span>
                        </div>
                    `;
                }
                goalMetaText.style.display = 'block';
            } else {
                goalMetaText.style.display = 'none';
            }
        }
        
        let displayWords = todayWords;
        let displayGoal = dailyGoalWords;
        let percentage = Math.min((todayWords / dailyGoalWords) * 100, 100);
        
        // For daily goals, show today's total words toward daily target
        if (dailyGoals && dailyGoals.type !== 'disabled') {
            if (dailyGoals.type === 'longterm') {
                // For long-term goals, use the same filtered progress as text and metadata
                displayWords = totalProgress;
                displayGoal = dailyGoalWords;
                percentage = Math.min((totalProgress / dailyGoalWords) * 100, 100);
            } else {
                // For other daily goals, use today's words
                displayWords = todayWords;
                displayGoal = dailyGoalWords;
                percentage = Math.min((todayWords / dailyGoalWords) * 100, 100);
            }
        } else if (longTermGoal && longTermGoal.enabled) {
            // Fallback to old long-term goal logic (goal progress)
            displayWords = goalProgressToday;  // Use goal progress instead of total daily words
            displayGoal = dailyGoalWords;
            percentage = Math.min((goalProgressToday / dailyGoalWords) * 100, 100);
            
            // If goal is completed, show it as 100% filled
            if (longTermGoal.completed) {
                percentage = 100;
            }
        }
        
        progressFill.style.width = percentage + '%';
        
        if (percentage >= 100) {
            progressFill.style.background = '#27ae60';
        } else if (percentage < 33) {
            progressFill.style.background = '#e74c3c';
        } else if (percentage < 66) {
            progressFill.style.background = '#f39c12';
        } else {
            progressFill.style.background = '#27ae60';
        }
        
        // For long-term goals, show the same filtered progress as in the metadata
        if (dailyGoals && dailyGoals.type === 'longterm') {
            todayProgressText.textContent = `${totalProgress} / ${dailyGoalWords} words`;
        } else {
            todayProgressText.textContent = `${displayWords} / ${displayGoal} words`;
        }
    }

    let totalWordsWritten = 0; // Cache the total words globally
    
    function getCurrentTotalWords() {
        return totalWordsWritten;
    }

    // Initial progress bar update will happen when stats are loaded

    // Add reset functionality (for debugging/testing)
    window.resetAppData = async function() {
      try {
        console.log('Starting app reset...');
        // Clear browser storage
        sessionStorage.clear();
        localStorage.clear();

        // Call backend to reset stored data
        const result = await ipcRenderer.invoke('reset-app-data');

        if (result.success) {
          console.log('App reset successful - reloading...');
          // Reload the app to start fresh
          window.location.reload();
        } else {
          console.error('App reset failed:', result.error);
        }
      } catch (error) {
        console.error('Error resetting app:', error);
      }
    };

    // Script end
