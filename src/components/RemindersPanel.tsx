import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Trash2, Clock } from 'lucide-react';
import { useReminders } from '@/hooks/useReminders';
import { useToast } from '@/hooks/use-toast';

export function RemindersPanel() {
  const { reminders, addReminder, deleteReminder, getUpcomingReminders } = useReminders();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    remind_at: '',
    reminder_type: 'general'
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.remind_at) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    await addReminder({
      title: formData.title,
      message: formData.message,
      remind_at: formData.remind_at,
      reminder_type: formData.reminder_type,
      is_active: true
    });

    setFormData({
      title: '',
      message: '',
      remind_at: '',
      reminder_type: 'general'
    });
    setIsOpen(false);
    
    toast({
      title: "Reminder created",
      description: "Your reminder has been set successfully"
    });
  };

  const upcomingReminders = getUpcomingReminders();

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getReminderTypeColor = (type: string) => {
    switch (type) {
      case 'assignment': return 'bg-blue-500 text-white';
      case 'exam': return 'bg-red-500 text-white';
      case 'class': return 'bg-green-500 text-white';
      case 'study': return 'bg-purple-500 text-white';
      default: return 'bg-muted-foreground text-background';
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminders
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reminder</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Reminder title"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">Message (optional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Additional details"
                  />
                </div>
                
                <div>
                  <Label htmlFor="remind_at">Remind me at</Label>
                  <Input
                    id="remind_at"
                    type="datetime-local"
                    value={formData.remind_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, remind_at: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="reminder_type">Type</Label>
                  <Select 
                    value={formData.reminder_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, reminder_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="class">Class</SelectItem>
                      <SelectItem value="study">Study Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Reminder</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingReminders.length > 0 ? (
          <div className="space-y-3">
            {upcomingReminders.slice(0, 5).map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                     <Badge className={getReminderTypeColor(reminder.reminder_type)}>
                       {reminder.reminder_type}
                     </Badge>
                     <span className="font-semibold text-foreground">{reminder.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(reminder.remind_at)}
                  </div>
                  {reminder.message && (
                    <p className="text-sm text-muted-foreground mt-1">{reminder.message}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteReminder(reminder.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {upcomingReminders.length > 5 && (
              <p className="text-center text-sm text-muted-foreground">
                +{upcomingReminders.length - 5} more reminders
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No upcoming reminders</p>
            <p className="text-sm">Create your first reminder to stay on track</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}