
-- Performance index for streak ranking
CREATE INDEX IF NOT EXISTS idx_profiles_study_streak_desc ON public.profiles (study_streak DESC NULLS LAST);

-- Leaderboard function: returns top N users ranked by study_streak using RANK()
CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  study_streak integer,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    COALESCE(p.study_streak, 0) AS study_streak,
    RANK() OVER (ORDER BY COALESCE(p.study_streak, 0) DESC) AS rank
  FROM public.profiles p
  ORDER BY rank ASC, p.created_at ASC
  LIMIT p_limit;
$$;

-- Current user rank function: returns a single user's rank across all users
CREATE OR REPLACE FUNCTION public.get_user_streak_rank(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  study_streak integer,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ranked.user_id,
    ranked.full_name,
    ranked.study_streak,
    ranked.rank
  FROM (
    SELECT
      p.user_id,
      p.full_name,
      COALESCE(p.study_streak, 0) AS study_streak,
      RANK() OVER (ORDER BY COALESCE(p.study_streak, 0) DESC) AS rank
    FROM public.profiles p
  ) ranked
  WHERE ranked.user_id = p_user_id;
$$;
