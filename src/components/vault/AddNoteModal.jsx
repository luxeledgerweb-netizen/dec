
import React, { useState, useEffect } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Star, Trash2 } from "lucide-react";
import { EncryptionHelper } from "@/components/utils/EncryptionHelper";

export default function AddNoteModal({ isOpen, onClose, onSave, editingNote = null, masterPassword }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'personal',
    tags: [],
    is_favorite: false
  });
  
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingNote) {
        setFormData({
          title: editingNote.title || '',
          content: editingNote.content || '',
          category: editingNote.category || 'personal',
          tags: editingNote.tags || [],
          is_favorite: editingNote.is_favorite || false
        });
      } else {
        // Reset form for "Add New"
        setFormData({
          title: '', content: '', category: 'personal', tags: [], is_favorite: false
        });
      }
      setNewTag('');
    }
  }, [isOpen, editingNote]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Conditionally encrypt only if master password is available
    const encryptAsync = (value) => {
      if (!value) return Promise.resolve(null);
      if (!masterPassword) return Promise.resolve(value); // Skip encryption if no master password
      return EncryptionHelper.encrypt(value, masterPassword);
    };
    
    const encryptedFormData = {
      title: await encryptAsync(formData.title),
      content: await encryptAsync(formData.content),
      tags: await Promise.all(formData.tags.map(tag => encryptAsync(tag))),
    };

    const noteData = {
      ...formData, // Copy non-sensitive fields like booleans and category
      ...encryptedFormData, // Overwrite sensitive fields with encrypted versions
    };

    if (editingNote) {
      localDb.update('SecureNote', editingNote.id, noteData);
    } else {
      localDb.create('SecureNote', noteData);
    }
    
    onSave();
    onClose();
  };

  const handleDelete = () => {
    if (editingNote) {
      const confirmDelete = confirm(`Are you sure you want to delete "${editingNote.title}"? This action cannot be undone.`);
      if (confirmDelete) {
        localDb.delete('SecureNote', editingNote.id);
        onSave();
        onClose();
      }
    }
  };

  const suggestedTags = ['important', 'passwords', 'recovery', 'family', 'work', 'financial', 'medical', 'legal'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">{editingNote ? 'Edit Secure Note' : 'Add New Secure Note'}</DialogTitle>
          <DialogDescription>
            Store sensitive information securely in an encrypted note.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., WiFi Passwords, Recovery Codes"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_favorite"
              checked={formData.is_favorite}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_favorite: checked }))}
            />
            <Label htmlFor="is_favorite" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Mark as favorite
            </Label>
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Note Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Your secure note content..."
              rows={8}
              required
            />
          </div>

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

          {/* Submit Buttons */}
          <div className="flex justify-between gap-2">
            <div>
              {editingNote && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Note
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
              >
                {editingNote ? 'Update Note' : 'Save Note'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
