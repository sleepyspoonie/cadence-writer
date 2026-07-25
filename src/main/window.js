// window.js — BrowserWindow creation and fullscreen IPC
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const state = require('./state')
const { loadStats, saveStats } = require('./stats')


async function createWindow () {
  try {
    console.log('Loading stats...')
    // Track app start time for Procrastinator's Special achievement
    const stats = await loadStats();
    if (!stats.appStartTime) {
      stats.appStartTime = Date.now();
      await saveStats(stats);
    }

    console.log('Creating browser window...')

    // Window/taskbar icon. The packaged app takes its icon from the build
    // config (assets/icon.ico); this covers dev mode and Linux.
    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png')
    const windowIcon = fsSync.existsSync(iconPath) ? iconPath : undefined

    state.mainWindow = new BrowserWindow({
      icon: windowIcon,
      width: 1200,
      height: 800,
      fullscreen: false,
      autoHideMenuBar: true,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    console.log('Browser window created')
  } catch (error) {
    console.error('Error in createWindow:', error)
    throw error
  }
 
  state.mainWindow.on('close', async () => {
    // Track total app usage time for Procrastinator's Special
    try {
      const stats = await loadStats();
      if (stats.appStartTime) {
        const appSessionTime = Math.floor((Date.now() - stats.appStartTime) / (60 * 1000)); // minutes
        stats.totalAppTime = (stats.totalAppTime || 0) + appSessionTime;
        
        // Calculate time without writing (total app time - total writing time)
        const totalWritingMinutes = Object.values(stats.dailyStats || {}).reduce((sum, day) => sum + (day.timeSpent || 0), 0);
        stats.totalWritingTime = totalWritingMinutes;
        stats.timeWithoutWriting = Math.max(0, stats.totalAppTime - stats.totalWritingTime);
        
        console.log('App session ended. Time spent:', appSessionTime, 'minutes');
        console.log('Total app time:', stats.totalAppTime, 'Total writing time:', stats.totalWritingTime);
        console.log('Time without writing:', stats.timeWithoutWriting, 'minutes');
        
        stats.appStartTime = null; // Reset for next session
        await saveStats(stats);
      }
    } catch (error) {
      console.error('Error tracking app close time:', error);
    }
    
    state.mainWindow.webContents.send('save-before-close')
  })

  console.log('Loading index.html...')
  state.mainWindow.loadFile('index.html').then(() => {
    console.log('index.html loaded successfully')
  }).catch((error) => {
    console.error('Failed to load index.html:', error)
  })

  state.mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      state.mainWindow.webContents.toggleDevTools()
    }
  })
 
  state.mainWindow.webContents.on('did-finish-load', () => {
    if (state.store) {
      state.mainWindow.webContents.send('load-settings', state.store.get('userPreferences'))
    }
  })
 
  state.mainWindow.on('enter-full-screen', () => {
    state.mainWindow.webContents.send('fullscreen-changed', true);
  });

  state.mainWindow.on('leave-full-screen', () => {
    state.mainWindow.webContents.send('fullscreen-changed', false);
  });
}


// Fullscreen toggle
ipcMain.on('toggle-fullscreen', (event) => {
  const isFullscreen = state.mainWindow.isFullScreen();
  state.mainWindow.setFullScreen(!isFullscreen);
  event.reply('fullscreen-changed', !isFullscreen);
});


// Set fullscreen (for auto fullscreen - ensures fullscreen is enabled)
ipcMain.on('set-fullscreen', (event, shouldBeFullscreen) => {
  const isFullscreen = state.mainWindow.isFullScreen();
  if (isFullscreen !== shouldBeFullscreen) {
    state.mainWindow.setFullScreen(shouldBeFullscreen);
    event.reply('fullscreen-changed', shouldBeFullscreen);
  }
});

module.exports = { createWindow }
