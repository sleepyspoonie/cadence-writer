const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')  // Add shell here
const fs = require('fs').promises
const path = require('path')

let mainWindow
let store
let currentSessionSettings = null
let currentFilePath = null
let isNewFile = false
let sessionStartWords = 0

function createWindow () {
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
 
  mainWindow.on('close', () => {
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

// Replace the session-completed handler  
ipcMain.on('session-completed', async (event, data) => {
  console.log('SESSION COMPLETED - Raw data:', {
    totalWords: data.totalWords,
    sessionStartWords: sessionStartWords,
    mode: data.mode,
    timeSpent: data.timeSpent
  });
  
  // Calculate NEW words written (not total words in document)
  const newWordsWritten = Math.max(0, data.totalWords - sessionStartWords);
  
  console.log('Calculated new words:', newWordsWritten);
  
  // Only proceed if there are actually new words or meaningful time spent
  if (newWordsWritten === 0 && (data.timeSpent || 0) < 1) {
    console.log('Skipping session - no new words and minimal time');
    return;
  }
  
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const stats = await loadStats();
  
  if (!stats.dailyStats[today]) {
    stats.dailyStats[today] = { 
      words: 0, 
      sessions: 0,
      timeSpent: 0
    };
  }
  
  stats.dailyStats[today].words += newWordsWritten;  // Only add NEW words
  stats.dailyStats[today].sessions += 1;
  stats.dailyStats[today].timeSpent += (data.timeSpent || 0);
  
  stats.sessionLogs.push({
    date: today,
    time: now.toISOString(),
    newWords: newWordsWritten,  // Only NEW words
    totalWords: data.totalWords,
    duration: data.duration || 0,
    timeSpent: data.timeSpent || 0,
    mode: data.mode,
    filename: currentFilePath ? path.basename(currentFilePath) : 'unknown'
  });
  
  if (stats.sessionLogs.length > 500) {
    stats.sessionLogs.shift();
  }
  
  await saveStats(stats);
  
  const streak = calculateStreak(stats.dailyStats);
  let prefs = store.get('userPreferences');
  store.set('userPreferences', { ...prefs, currentStreak: streak });
  
  // Check for goal completion after session
  if (prefs.longTermGoals && prefs.longTermGoals.enabled && !prefs.longTermGoals.completed) {
    const goalCompleted = checkGoalCompletion(stats, prefs.longTermGoals);
    
    if (goalCompleted) {
      console.log('Goal completed after session! Marking as completed...');
      const updatedPrefs = {
        ...prefs,
        longTermGoals: {
          ...prefs.longTermGoals,
          completed: true,
          completedDate: new Date().toISOString()
        }
      };
      store.set('userPreferences', updatedPrefs);
      
      // Send notification to homepage that goal was completed
      if (mainWindow) {
        mainWindow.webContents.send('goal-completed');
      }
    }
  }
  
  console.log('Session saved - New words added to stats:', newWordsWritten);
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
        }
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
        
        // Extract text from RTF for word count
        let wordCount = 0;
        if (file.endsWith('.rtf')) {
          const textMatch = content.match(/\{\\rtf1.*?\\f0\\fs24\s*(.*?)\}$/);
          if (textMatch && textMatch[1]) {
            const text = textMatch[1].replace(/\\par\s/g, ' ').replace(/\\/g, '');
            wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
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
  const stats = await loadStats();
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
  
  console.log('Sending detailed stats with', dailyData.length, 'days of data');
  
  event.reply('detailed-stats', {
    allTime: { words: allTimeWords, sessions: allTimeSessions, minutes: allTimeMinutes },
    year: { words: yearWords, sessions: yearSessions, minutes: yearMinutes },
    month: { words: monthWords, sessions: monthSessions, minutes: monthMinutes },
    week: { words: weekWords, sessions: weekSessions, minutes: weekMinutes },
    today: stats.dailyStats?.[today] || { words: 0, sessions: 0, timeSpent: 0 },
    streak: prefs?.currentStreak || 0,
    dailyData: dailyData,
    recentSessions: (stats.sessionLogs || []).slice(-10).reverse(),
    topSessions: topSessions
  });
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