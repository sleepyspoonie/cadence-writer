const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')  // Add shell here
const fs = require('fs').promises
const path = require('path')
const AchievementSystem = require('./achievements.js')

let mainWindow
let store
let currentSessionSettings = null
let currentFilePath = null
let isNewFile = false
let sessionStartWords = 0

// Initialize achievement system
const achievementSystem = new AchievementSystem()

async function createWindow () {
  // Track app start time for Procrastinator's Special achievement
  const stats = await loadStats();
  if (!stats.appStartTime) {
    stats.appStartTime = Date.now();
    await saveStats(stats);
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
 
  mainWindow.on('close', async () => {
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
    
    mainWindow.webContents.send('save-before-close')
  })
 
  mainWindow.loadFile('index.html')
 
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
  })
 
  mainWindow.webContents.on('did-finish-load', () => {
    if (store) {
      mainWindow.webContents.send('load-settings', store.get('userPreferences'))
    }
  })
 
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', false);
  });
}

// Save settings
ipcMain.on('save-settings', (event, settings) => {
  if (store) {
    const currentSettings = store.get('userPreferences');
    
    const mergedSettings = {
      ...currentSettings,
      ...settings,
      documentsFolder: currentSettings.documentsFolder,
      lastOpenedFile: currentSettings.lastOpenedFile
    };
    
    store.set('userPreferences', mergedSettings);
    console.log('Settings saved, folder preserved:', mergedSettings.documentsFolder);
    
    // Broadcast settings update to all windows
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-updated', mergedSettings);
    }
  }
})

// Get settings
ipcMain.on('get-settings', (event) => {
  if (store) {
    event.reply('load-settings', store.get('userPreferences'))
  }
})

// Update stats
ipcMain.on('update-stats', (event, stats) => {
  if (store) {
    const current = store.get('userPreferences')
    store.set('userPreferences', { ...current, ...stats })
  }
})

// Fullscreen toggle
ipcMain.on('toggle-fullscreen', (event) => {
  const isFullscreen = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFullscreen);
  event.reply('fullscreen-changed', !isFullscreen);
});

// Folder selection
ipcMain.on('select-folder', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Your Writing Folder'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const currentSettings = store.get('userPreferences');
    store.set('userPreferences', { ...currentSettings, documentsFolder: folderPath });
    event.reply('folder-selected', folderPath);
  }
});

// Check folder
ipcMain.on('check-folder', async (event) => {
  const settings = store.get('userPreferences');
  const folderPath = settings ? settings.documentsFolder : null;
  
  console.log('Checking folder:', folderPath);
  
  if (!folderPath) {
    event.reply('folder-check', { exists: false, needsSetup: true });
    return;
  }
  
  try {
    await fs.access(folderPath);
    event.reply('folder-check', { exists: true, path: folderPath });
  } catch (error) {
    event.reply('folder-check', { exists: false, path: folderPath });
  }
});

// Start new document
ipcMain.on('start-new-document', async (event, settings) => {
  console.log('*** IPC HANDLER: start-new-document called ***');
  console.log('Starting new document with settings:', settings);
  
  const userPrefs = store.get('userPreferences');
  const folderPath = userPrefs ? userPrefs.documentsFolder : null;
  
  if (!folderPath) {
    event.reply('needs-folder-setup');
    return;
  }
  
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `focuswriter-${timestamp}.rtf`;
  currentFilePath = path.join(folderPath, filename);
  
  const rtfHeader = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ';
  const rtfFooter = '}';
  const initialContent = rtfHeader + rtfFooter;
  
  try {
    await fs.writeFile(currentFilePath, initialContent);
    isNewFile = true;
    
    // Track document creation for achievements
    const stats = await loadStats();
    stats.totalDocuments = (stats.totalDocuments || 0) + 1;
    stats.consecutiveEmptyDocs = (stats.consecutiveEmptyDocs || 0) + 1;  // Start counting empty docs
    
    // Add to unique documents list if not already present
    const documentName = path.basename(currentFilePath, path.extname(currentFilePath));
    if (!stats.uniqueDocuments) {
      stats.uniqueDocuments = [];
    }
    if (!stats.uniqueDocuments.includes(documentName)) {
      stats.uniqueDocuments.push(documentName);
    }
    
    await saveStats(stats);
    console.log('Document created. Total documents:', stats.totalDocuments);
    console.log('Unique documents:', stats.uniqueDocuments.length);
    
    const currentSettings = store.get('userPreferences');
    store.set('userPreferences', { ...currentSettings, lastOpenedFile: currentFilePath });
    console.log('Saved as recent file:', currentFilePath);
    
    currentSessionSettings = settings;
    mainWindow.loadFile('editor.html');
  } catch (error) {
    console.error('Error creating file:', error);
    event.reply('file-error', 'Could not create file');
  }
});

