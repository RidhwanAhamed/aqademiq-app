import { useState } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/config/supabaseClient";
import { toast } from "sonner";

interface FormData {
  email: string;
}

export function EarlyAccessForm() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: user?.email || ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Check if user already has early access
  React.useEffect(() => {
    if (user) {
      checkEarlyAccess();
    }
  }, [user]);

  const checkEarlyAccess = async () => {
    try {
      const { data, error } = await supabase.rpc('user_has_marketplace_early_access');
      if (error) throw error;
      setHasAccess(data);
      setIsSubmitted(data);
    } catch (error) {
      console.error('Error checking early access:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      // Insert into early access table
      const { error } = await supabase
        .from('marketplace_early_access')
        .insert({
          user_id: user?.id || crypto.randomUUID(),
          email: formData.email,
          referral_source: 'teaser_page',
          metadata: {
            submitted_at: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      setIsSubmitted(true);
      setHasAccess(true);
      
      toast.success("You're on the early access list!", {
        description: "We'll notify you as soon as the marketplace launches."
      });

    } catch (error: any) {
      console.error('Error submitting early access:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ email: e.target.value });
  };

  if (isSubmitted || hasAccess) {
    return (
      <Card className="bg-green-50 border-green-200 shadow-card">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">You're on the list!</h3>
          <p className="text-green-700 mb-4">
            We'll send you an email as soon as the marketplace launches.
          </p>
          <div className="text-sm text-green-600">
            Expected launch: Early 2026
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleEmailChange}
              required
              className="pl-10 h-12 text-lg"
              disabled={isSubmitting}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={isSubmitting || !formData.email}
            className="w-full h-12 text-lg bg-gradient-marketplace hover:opacity-90 shadow-marketplace"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Joining Early Access...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-2" />
                Get Early Access
              </>
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            We respect your privacy. No spam, just important updates about the marketplace launch.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}