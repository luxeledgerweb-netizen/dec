

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Sun, Moon, Palette, Settings, Home, Droplets, Star, HelpCircle, Edit, Save, X } from 'lucide-react';
import { localDb } from "@/components/utils/LocalDb";
import { SessionManager } from '@/components/utils/SessionManager';

// Helper functions to ensure themes are processed correctly
const hexToHsl = (hex) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || (hex.length !== 4 && hex.length !== 7)) {
    console.warn(`Invalid hex color received: ${hex}. Defaulting to #000000.`);
    hex = '#000000';
  }
  
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const adjustBrightness = (hex, percent) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || (hex.length !== 4 && hex.length !== 7)) {
    console.warn(`Invalid hex color received for brightness adjustment: ${hex}. Defaulting to #000000.`);
    hex = '#000000';
  }
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }

  l = Math.max(0, Math.min(1, l + (percent / 100)));
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export default function Layout({ children, currentPageName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSettings, setAdminSettings] = useState({ appName: "decysp", customLogo: null });
  const [theme, setTheme] = useState(localStorage.getItem("dashboardTheme") || "light");
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const themeTimeoutRef = useRef(null);
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
  const [customThemes, setCustomThemes] = useState([]);

  const loadAppSettings = () => {
    const settings = localDb.list('AdminSettings')[0] || { appName: "decysp", customLogo: null };
    setAdminSettings(settings);
    document.title = settings.appName || "decysp";
  };

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = sessionStorage.getItem('financeAuth') === 'true';
      setIsAuthenticated(authStatus);
    };

    checkAuth();
    window.addEventListener('authChange', checkAuth);

    if (sessionStorage.getItem('financeAuth') === 'true') {
      SessionManager.init();
    }

    // Load initial settings
    loadAppSettings();
    
    // Listen for settings changes from other components
    window.addEventListener('settingsChanged', loadAppSettings);

    return () => {
      window.removeEventListener('authChange', checkAuth);
      window.removeEventListener('settingsChanged', loadAppSettings);
      SessionManager.cleanup();
    };
  }, []);

  useEffect(() => {
    const handleStateChange = (event) => {
        if(typeof event.detail.isEditMode === 'boolean') {
            setIsLayoutEditMode(event.detail.isEditMode);
        }
    };
    window.addEventListener('layoutEditStateChanged', handleStateChange);
    return () => {
        window.removeEventListener('layoutEditStateChanged', handleStateChange);
    };
  }, []);

  useEffect(() => {
    // Load custom themes when theme options are shown
    if (showThemeOptions) {
      setCustomThemes(localDb.list('CustomThemes'));
    }
  }, [isAuthenticated, showThemeOptions]);

  useEffect(() => {
    const root = document.documentElement;
    
    root.classList.remove("light", "dark", "custom", "sofi");

    let activeThemeData = null;
    let isCustomThemeActive = false;
    
    if (theme === 'custom') {
      try {
        activeThemeData = localDb.getItem('activeAppThemeColors');
        isCustomThemeActive = activeThemeData && 
                            activeThemeData.background &&
                            activeThemeData.foreground &&
                            activeThemeData.primary;
      } catch (error) {
        console.warn('Error loading active custom theme data:', error);
        isCustomThemeActive = false;
      }
    }

    const themeProperties = {
      light: {
        '--background': '210 40% 98%',
        '--foreground': '222.2 84% 4.9%',
        '--card': '0 0% 100%',
        '--card-foreground': '222.2 84% 4.9%',
        '--popover': '0 0% 100%',
        '--popover-foreground': '222.2 84% 4.9%',
        '--primary': '222.2 47.4% 11.2%',
        '--primary-foreground': '210 40% 98%',
        '--secondary': '210 40% 96.1%',
        '--secondary-foreground': '222.2 47.4% 11.2%',
        '--muted': '210 40% 96.1%',
        '--muted-foreground': '215.4 16.3% 46.9%',
        '--accent': '210 40% 96.1%',
        '--accent-foreground': '222.2 47.4% 11.2%',
        '--destructive': '0 84.2% 60.2%',
        '--destructive-foreground': '210 40% 98%',
        '--border': '214.3 31.8% 91.4%',
        '--input': '214.3 31.8% 91.4%',
        '--ring': '222.2 84% 4.9%',
        '--heading-color': '222.2 84% 4.9%',
        '--text-primary': '222.2 84% 4.9%',
        '--text-secondary': '215.4 16.3% 46.9%',
        '--tile-color': '#F6F5F2',
        '--tile-text-color': '#333333',
        '--radius': '0.5rem',
      },
      dark: {
        '--background': '210 11% 15%',
        '--foreground': '210 40% 98%',
        '--card': '222.2 84% 4.9%',
        '--card-foreground': '210 40% 98%',
        '--popover': '222.2 84% 4.9%',
        '--popover-foreground': '210 40% 98%',
        '--primary': '210 40% 98%',
        '--primary-foreground': '222.2 47.4% 11.2%',
        '--secondary': '217.2 32.6% 17.5%',
        '--secondary-foreground': '210 40% 98%',
        '--muted': '217.2 32.6% 17.5%',
        '--muted-foreground': '215 20.2% 65.1%',
        '--accent': '217.2 32.6% 17.5%',
        '--accent-foreground': '210 40% 98%',
        '--destructive': '0 62.8% 30.6%',
        '--destructive-foreground': '210 40% 98%',
        '--border': '217.2 32.6% 17.5%',
        '--input': '217.2 32.6% 17.5%',
        '--ring': '212.7 26.8% 83.9%',
        '--heading-color': '0 0% 100%',
        '--text-primary': '210 40% 98%',
        '--text-secondary': '215 20.2% 65.1%',
        '--tile-color': '#262833',
        '--tile-text-color': '#ffffff',
        '--radius': '0.5rem',
      },
      sofi: {
        '--background': '195 70% 92%',
        '--foreground': '222.2 84% 4.9%',
        '--card': '0 0% 100%',
        '--card-foreground': '222.2 84% 4.9%',
        '--popover': '0 0% 100%',
        '--popover-foreground': '222.2 84% 4.9%',
        '--primary': '200 100% 30%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '210 40% 96.1%',
        '--secondary-foreground': '222.2 47.4% 11.2%',
        '--muted': '210 40% 96.1%',
        '--muted-foreground': '215.4 16.3% 46.9%',
        '--accent': '210 40% 96.1%',
        '--accent-foreground': '222.2 47.4% 11.2%',
        '--destructive': '0 84.2% 60.2%',
        '--destructive-foreground': '210 40% 98%',
        '--border': '214.3 31.8% 91.4%',
        '--input': '214.3 31.8% 91.4%',
        '--ring': '222.2 84% 4.9%',
        '--heading-color': '222.2 84% 4.9%',
        '--text-primary': '222.2 84% 4.9%',
        '--text-secondary': '215.4 16.3% 46.9%',
        '--tile-color': '#00A2C7',
        '--tile-text-color': '#ffffff',
        '--radius': '0.5rem',
      }
    };

    const allProps = new Set();
    Object.values(themeProperties).forEach(props => Object.keys(props).forEach(prop => allProps.add(prop)));
    allProps.forEach(prop => root.style.removeProperty(prop));

    let activeTheme;
    let themeClass;

    if (theme === 'custom' && isCustomThemeActive) {
      activeTheme = {
        '--background': hexToHsl(activeThemeData.background),
        '--foreground': hexToHsl(activeThemeData.foreground),
        '--primary': hexToHsl(activeThemeData.primary),
        '--primary-foreground': hexToHsl(activeThemeData.primaryForeground),
        '--card': hexToHsl(activeThemeData.background), 
        '--card-foreground': hexToHsl(activeThemeData.foreground),
        '--popover': hexToHsl(activeThemeData.background), 
        '--popover-foreground': hexToHsl(activeThemeData.foreground),
        '--secondary': adjustBrightness(activeThemeData.background, -10), 
        '--secondary-foreground': hexToHsl(activeThemeData.foreground),
        '--muted': adjustBrightness(activeThemeData.background, -5), 
        '--muted-foreground': hexToHsl(activeThemeData.secondaryText),
        '--accent': adjustBrightness(activeThemeData.background, -8), 
        '--accent-foreground': hexToHsl(activeThemeData.foreground),
        '--destructive': '0 84.2% 60.2%',
        '--destructive-foreground': '0 0% 98%',
        '--border': adjustBrightness(activeThemeData.background, -20), 
        '--input': adjustBrightness(activeThemeData.background, -20),
        '--ring': hexToHsl(activeThemeData.primary),
        '--heading-color': hexToHsl(activeThemeData.headingColor),
        '--text-primary': hexToHsl(activeThemeData.foreground),
        '--text-secondary': hexToHsl(activeThemeData.secondaryText),
        '--tile-color': activeThemeData.tileColor || '#F6F5F2',
        '--tile-text-color': activeThemeData.tileTextColor || '#333333',
        '--radius': '0.5rem',
      };
      themeClass = 'custom';
    } else {
      activeTheme = themeProperties[theme] || themeProperties.light;
      themeClass = theme in themeProperties ? theme : 'light';
      
      if (theme === 'custom' && !isCustomThemeActive) {
        setTheme('light');
        localStorage.setItem("dashboardTheme", 'light');
      }
    }

    Object.entries(activeTheme).forEach(([prop, value]) => {
        root.style.setProperty(prop, value);
    });

    root.classList.add(themeClass);
    localStorage.setItem("dashboardTheme", theme);
    
    // Force a repaint to ensure the background color change is visible
    if (themeClass === 'dark') {
      // Additional enforcement for dark mode background
      document.body.style.backgroundColor = '#1c1f26';
    } else {
      // Remove override for other themes
      document.body.style.backgroundColor = '';
    }
    
    window.dispatchEvent(new Event('themeChanged'));
    
  }, [theme]);

  const handleLogout = () => {
    SessionManager.logout('Manually logged out');
  };

  const handleThemeMouseDown = () => {
    themeTimeoutRef.current = setTimeout(() => {
      setShowThemeOptions(true);
    }, 700);
  };

  const handleThemeMouseUp = () => {
    clearTimeout(themeTimeoutRef.current);
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="h-5 w-5" />;
    if (theme === 'sofi') return <Droplets className="h-5 w-5" />;
    
    if (theme === 'custom') {
      const activeThemeData = localDb.getItem('activeAppThemeColors');
      if (activeThemeData) {
        return <Star className="h-5 w-5 text-yellow-400 fill-current" />;
      }
    }
    
    return <Sun className="h-5 w-5" />;
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };
  
  const activateCustomTheme = (themeData) => {
    if (themeData) {
        localDb.setItem('activeAppThemeColors', themeData);
        setTheme('custom');
        setShowThemeOptions(false);
    } else {
        alert('No custom theme data found to activate.');
    }
  };

  const getSettingsPageUrl = () => {
    if (currentPageName === 'FinancialDashboard') {
      return createPageUrl('FinancialDataManagement');
    }
    if (currentPageName === 'PasswordVault' || currentPageName === 'PasswordVaultInstructions') {
      return createPageUrl('PasswordVaultSettings');
    }
    return createPageUrl('Settings');
  };

  const getHelpPageUrl = () => {
    if (currentPageName === 'FinancialDashboard') {
      return createPageUrl('Instructions');
    }
    if (currentPageName === 'PasswordVault') {
      return createPageUrl('PasswordVaultInstructions');
    }
    return createPageUrl('HubInstructions');
  };

  const isHelpPageActive = () => {
    const helpPages = ['HubInstructions', 'Instructions', 'PasswordVaultInstructions'];
    return helpPages.includes(currentPageName);
  };

  const isSettingsPageActive = () => {
    const settingsPages = ['Settings', 'FinancialDataManagement', 'PasswordVaultSettings'];
    return settingsPages.includes(currentPageName);
  };

  const handleToggleLayoutEdit = () => window.dispatchEvent(new Event('toggleLayoutEdit'));
  const handleSaveLayout = () => window.dispatchEvent(new Event('saveLayoutEdit'));
  const handleCancelLayout = () => window.dispatchEvent(new Event('cancelLayoutEdit'));

  const iconAnimation = {
    opacity: showThemeOptions ? 0 : 1,
    scale: showThemeOptions ? 0.5 : 1,
  };
  const transition = { duration: 0.2 };

  const showHeader = isAuthenticated && currentPageName !== 'Dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showHeader && (
        <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
          <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              {adminSettings.customLogo && (
                  <img src={adminSettings.customLogo} alt="App Logo" className="h-8 w-8 rounded-md object-cover" />
              )}
              <h1 className="text-xl font-bold text-heading-color">{adminSettings.appName}</h1>
            </Link>

            <div className="flex items-center space-x-2">
              <AnimatePresence mode="wait">
                {!isLayoutEditMode ? (
                  <motion.div
                    key="main-icons"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center space-x-2"
                  >
                    <motion.div animate={iconAnimation} transition={transition}>
                      <Link to={createPageUrl('Dashboard')} title="Hub">
                          <Button variant="ghost" size="icon" className={currentPageName === 'Dashboard' ? 'bg-muted' : ''}><Home className="h-5 w-5"/></Button>
                      </Link>
                    </motion.div>

                    {['FinancialDashboard', 'PasswordVault'].includes(currentPageName) && (
                      <motion.div animate={iconAnimation} transition={transition}>
                        <Link to={getHelpPageUrl()} title="Help">
                            <Button variant="ghost" size="icon" className={isHelpPageActive() ? 'bg-muted' : ''}><HelpCircle className="h-5 w-5"/></Button>
                        </Link>
                      </motion.div>
                    )}

                    <motion.div animate={iconAnimation} transition={transition}>
                      <Link to={getSettingsPageUrl()} title="Settings">
                        <Button variant="ghost" size="icon" className={isSettingsPageActive() ? 'bg-muted' : ''}>
                          <Settings className="h-5 w-5"/>
                        </Button>
                      </Link>
                    </motion.div>

                    {currentPageName === 'FinancialDashboard' && (
                      <motion.div animate={iconAnimation} transition={transition}>
                        <Button variant="ghost" size="icon" onClick={handleToggleLayoutEdit} title="Edit Layout">
                          <Edit className="h-5 w-5"/>
                        </Button>
                      </motion.div>
                    )}

                    <div className="relative flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        onMouseDown={handleThemeMouseDown}
                        onMouseUp={handleThemeMouseUp}
                        onMouseLeave={handleThemeMouseUp}
                        title="Click to toggle light/dark, long-press for all themes"
                      >
                        {getThemeIcon()}
                      </Button>

                      <AnimatePresence>
                        {showThemeOptions && (
                          <motion.div
                            initial={{ opacity: 0, x: 30, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 30, scale: 0.8 }}
                            transition={{ duration: 0.4, ease: "backOut" }}
                            className="absolute top-full right-0 mt-2 w-max p-2 bg-card border rounded-lg shadow-lg flex items-center space-x-2"
                            onMouseLeave={() => setShowThemeOptions(false)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon" onClick={() => { setTheme('light'); setShowThemeOptions(false); }} className="h-9 w-9" title="Light Theme">
                              <Sun className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setTheme('dark'); setShowThemeOptions(false); }} className="h-9 w-9" title="Dark Theme">
                              <Moon className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setTheme('sofi'); setShowThemeOptions(false); }} className="h-9 w-9" title="SoFi Theme">
                              <Droplets className="w-4 h-4" />
                            </Button>
                            {customThemes.map(ct => (
                              <Button 
                                key={ct.id}
                                variant="ghost" 
                                size="icon" 
                                onClick={() => activateCustomTheme(ct)}
                                className="h-9 w-9" 
                                title={ct.name}
                              >
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              </Button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <motion.div animate={iconAnimation} transition={transition}>
                      <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="edit-icons"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center space-x-2"
                  >
                    <Button variant="outline" size="sm" onClick={handleCancelLayout}>
                      <X className="w-4 h-4 mr-2"/>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveLayout} className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2"/>
                      Save Layout
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow w-full">
        {children}
      </main>
    </div>
  );
}

