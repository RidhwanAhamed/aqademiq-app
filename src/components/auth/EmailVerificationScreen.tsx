import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, CheckCircle2, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';

interface EmailVerificationScreenProps {
  email: string;
  onBack: () => void;
}

export function EmailVerificationScreen({ email, onBack }: EmailVerificationScreenProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Listen for auth state changes (email verification)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          setIsVerifying(true);
          toast({
            title: "Email verified!",
            description: "Redirecting to complete your setup...",
          });
          
          // Small delay for better UX
          setTimeout(() => {
            window.location.href = '/onboarding';
          }, 1500);
        }
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, [toast]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast({
          title: "Failed to resend email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email sent!",
          description: "Check your inbox for the verification link.",
        });
        setResendCooldown(60); // 60 second cooldown
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isVerifying) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 py-8"
      >
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">
            Email Verified!
          </h3>
          <p className="text-muted-foreground">
            Setting up your account...
          </p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center space-y-6 py-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex justify-center"
      >
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center relative">
          <Mail className="h-8 w-8 text-primary" />
          <motion.div
            className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          />
        </div>
      </motion.div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Check your email!</h3>
        <p className="text-muted-foreground">
          We've sent a verification link to
        </p>
        <p className="font-medium text-primary break-all">{email}</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            <strong>Next steps:</strong>
          </p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1 text-left">
            <li>• Check your inbox (and spam folder)</li>
            <li>• Click the verification link</li>
            <li>• You'll be automatically redirected back here</li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            onClick={handleResendEmail}
            variant="outline"
            disabled={isResending || resendCooldown > 0}
            className="w-full"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>

          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign up
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Didn't receive an email? Check your spam folder or try resending.
      </p>
    </motion.div>
  );
}