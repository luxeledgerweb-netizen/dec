
import React, { useState, useEffect } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Trash2, Home, HandCoins } from "lucide-react";

export default function AddEditAutoLoanModal({ isOpen, onClose, onSave = () => {}, loan }) {
  const [formData, setFormData] = useState({
    name: "",
    loan_type: "auto",
    original_amount: "",
    current_balance: "",
    interest_rate: "",
    payoff_date: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!loan;

  useEffect(() => {
    if (loan) {
      setFormData({
        name: loan.name || "",
        loan_type: loan.loan_type || "auto",
        original_amount: loan.original_amount?.toString() || "",
        current_balance: loan.current_balance?.toString() || "",
        interest_rate: loan.interest_rate?.toString() || "",
        payoff_date: loan.payoff_date || ""
      });
    } else {
      setFormData({
        name: "",
        loan_type: "auto",
        original_amount: "",
        current_balance: "",
        interest_rate: "",
        payoff_date: ""
      });
    }
  }, [loan, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSave = {
        ...formData,
        original_amount: parseFloat(formData.original_amount) || 0,
        current_balance: parseFloat(formData.current_balance) || 0,
        interest_rate: parseFloat(formData.interest_rate) || 0
      };

      if (isEditing) {
        localDb.update('AutoLoan', loan.id, dataToSave);
      } else {
        localDb.create('AutoLoan', dataToSave);
      }
      
      // Call onSave if it exists, otherwise call onClose
      if (typeof onSave === 'function') {
        onSave();
      }
      onClose();
    } catch (error) {
      console.error("Error saving loan:", error);
    }
    setIsLoading(false);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this loan? This action cannot be undone.")) {
      try {
        localDb.delete('AutoLoan', loan.id);
        if (typeof onSave === 'function') {
          onSave();
        }
        onClose();
      } catch (error) {
        console.error("Error deleting loan:", error);
      }
    }
  };
  
  const getLoanIcon = () => {
    switch (formData.loan_type) {
        case 'mortgage': return <Home className="w-5 h-5" />;
        case 'student': return <HandCoins className="w-5 h-5" />;
        default: return <Car className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialog-content sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getLoanIcon()}
            {isEditing ? "Edit Loan" : "Add New Loan"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loan_type">Loan Type</Label>
            <Select value={formData.loan_type} onValueChange={(value) => setFormData({...formData, loan_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Loan</SelectItem>
                <SelectItem value="mortgage">Mortgage</SelectItem>
                <SelectItem value="student">Student Loan</SelectItem>
                <SelectItem value="personal">Personal Loan</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        
          <div className="space-y-2">
            <Label htmlFor="name">Loan Name / Nickname</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Honda Civic Loan"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="original_amount">Original Amount</Label>
              <Input
                id="original_amount"
                type="number"
                step="0.01"
                value={formData.original_amount}
                onChange={(e) => setFormData({...formData, original_amount: e.target.value})}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_balance">Current Balance</Label>
              <Input
                id="current_balance"
                type="number"
                step="0.01"
                value={formData.current_balance}
                onChange={(e) => setFormData({...formData, current_balance: e.target.value})}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="interest_rate">Interest Rate (%)</Label>
            <Input
              id="interest_rate"
              type="number"
              step="0.01"
              value={formData.interest_rate}
              onChange={(e) => setFormData({...formData, interest_rate: e.target.value})}
              placeholder="0.00"
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="payoff_date">Payoff Date</Label>
              <Input
                id="payoff_date"
                type="date"
                value={formData.payoff_date}
                onChange={(e) => setFormData({...formData, payoff_date: e.target.value})}
              />
            </div>
          )}

          <div className="flex justify-between pt-4">
            <div>
              {isEditing && (
                <Button type="button" variant="destructive" size="icon" onClick={handleDelete} aria-label="Delete loan">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Add Loan"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
