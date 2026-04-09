DELETE FROM public.ambassador_codes WHERE code IN ('CAMPUS2025', 'AQADEMIQ');
INSERT INTO public.ambassador_codes (code, ambassador_name, is_active, max_redemptions)
VALUES ('GOAT_ZAYAAN', 'Zayaan', true, 10000);