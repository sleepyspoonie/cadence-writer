// theme-manager.js - fixed version
// Don't declare ipcRenderer, use it from global scope

class ThemeManager {
    constructor() {
        this.themes = {
            dark: {
                name: 'Dark',
                colors: {
                    '--color-bg-primary': '#0d0d0d',
                    '--color-bg-secondary': '#252525',
                    '--color-bg-tertiary': '#2a2a2a',
                    
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': '#cccccc',
                    '--color-text-muted': '#999999',
                    '--color-text-faint': '#666666',
                    
                    '--color-accent': '#14b8a6',
                    '--color-accent-hover': '#0891b2',
                    '--color-accent-muted': 'rgba(20, 184, 166, 0.2)',
                    
                    '--color-border': '#333333',
                    '--color-border-hover': '#444444',
                    '--color-overlay': 'rgba(0, 0, 0, 0.8)',
                    
                    '--editor-bg': '#ffffff',
                    '--editor-text': '#1a1a1a',
                    '--editor-toolbar': '#fafafa',
                    '--editor-border': '#e0e0e0'
                }
            },
            light: {
                name: 'Light',
                colors: {
                    '--color-bg-primary': '#ffffff',
                    '--color-bg-secondary': '#f5f5f5',
                    '--color-bg-tertiary': '#e8e8e8',
                    
                    '--color-text-primary': '#1a1a1a',
                    '--color-text-secondary': 'rgba(26, 26, 26, 0.7)',
                    '--color-text-muted': 'rgba(26, 26, 26, 0.5)',
                    '--color-text-faint': 'rgba(26, 26, 26, 0.3)',
                    
                    '--color-accent': '#14b8a6',
                    '--color-accent-hover': '#0891b2',
                    '--color-accent-muted': 'rgba(20, 184, 166, 0.15)',
                    
                    '--color-border': 'rgba(0, 0, 0, 0.1)',
                    '--color-border-hover': 'rgba(0, 0, 0, 0.2)',
                    '--color-overlay': 'rgba(0, 0, 0, 0.5)',
                    
                    '--editor-bg': '#ffffff',
                    '--editor-text': '#1a1a1a',
                    '--editor-toolbar': '#fafafa',
                    '--editor-border': '#e0e0e0'
                }
            },
            midnight: {
                name: 'Midnight',
                colors: {
                    '--color-bg-primary': '#0f0f23',
                    '--color-bg-secondary': '#1a1a35',
                    '--color-bg-tertiary': '#252545',
                    
                    '--color-text-primary': '#e0e0ff',
                    '--color-text-secondary': 'rgba(224, 224, 255, 0.7)',
                    '--color-text-muted': 'rgba(224, 224, 255, 0.5)',
                    '--color-text-faint': 'rgba(224, 224, 255, 0.3)',
                    
                    '--color-accent': '#7c3aed',
                    '--color-accent-hover': '#a855f7',
                    '--color-accent-muted': 'rgba(124, 58, 237, 0.2)',
                    
                    '--color-border': 'rgba(224, 224, 255, 0.1)',
                    '--color-border-hover': 'rgba(224, 224, 255, 0.2)',
                    '--color-overlay': 'rgba(15, 15, 35, 0.8)',
                    
                    '--editor-bg': '#ffffff',
                    '--editor-text': '#1a1a1a',
                    '--editor-toolbar': '#fafafa',
                    '--editor-border': '#e0e0e0'
                }
            },
            forest: {
                name: 'Forest',
                colors: {
                    '--color-bg-primary': '#6ab486',
                    '--color-bg-secondary': '#2e5642',
                    '--color-bg-tertiary': '#2e5642',
                    
                    '--color-text-primary': '#e0f0e0',
                    '--color-text-secondary': 'rgba(224, 240, 224, 0.7)',
                    '--color-text-muted': 'rgba(224, 240, 224, 0.5)',
                    '--color-text-faint': 'rgba(224, 240, 224, 0.3)',
                    
                    '--color-accent': '#ca9381',
                    '--color-accent-hover': '#ca9381',
                    '--color-accent-muted': 'rgba(202, 147, 129, 0.2)',
                    
                    '--color-border': 'rgba(224, 240, 224, 0.1)',
                    '--color-border-hover': 'rgba(224, 240, 224, 0.2)',
                    '--color-overlay': 'rgba(106, 180, 134, 0.8)',
                    
                    '--editor-bg': '#ffffff',
                    '--editor-text': '#1a1a1a',
                    '--editor-toolbar': '#fafafa',
                    '--editor-border': '#e0e0e0'
                }
            },
            sepia: {
                name: 'Sepia',
                colors: {
                    '--color-bg-primary': '#f4f1ea',
                    '--color-bg-secondary': '#e8e2d5',
                    '--color-bg-tertiary': '#d8cdb8',
                    
                    '--color-text-primary': '#3e2f1f',
                    '--color-text-secondary': 'rgba(62, 47, 31, 0.8)',
                    '--color-text-muted': 'rgba(62, 47, 31, 0.6)',
                    '--color-text-faint': 'rgba(62, 47, 31, 0.4)',
                    
                    '--color-accent': '#b8860b',
                    '--color-accent-hover': '#daa520',
                    '--color-accent-muted': 'rgba(184, 134, 11, 0.2)',
                    
                    '--color-border': 'rgba(62, 47, 31, 0.15)',
                    '--color-border-hover': 'rgba(62, 47, 31, 0.25)',
                    '--color-overlay': 'rgba(62, 47, 31, 0.5)',
                    
                    '--editor-bg': '#fffef9',
                    '--editor-text': '#3e2f1f',
                    '--editor-toolbar': '#f9f6f0',
                    '--editor-border': '#e8e2d5'
                }
            },
            crystalline: {
                name: 'Crystalline',
                colors: {
                    '--color-bg-primary': '#7e6ab4',
                    '--color-bg-secondary': '#372e56',
                    '--color-bg-tertiary': '#453a6b',
                    
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': 'rgba(255, 255, 255, 0.7)',
                    '--color-text-muted': 'rgba(255, 255, 255, 0.5)',
                    '--color-text-faint': 'rgba(255, 255, 255, 0.3)',
                    
                    '--color-accent': '#14b8a6',
                    '--color-accent-hover': '#0891b2',
                    '--color-accent-muted': 'rgba(20, 184, 166, 0.2)',
                    
                    '--color-border': 'rgba(255, 255, 255, 0.1)',
                    '--color-border-hover': 'rgba(255, 255, 255, 0.2)',
                    '--color-overlay': 'rgba(126, 106, 180, 0.8)',
                    
                    '--editor-bg': '#ffffff',
                    '--editor-text': '#1a1a1a',
                    '--editor-toolbar': '#fafafa',
                    '--editor-border': '#e0e0e0'
                }
            }
        };

        //Simplified presets
        this.presetThemes = {
            dark: {
                name: 'Dark',
                colors: {
                    background: '#0d0d0d',
                    text: '#ffffff',
                    accent: '#14b8a6',
                    card: '#252525'
                }
            },
            light: {
                name: 'Light',
                colors: {
                    background: '#ffffff',
                    text: '#1a1a1a',
                    accent: '#14b8a6',
                    card: '#f5f5f5'
                }
            },
            midnight: {
                name: 'Midnight',
                colors: {
                    background: '#0f0f23',
                    text: '#e0e0ff',
                    accent: '#7c3aed',
                    card: '#1a1a35'
                }
            },
            forest: {
                name: 'Forest',
                colors: {
                    background: '#6ab486',
                    text: '#e0f0e0',
                    accent: '#ca9381',
                    card: '#2e5642'
                }
            },
            sepia: {
                name: 'Sepia',
                colors: {
                    background: '#f4f1ea',
                    text: '#3e2f1f',
                    accent: '#b8860b',
                    card: '#e8e2d5'
                }
            },
            crystalline: {
                name: 'Crystalline',
                colors: {
                    background: '#7e6ab4',
                    text: '#ffffff',
                    accent: '#14b8a6',
                    card: '#372e56'
                }
            }
        };
        
        this.currentTheme = 'dark';
        this.applyTheme('dark'); // default
        this.loadTheme(); // then try saved
    }
    
