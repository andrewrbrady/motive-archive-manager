# Avatar Fallback Issue Diagnosis

## Problem

User avatars are not working site-wide and always fall back to the fallback, despite users having profile images.

## Potential Causes

### 1. Firebase Auth photoURL CORS Issues

- Firebase Auth provides `photoURL` from Google OAuth
- These URLs might have CORS restrictions or require authentication
- Direct access to Google profile images may be blocked

### 2. Data Structure Mismatch

- Session data uses `user.image` (from Firebase Auth `photoURL`)
- Components look for `profileImage`, `image`, or `photoURL`
- Potential inconsistency between data sources

### 3. Avatar Sync Not Working

- Avatar sync endpoints exist but may not be running automatically
- Users may need manual avatar sync to copy images to accessible storage

## Investigation Steps

### Step 1: Check Session Data Structure

In browser console, check what `session.user` contains:

```javascript
// In browser console
console.log("Session user:", JSON.parse(localStorage.getItem("session"))?.user);
```

### Step 2: Check Network Requests

1. Open Browser DevTools → Network tab
2. Filter for image requests
3. Look for failed avatar image requests
4. Check response codes and error messages

### Step 3: Test Avatar URLs Directly

Try accessing user avatar URLs directly:

```javascript
// Test if Google profile URLs work
fetch("https://lh3.googleusercontent.com/a/EXAMPLE_URL")
  .then((response) => console.log("Avatar URL response:", response.status))
  .catch((error) => console.error("Avatar URL error:", error));
```

### Step 4: Check User Data in Firestore

- Verify users have `photoURL`, `image`, or `profileImage` fields
- Check if avatar sync endpoints have been run
- Confirm data consistency

## Immediate Solutions

### Option 1: Run Avatar Sync for All Users

Execute the bulk avatar sync endpoint to copy Google profile images to accessible storage:

```bash
POST /api/users/sync-all-avatars
```

### Option 2: Update Session Data Source

Modify `useSession` hook to prefer Firestore user data over Firebase Auth data:

- Fetch user profile from Firestore
- Use `profileImage` or `image` field instead of `photoURL`
- Fallback to Firebase Auth data only if Firestore data unavailable

### Option 3: Add Avatar Error Handling

Enhance avatar components with better error handling and debugging:

- Log failed image URLs
- Implement retry logic
- Provide more informative fallbacks

## Implementation Priority

1. **Immediate**: Check browser console for image loading errors
2. **Quick Fix**: Run avatar sync for all users
3. **Long-term**: Update session data to use Firestore over Firebase Auth
4. **Enhancement**: Add comprehensive avatar error handling

## Testing After Fix

1. Check user menu avatar in top navigation
2. Verify project team member avatars
3. Test user selector components
4. Confirm profile page avatar display
5. Validate admin user management avatars

## Root Cause Hypothesis

The most likely cause is that Firebase Auth `photoURL` fields contain Google profile image URLs that have CORS restrictions or authentication requirements, making them inaccessible from the web application. The avatar sync endpoints exist to solve this by copying images to accessible storage, but may not have been run for all users.
