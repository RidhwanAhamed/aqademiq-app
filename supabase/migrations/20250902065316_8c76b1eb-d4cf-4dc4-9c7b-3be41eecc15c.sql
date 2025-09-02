-- Update validate_redirect_uri function to include Lovable domains
CREATE OR REPLACE FUNCTION public.validate_redirect_uri(p_redirect_uri text, p_allowed_domains text[] DEFAULT ARRAY['localhost'::text, '.vercel.app'::text, '.netlify.app'::text, '.lovable.app'::text, '.lovableproject.com'::text])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uri_host TEXT;
  domain TEXT;
BEGIN
  -- Extract host from URI
  uri_host := substring(p_redirect_uri FROM 'https?://([^/]+)');
  
  IF uri_host IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check against allowed domains
  FOREACH domain IN ARRAY p_allowed_domains
  LOOP
    IF uri_host = domain OR uri_host LIKE '%' || domain THEN
      -- Log successful validation
      PERFORM public.log_security_event(
        'redirect_uri_validated',
        'oauth_security',
        NULL,
        jsonb_build_object(
          'redirect_uri', p_redirect_uri,
          'matched_domain', domain,
          'timestamp', now()
        )
      );
      RETURN TRUE;
    END IF;
  END LOOP;
  
  -- Log failed validation
  PERFORM public.log_security_event(
    'redirect_uri_rejected',
    'oauth_security',
    NULL,
    jsonb_build_object(
      'redirect_uri', p_redirect_uri,
      'host', uri_host,
      'timestamp', now()
    )
  );
  
  RETURN FALSE;
END;
$function$