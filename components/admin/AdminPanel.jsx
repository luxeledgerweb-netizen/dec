
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added for input fields
import { Label } from "@/components/ui/label"; // Added for input labels
import { Palette, ListOrdered, ImagePlus, Settings2 } from "lucide-react";

// New imports from the outline
import { localDb } from '@/components/utils/LocalDb';
import LoginScreenCustomizerModal from './LoginScreenCustomizerModal';
import { SessionManager } from '@/components/utils/SessionManager';

import ThemeBuilderModal from './ThemeBuilderModal';
import AccountUpdateOrder from './AccountUpdateOrder';
import InstitutionIconManager from './InstitutionIconManager';
import DashboardCustomizer from './DashboardCustomizer';

export default function AdminPanel({ appSettings, onSettingChange, onAppSettingChange }) {
  const [showThemeBuilder, setShowThemeBuilder] = useState(false);
  const [showIconManager, setShowIconManager] = useState(false);
  const [showUpdateOrder, setShowUpdateOrder] = useState(false);
  const [showDashboardCustomizer, setShowDashboardCustomizer] = useState(false);
  // Inferred states for Global App Settings (from outline's usage)
  const [appName, setAppName] = useState('');
  const [appSubtitle, setAppSubtitle] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  // New states from the outline
  const [sessionTimeout, setSessionTimeout] = useState(0);
  const [showLoginCustomizer, setShowLoginCustomizer] = useState(false);

  useEffect(() => {
    // Sync state with appSettings prop
    setAppName(appSettings.appName || '');
    setAppSubtitle(appSettings.appSubtitle || '');
    setMasterPassword(appSettings.masterPassword || '');
    setSessionTimeout(appSettings.sessionTimeout || 0);
  }, [appSettings]);

  const handleSaveChanges = () => {
    // Call onSettingChange for each global setting
    onSettingChange('appName', appName);
    onSettingChange('appSubtitle', appSubtitle);
    onSettingChange('masterPassword', masterPassword);
    onSettingChange('sessionTimeout', sessionTimeout);
    alert('Global settings saved!');
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real application, you would typically upload this file
      // to a storage service and then save its URL/path in appSettings.
      // For this example, we'll just log it.
      console.log('Selected logo file:', file.name);
      // Example: If you had a way to convert to URL and save
      // onSettingChange('appLogoUrl', URL.createObjectURL(file));
      alert('Logo selected. (Further implementation needed for upload and persistence)');
    }
  };

  return (
    <>
      {/* Global App Settings Card (Inferred from outline's state management) */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Global App Settings
          </CardTitle>
          <CardDescription>
            Configure core application details, security, and session management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Application Name */}
          <div className="space-y-2">
            <Label htmlFor="appName">Application Name</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Your App Name"
            />
          </div>
          {/* Application Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="appSubtitle">Application Subtitle</Label>
            <Input
              id="appSubtitle"
              value={appSubtitle}
              onChange={(e) => setAppSubtitle(e.target.value)}
              placeholder="A brief tagline"
            />
          </div>
          {/* Master Password */}
          <div className="space-y-2">
            <Label htmlFor="masterPassword">Master Password (for sensitive actions)</Label>
            <Input
              id="masterPassword"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Set a master password"
            />
            <p className="text-xs text-muted-foreground">Used for protected actions within the admin panel.</p>
          </div>
          {/* Session Timeout */}
          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10) || 0)}
              placeholder="e.g., 30"
            />
            <p className="text-xs text-muted-foreground">Set to 0 for no timeout (not recommended for security).</p>
          </div>
          {/* Application Logo Upload */}
          <div className="space-y-2">
            <Label htmlFor="appLogo">Application Logo</Label>
            <Input
              id="appLogo"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
            />
            <p className="text-xs text-muted-foreground">Upload a custom logo for your application's header.</p>
          </div>
          <Button onClick={handleSaveChanges}>Save Global Settings</Button>
        </CardContent>
      </Card>

      {/* Dashboard & App Customization Card (Existing content) */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Dashboard & App Customization
          </CardTitle>
          <CardDescription>
            Fine-tune the appearance and behavior of your financial dashboard and application.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Button onClick={() => setShowDashboardCustomizer(true)} variant="outline" className="justify-start text-left h-auto py-3">
            <div className="flex items-start gap-3">
              <Settings2 className="w-5 h-5 mt-1" />
              <div>
                <p className="font-semibold">Dashboard Settings</p>
                <p className="text-xs text-muted-foreground">Customize dashboard modules, alerts, and animations.</p>
              </div>
            </div>
          </Button>

          <Button onClick={() => setShowThemeBuilder(true)} variant="outline" className="justify-start text-left h-auto py-3">
            <div className="flex items-start gap-3">
              <Palette className="w-5 h-5 mt-1" />
              <div>
                <p className="font-semibold">Theme Studio</p>
                <p className="text-xs text-muted-foreground">Create and manage custom color themes for the app.</p>
              </div>
            </div>
          </Button>

          <Button onClick={() => setShowUpdateOrder(true)} variant="outline" className="justify-start text-left h-auto py-3">
            <div className="flex items-start gap-3">
              <ListOrdered className="w-5 h-5 mt-1" />
              <div>
                <p className="font-semibold">Account Update Order</p>
                <p className="text-xs text-muted-foreground">Set a custom order for updating account balances.</p>
              </div>
            </div>
          </Button>

          <Button onClick={() => setShowIconManager(true)} variant="outline" className="justify-start text-left h-auto py-3">
            <div className="flex items-start gap-3">
              <ImagePlus className="w-5 h-5 mt-1" />
              <div>
                <p className="font-semibold">Institution Icons</p>
                <p className="text-xs text-muted-foreground">Manage custom icons for your financial institutions.</p>
              </div>
            </div>
          </Button>

          {/* New Button for Login Screen Customizer */}
          <Button onClick={() => setShowLoginCustomizer(true)} variant="outline" className="justify-start text-left h-auto py-3">
            <div className="flex items-start gap-3">
              <Palette className="w-5 h-5 mt-1" /> {/* Using Palette icon, could be another relevant icon */}
              <div>
                <p className="font-semibold">Login Screen Customizer</p>
                <p className="text-xs text-muted-foreground">Customize the appearance of the login and signup screens.</p>
              </div>
            </div>
          </Button>

        </CardContent>
      </Card>

      {/* Existing Modals */}
      {showThemeBuilder && <ThemeBuilderModal isOpen={showThemeBuilder} onClose={() => setShowThemeBuilder(false)} />}
      {showIconManager && <InstitutionIconManager isOpen={showIconManager} onClose={() => setShowIconManager(false)} />}
      {showUpdateOrder && <AccountUpdateOrder isOpen={showUpdateOrder} onClose={() => setShowUpdateOrder(false)} />}
      {showDashboardCustomizer && <DashboardCustomizer isOpen={showDashboardCustomizer} onClose={() => setShowDashboardCustomizer(false)} />}

      {/* New Modal for Login Screen Customizer */}
      {showLoginCustomizer && <LoginScreenCustomizerModal isOpen={showLoginCustomizer} onClose={() => setShowLoginCustomizer(false)} />}
    </>
  );
}
