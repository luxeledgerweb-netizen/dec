
import React, { useState, useEffect } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Eye, EyeOff, RefreshCw, Copy, Trash2 } from "lucide-react";
import { EncryptionHelper } from "@/components/utils/EncryptionHelper";
import { fetchAndEncodeFavicon } from "@/components/utils/faviconUtils";


export default function AddPasswordModal({ isOpen, onClose, onSave, editingPassword = null, masterPassword }) {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    username: '',
    email: '',
    password: '',
    tags: [],
    notes: '',
    is_bank_account: false,
    routing_number: '',
    account_numbers: [],
    stored_favicon: null
  });

  const [showPassword, setShowPassword] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingPassword) {
        setFormData({
          name: editingPassword.name || '',
          website: editingPassword.website || '',
          username: editingPassword.username || '',
          email: editingPassword.email || '',
          password: editingPassword.password || '',
          tags: editingPassword.tags || [],
          notes: editingPassword.notes || '',
          is_bank_account: editingPassword.is_bank_account || false,
          routing_number: editingPassword.routing_number || '',
          account_numbers: editingPassword.account_numbers || [],
          stored_favicon: editingPassword.stored_favicon || null
        });
      } else {
        // Reset form for "Add New"
        setFormData({
          name: '', website: '', username: '', email: '', password: '',
          tags: [], notes: '', is_bank_account: false, routing_number: '', account_numbers: [],
          stored_favicon: null
        });
      }
      setShowPassword(false);
      setNewTag('');
    }
  }, [isOpen, editingPassword]);

  const generatePassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addAccountNumber = () => {
    setFormData(prev => ({
      ...prev,
      account_numbers: [...prev.account_numbers, { account_number: '', account_type: 'checking' }]
    }));
  };

  const updateAccountNumber = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      account_numbers: prev.account_numbers.map((acc, i) =>
        i === index ? { ...acc, [field]: value } : acc
      )
    }));
  };

  const removeAccountNumber = (index) => {
    setFormData(prev => ({
      ...prev,
      account_numbers: prev.account_numbers.filter((_, i) => i !== index)
    }));
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return 'weak';
    if (password.length < 8) return 'weak';
    if (password.length < 12) return 'fair';
    if (password.length < 16) return 'good';
    return 'strong';
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (isSaving) return;
  setIsSaving(true);

  try {
	// Get favicon the same way the Financial Dashboard does (Base64, offline-friendly)
	let storedFavicon = editingPassword?.stored_favicon || null;
	if (formData.website && (!editingPassword || formData.website !== editingPassword.website)) {
	  try {
	    storedFavicon = await fetchAndEncodeFavicon(formData.website);
	  } catch {
	    storedFavicon = null;
	  }
	}

    // Encrypt (unchanged)
    const encryptAsync = (value) => {
      if (!value) return Promise.resolve(null);
      if (!masterPassword) return Promise.resolve(value);
      return EncryptionHelper.encrypt(value, masterPassword);
    };

    const encryptedFormData = {
      name: await encryptAsync(formData.name),
      website: await encryptAsync(formData.website),
      username: await encryptAsync(formData.username),
      email: await encryptAsync(formData.email),
      password: await encryptAsync(formData.password),
      notes: await encryptAsync(formData.notes),
      routing_number: await encryptAsync(formData.routing_number),
      tags: formData.tags ? await Promise.all(formData.tags.map(tag => encryptAsync(tag))) : [],
      account_numbers: formData.account_numbers
        ? await Promise.all(formData.account_numbers.map(async acc => ({
            account_number: await encryptAsync(acc.account_number),
            account_type: acc.account_type
          })))
        : [],
    };

	const passwordData = {
	  ...formData,
	  ...encryptedFormData,
	  stored_favicon: storedFavicon,            // Vault field
	  default_favicon_base64: storedFavicon,    // Dashboard-style field (helps keep things consistent)
	  password_strength: calculatePasswordStrength(formData.password),
	  last_used: new Date().toISOString()
	};

    if (editingPassword) {
      await localDb.update('PasswordCredential', editingPassword.id, passwordData);
    } else {
      await localDb.create('PasswordCredential', passwordData);
    }

    onSave();
    onClose();
  } catch (err) {
    console.error('Save failed:', err);
  } finally {
    setIsSaving(false);
  }
};

  const handleDelete = () => {
    if (editingPassword) {
      const confirmDelete = confirm(`Are you sure you want to delete "${editingPassword.name}"? This action cannot be undone.`);
      if (confirmDelete) {
        localDb.delete('PasswordCredential', editingPassword.id);
        onSave();
        onClose();
      }
    }
  };

  const suggestedTags = ['banking', 'social', 'shopping', 'work', 'personal', 'streaming', 'gaming'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">{editingPassword ? 'Edit Password' : 'Add New Password'}</DialogTitle>
          <DialogDescription>
            Store your login credentials securely with optional banking details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Chase Bank Login"
                required
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://chase.com"
              />
            </div>
          </div>

          {/* Login Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="username or phone"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Password *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={generatePassword}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {formData.password && (
              <div className="mt-1">
                <Badge variant={
                  calculatePasswordStrength(formData.password) === 'strong' ? 'default' :
                  calculatePasswordStrength(formData.password) === 'good' ? 'secondary' :
                  calculatePasswordStrength(formData.password) === 'fair' ? 'outline' : 'destructive'
                }>
                  {calculatePasswordStrength(formData.password).toUpperCase()} PASSWORD
                </Badge>
              </div>
            )}
          </div>

          {/* Bank Account Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_bank_account"
              checked={formData.is_bank_account}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_bank_account: checked }))}
            />
            <Label htmlFor="is_bank_account">This is a bank account login</Label>
          </div>

          {/* Bank Account Details */}
          {formData.is_bank_account && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <Label htmlFor="routing_number">Routing Number</Label>
                <Input
                  id="routing_number"
                  value={formData.routing_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, routing_number: e.target.value }))}
                  placeholder="9-digit routing number"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Account Numbers</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAccountNumber}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Account
                  </Button>
                </div>

                {formData.account_numbers.map((account, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Account number"
                      value={account.account_number}
                      onChange={(e) => updateAccountNumber(index, 'account_number', e.target.value)}
                    />
                    <select
                      className="px-3 py-2 border rounded-md"
                      value={account.account_type}
                      onChange={(e) => updateAccountNumber(index, 'account_type', e.target.value)}
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="investment">Investment</option>
                      <option value="credit">Credit</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAccountNumber(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Suggested Tags */}
              <div className="flex flex-wrap gap-1">
                {suggestedTags.filter(tag => !formData.tags.includes(tag)).map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
                  >
                    + {tag}
                  </Badge>
                ))}
              </div>

              {/* Current Tags */}
              <div className="flex flex-wrap gap-1">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                    <X
                      className="w-3 h-3 ml-1"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes, recovery codes, etc."
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-between gap-2">
            <div>
              {editingPassword && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Password
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
		  type="submit"
		  disabled={isSaving}
		  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
		>
		  {isSaving ? 'Saving…' : (editingPassword ? 'Update Password' : 'Save Password')}
		</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
