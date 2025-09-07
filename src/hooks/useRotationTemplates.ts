import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';

export interface RotationTemplate {
  id: string;
  name: string;
  description?: string;
  rotation_type: 'none' | 'weekly' | 'biweekly' | 'odd_weeks' | 'even_weeks' | 'custom';
  rotation_weeks?: number[] | null;
  is_system_template: boolean;
  created_at: string;
}

export function useRotationTemplates() {
  const [templates, setTemplates] = useState<RotationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("rotation_templates")
        .select("*")
        .eq("is_system_template", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as RotationTemplate[]);
    } catch (err: any) {
      console.error("Error fetching rotation templates:", err);
      setError("Failed to fetch rotation templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
  };
}