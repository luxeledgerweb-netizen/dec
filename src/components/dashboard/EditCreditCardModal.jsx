
import React, { useState, useMemo, useEffect } from 'react';
import { localDb } from '@/components/utils/LocalDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Trash2, ShieldCheck, ShieldOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchAndEncodeFavicon } from '../utils/faviconUtils';

export default function EditCreditCardModal({ isOpen, card, onClose, onCardUpdated = () => {} }) {
  // Initialize formData from card prop.
  // Use a useEffect to update formData if the 'card' prop changes while the modal is open,
  // or if the modal opens with a different card.
  const [formData, setFormData] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalWebsite, setOriginalWebsite] = useState('');

  // appSettings is declared but not used in the provided outline's logic.
  // Including it as per the outline for consistency.
  const appSettings = useMemo(() => localDb.list('AppSettings')[0] || {}, []); 
  
  useEffect(() => {
    if (card) {
      setFormData({
        name: card.name || "",
        institution: card.institution || "",
        institution_website: card.institution_website || "",
        card_type: card.card_type || "",
        status: card.status || "open",
        // Convert expiration_date to YYYY-MM format for type="month" input
        expiration_date: card.expiration_date ? card.expiration_date.substring(0, 7) : "",
        last_used_date: card.last_used_date || "",
        credit_limit: card.credit_limit?.toString() || "",
        apr: card.apr?.toString() || "",
        last_four_digits: card.last_four_digits || "",
        benefits: card.benefits || "",
        annual_fee: card.annual_fee?.toString() || "",
        notes: card.notes || "",
        is_primary_active: card.is_primary_active || false,
      });
      setOriginalWebsite(card.institution_website || '');
    }
  }, [card]);


  const handlePrimaryActiveToggle = (checked) => {
    // The outline suggested passing `value` or `checked` directly from onCheckedChange.
    // Shadcn Checkbox passes the boolean `checked` value directly.
    const newStatus = checked;
    
    // Unset all other cards if this one is becoming primary
    if (newStatus) {
      const allCards = localDb.list('CreditCard');
      allCards.forEach(c => {
        if (c.id !== card.id && c.is_primary_active) {
          localDb.update('CreditCard', c.id, { is_primary_active: false });
        }
      });
    }

    setFormData(prev => ({ ...prev, is_primary_active: newStatus }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedData = {
        ...formData,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        annual_fee: parseFloat(formData.annual_fee) || 0,
        apr: parseFloat(formData.apr) || null,
      };

      // If website changed, fetch new favicon
      if (formData.institution_website && formData.institution_website !== originalWebsite) {
        const faviconBase64 = await fetchAndEncodeFavicon(formData.institution_website);
        updatedData.default_favicon_base64 = faviconBase64;
      } else if (!formData.institution_website) {
        // Clear favicon if website is removed
        updatedData.default_favicon_base64 = null;
      }

      localDb.update('CreditCard', card.id, updatedData);
      
      // Trigger immediate dashboard refresh
      if (typeof onCardUpdated === 'function') {
        onCardUpdated();
      }
      onClose();
    } catch (error) {
      console.error("Error updating card:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this credit card? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        localDb.delete('CreditCard', card.id);
        if (typeof onCardUpdated === 'function') {
          onCardUpdated();
        }
        onClose();
      } catch (error) {
        console.error("Error deleting card:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  if (!card) return null; // Render nothing if no card is provided

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialog-content sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Edit Credit Card
          </DialogTitle>
          <DialogDescription>
            Update the details for {card.name}.
          </DialogDescription>
        </DialogHeader>
        
        <form id="edit-card-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Card Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            <Input
              id="institution"
              value={formData.institution || ''}
              onChange={(e) => setFormData({...formData, institution: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Institution Website</Label>
            <Input
              id="website"
              value={formData.institution_website || ''}
              onChange={(e) => setFormData({...formData, institution_website: e.target.value})}
              placeholder="e.g., chase.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Card Type</Label>
              <Select
                value={formData.card_type || ''}
                onValueChange={(value) => setFormData({...formData, card_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="amex">American Express</SelectItem>
                  <SelectItem value="discover">Discover</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || 'open'}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last_four">Last 4 Digits</Label>
              <Input
                id="last_four"
                value={formData.last_four_digits || ''}
                onChange={(e) => setFormData({...formData, last_four_digits: e.target.value.slice(0, 4)})}
                placeholder="1234"
                maxLength={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apr">APR (%)</Label>
              <Input
                id="apr"
                type="number"
                step="0.01"
                value={formData.apr || ''}
                onChange={(e) => setFormData({...formData, apr: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration Date (MM/YYYY)</Label>
              <Input
                id="expiration"
                type="month"
                value={formData.expiration_date}
                onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                placeholder="2025-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_used_date">Last Used Date</Label>
              <Input
                id="last_used_date"
                type="date"
                value={formData.last_used_date}
                onChange={(e) => setFormData({...formData, last_used_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annual_fee">Annual Fee</Label>
              <Input
                id="annual_fee"
                type="number"
                step="0.01"
                value={formData.annual_fee || ''}
                onChange={(e) => setFormData({...formData, annual_fee: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <Input
                id="credit_limit"
                type="number"
                step="1"
                value={formData.credit_limit || ''}
                onChange={(e) => setFormData({...formData, credit_limit: e.target.value})}
                placeholder="0"
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          
           <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
                id="primary-active-checkbox"
                checked={formData.is_primary_active}
                onCheckedChange={handlePrimaryActiveToggle}
            />
            <Label htmlFor="primary-active-checkbox" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Set as Primary Active Card
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Benefits & Rewards</Label>
            <Textarea
              id="benefits"
              value={formData.benefits || ''}
              onChange={(e) => setFormData({...formData, benefits: e.target.value})}
              placeholder="e.g., 2x points on travel, 1.5x on all purchases"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any other important details"
              rows={2}
            />
          </div>

        </form>
        <DialogFooter className="pt-4 flex justify-between w-full">
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                Cancel
                </Button>
                <Button type="submit" form="edit-card-form" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
