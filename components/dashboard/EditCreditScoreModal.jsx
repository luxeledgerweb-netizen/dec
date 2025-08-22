import React, { useState, useEffect } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Trash2 } from "lucide-react";

export default function EditCreditScoreModal({ children, scoreData, onUpdate, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    score: "",
    source: "Experian",
    date_recorded: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (scoreData && isOpen) {
      setFormData({
        score: scoreData.score?.toString() || "",
        source: scoreData.source || "Experian",
        date_recorded: scoreData.date ? scoreData.date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: scoreData.notes || ""
      });
    }
  }, [scoreData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const scoreInfo = {
        score: parseInt(formData.score, 10),
        source: formData.source,
        date_recorded: formData.date_recorded,
        notes: formData.notes
      };

      if (!scoreInfo.score || scoreInfo.score < 300 || scoreInfo.score > 850) {
        alert("Please enter a valid credit score between 300 and 850.");
        setIsLoading(false);
        return;
      }

      if (scoreData?.id) {
        localDb.update('CreditScore', scoreData.id, scoreInfo);
      } else {
        localDb.create('CreditScore', scoreInfo);
      }

      onUpdate();
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating credit score:", error);
    }
    setIsLoading(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this credit score entry?')) {
      if (onDelete) {
        onDelete(scoreData?.id);
      } else if (scoreData?.id) {
        localDb.delete('CreditScore', scoreData.id);
        onUpdate();
      }
      setIsOpen(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {children}
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {scoreData ? 'Edit Credit Score' : 'Add Credit Score'}
            </DialogTitle>
            <DialogDescription>
              Update your credit score information to track changes over time.
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
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({...formData, source: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Experian">Experian</SelectItem>
                  <SelectItem value="Equifax">Equifax</SelectItem>
                  <SelectItem value="TransUnion">TransUnion</SelectItem>
                  <SelectItem value="Credit Karma">Credit Karma</SelectItem>
                  <SelectItem value="FICO">FICO</SelectItem>
                  <SelectItem value="Bank Statement">Bank Statement</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="flex justify-between w-full">
              {scoreData?.id && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="score-form" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}