
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2 } from 'lucide-react';
import { localDb } from '@/components/utils/LocalDb';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch'; // <-- New import

export default function LoginScreenCustomizerModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    loginDisplayName: '',
    loginScreenTips: [],
    loginScreenQuote: '',
    useShieldIconOnLogin: false, // <-- New state
  });

  useEffect(() => {
    if (isOpen) {
      const adminSettings = localDb.list('AdminSettings')[0] || {};
      setSettings({
        loginDisplayName: adminSettings.loginDisplayName || '',
        loginScreenTips: adminSettings.loginScreenTips || [],
        loginScreenQuote: adminSettings.loginScreenQuote || '',
        useShieldIconOnLogin: adminSettings.useShieldIconOnLogin || false, // <-- Load new setting
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    const adminSettings = localDb.list('AdminSettings')[0] || {};
    localDb.update('AdminSettings', adminSettings.id || 'admin', settings);
    onClose();
  };

  const handleTipChange = (index, value) => {
    const newTips = [...settings.loginScreenTips];
    newTips[index] = value;
    setSettings({ ...settings, loginScreenTips: newTips });
  };

  const addTip = () => {
    setSettings({ ...settings, loginScreenTips: [...settings.loginScreenTips, ''] });
  };

  const removeTip = (index) => {
    const newTips = settings.loginScreenTips.filter((_, i) => i !== index);
    setSettings({ ...settings, loginScreenTips: newTips });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Login Screen</DialogTitle>
          <DialogDescription>
            Personalize the greeting, tips, and quotes that appear on your secure login page.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Greeting Name</Label>
              <Input
                id="displayName"
                value={settings.loginDisplayName}
                onChange={(e) => setSettings({ ...settings, loginDisplayName: e.target.value })}
                placeholder="e.g., Dacota, Captain"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="shield-icon-toggle" className="text-base">Use Default Shield Icon</Label>
                  <p className="text-sm text-muted-foreground">
                    Show the animated shield on the login screen, even if you have a custom logo.
                  </p>
                </div>
                <Switch
                  id="shield-icon-toggle"
                  checked={settings.useShieldIconOnLogin}
                  onCheckedChange={(checked) => setSettings({ ...settings, useShieldIconOnLogin: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Randomized Login Tips</Label>
              <div className="space-y-2">
                {settings.loginScreenTips.map((tip, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={tip}
                      onChange={(e) => handleTipChange(index, e.target.value)}
                      placeholder="Enter a fun fact or helpful tip"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeTip(index)} className="shrink-0">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addTip} className="mt-2">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Tip
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote">Financial Wisdom Quote</Label>
              <Textarea
                id="quote"
                value={settings.loginScreenQuote}
                onChange={(e) => setSettings({ ...settings, loginScreenQuote: e.target.value })}
                placeholder="Enter an inspirational quote"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
