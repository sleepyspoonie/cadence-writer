// store.js — electron-store initialization and defaults
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')
const state = require('./state')


async function initializeStore() {
  const { default: Store } = await import('electron-store')
 
  state.store = new Store({
    defaults: {
      userPreferences: {
        mode: 'timer',
        timerDuration: 25,
        wordCountGoal: 1000,
        documentOption: 'new',
        lastOpenedFile: null,
        documentsFolder: null,
        totalWordsWritten: 0,
        currentStreak: 0,
        sessionsCompleted: 0,
        longTermGoals: {
          enabled: false,
          totalWords: 50000,
          totalDays: 30,
          startDate: null,
          disablePrompting: false
        },
        editorSettings: {
          fontSize: 18,
          fontFamily: 'Georgia',
          typewriterSound: false,
          hardcoreMode: false,
          autoFullscreen: true,
          hideTimer: false,
          hideWordCount: false
        },
        appearanceSettings: {
          theme: 'dark',
          customColors: {
            background: '#1a1a1a',
            text: '#e0e0e0',
            accent: '#14b8a6',
            card: '#252525',
            editorBg: '#ffffff',
            editorText: '#1a1a1a'
          },
          hideStatsPage: false,
          hideStatsSidebar: false,
          hideTodayProgress: false  // Default to false, let visibility controller handle auto-hide
        },
        gamificationSettings: {
          mode: 'focus',
          rewardWords: 100,
          rewardType: 'sound',
          gracePeriod: 10,
          punishType: 'sound',
          nuclearGracePeriod: 10,
          deletionSpeed: 5,
          disableStreak: false,
          disableAchievements: false
        }
      }
    }
  })
}

module.exports = { initializeStore }
