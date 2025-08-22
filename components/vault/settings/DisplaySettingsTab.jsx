import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DisplaySettingsTab({ settings, onSettingChange }) {
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="compact-view" className="flex flex-col gap-1">
              <span>List View</span>
              <span className="font-normal text-sm text-muted-foreground">Display vault items in a compact vertical list instead of cards.</span>
            </Label>
            <Switch
              id="compact-view"
              checked={settings.compactView || false}
              onCheckedChange={(checked) => onSettingChange('compactView', checked)}
            />
          </div>
      </div>
      <div className="p-4 border rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="default-sort">Default Sort Order</Label>
            <Select
              value={settings.defaultSortOrder || 'name_asc'}
              onValueChange={(value) => onSettingChange('defaultSortOrder', value)}
            >
              <SelectTrigger id="default-sort" className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="most_used">Most Used</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </div>
    </div>
  );
}