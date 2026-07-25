        
        // Track page visit for achievements
        document.addEventListener('DOMContentLoaded', () => {
            ipcRenderer.send('page-visited', 'about');
        });
        
        // Test function for time achievements (development)
        window.testTimeAchievements = function() {
            console.log('Testing time achievements...');
            ipcRenderer.send('test-time-achievements');
        };
        
        // Test function for Silent Treatment (development)
        window.testSilentTreatment = function() {
            console.log('Testing Silent Treatment achievement...');
            ipcRenderer.send('silent-treatment-achieved', {
                idleMinutes: 10.5,
                textLength: 0,
                wordCount: 0
            });
        };
        
        // Test function for Daily achievements (development)
        window.testDailyAchievements = function() {
            console.log('Testing daily achievements...');
            ipcRenderer.send('test-daily-achievements');
        };
        
        // Test function for File Management achievements (development)
        window.testFileAchievements = function() {
            console.log('Testing file management achievements...');
            ipcRenderer.send('test-file-achievements');
        };
        
        // Test function for Comeback achievements (development)
        window.testComebackAchievements = function() {
            console.log('Testing comeback achievements...');
            ipcRenderer.send('test-comeback-achievements');
        };
        
        // Test function for Save achievements (development)
        window.testSaveAchievements = function() {
            console.log('Testing save achievements...');
            ipcRenderer.send('test-save-achievements');
        };
        
        // Test function for Procrastinator achievements (development)
        window.testProcrastinatorAchievements = function() {
            console.log('Testing procrastinator achievements...');
            ipcRenderer.send('test-procrastinator-achievements');
        };
        
        // Test function for Meta achievements (development)
        window.testMetaAchievements = function() {
            console.log('Testing meta achievements...');
            ipcRenderer.send('test-meta-achievements');
        };
        
        // Test function for Session achievements (development)
        window.testSessionAchievements = function() {
            console.log('Testing all remaining session achievements...');
            ipcRenderer.send('test-session-achievements');
        };
        
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
