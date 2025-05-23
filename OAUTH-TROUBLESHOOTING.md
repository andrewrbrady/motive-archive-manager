# OAuth Authentication Troubleshooting Guide

## 🚨 Current Issue: Invalid Redirect URI Error

**Error Message:** `Error 400: invalid_request redirect_uri=https://${vercel_url}/api/auth/callback/google`

### Root Cause

The error occurs because the `${vercel_url}` placeholder is not being resolved to the actual URL. This indicates an environment variable configuration issue.

## 🔧 Immediate Fixes

### 1. Environment Variables Setup

Ensure these environment variables are properly set in your deployment platform:

```bash
# Required for NextAuth.js
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here

# Alternative (NextAuth v5)
AUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Firebase (if using)
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### 2. Google OAuth Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Find your OAuth 2.0 Client ID
4. Add these authorized redirect URIs:

```
# Production
https://your-domain.com/api/auth/callback/google

# Development
http://localhost:3000/api/auth/callback/google

# Vercel Preview (if using Vercel)
https://your-app-name-git-branch-username.vercel.app/api/auth/callback/google
```

### 3. Vercel Deployment Configuration

If using Vercel, ensure environment variables are set in:

- Project Settings > Environment Variables
- Set for Production, Preview, and Development environments

## 🔍 Debugging Tools

### Admin Debug Interface

Access the OAuth debug interface at `/admin` (requires admin role):

1. **OAuth Configuration Check**: Verify environment variables and URLs
2. **User Debug**: Check Firebase Auth and Firestore user data
3. **Real-time Troubleshooting**: Get specific error details

### API Debug Endpoint

```bash
# Check OAuth configuration
GET /api/auth/debug-oauth

# Debug specific user
GET /api/auth/debug-oauth?user=user@example.com
```

## 🛡️ Security Audit Results

### Authentication Flow

- ✅ NextAuth.js v5 properly configured
- ✅ JWT-based sessions for Edge runtime compatibility
- ✅ Firebase Admin SDK integration
- ✅ Custom claims for role-based access control

### Admin Protection

- ✅ AdminGuard component implemented
- ✅ Role-based access control (RBAC)
- ✅ Unauthorized page with user feedback
- ✅ Session validation and refresh

### User Management

- ✅ Firebase Auth + Firestore dual storage
- ✅ OAuth user creation and synchronization
- ✅ Custom claims caching (5-minute TTL)
- ✅ Error handling and fallbacks

## 🔐 Admin System Overview

### Role Structure

```typescript
interface User {
  id: string;
  roles: string[]; // ["user", "admin", "moderator"]
  creativeRoles: string[]; // ["photographer", "editor", "writer"]
  status: string; // "active", "suspended", "pending"
  accountType?: string; // "personal", "business"
}
```

### Admin Access Levels

1. **User**: Basic access to personal content
2. **Admin**: Full system access, user management
3. **Creative Roles**: Content creation and editing permissions

### Protected Routes

- `/admin/*` - Requires admin role
- `/admin/users` - User management
- `/admin/oauth-debug` - OAuth troubleshooting

## 🚀 Deployment Checklist

### Pre-deployment

- [ ] Environment variables set correctly
- [ ] Google OAuth Console configured
- [ ] Firebase project configured
- [ ] NextAuth secret generated

### Post-deployment

- [ ] Test OAuth login flow
- [ ] Verify admin access
- [ ] Check user creation in Firebase
- [ ] Test role assignments

### Monitoring

- [ ] Check application logs for auth errors
- [ ] Monitor OAuth callback success rate
- [ ] Verify user session persistence

## 🐛 Common Issues & Solutions

### Issue 1: "Configuration" Error

**Cause**: Missing or incorrect environment variables
**Solution**: Verify all required env vars are set

### Issue 2: "OAuthCallback" Error

**Cause**: Redirect URI mismatch
**Solution**: Update Google OAuth Console with correct callback URL

### Issue 3: "OAuthAccountNotLinked" Error

**Cause**: User trying to sign in with different provider
**Solution**: Guide user to use original sign-in method

### Issue 4: User not found after OAuth

**Cause**: Firebase user creation failed
**Solution**: Use debug endpoint to manually create user

### Issue 5: Admin access denied

**Cause**: User doesn't have admin role
**Solution**: Use Firebase Console to set custom claims

## 📝 Manual User Creation

If OAuth user creation fails, manually create users:

```bash
# Using the debug API
POST /api/auth/debug-oauth
{
  "uid": "user-uid",
  "email": "user@example.com",
  "name": "User Name",
  "action": "syncUser"
}
```

## 🔄 Session Management

### Session Refresh

- Sessions automatically refresh custom claims every 5 minutes
- Manual refresh available via `/api/auth/refresh-session`

### Session Debugging

```bash
# Check current session
GET /api/auth/session

# Debug session data
GET /api/auth/debug-session
```

## 📞 Support

For additional support:

1. Check application logs
2. Use the admin debug interface
3. Review Firebase Auth and Firestore data
4. Contact system administrator

## 🔗 Useful Links

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
