// achievements.js - Achievement System for Focus Writer

class AchievementSystem {
    constructor() {
        this.achievements = {
            // Word Count Milestones
            firstWords: {
                id: 'firstWords',
                name: 'First Words',
                description: 'Start your very first document',
                icon: '✏️',
                hidden: false,
                condition: (stats, session) => stats.totalWords > 0
            },
            
            drabbler: {
                id: 'drabbler',
                name: 'Drabbler',
                description: 'Write your first 100 words',
                icon: '📝',
                hidden: false,
                condition: (stats, session) => stats.totalWords >= 100
            },
            
            firstDraft: {
                id: 'firstDraft',
                name: 'First Draft',
                description: 'Write your first 500 words',
                icon: '📄',
                hidden: false,
                condition: (stats, session) => stats.totalWords >= 500
            },
            
            findingVoice: {
                id: 'findingVoice',
                name: 'Finding Your Voice',
                description: 'Write your first 1000 words',
                icon: '🎙️',
                hidden: false,
                condition: (stats, session) => stats.totalWords >= 1000
            },
            
            juniorNovelist: {
                id: 'juniorNovelist',
                name: 'Junior Novelist',
                description: 'Write your first 5000 words',
                icon: '📚',
                hidden: false,
                condition: (stats, session) => stats.totalWords >= 5000
            },
            
            shortStoryteller: {
                id: 'shortStoryteller',
                name: 'Short storyteller',
                description: 'Write your first 10000 words',
                icon: '📖',
                hidden: false,
                condition: (stats, session) => stats.totalWords >= 10000
            },
            
            mightierThanSword: {
                id: 'mightierThanSword',
                name: 'Mightier Than the Sword',
                description: 'Write your first 25000 words',
                icon: '🗡️',
                hidden: false,
                condition: (stats, session) => stats.totalWords >= 25000
            },
            
            certifiedNovelist: {
                id: 'certifiedNovelist',
                name: 'Certified Novelist',
                description: 'Write your first 50000 words',
                icon: '🖋️',
                hidden: false,
                condition: (stats, session) => stats.totalWords >= 50000
            },
            
            author: {
                id: 'author',
                name: 'Author',
                description: 'Write your first 100000 words',
                icon: '🏛️',
                hidden: false,
                condition: (stats, session) => stats.totalWords >= 100000
            },
            
            // Streak Achievements
            firstStep: {
                id: 'firstStep',
                name: 'The First Step',
                description: '2-day streak',
                icon: '👣',
                hidden: false,
                condition: (stats, session) => stats.currentStreak >= 2
            },
            
            sprinter: {
                id: 'sprinter',
                name: 'Sprinter',
                description: '7-day streak',
                icon: '🏃‍♂️',
                hidden: false,
                condition: (stats, session) => stats.currentStreak >= 7
            },
            
            brickByBrick: {
                id: 'brickByBrick',
                name: 'Brick By Brick',
                description: '14-day streak',
                icon: '🧱',
                hidden: false,
                condition: (stats, session) => stats.currentStreak >= 14
            },
            
            wrimoEnthusiast: {
                id: 'wrimoEnthusiast',
                name: 'Wrimo Enthusiast',
                description: '30-day streak',
                icon: '🏆',
                hidden: false,
                condition: (stats, session) => stats.currentStreak >= 30
            },
            
            unstoppableForce: {
                id: 'unstoppableForce',
                name: 'Unstoppable Force',
                description: '60-day streak',
                icon: '💪',
                hidden: false,
                condition: (stats, session) => stats.currentStreak >= 60
            },
            
            eternalFlame: {
                id: 'eternalFlame',
                name: 'Eternal Flame',
                description: '100-day streak',
                icon: '🔥',
                hidden: false,
                condition: (stats, session) => stats.currentStreak >= 100
            },
            
            yearOfWriter: {
                id: 'yearOfWriter',
                name: 'Year of the Writer',
                description: '365-day streak',
                icon: '📆',
                hidden: false,
                condition: (stats, session) => stats.currentStreak >= 365
            },
            
            // Time-based Writing Achievements
            warmingUp: {
                id: 'warmingUp',
                name: 'Warming up',
                description: 'Write for 5 minutes',
                icon: '⏱️',
                hidden: false,
                condition: (stats, session) => stats.totalMinutes >= 5
            },
            
            inTheZone: {
                id: 'inTheZone',
                name: 'In the Zone',
                description: 'Write for 30 minutes',
                icon: '🎯',
                hidden: false,
                condition: (stats, session) => stats.totalMinutes >= 30
            },
            
            firstWatch: {
                id: 'firstWatch',
                name: 'The First Watch',
                description: 'Write for 1 hour',
                icon: '⌚',
                hidden: false,
                condition: (stats, session) => stats.totalMinutes >= 60
            },
            
            theGrind: {
                id: 'theGrind',
                name: 'The Grind',
                description: 'Write for 5 hours',
                icon: '🛠️',
                hidden: false,
                condition: (stats, session) => stats.totalMinutes >= 300
            },
            
            throughTheNight: {
                id: 'throughTheNight',
                name: 'Through the Night',
                description: 'Write for 12 hours',
                icon: '🌙',
                hidden: false,
                condition: (stats, session) => stats.totalMinutes >= 720
            },
            
            dayOfWriting: {
                id: 'dayOfWriting',
                name: 'Day of writing',
                description: 'Write for 24 hours',
                icon: '🌞',
                hidden: false,
                condition: (stats, session) => stats.totalMinutes >= 1440
            },
            
            flowState: {
                id: 'flowState',
                name: 'Flow State',
                description: 'Write for 50 hours',
                icon: '🌊',
                hidden: false,
                condition: (stats, session) => stats.totalMinutes >= 3000
            },
            
            centuryScribe: {
                id: 'centuryScribe',
                name: 'Century Scribe',
                description: 'Write for 100 hours',
                icon: '🕰️',
                hidden: false,
                condition: (stats, session) => stats.totalMinutes >= 6000
            },
            
            // Navigation Achievements
            eruditeEducator: {
                id: 'eruditeEducator',
                name: 'Erudite Educator',
                description: 'Visit the About page',
                icon: '🙏',
                hidden: false,
                condition: (stats, session) => stats.visitedAbout === true
            },
            
            tutorialGraduate: {
                id: 'tutorialGraduate',
                name: 'Tutorial Graduate',
                description: 'Complete the welcome tutorial',
                icon: '🎓',
                hidden: false,
                condition: (stats, session) => stats.completedTutorial === true
            },
            
            dataAnalyst: {
                id: 'dataAnalyst',
                name: 'Data Analyst',
                description: 'Visit the Stats page',
                icon: '📊',
                hidden: false,
                condition: (stats, session) => stats.visitedStats === true
            },
            
            fileExplorer: {
                id: 'fileExplorer',
                name: 'File Explorer!',
                description: 'Visit the Files page',
                icon: '🗂️',
                hidden: false,
                condition: (stats, session) => stats.visitedFiles === true
            },
            
            tinkerer: {
                id: 'tinkerer',
                name: 'Tinkerer',
                description: 'Visit the Settings page',
                icon: '🛠️',
                hidden: false,
                condition: (stats, session) => stats.visitedSettings === true
            },
            
            // Mode-based Achievements
            treatYourself: {
                id: 'treatYourself',
                name: 'Treat Yourself',
                description: 'Successfully complete a writing session in reward mode',
                icon: '🍪',
                hidden: false,
                condition: (stats, session) => session && session.successful && session.mode === 'reward'
            },
            
            gluttonPunishment: {
                id: 'gluttonPunishment',
                name: 'Glutton for Punishment',
                description: 'Successfully complete a writing session in punishment mode',
                icon: '😈',
                hidden: false,
                condition: (stats, session) => session && session.successful && session.mode === 'punishment'
            },
            
            masochist: {
                id: 'masochist',
                name: 'Masochist',
                description: 'Successfully complete a writing session in nuclear mode',
                icon: '💀',
                hidden: false,
                condition: (stats, session) => session && session.successful && session.mode === 'nuclear'
            },
            
            // Session Performance Achievements
            speedWriter: {
                id: 'speedWriter',
                name: 'Speed writer',
                description: 'Write 500 words in one session',
                icon: '⚡',
                hidden: false,
                condition: (stats, session) => session && session.newWords >= 500
            },
            
            marathoner: {
                id: 'marathoner',
                name: 'Marathoner',
                description: 'Write for 2 hours straight',
                icon: '🏃‍♀️',
                hidden: false,
                condition: (stats, session) => session && session.timeSpent >= 120
            },
            
            // Time-specific Achievements
            weekendWarrior: {
                id: 'weekendWarrior',
                name: 'Weekend Warrior',
                description: 'Write on both a Saturday and a Sunday consecutively',
                icon: '🏕️',
                hidden: false,
                condition: (stats, session) => stats.consecutiveWeekend === true
            },
            
            comebackKid: {
                id: 'comebackKid',
                name: 'Comeback Kid',
                description: 'Break a 30+ day writing drought with a new session',
                icon: '🎢',
                hidden: false,
                condition: (stats, session) => stats.brokenDrought >= 30
            },
            
            lunchBreakNovelist: {
                id: 'lunchBreakNovelist',
                name: 'Lunch Break Novelist',
                description: 'Write between 12-1 pm',
                icon: '🥪',
                hidden: false,
                condition: (stats, session) => {
                    if (!session || !session.sessionStartTime) return false;
                    const hour = new Date(session.sessionStartTime).getHours();
                    return hour === 12;
                }
            },
            
            nightOwl: {
                id: 'nightOwl',
                name: 'Night Owl',
                description: 'Write between midnight and 4am',
                icon: '🦉',
                hidden: false,
                condition: (stats, session) => {
                    if (!session || !session.sessionStartTime) return false;
                    const hour = new Date(session.sessionStartTime).getHours();
                    return hour >= 0 && hour < 4;
                }
            },
            
            earlyBird: {
                id: 'earlyBird',
                name: 'Early Bird',
                description: 'Write before 8am',
                icon: '🌅',
                hidden: false,
                condition: (stats, session) => {
                    if (!session || !session.sessionStartTime) return false;
                    const hour = new Date(session.sessionStartTime).getHours();
                    return hour < 8;
                }
            },
            
            mondayMotivation: {
                id: 'mondayMotivation',
                name: 'Monday Motivation',
                description: 'Write on a Monday',
                icon: '💪',
                hidden: false,
                condition: (stats, session) => {
                    if (!session || !session.sessionStartTime) return false;
                    const date = new Date(session.sessionStartTime);
                    return date.getDay() === 1; // Monday
                }
            },
            
            humpDay: {
                id: 'humpDay',
                name: 'Hump Day',
                description: 'Write on a Wednesday',
                icon: '🐪',
                hidden: false,
                condition: (stats, session) => {
                    if (!session || !session.sessionStartTime) return false;
                    const date = new Date(session.sessionStartTime);
                    return date.getDay() === 3; // Wednesday
                }
            },
            
            fridayFinale: {
                id: 'fridayFinale',
                name: 'Friday Finale',
                description: 'Write on a Friday',
                icon: '🎉',
                hidden: false,
                condition: (stats, session) => {
                    if (!session || !session.sessionStartTime) return false;
                    const date = new Date(session.sessionStartTime);
                    return date.getDay() === 5; // Friday
                }
            },
            
            // File and Project Achievements
            collector: {
                id: 'collector',
                name: 'The Collector',
                description: 'Create 50 separate documents',
                icon: '🗃️',
                hidden: false,
                condition: (stats, session) => stats.totalDocuments >= 50
            },
            
            phoenix: {
                id: 'phoenix',
                name: 'The Phoenix',
                description: 'Break a streak and then start again',
                icon: '🦅',
                hidden: false,
                condition: (stats, session) => stats.streakRebirth === true
            },
            
            dabbler: {
                id: 'dabbler',
                name: 'Dabbler',
                description: 'Write at least once in 5 different projects',
                icon: '🎨',
                hidden: false,
                condition: (stats, session) => stats.uniqueProjects >= 5
            },
            
            // Meta Achievements
            overachiever: {
                id: 'overachiever',
                name: 'Overachiever',
                description: 'Unlock 10 achievements',
                icon: '🌟',
                hidden: false,
                condition: (stats, session) => stats.totalAchievements >= 10
            },
            
            completionist: {
                id: 'completionist',
                name: 'Completionist',
                description: 'Unlock all (not-hidden) achievements',
                icon: '🏅',
                hidden: false,
                condition: (stats, session) => stats.unlockedNonHidden >= stats.totalNonHidden
            },
            
            legend: {
                id: 'legend',
                name: 'Legend',
                description: 'Unlock them all',
                icon: '👑',
                hidden: false,
                condition: (stats, session) => stats.totalAchievements >= stats.totalPossible
            },
            
            // Long-term Goal Achievements
            itsTheClimb: {
                id: 'itsTheClimb',
                name: "It's the Climb",
                description: 'Commit to a long-term writing goal',
                icon: '⛰️',
                hidden: false,
                condition: (stats, session) => stats.longTermGoalCommitted === true
            },
            
            valleyOfDeath: {
                id: 'valleyOfDeath',
                name: 'Valley of Death',
                description: 'Miss a day while committed to a long-term writing goal',
                icon: '🤕',
                hidden: false,
                condition: (stats, session) => stats.missedLongTermDay === true
            },
            
            mountaineer: {
                id: 'mountaineer',
                name: 'Mountaineer',
                description: 'Write at least half of the words in your long-term goal by the midpoint of the challenge',
                icon: '🧗',
                hidden: false,
                condition: (stats, session) => stats.reachedMidpoint === true
            },
            
            summitter: {
                id: 'summitter',
                name: 'Summitter',
                description: 'Finish a long-term writing goal!',
                icon: '🔝',
                hidden: false,
                condition: (stats, session) => stats.totalLongTermGoals > 0
            },
            
            // Hidden Achievements
            silentTreatment: {
                id: 'silentTreatment',
                name: 'Silent Treatment',
                description: 'Open a new blank document but don\'t write anything for 10 minutes',
                icon: '🤫',
                hidden: true,
                condition: (stats, session) => stats.silentSession >= 10
            },
            
            witchingHour: {
                id: 'witchingHour',
                name: 'Witching Hour',
                description: 'Write at exactly 2:00 am',
                icon: '🕯️',
                hidden: true,
                condition: (stats, session) => {
                    if (!session || !session.sessionStartTime) return false;
                    const date = new Date(session.sessionStartTime);
                    return date.getHours() === 2 && date.getMinutes() === 0;
                }
            },
            
            maybeNextTime: {
                id: 'maybeNextTime',
                name: 'Maybe Next Time',
                description: 'Open a new blank document 5 times in a row without writing',
                icon: '🔄',
                hidden: true,
                condition: (stats, session) => stats.consecutiveEmptyDocs >= 5
            },
            
            priceFixing: {
                id: 'priceFixing',
                name: 'Price Fixing',
                description: 'Paste text into a document while in a sprint',
                icon: '📋',
                hidden: true,
                condition: (stats, session) => session && session.pasteDetected === true
            },
            
            blastOff: {
                id: 'blastOff',
                name: 'Blast Off',
                description: 'Write 5000 words in a single day',
                icon: '🚀',
                hidden: true,
                condition: (stats, session) => stats.dailyWords >= 5000
            },
            
            procrastinatorSpecial: {
                id: 'procrastinatorSpecial',
                name: "Procrastinator's Special",
                description: 'Spend 1+ hour on the app without writing a word',
                icon: '🛋️',
                hidden: true,
                condition: (stats, session) => stats.timeWithoutWriting >= 60
            },
            
            saveScummer: {
                id: 'saveScummer',
                name: 'Save Scummer',
                description: 'Manually save a document 10 times in one session',
                icon: '💾',
                hidden: true,
                condition: (stats, session) => session && session.manualSaves >= 10
            },
            
            hiddenTalent: {
                id: 'hiddenTalent',
                name: 'Hidden Talent',
                description: 'Unlock your first hidden achievement',
                icon: '🕵️‍♂️',
                hidden: true,
                condition: (stats, session) => stats.firstHiddenAchievement === true
            },
            
            deadlinePanic: {
                id: 'deadlinePanic',
                name: 'Deadline Panic',
                description: 'Start writing at 11:59 pm',
                icon: '⏰',
                hidden: true,
                condition: (stats, session) => {
                    if (!session || !session.sessionStartTime) return false;
                    const date = new Date(session.sessionStartTime);
                    return date.getHours() === 23 && date.getMinutes() === 59;
                }
            },
            
            leapOfFaith: {
                id: 'leapOfFaith',
                name: 'Leap of Faith',
                description: 'Write on Leap Day',
                icon: '🌈',
                hidden: true,
                condition: (stats, session) => {
                    if (!session || !session.time) return false;
                    const date = new Date(session.time);
                    return date.getMonth() === 1 && date.getDate() === 29;
                }
            }
        };
    }
    
