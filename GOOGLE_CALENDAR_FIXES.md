# Google Calendar Connection Persistence Fixes

## Problem
Google Calendar connection status was showing as "connected" after completing the OAuth flow, but immediately displayed as "Not Connected" when leaving the app and returning (page reload).

## Root Cause Analysis
The issue was caused by multiple problems in both the frontend and backend token handling:

1. **Incorrect RPC Function Calls**: Frontend was calling `has_google_tokens()` without the required `p_user_id` parameter
2. **Missing Token Refresh Logic**: No attempt to refresh expired tokens before checking connection status
3. **Poor Error Handling**: No retry logic when token status checks failed
4. **Overly Strict Token Validation**: Database function only recognized non-expired tokens, causing disconnection when tokens expired

## Fixes Implemented

### FIX 1: Correct RPC Function Calls with User ID Parameter
**Location**: `src/hooks/useGoogleCalendar.ts`

**Problem**: 
```typescript
// OLD - Missing user.id parameter
const { data: hasTokens, error: tokenError } = await supabase
  .rpc('has_google_tokens');
```

**Solution**:
```typescript
// NEW - Include user.id parameter
const { data, error } = await supabase
  .rpc('has_google_tokens', { p_user_id: user.id });
```

**Changes Made**:
- Updated `useEffect` hook (line 54-55)
- Updated `handleAuthCallback` function (line 259-260)
- Updated `disconnectFromGoogle` function (line 313)

**Why This Matters**:
- The RPC function signature requires `p_user_id` parameter
- Without it, the function defaults to `auth.uid()` which may have timing issues during component initialization
- Explicitly passing the user ID ensures correct parameter passing and prevents authentication context race conditions

---

### FIX 2: Token Refresh Logic Before Connection Check
**Location**: `src/hooks/useGoogleCalendar.ts` - `useEffect` hook (lines 54-87)

**Problem**:
The frontend never attempted to refresh expired tokens, so after 1 hour of expiration, users would appear disconnected even with valid refresh tokens.

**Solution**:
```typescript
// First attempt to refresh tokens
let connectionStatus = false;
try {
  const { data: refreshResult, error: refreshError } = await supabase
    .functions.invoke('google-oauth', {
      body: { action: 'refresh', userId: user.id }
    });
  
  if (!refreshError && refreshResult?.access_token) {
    connectionStatus = true;
    console.log('✅ Tokens refreshed successfully on app load');
  }
} catch (refreshError) {
  console.log('ℹ️ Token refresh skipped (user may not have connected yet)');
}

// If refresh failed, check existing tokens
if (!connectionStatus) {
  // ... existing token check logic
}
```

**Why This Matters**:
- OAuth access tokens expire after 1 hour
- Refresh tokens can be used to get new access tokens indefinitely
- By attempting refresh first, we keep users connected even after token expiration
- Graceful fallback if refresh fails or tokens don't exist yet

---

### FIX 3: Improved Token Status Function - Recognizes Expired Tokens
**Location**: `supabase/migrations/20251017201300_fix_google_token_handling.sql`

**Problem**:
```sql
-- OLD - Only recognized non-expired tokens
RETURN EXISTS (
  SELECT 1 
  FROM public.google_tokens 
  WHERE user_id = p_user_id 
  AND expires_at > now()  -- ❌ Rejected expired tokens
);
```

**Solution**:
```sql
-- NEW - Recognizes tokens even if expired (can be refreshed)
RETURN EXISTS (
  SELECT 1 
  FROM public.google_tokens 
  WHERE user_id = p_user_id 
  AND access_token IS NOT NULL
  AND refresh_token IS NOT NULL
);
```

**Why This Matters**:
- Even expired access tokens are valuable if refresh tokens exist
- Users shouldn't appear disconnected just because access token expired
- This enables the frontend to know tokens exist for refresh attempt
- Fixes the "false disconnect" issue that occurred exactly 1 hour after connection

---

### FIX 4: Retry Logic and Enhanced Error Handling
**Location**: `src/hooks/useGoogleCalendar.ts` - `useEffect` hook (lines 83-103)

**Problem**:
No retry mechanism if initial token status check failed due to network issues or timing problems.

