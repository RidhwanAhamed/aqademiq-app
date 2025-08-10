import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHolidays } from "@/hooks/useHolidays";

interface AddHolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddHolidayDialog({ open, onOpenChange }: AddHolidayDialogProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isProcessing, setIsProcessing] = useState(false);

  const { addHoliday } = useHolidays();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    
    setIsProcessing(true);
    try {
      const { error } = await addHoliday({
        name,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      if (error) throw new Error(error);
      
      toast({
        title: "Holiday period added",
        description: "Notifications will be paused during this period.",
      });
      
      onOpenChange(false);
      setName("");
      setStartDate(undefined);
      setEndDate(undefined);
    } catch (err: any) {
      toast({
        title: "Could not add holiday period",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Add Holiday Period
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Holiday Name</Label>
            <Input
              id="name"
              placeholder="e.g., Winter Break, Spring Break"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name || !startDate || !endDate || isProcessing}
            >
              {isProcessing ? "Adding..." : "Add Holiday"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function HolidayManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { holidays, loading, deleteHoliday } = useHolidays();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await deleteHoliday(id);
      if (error) throw new Error(error);
      
      toast({
        title: "Holiday period deleted",
        description: "Notifications will resume for this period.",
      });
    } catch (err: any) {
      toast({
        title: "Could not delete holiday period",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Holiday Periods</CardTitle>
            <CardDescription>
              Manage breaks and holidays when notifications should be paused
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Holiday
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading holidays...</p>
        ) : holidays.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No holiday periods set. Add holidays to pause notifications during breaks.
          </p>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{holiday.name}</h4>
                    {holiday.is_active && (
                      <Badge variant="outline" className="text-primary">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(holiday.start_date), "PPP")} - {format(new Date(holiday.end_date), "PPP")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(holiday.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <AddHolidayDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}