-- Update the validate_redirect_uri function to include aqademiq.app domain
DROP FUNCTION IF EXISTS public.validate_redirect_uri(TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION public.validate_redirect_uri(
  p_redirect_uri TEXT,
  p_allowed_domains TEXT[] DEFAULT ARRAY[
    'localhost', 
    '127.0.0.1',
    '.vercel.app', 
    '.netlify.app',
    '.aqademiq.app',
    'aqademiq.app',
    '.lovable.app',
    '.lovableproject.com'
  ]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uri_host TEXT;
  domain TEXT;
BEGIN
  -- Allow common mobile/webview loopback schemes explicitly
  IF p_redirect_uri LIKE 'capacitor://localhost%' THEN
    RETURN TRUE;
  END IF;

  -- Extract host from URI
  uri_host := substring(p_redirect_uri FROM 'https?://([^/]+)');
  
  IF uri_host IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check against allowed domains
  FOREACH domain IN ARRAY p_allowed_domains LOOP
    -- Exact match for localhost
    IF domain = 'localhost' AND uri_host ~ '^localhost(:[0-9]+)?$' THEN
      RETURN TRUE;
    END IF;

    -- Exact match for 127.0.0.1 loopback
    IF domain = '127.0.0.1' AND uri_host ~ '^127\.0\.0\.1(:[0-9]+)?$' THEN
      RETURN TRUE;
    END IF;
    
    -- Suffix match for other domains (e.g., .vercel.app matches any subdomain)
    IF domain LIKE '.%' AND uri_host LIKE '%' || domain THEN
      RETURN TRUE;
    END IF;
    
    -- Exact domain match (e.g., aqademiq.app)
    IF domain NOT LIKE '.%' AND domain != 'localhost' AND (uri_host = domain OR uri_host = 'www.' || domain) THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$;