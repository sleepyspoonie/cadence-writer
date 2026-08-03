// preload.js — secure bridge between renderer pages and the main process.
// Renderers get a minimal ipcRenderer-shaped API (send/on/once/invoke) limited
// to the channels below. Node APIs are not exposed to page content.
'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// Renderer -> main
const SEND_CHANNELS = [
  'auto-save',
  'browse-document',
  'check-first-time',
  'check-folder',
  'check-goal-setup',
  'debug-message',
  'disable-goal-prompting',
  'disable-long-term-goals',
  'enable-goal-prompting',
  'exit-to-home',
  'get-all-files',
  'get-current-file',
  'get-detailed-stats',
  'get-homepage-stats',
  'get-queued-achievements',
  'queued-achievements-shown',
  'get-reward-images',
  'get-session-settings',
  'get-settings',
  'goal-settings-changed',
  'manual-save',
  'open-file-in-editor',
  'export-file',
  'import-text',
  'open-recent-document',
  'open-rewards-folder',
  'page-visited',
  'rename-file',
  'reset-app-data',
  'reset-long-term-goal',
  'save-all-settings',
  'save-settings',
  'save-slider-settings',
  'select-folder',
  'select-tutorial-folder',
  'session-completed',
  'session-started',
  'set-daily-goal',
  'set-fullscreen',
  'set-long-term-goal',
  'show-in-explorer',
  'silent-treatment-achieved',
  'start-new-document',
  'test-comeback-achievements',
  'test-daily-achievements',
  'test-file-achievements',
  'test-meta-achievements',
  'test-procrastinator-achievements',
  'test-save-achievements',
  'test-session-achievements',
  'test-time-achievements',
  'toggle-fullscreen',
  'tutorial-completed'
]

// Main -> renderer
const RECEIVE_CHANNELS = [
  'achievements-unlocked',
  'current-file-info',
  'detailed-stats',
  'file-error',
  'file-renamed',
  'files-list',
  'folder-check',
  'folder-selected',
  'fullscreen-changed',
  'goal-completed',
  'goal-reset-error',
  'homepage-stats',
  'load-settings',
  'needs-folder-setup',
  'no-recent-file',
  'export-complete',
  'import-complete',
  'queued-achievements',
  'recent-file-not-found',
  'reward-images-loaded',
  'save-before-close',
  'session-settings',
  'settings-updated',
  'show-goal-setup',
  'show-welcome',
  'tutorial-folder-selected'
]

const INVOKE_CHANNELS = ['reset-app-data']

function assertChannel (channel, list, verb) {
  if (!list.includes(channel)) {
    throw new Error(`Blocked ${verb} on non-whitelisted IPC channel: ${channel}`)
  }
}

contextBridge.exposeInMainWorld('ipcRenderer', {
  send (channel, ...args) {
    assertChannel(channel, SEND_CHANNELS, 'send')
    ipcRenderer.send(channel, ...args)
  },
  invoke (channel, ...args) {
    assertChannel(channel, INVOKE_CHANNELS, 'invoke')
    return ipcRenderer.invoke(channel, ...args)
  },
  on (channel, listener) {
    assertChannel(channel, RECEIVE_CHANNELS, 'on')
    ipcRenderer.on(channel, (_event, ...args) => listener(_event, ...args))
  },
  once (channel, listener) {
    assertChannel(channel, RECEIVE_CHANNELS, 'once')
    ipcRenderer.once(channel, (_event, ...args) => listener(_event, ...args))
  },
  removeAllListeners (channel) {
    ipcRenderer.removeAllListeners(channel)
  }
})