// Browse document
ipcMain.on('browse-document', async (event, settings) => {
  const userPrefs = store.get('userPreferences');
  const folderPath = userPrefs ? userPrefs.documentsFolder : null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: folderPath,
    filters: [
      { name: 'Rich Text Files', extensions: ['rtf'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    currentFilePath = result.filePaths[0];
    isNewFile = false;
    
    // Track document opening for achievements
    const stats = await loadStats();
    const documentName = path.basename(currentFilePath, path.extname(currentFilePath));
    
    // Add to unique documents list if not already present
    if (!stats.uniqueDocuments) {
      stats.uniqueDocuments = [];
    }
    if (!stats.uniqueDocuments.includes(documentName)) {
      stats.uniqueDocuments.push(documentName);
    }
    
    await saveStats(stats);
    console.log('Document opened. Unique documents:', stats.uniqueDocuments.length);
    
    const currentSettings = store.get('userPreferences');
    store.set('userPreferences', { ...currentSettings, lastOpenedFile: currentFilePath });
    console.log('Saved as recent file:', currentFilePath);
    
    currentSessionSettings = settings;
    mainWindow.loadFile('editor.html');
  }
});

// Open recent document
ipcMain.on('open-recent-document', async (event, settings) => {
  const userPrefs = store.get('userPreferences');
  const recentFile = userPrefs ? userPrefs.lastOpenedFile : null;
  
  console.log('Trying to open recent file:', recentFile);
  
  if (!recentFile) {
    event.reply('no-recent-file');
    return;
  }
  
  try {
    await fs.access(recentFile);
    currentFilePath = recentFile;
    isNewFile = false;
    currentSessionSettings = settings;
    
    // Track document opening for achievements
    const stats = await loadStats();
    const documentName = path.basename(currentFilePath, path.extname(currentFilePath));
    
    // Add to unique documents list if not already present
    if (!stats.uniqueDocuments) {
      stats.uniqueDocuments = [];
    }
    if (!stats.uniqueDocuments.includes(documentName)) {
      stats.uniqueDocuments.push(documentName);
    }
    
    await saveStats(stats);
    console.log('Recent document opened. Unique documents:', stats.uniqueDocuments.length);
    
    console.log('Opening recent file:', currentFilePath);
    mainWindow.loadFile('editor.html');
  } catch (error) {
    console.error('Recent file not found:', error);
    event.reply('recent-file-not-found', recentFile);
    
    const currentSettings = store.get('userPreferences');
    store.set('userPreferences', { ...currentSettings, lastOpenedFile: null });
  }
});

ipcMain.on('get-current-file', async (event) => {
  if (!currentFilePath) {
    event.reply('current-file-info', null);
    return;
  }
  
  try {
    const content = await fs.readFile(currentFilePath, 'utf8');
    
    // Try to parse as JSON first (new format)
    try {
      const fileData = JSON.parse(content);
      event.reply('current-file-info', {
        path: currentFilePath,
        name: path.basename(currentFilePath),
        content: fileData.quillContent
      });
    } catch {
      // Fall back to old RTF format (plain text only)
      let text = content.replace(/\{\\rtf1.*?\\f0\\fs24\s*/g, '');
      text = text.replace(/\}$/g, '');
      text = text.replace(/\\par\s/g, '\n');
      text = text.replace(/\\\\/g, '\\');
      text = text.replace(/\\\{/g, '{');
      text = text.replace(/\\\}/g, '}');
      
      event.reply('current-file-info', {
        path: currentFilePath,
        name: path.basename(currentFilePath),
        content: { ops: [{ insert: text }] }  // Convert to basic Delta
      });
    }
  } catch (error) {
    console.error('Error reading file:', error);
    event.reply('current-file-info', null);
  }
});

// Get session settings
ipcMain.on('get-session-settings', (event) => {
  if (currentSessionSettings) {
    event.reply('session-settings', currentSessionSettings);
  }
});

// Stats file management
const statsPath = path.join(app.getPath('userData'), 'stats.json');

async function loadStats() {
  try {
    const data = await fs.readFile(statsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      dailyStats: {},
      sessionLogs: [],
      totalDocuments: 0,
      uniqueDocuments: [],
      consecutiveEmptyDocs: 0,
      lastWritingDate: null,
      brokenDrought: 0,
      streakRebirth: false,
      lastStreakLength: 0,
      streakWasBroken: false,
      uniqueProjects: [],
      appStartTime: null,
      totalAppTime: 0,
      totalWritingTime: 0,
      timeWithoutWriting: 0,
      firstHiddenAchievement: false,
      longTermGoalCommitted: false,
      missedLongTermDay: false,
      reachedMidpoint: false,
      totalRewards: 0,
      totalConsequences: 0,
      totalWordsNuked: 0,
      bestDayWords: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

async function saveStats(stats) {
  try {
    stats.lastUpdated = new Date().toISOString();
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    console.log('Stats saved');
    return true;
  } catch (error) {
    console.error('Error saving stats:', error);
    return false;
  }
}

// Session tracking
ipcMain.on('session-started', (event, data) => {
  sessionStartWords = data.initialWords || 0;
  console.log('Session started - Initial words in document:', sessionStartWords);
});

function calculateStreak(dailyStats) {
  const dates = Object.keys(dailyStats).sort().reverse();
  if (dates.length === 0) return 0;
  
  let streak = 0;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (dailyStats[today]?.words > 0) {
    streak = 1;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    if (!dailyStats[yesterdayStr]?.words) return 0;
    streak = 1;
  }
  
  for (let i = 1; i < dates.length; i++) {
    const current = new Date(dates[i-1]);
    const previous = new Date(dates[i]);
    const dayDiff = Math.floor((current - previous) / (1000 * 60 * 60 * 24));
    
    if (dayDiff === 1 && dailyStats[dates[i]].words > 0) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

ipcMain.on('get-homepage-stats', async (event) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const stats = await loadStats();
  console.log('HOMEPAGE STATS REQUESTED. Today is:', today);
  console.log('Loaded stats:', stats.dailyStats);
  
  const todayStats = stats.dailyStats[today] || { words: 0, sessions: 0 };
  
  let weekWords = 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  Object.entries(stats.dailyStats).forEach(([date, data]) => {
    if (new Date(date) >= weekAgo) {
      weekWords += data.words;
    }
  });
  
  // Calculate total words ever written
  let totalWords = 0;
  Object.values(stats.dailyStats).forEach(day => {
    totalWords += day.words || 0;
  });
  
  const prefs = store.get('userPreferences');
  
  // Check for goal completion and calculate words since goal start
  let goalCompleted = false;
  let wordsFromGoalStart = 0;
  let goalProgressToday = 0;  // Words written toward goal today
  
  if (prefs.longTermGoals && prefs.longTermGoals.enabled) {
    goalCompleted = checkGoalCompletion(stats, prefs.longTermGoals);
    
    // Calculate words written since goal started
    const goalStartDate = new Date(prefs.longTermGoals.startDate);
    if (stats.sessionLogs) {
      stats.sessionLogs.forEach(session => {
        const sessionDate = new Date(session.time);
        if (sessionDate >= goalStartDate) {
          wordsFromGoalStart += session.newWords || 0;
          
          // Count today's words toward goal
          const sessionDay = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
          if (sessionDay === today) {
            goalProgressToday += session.newWords || 0;
          }
        }
      });
    }
    
    console.log('Goal completion check:', {
      enabled: prefs.longTermGoals.enabled,
      completed: prefs.longTermGoals.completed,
      goalCompleted: goalCompleted,
      totalWords: totalWords,
      wordsFromGoalStart: wordsFromGoalStart,
      goalTarget: prefs.longTermGoals.totalWords
    });
    
    if (goalCompleted && !prefs.longTermGoals.completed) {
      // Mark as completed so we don't show again
      const updatedPrefs = {
        ...prefs,
        longTermGoals: {
          ...prefs.longTermGoals,
          completed: true,
          completedDate: new Date().toISOString()
        },
        longTermGoalsCompleted: (prefs.longTermGoalsCompleted || 0) + 1
      };
      store.set('userPreferences', updatedPrefs);
      console.log('Goal marked as completed!');
    }
  }
  
  event.reply('homepage-stats', {
    todayWords: todayStats.words,
    weekWords: weekWords,
    totalWords: totalWords,
    wordsFromGoalStart: wordsFromGoalStart,
    goalProgressToday: goalProgressToday,  // Words toward goal today
    streak: prefs.currentStreak || 0,
    goalCompleted: goalCompleted,
    longTermGoals: prefs.longTermGoals // Send the long-term goal data
  });
});

ipcMain.on('manual-save', async (event, data) => {
  // Handle manual saves (same as auto-save but tracked separately)
  console.log('Manual save triggered, count:', data.manualSaveCount);
  
  // Proceed with normal save logic
  if (!currentFilePath) {
    console.error('No current file path for manual save');
    return;
  }
  
  try {
    const fileData = {
      content: data.content,
      wordCount: data.wordCount,
      lastModified: new Date().toISOString()
    };
    
    await fs.writeFile(currentFilePath, JSON.stringify(fileData, null, 2));
    console.log('Manual save completed for:', currentFilePath);
  } catch (error) {
    console.error('Error during manual save:', error);
  }
});

ipcMain.on('auto-save', async (event, data) => {
  if (!currentFilePath) return;
  
  try {
    if (data.text && data.text.trim().length > 0) {
      isNewFile = false;
    }
    
    // Save as JSON with .rtf extension to preserve formatting
    const fileData = {
      quillContent: data.content,  // Full Quill Delta
      plainText: data.text,
      wordCount: data.wordCount,
      lastModified: new Date().toISOString()
    };
    
    await fs.writeFile(currentFilePath, JSON.stringify(fileData, null, 2));
    
    const stats = store.get('userPreferences');
    const newStats = {
      ...stats,
      totalWordsWritten: Math.max(stats.totalWordsWritten || 0, data.wordCount),
      lastOpenedFile: currentFilePath
    };
    store.set('userPreferences', newStats);
    
    console.log('Auto-saved:', data.wordCount, 'words to', currentFilePath);
  } catch (error) {
    console.error('Error saving file:', error);
  }
});

// Exit to home
ipcMain.on('exit-to-home', async (event) => {
  if (isNewFile && currentFilePath) {
    try {
      const content = await fs.readFile(currentFilePath, 'utf8');
      const textMatch = content.match(/\{\\rtf1.*?\\f0\\fs24\s*(.*?)\}$/);
      const hasContent = textMatch && textMatch[1] && textMatch[1].trim().length > 0;
      
      if (!hasContent) {
        await fs.unlink(currentFilePath);
        console.log('Deleted empty file:', currentFilePath);
        
        const settings = store.get('userPreferences');
        if (settings.lastOpenedFile === currentFilePath) {
          store.set('userPreferences', { ...settings, lastOpenedFile: null });
        }
      }
    } catch (error) {
      console.error('Error checking/deleting file:', error);
    }
  }
  
  currentFilePath = null;
  currentSessionSettings = null;
  isNewFile = false;
  mainWindow.loadFile('index.html');
});

async function initializeStore() {
  const { default: Store } = await import('electron-store')
 
  store = new Store({
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
          autoFullscreen: false,
          hideTimer: false,
          hideWordCount: false
        },
        appearanceSettings: {
          theme: 'dark',
          customColors: {
            background: '#1a1a1a',
            text: '#e0e0e0',
            accent: '#14b8a6',
            card: '#252525'
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

app.whenReady().then(async () => {
  await initializeStore()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Get all files in the documents folder
ipcMain.on('get-all-files', async (event) => {
  const prefs = store.get('userPreferences');
  const folderPath = prefs?.documentsFolder;
  console.log('Getting files from folder:', folderPath);
  
  if (!folderPath) {
    event.reply('files-list', { error: 'No folder set', files: [] });
    return;
  }
  
  try {
    const files = await fs.readdir(folderPath);
    console.log('Found files in directory:', files);
    const fileStats = [];
    
    for (const file of files) {
      if (file.endsWith('.rtf') || file.endsWith('.txt')) {
        console.log('Processing file:', file);
        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Extract text for word count
        let wordCount = 0;
        if (file.endsWith('.rtf')) {
          try {
            // These .rtf files are actually JSON from Quill editor
            const jsonData = JSON.parse(content);
            if (jsonData.plainText) {
              const text = jsonData.plainText.trim();
              if (text.length > 0) {
                wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
              }
            }
            console.log('JSON RTF word count for', file, ':', wordCount);
          } catch (e) {
            // If not JSON, treat as traditional RTF
            let text = content;
            text = text.replace(/\{\*?\\[^{}]*\}/g, '');
            text = text.replace(/\\[a-z]+\-?\d*\s?/gi, '');
            text = text.replace(/[\{\}]/g, '');
            text = text.replace(/\\par\s*/g, ' ');
            text = text.replace(/\\'[0-9a-f]{2}/gi, '');
            text = text.replace(/\\[^a-z]/gi, '');
            text = text.trim();
            if (text.length > 0) {
              wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
            }
            console.log('Traditional RTF word count for', file, ':', wordCount);
          }
        } else {
          wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
        }
        
        fileStats.push({
          name: file,
          path: filePath,
          modified: stats.mtime,
          size: stats.size,
          words: wordCount
        });
      }
    }
    
    console.log('Sending file stats:', fileStats);

    fileStats.sort((a, b) => b.modified - a.modified);
    event.reply('files-list', { files: fileStats });
  } catch (error) {
    event.reply('files-list', { error: error.message, files: [] });
  }
});

// Rename file
ipcMain.on('rename-file', async (event, oldPath, newName) => {
  try {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    await fs.rename(oldPath, newPath);
    
    // Update lastOpenedFile if it was renamed
    const prefs = store.get('userPreferences');
    if (prefs.lastOpenedFile === oldPath) {
      store.set('userPreferences', { ...prefs, lastOpenedFile: newPath });
    }
    
    event.reply('file-renamed', { success: true, oldPath, newPath });
  } catch (error) {
    event.reply('file-renamed', { success: false, error: error.message });
  }
});

// Open file in system explorer
ipcMain.on('show-in-explorer', (event, filePath) => {
  const { shell } = require('electron');
  shell.showItemInFolder(filePath);
});

// Open file in editor
ipcMain.on('open-file-in-editor', async (event, filePath) => {
  currentFilePath = filePath;
  isNewFile = false;
  
  // Set to freewrite mode (no limits)
  currentSessionSettings = {
    mode: 'freewrite',
    goal: 0  // No goal for freewrite
  };
  
  mainWindow.loadFile('editor.html');
});

const { ipcRenderer } = require('electron');

let allFiles = [];

// Load files when page loads
function loadFiles() {
    ipcRenderer.send('get-all-files');
}

ipcMain.on('get-detailed-stats', async (event) => {
  console.log('get-detailed-stats handler called');
  const stats = await loadStats();
  console.log('Stats loaded:', stats);
  console.log('dailyStats keys:', Object.keys(stats.dailyStats || {}));
  console.log('sessionLogs length:', (stats.sessionLogs || []).length);
  console.log('sessionLogs:', stats.sessionLogs);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Calculate all-time stats
  let allTimeWords = 0;
  let allTimeSessions = 0;
  let allTimeMinutes = 0;
  
  Object.values(stats.dailyStats || {}).forEach(day => {
    allTimeWords += day.words || 0;
    allTimeSessions += day.sessions || 0;
    allTimeMinutes += day.timeSpent || 0;
  });
  
  // Calculate this year
  const yearStart = new Date(now.getFullYear(), 0, 1);
  let yearWords = 0;
  let yearSessions = 0;
  let yearMinutes = 0;
  
  Object.entries(stats.dailyStats || {}).forEach(([date, day]) => {
    if (new Date(date) >= yearStart) {
      yearWords += day.words || 0;
      yearSessions += day.sessions || 0;
      yearMinutes += day.timeSpent || 0;
    }
  });
  
  // Calculate this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let monthWords = 0;
  let monthSessions = 0;
  let monthMinutes = 0;
  
  Object.entries(stats.dailyStats || {}).forEach(([date, day]) => {
    if (new Date(date) >= monthStart) {
      monthWords += day.words || 0;
      monthSessions += day.sessions || 0;
      monthMinutes += day.timeSpent || 0;
    }
  });
  
  // Calculate this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  let weekWords = 0;
  let weekSessions = 0;
  let weekMinutes = 0;
  
  Object.entries(stats.dailyStats || {}).forEach(([date, day]) => {
    if (new Date(date) >= weekAgo) {
      weekWords += day.words || 0;
      weekSessions += day.sessions || 0;
      weekMinutes += day.timeSpent || 0;
    }
  });
  
  // Get daily data for charts (last 30 days)
  const dailyData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dailyData.push({
      date: dateStr,
      words: stats.dailyStats?.[dateStr]?.words || 0,
      minutes: stats.dailyStats?.[dateStr]?.timeSpent || 0,
      sessions: stats.dailyStats?.[dateStr]?.sessions || 0
    });
  }

  // Get top 5 sessions by word count
  const topSessions = (stats.sessionLogs || [])
    .filter(session => session.filename !== 'unknown' && session.newWords > 0)
    .sort((a, b) => b.newWords - a.newWords)
    .slice(0, 5);
  
  const prefs = store.get('userPreferences');
  
  // Calculate new statistics from session logs
  const sessionLogs = stats.sessionLogs || [];
  let totalSuccessfulSessions = 0;
  let totalRagequits = 0;
  let totalWordsFromSessions = 0;
  let totalMinutesFromSessions = 0;
  let sessionsWithWords = 0;
  
  sessionLogs.forEach(session => {
    if (session.successful) totalSuccessfulSessions++;
    if (session.ragequit) totalRagequits++;
    if (session.newWords > 0) {
      totalWordsFromSessions += session.newWords;
      sessionsWithWords++;
    }
    totalMinutesFromSessions += session.timeSpent || 0;
  });
  
  // Calculate averages
  const avgWordsPerSession = sessionsWithWords > 0 ? Math.round(totalWordsFromSessions / sessionsWithWords) : 0;
  const avgWordsPerMinute = totalMinutesFromSessions > 0 ? Math.round((totalWordsFromSessions / totalMinutesFromSessions) * 10) / 10 : 0;
  
  // Calculate long-term goals completed (historical count + current)
  let totalLongTermGoals = prefs?.longTermGoalsCompleted || 0;
  if (prefs?.longTermGoals?.completed) {
    totalLongTermGoals += 1; // Add current completed goal to historical count
  }
  
  // Get achievement data
  const achievementData = getAchievementData();
  const totalAchievements = achievementData.totalUnlocked;
  
  console.log('Sending detailed stats with', dailyData.length, 'days of data');
  
  // Calculate additional gamification stats
  let bestDayWords = 0;
  let totalWordsNuked = 0; // Dummy stat for now - words deleted by nuclear mode
  let avgSessionLength = 0;
  
  Object.values(stats.dailyStats || {}).forEach(day => {
    if (day.words > bestDayWords) bestDayWords = day.words;
  });
  
  // totalWordsNuked would be calculated from session data when nuclear mode tracking is implemented
  
  if (sessionLogs.length > 0) {
    const totalSessionMinutes = sessionLogs.reduce((sum, s) => sum + (s.timeSpent || 0), 0);
    avgSessionLength = totalSessionMinutes / sessionLogs.length;
  }

  event.reply('detailed-stats', {
    allTime: { words: allTimeWords, sessions: allTimeSessions, minutes: allTimeMinutes },
    year: { words: yearWords, sessions: yearSessions, minutes: yearMinutes },
    month: { words: monthWords, sessions: monthSessions, minutes: monthMinutes },
    week: { words: weekWords, sessions: weekSessions, minutes: weekMinutes },
    today: stats.dailyStats?.[today] || { words: 0, sessions: 0, timeSpent: 0 },
    streak: prefs?.currentStreak || 0,
    dailyData: dailyData,
    recentSessions: (stats.sessionLogs || []).slice(-10).reverse(),
    topSessions: topSessions,
    // New statistics
    totalSuccessfulSessions: totalSuccessfulSessions,
    totalRagequits: totalRagequits,
    avgWordsPerSession: avgWordsPerSession,
    avgWordsPerMinute: avgWordsPerMinute,
    totalLongTermGoals: totalLongTermGoals,
    totalAchievements: totalAchievements,
    // Gamification statistics
    totalRewards: stats.totalRewards || 0,
    totalConsequences: stats.totalConsequences || 0,
    totalWordsNuked: totalWordsNuked,
    bestDayWords: bestDayWords,
    avgSessionLength: avgSessionLength,
    // Achievement data
    achievements: achievementData.achievements
  });
});

// Debug message handler
ipcMain.on('debug-message', (event, message) => {
  console.log('EDITOR DEBUG:', message);
});

// Test IPC handler
ipcMain.on('test-ipc', (event, message) => {
  console.log('TEST IPC RECEIVED:', message);
});

// Page visit tracking for achievements
ipcMain.on('page-visited', async (event, page) => {
  try {
    const prefs = store.get('userPreferences', {});
    const pageVisits = prefs.pageVisits || {};
    
    // Track the visit
    pageVisits[page] = true;
    
    // Update preferences
    store.set('userPreferences', {
      ...prefs,
      pageVisits: pageVisits
    });
    
    console.log(`Page visit tracked: ${page}`);
    
    // Check for navigation achievements immediately
    const stats = await loadStats();
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      pageVisit: page
    });
    
  } catch (error) {
    console.error('Error tracking page visit:', error);
  }
});

// Test handler for time-based achievements (for development)
ipcMain.on('test-time-achievements', async (event) => {
  try {
    console.log('Testing time achievements...');
    const stats = await loadStats();
    
    // Add some test time data for testing
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { words: 0, sessions: 0, timeSpent: 0 };
    }
    stats.dailyStats[today].timeSpent += 10; // Add 10 minutes for testing
    
    await saveStats(stats);
    await checkAndUnlockAchievements(stats, {
      date: today,
      time: new Date().toISOString(),
      timeSpent: 10,
      testMode: true
    });
    
  } catch (error) {
    console.error('Error testing time achievements:', error);
  }
});

// Silent Treatment achievement handler
ipcMain.on('silent-treatment-achieved', async (event, data) => {
  try {
    console.log('Silent Treatment triggered:', data);
    const stats = await loadStats();
    
    // Check achievements with silent session data
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      silentSession: data.idleMinutes,
      textLength: data.textLength
    });
    
  } catch (error) {
    console.error('Error handling Silent Treatment:', error);
  }
});

// Test handler for daily achievements (for development)
ipcMain.on('test-daily-achievements', async (event) => {
  try {
    console.log('Testing daily achievements...');
    const stats = await loadStats();
    
    // Add test daily words
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { words: 0, sessions: 0, timeSpent: 0 };
    }
    stats.dailyStats[today].words = 5500; // Set to 5500 words for Blast Off
    
    await saveStats(stats);
    await checkAndUnlockAchievements(stats, {
      date: today,
      time: new Date().toISOString(),
      testMode: true
    });
    
  } catch (error) {
    console.error('Error testing daily achievements:', error);
  }
});

// Test handler for file management achievements (for development)
ipcMain.on('test-file-achievements', async (event) => {
  try {
    console.log('Testing file management achievements...');
    const stats = await loadStats();
    
    // Test Just Getting Started (1 document)
    stats.totalDocuments = 1;
    stats.uniqueDocuments = ['test-doc-1'];
    
    // Test The Dabbler (10 unique documents)
    stats.uniqueDocuments = [
      'test-doc-1', 'test-doc-2', 'test-doc-3', 'test-doc-4', 'test-doc-5',
      'test-doc-6', 'test-doc-7', 'test-doc-8', 'test-doc-9', 'test-doc-10'
    ];
    
    // Test Archive Builder (50+ documents)  
    stats.totalDocuments = 55;
    
    // Test Maybe Next Time (5 consecutive empty documents)
    stats.consecutiveEmptyDocs = 5;
    
    await saveStats(stats);
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      testMode: true
    });
    
  } catch (error) {
    console.error('Error testing file management achievements:', error);
  }
});

// Test handler for comeback achievements (for development)
ipcMain.on('test-comeback-achievements', async (event) => {
  try {
    console.log('Testing comeback achievements...');
    const stats = await loadStats();
    
    // Test Comeback Kid (30+ day drought broken)
    stats.brokenDrought = 35; // 35 days drought broken
    
    // Test Phoenix (streak rebirth)
    stats.streakRebirth = true;
    
    // Test Dabbler (5+ unique projects)
    stats.uniqueProjects = ['project-1', 'project-2', 'project-3', 'project-4', 'project-5', 'project-6'];
    
    await saveStats(stats);
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      testMode: true
    });
    
  } catch (error) {
    console.error('Error testing comeback achievements:', error);
  }
});

// Test handler for Save Scummer achievement (for development)
ipcMain.on('test-save-achievements', async (event) => {
  try {
    console.log('Testing save achievements...');
    const stats = await loadStats();
    
    // Simulate a session with 12 manual saves
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      manualSaves: 12,
      testMode: true
    });
    
  } catch (error) {
    console.error('Error testing save achievements:', error);
  }
});

