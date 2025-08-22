
import React, { useState } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { fetchAndEncodeFavicon } from '../utils/faviconUtils';

export default function AddAccountModal({ isOpen, onClose, onAccountAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    institution: "",
    institution_website: "",
    account_type: "",
    current_balance: "",
    apy: "",
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

      localDb.create('Account', {
        ...formData,
        current_balance: parseFloat(formData.current_balance) || 0,
        apy: parseFloat(formData.apy) || null,
        currency: "USD",
        default_favicon_base64: faviconBase64 // Store the fetched favicon on the account
      });
      
      onAccountAdded();
      setFormData({
        name: "",
        institution: "",
        institution_website: "",
        account_type: "",
        current_balance: "",
        apy: "",
      });
      onClose();
    } catch (error) {
      console.error("Error adding account:", error);
    }
    setIsLoading(false);
  };

  const isSavingsOrChecking = formData.account_type === 'savings' || formData.account_type === 'checking';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialog-content sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Add New Account
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Main Savings Account"
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

          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value) => setFormData({...formData, account_type: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="retirement">Retirement</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSavingsOrChecking && (
            <div className="space-y-2">
              <Label htmlFor="apy">Current APY (%)</Label>
              <Input
                id="apy"
                type="number"
                step="0.01"
                value={formData.apy}
                onChange={(e) => setFormData({...formData, apy: e.target.value})}
                placeholder="e.g., 4.5"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="balance">Current Balance</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={formData.current_balance}
              onChange={(e) => setFormData({...formData, current_balance: e.target.value})}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
