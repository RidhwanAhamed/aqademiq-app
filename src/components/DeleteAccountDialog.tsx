import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cleanupAuthState } from "@/utils/authCleanup";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isConfirmed = confirmation === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirmation: "DELETE" },
      });

      if (error) {
        throw new Error(error.message || "Deletion failed");
      }

      if (!data?.success) {
        throw new Error(data?.message || "Deletion failed");
      }

      // Clear all local state
      await cleanupAuthState(true);
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently removed.",
      });

      // Hard redirect to auth page — no stale state
      window.location.href = "/auth";
    } catch (err: any) {
      console.error("Delete account error:", err);
      toast({
        title: "Deletion failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmation(""); }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full h-12 sm:h-10">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete your account?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <p>
              This action is <strong>permanent and irreversible</strong>. All of
              the following will be deleted immediately:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Courses, assignments, exams &amp; grades</li>
              <li>Study sessions &amp; analytics</li>
              <li>Calendar events &amp; schedule blocks</li>
              <li>AI chat history &amp; uploaded files</li>
              <li>Notes, reminders &amp; all preferences</li>
              <li>Google Calendar integration data</li>
            </ul>
            <div className="pt-2">
              <Label htmlFor="delete-confirm" className="text-sm font-medium text-foreground">
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to
                confirm
              </Label>
              <Input
                id="delete-confirm"
                className="mt-1.5 font-mono"
                placeholder="DELETE"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!isConfirmed || loading}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting…
              </>
            ) : (
              "Permanently delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
