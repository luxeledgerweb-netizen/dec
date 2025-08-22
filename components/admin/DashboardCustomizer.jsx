import React, { useState, useEffect } from 'react';
import { localDb } from '@/components/utils/LocalDb';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, LayoutDashboard, CreditCard, Landmark, BellRing } from "lucide-react";

export default function DashboardCustomizer({ onUpdate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (isModalOpen) {
      const currentSettings = localDb.list('AppSettings')[0] || {};
      setSettings(currentSettings);
    }
  }, [isModalOpen]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const currentSettings = localDb.list('AppSettings')[0];
    if (currentSettings) {
      localDb.update('AppSettings', currentSettings.id, settings);
    } else {
      localDb.create('AppSettings', { id: 'settings', ...settings });
    }
    
    if (typeof onUpdate === 'function') {
      onUpdate();
    }
    window.dispatchEvent(new Event('settingsChanged'));
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="flex justify-center">
        <Button onClick={() => setIsModalOpen(true)} variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Customize Dashboard Layout
        </Button>
      </div>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto theme-studio-mobile">
          <DialogHeader>
            <DialogTitle>Customize Dashboard Layout</DialogTitle>
            <DialogDescription>
              Tailor the dashboard layout and settings to your preference.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="display"><LayoutDashboard className="w-4 h-4 mr-2" />Display</TabsTrigger>
              <TabsTrigger value="cards"><CreditCard className="w-4 h-4 mr-2" />Cards</TabsTrigger>
              <TabsTrigger value="accounts"><Landmark className="w-4 h-4 mr-2" />Accounts</TabsTrigger>
              <TabsTrigger value="reminders"><BellRing className="w-4 h-4 mr-2" />Reminders</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 p-1">
              <TabsContent value="display">
                <p className="text-sm text-muted-foreground mb-4">Customize how information is displayed on your main dashboard.</p>
                <div className="space-y-4">
                  <SettingToggle
                      id="compactCardView"
                      label="Compact Card View"
                      description="Use a more compact layout for account and credit card displays"
                      checked={settings.compactCardView ?? false}
                      onCheckedChange={(checked) => handleSettingChange('compactCardView', checked)}
                  />
                  <SettingToggle
                      id="showDashboardGreeting"
                      label="Show Dashboard Greetings"
                      description="Display personalized greeting message on the dashboard"
                      checked={settings.showDashboardGreeting ?? true}
                      onCheckedChange={(checked) => handleSettingChange('showDashboardGreeting', checked)}
                  />
                   <SettingToggle
                      id="showAccountFavicons"
                      label="Show Account Favicons"
                      description="Display institution icons next to account names"
                      checked={settings.showAccountFavicons ?? true}
                      onCheckedChange={(checked) => handleSettingChange('showAccountFavicons', checked)}
                  />
                  <SettingToggle
                      id="hideZeroBalances"
                      label="Hide $0 Balances"
                      description="Hide accounts with zero balances from the dashboard"
                      checked={settings.hideZeroBalances ?? false}
                      onCheckedChange={(checked) => handleSettingChange('hideZeroBalances', checked)}
                  />
                  <SettingToggle
                      id="roundNumbers"
                      label="Round Numbers"
                      description="Round all dollar amounts to the nearest dollar"
                      checked={settings.roundNumbers ?? false}
                      onCheckedChange={(checked) => handleSettingChange('roundNumbers', checked)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="cards">
                <p className="text-sm text-muted-foreground mb-4">Configure your credit card display preferences.</p>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="creditCardSorting">Credit Card Sorting</Label>
                    <Select
                      value={settings.creditCardSorting ?? 'recent'}
                      onValueChange={(value) => handleSettingChange('creditCardSorting', value)}
                    >
                      <SelectTrigger id="creditCardSorting">
                        <SelectValue placeholder="Choose how credit cards are ordered..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Recently Used</SelectItem>
                        <SelectItem value="limit">By Credit Limit</SelectItem>
                        <SelectItem value="expiration">By Expiration Date</SelectItem>
                        <SelectItem value="institution">By Institution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="unusedCardThresholdMonths">Unused Card Alert Threshold</Label>
                    <Input
                      id="unusedCardThresholdMonths"
                      type="number"
                      step="0.1"
                      value={settings.unusedCardThresholdMonths ?? ''}
                      onChange={(e) => handleSettingChange('unusedCardThresholdMonths', e.target.value === '' ? null : parseFloat(e.target.value))}
                      className="w-full"
                      placeholder="Default: 6.0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Alert when cards haven’t been used for this many months.</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="accounts">
                <p className="text-sm text-muted-foreground mb-4">Set how your accounts are sorted by default.</p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="accountSort">Account Sorting</Label>
                    <Select
                      value={settings.accountSort ?? 'default'}
                      onValueChange={(value) => handleSettingChange('accountSort', value)}
                    >
                      <SelectTrigger id="accountSort">
                        <SelectValue placeholder="Set the default sorting order..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Recently Updated</SelectItem>
                        <SelectItem value="institution">By Institution</SelectItem>
                        <SelectItem value="account_type">By Account Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="reminders">
                <p className="text-sm text-muted-foreground mb-4">Manage how reminders are displayed on the dashboard.</p>
                <div className="space-y-4">
                  <SettingToggle
                      id="showAllReminders"
                      label="Show All Reminders"
                      description="Display all reminders, not just those due soon"
                      checked={settings.showAllReminders ?? false}
                      onCheckedChange={(checked) => handleSettingChange('showAllReminders', checked)}
                  />
                  <SettingToggle
                      id="showSubscriptionLogos"
                      label="Show Subscription Logos"
                      description="Display company logos for subscription reminders"
                      checked={settings.showSubscriptionLogos ?? true}
                      onCheckedChange={(checked) => handleSettingChange('showSubscriptionLogos', checked)}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const SettingToggle = ({ id, label, description, checked, onCheckedChange }) => (
    <div className="flex items-start justify-between rounded-lg border p-3 shadow-sm transition-all hover:bg-muted/50">
        <div className="space-y-0.5">
            <Label htmlFor={id} className="text-base font-medium cursor-pointer">{label}</Label>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
        />
    </div>
);