// Test handler for Procrastinator achievements (for development)
ipcMain.on('test-procrastinator-achievements', async (event) => {
  try {
    console.log('Testing procrastinator achievements...');
    const stats = await loadStats();
    
    // Test Procrastinator's Special (60+ minutes without writing)
    stats.timeWithoutWriting = 75; // 75 minutes without writing
    
    await saveStats(stats);
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      testMode: true
    });
    
  } catch (error) {
    console.error('Error testing procrastinator achievements:', error);
  }
});

// Test handler for Meta and Long-term Goal achievements (for development)
ipcMain.on('test-meta-achievements', async (event) => {
  try {
    console.log('Testing meta and long-term goal achievements...');
    const stats = await loadStats();
    
    // Test Hidden Talent (first hidden achievement)
    stats.firstHiddenAchievement = true;
    
    // Test long-term goal achievements
    stats.longTermGoalCommitted = true;
    stats.missedLongTermDay = true;
    stats.reachedMidpoint = true;
    
    await saveStats(stats);
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      testMode: true
    });
    
  } catch (error) {
    console.error('Error testing meta achievements:', error);
  }
});

// Test handler for remaining session-based achievements (for development)
ipcMain.on('test-session-achievements', async (event) => {
  try {
    console.log('Testing all remaining session-based achievements...');
    const stats = await loadStats();
    
    // Test Mode-based achievements (treating timer/wordcount as reward/punishment for demo)
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      successful: true,
      mode: 'timer', // Treat as 'reward'
      newWords: 100,
      timeSpent: 60
    });
    
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0], 
      time: new Date().toISOString(),
      successful: true,
      mode: 'wordcount', // Treat as 'punishment'
      newWords: 100,
      timeSpent: 60
    });
    
    // Test Speed Writer (500+ words in session)
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      newWords: 525,
      timeSpent: 45
    });
    
    // Test Marathoner (120+ minutes in session)
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      newWords: 200,
      timeSpent: 125
    });
    
    // Test time-specific achievements with different times
    const earlyBirdTime = new Date();
    earlyBirdTime.setHours(7, 30, 0, 0); // 7:30 AM
    
    await checkAndUnlockAchievements(stats, {
      date: earlyBirdTime.toISOString().split('T')[0],
      time: earlyBirdTime.toISOString(),
      sessionStartTime: earlyBirdTime.getTime(),
      newWords: 50,
      timeSpent: 30
    });
    
    // Night Owl (11 PM - 3 AM)
    const nightOwlTime = new Date();
    nightOwlTime.setHours(23, 45, 0, 0); // 11:45 PM
    
    await checkAndUnlockAchievements(stats, {
      date: nightOwlTime.toISOString().split('T')[0],
      time: nightOwlTime.toISOString(),
      sessionStartTime: nightOwlTime.getTime(),
      newWords: 75,
      timeSpent: 45
    });
    
    // Witching Hour (exactly 2:00 AM)
    const witchingTime = new Date();
    witchingTime.setHours(2, 0, 0, 0);
    
    await checkAndUnlockAchievements(stats, {
      date: witchingTime.toISOString().split('T')[0],
      time: witchingTime.toISOString(),
      sessionStartTime: witchingTime.getTime(),
      newWords: 13,
      timeSpent: 20
    });
    
    // Test exact number achievements
    // Millennium (exactly 1000 words)
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      newWords: 1000,
      timeSpent: 90
    });
    
    // Perfectionist (exactly 100 words)
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      newWords: 100,
      timeSpent: 30
    });
    
    // Lucky Thirteen (exactly 13 words)
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      newWords: 13,
      timeSpent: 10
    });
    
    // Ninjas (exactly 8 words)
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      newWords: 8,
      timeSpent: 5
    });
    
    // Centurion (exactly 100 minutes)
    await checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      newWords: 200,
      timeSpent: 100
    });
    
    // Test day-of-week achievements
    // Monday Motivation
    const mondayTime = new Date();
    mondayTime.setDate(mondayTime.getDate() - mondayTime.getDay() + 1); // Set to Monday
    
    await checkAndUnlockAchievements(stats, {
      date: mondayTime.toISOString().split('T')[0],
      time: mondayTime.toISOString(),
      sessionStartTime: mondayTime.getTime(),
      newWords: 50,
      timeSpent: 30
    });
    
    // Hump Day (Wednesday)
    const wednesdayTime = new Date();
    wednesdayTime.setDate(wednesdayTime.getDate() - wednesdayTime.getDay() + 3); // Set to Wednesday
    
    await checkAndUnlockAchievements(stats, {
      date: wednesdayTime.toISOString().split('T')[0],
      time: wednesdayTime.toISOString(),
      sessionStartTime: wednesdayTime.getTime(),
      newWords: 75,
      timeSpent: 45
    });
    
    // Friday Finale
    const fridayTime = new Date();
    fridayTime.setDate(fridayTime.getDate() - fridayTime.getDay() + 5); // Set to Friday
    
    await checkAndUnlockAchievements(stats, {
      date: fridayTime.toISOString().split('T')[0],
      time: fridayTime.toISOString(),
      sessionStartTime: fridayTime.getTime(),
      newWords: 100,
      timeSpent: 60
    });
    
    // Lunch Break (12-1 PM)
    const lunchTime = new Date();
    lunchTime.setHours(12, 30, 0, 0);
    
    await checkAndUnlockAchievements(stats, {
      date: lunchTime.toISOString().split('T')[0],
      time: lunchTime.toISOString(),
      sessionStartTime: lunchTime.getTime(),
      newWords: 100,
      timeSpent: 30
    });
    
  } catch (error) {
    console.error('Error testing session achievements:', error);
  }
});

