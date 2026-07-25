// main.js — Electron entry point for Cadence Writer.
// App state lives in src/main/state.js; feature IPC handlers are registered by
// requiring their modules below.
'use strict'

const { app, dialog } = require('electron')
const path = require('path')
const state = require('./src/main/state')

const { initializeStore } = require('./src/main/store')
const { createWindow } = require('./src/main/window')

// Registering IPC handlers (side-effect requires)
require('./src/main/settings')
require('./src/main/documents')
require('./src/main/session')
require('./src/main/stats')
require('./src/main/goals')
require('./src/main/achievements-ipc')
require('./src/main/maintenance')

app.whenReady().then(async () => {
  try {
    console.log('App starting...')

    // Paths that require the app to be ready
    state.statsPath = path.join(app.getPath('userData'), 'stats.json')

    await initializeStore()
    await createWindow()
  } catch (error) {
    console.error('Error during app startup:', error)
    dialog.showErrorBox('Startup Error', `Failed to start app: ${error.message}`)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
