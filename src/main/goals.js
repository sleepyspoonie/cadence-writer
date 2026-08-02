// goals.js — daily/long-term goal and rewards IPC
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')
const state = require('./state')
const { loadStats, saveStats } = require('./stats')
const achievementsIpc = require('./achievements-ipc')



// Add this with the other IPC handlers
ipcMain.on('enable-goal-prompting', (event) => {
  const settings = state.store.get('userPreferences');
  const updatedSettings = {
    ...settings,
    longTermGoals: {
      ...settings.longTermGoals,
      enabled: false,  // Reset to false so modal will show
      disablePrompting: false  // Re-enable prompting
    }
  };
  state.store.set('userPreferences', updatedSettings);
  console.log('Goal prompting re-enabled');
});


// Also add the open-rewards-folder handler if it's not there
ipcMain.on('open-rewards-folder', async (event) => {
  const userDataPath = app.getPath('userData');
  const rewardsPath = path.join(userDataPath, 'rewards');
  
  try {
    await fs.mkdir(rewardsPath, { recursive: true });
    shell.openPath(rewardsPath);
  } catch (error) {
    console.error('Error opening rewards folder:', error);
  }
});


// Load reward images
ipcMain.on('get-reward-images', async (event) => {
  const userDataPath = app.getPath('userData');
  const rewardsPath = path.join(userDataPath, 'rewards');
  
  try {
    await fs.mkdir(rewardsPath, { recursive: true });
    const files = await fs.readdir(rewardsPath);
    
    const imageFiles = files
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => path.join(rewardsPath, file).replace(/\\/g, '/'));
    
    event.reply('reward-images-loaded', imageFiles);
  } catch (error) {
    console.error('Error loading reward images:', error);
    event.reply('reward-images-loaded', []);
  }
});


// Check if should show goal setup
ipcMain.on('check-goal-setup', (event) => {
  const settings = state.store.get('userPreferences');
  const dailyGoals = settings.dailyGoals || {};
  
  console.log('Checking goal setup:', dailyGoals);
  
  // Show goal setup if no daily goals are configured and prompting is not disabled
  if ((!dailyGoals.type || dailyGoals.type === 'disabled') && !dailyGoals.disablePrompting) {
    console.log('Showing goal setup modal');
    event.reply('show-goal-setup');
  }
});


// Set daily goal
ipcMain.on('set-daily-goal', (event, goalData) => {
  console.log('Setting daily goal:', goalData);
  const settings = state.store.get('userPreferences');
  
  const newDailyGoal = {
    ...goalData,
    enabled: true
  };

  const updatedSettings = {
    ...settings,
    dailyGoals: newDailyGoal
  };

  state.store.set('userPreferences', updatedSettings);
  console.log('Daily goal saved successfully!');
  
  // Broadcast settings update to all windows (including homepage)
  if (state.mainWindow && !state.mainWindow.isDestroyed()) {
    state.mainWindow.webContents.send('settings-updated', updatedSettings);
  }
});


// Set long-term goal (kept for backward compatibility)
ipcMain.on('set-long-term-goal', async (event, goalData) => {
  const settings = state.store.get('userPreferences');
  
  // Ensure the new goal is not marked as completed
  const newGoalData = {
    ...goalData,
    completed: false,
    completedDate: null
  };
  
  const updatedSettings = {
    ...settings,
    longTermGoals: newGoalData
    // No longer automatically modify hideTodayProgress
    // The visibility controller will handle auto-show/hide logic
  };
  state.store.set('userPreferences', updatedSettings);
  console.log('Long-term goal set:', newGoalData);
  
  // Committing to a long-term goal unlocks "It's the Climb".
  try {
    const stats = await loadStats();
    if (!stats.longTermGoalCommitted) {
      stats.longTermGoalCommitted = true;
      await saveStats(stats);
    }
    await achievementsIpc.checkAndUnlockAchievements(stats, { queueForHomepage: true });
  } catch (error) {
    console.error('Error recording long-term goal commitment:', error);
  }
  
  // Broadcast settings update to all windows (including homepage)
  if (state.mainWindow && !state.mainWindow.isDestroyed()) {
    state.mainWindow.webContents.send('settings-updated', updatedSettings);
  }
});


// Disable goal prompting
ipcMain.on('disable-goal-prompting', (event) => {
  const settings = state.store.get('userPreferences');
  const updatedSettings = {
    ...settings,
    dailyGoals: {
      ...settings.dailyGoals,
      type: 'disabled',
      disablePrompting: true
    },
    // Keep longTermGoals for backward compatibility
    longTermGoals: {
      ...settings.longTermGoals,
      disablePrompting: true
    }
    // No longer automatically modify hideTodayProgress
    // The visibility controller will handle auto-hide when no active goal
  };
  state.store.set('userPreferences', updatedSettings);
  console.log('Goal prompting disabled');
  
  // Broadcast settings update to all windows (including homepage)
  if (state.mainWindow && !state.mainWindow.isDestroyed()) {
    state.mainWindow.webContents.send('settings-updated', updatedSettings);
  }
});


