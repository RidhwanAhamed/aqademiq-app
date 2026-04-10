
-- 1. Ambassador codes table
CREATE TABLE public.ambassador_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  ambassador_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ambassador_name text,
  ambassador_email text,
  is_active boolean NOT NULL DEFAULT true,
  max_redemptions integer NOT NULL DEFAULT 1000,
  redemption_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive unique index on code
CREATE UNIQUE INDEX ambassador_codes_code_upper_idx ON public.ambassador_codes (upper(code));

ALTER TABLE public.ambassador_codes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active codes (needed for validation)
CREATE POLICY "Authenticated users can read active codes"
  ON public.ambassador_codes FOR SELECT TO authenticated
  USING (is_active = true);

-- No insert/update/delete for normal users (service role only)

-- 2. Referral redemptions table
CREATE TABLE public.referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.ambassador_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

-- One redemption per user ever
CREATE UNIQUE INDEX referral_redemptions_user_unique ON public.referral_redemptions (user_id);

ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redemption"
  ON public.referral_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own redemption"
  ON public.referral_redemptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Add referred_by_code_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_code_id uuid REFERENCES public.ambassador_codes(id) ON DELETE SET NULL;

-- 4. Secure redemption RPC
CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_code_row ambassador_codes%ROWTYPE;
  v_existing_redemption uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Check if user already redeemed any code
  SELECT id INTO v_existing_redemption
    FROM referral_redemptions WHERE user_id = v_user_id LIMIT 1;
  IF v_existing_redemption IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_redeemed');
  END IF;

  -- Find the code (case-insensitive)
  SELECT * INTO v_code_row
    FROM ambassador_codes WHERE upper(code) = upper(p_code) LIMIT 1;
  IF v_code_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF NOT v_code_row.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_inactive');
  END IF;

  IF v_code_row.redemption_count >= v_code_row.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_exhausted');
  END IF;

  -- Prevent self-referral
  IF v_code_row.ambassador_user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  -- Atomically: insert redemption, increment counter, update profile
  INSERT INTO referral_redemptions (code_id, user_id)
    VALUES (v_code_row.id, v_user_id);

  UPDATE ambassador_codes
    SET redemption_count = redemption_count + 1, updated_at = now()
    WHERE id = v_code_row.id;

  UPDATE profiles
    SET referred_by_code_id = v_code_row.id, updated_at = now()
    WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'ambassador_name', v_code_row.ambassador_name,
    'code', v_code_row.code
  );
END;
$$;

-- 5. Seed example ambassador codes
INSERT INTO public.ambassador_codes (code, ambassador_name, ambassador_email, is_active, max_redemptions)
VALUES
  ('CAMPUS2025', 'Demo Ambassador', 'demo@aqademiq.com', true, 500),
  ('AQADEMIQ', 'Official Launch', 'team@aqademiq.com', true, 10000);
