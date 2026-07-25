// session.js — writing session lifecycle IPC
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')
const state = require('./state')
const { loadStats, saveStats, calculateStreak } = require('./stats')
const { checkAndUnlockAchievements } = require('./achievements-ipc')


// Get session settings
ipcMain.on('get-session-settings', (event) => {
  if (state.currentSessionSettings) {
    event.reply('session-settings', state.currentSessionSettings);
  }
});


// Session tracking
ipcMain.on('session-started', (event, data) => {
  state.sessionStartWords = data.initialWords || 0;
  console.log('Session started - Initial words in document:', state.sessionStartWords);
});


// Session completion handler - handles session data and statistics tracking
ipcMain.on('session-completed', async (event, data) => {
  console.log('*** SESSION COMPLETED HANDLER CALLED ***');
  console.log('Session data received:', data);
  
  try {
    const stats = await loadStats();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Calculate new words written this session
    const newWordsWritten = Math.max(0, (data.totalWords || 0) - state.sessionStartWords);
    
    // Initialize daily stats if needed
    if (!stats.dailyStats) stats.dailyStats = {};
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { words: 0, sessions: 0, timeSpent: 0 };
    }
    
    // Update daily stats
    stats.dailyStats[today].words += newWordsWritten;
    stats.dailyStats[today].sessions += 1;
    stats.dailyStats[today].timeSpent += (data.timeSpent || 0);
    
    // Add to session logs
    if (!stats.sessionLogs) stats.sessionLogs = [];
    
    const sessionLog = {
      date: today,
      time: now.toISOString(),
      startTime: data.sessionStartTime,
      newWords: newWordsWritten,
      totalWords: data.totalWords,
      timeSpent: data.timeSpent || 0,
      mode: data.mode,
      successful: data.successful || false,
      ragequit: data.ragequit || false
    };
    
    stats.sessionLogs.push(sessionLog);
    
    // Keep only last 500 sessions
    if (stats.sessionLogs.length > 500) {
      stats.sessionLogs.shift();
    }
    
    // Calculate and update streak
    const prefs = state.store.get('userPreferences');
    const streak = calculateStreak(stats.dailyStats, prefs);
    state.store.set('userPreferences', { ...prefs, currentStreak: streak });
    
    // Save stats
    await saveStats(stats);
    
    // Check for achievements and queue them for homepage display
    await checkAndUnlockAchievements(stats, {
      date: today,
      time: now.toISOString(),
      newWords: newWordsWritten,
      totalWords: data.totalWords,
      timeSpent: data.timeSpent || 0,
      mode: data.mode,
      successful: data.successful || false,
      ragequit: data.ragequit || false,
      sessionStartTime: data.sessionStartTime,
      queueForHomepage: true  // Flag to queue achievements instead of showing immediately
    });
    
    console.log('Session successfully processed - New words:', newWordsWritten);
    
  } catch (error) {
    console.error('Error saving session completion:', error);
  }
});

module.exports = {}
