# Quick Start Testing Guide - Google Calendar Fixes

## ⚡ 5-Minute Test

### Prerequisites:
- Latest code deployed
- Latest database migration applied
- Browser DevTools open (F12)

### Test Steps:

1. **Navigate to Settings**
   ```
   Settings → General → Google Calendar Integration
   ```

2. **Connect to Google**
   - Click "Connect to Google" button
   - Complete OAuth flow in popup
   - **Expected**: "Connected to Google Calendar" appears ✅

3. **Refresh Page**
   - Press `F12` to open DevTools
   - Go to Console tab
   - Press `F5` to refresh page
   - **Expected**: Console shows `✅ Token status check successful: CONNECTED` ✅

4. **Verify Connection Persists**
   - Wait for page to fully load
   - Navigate back to Settings → General
   - **Expected**: Still shows "Connected to Google Calendar" ✅

### ✅ Quick Test Passed!
If all steps show expected results, the fix is working!

---

## 🔍 Checking Console Logs

### What to Look For:

#### Successful Connection:
```
🔄 Attempting to refresh Google tokens...
✅ Tokens refreshed successfully on app load
✅ Google Calendar tokens verified after authentication
```

#### No Refresh Needed:
```
🔄 Attempting to refresh Google tokens...
ℹ️ Token refresh skipped (user may not have connected yet)
📋 Checking token status (attempt 1/3)...
✅ Token status check successful: CONNECTED
```

#### With Retries (Normal after network issues):
```
📋 Checking token status (attempt 1/3)...
❌ RPC error on attempt 1: Network error
⏳ Retrying token check... (2 attempts remaining)
📋 Checking token status (attempt 2/3)...
✅ Token status check successful: CONNECTED
```

---

## 📊 Full Test Matrix

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Initial Connect | Click "Connect to Google" → OAuth | "Connected" status ✅ |
| Persistence | Refresh page (F5) | Status remains "Connected" ✅ |
| Console Logs | Open DevTools → Console | See success messages ✅ |
| Disconnect | Click "Disconnect" | Status becomes "Not Connected" ✅ |
| Reconnect | Click "Connect to Google" again | "Connected" status ✅ |

---

## 🐛 Troubleshooting

### Issue: "Not Connected" after refresh
**Solution:**
1. Open browser console (F12)
2. Look for error messages
3. Check if tokens exist in database:
   ```sql
   SELECT * FROM public.google_tokens WHERE user_id = '[YOUR_USER_ID]';
   ```

### Issue: Seeing "RPC error" messages
**Solution:**
- This is normal if it retries successfully
- If all 3 retries fail, check Supabase status
- Verify RLS policies on `google_tokens` table

### Issue: Connect button doesn't work
**Solution:**
1. Check browser popup blocker
2. Verify Google OAuth credentials in Supabase
3. Check redirect URI matches: `{your-domain}/auth/callback`

---

## 📝 Database Verification

### Check Tokens Exist:
```sql
SELECT user_id, created_at, expires_at 
FROM public.google_tokens 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check Expired Tokens (Should still show as connected):
```sql
SELECT user_id, expires_at, now() as current_time
FROM public.google_tokens 
WHERE expires_at < now()
LIMIT 5;
```

### Monitor Token Events:
```sql
SELECT created_at, action, details
FROM public.security_audit_log 
WHERE action LIKE '%google_token%' 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## ✨ Expected Behavior After Fix

### Before This Fix ❌
- Connect → Click "Connected" ✅
- Refresh page → "Not Connected" ❌ (BROKEN)
- No token refresh attempt
- No retry logic

### After This Fix ✅
- Connect → Click "Connected" ✅
- Refresh page → Still "Connected" ✅ (FIXED)
- Automatic token refresh on load
- 3 retry attempts for robustness
- Detailed console logging

---

## 🚀 Ready to Test?

1. Open browser DevTools (F12)
2. Go to Settings → Google Calendar Integration
3. Click "Connect to Google"
4. Check console logs match expected output
5. Refresh page
6. Verify status persists

**Questions? Check:**
- `GOOGLE_CALENDAR_FIXES.md` - Technical details
- `IMPLEMENTATION_SUMMARY.md` - Full implementation notes
- Browser console - Real-time diagnostics
