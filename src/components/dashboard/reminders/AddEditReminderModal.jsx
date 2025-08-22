
import React, { useState, useEffect } from 'react';
import { localDb } from '@/components/utils/LocalDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Bell, Trash2 } from "lucide-react";

export default function AddEditReminderModal({ isOpen, onClose, onSave, reminder }) {
  const getInitialState = () => ({
    name: '',
    type: 'subscription',
    amount: '',
    frequency: 'monthly',
    next_due_date: '',
    notes: '',
    website: '' // Add website to state
  });

  const [formData, setFormData] = useState(getInitialState());
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!reminder;

  useEffect(() => {
    if (isOpen) {
      if (reminder) {
        setFormData({
          name: reminder.name || "",
          type: reminder.type || "subscription",
          amount: reminder.amount?.toString() || "",
          frequency: reminder.frequency || null, // Allow null for one-time frequency
          next_due_date: reminder.next_due_date ? new Date(reminder.next_due_date).toISOString().split('T')[0] : "",
          notes: reminder.notes || "",
          website: reminder.website || "" // Load website
        });
      } else {
        setFormData(getInitialState());
      }
    }
  }, [reminder, isOpen]);

  const resetForm = () => {
    setFormData(getInitialState());
  };

  const handleDialogClose = (open) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${reminder.name}"? This action cannot be undone.`)) {
      try {
        localDb.delete('Reminder', reminder.id);
        if (onSave && typeof onSave === 'function') {
          onSave();
        }
        resetForm();
        onClose();
      } catch (error) {
        console.error('Error deleting reminder:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSave = {
        ...formData,
        amount: formData.type === 'subscription' ? (parseFloat(formData.amount) || 0) : null,
        frequency: formData.frequency || null, // Ensure null is passed if "one-time" is selected
        next_due_date: formData.next_due_date || null,
        is_completed: false
      };
      
      // Add favicon URL logic
      if (dataToSave.type === 'subscription' && formData.website && (!reminder?.favicon_url || reminder.website !== formData.website)) {
          try {
              let url = formData.website;
              if (!/^https?:\/\//i.test(url)) {
                  url = 'https://' + url;
              }
              const domain = new URL(url).hostname;
              dataToSave.favicon_url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
          } catch (err) {
              console.warn("Could not parse domain from website:", formData.website);
              dataToSave.favicon_url = null;
          }
      } else if (dataToSave.type !== 'subscription') {
          dataToSave.favicon_url = null;
          dataToSave.website = null;
      }


      if (isEditing) {
        localDb.update('Reminder', reminder.id, dataToSave);
      } else {
        localDb.create('Reminder', dataToSave);
      }
      
      if (onSave && typeof onSave === 'function') {
        onSave();
      }
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving reminder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.type === 'subscription' ? <Calendar className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            {isEditing ? 'Edit' : 'Add'} {formData.type === 'subscription' ? 'Subscription' : 'Reminder'}
          </DialogTitle>
        </DialogHeader>

        <form id="add-edit-reminder-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Netflix Subscription"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'subscription' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="website">Website (for logo)</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g., netflix.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g., 15.99"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({...formData, frequency: value})}
            >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="bi_annually">Bi-Annually (6 months)</SelectItem>
                  <SelectItem value="annually">Annually (12 months)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label htmlFor="next_due_date">Next Due Date</Label>
            <Input
              id="next_due_date"
              type="date"
              value={formData.next_due_date}
              onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
            />
          </div>
        </form>
        
        <div className="flex-shrink-0 pt-4 flex justify-between">
          <div>
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" form="add-edit-reminder-form" disabled={isLoading} onClick={handleSubmit}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