// Disable long-term goals (for tutorial)
ipcMain.on('disable-long-term-goals', (event) => {
  console.log('Disabling long-term goals from tutorial');
  
  const settings = state.store.get('userPreferences', {});
  settings.longTermGoals = {
    ...settings.longTermGoals,
    enabled: false,
    disablePrompting: true
  };
  state.store.set('userPreferences', settings);
});


// Add this IPC handler
ipcMain.on('disable-long-term-goals', (event) => {
  const settings = state.store.get('userPreferences');
  const updatedSettings = {
    ...settings,
    longTermGoals: {
      enabled: false,
      disablePrompting: true
    },
    dailyGoals: {
      type: 'disabled', // Switch to freewrite mode
      disablePrompting: true
    }
    // No longer automatically modify hideTodayProgress
    // The visibility controller will handle auto-hide when no active goal
  };
  state.store.set('userPreferences', updatedSettings);
  console.log('Long-term goals and daily goals disabled - switched to freewrite mode');

  // Broadcast settings update to all windows
  if (state.mainWindow && !state.mainWindow.isDestroyed()) {
    state.mainWindow.webContents.send('settings-updated', updatedSettings);
  }
});


// Reset long-term goal handler
ipcMain.on('reset-long-term-goal', async (event) => {
  try {
    const settings = state.store.get('userPreferences');
    
    // Reset both old longTermGoals and new dailyGoals systems to default state
    const updatedSettings = {
      ...settings,
      longTermGoals: {
        enabled: false,
        totalWords: 50000,
        totalDays: 30,
        startDate: null,
        disablePrompting: false,
        completed: false,
        completedDate: null
      },
      dailyGoals: {
        type: 'disabled',
        dailyWordTarget: 500,
        longtermTotalWords: 50000,
        longtermTotalDays: 30,
        longtermStartDate: null,
        streakPreservation: 'any',
        disablePrompting: false,
        completed: false,
        completedDate: null
      }
      // No longer automatically modify hideTodayProgress
      // The visibility controller will handle auto-hide when no active goal
    };
    
    // Also clear goal-related stats data
    const stats = await loadStats();
    
    // Find when the current goal started (check both old and new systems)
    let goalStartDate = null;
    
    try {
      // Check old longTermGoals system
      if (settings.longTermGoals && settings.longTermGoals.startDate) {
        goalStartDate = new Date(settings.longTermGoals.startDate);
      }
      // Check new dailyGoals system
      else if (settings.dailyGoals && settings.dailyGoals.longtermStartDate) {
        goalStartDate = new Date(settings.dailyGoals.longtermStartDate);
      }
    } catch (dateError) {
      console.warn('Error parsing goal start date:', dateError);
      goalStartDate = null;
    }
    
    if (goalStartDate && !isNaN(goalStartDate.getTime())) {
      
      try {
        // Remove daily stats entries from goal start date onwards
        // This preserves pre-goal writing data
        if (stats.dailyStats) {
          Object.keys(stats.dailyStats).forEach(dateStr => {
            try {
              const statsDate = new Date(dateStr);
              if (!isNaN(statsDate.getTime()) && statsDate >= goalStartDate) {
                // Reset the words for this day to 0 but keep sessions and timeSpent
                // This way we preserve that writing happened but reset word count progress
                if (stats.dailyStats[dateStr]) {
                  stats.dailyStats[dateStr].words = 0;
                }
              }
            } catch (dateParseError) {
              console.warn('Error parsing stats date:', dateStr, dateParseError);
            }
          });
        }
        
        // Remove session logs from goal start date onwards
        if (stats.sessionLogs && Array.isArray(stats.sessionLogs)) {
          stats.sessionLogs = stats.sessionLogs.filter(session => {
            try {
              if (!session.time) return true; // Keep sessions without timestamps
              const sessionDate = new Date(session.time);
              return isNaN(sessionDate.getTime()) || sessionDate < goalStartDate;
            } catch (sessionDateError) {
              console.warn('Error parsing session date:', session.time, sessionDateError);
              return true; // Keep sessions that can't be parsed
            }
          });
        }
        
        await saveStats(stats);
        console.log('Goal-related stats data cleared from', goalStartDate.toISOString());
      } catch (statsError) {
        console.error('Error clearing stats data:', statsError);
        // Continue with the reset even if stats clearing fails
      }
    }
    
    try {
      state.store.set('userPreferences', updatedSettings);
      console.log('Long-term goal reset successfully');
      
      // Broadcast settings update to all windows
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        state.mainWindow.webContents.send('settings-updated', updatedSettings);
      }
      
      event.reply('goal-reset-complete');
    } catch (settingsError) {
      console.error('Error saving updated settings after reset:', settingsError);
      event.reply('goal-reset-error', 'Failed to save reset settings: ' + settingsError.message);
    }
  } catch (error) {
    console.error('Error resetting long-term goal:', error);
    event.reply('goal-reset-error', error.message);
  }
});


// Handle goal settings changes - refresh homepage
ipcMain.on('goal-settings-changed', (event) => {
  console.log('Goal settings changed - refreshing homepage windows');

  // Find and refresh all homepage windows
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach(window => {
    if (window && !window.isDestroyed()) {
      const url = window.webContents.getURL();
      if (url.includes('index.html') || url.endsWith('/')) {
        console.log('Refreshing homepage window');
        window.webContents.reload();
      }
    }
  });
});

module.exports = {}
