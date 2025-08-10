import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Holiday {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchHolidays = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("holiday_periods")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching holidays:", err);
    } finally {
      setLoading(false);
    }
  };

  const addHoliday = async (holiday: {
    name: string;
    start_date: string;
    end_date: string;
  }) => {
    if (!user) return { error: "User not authenticated" };

    try {
      const { data, error } = await supabase
        .from("holiday_periods")
        .insert({
          ...holiday,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setHolidays(prev => [...prev, data].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ));
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase
        .from("holiday_periods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setHolidays(prev => prev.filter(h => h.id !== id));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const updateHoliday = async (id: string, updates: Partial<Holiday>) => {
    try {
      const { data, error } = await supabase
        .from("holiday_periods")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      setHolidays(prev => prev.map(h => h.id === id ? data : h));
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [user]);

  return {
    holidays,
    loading,
    error,
    addHoliday,
    deleteHoliday,
    updateHoliday,
    refetch: fetchHolidays,
  };
}