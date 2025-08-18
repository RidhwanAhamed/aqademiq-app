import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SecurityEvent {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export function useSecurityAudit() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("security_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents((data || []) as SecurityEvent[]);
    } catch (err: any) {
      console.error("Error fetching security events:", err);
      setError("Failed to fetch security events");
    } finally {
      setLoading(false);
    }
  };

  const logSecurityEvent = async (
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    try {
      await supabase.rpc('log_security_event', {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details || {}
      });
    } catch (err) {
      console.error("Error logging security event:", err);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  return {
    events,
    loading,
    error,
    refetch: fetchSecurityEvents,
    logEvent: logSecurityEvent,
  };
}