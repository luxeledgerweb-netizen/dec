
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
import { X, Plus, Star, Eye, EyeOff, Trash2 } from "lucide-react";
import { EncryptionHelper } from "@/components/utils/EncryptionHelper";

export default function AddCardModal({ isOpen, onClose, onSave, editingCard = null, masterPassword }) {
  const [formData, setFormData] = useState({
    name: '',
    cardholder_name: '',
    card_number: '',
    expiration_date: '',
    cvv: '',
    pin: '',
    card_type: 'credit',
    card_network: '', // Added card_network
    issuer: '',
    tags: [],
    notes: '',
    is_favorite: false
  });
  
  const [newTag, setNewTag] = useState('');
  const [showSensitive, setShowSensitive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingCard) {
        setFormData({
          name: editingCard.name || '',
          cardholder_name: editingCard.cardholder_name || '',
          card_number: editingCard.card_number || '',
          expiration_date: editingCard.expiration_date || '',
          cvv: editingCard.cvv || '',
          pin: editingCard.pin || '',
          card_type: editingCard.card_type || 'credit',
          card_network: editingCard.card_network || '', // Initialize card_network
          issuer: editingCard.issuer || '',
          tags: editingCard.tags || [],
          notes: editingCard.notes || '',
          is_favorite: editingCard.is_favorite || false
        });
      } else {
        // Reset form for "Add New"
        setFormData({
          name: '', cardholder_name: '', card_number: '', expiration_date: '', cvv: '', pin: '',
          card_type: 'credit', card_network: '', issuer: '', tags: [], notes: '', is_favorite: false // Reset card_network
        });
      }
      setShowSensitive(false);
      setNewTag('');
    }
  }, [isOpen, editingCard]);

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

  const formatCardNumber = (value) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpirationDate = (value) => {
    // Remove all non-digits
    const v = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleDelete = () => {
    if (editingCard) {
      const confirmDelete = confirm(`Are you sure you want to delete "${editingCard.name}"? This action cannot be undone.`);
      if (confirmDelete) {
        localDb.delete('CardCredential', editingCard.id);
        onSave();
        onClose();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Conditionally encrypt only if master password is available
    const encryptAsync = async (value) => {
      if (!value) return null;
      if (!masterPassword) return value; // Skip encryption if no master password
      return await EncryptionHelper.encrypt(value, masterPassword);
    };
    
    const encryptedFormData = {
      name: await encryptAsync(formData.name),
      cardholder_name: await encryptAsync(formData.cardholder_name),
      card_number: await encryptAsync(formData.card_number),
      expiration_date: await encryptAsync(formData.expiration_date),
      cvv: await encryptAsync(formData.cvv),
      pin: await encryptAsync(formData.pin),
      issuer: await encryptAsync(formData.issuer),
      notes: await encryptAsync(formData.notes),
      tags: await Promise.all(formData.tags.map(tag => encryptAsync(tag))),
    };

    const cardData = {
      ...formData, // Copy non-sensitive fields
      ...encryptedFormData, // Overwrite with encrypted fields
    };

    if (editingCard) {
      localDb.update('CardCredential', editingCard.id, cardData);
    } else {
      localDb.create('CardCredential', cardData);
    }
    
    onSave();
    onClose();
  };

  const suggestedTags = ['primary', 'backup', 'travel', 'business', 'rewards', 'cashback', 'shopping'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">{editingCard ? 'Edit Credit Card' : 'Add New Credit Card'}</DialogTitle>
          <DialogDescription>
            Securely store your credit card information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Card Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Chase Sapphire Preferred"
                required
              />
            </div>
            <div>
              <Label htmlFor="card_type">Card Type</Label>
              <Select value={formData.card_type} onValueChange={(value) => setFormData(prev => ({ ...prev, card_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="debit">Debit Card</SelectItem>
                  <SelectItem value="gift">Gift Card</SelectItem>
                  <SelectItem value="membership">Membership Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="card_network">Card Network *</Label>
              <Select value={formData.card_network} onValueChange={(value) => setFormData(prev => ({ ...prev, card_network: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select card network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="american_express">American Express</SelectItem>
                  <SelectItem value="discover">Discover</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="issuer">Issuer/Bank</Label>
              <Input
                id="issuer"
                value={formData.issuer}
                onChange={(e) => setFormData(prev => ({ ...prev, issuer: e.target.value }))}
                placeholder="e.g., Chase, American Express"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cardholder_name">Cardholder Name</Label>
            <Input
              id="cardholder_name"
              value={formData.cardholder_name}
              onChange={(e) => setFormData(prev => ({ ...prev, cardholder_name: e.target.value }))}
              placeholder="Name as it appears on card"
            />
          </div>

          {/* Card Details */}
          <div>
            <Label htmlFor="card_number">Card Number *</Label>
            <div className="relative">
              <Input
                id="card_number"
                type={showSensitive ? "text" : "password"}
                value={formData.card_number}
                onChange={(e) => setFormData(prev => ({ ...prev, card_number: formatCardNumber(e.target.value) }))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setShowSensitive(!showSensitive)}
              >
                {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="expiration_date">Expiration</Label>
              <Input
                id="expiration_date"
                value={formData.expiration_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiration_date: formatExpirationDate(e.target.value) }))}
                placeholder="MM/YY"
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                type={showSensitive ? "text" : "password"}
                value={formData.cvv}
                onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                placeholder="123"
                maxLength={4}
              />
            </div>
            <div>
              <Label htmlFor="pin">PIN (Optional)</Label>
              <Input
                id="pin"
                type={showSensitive ? "text" : "password"}
                value={formData.pin}
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder="1234"
                maxLength={4}
              />
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
              placeholder="Additional information about this card..."
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-between gap-2">
            <div>
              {editingCard && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Card
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg"
              >
                {editingCard ? 'Update Card' : 'Save Card'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
