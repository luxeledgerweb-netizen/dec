
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { localDb } from '@/components/utils/LocalDb';
import { Save, X, Trash2, Edit, PlusCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

// Debounce helper function
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// Default theme state helper
const getDefaultThemeState = () => ({
  themeName: 'My Custom Theme',
  colors: {
    background: '#ffffff',
    foreground: '#09090b',
    primary: '#18181b',
    primaryForeground: '#fafafa',
    secondaryText: '#71717a',
    headingColor: '#18181b',
    tileColor: '#f4f4f5',
    tileTextColor: '#333333'
  }
});

export default function ThemeBuilderModal({ isOpen, onClose, onSaveTheme }) {
  const [view, setView] = useState('list'); // 'list' or 'builder'
  const [themeName, setThemeName] = useState('');
  const [colors, setColors] = useState({});
  const [savedThemes, setSavedThemes] = useState([]);
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [activeThemeId, setActiveThemeId] = useState(null);

  const loadSavedThemes = useCallback(() => {
    const themes = localDb.list('CustomThemes');
    setSavedThemes(themes);
    const activeTheme = localDb.getItem('activeAppThemeColors');
    if (activeTheme && activeTheme.id) {
      setActiveThemeId(activeTheme.id);
    } else {
      setActiveThemeId(null);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView('list');
      loadSavedThemes();
    }
  }, [isOpen, loadSavedThemes]);

  // --- Builder View Logic ---
  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  // This debounced function is no longer explicitly called in renderBuilderView with the new color picker inputs.
  // It remains here but is not used in the updated builder section.
  const debouncedColorChange = useCallback(debounce(handleColorChange, 200), []);

  const handleSaveAndExitBuilder = () => {
    if (!themeName.trim()) {
      alert('Please enter a theme name.');
      return;
    }
    const themeToSave = {
      id: editingThemeId || crypto.randomUUID(),
      name: themeName,
      ...colors
    };
    if (editingThemeId) {
      localDb.update('CustomThemes', editingThemeId, themeToSave);
    } else {
      localDb.create('CustomThemes', themeToSave);
    }
    loadSavedThemes();
    setView('list');
    if (onSaveTheme) onSaveTheme();
  };

  const handleCancelBuilder = () => {
    setView('list');
  };

  // --- List View Logic ---
  const handleActivateTheme = (theme) => {
    localDb.setItem('activeAppThemeColors', theme);
    setActiveThemeId(theme.id);
    if (onSaveTheme) onSaveTheme(); // This triggers the global theme update
  };
  
  const handleDeleteTheme = (themeId) => {
    if (confirm('Are you sure you want to delete this theme?')) {
      localDb.delete('CustomThemes', themeId);
      if (activeThemeId === themeId) {
        localDb.remove('activeAppThemeColors');
        setActiveThemeId(null);
        if (onSaveTheme) onSaveTheme();
      }
      loadSavedThemes();
    }
  };

  const handleStartEdit = (theme) => {
    setEditingThemeId(theme.id);
    setThemeName(theme.name);
    setColors({
      background: theme.background,
      foreground: theme.foreground,
      primary: theme.primary,
      primaryForeground: theme.primaryForeground,
      secondaryText: theme.secondaryText,
      headingColor: theme.headingColor,
      tileColor: theme.tileColor,
      tileTextColor: theme.tileTextColor
    });
    setView('builder');
  };

  const handleStartCreate = () => {
    setEditingThemeId(null);
    const { themeName: defaultName, colors: defaultColors } = getDefaultThemeState();
    setThemeName(defaultName);
    setColors(defaultColors);
    setView('builder');
  };

  const renderBuilderView = () => (
    <>
      <DialogHeader>
        <DialogTitle>{editingThemeId ? 'Edit Theme' : 'Create New Theme'}</DialogTitle>
        <DialogDescription>
          Adjust the colors and see a live preview below. Changes are applied when you save.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 flex-grow overflow-y-auto pr-4 -mr-4 py-4">
        {/* Theme Name Input */}
        <div className="space-y-2">
          <Label htmlFor="theme-name">Theme Name</Label>
          <Input id="theme-name" value={themeName} onChange={(e) => setThemeName(e.target.value)} placeholder="e.g., Sunset Gold" />
        </div>

        {/* Color Pickers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {Object.entries(colors).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
              <Input
                id={key}
                type="color"
                value={value || '#000000'}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="w-24 p-1 h-10"
              />
            </div>
          ))}
        </div>

        {/* Live Preview */}
        <div className="space-y-2 pt-4">
          <Label>Live Preview</Label>
          <div 
            className="rounded-lg border p-4 transition-colors duration-200 space-y-4"
            style={{
              backgroundColor: colors.background,
              borderColor: `color-mix(in srgb, ${colors.foreground || '#000000'} 20%, transparent)`
            }}
          >
            <h3 style={{ color: colors.headingColor }} className="text-lg font-semibold">Live Preview Title</h3>
            <p style={{ color: colors.secondaryText }}>This is secondary text, like a description.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card style={{ backgroundColor: colors.tileColor, color: colors.tileTextColor }}>
                <CardHeader>
                  <CardTitle>Sample Tile</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>This is a tile to preview background and text colors.</p>
                </CardContent>
              </Card>
              <div className="flex flex-col space-y-2">
                <Button style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>Primary Button</Button>
                <Button variant="secondary" style={{ color: colors.foreground }}>Secondary</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <DialogFooter className="dialog-footer-mobile-stack">
        <Button variant="outline" onClick={handleCancelBuilder}><X className="w-4 h-4 mr-2" /> Cancel</Button>
        <Button onClick={handleSaveAndExitBuilder}><Save className="w-4 h-4 mr-2" /> Save Theme</Button>
      </DialogFooter>
    </>
  );

  const renderListView = () => (
    <>
      <DialogHeader>
        <DialogTitle>Theme Customization</DialogTitle>
        <DialogDescription>
          Manage your saved themes or create a new one. The active theme is used when you select the 'Custom' option in the header.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4 flex-grow flex flex-col">
        <Button onClick={handleStartCreate} className="w-full">
          <PlusCircle className="w-4 h-4 mr-2" />
          Create New Theme
        </Button>
        <div className="border-t my-4"></div>
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4 -mr-4">
            <div className="space-y-2">
              {savedThemes.length > 0 ? savedThemes.map(theme => (
                <Card key={theme.id} className="p-3 flex items-center justify-between">
                  <p className="font-medium">{theme.name}</p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleActivateTheme(theme)}
                      disabled={activeThemeId === theme.id}
                      variant={activeThemeId === theme.id ? 'secondary' : 'default'}
                    >
                      {activeThemeId === theme.id ? <CheckCircle className="w-4 h-4 mr-0 sm:mr-2"/> : null}
                      <span className={activeThemeId === theme.id ? 'hidden sm:inline' : 'inline'}>
                        {activeThemeId === theme.id ? 'Activated' : 'Activate'}
                      </span>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleStartEdit(theme)} title="Edit"><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteTheme(theme.id)} className="text-red-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground pt-8">No custom themes saved yet.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      <DialogFooter className="mt-auto">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialog-responsive sm:max-w-2xl max-h-[90vh] flex flex-col">
        {view === 'list' ? renderListView() : renderBuilderView()}
      </DialogContent>
    </Dialog>
  );
}
