// documents.js — document folder, file CRUD, and save IPC
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')
const state = require('./state')
const { loadStats, saveStats } = require('./stats')
const exporter = require('./export')


// Folder selection
ipcMain.on('select-folder', async (event) => {
  const result = await dialog.showOpenDialog(state.mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Your Writing Folder'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const currentSettings = state.store.get('userPreferences');
    state.store.set('userPreferences', { ...currentSettings, documentsFolder: folderPath });
    event.reply('folder-selected', folderPath);
  }
});


// Check folder
ipcMain.on('check-folder', async (event) => {
  const settings = state.store.get('userPreferences');
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
  
  const userPrefs = state.store.get('userPreferences');
  const folderPath = userPrefs ? userPrefs.documentsFolder : null;
  
  if (!folderPath) {
    event.reply('needs-folder-setup');
    return;
  }
  
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `cadence-${timestamp}.rtf`;
  state.currentFilePath = path.join(folderPath, filename);
  
  const rtfHeader = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ';
  const rtfFooter = '}';
  const initialContent = rtfHeader + rtfFooter;
  
  try {
    await fs.writeFile(state.currentFilePath, initialContent);
    state.isNewFile = true;
    
    // Track document creation for achievements
    const stats = await loadStats();
    stats.totalDocuments = (stats.totalDocuments || 0) + 1;
    stats.consecutiveEmptyDocs = (stats.consecutiveEmptyDocs || 0) + 1;  // Start counting empty docs
    
    // Add to unique documents list if not already present
    const documentName = path.basename(state.currentFilePath, path.extname(state.currentFilePath));
    if (!stats.uniqueDocuments) {
      stats.uniqueDocuments = [];
    }
    if (!stats.uniqueDocuments.includes(documentName)) {
      stats.uniqueDocuments.push(documentName);
    }
    
    await saveStats(stats);
    console.log('Document created. Total documents:', stats.totalDocuments);
    console.log('Unique documents:', stats.uniqueDocuments.length);
    
    const currentSettings = state.store.get('userPreferences');
    state.store.set('userPreferences', { ...currentSettings, lastOpenedFile: state.currentFilePath });
    console.log('Saved as recent file:', state.currentFilePath);
    
    state.currentSessionSettings = settings;
    state.mainWindow.loadFile('editor.html');
  } catch (error) {
    console.error('Error creating file:', error);
    event.reply('file-error', 'Could not create file');
  }
});