// In main.js, update the save-all-settings handler:
ipcMain.on('save-all-settings', (event, allSettings) => {
  console.log('Main received save-all-settings:', allSettings);
  console.log('Saving theme:', allSettings.appearanceSettings?.theme);
  
  if (!store) {
    console.error('Store not initialized!');
    return;
  }
  
  try {
    const currentSettings = store.get('userPreferences') || {};
    
    const mergedSettings = {
      ...currentSettings,
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
      longTermGoals: {  // Add this section
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
    
    store.set('userPreferences', mergedSettings);
    console.log('Settings saved successfully to store');
    
    // Broadcast settings update to all windows
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-updated', mergedSettings);
    }
    
    event.reply('settings-saved', true);
  } catch (error) {
    console.error('Error saving settings:', error);
    event.reply('settings-saved', false);
  }
});

// Add this with the other IPC handlers
ipcMain.on('enable-goal-prompting', (event) => {
  const settings = store.get('userPreferences');
  const updatedSettings = {
    ...settings,
    longTermGoals: {
      ...settings.longTermGoals,
      enabled: false,  // Reset to false so modal will show
      disablePrompting: false  // Re-enable prompting
    }
  };
  store.set('userPreferences', updatedSettings);
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
  const settings = store.get('userPreferences');
  const longTermGoals = settings.longTermGoals || {};
  
  console.log('Checking goal setup:', longTermGoals);
  
  if (!longTermGoals.enabled && !longTermGoals.disablePrompting) {
    console.log('Showing goal setup modal');
    event.reply('show-goal-setup');
  }
});

// Set long-term goal
ipcMain.on('set-long-term-goal', (event, goalData) => {
  const settings = store.get('userPreferences');
  
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
  store.set('userPreferences', updatedSettings);
  console.log('Long-term goal set:', newGoalData);
});

// Disable goal prompting
ipcMain.on('disable-goal-prompting', (event) => {
  const settings = store.get('userPreferences');
  const updatedSettings = {
    ...settings,
    longTermGoals: {
      ...settings.longTermGoals,
      disablePrompting: true
    }
    // No longer automatically modify hideTodayProgress
    // The visibility controller will handle auto-hide when no active goal
  };
  store.set('userPreferences', updatedSettings);
  console.log('Goal prompting disabled');
});

// In main.js, add this temporary logging
ipcMain.on('debug-stats', async (event) => {
  const stats = await loadStats();
  console.log('Full stats object:', JSON.stringify(stats, null, 2));
  event.reply('debug-stats-result', stats);
});

// Add this function to check if goal is completed
function checkGoalCompletion(stats, longTermGoals) {
  if (!longTermGoals || !longTermGoals.enabled) return false;
  
  // Check if already celebrated
  if (longTermGoals.completed) return false;
  
  const startDate = new Date(longTermGoals.startDate);
  const today = new Date();
  const daysPassed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
  
  // Calculate total words written since goal started
  // Only count words from sessions that started after the goal was set
  let totalWordsWritten = 0;
  
  if (stats.sessionLogs) {
    stats.sessionLogs.forEach(session => {
      const sessionDate = new Date(session.time);
      if (sessionDate >= startDate) {
        totalWordsWritten += session.newWords || 0;
      }
    });
  }
  
  console.log('Goal completion calculation:', {
    startDate: startDate.toISOString(),
    totalWordsFromSessions: totalWordsWritten,
    wordGoalTarget: longTermGoals.totalWords,
    daysPassed,
    maxDays: longTermGoals.totalDays
  });
  
  // Goal completed ONLY if we hit word target (not time limit)
  // Time limit is just for daily pace calculation, not auto-completion
  const wordGoalMet = totalWordsWritten >= longTermGoals.totalWords;
  
  return wordGoalMet;
}

// Add this IPC handler
ipcMain.on('disable-long-term-goals', (event) => {
  const settings = store.get('userPreferences');
  const updatedSettings = {
    ...settings,
    longTermGoals: {
      enabled: false,
      disablePrompting: true
    }
    // No longer automatically modify hideTodayProgress
    // The visibility controller will handle auto-hide when no active goal
  };
  store.set('userPreferences', updatedSettings);
  console.log('Long-term goals disabled after completion');
});

// Reset long-term goal handler
ipcMain.on('reset-long-term-goal', async (event) => {
  try {
    const settings = store.get('userPreferences');
    
    // Reset long-term goals to default state
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
      }
      // No longer automatically modify hideTodayProgress
      // The visibility controller will handle auto-hide when no active goal
    };
    
    // Also clear goal-related stats data
    const stats = await loadStats();
    
    // Find when the current goal started
    const currentGoal = settings.longTermGoals;
    if (currentGoal && currentGoal.startDate) {
      const goalStartDate = new Date(currentGoal.startDate);
      
      // Remove daily stats entries from goal start date onwards
      // This preserves pre-goal writing data
      Object.keys(stats.dailyStats || {}).forEach(dateStr => {
        const statsDate = new Date(dateStr);
        if (statsDate >= goalStartDate) {
          // Reset the words for this day to 0 but keep sessions and timeSpent
          // This way we preserve that writing happened but reset word count progress
          if (stats.dailyStats[dateStr]) {
            stats.dailyStats[dateStr].words = 0;
          }
        }
      });
      
      // Remove session logs from goal start date onwards
      if (stats.sessionLogs) {
        stats.sessionLogs = stats.sessionLogs.filter(session => {
          const sessionDate = new Date(session.time);
          return sessionDate < goalStartDate;
        });
      }
      
      await saveStats(stats);
      console.log('Goal-related stats data cleared from', goalStartDate.toISOString());
    }
    
    store.set('userPreferences', updatedSettings);
    console.log('Long-term goal reset successfully');
    
    event.reply('goal-reset-complete');
  } catch (error) {
    console.error('Error resetting long-term goal:', error);
    event.reply('goal-reset-error', error.message);
  }
});

