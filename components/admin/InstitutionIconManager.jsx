import React, { useState, useMemo } from 'react';
import { localDb } from '@/components/utils/LocalDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Trash2, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InstitutionIconManager({ onUpdate }) {
  const [appSettings, setAppSettings] = useState(() => localDb.list('AppSettings')[0] || {});
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');

  const customIcons = useMemo(() => {
    const icons = appSettings.institutionFavicons || {};
    // Filter out account/card assignments, only show actual uploaded icons
    return Object.fromEntries(
      Object.entries(icons).filter(([key, value]) => 
        key.startsWith('custom_') && value.name && value.url
      )
    );
  }, [appSettings]);

  const accounts = useMemo(() => localDb.list('Account') || [], []);
  const creditCards = useMemo(() => localDb.list('CreditCard') || [], []);
  
  const allItems = useMemo(() => [
  ...accounts.map(a => ({ id: `account-${a.id}`, name: a.name, type: 'Account' })),
  ...creditCards.map(c => ({ id: `card-${c.id}`, name: c.name, type: 'Credit Card' })),
  ], [accounts, creditCards]);

  const currentAssignments = useMemo(() => {
    const assignments = [];
    const icons = appSettings.institutionFavicons || {};
    
    allItems.forEach(item => {
      if (icons[item.id]) {
        assignments.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          iconName: icons[item.id].name,
          iconUrl: icons[item.id].url
        });
      }
    });
    
    return assignments;
  }, [appSettings, allItems]);

const ensureSettings = () => {
  let s = localDb.list('AppSettings')[0];
  if (!s) {
    s = { id: 'settings', institutionFavicons: {} };
    localDb.create('AppSettings', s);
  }
  return s;
};

  const handleIconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please upload a valid image file.' });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 32; // keep 32px; see the “retina” tip below if you want 64px too
	  canvas.width = size;
	  canvas.height = size;
	  const ctx = canvas.getContext('2d');

	  // High-quality scaling
	  ctx.imageSmoothingEnabled = true;
	  ctx.imageSmoothingQuality = 'high';
	  ctx.clearRect(0, 0, size, size);

	  // cover-fit math
	  const iw = img.naturalWidth || img.width;
	  const ih = img.naturalHeight || img.height;
	  const scale = Math.max(size / iw, size / ih);
	  const w = Math.round(iw * scale);
	  const h = Math.round(ih * scale);
	  const dx = Math.round((size - w) / 2);
	  const dy = Math.round((size - h) / 2);

	  ctx.drawImage(img, dx, dy, w, h);

	  const dataUrl = canvas.toDataURL('image/png'); // keeps transparency

          const iconKey = `custom_${Date.now()}`;
          const fileName = file.name.replace(/\.[^/.]+$/, "");
          const newIcon = { name: fileName, url: dataUrl, uploadDate: new Date().toISOString() };

          let currentAppSettings = localDb.list('AppSettings')[0];
          if (!currentAppSettings) {
            currentAppSettings = { id: 'settings', institutionFavicons: {} };
            localDb.create('AppSettings', currentAppSettings);
          }
          
          const updatedIcons = { ...(currentAppSettings.institutionFavicons || {}), [iconKey]: newIcon };
          localDb.update('AppSettings', currentAppSettings.id, { institutionFavicons: updatedIcons });

          setAppSettings(localDb.list('AppSettings')[0]);
          setFeedback({ type: 'success', message: `Icon "${fileName}" uploaded successfully.` });
          
          if (typeof onUpdate === 'function') {
            onUpdate();
          }
        };
        img.onerror = () => {
          setFeedback({ type: 'error', message: 'Could not load image.' });
        };
        img.src = event.target.result;
      };
      reader.onerror = () => {
        setFeedback({ type: 'error', message: 'Failed to read file.' });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading icon:", error);
      setFeedback({ type: 'error', message: 'Failed to upload icon.' });
    }
    
    e.target.value = '';
  };

  const handleAssignIcon = () => {
    if (!selectedAccount || !selectedIcon) {
      setFeedback({ type: 'error', message: 'Please select both an account and an icon.' });
      return;
    }
    
    const currentSettings = ensureSettings();
    const iconData = currentSettings.institutionFavicons?.[selectedIcon];

    const updatedFavicons = {
      ...(currentSettings.institutionFavicons || {}),
      [selectedAccount]: iconData,
    };

    localDb.update('AppSettings', currentSettings.id, {
      institutionFavicons: updatedFavicons,
    });
    
    setAppSettings(localDb.list('AppSettings')[0]);
    setSelectedAccount('');
    setSelectedIcon('');
    setFeedback({ type: 'success', message: 'Icon assigned successfully.' });
    if (typeof onUpdate === 'function') {
      onUpdate();
    }
  };

  const handleDeleteAssignment = (itemId) => {
    if (confirm('Are you sure you want to remove this icon assignment?')) {
  const currentSettings = ensureSettings();
  const updatedFavicons = { ...(currentSettings.institutionFavicons || {}) };
  delete updatedFavicons[itemId];

  localDb.update('AppSettings', currentSettings.id, {
    institutionFavicons: updatedFavicons,
  });

  setAppSettings(localDb.list('AppSettings')[0]);
  setFeedback({ type: 'success', message: 'Icon assignment removed. Original favicon restored if available.' });
  onUpdate?.();
}
  };