// Browse document
ipcMain.on('browse-document', async (event, settings) => {
  const userPrefs = state.store.get('userPreferences');
  const folderPath = userPrefs ? userPrefs.documentsFolder : null;
  
  const result = await dialog.showOpenDialog(state.mainWindow, {
    defaultPath: folderPath,
    filters: [
      { name: 'Rich Text Files', extensions: ['rtf'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    state.currentFilePath = result.filePaths[0];
    state.isNewFile = false;
    
    // Track document opening for achievements
    const stats = await loadStats();
    const documentName = path.basename(state.currentFilePath, path.extname(state.currentFilePath));
    
    // Add to unique documents list if not already present
    if (!stats.uniqueDocuments) {
      stats.uniqueDocuments = [];
    }
    if (!stats.uniqueDocuments.includes(documentName)) {
      stats.uniqueDocuments.push(documentName);
    }
    
    await saveStats(stats);
    console.log('Document opened. Unique documents:', stats.uniqueDocuments.length);
    
    const currentSettings = state.store.get('userPreferences');
    state.store.set('userPreferences', { ...currentSettings, lastOpenedFile: state.currentFilePath });
    console.log('Saved as recent file:', state.currentFilePath);
    
    state.currentSessionSettings = settings;
    state.mainWindow.loadFile('editor.html');
  }
});


// Open recent document
ipcMain.on('open-recent-document', async (event, settings) => {
  const userPrefs = state.store.get('userPreferences');
  const recentFile = userPrefs ? userPrefs.lastOpenedFile : null;
  
  console.log('Trying to open recent file:', recentFile);
  
  if (!recentFile) {
    event.reply('no-recent-file');
    return;
  }
  
  try {
    await fs.access(recentFile);
    state.currentFilePath = recentFile;
    state.isNewFile = false;
    state.currentSessionSettings = settings;
    
    // Track document opening for achievements
    const stats = await loadStats();
    const documentName = path.basename(state.currentFilePath, path.extname(state.currentFilePath));
    
    // Add to unique documents list if not already present
    if (!stats.uniqueDocuments) {
      stats.uniqueDocuments = [];
    }
    if (!stats.uniqueDocuments.includes(documentName)) {
      stats.uniqueDocuments.push(documentName);
    }
    
    await saveStats(stats);
    console.log('Recent document opened. Unique documents:', stats.uniqueDocuments.length);
    
    console.log('Opening recent file:', state.currentFilePath);
    state.mainWindow.loadFile('editor.html');
  } catch (error) {
    console.error('Recent file not found:', error);
    event.reply('recent-file-not-found', recentFile);
    
    const currentSettings = state.store.get('userPreferences');
    state.store.set('userPreferences', { ...currentSettings, lastOpenedFile: null });
  }
});


ipcMain.on('get-current-file', async (event) => {
  if (!state.currentFilePath) {
    event.reply('current-file-info', null);
    return;
  }
  
  try {
    const content = await fs.readFile(state.currentFilePath, 'utf8');
    
    // Try to parse as JSON first (new format)
    try {
      const fileData = JSON.parse(content);
      event.reply('current-file-info', {
        path: state.currentFilePath,
        name: path.basename(state.currentFilePath),
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
        path: state.currentFilePath,
        name: path.basename(state.currentFilePath),
        content: { ops: [{ insert: text }] }  // Convert to basic Delta
      });
    }
  } catch (error) {
    console.error('Error reading file:', error);
    event.reply('current-file-info', null);
  }
});


ipcMain.on('manual-save', async (event, data) => {
  // Handle manual saves (same as auto-save but tracked separately)
  console.log('Manual save triggered, count:', data.manualSaveCount);
  
  // Proceed with normal save logic
  if (!state.currentFilePath) {
    console.error('No current file path for manual save');
    return;
  }
  
  try {
    const fileData = {
      content: data.content,
      wordCount: data.wordCount,
      lastModified: new Date().toISOString()
    };
    
    await fs.writeFile(state.currentFilePath, JSON.stringify(fileData, null, 2));
    console.log('Manual save completed for:', state.currentFilePath);
  } catch (error) {
    console.error('Error during manual save:', error);
  }
});


ipcMain.on('auto-save', async (event, data) => {
  if (!state.currentFilePath) return;
  
  try {
    if (data.text && data.text.trim().length > 0) {
      state.isNewFile = false;
    }
    
    // Save as JSON with .rtf extension to preserve formatting
    const fileData = {
      quillContent: data.content,  // Full Quill Delta
      plainText: data.text,
      wordCount: data.wordCount,
      lastModified: new Date().toISOString()
    };
    
    await fs.writeFile(state.currentFilePath, JSON.stringify(fileData, null, 2));
    
    const stats = state.store.get('userPreferences');
    const newStats = {
      ...stats,
      totalWordsWritten: Math.max(stats.totalWordsWritten || 0, data.wordCount),
      lastOpenedFile: state.currentFilePath
    };
    state.store.set('userPreferences', newStats);
    
    console.log('Auto-saved:', data.wordCount, 'words to', state.currentFilePath);
  } catch (error) {
    console.error('Error saving file:', error);
  }
});


// Exit to home
ipcMain.on('exit-to-home', async (event) => {
  if (state.isNewFile && state.currentFilePath) {
    try {
      const content = await fs.readFile(state.currentFilePath, 'utf8');
      const textMatch = content.match(/\{\\rtf1.*?\\f0\\fs24\s*(.*?)\}$/);
      const hasContent = textMatch && textMatch[1] && textMatch[1].trim().length > 0;
      
      if (!hasContent) {
        await fs.unlink(state.currentFilePath);
        console.log('Deleted empty file:', state.currentFilePath);
        
        const settings = state.store.get('userPreferences');
        if (settings.lastOpenedFile === state.currentFilePath) {
          state.store.set('userPreferences', { ...settings, lastOpenedFile: null });
        }
      }
    } catch (error) {
      console.error('Error checking/deleting file:', error);
    }
  }
  
  state.currentFilePath = null;
  state.currentSessionSettings = null;
  state.isNewFile = false;
  state.mainWindow.loadFile('index.html');
});


// Get all files in the documents folder
ipcMain.on('get-all-files', async (event) => {
  const prefs = state.store.get('userPreferences');
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
    const prefs = state.store.get('userPreferences');
    if (prefs.lastOpenedFile === oldPath) {
      state.store.set('userPreferences', { ...prefs, lastOpenedFile: newPath });
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
  state.currentFilePath = filePath;
  state.isNewFile = false;
  
  // Set to freewrite mode (no limits)
  state.currentSessionSettings = {
    mode: 'freewrite',
    goal: 0  // No goal for freewrite
  };
  
  state.mainWindow.loadFile('editor.html');
});

// --- Export ------------------------------------------------------------------
// Converts a stored document to Word, HTML, or Markdown via a save dialog.

const EXPORT_FORMATS = {
  docx: { ext: 'docx', label: 'Word Document' },
  html: { ext: 'html', label: 'HTML Page' },
  md: { ext: 'md', label: 'Markdown' }
}

ipcMain.on('export-file', async (event, filePath, format) => {
  const spec = EXPORT_FORMATS[format]
  if (!spec) {
    event.reply('export-complete', { success: false, error: 'Unknown export format.' })
    return
  }

  try {
    const raw = await fs.readFile(filePath, 'utf8')
    let delta
    let title = path.basename(filePath, path.extname(filePath))

    try {
      const parsed = JSON.parse(raw)
      delta = parsed.quillContent
      // Older/plain files may only have text.
      if (!delta) delta = exporter.textToDelta(parsed.plainText || '')
    } catch (parseError) {
      // Not one of our JSON documents — treat the whole file as plain text.
      delta = exporter.textToDelta(raw)
    }

    const { canceled, filePath: target } = await dialog.showSaveDialog(state.mainWindow, {
      title: `Export as ${spec.label}`,
      defaultPath: `${title}.${spec.ext}`,
      filters: [{ name: spec.label, extensions: [spec.ext] }]
    })
    if (canceled || !target) {
      event.reply('export-complete', { success: false, canceled: true })
      return
    }

    if (format === 'docx') {
      await fs.writeFile(target, await exporter.toDocxBuffer(delta, title))
    } else if (format === 'html') {
      await fs.writeFile(target, exporter.toHtml(delta, title), 'utf8')
    } else {
      await fs.writeFile(target, exporter.toMarkdown(delta, title), 'utf8')
    }

    console.log('Exported', filePath, '->', target)
    event.reply('export-complete', { success: true, path: target, format })
  } catch (error) {
    console.error('Export failed:', error)
    event.reply('export-complete', { success: false, error: error.message })
  }
})


// --- Import ------------------------------------------------------------------
// Creates a document from pasted text. The words are stored as the document's
// existing content, so when a session opens the file the editor reports them as
// the starting word count — meaning they are never counted as words written.

ipcMain.on('import-text', async (event, payload) => {
  const prefs = state.store.get('userPreferences')
  const folderPath = prefs ? prefs.documentsFolder : null

  if (!folderPath) {
    event.reply('import-complete', { success: false, error: 'Set a documents folder first.' })
    return
  }

  const text = (payload && payload.text) || ''
  if (!text.trim()) {
    event.reply('import-complete', { success: false, error: 'Nothing to import.' })
    return
  }

  try {
    const requested = ((payload && payload.name) || '').trim()
    const safeName = requested
      ? requested.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)
      : `imported-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`

    let target = path.join(folderPath, `${safeName}.rtf`)
    let suffix = 2
    // Don't silently overwrite an existing document.
    while (true) {
      try {
        await fs.access(target)
        target = path.join(folderPath, `${safeName} (${suffix++}).rtf`)
      } catch {
        break
      }
    }

    const wordCount = exporter.countWords(text)
    const fileData = {
      quillContent: exporter.textToDelta(text),
      plainText: text,
      wordCount,
      imported: true,
      importedWords: wordCount,
      lastModified: new Date().toISOString()
    }
    await fs.writeFile(target, JSON.stringify(fileData, null, 2))

    // Count the document itself, but never the words.
    const stats = await loadStats()
    stats.totalDocuments = (stats.totalDocuments || 0) + 1
    const documentName = path.basename(target, path.extname(target))
    if (!stats.uniqueDocuments) stats.uniqueDocuments = []
    if (!stats.uniqueDocuments.includes(documentName)) {
      stats.uniqueDocuments.push(documentName)
    }
    await saveStats(stats)

    console.log('Imported', wordCount, 'words to', target, '(excluded from word counts)')
    event.reply('import-complete', {
      success: true, path: target, name: path.basename(target), wordCount
    })
  } catch (error) {
    console.error('Import failed:', error)
    event.reply('import-complete', { success: false, error: error.message })
  }
})

module.exports = {}
