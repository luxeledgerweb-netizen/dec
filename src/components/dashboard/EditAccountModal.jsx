
import React, { useState, useEffect } from "react";
import { localDb } from '@/components/utils/LocalDb';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Trash2 } from "lucide-react";
import { fetchAndEncodeFavicon } from '../utils/faviconUtils';

export default function EditAccountModal({ isOpen, onClose, onAccountUpdated, account }) {
  const [formData, setFormData] = useState({
    name: "",
    institution: "",
    institution_website: "",
    account_type: "",
    current_balance: "",
    apy: "",
    total_contributions: "",
    is_archived: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [originalWebsite, setOriginalWebsite] = useState("");

  useEffect(() => {
    if (account && isOpen) {
      const accountData = {
        name: account.name || "",
        institution: account.institution || "",
        institution_website: account.institution_website || "",
        account_type: account.account_type || "",
        current_balance: account.current_balance?.toString() || "",
        apy: account.apy?.toString() || "",
        total_contributions: account.total_contributions?.toString() || "",
        is_archived: account.is_archived || false
      };
      setFormData(accountData);
      setOriginalWebsite(account.institution_website || "");
    }
  }, [account, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedData = {
        ...formData,
        current_balance: parseFloat(formData.current_balance) || 0,
        apy: parseFloat(formData.apy) || null,
        total_contributions: parseFloat(formData.total_contributions) || 0
      };

      // If website changed, fetch new favicon
      if (formData.institution_website && formData.institution_website !== originalWebsite) {
        const faviconBase64 = await fetchAndEncodeFavicon(formData.institution_website);
        updatedData.default_favicon_base64 = faviconBase64;
      } else if (!formData.institution_website) {
        // Clear favicon if website is removed
        updatedData.default_favicon_base64 = null;
      }

      localDb.update('Account', account.id, updatedData);
      
      if (typeof onAccountUpdated === 'function') {
        onAccountUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error("Error updating account:", error);
    }
    setIsLoading(false);
  };
  
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the account "${account.name}"? This will also remove all associated balance history and cannot be undone.`)) {
      try {
        // Delete associated balance history first
        const balanceHistory = localDb.list('BalanceHistory');
        const historyToDelete = balanceHistory.filter(h => h.account_id === account.id);
        historyToDelete.forEach(h => localDb.delete('BalanceHistory', h.id));
        
        // Delete the account
        localDb.delete('Account', account.id);
        
        if (typeof onAccountUpdated === 'function') onAccountUpdated();
        onClose();
      } catch (error) {
        console.error("Error deleting account:", error);
      }
    }
  };

  const isSavingsOrChecking = formData.account_type === 'savings' || formData.account_type === 'checking';
  const isInvestmentAccount = formData.account_type === 'investment' || formData.account_type === 'retirement';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialog-content sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Edit Account
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Account Name</Label>
            <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-institution">Institution</Label>
            <Input id="edit-institution" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-website">Institution Website</Label>
            <Input id="edit-website" value={formData.institution_website} onChange={(e) => setFormData({...formData, institution_website: e.target.value})} placeholder="e.g., chase.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-type">Account Type</Label>
            <Select value={formData.account_type} onValueChange={(value) => setFormData({...formData, account_type: value})}>
              <SelectTrigger id="edit-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="retirement">Retirement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSavingsOrChecking && (
            <div className="space-y-2">
              <Label htmlFor="edit-apy">Current APY (%)</Label>
              <Input id="edit-apy" type="number" step="0.01" value={formData.apy} onChange={(e) => setFormData({...formData, apy: e.target.value})} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-balance">Current Balance</Label>
            <Input id="edit-balance" type="number" step="0.01" value={formData.current_balance} onChange={(e) => setFormData({...formData, current_balance: e.target.value})} required />
          </div>

          {isInvestmentAccount && (
            <div className="space-y-2">
              <Label htmlFor="edit-contributions">Total Contributions</Label>
              <Input id="edit-contributions" type="number" step="0.01" value={formData.total_contributions} onChange={(e) => setFormData({...formData, total_contributions: e.target.value})} />
            </div>
          )}
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="destructive" className="mr-auto" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2"/>
              Delete Account
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Updating..." : "Update Account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