const handleDeleteIcon = (iconKey) => {
  if (!confirm('Are you sure you want to delete this icon? This will also remove it from any assigned accounts.')) {
    return;
  }

  const currentSettings = ensureSettings();
  const updatedFavicons = { ...(currentSettings.institutionFavicons || {}) };

  // 1) Capture the icon we’re deleting BEFORE removing it
  const removedIcon = updatedFavicons[iconKey];
  if (!removedIcon) {
    // Nothing to delete (already gone)
    return;
  }

  // 2) Remove the uploaded icon entry
  delete updatedFavicons[iconKey];

  // 3) Remove any assignments that pointed to this icon (compare by URL)
  for (const k of Object.keys(updatedFavicons)) {
    const v = updatedFavicons[k];
    // keep other custom_* entries; only clear account/card/sub assignments
    const isAssignmentKey = !k.startsWith('custom_');
    if (isAssignmentKey && v?.url === removedIcon.url) {
      delete updatedFavicons[k];
    }
  }

  // 4) Persist
  localDb.update('AppSettings', currentSettings.id, { institutionFavicons: updatedFavicons });

  setAppSettings(localDb.list('AppSettings')[0]);
  setFeedback({ type: 'success', message: 'Icon deleted and assignments removed. Original favicons restored where available.' });
  onUpdate?.();
};

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Manage Account Icons
        </CardTitle>
        <CardDescription>
          Upload custom icons and assign them to your accounts, and credit cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {feedback.message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="text-sm">{feedback.message}</span>
          </div>
        )}

        {/* Upload Custom Icon Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Upload Custom Icon</h3>
          <div className="space-y-2">
            <Label htmlFor="icon-upload">Choose File</Label>
            <Input
              id="icon-upload"
              type="file"
              accept="image/*"
              onChange={handleIconUpload}
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Assign Icon Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Assign Icon to Accounts, or Credit Cards</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Account/Card</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose account or card..." />
                </SelectTrigger>
                <SelectContent>
                  {allItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Icon</Label>
              <Select value={selectedIcon} onValueChange={setSelectedIcon}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose icon..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(customIcons).map(([key, iconData]) => (
                    <SelectItem key={key} value={key}>
                      {iconData.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAssignIcon} disabled={!selectedAccount || !selectedIcon}>
            Assign Icon to Selected Items
          </Button>
        </div>

        {/* Current Icon Assignments */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Current Icon Assignments</h3>
          {currentAssignments.length > 0 ? (
            <div className="space-y-2">
              {currentAssignments.map((assignment) => (
                <div key={assignment.itemId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={assignment.iconUrl} alt="Icon" className="w-8 h-8 rounded object-contain bg-gray-100" />
                    <div>
                      <p className="font-medium">{assignment.itemName} ({assignment.itemType})</p>
                      <p className="text-sm text-gray-600">Icon: {assignment.iconName}</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAssignment(assignment.itemId)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No custom icon assignments found.</p>
          )}
        </div>

        {/* Uploaded Icons Section */}
        {Object.keys(customIcons).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Uploaded Icons</h3>
            <div className="grid gap-3">
              {Object.entries(customIcons).map(([key, iconData]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={iconData.url} alt="Custom icon" className="w-8 h-8 rounded object-contain bg-gray-100" />
                    <div>
                      <p className="font-medium">{iconData.name}</p>
                      <p className="text-xs text-gray-500">Uploaded on {new Date(iconData.uploadDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteIcon(key)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}