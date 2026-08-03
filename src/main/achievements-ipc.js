// achievements-ipc.js — achievement unlock checks and queue IPC
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')
const state = require('./state')
const statsMod = require('./stats')


// IPC handler to get queued achievements for homepage
ipcMain.on('get-queued-achievements', (event) => {
  // Peek only. The queue is cleared by 'queued-achievements-shown' once the
  // renderer confirms it actually displayed them — otherwise achievements are
  // lost whenever the page can't show them (notifier not ready yet, or the
  // user navigates away mid-display).
  const queuedAchievements = peekQueuedAchievements();
  event.reply('queued-achievements', queuedAchievements);
});

// Renderer confirms which achievements it actually displayed.
ipcMain.on('queued-achievements-shown', (event, shownIds) => {
  clearShownAchievements(shownIds);
});


// Test handler for time-based achievements (for development)
ipcMain.on('test-time-achievements', async (event) => {
  try {
    console.log('Testing time achievements...');
    const stats = await statsMod.loadStats();
    
    // Add some test time data for testing
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { words: 0, sessions: 0, timeSpent: 0 };
    }
    stats.dailyStats[today].timeSpent += 10; // Add 10 minutes for testing
    
    await statsMod.saveStats(stats);
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
    const stats = await statsMod.loadStats();
    
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
    const stats = await statsMod.loadStats();
    
    // Add test daily words
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { words: 0, sessions: 0, timeSpent: 0 };
    }
    stats.dailyStats[today].words = 5500; // Set to 5500 words for Blast Off
    
    await statsMod.saveStats(stats);
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
    const stats = await statsMod.loadStats();
    
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
    
    await statsMod.saveStats(stats);
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
    const stats = await statsMod.loadStats();
    
    // Test Comeback Kid (30+ day drought broken)
    stats.brokenDrought = 35; // 35 days drought broken
    
    // Test Phoenix (streak rebirth)
    stats.streakRebirth = true;
    
    // Test Dabbler (5+ unique projects)
    stats.uniqueProjects = ['project-1', 'project-2', 'project-3', 'project-4', 'project-5', 'project-6'];
    
    await statsMod.saveStats(stats);
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
    const stats = await statsMod.loadStats();
    
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
    const stats = await statsMod.loadStats();
    
    // Test Procrastinator's Special (60+ minutes without writing)
    stats.timeWithoutWriting = 75; // 75 minutes without writing
    
    await statsMod.saveStats(stats);
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
    const stats = await statsMod.loadStats();
    
    // Test Hidden Talent (first hidden achievement)
    stats.firstHiddenAchievement = true;
    
    // Test long-term goal achievements
    stats.longTermGoalCommitted = true;
    stats.missedLongTermDay = true;
    stats.reachedMidpoint = true;
    
    await statsMod.saveStats(stats);
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
    const stats = await statsMod.loadStats();
    
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


// Achievement System Functions
async function checkAndUnlockAchievements(stats, currentSession) {
  try {
    // Check if achievements are disabled in settings
    const currentSettings = state.store.get('settings');
    if (currentSettings?.gamificationSettings?.disableAchievements) {
      return; // Exit early if achievements are disabled
    }
    
    const prefs = state.store.get('userPreferences');
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
      // Project diversity tracking for Dabbler achievement. Distinct
      // documents count as distinct projects.
      uniqueProjects: (stats.uniqueDocuments || []).length,
      // Time without writing tracking for Procrastinator's Special
      timeWithoutWriting: stats.timeWithoutWriting || 0,
      // Hidden achievement tracking for Hidden Talent meta achievement
      firstHiddenAchievement: stats.firstHiddenAchievement || false,
      // Meta achievement counters for Overachiever and Completionist
      totalAchievements: unlockedAchievements.length,
      // getAllAchievements() returns an array and unlockedAchievements holds
      // objects, so this has to match on id rather than index by key.
      unlockedNonHidden: (() => {
        const byId = new Map(
          state.achievementSystem.getAllAchievements().map(a => [a.id, a])
        );
        return unlockedAchievements.filter(entry => {
          const achievement = byId.get(entry && entry.id ? entry.id : entry);
          return achievement && !achievement.hidden;
        }).length;
      })(),
      totalNonHidden: Object.values(state.achievementSystem.getAllAchievements()).filter(a => !a.hidden).length,
      totalPossible: Object.keys(state.achievementSystem.getAllAchievements()).length,
      // Long-term goal progress tracking
      longTermGoalCommitted: stats.longTermGoalCommitted || false,
      missedLongTermDay: stats.missedLongTermDay || false,
      reachedMidpoint: stats.reachedMidpoint || false,
      // Tutorial completion tracking for Tutorial Graduate achievement
      completedTutorial: stats.completedTutorial || false
    };
    
    console.log('Achievement Stats:', achievementStats);
    console.log('Page Visits:', prefs.pageVisits);
    console.log('Total minutes for time achievements:', achievementStats.totalMinutes);
    
    // Check for new achievements
    const newAchievements = state.achievementSystem.checkAchievements(achievementStats, currentSession, unlockedAchievements);
    
    if (newAchievements.length > 0) {
      console.log('New achievements unlocked:', newAchievements.map(a => a.name));
      
      // Check if any hidden achievements were unlocked for Hidden Talent meta achievement
      const hiddenAchievementsUnlocked = newAchievements.filter(a => a.hidden);
      if (hiddenAchievementsUnlocked.length > 0 && !stats.firstHiddenAchievement) {
        console.log('First hidden achievement unlocked! Triggering Hidden Talent meta achievement');
        stats.firstHiddenAchievement = true;
        await statsMod.saveStats(stats);
        
        // Re-check achievements to potentially unlock Hidden Talent
        setTimeout(async () => {
          await checkAndUnlockAchievements(await statsMod.loadStats(), currentSession);
        }, 100);
      }
      
      // Update stored achievements
      const updatedAchievements = [...unlockedAchievements, ...newAchievements];
      state.store.set('userPreferences', {
        ...prefs,
        unlockedAchievements: updatedAchievements
      });
      
      // Handle achievement notifications
      if (currentSession?.queueForHomepage) {
        // Queue achievements to be shown on homepage instead of immediately
        console.log('Queueing achievements for homepage display:', newAchievements);
        queueAchievementsForHomepage(newAchievements);
      } else {
        // Send achievement notifications immediately (for tutorial, navigation, etc.)
        console.log('Sending achievements immediately:', newAchievements);
        if (state.mainWindow && !state.mainWindow.isDestroyed()) {
          state.mainWindow.webContents.send('achievements-unlocked', newAchievements);
        } else {
          console.warn('Main window not available to send achievements');
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
}

// --- Recovered helpers (restored during modularization) ---

// Get current day's total words for daily achievements
function getCurrentDayWords(stats) {
  const today = new Date().toISOString().split('T')[0];
  return stats.dailyStats?.[today]?.words || 0;
}

// Queue achievements to be shown on homepage after session completion
function queueAchievementsForHomepage(achievements) {
  try {
    const prefs = state.store.get('userPreferences', {});
    if (!prefs.queuedAchievements) {
      prefs.queuedAchievements = [];
    }
    
    // Add new achievements to the queue
    prefs.queuedAchievements.push(...achievements);
    
    state.store.set('userPreferences', prefs);
    console.log('Achievements queued for homepage:', achievements.length, 'total queued:', prefs.queuedAchievements.length);
  } catch (error) {
    console.error('Error queueing achievements:', error);
  }
}

// Read the queue without clearing it.
function peekQueuedAchievements() {
  try {
    return state.store.get('userPreferences', {}).queuedAchievements || [];
  } catch (error) {
    console.error('Error retrieving queued achievements:', error);
    return [];
  }
}

// Remove specific achievements from the queue once the renderer has shown
// them. Matching by id means anything unshown stays queued for next time.
function clearShownAchievements(shownIds) {
  try {
    const prefs = state.store.get('userPreferences', {});
    const queued = prefs.queuedAchievements || [];
    if (!queued.length) return;

    const shown = new Set(shownIds || []);
    prefs.queuedAchievements = queued.filter(a => !shown.has(a && a.id));
    state.store.set('userPreferences', prefs);
    console.log('Cleared', queued.length - prefs.queuedAchievements.length,
      'shown achievements;', prefs.queuedAchievements.length, 'still queued');
  } catch (error) {
    console.error('Error clearing shown achievements:', error);
  }
}

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

module.exports = { checkAndUnlockAchievements }
