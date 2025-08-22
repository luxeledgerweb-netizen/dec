
import React, { useState } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp } from "lucide-react";

export default function AddCreditScoreModal({ isOpen, onClose, onScoreAdded }) {
  const [formData, setFormData] = useState({
    score: "",
    date_recorded: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const scoreData = {
        score: parseInt(formData.score, 10),
        date_recorded: formData.date_recorded,
        notes: formData.notes
      };

      if (!scoreData.score || scoreData.score < 300 || scoreData.score > 850) {
          alert("Please enter a valid credit score between 300 and 850.");
          setIsLoading(false);
          return;
      }
      
      localDb.create('CreditScore', scoreData);
      onScoreAdded();
      setFormData({
        score: "",
        date_recorded: new Date().toISOString().split('T')[0],
        notes: ""
      });
      onClose(); // Closes the modal on success
    } catch (error) {
      console.error("Error adding credit score:", error);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Add New Credit Score
          </DialogTitle>
          <DialogDescription>
            Enter your latest credit score to track its changes over time.
          </DialogDescription>
        </DialogHeader>
        
        <form id="score-form" onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="score">Credit Score</Label>
            <Input
              id="score"
              type="number"
              min="300"
              max="850"
              value={formData.score}
              onChange={(e) => setFormData({...formData, score: e.target.value})}
              placeholder="e.g., 780"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_recorded">Date Recorded</Label>
            <Input
              id="date_recorded"
              type="date"
              value={formData.date_recorded}
              onChange={(e) => setFormData({...formData, date_recorded: e.target.value})}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="e.g., Checked on Experian, opened new card."
              rows={2}
            />
          </div>
        </form>
        <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="score-form" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Score"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