    loadTheme() {
        // Check if ipcRenderer exists (from visibility-controller or elsewhere)
        if (typeof ipcRenderer !== 'undefined') {
            ipcRenderer.send('get-settings');
            
            ipcRenderer.once('load-settings', (event, settings) => {
                if (settings && settings.appearanceSettings) {
                    const { theme, customColors } = settings.appearanceSettings;
                    
                    if (theme === 'custom' && customColors) {
                        this.applyCustomTheme(customColors);
                    } else if (this.themes[theme]) {
                        this.applyTheme(theme);
                    }
                }
            });
        }
    }
    
    applyTheme(themeName) {
        if (!this.themes[themeName]) return;
        
        const theme = this.themes[themeName];
        const root = document.documentElement;
        
        Object.entries(theme.colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
        
        this.currentTheme = themeName;
        console.log(`Applied ${themeName} theme`);
    }
    
    applyCustomTheme(customColors) {
        const root = document.documentElement;
        
        const bgColor = customColors.background || '#1a1a1a';
        const textColor = customColors.text || '#e0e0e0';
        const accentColor = customColors.accent || '#14b8a6';
        const cardColor = customColors.card || '#252525';
        
        root.style.setProperty('--color-bg-primary', bgColor);
        root.style.setProperty('--color-bg-secondary', cardColor);
        root.style.setProperty('--color-bg-tertiary', this.lightenColor(cardColor, 10));
        
        root.style.setProperty('--color-text-primary', textColor);
        root.style.setProperty('--color-text-secondary', this.addOpacity(textColor, 0.7));
        root.style.setProperty('--color-text-muted', this.addOpacity(textColor, 0.5));
        root.style.setProperty('--color-text-faint', this.addOpacity(textColor, 0.3));
        
        root.style.setProperty('--color-accent', accentColor);
        root.style.setProperty('--color-accent-hover', this.lightenColor(accentColor, 20));
        root.style.setProperty('--color-accent-muted', this.addOpacity(accentColor, 0.2));
        
        const isDark = this.isColorDark(bgColor);
        root.style.setProperty('--color-border', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--color-border-hover', isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)');
        root.style.setProperty('--color-overlay', isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)');
        
        root.style.setProperty('--editor-bg', '#ffffff');
        root.style.setProperty('--editor-text', '#1a1a1a');
        root.style.setProperty('--editor-toolbar', '#fafafa');
        root.style.setProperty('--editor-border', '#e0e0e0');
        
        this.currentTheme = 'custom';
        console.log('Applied custom theme');
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    addOpacity(color, opacity) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }
    
    lightenColor(color, percent) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const factor = percent / 100;
        const r = Math.min(255, rgb.r + (255 - rgb.r) * factor);
        const g = Math.min(255, rgb.g + (255 - rgb.g) * factor);
        const b = Math.min(255, rgb.b + (255 - rgb.b) * factor);
        
        return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    }
    
    isColorDark(color) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return true;
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness < 128;
    }
}

// Initialize theme manager
if (!window.themeManager) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.themeManager = new ThemeManager();
        });
    } else {
        window.themeManager = new ThemeManager();
    }
}