// Check for consecutive weekend writing (Saturday -> Sunday)
function checkConsecutiveWeekend(sessionLogs) {
  if (!sessionLogs || sessionLogs.length === 0) return false;
  
  // Get sessions from the last 7 days
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentSessions = sessionLogs.filter(session => {
    const sessionDate = new Date(session.time || session.date);
    return sessionDate >= weekAgo;
  });
  
  // Group sessions by date
  const sessionsByDate = {};
  recentSessions.forEach(session => {
    const date = new Date(session.time || session.date);
    const dateStr = date.toISOString().split('T')[0];
    if (!sessionsByDate[dateStr]) {
      sessionsByDate[dateStr] = [];
    }
    sessionsByDate[dateStr].push(session);
  });
  
  // Check for consecutive Saturday -> Sunday writing
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    // If this is a Sunday (day 0) and we have sessions
    if (date.getDay() === 0 && sessionsByDate[dateStr]) {
      // Check if we also have sessions on the previous Saturday (day 6)
      const saturday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
      const saturdayStr = saturday.toISOString().split('T')[0];
      
      if (sessionsByDate[saturdayStr]) {
        return true;
      }
    }
  }
  
  return false;
}

// Get current day's total words for daily achievements
function getCurrentDayWords(stats) {
  const today = new Date().toISOString().split('T')[0];
  return stats.dailyStats?.[today]?.words || 0;
}

