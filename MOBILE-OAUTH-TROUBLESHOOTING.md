# Mobile OAuth Troubleshooting Guide

## 🚨 Common Mobile OAuth Issues

### Issue: "Continue with Google" button refreshes page instead of proceeding

This is a common issue on mobile devices caused by several mobile browser limitations and security policies.

## 🔍 Root Causes

### 1. Mobile Browser Popup Blocking

- **Problem**: Mobile browsers aggressively block popup windows
- **Symptoms**: Button click appears to do nothing or page refreshes
- **Solution**: Use direct redirect instead of popup/JavaScript navigation

### 2. Third-Party Cookie Restrictions

- **Problem**: Mobile Safari and other browsers block third-party cookies by default
- **Symptoms**: OAuth flow starts but fails during callback
- **Solution**: Configure cookies with `sameSite: "lax"` instead of `"strict"`

### 3. JavaScript Navigation Issues

- **Problem**: Mobile browsers handle JavaScript-based navigation differently
- **Symptoms**: OAuth flow appears to complete but doesn't redirect properly
- **Solution**: Use `window.location.href` for mobile redirects

### 4. iOS Safari Specific Issues

- **Problem**: iOS Safari has strict security policies for OAuth flows
- **Symptoms**: OAuth works on other browsers but fails on iOS Safari
- **Solution**: Detect iOS Safari and use platform-specific handling

## ✅ Solutions Implemented

### 1. Mobile-Optimized OAuth Button (`MobileOAuthButton`)

Created a specialized component that:

- Detects mobile browsers using user agent and screen width
- Uses direct redirect (`redirect: true`) for mobile devices
- Uses JavaScript navigation (`redirect: false`) for desktop
- Includes fallback handling for failed attempts
- Adds mobile-specific touch interaction optimizations

```typescript
// Mobile detection
const isMobileDevice = (): boolean => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768
  );
};

// Platform-specific OAuth handling
if (isMobile) {
  await signIn("google", { callbackUrl, redirect: true });
} else {
  const result = await signIn("google", { callbackUrl, redirect: false });
  // Handle result with JavaScript navigation
}
```

### 2. Enhanced NextAuth Configuration

Updated auth configuration with mobile-specific optimizations:

```typescript
// Mobile-friendly cookie settings
cookies: {
  sessionToken: {
    options: {
      sameSite: "lax", // Better mobile compatibility than "strict"
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    }
  }
}

// Enhanced Google OAuth configuration
Google({
  authorization: {
    params: {
      prompt: "select_account",
      access_type: "offline",
      response_type: "code",
      include_granted_scopes: "true",
      approval_prompt: "force", // Ensure refresh token
    },
  },
  checks: ["pkce", "state"], // Enhanced security
})
```

### 3. Mobile-Specific UI Improvements

- Added horizontal padding (`px-4`) to prevent edge-to-edge layout issues
- Optimized touch targets with proper sizing and spacing
- Added iOS-specific touch handling to prevent zoom on tap
- Improved loading states with platform-specific messaging

## 🧪 Testing Your Implementation

### 1. Test on Real Devices

Always test OAuth on actual mobile devices, not just browser dev tools:

**iOS Safari:**

- iPhone Safari (most restrictive)
- iPad Safari
- iOS Chrome (uses Safari WebKit)

**Android:**

- Chrome Mobile
- Samsung Internet
- Firefox Mobile

### 2. Test Different Network Conditions

Mobile networks can cause OAuth timeouts:

- WiFi connection
- 4G/5G cellular
- Slow 3G simulation

### 3. Test with Different User States

- First-time sign-in
- Existing user sign-in
- Sign-in after sign-out
- Sign-in with multiple Google accounts

### 4. Debug Tools

Use the OAuth debug endpoint to verify configuration:

```bash
# Check OAuth configuration
GET /api/auth/debug-oauth

# Check specific user
GET /api/auth/debug-oauth?user=user@example.com
```

## 🔧 Debugging Steps

### 1. Check Browser Console

On mobile devices, enable remote debugging:

**iOS Safari:**

1. Enable Safari Developer Menu on Mac
2. Connect device via USB
3. Debug via Safari Developer Tools

**Android Chrome:**

1. Enable USB Debugging on device
2. Connect to Chrome DevTools via `chrome://inspect`

### 2. Common Error Messages

**"redirect_uri_mismatch":**

- Verify `NEXTAUTH_URL` environment variable
- Check Google OAuth Console redirect URIs
- Ensure URLs match exactly (including https/http)

**"invalid_request":**

- Usually indicates environment variable issues
- Check if `${vercel_url}` placeholder is being resolved
- Verify all required OAuth parameters

**OAuth flow starts but never completes:**

- Check cookie settings (`sameSite`, `secure`)
- Verify callback URL accessibility
- Test with network debugging enabled

### 3. Network Analysis

Use mobile browser network tabs to check:

- OAuth redirect chains
- Failed requests
- Cookie setting/reading issues
- CORS errors

## 🚀 Quick Fix Checklist

1. **✅ Use MobileOAuthButton component** instead of custom implementation
2. **✅ Set `NEXTAUTH_URL`** environment variable correctly
3. **✅ Configure Google OAuth Console** with correct redirect URIs
4. **✅ Use `sameSite: "lax"`** for cookies instead of "strict"
5. **✅ Test on real mobile devices** not just browser dev tools
6. **✅ Check network connectivity** and timeout settings
7. **✅ Verify environment variables** are properly set in deployment

## 📱 Mobile-Specific Environment Variables

Ensure these are set correctly for mobile compatibility:

```bash
# Required
NEXTAUTH_URL=https://your-domain.com  # Must be exact production URL
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_SECRET=your-secret-key

# OAuth Console URLs to add
https://your-domain.com/api/auth/callback/google
http://localhost:3000/api/auth/callback/google (for development)
```

## 🆘 If Issues Persist

1. **Check Google OAuth Console Settings:**

   - Verify redirect URIs match exactly
   - Ensure OAuth consent screen is configured
   - Check quota limits and API restrictions

2. **Test Environment Variables:**

   ```bash
   npm run validate:oauth
   ```

3. **Check Server Logs:**

   - Look for OAuth callback errors
   - Check environment variable resolution
   - Verify Firebase Auth integration

4. **Contact Support:**
   If you've followed all steps and issues persist, provide:
   - Device/browser information
   - Console error messages
   - Network debugging output
   - OAuth debug endpoint results

## 🎯 Success Indicators

When working correctly, you should see:

- **Mobile**: Page redirects to Google, then back to your app
- **Desktop**: JavaScript navigation handles the flow smoothly
- **Both**: User is signed in and redirected to intended destination
- **Debug**: OAuth debug endpoint shows correct configuration

## 📋 Browser Compatibility Matrix

| Browser          | Status   | Notes                      |
| ---------------- | -------- | -------------------------- |
| iOS Safari       | ✅ Fixed | Uses direct redirect       |
| iOS Chrome       | ✅ Fixed | Uses Safari WebKit         |
| Android Chrome   | ✅ Fixed | Uses direct redirect       |
| Samsung Internet | ✅ Fixed | Uses direct redirect       |
| Firefox Mobile   | ✅ Fixed | Uses direct redirect       |
| Desktop Chrome   | ✅ Works | Uses JavaScript navigation |
| Desktop Safari   | ✅ Works | Uses JavaScript navigation |
| Desktop Firefox  | ✅ Works | Uses JavaScript navigation |
