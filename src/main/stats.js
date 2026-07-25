// stats.js — stats persistence, streaks, and stats-page IPC
// Extracted from main.js during the v1.1 modularization.
'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')
const state = require('./state')
const achievementsIpc = require('./achievements-ipc')


// Update stats
ipcMain.on('update-stats', (event, stats) => {
  if (state.store) {
    const current = state.store.get('userPreferences')
    state.store.set('userPreferences', { ...current, ...stats })
  }
})


async function loadStats() {
  try {
    const data = await fs.readFile(state.statsPath, 'utf8');
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
    await fs.writeFile(state.statsPath, JSON.stringify(stats, null, 2));
    console.log('Stats saved');
    return true;
  } catch (error) {
    console.error('Error saving stats:', error);
    return false;
  }
}


function calculateStreak(dailyStats, userPreferences = {}) {
  const dates = Object.keys(dailyStats).sort().reverse();
  if (dates.length === 0) return 0;
  
  // Get daily goal settings
  const dailyGoals = userPreferences.dailyGoals || {};
  const streakPreservation = dailyGoals.streakPreservation || 'any';
  
  // Calculate daily word target based on goal type
  let dailyWordTarget = 500; // Default
  if (dailyGoals.type === 'indefinite') {
    dailyWordTarget = dailyGoals.dailyWordTarget || 500;
  } else if (dailyGoals.type === 'longterm') {
    dailyWordTarget = Math.ceil(dailyGoals.longtermTotalWords / dailyGoals.longtermTotalDays);
  }
  
  console.log('Streak calculation:', {
    streakPreservation,
    dailyWordTarget,
    goalType: dailyGoals.type
  });
  
  // Function to check if a day qualifies for streak
  function dayQualifiesForStreak(dayStats) {
    if (!dayStats || dayStats.words === 0) return false;
    
    if (streakPreservation === 'goal') {
      // Must meet daily goal to count for streak
      return dayStats.words >= dailyWordTarget;
    } else {
      // Any writing counts for streak
      return dayStats.words > 0;
    }
  }
  
  let streak = 0;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (dayQualifiesForStreak(dailyStats[today])) {
    streak = 1;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    if (!dayQualifiesForStreak(dailyStats[yesterdayStr])) return 0;
    streak = 1;
  }
  
  for (let i = 1; i < dates.length; i++) {
    const current = new Date(dates[i-1]);
    const previous = new Date(dates[i]);
    const dayDiff = Math.floor((current - previous) / (1000 * 60 * 60 * 24));
    
    if (dayDiff === 1 && dayQualifiesForStreak(dailyStats[dates[i]])) {
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
  
  const prefs = state.store.get('userPreferences');
  
  console.log('=== GOAL COMPLETION DEBUG ===');
  console.log('longTermGoals:', prefs.longTermGoals);
  console.log('dailyGoals:', prefs.dailyGoals);
  console.log('Total words ever written:', totalWords);
  
  // Check for goal completion and calculate words since goal start
  let goalCompleted = false;
  let wordsFromGoalStart = 0;
  let goalProgressToday = 0;
  
  let goalCompletionInfo = null;
  if (prefs.longTermGoals && prefs.longTermGoals.enabled) {
    console.log('Using LEGACY long-term goal system');
    const completionResult = checkGoalCompletion(stats, prefs.longTermGoals);
    goalCompleted = completionResult.completed;
    goalCompletionInfo = completionResult;

    // Calculate words written since goal started
    const goalStartDate = new Date(prefs.longTermGoals.startDate);

    console.log('Legacy goal calculation:', {
      goalStartDate: goalStartDate.toISOString(),
      sessionLogsCount: stats.sessionLogs ? stats.sessionLogs.length : 0,
      startDate: prefs.longTermGoals.startDate
    });

    if (stats.sessionLogs) {
      stats.sessionLogs.forEach(session => {
        const sessionDate = new Date(session.time);
        console.log('Legacy checking session:', {
          sessionTime: session.time,
          sessionDate: sessionDate.toISOString(),
          newWords: session.newWords,
          isAfterGoalStart: sessionDate >= goalStartDate
        });

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
      goalTarget: prefs.longTermGoals.totalWords,
      completionInfo: goalCompletionInfo
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
      state.store.set('userPreferences', updatedPrefs);
      console.log('Goal marked as completed!');
    }
  }
  
  // Check for dailyGoals long-term completion
  if (prefs.dailyGoals && prefs.dailyGoals.longtermTotalWords && prefs.dailyGoals.longtermStartDate) {
    console.log('Using DAILY GOALS long-term system');
    console.log('Checking daily goal completion...');
    const dailyCompletionResult = checkDailyGoalCompletion(stats, prefs.dailyGoals);
    const dailyGoalCompleted = dailyCompletionResult.completed;

    // Calculate words written since daily goal started (for progress display)
    let goalStartDate;
    if (prefs.dailyGoals.longtermStartDate) {
      goalStartDate = new Date(prefs.dailyGoals.longtermStartDate);
    } else {
      // If start date is null, assume goal started today
      goalStartDate = new Date();
      goalStartDate.setHours(0, 0, 0, 0); // Start of today
      console.log('Main calculation: goal start date is null, using today');
    }
    let wordsFromDailyGoalStart = 0;

    console.log('Calculating cumulative progress:', {
      goalStartDate: goalStartDate.toISOString(),
      sessionLogsCount: stats.sessionLogs ? stats.sessionLogs.length : 0,
      longtermStartDate: prefs.dailyGoals.longtermStartDate,
      goalStartTime: goalStartDate.getTime()
    });

    if (stats.sessionLogs) {
      stats.sessionLogs.forEach(session => {
        const sessionDate = new Date(session.time);
        const isAfterGoalStart = sessionDate >= goalStartDate;

        console.log('Checking session:', {
          sessionTime: session.time,
          sessionDate: sessionDate.toISOString(),
          newWords: session.newWords,
          isAfterGoalStart: isAfterGoalStart,
          timeDiffMinutes: Math.round((sessionDate.getTime() - goalStartDate.getTime()) / (1000 * 60))
        });

        if (isAfterGoalStart) {
          wordsFromDailyGoalStart += session.newWords || 0;

          // Count today's words toward goal
          const sessionDay = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
          if (sessionDay === today) {
            goalProgressToday += session.newWords || 0;
          }
        }
      });
    }

    console.log('Final cumulative calculation:', {
      wordsFromDailyGoalStart,
      goalProgressToday
    });

    // Use the daily goal words for progress display
    wordsFromGoalStart = wordsFromDailyGoalStart;

    if (dailyGoalCompleted && !prefs.dailyGoals.completed) {

      console.log('Daily goal long-term completion check:', {
        wordsFromDailyGoalStart,
        longtermTotalWords: prefs.dailyGoals.longtermTotalWords,
        completed: dailyGoalCompleted,
        completionInfo: dailyCompletionResult
      });

      // Mark as completed so we don't show again
      const updatedPrefs = {
        ...prefs,
        dailyGoals: {
          ...prefs.dailyGoals,
          completed: true,
          completedDate: new Date().toISOString()
        },
        longTermGoalsCompleted: (prefs.longTermGoalsCompleted || 0) + 1
      };
      state.store.set('userPreferences', updatedPrefs);
      console.log('Daily goal long-term target marked as completed!');

      goalCompleted = true; // Trigger celebration modal
      goalCompletionInfo = dailyCompletionResult; // Use daily goal completion info
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
    goalCompletionInfo: goalCompletionInfo, // Send goal completion details
    longTermGoals: prefs.longTermGoals, // Send the long-term goal data
    dailyGoals: prefs.dailyGoals // Send the daily goals data
  });
});


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
  
  const prefs = state.store.get('userPreferences');
  
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

  // Calculate streak using the centralized function to ensure consistency
  const currentStreak = calculateStreak(stats.dailyStats || {}, prefs);

  event.reply('detailed-stats', {
    allTime: { words: allTimeWords, sessions: allTimeSessions, minutes: allTimeMinutes },
    year: { words: yearWords, sessions: yearSessions, minutes: yearMinutes },
    month: { words: monthWords, sessions: monthSessions, minutes: monthMinutes },
    week: { words: weekWords, sessions: weekSessions, minutes: weekMinutes },
    today: stats.dailyStats?.[today] || { words: 0, sessions: 0, timeSpent: 0 },
    streak: currentStreak,
    dailyData: dailyData,
    recentSessions: (stats.sessionLogs || [])
      .filter(session => session.filename && session.filename !== 'unknown' && session.newWords > 0)
      .slice(-10).reverse(),
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


// Page visit tracking for achievements
ipcMain.on('page-visited', async (event, page) => {
  try {
    const prefs = state.store.get('userPreferences', {});
    const pageVisits = prefs.pageVisits || {};
    
    // Track the visit
    pageVisits[page] = true;
    
    // Update preferences
    state.store.set('userPreferences', {
      ...prefs,
      pageVisits: pageVisits
    });
    
    console.log(`Page visit tracked: ${page}`);
    
    // Check for navigation achievements immediately
    const stats = await loadStats();
    await achievementsIpc.checkAndUnlockAchievements(stats, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString(),
      pageVisit: page
    });
    
  } catch (error) {
    console.error('Error tracking page visit:', error);
  }
});

// --- Recovered helpers (restored during modularization) ---

// Add this function to check if goal is completed
function checkGoalCompletion(stats, longTermGoals) {
  if (!longTermGoals || !longTermGoals.enabled) return { completed: false };

  // Check if already celebrated
  if (longTermGoals.completed) return { completed: false };

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

  if (wordGoalMet) {
    const daysAhead = Math.max(0, longTermGoals.totalDays - daysPassed);
    return {
      completed: true,
      completedEarly: daysAhead > 0,
      daysAhead: daysAhead,
      totalDays: longTermGoals.totalDays,
      daysTaken: daysPassed,
      totalWords: longTermGoals.totalWords,
      wordsWritten: totalWordsWritten
    };
  }

  return { completed: false };
}

// Check daily goal long-term completion (similar to checkGoalCompletion but for dailyGoals)
function checkDailyGoalCompletion(stats, dailyGoals) {
  if (!dailyGoals || !dailyGoals.longtermTotalWords) return { completed: false };

  // Check if already completed
  if (dailyGoals.completed) return { completed: false };

  let startDate;
  let daysPassed;

  if (dailyGoals.longtermStartDate) {
    startDate = new Date(dailyGoals.longtermStartDate);
    const today = new Date();
    daysPassed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));

    // Check if goal was just set (within 1 minute) - allow completion after 1 minute
    const timeSinceGoalStart = today.getTime() - startDate.getTime();
    if (timeSinceGoalStart < 1 * 60 * 1000) {
      console.log('Daily goal was just set (<1min ago), not checking completion yet');
      return { completed: false };
    }
  } else {
    // If start date is null, goal cannot be completed yet
    console.log('Daily goal start date is null, goal cannot be completed');
    return { completed: false };
  }

  // Calculate total words written since daily goal started
  let totalWordsWritten = 0;

  if (stats.sessionLogs) {
    stats.sessionLogs.forEach(session => {
      const sessionDate = new Date(session.time);
      if (sessionDate >= startDate) {
        totalWordsWritten += session.newWords || 0;
      }
    });
  }

  console.log('Daily goal completion calculation:', {
    startDate: startDate.toISOString(),
    totalWordsFromSessions: totalWordsWritten,
    wordGoalTarget: dailyGoals.longtermTotalWords,
    totalDays: dailyGoals.longtermTotalDays,
    daysPassed: daysPassed
  });

  // Goal completed if we hit the total word target
  const wordGoalMet = totalWordsWritten >= dailyGoals.longtermTotalWords;

  if (wordGoalMet) {
    const daysAhead = Math.max(0, dailyGoals.longtermTotalDays - daysPassed);
    return {
      completed: true,
      completedEarly: daysAhead > 0,
      daysAhead: daysAhead,
      totalDays: dailyGoals.longtermTotalDays,
      daysTaken: daysPassed,
      totalWords: dailyGoals.longtermTotalWords,
      wordsWritten: totalWordsWritten
    };
  }

  return { completed: false };
}

// Get achievement data for statistics
function getAchievementData() {
  try {
    // Check if achievements are disabled in settings
    const currentSettings = state.store.get('settings');
    if (currentSettings?.gamificationSettings?.disableAchievements) {
      return {
        totalUnlocked: 0,
        totalPossible: 0,
        achievements: { unlocked: [], locked: [] }
      };
    }
    
    const prefs = state.store.get('userPreferences');
    const unlockedAchievements = prefs.unlockedAchievements || [];
    
    return {
      totalUnlocked: state.achievementSystem.getTotalUnlocked(unlockedAchievements),
      totalPossible: state.achievementSystem.getTotalPossible(),
      achievements: state.achievementSystem.getAchievementsByStatus(unlockedAchievements)
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

module.exports = { loadStats, saveStats, calculateStreak }
