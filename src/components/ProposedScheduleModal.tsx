import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, CheckCircle, X, Loader2, Sparkles } from "lucide-react";
import { useSmartScheduler, ScheduleProposal } from "@/hooks/useSmartScheduler";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ProposedScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposedScheduleModal({ open, onOpenChange }: ProposedScheduleModalProps) {
  const { proposals, loading, toggleProposal, acceptSchedule, rejectSchedule } = useSmartScheduler();

  const handleAccept = async () => {
    const result = await acceptSchedule();
    if (result.success) {
      onOpenChange(false);
    }
  };

  const handleReject = () => {
    rejectSchedule();
    onOpenChange(false);
  };

  const acceptedCount = proposals.filter((p) => p.accepted).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Proposed Study Schedule
          </DialogTitle>
          <DialogDescription>
            Ada AI has created an optimized schedule for your pending tasks. Review and accept the time slots that work for you.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {proposals.map((proposal, index) => (
              <ProposalCard
                key={`${proposal.assignment_id}-${index}`}
                proposal={proposal}
                onToggle={() => toggleProposal(index)}
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {acceptedCount} of {proposals.length} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReject} disabled={loading}>
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
            <Button onClick={handleAccept} disabled={loading || acceptedCount === 0}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Accept ({acceptedCount})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProposalCardProps {
  proposal: ScheduleProposal;
  onToggle: () => void;
}

function ProposalCard({ proposal, onToggle }: ProposalCardProps) {
  const formattedDate = format(parseISO(proposal.slot_date), "EEE, MMM d");
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        proposal.accepted
          ? "bg-primary/5 border-primary/30"
          : "bg-muted/30 border-border opacity-60"
      )}
      onClick={onToggle}
    >
      <Checkbox
        checked={proposal.accepted}
        onCheckedChange={() => onToggle()}
        className="mt-1"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{proposal.assignment_title}</span>
        </div>
        
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{proposal.start_time} - {proposal.end_time}</span>
          </div>
        </div>
        
        {proposal.reasoning && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
            "{proposal.reasoning}"
          </p>
        )}
      </div>
    </div>
  );
}

// Trigger button component
interface ScheduleButtonProps {
  className?: string;
}

export function AutoScheduleButton({ className }: ScheduleButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { loading, hasProposals, generateSchedule } = useSmartScheduler();

  const handleClick = async () => {
    if (hasProposals) {
      setModalOpen(true);
    } else {
      const result = await generateSchedule(7);
      if (result.success && result.proposals && result.proposals.length > 0) {
        setModalOpen(true);
      }
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className={cn("gap-2", className)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Auto-Schedule
      </Button>

      <ProposedScheduleModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