// Achievement System Functions
async function checkAndUnlockAchievements(stats, currentSession) {
  try {
    // Check if achievements are disabled in settings
    const currentSettings = store.get('settings');
    if (currentSettings?.gamificationSettings?.disableAchievements) {
      return; // Exit early if achievements are disabled
    }
    
    const prefs = store.get('userPreferences');
    const unlockedAchievements = prefs.unlockedAchievements || [];
    
    // Calculate current stats for achievement conditions
    const achievementStats = {
      totalWords: Object.values(stats.dailyStats || {}).reduce((sum, day) => sum + (day.words || 0), 0),
      totalSessions: Object.values(stats.dailyStats || {}).reduce((sum, day) => sum + (day.sessions || 0), 0),
      totalMinutes: Object.values(stats.dailyStats || {}).reduce((sum, day) => sum + (day.timeSpent || 0), 0),
      currentStreak: prefs.currentStreak || 0,
      totalSuccessfulSessions: (stats.sessionLogs || []).filter(s => s.successful).length,
      totalRagequits: (stats.sessionLogs || []).filter(s => s.ragequit).length,
      totalLongTermGoals: prefs.longTermGoalsCompleted || 0,
      // Page visit tracking for navigation achievements
      visitedAbout: (prefs.pageVisits?.about) === true,
      visitedStats: (prefs.pageVisits?.stats) === true,
      visitedFiles: (prefs.pageVisits?.files) === true,
      visitedSettings: (prefs.pageVisits?.settings) === true,
      // Weekend warrior tracking
      consecutiveWeekend: checkConsecutiveWeekend(stats.sessionLogs || []),
      // Silent session tracking (from current session if available)
      silentSession: currentSession?.silentSession || 0,
      // Daily word count for Blast Off achievement
      dailyWords: getCurrentDayWords(stats),
      // Document tracking for file management achievements
      totalDocuments: stats.totalDocuments || 0,
      uniqueDocuments: (stats.uniqueDocuments || []).length,
      consecutiveEmptyDocs: stats.consecutiveEmptyDocs || 0,
      // Drought tracking for Comeback Kid achievement
      brokenDrought: stats.brokenDrought || 0,
      // Streak rebirth tracking for Phoenix achievement
      streakRebirth: stats.streakRebirth || false,
      // Project diversity tracking for Dabbler achievement
      uniqueProjects: (stats.uniqueProjects || []).length,
      // Time without writing tracking for Procrastinator's Special
      timeWithoutWriting: stats.timeWithoutWriting || 0,
      // Hidden achievement tracking for Hidden Talent meta achievement
      firstHiddenAchievement: stats.firstHiddenAchievement || false,
      // Meta achievement counters for Overachiever and Completionist
      totalAchievements: unlockedAchievements.length,
      unlockedNonHidden: unlockedAchievements.filter(id => {
        const achievement = achievementSystem.getAllAchievements()[id];
        return achievement && !achievement.hidden;
      }).length,
      totalNonHidden: Object.values(achievementSystem.getAllAchievements()).filter(a => !a.hidden).length,
      totalPossible: Object.keys(achievementSystem.getAllAchievements()).length,
      // Long-term goal progress tracking
      longTermGoalCommitted: stats.longTermGoalCommitted || false,
      missedLongTermDay: stats.missedLongTermDay || false,
      reachedMidpoint: stats.reachedMidpoint || false
    };
    
    console.log('Achievement Stats:', achievementStats);
    console.log('Page Visits:', prefs.pageVisits);
    console.log('Total minutes for time achievements:', achievementStats.totalMinutes);
    
    // Check for new achievements
    const newAchievements = achievementSystem.checkAchievements(achievementStats, currentSession, unlockedAchievements);
    
    if (newAchievements.length > 0) {
      console.log('New achievements unlocked:', newAchievements.map(a => a.name));
      
      // Check if any hidden achievements were unlocked for Hidden Talent meta achievement
      const hiddenAchievementsUnlocked = newAchievements.filter(a => a.hidden);
      if (hiddenAchievementsUnlocked.length > 0 && !stats.firstHiddenAchievement) {
        console.log('First hidden achievement unlocked! Triggering Hidden Talent meta achievement');
        stats.firstHiddenAchievement = true;
        await saveStats(stats);
        
        // Re-check achievements to potentially unlock Hidden Talent
        setTimeout(async () => {
          await checkAndUnlockAchievements(await loadStats(), currentSession);
        }, 100);
      }
      
      // Update stored achievements
      const updatedAchievements = [...unlockedAchievements, ...newAchievements];
      store.set('userPreferences', {
        ...prefs,
        unlockedAchievements: updatedAchievements
      });
      
      // Send achievement notifications to renderer if window exists
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('achievements-unlocked', newAchievements);
      }
    }
    
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
}

