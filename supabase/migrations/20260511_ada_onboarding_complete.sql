-- ============================================================
-- ADA ONBOARDING QUESTIONNAIRE — Full DB Setup
-- Run this in Supabase SQL Editor (via Lovable or Dashboard)
-- ============================================================

-- 1. Create the onboarding_questionnaire table
CREATE TABLE IF NOT EXISTS public.onboarding_questionnaire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Step 1: Performance Baseline
    cgpa TEXT,                          -- e.g. "3.0"
    biggest_headache TEXT,              -- e.g. "Math", "Science", "Programming", etc.
    study_hours TEXT,                   -- e.g. "2" (daily hours)

    -- Step 2: Procrastination Style
    start_assignment TEXT,              -- "Day it's assigned" | "Halfway to deadline" | "The 24-hour crunch"
    stops_starting TEXT,                -- "Too big/overwhelming" | "Fear of not being perfect" | "Phone/Social Media" | "It's just boring"

    -- Step 3: Behavioral Risk
    overwhelmed_scale INTEGER,          -- 1-10
    calendar_use TEXT,                  -- "Yes, I'm organized" | "No, it's all in my head"
    peak_brain_power TEXT,              -- "Early Bird" | "Afternoon Steady" | "Night Owl"

    -- Step 4: Immediate Solution
    avoided_task TEXT,                  -- Free text: task they're avoiding
    micro_task TEXT,                    -- Free text: smallest 5-min micro-task

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add a unique constraint so each user has only one questionnaire
ALTER TABLE public.onboarding_questionnaire
    ADD CONSTRAINT onboarding_questionnaire_user_id_unique UNIQUE (user_id);

-- 3. Enable Row Level Security
ALTER TABLE public.onboarding_questionnaire ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — users can only access their own data
CREATE POLICY "Users can insert their own questionnaire"
    ON public.onboarding_questionnaire FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questionnaire"
    ON public.onboarding_questionnaire FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can select their own questionnaire"
    ON public.onboarding_questionnaire FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Ensure profiles table has onboarding_completed column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 6. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_questionnaire_user
    ON public.onboarding_questionnaire(user_id);

-- 7. Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_onboarding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_onboarding_updated_at ON public.onboarding_questionnaire;
CREATE TRIGGER trigger_onboarding_updated_at
    BEFORE UPDATE ON public.onboarding_questionnaire
    FOR EACH ROW
    EXECUTE FUNCTION public.update_onboarding_updated_at();
