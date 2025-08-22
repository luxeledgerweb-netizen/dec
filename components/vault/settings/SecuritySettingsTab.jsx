import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';

export default function SecuritySettingsTab({ settings, onSettingChange, showSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Permanently disabled - no toggle functionality
  const handlePasswordProtectionToggle = () => {
    // Do nothing - permanently disabled
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-4">
          <Label className="flex flex-col gap-1 opacity-60">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Enable Vault Password Protection
              <Lock className="w-3 h-3 text-gray-400" />
            </span>
            <span className="font-normal text-sm text-muted-foreground">
              This option is currently locked and cannot be re-enabled.
            </span>
          </Label>
          <Switch
            checked={false}
            disabled={true}
            className="opacity-50 cursor-not-allowed"
            title="This option is currently locked and cannot be re-enabled."
          />
        </div>

        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Password protection has been disabled for this vault. This setting cannot be changed at this time.
          </AlertDescription>
        </Alert>
      </div>

      <div className="p-4 border rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="auto-logout">Auto-logout Timer</Label>
          <Select
            value="0"
            disabled={true}
            className="opacity-50"
          >
            <SelectTrigger id="auto-logout" className="max-w-xs cursor-not-allowed">
              <SelectValue placeholder="Never (disabled)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Never</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Auto-logout is disabled when password protection is off.</p>
        </div>
      </div>
    </div>
  );
}