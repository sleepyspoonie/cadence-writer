// state.js — shared mutable state for the main process.
// Every main-process module reads and writes app state through this object so
// there is a single source of truth (instead of module-level globals).
'use strict'

const AchievementSystem = require('./achievement-system')

module.exports = {
  mainWindow: null,
  store: null,
  statsPath: null,
  currentSessionSettings: null,
  currentFilePath: null,
  isNewFile: false,
  sessionStartWords: 0,
  achievementSystem: new AchievementSystem()
}
