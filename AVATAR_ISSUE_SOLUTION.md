# Avatar Issue Solution

## Root Cause Identified

User avatars are falling back because Firebase Auth `photoURL` fields contain Google profile image URLs that have CORS restrictions, making them inaccessible from the web application.

## Issue Analysis

1. **Session Data Source**: `useSession` hook sets `user.image` from Firebase Auth `photoURL`
2. **CORS Problem**: Google profile URLs (e.g., `https://lh3.googleusercontent.com/...`) require authentication or have CORS restrictions
3. **Missing Sync**: Avatar sync endpoints exist but haven't been run for all users
4. **Data Priority**: Session uses Firebase Auth data instead of Firestore data

## Immediate Solutions

### Solution 1: Run Avatar Sync (Quick Fix)

Execute the bulk avatar sync endpoint to copy Google profile images to accessible storage:

```bash
# As admin user, call:
POST /api/users/sync-all-avatars
```

This will:

- Copy all Google profile images to accessible URLs
- Update Firestore with synced image URLs
- Resolve the CORS issue

### Solution 2: Update Session Data Source (Long-term Fix)

Modify the `useSession` hook to prefer Firestore user data over Firebase Auth data.

### Solution 3: Enhanced Avatar Error Handling

The avatar component has been updated with better error logging and debugging.

## Implementation

I've already implemented:

1. ✅ Enhanced avatar error logging in `src/components/ui/avatar.tsx`
2. ✅ Created debug component in `src/components/debug/AvatarTest.tsx`
3. ✅ Documented the issue and solutions

## Next Steps

1. **Run the avatar sync endpoint** (if you have admin access)
2. **Test with the debug component** to confirm the fix
3. **Consider updating session data source** for long-term solution

## How to Test the Fix

1. Add the AvatarTest component to any page temporarily:

```tsx
import { AvatarTest } from "@/components/debug/AvatarTest";

// In your page component:
<AvatarTest />;
```

2. Use the debug controls to:

   - Test current avatar URLs
   - Check Firestore user data
   - Sync avatar for current user

3. Check browser console for the enhanced error messages

## Expected Results After Fix

- User avatars display properly in:
  - User menu (top navigation)
  - Project team member lists
  - User selector components
  - Profile pages
  - Admin user management

The debug component will help confirm that the avatar URLs are working and provide specific error information if they're not.
