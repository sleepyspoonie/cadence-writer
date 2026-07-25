// maintenance.js — reset and debug IPC
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')
const state = require('./state')
const { loadStats } = require('./stats')


// Debug message handler
ipcMain.on('debug-message', (event, message) => {
  console.log('EDITOR DEBUG:', message);
});


// Test IPC handler
ipcMain.on('test-ipc', (event, message) => {
  console.log('TEST IPC RECEIVED:', message);
});


// In main.js, add this temporary logging
ipcMain.on('debug-stats', async (event) => {
  const stats = await loadStats();
  console.log('Full stats object:', JSON.stringify(stats, null, 2));
  event.reply('debug-stats-result', stats);
});


// Add reset functionality - triggers immediately on startup
const shouldReset = false; // Set to true to trigger reset


async function performCompleteReset() {
  try {
    console.log('=== PERFORMING COMPLETE APP RESET ===');

    // Clear all stored preferences completely
    state.store.clear();
    console.log('✓ Electron store cleared');

    // Delete the stats file to reset all statistics, achievements, streaks
    try {
      await fs.unlink(state.statsPath);
      console.log('✓ Stats file deleted');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error deleting stats file:', error);
      } else {
        console.log('✓ Stats file already didn\'t exist');
      }
    }

    // Don't set any default settings - leave completely empty
    console.log('✓ Left settings completely empty for first-time detection');
    console.log('=== RESET COMPLETE - APP SHOULD NOW BE IN FIRST-TIME STATE ===');

    return true;
  } catch (error) {
    console.error('Error during reset:', error);
    return false;
  }
}


// Trigger reset on app startup if flag is set - but after state.store is initialized
if (shouldReset) {
  // Schedule reset after app is ready (handled in main whenReady handler)
  setTimeout(async () => {
    await performCompleteReset();
  }, 2000);
}


// Keep the manual reset function too
ipcMain.handle('reset-app-data', async () => {
  const success = await performCompleteReset();
  return { success };
});

module.exports = { performCompleteReset }
