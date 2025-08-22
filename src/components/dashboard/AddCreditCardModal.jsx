
import React, { useState } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard as CreditCardIcon, Info } from "lucide-react"; // Added Info icon
import { fetchAndEncodeFavicon } from '../utils/faviconUtils'; // Changed import from processAndStoreFavicon

export default function AddCreditCardModal({ isOpen, onClose, onCreditCardAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    institution: "",
    institution_website: "",
    card_type: "",
    status: "open",
    expiration_date: "",
    last_used_date: "",
    credit_limit: "",
    apr: "",
    last_four_digits: "",
    benefits: "",
    annual_fee: "",
    notes: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Fetch and encode the favicon if a website is provided.
      const faviconBase64 = formData.institution_website
        ? await fetchAndEncodeFavicon(formData.institution_website)
        : null;

      // Create credit card with ALL form data including institution_website and favicon
      localDb.create('CreditCard', {
        ...formData, // Spread all existing form data
        credit_limit: parseFloat(formData.credit_limit) || 0, // Ensure these are parsed as numbers
        annual_fee: parseFloat(formData.annual_fee) || 0, // Ensure these are parsed as numbers
        apr: parseFloat(formData.apr) || null, // APR can be null if not provided, as per outline
        default_favicon_base64: faviconBase64 // Store the fetched favicon
      });
      
      // FIX: onCreditCardAdded no longer needs to pass data, as parent will refresh
      onCreditCardAdded();
      setFormData({ // Reset form data after successful submission
        name: "",
        institution: "",
        institution_website: "",
        card_type: "",
        status: "open",
        expiration_date: "",
        last_used_date: "",
        credit_limit: "",
        apr: "",
        last_four_digits: "",
        benefits: "",
        annual_fee: "",
        notes: ""
      });
      onClose(); // Closes the modal on success
    } catch (error) {
      console.error("Error adding credit card:", error);
    } finally {
      setIsLoading(false); // Ensure loading state is reset
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialog-content sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5" />
            Add New Credit Card
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Card Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Chase Sapphire Preferred"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            <Input
              id="institution"
              value={formData.institution}
              onChange={(e) => setFormData({...formData, institution: e.target.value})}
              placeholder="e.g., Chase Bank"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Institution Website</Label>
            <Input
              id="website"
              value={formData.institution_website}
              onChange={(e) => setFormData({...formData, institution_website: e.target.value})}
              placeholder="e.g., chase.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Card Type</Label>
              <Select
                value={formData.card_type}
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
                value={formData.status}
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
                value={formData.last_four_digits}
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
                value={formData.apr}
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
                value={formData.annual_fee}
                onChange={(e) => setFormData({...formData, annual_fee: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <Input
                id="credit_limit"
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={(e) => setFormData({...formData, credit_limit: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Benefits & Rewards</Label>
            <Textarea
              id="benefits"
              value={formData.benefits}
              onChange={(e) => setFormData({...formData, benefits: e.target.value})}
              placeholder="e.g., 2x points on travel, 1.5x on all purchases"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any other important details"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Credit Card"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