// Get achievement data for statistics
function getAchievementData() {
  try {
    // Check if achievements are disabled in settings
    const currentSettings = store.get('settings');
    if (currentSettings?.gamificationSettings?.disableAchievements) {
      return {
        totalUnlocked: 0,
        totalPossible: 0,
        achievements: { unlocked: [], locked: [] }
      };
    }
    
    const prefs = store.get('userPreferences');
    const unlockedAchievements = prefs.unlockedAchievements || [];
    
    return {
      totalUnlocked: achievementSystem.getTotalUnlocked(unlockedAchievements),
      totalPossible: achievementSystem.getTotalPossible(),
      achievements: achievementSystem.getAchievementsByStatus(unlockedAchievements)
    };
  } catch (error) {
    console.error('Error getting achievement data:', error);
    return {
      totalUnlocked: 0,
      totalPossible: 0,
      achievements: { unlocked: [], locked: [] }
    };
  }
}

// Session completion handler - handles session data and statistics tracking
ipcMain.on('session-completed', async (event, data) => {
  console.log('*** SESSION COMPLETED HANDLER CALLED ***');
  console.log('Session data received:', data);
  
  try {
    const stats = await loadStats();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Calculate new words written this session
    const newWordsWritten = Math.max(0, (data.totalWords || 0) - sessionStartWords);
    
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
    const streak = calculateStreak(stats.dailyStats);
    const prefs = store.get('userPreferences');
    store.set('userPreferences', { ...prefs, currentStreak: streak });
    
    // Save stats
    await saveStats(stats);
    
    // Check for achievements
    await checkAndUnlockAchievements(stats, {
      date: today,
      time: now.toISOString(),
      newWords: newWordsWritten,
      totalWords: data.totalWords,
      timeSpent: data.timeSpent || 0,
      mode: data.mode,
      successful: data.successful || false,
      ragequit: data.ragequit || false,
      sessionStartTime: data.sessionStartTime
    });
    
    console.log('Session successfully processed - New words:', newWordsWritten);
    
  } catch (error) {
    console.error('Error saving session completion:', error);
  }
});