    // Check which achievements should be unlocked based on current stats and session
    checkAchievements(stats, currentSession = null, unlockedAchievements = []) {
        const newUnlocks = [];
        
        // Debug navigation and time achievements specifically
        const navigationIds = ['eruditeEducator', 'tutorialGraduate', 'dataAnalyst', 'fileExplorer', 'tinkerer'];
        const timeIds = ['warmingUp', 'inTheZone', 'firstWatch', 'theGrind', 'throughTheNight', 'dayOfWriting', 'flowState', 'centuryScribe'];
        const sessionIds = ['speedWriter', 'marathoner'];
        const timeSpecificIds = ['lunchBreakNovelist', 'nightOwl', 'earlyBird', 'witchingHour', 'deadlinePanic'];
        const silentIds = ['silentTreatment'];
        const dailyIds = ['blastOff'];
        
        for (const [id, achievement] of Object.entries(this.achievements)) {
            // Skip if already unlocked
            if (unlockedAchievements.find(a => a.id === id)) continue;
            
            // Check if condition is met
            try {
                const conditionResult = achievement.condition(stats, currentSession);
                
                // Debug navigation achievements
                if (navigationIds.includes(id)) {
                    console.log(`Checking ${achievement.name} (${id}):`, conditionResult);
                    console.log(`  Stats for this achievement:`, {
                        visitedAbout: stats.visitedAbout,
                        visitedStats: stats.visitedStats,
                        visitedFiles: stats.visitedFiles,
                        visitedSettings: stats.visitedSettings
                    });
                }
                
                // Debug time achievements
                if (timeIds.includes(id)) {
                    console.log(`Checking ${achievement.name} (${id}):`, conditionResult);
                    console.log(`  Total minutes: ${stats.totalMinutes}`);
                }
                
                // Debug session achievements
                if (sessionIds.includes(id) && currentSession) {
                    console.log(`Checking ${achievement.name} (${id}):`, conditionResult);
                    console.log(`  Session data:`, {
                        timeSpent: currentSession.timeSpent,
                        newWords: currentSession.newWords
                    });
                }
                
                // Debug time-specific achievements
                if (timeSpecificIds.includes(id) && currentSession) {
                    console.log(`Checking ${achievement.name} (${id}):`, conditionResult);
                    if (currentSession.sessionStartTime) {
                        const startTime = new Date(currentSession.sessionStartTime);
                        console.log(`  Session started at: ${startTime.toLocaleTimeString()} (${startTime.getHours()}:${startTime.getMinutes()})`);
                    }
                }
                
                // Debug silent achievements
                if (silentIds.includes(id) && currentSession) {
                    console.log(`Checking ${achievement.name} (${id}):`, conditionResult);
                    console.log(`  Silent session minutes:`, stats.silentSession);
                }
                
                // Debug daily achievements
                if (dailyIds.includes(id)) {
                    console.log(`Checking ${achievement.name} (${id}):`, conditionResult);
                    console.log(`  Daily words today:`, stats.dailyWords);
                }
                
                if (conditionResult) {
                    newUnlocks.push({
                        id: achievement.id,
                        name: achievement.name,
                        description: achievement.description,
                        icon: achievement.icon,
                        hidden: achievement.hidden,
                        unlockedAt: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Error checking achievement:', id, error);
            }
        }
        
        return newUnlocks;
    }
    
    // Get all achievements (for viewing locked ones)
    getAllAchievements() {
        return Object.values(this.achievements).map(achievement => ({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            hidden: achievement.hidden
        }));
    }
    
    // Get achievements by unlock status
    getAchievementsByStatus(unlockedAchievements = []) {
        const all = this.getAllAchievements();
        const unlocked = [];
        const locked = [];
        
        all.forEach(achievement => {
            if (unlockedAchievements.some(unlocked => unlocked.id === achievement.id)) {
                // Find the unlock data
                const unlockData = unlockedAchievements.find(u => u.id === achievement.id);
                unlocked.push({
                    ...achievement,
                    unlockedAt: unlockData.unlockedAt
                });
            } else {
                locked.push({
                    ...achievement,
                    // Hide description for hidden achievements
                    description: achievement.hidden ? 'Hidden Achievement' : achievement.description
                });
            }
        });
        
        return { unlocked, locked };
    }
    
    // Get total count of unlocked achievements
    getTotalUnlocked(unlockedAchievements = []) {
        return unlockedAchievements.length;
    }
    
    // Get total possible achievements
    getTotalPossible() {
        return Object.keys(this.achievements).length;
    }
}

// Export for use in main process and renderer processes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementSystem;
} else if (typeof window !== 'undefined') {
    window.AchievementSystem = AchievementSystem;
}