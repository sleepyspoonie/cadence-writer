// settings.js — user preference load/save and onboarding IPC
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')
const state = require('./state')
const { loadStats, saveStats } = require('./stats')
const { checkAndUnlockAchievements } = require('./achievements-ipc')


// Save settings
// Simple handler for just saving slider values without complex merging
ipcMain.on('save-slider-settings', (event, sliderSettings) => {
  const currentSettings = state.store.get('userPreferences', {});
  console.log('Saving slider settings:', sliderSettings);
  
  // Only update the specific slider-related fields
  const updatedSettings = {
    ...currentSettings,
    mode: sliderSettings.mode,
    timerDuration: sliderSettings.timerDuration,
    wordCountGoal: sliderSettings.wordCountGoal,
    documentOption: sliderSettings.documentOption
  };
  
  state.store.set('userPreferences', updatedSettings);
  console.log('Slider settings saved successfully');
});


ipcMain.on('save-settings', (event, settings) => {
  if (state.store) {
    const currentSettings = state.store.get('userPreferences');
    
    const mergedSettings = {
      ...currentSettings,
      ...settings,
      // Only preserve documentsFolder if new settings doesn't include it or it's "Not set"
      documentsFolder: (settings.documentsFolder && settings.documentsFolder !== 'Not set') ? 
        settings.documentsFolder : currentSettings.documentsFolder,
      lastOpenedFile: currentSettings.lastOpenedFile
    };
    
    state.store.set('userPreferences', mergedSettings);
    console.log('Settings saved, folder preserved:', mergedSettings.documentsFolder);
    
    // Broadcast settings update to all windows
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send('settings-updated', mergedSettings);
    }
  }
})


// Get settings
ipcMain.on('get-settings', (event) => {
  if (state.store) {
    event.reply('load-settings', state.store.get('userPreferences'))
  }
})


// In main.js, update the save-all-settings handler:
ipcMain.on('save-all-settings', (event, allSettings) => {
  console.log('Main received save-all-settings:', allSettings);
  console.log('Saving theme:', allSettings.appearanceSettings?.theme);
  
  if (!state.store) {
    console.error('Store not initialized!');
    return;
  }
  
  try {
    const currentSettings = state.store.get('userPreferences') || {};
    
    const mergedSettings = {
      ...currentSettings,
      // Update documentsFolder if provided
      ...(allSettings.documentsFolder && { documentsFolder: allSettings.documentsFolder }),
      editorSettings: {
        ...currentSettings.editorSettings,
        ...allSettings.editorSettings
      },
      appearanceSettings: {
        ...currentSettings.appearanceSettings,
        ...allSettings.appearanceSettings
      },
      gamificationSettings: {
        ...currentSettings.gamificationSettings,
        ...allSettings.gamificationSettings
      },
      dailyGoals: {  // Daily goals section
        ...currentSettings.dailyGoals,
        ...allSettings.dailyGoalsSettings
      },
      // Keep longTermGoals for backward compatibility
      longTermGoals: {
        ...currentSettings.longTermGoals,
        ...allSettings.longTermGoalsSettings
      },
      // Preserve other fields...
      mode: currentSettings.mode,
      timerDuration: currentSettings.timerDuration,
      wordCountGoal: currentSettings.wordCountGoal,
      documentOption: currentSettings.documentOption,
      documentsFolder: currentSettings.documentsFolder,
      lastOpenedFile: currentSettings.lastOpenedFile,
      totalWordsWritten: currentSettings.totalWordsWritten,
      currentStreak: currentSettings.currentStreak,
      sessionsCompleted: currentSettings.sessionsCompleted
    };
    
    state.store.set('userPreferences', mergedSettings);
    console.log('Settings saved successfully to store');
    
    // Broadcast settings update to all windows
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send('settings-updated', mergedSettings);
    }
    
    event.reply('settings-saved', true);
  } catch (error) {
    console.error('Error saving settings:', error);
    event.reply('settings-saved', false);
  }
});


// Close settings window handler
ipcMain.on('close-settings', (event) => {
  const settingsWindow = BrowserWindow.fromWebContents(event.sender);
  if (settingsWindow) {
    settingsWindow.close();
  }
});


// New Sleek Tutorial System
// Check for first time initialization
ipcMain.on('check-first-time', async (event) => {
  const settings = state.store.get('userPreferences');
  const stats = await loadStats();

  console.log('=== FIRST TIME CHECK DEBUG ===');
  console.log('Raw settings from store:', settings);
  console.log('Raw stats from file:', stats);

  // Check if tutorial has been completed
  const tutorialCompleted = stats.completedTutorial === true;

  // Check if this is the first time (no settings exist or no pageVisits recorded)
  const isFirstTime = !settings || !settings.pageVisits || Object.keys(settings.pageVisits).length === 0;

  console.log('Tutorial completed:', tutorialCompleted);
  console.log('Is first time:', isFirstTime);
  console.log('Settings exists:', !!settings);
  console.log('PageVisits exists:', !!(settings && settings.pageVisits));
  console.log('PageVisits length:', settings && settings.pageVisits ? Object.keys(settings.pageVisits).length : 'N/A');

  if (isFirstTime && !tutorialCompleted) {
    console.log('✓ SHOWING WELCOME MODAL - First time user detected');
    event.reply('show-welcome');
  } else if (tutorialCompleted) {
    console.log('Tutorial already completed, skipping welcome');
    // For existing users who completed tutorial, no need to show goal setup
    // as they would have seen it in the tutorial flow
  } else {
    // Existing user who hasn't completed tutorial - check for goal setup as before
    const dailyGoals = settings.dailyGoals || {};
    
    if ((!dailyGoals.type || dailyGoals.type === 'disabled') && !dailyGoals.disablePrompting) {
      console.log('Showing goal setup modal');
      event.reply('show-goal-setup');
    }
  }
});


// Tutorial folder selection
ipcMain.on('select-tutorial-folder', async (event) => {
  try {
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Your Writing Folder',
      message: 'Choose where Cadence Writer will save your documents',
      buttonLabel: 'Select Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      console.log('Tutorial folder selected:', folderPath);
      
      // Save the folder path to settings
      const settings = state.store.get('userPreferences', {});
      settings.documentsFolder = folderPath;
      state.store.set('userPreferences', settings);
      
      event.reply('tutorial-folder-selected', folderPath);
    }
  } catch (error) {
    console.error('Error selecting tutorial folder:', error);
    dialog.showErrorBox('Folder Selection Error', 'Could not select folder. Please try again.');
  }
});


// Mark tutorial as completed
ipcMain.on('tutorial-completed', async (event) => {
  console.log('Tutorial completed by user');
  
  // Update stats to mark tutorial as completed
  const stats = await loadStats();
  
  // Check if tutorial was already completed to prevent duplicate achievements
  if (stats.completedTutorial) {
    console.log('Tutorial already completed, skipping achievement check');
    return;
  }
  
  console.log('Marking tutorial as completed and checking for achievement...');
  stats.completedTutorial = true;
  await saveStats(stats);
  
  // Check for tutorial graduate achievement (immediate display, not queued)
  console.log('Calling checkAndUnlockAchievements for tutorial completion');
  await checkAndUnlockAchievements(stats, {
    tutorialCompletion: true // Flag for immediate display
  });
  
  console.log('Tutorial completion processing finished');
});

module.exports = {}
