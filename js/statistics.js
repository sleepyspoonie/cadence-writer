    
    // Global variables
    let currentDailyData = [];
    let currentCalendarDate = new Date();
    let writingDays = {};
    let firstDataDate = null;
    let userSettings = null;
    
    // Wait for DOM to be ready
    console.log('Statistics page script loading...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM Content Loaded - statistics page ready');
        
        // Check if achievements are disabled and hide the section if so
        ipcRenderer.send('get-settings');
        ipcRenderer.on('load-settings', (event, settings) => {
            console.log('Settings loaded in statistics page:', settings);
            userSettings = settings; // Store settings globally
            
            if (settings?.gamificationSettings?.disableAchievements) {
                // Hide the achievements section
                const achievementsSection = document.getElementById('achievementsSection');
                if (achievementsSection) {
                    achievementsSection.style.display = 'none';
                }
                
                // Hide the achievements modal
                const achievementsModal = document.getElementById('achievementsModal');
                const achievementsOverlay = document.getElementById('achievementsOverlay');
                if (achievementsModal) achievementsModal.style.display = 'none';
                if (achievementsOverlay) achievementsOverlay.style.display = 'none';
            }
            
            // If we already have daily data, rebuild the writing days with goal-based logic
            if (currentDailyData.length > 0) {
                buildWritingDaysMap(currentDailyData, settings);
                renderCalendar(); // Re-render calendar with updated writing days
            }
        });
        
        // Track page visit for achievements
        ipcRenderer.send('page-visited', 'stats');
        
        // Fullscreen toggle
        document.getElementById('fullscreenToggle').addEventListener('click', () => {
            ipcRenderer.send('toggle-fullscreen');
        });
        
        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
        
        document.getElementById('nextMonth').addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        });
        
        // View All Achievements button
        document.getElementById('viewAllAchievements').addEventListener('click', () => {
            showAchievementsModal();
        });
        
        // Modal close handlers
        document.getElementById('closeAchievementsModal').addEventListener('click', () => {
            hideAchievementsModal();
        });
        
        document.getElementById('achievementsOverlay').addEventListener('click', () => {
            hideAchievementsModal();
        });
        
        // Period buttons - Set up ONLY ONCE
        const periodButtons = document.querySelectorAll('.chart-period .period-btn');
        periodButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Skip if already active
                if (this.classList.contains('active')) return;
                
                console.log('Period button clicked:', this.textContent);
                
                // Update active state
                periodButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Redraw chart
                if (currentDailyData && currentDailyData.length > 0) {
                    updateWordsChart(currentDailyData);
                }
            });
        });
        
        // Request initial data
        console.log('Requesting detailed stats...');
        ipcRenderer.send('get-detailed-stats');
    });
    
    function updateAchievements(achievementsData) {
        const achievementsGrid = document.getElementById('achievementsGrid');
        const lockedCountSpan = document.getElementById('lockedCount');
        
        if (!achievementsData || !achievementsData.unlocked) {
            return;
        }
        
        // Store data for modal
        allAchievementsData = achievementsData;
        
        const unlockedAchievements = achievementsData.unlocked || [];
        const totalLocked = (achievementsData.locked || []).length;
        
        // Update locked count
        lockedCountSpan.textContent = totalLocked;
        
        // Clear current achievements
        achievementsGrid.innerHTML = '';
        
        if (unlockedAchievements.length === 0) {
            // Show placeholder when no achievements unlocked
            achievementsGrid.innerHTML = `
                <div class="achievement">
                    <div class="achievement-icon">🏆</div>
                    <h4>No achievements yet</h4>
                    <div class="achievement-desc">Start writing to unlock your first achievement!</div>
                </div>
            `;
        } else {
            // Display unlocked achievements
            unlockedAchievements.forEach(achievement => {
                const achievementElement = document.createElement('div');
                achievementElement.className = 'achievement unlocked';
                achievementElement.innerHTML = `
                    <div class="achievement-icon">${achievement.icon}</div>
                    <h4>${achievement.name}</h4>
                    <div class="achievement-desc">${achievement.description}</div>
                `;
                achievementsGrid.appendChild(achievementElement);
            });
        }
    }
    
    let allAchievementsData = null;
    
    function showAchievementsModal() {
        if (!allAchievementsData) {
            console.log('No achievements data available');
            return;
        }
        
        populateAchievementsModal(allAchievementsData);
        document.getElementById('achievementsOverlay').classList.add('show');
        document.getElementById('achievementsModal').classList.add('show');
    }
    
    function hideAchievementsModal() {
        document.getElementById('achievementsOverlay').classList.remove('show');
        document.getElementById('achievementsModal').classList.remove('show');
    }
    
    function populateAchievementsModal(achievementsData) {
        const sectionsContainer = document.getElementById('achievementsSections');
        
        // Clear existing content
        sectionsContainer.innerHTML = '';
        
        // Define achievement categories in order
        const categories = [
            {
                name: 'Word Count Milestones',
                ids: ['firstWords', 'drabbler', 'firstDraft', 'findingVoice', 'juniorNovelist', 'shortStoryteller', 'mightierThanSword', 'certifiedNovelist', 'author']
            },
            {
                name: 'Writing Streaks', 
                ids: ['firstStep', 'sprinter', 'brickByBrick', 'wrimoEnthusiast', 'unstoppableForce', 'eternalFlame', 'yearOfWriter']
            },
            {
                name: 'Time-Based Writing',
                ids: ['warmingUp', 'inTheZone', 'firstWatch', 'theGrind', 'throughTheNight', 'dayOfWriting', 'flowState', 'centuryScribe']
            },
            {
                name: 'Navigation & Exploration',
                ids: ['eruditeEducator', 'dataAnalyst', 'fileExplorer', 'tinkerer']
            },
            {
                name: 'Writing Modes',
                ids: ['treatYourself', 'gluttonPunishment', 'masochist']
            },
            {
                name: 'Session Performance',
                ids: ['speedWriter', 'marathoner', 'weekendWarrior', 'comebackKid', 'phoenix', 'dabbler']
            },
            {
                name: 'Time-Specific Writing',
                ids: ['earlyBird', 'nightOwl', 'lunchBreakNovelist', 'mondayMotivation', 'humpDay', 'fridayFinale', 'witchingHour', 'deadlinePanic']
            },
            {
                name: 'File & Project Management',
                ids: ['collector']
            },
            {
                name: 'Meta Achievements',
                ids: ['overachiever', 'completionist', 'legend', 'hiddenTalent']
            },
            {
                name: 'Long-Term Goals',
                ids: ['itsTheClimb', 'valleyOfDeath', 'mountaineer', 'summitter']
            },
            {
                name: 'Hidden Achievements',
                ids: ['silentTreatment', 'maybeNextTime', 'priceFixing', 'procrastinatorSpecial', 'saveScummer', 'blastOff', 'leapOfFaith']
            }
        ];
        
        // Group achievements by category
        categories.forEach(category => {
            const categoryAchievements = {
                unlocked: [],
                locked: []
            };
            
            // Collect achievements for this category
            category.ids.forEach(id => {
                const unlockedAchievement = achievementsData.unlocked?.find(a => a.id === id);
                const lockedAchievement = achievementsData.locked?.find(a => a.id === id);
                
                if (unlockedAchievement) {
                    categoryAchievements.unlocked.push(unlockedAchievement);
                } else if (lockedAchievement) {
                    categoryAchievements.locked.push(lockedAchievement);
                }
            });
            
            // Only show categories that have achievements
            if (categoryAchievements.unlocked.length > 0 || categoryAchievements.locked.length > 0) {
                const sectionElement = document.createElement('div');
                sectionElement.className = 'achievements-section';
                
                const sectionTitle = document.createElement('h3');
                sectionTitle.textContent = category.name;
                sectionElement.appendChild(sectionTitle);
                
                const gridElement = document.createElement('div');
                gridElement.className = 'achievements-grid';
                
                // Add unlocked achievements first
                categoryAchievements.unlocked.forEach(achievement => {
                    const achievementElement = document.createElement('div');
                    achievementElement.className = 'achievement unlocked';
                    achievementElement.innerHTML = `
                        <div class="achievement-icon">${achievement.icon}</div>
                        <h4>${achievement.name}</h4>
                        <div class="achievement-desc">${achievement.description}</div>
                    `;
                    gridElement.appendChild(achievementElement);
                });
                
                // Then add locked achievements
                categoryAchievements.locked.forEach(achievement => {
                    const achievementElement = document.createElement('div');
                    achievementElement.className = 'achievement';
                    achievementElement.innerHTML = `
                        <div class="achievement-icon">${achievement.icon}</div>
                        <h4>${achievement.name}</h4>
                        <div class="achievement-desc">${achievement.description}</div>
                    `;
                    gridElement.appendChild(achievementElement);
                });
                
                sectionElement.appendChild(gridElement);
                sectionsContainer.appendChild(sectionElement);
            }
        });
        
        // Show message if no achievements at all
        if (sectionsContainer.children.length === 0) {
            sectionsContainer.innerHTML = `
                <div class="achievements-section">
                    <div class="achievements-grid">
                        <div class="achievement">
                            <div class="achievement-icon">🏆</div>
                            <h4>No achievements yet</h4>
                            <div class="achievement-desc">Start writing to unlock your first achievement!</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    function updateWordsChart(dailyData) {
    const chartContainer = document.querySelector('.chart-placeholder');
    if(!chartContainer || !dailyData || dailyData.length === 0) return;
    
    const activePeriod = document.querySelector('.period-btn.active').textContent;
    let dataToShow = [];
    
    if(activePeriod === 'Week') {
        // Last 7 days - ensure correct dates
        dataToShow = dailyData.slice(-7).map(day => {
            // Parse the date string properly
            const [year, month, dayNum] = day.date.split('-').map(Number);
            const properDate = new Date(year, month - 1, dayNum); // month is 0-indexed in JS
            return {
                ...day,
                properDate: properDate
            };
        });
    } else if(activePeriod === 'Month') {
        // Last 12 months
        const monthlyData = {};
        const now = new Date();
        
        // Create entries for last 12 months
        for(let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = 0;
        }
        
        // Fill in actual data
        dailyData.forEach(day => {
            const month = day.date.substring(0, 7);
            if(monthlyData.hasOwnProperty(month)) {
                monthlyData[month] += day.words;
            }
        });
        
        dataToShow = Object.entries(monthlyData).map(([month, words]) => ({
            date: month,
            words: words
        }));
    } else { // Year view
        const yearlyData = {};
        
        dailyData.forEach(day => {
            const year = day.date.substring(0, 4);
            if(!yearlyData[year]) yearlyData[year] = 0;
            yearlyData[year] += day.words;
        });
        
        dataToShow = Object.entries(yearlyData)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([year, words]) => ({
                date: year,
                words: words
            }));
    }
    
    const maxWords = Math.max(...dataToShow.map(d => d.words), 100);
    
    chartContainer.innerHTML = '';
    
    dataToShow.forEach((day, index) => {
        const bar = document.createElement('div');
        bar.className = day.words === 0 ? 'chart-bar zero' : 'chart-bar';
        bar.setAttribute('data-value', day.words);
        
        const finalHeight = day.words === 0 ? '3px' : `${(day.words / maxWords) * 100}%`;
        
        bar.style.height = '0%';
        bar.style.transition = 'none';
        
        // Generate correct labels
        let labelText = '';
        if(activePeriod === 'Week') {
            // Use the properDate we created above
            const date = day.properDate || new Date(day.date + 'T12:00:00'); // Add noon time to avoid timezone issues
            labelText = date.toLocaleDateString('en-US', { weekday: 'short' });
        } else if(activePeriod === 'Month') {
            const [year, month] = day.date.split('-');
            const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            labelText = monthDate.toLocaleDateString('en-US', { month: 'short' });
        } else { // Year view
            labelText = day.date;
        }
        bar.setAttribute('data-label', labelText);
        
        chartContainer.appendChild(bar);
        
        bar.offsetHeight;
        
        setTimeout(() => {
            bar.style.transition = `height ${0.6 + index * 0.05}s cubic-bezier(0.4, 0, 0.2, 1)`;
            bar.style.height = finalHeight;
        }, 50 + index * 30);
    });
}
    
    // Function to build writing days map with goal-based logic
    function buildWritingDaysMap(dailyData, settings) {
        console.log('Building writing days map with goal-based logic');
        
        // Reset writing days and first date
        writingDays = {};
        firstDataDate = null;
        
        if (!dailyData || !Array.isArray(dailyData)) {
            console.log('No daily data available');
            return;
        }
        
        // Get daily goal settings
        const dailyGoals = settings?.dailyGoals || {};
        const streakPreservation = dailyGoals.streakPreservation || 'any';
        
        // Calculate daily word target based on goal type
        let dailyWordTarget = 500; // Default
        if (dailyGoals.type === 'indefinite') {
            dailyWordTarget = dailyGoals.dailyWordTarget || 500;
        } else if (dailyGoals.type === 'longterm') {
            dailyWordTarget = Math.ceil(dailyGoals.longtermTotalWords / dailyGoals.longtermTotalDays);
        }
        
        console.log('Calendar streak settings:', {
            streakPreservation,
            dailyWordTarget,
            goalType: dailyGoals.type
        });
        
        // Function to check if a day qualifies for calendar checkmark
        function dayQualifiesForCalendar(dayStats) {
            if (!dayStats || dayStats.words === 0) return false;
            
            if (streakPreservation === 'goal') {
                // Must meet daily goal to show checkmark
                return dayStats.words >= dailyWordTarget;
            } else {
                // Any writing gets checkmark
                return dayStats.words > 0;
            }
        }
        
        // Build the writing days map
        dailyData.forEach(day => {
            if (dayQualifiesForCalendar(day)) {
                writingDays[day.date] = true;
                if (!firstDataDate || new Date(day.date) < new Date(firstDataDate)) {
                    firstDataDate = day.date;
                }
            }
        });
        
        console.log('Writing days built:', Object.keys(writingDays).length, 'qualifying days');
    }
    
    // Calendar render function
    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        
        document.getElementById('currentMonth').textContent = currentCalendarDate.toLocaleDateString('en', {
            month: 'long',
            year: 'numeric'
        });
        
        grid.innerHTML = '';
        
        // Add day headers
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            grid.appendChild(header);
        });
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Empty cells before month starts
        for (let i = 0; i < firstDay.getDay(); i++) {
            grid.appendChild(document.createElement('div'));
        }
        
        // Days of month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (writingDays[dateStr]) {
                dayElement.classList.add('wrote');
            }
            
            grid.appendChild(dayElement);
        }
        
        // Update nav buttons
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (firstDataDate) {
            const firstDate = new Date(firstDataDate);
            prevBtn.disabled = year === firstDate.getFullYear() && month === firstDate.getMonth();
        }
        
        const now = new Date();
        nextBtn.disabled = year === now.getFullYear() && month === now.getMonth();
    }
    
    
    // Fullscreen listener
    ipcRenderer.on('fullscreen-changed', (event, isFullscreen) => {
        const btn = document.getElementById('fullscreenToggle');
        if (isFullscreen) {
            btn.title = 'Exit Fullscreen';
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>`;
        } else {
            btn.title = 'Enter Fullscreen';
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>`;
        }
    });
    
    // Data listener
    ipcRenderer.on('detailed-stats', (event, data) => {
        console.log('*** STATS RECEIVED ***');
        console.log('Data:', data);
        console.log('Data type:', typeof data);
        console.log('Data keys:', Object.keys(data || {}));
        console.log('dailyData length:', data.dailyData?.length);
        console.log('allTime:', data.allTime);
        console.log('streak:', data.streak);
        
        // Store data
        currentDailyData = data.dailyData || [];
        
        // Build writing days map with goal-based logic
        buildWritingDaysMap(data.dailyData, userSettings);
        
        // Update summary cards in new order
        try {
            // Test if summary cards exist
            const allCards = document.querySelectorAll('.summary-card');
            console.log('Total summary cards found:', allCards.length);
            console.log('First card:', allCards[0]);
            
            // Test the first card's value element specifically
            const firstCardValue = document.querySelector('.summary-card:nth-child(1) .card-value');
            console.log('First card value element:', firstCardValue);
            console.log('First card value current text:', firstCardValue?.textContent);
            console.log('First card value innerHTML:', firstCardValue?.innerHTML);
            
            const setValue = (selector, value, label) => {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`Setting ${label} to:`, value, 'Old value was:', element.textContent);
                    element.textContent = value;
                    console.log(`After setting, element now shows:`, element.textContent);
                } else {
                    console.warn(`Could not find element for ${label}:`, selector);
                }
            };
            
            // Top 5 key stats (above charts)
            setValue('.summary-grid:nth-child(2) .summary-card:nth-child(1) .card-value', data.streak || 0, 'Current Streak');
            setValue('.summary-grid:nth-child(2) .summary-card:nth-child(2) .card-value', (data.allTime?.words || 0).toLocaleString(), 'Total Words');
            // Format time as hours and minutes for writing time
            const totalMinutes = data.week?.minutes || 0;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            setValue('.summary-grid:nth-child(2) .summary-card:nth-child(3) .card-value', timeString, 'Writing Time');
            setValue('.summary-grid:nth-child(2) .summary-card:nth-child(4) .card-value', (data.allTime?.sessions || 0).toLocaleString(), 'Total Sessions');
            setValue('.summary-grid:nth-child(2) .summary-card:nth-child(5) .card-value', data.totalAchievements || 0, 'Achievements');
            
            // Additional stats (below charts)
            setValue('.additional-stats .summary-card:nth-child(1) .card-value', data.avgWordsPerMinute?.toFixed(1) || '0.0', 'Avg Words/Minute');
            setValue('.additional-stats .summary-card:nth-child(2) .card-value', data.avgWordsPerSession || 0, 'Avg Words/Session');
            setValue('.additional-stats .summary-card:nth-child(3) .card-value', data.totalSuccessfulSessions || 0, 'Successful Sessions');
            setValue('.additional-stats .summary-card:nth-child(4) .card-value', data.totalRagequits || 0, 'Ragequits');
            setValue('.additional-stats .summary-card:nth-child(5) .card-value', data.totalLongTermGoals || 0, 'Long-term Goals');
            setValue('.additional-stats .summary-card:nth-child(6) .card-value', data.totalRewards || 0, 'Total Rewards');
            setValue('.additional-stats .summary-card:nth-child(7) .card-value', data.totalConsequences || 0, 'Total Consequences');
            setValue('.additional-stats .summary-card:nth-child(8) .card-value', data.totalWordsNuked || 0, 'Words Nuked');
            setValue('.additional-stats .summary-card:nth-child(9) .card-value', (data.bestDayWords || 0).toLocaleString(), 'Best Day Words');
            setValue('.additional-stats .summary-card:nth-child(10) .card-value', data.avgSessionLength?.toFixed(1) || '0.0', 'Avg Session Length');
            
            // Show the summary cards now that data is loaded
            document.querySelector('.summary-grid').classList.add('loaded');
            document.querySelector('.additional-stats .summary-grid').classList.add('loaded');
        } catch (error) {
            console.error('Error updating summary cards:', error);
        }
        
        // Set calendar to current month (today)
        currentCalendarDate = new Date();
        
        // Update displays
        try {
            updateWordsChart(currentDailyData);
        } catch (error) {
            console.error('Error updating words chart:', error);
        }
        
        try {
            renderCalendar();
        } catch (error) {
            console.error('Error rendering calendar:', error);
        }
        
        
        // Update achievements
        if (data.achievements) {
            try {
                updateAchievements(data.achievements);
            } catch (error) {
                console.error('Error updating achievements:', error);
            }
        }
    });
