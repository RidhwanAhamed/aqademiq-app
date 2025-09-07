import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  type: 'assignment' | 'exam';
  onGradeUpdated: () => void;
}

export function GradeDialog({ open, onOpenChange, item, type, onGradeUpdated }: GradeDialogProps) {
  const [gradePoints, setGradePoints] = useState(item?.grade_points?.toString() || '');
  const [gradeTotal, setGradeTotal] = useState(item?.grade_total?.toString() || '100');
  const [gradeReceived, setGradeReceived] = useState(item?.grade_received || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!item) return;

    setLoading(true);
    try {
      const table = type === 'assignment' ? 'assignments' : 'exams';
      const { error } = await supabase
        .from(table)
        .update({
          grade_points: gradePoints ? parseFloat(gradePoints) : null,
          grade_total: gradeTotal ? parseFloat(gradeTotal) : null,
          grade_received: gradeReceived || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Grade Updated",
        description: `Grade for "${item.title}" has been saved successfully.`,
      });

      onGradeUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating grade:', error);
      toast({
        title: "Error",
        description: "Failed to update grade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = () => {
    if (gradePoints && gradeTotal) {
      const percentage = (parseFloat(gradePoints) / parseFloat(gradeTotal)) * 100;
      return percentage.toFixed(1);
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add Grade - {item?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gradePoints">Points Earned</Label>
              <Input
                id="gradePoints"
                type="number"
                step="0.01"
                value={gradePoints}
                onChange={(e) => setGradePoints(e.target.value)}
                placeholder="85"
              />
            </div>
            <div>
              <Label htmlFor="gradeTotal">Total Points</Label>
              <Input
                id="gradeTotal"
                type="number"
                step="0.01"
                value={gradeTotal}
                onChange={(e) => setGradeTotal(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          {gradePoints && gradeTotal && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">
                Percentage: {calculatePercentage()}%
              </div>
              <div className="text-xs text-muted-foreground">
                GPA Scale (0-10): {(parseFloat(calculatePercentage()) / 10).toFixed(1)}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="gradeReceived">Letter Grade (Optional)</Label>
            <Input
              id="gradeReceived"
              value={gradeReceived}
              onChange={(e) => setGradeReceived(e.target.value)}
              placeholder="A, B+, 85%, etc."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Grade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}