**Solution**:
```typescript
let retries = 3;
let hasTokens = false;

while (retries > 0) {
  try {
    const { data, error } = await supabase
      .rpc('has_google_tokens', { p_user_id: user.id });
    
    if (error) {
      console.error('❌ RPC error on attempt', 4 - retries, ':', error.message);
    } else if (data !== null && data !== undefined) {
      hasTokens = !!data;
      connectionStatus = hasTokens;
      console.log(`✅ Token status check successful: ${connectionStatus ? 'CONNECTED' : 'NOT CONNECTED'}`);
      break;
    }
  } catch (e) {
    console.error('❌ Error calling has_google_tokens:', e);
  }
  
  retries--;
  if (retries > 0) {
    console.log(`⏳ Retrying token check... (${retries} attempts remaining)`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
  }
}
```

**Why This Matters**:
- Network latency or timing issues can cause temporary failures
- 3 retries with 500ms delay = 1.5 second total wait time (acceptable for app load)
- Detailed console logging helps debug connection issues
- Graceful degradation if all retries fail

---

## Testing the Fixes

### Test Case 1: Initial Connection
1. Open Settings → General → Google Calendar Integration
2. Click "Connect to Google"
3. Complete OAuth flow
4. Verify status shows "Connected to Google Calendar" ✅

### Test Case 2: Persistence After Reload
1. Complete Test Case 1
2. Refresh the page (F5)
3. Navigate to Settings → General
4. Verify status still shows "Connected to Google Calendar" ✅
5. Check browser console for "✅ Token status check successful: CONNECTED"

### Test Case 3: Token Refresh After Expiration
1. Complete Test Case 1
2. Wait 1 hour (or manually expire token in database for testing)
3. Open app and navigate to Settings → General
4. Verify status shows "Connected" (not "Not Connected")
5. Check console for "✅ Tokens refreshed successfully on app load" ✅

### Test Case 4: Network Error Recovery
1. Open Settings → General (with network throttling enabled)
2. Observe console logs showing retry attempts
3. Verify status eventually resolves to correct state
4. Verify logs show "⏳ Retrying token check..."

---

## Console Output Examples

### Successful Case:
```
🔄 Attempting to refresh Google tokens...
✅ Tokens refreshed successfully on app load
✅ Google Calendar tokens verified after authentication
```

### Refresh Not Needed:
```
🔄 Attempting to refresh Google tokens...
⚠️ Token refresh attempt failed: error details
📋 Checking token status (attempt 1/3)...
✅ Token status check successful: CONNECTED
```

### With Retries:
```
📋 Checking token status (attempt 1/3)...
❌ RPC error on attempt 1 : Network error
⏳ Retrying token check... (2 attempts remaining)
📋 Checking token status (attempt 2/3)...
✅ Token status check successful: CONNECTED
```

---

## Migration Files Applied

1. **20251017201300_fix_google_token_handling.sql**
   - Updates `has_google_tokens` function
   - Now recognizes expired tokens for refresh capability
   - Added security event logging

---

## Impact Summary

| Aspect | Before | After |
|--------|--------|-------|
| Connection Persistence | ❌ Lost after reload | ✅ Persists across reloads |
| Token Expiration Handling | ❌ Shows disconnected | ✅ Attempts refresh automatically |
| Error Recovery | ❌ Single attempt | ✅ 3 retry attempts |
| RPC Parameter Passing | ❌ Missing user.id | ✅ Explicit user.id passed |
| User Experience | ❌ Confusing disconnects | ✅ Seamless connectivity |

---

## Files Modified

1. `src/hooks/useGoogleCalendar.ts`
   - Updated `useEffect` for loading token status
   - Updated `handleAuthCallback` for verification
   - Updated `disconnectFromGoogle` for revocation

2. `supabase/migrations/20251017201300_fix_google_token_handling.sql` (NEW)
   - Database function improvements

---

## Debugging Commands

### Check if tokens exist:
```sql
SELECT * FROM public.google_tokens WHERE user_id = 'YOUR_USER_ID';
```

### Check token expiration:
```sql
SELECT user_id, expires_at, NOW() as current_time, 
  CASE WHEN expires_at > NOW() THEN 'Valid' ELSE 'Expired' END as status
FROM public.google_tokens 
WHERE user_id = 'YOUR_USER_ID';
```

### Monitor security events:
```sql
SELECT * FROM public.security_audit_log 
WHERE action LIKE '%google_token%' 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## Future Improvements

1. Add token refresh interval background job
2. Implement token expiration warning UI (e.g., "Reconnect to Google in 10 minutes")
3. Add analytics to track connection success rates
4. Implement exponential backoff for retries instead of fixed delay
5. Add more granular permission scopes management
