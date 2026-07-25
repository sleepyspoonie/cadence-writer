// achievement-notifications.js - Achievement Notification System

class AchievementNotifications {
    constructor() {
        this.notifications = [];
        this.nextId = 1;
        this.setupIPC();
        this.injectStyles();
        this.createContainer();
    }

    setupIPC() {
        if (typeof ipcRenderer !== 'undefined') {
            
            // Listen for achievement unlocks
            ipcRenderer.on('achievements-unlocked', (event, achievements) => {
                achievements.forEach(achievement => {
                    this.showNotification(achievement);
                });
            });
        }
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .achievement-notifications-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .achievement-notification {
                background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
                color: #000;
                border-radius: 12px;
                padding: 1rem 1.5rem;
                margin-bottom: 0.5rem;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                border: 1px solid var(--color-accent-hover);
                min-width: 300px;
                max-width: 400px;
                position: relative;
                pointer-events: auto;
                transform: translateX(120%);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
            }

            .achievement-notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .achievement-notification.hide {
                transform: translateX(120%);
                opacity: 0;
            }

            .achievement-notification:hover {
                transform: translateX(0) scale(1.02);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            }

            .achievement-header {
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
                font-weight: 600;
                font-size: 0.9rem;
                opacity: 0.8;
            }

            .achievement-header::before {
                content: '🏆';
                margin-right: 0.5rem;
                font-size: 1rem;
            }

            .achievement-content {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .achievement-icon {
                font-size: 2rem;
                flex-shrink: 0;
            }

            .achievement-details {
                flex: 1;
            }

            .achievement-name {
                font-size: 1.1rem;
                font-weight: 700;
                margin-bottom: 0.25rem;
                color: #000;
            }

            .achievement-description {
                font-size: 0.85rem;
                opacity: 0.8;
                line-height: 1.3;
            }

            .achievement-close {
                position: absolute;
                top: 0.5rem;
                right: 0.75rem;
                background: none;
                border: none;
                color: #000;
                font-size: 1.25rem;
                cursor: pointer;
                opacity: 0.6;
                transition: opacity 0.2s;
                line-height: 1;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .achievement-close:hover {
                opacity: 1;
            }

            .achievement-progress-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 0 0 12px 12px;
                transform-origin: left;
                transition: transform linear;
            }
        `;
        document.head.appendChild(style);
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'achievement-notifications-container';
        document.body.appendChild(this.container);
    }

    showNotification(achievement, playSound = true) {
        const id = this.nextId++;
        const notification = this.createNotificationElement(achievement, id);
        
        this.container.appendChild(notification);
        this.notifications.push({ id, element: notification });
        
        // Play sound only if requested
        if (playSound) {
            this.playAchievementSound();
        }
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto-hide after 5 seconds unless hovered
        this.scheduleAutoHide(notification, id);
    }

    createNotificationElement(achievement, id) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.dataset.id = id;
        
        notification.innerHTML = `
            <button class="achievement-close" title="Close">&times;</button>
            <div class="achievement-header">Achievement Unlocked!</div>
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-details">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            </div>
            <div class="achievement-progress-bar"></div>
        `;
        
        // Close button handler
        const closeBtn = notification.querySelector('.achievement-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideNotification(id);
        });
        
        // Click to close (optional)
        notification.addEventListener('click', () => {
            this.hideNotification(id);
        });
        
        return notification;
    }

    scheduleAutoHide(notification, id) {
        let timeout;
        const progressBar = notification.querySelector('.achievement-progress-bar');
        const duration = 5000; // 5 seconds
        
        const startAutoHide = () => {
            const startTime = Date.now();
            
            progressBar.style.transform = 'scaleX(0)';
            progressBar.style.transition = `transform ${duration}ms linear`;
            
            timeout = setTimeout(() => {
                this.hideNotification(id);
            }, duration);
            
            // Animate progress bar
            requestAnimationFrame(() => {
                progressBar.style.transform = 'scaleX(1)';
            });
        };
        
        const pauseAutoHide = () => {
            if (timeout) {
                clearTimeout(timeout);
                progressBar.style.transition = 'none';
                progressBar.style.transform = 'scaleX(1)';
            }
        };
        
        notification.addEventListener('mouseenter', pauseAutoHide);
        notification.addEventListener('mouseleave', startAutoHide);
        
        // Start initially
        startAutoHide();
    }

    hideNotification(id) {
        const notificationData = this.notifications.find(n => n.id === id);
        if (!notificationData) return;
        
        const notification = notificationData.element;
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n.id !== id);
        }, 400);
    }

    playAchievementSound() {
        try {
            // Create a simple achievement sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a pleasant "ding" sound
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Connect the audio graph
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configure the oscillators for a pleasant chime
            oscillator1.frequency.setValueAtTime(800, audioContext.currentTime); // High note
            oscillator2.frequency.setValueAtTime(600, audioContext.currentTime); // Lower note
            oscillator1.type = 'sine';
            oscillator2.type = 'sine';
            
            // Configure the envelope
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
            
            // Play the sound
            oscillator1.start(audioContext.currentTime);
            oscillator2.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.8);
            oscillator2.stop(audioContext.currentTime + 0.8);
            
        } catch (error) {
            console.log('Could not play achievement sound:', error);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.achievementNotifications = new AchievementNotifications();
    });
} else {
    window.achievementNotifications = new AchievementNotifications();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementNotifications;
}