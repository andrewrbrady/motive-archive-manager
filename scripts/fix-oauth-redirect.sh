#!/bin/bash

# OAuth Redirect URI Fix Script
# This script helps fix the common OAuth redirect URI issue

echo "🔧 OAuth Redirect URI Fix Script"
echo "================================="
echo ""

# Check if we're in a Vercel environment
if [ -n "$VERCEL_URL" ]; then
    COMPUTED_URL="https://$VERCEL_URL"
    echo "✅ Detected Vercel environment"
    echo "   VERCEL_URL: $VERCEL_URL"
else
    COMPUTED_URL="http://localhost:3000"
    echo "🏠 Local development environment"
fi

# Check current NEXTAUTH_URL
if [ -n "$NEXTAUTH_URL" ]; then
    echo "✅ NEXTAUTH_URL is set: $NEXTAUTH_URL"
else
    echo "❌ NEXTAUTH_URL is not set"
    echo "   Computed URL would be: $COMPUTED_URL"
fi

echo ""
echo "📋 Required OAuth Callback URLs:"
echo "   Development: http://localhost:3000/api/auth/callback/google"

if [ -n "$VERCEL_URL" ]; then
    echo "   Production: https://$VERCEL_URL/api/auth/callback/google"
fi

if [ -n "$NEXTAUTH_URL" ]; then
    echo "   Current: $NEXTAUTH_URL/api/auth/callback/google"
fi

echo ""
echo "🔧 To fix the redirect URI issue:"
echo ""
echo "1. Set environment variables:"
if [ -n "$VERCEL_URL" ]; then
    echo "   NEXTAUTH_URL=https://$VERCEL_URL"
else
    echo "   NEXTAUTH_URL=http://localhost:3000"
fi

echo "   NEXTAUTH_SECRET=your-secret-here"
echo "   (or AUTH_SECRET=your-secret-here for NextAuth v5)"
echo ""

echo "2. Update Google OAuth Console:"
echo "   - Go to https://console.cloud.google.com/"
echo "   - Navigate to APIs & Services > Credentials"
echo "   - Add these redirect URIs:"
echo "     * http://localhost:3000/api/auth/callback/google"

if [ -n "$VERCEL_URL" ]; then
    echo "     * https://$VERCEL_URL/api/auth/callback/google"
fi

echo ""
echo "3. Restart your application after making changes"
echo ""

# Check if tsx is available for validation
if command -v tsx &> /dev/null; then
    echo "🔍 Running OAuth configuration validation..."
    echo ""
    npm run validate:oauth
else
    echo "⚠️  Install tsx to run configuration validation:"
    echo "   npm install -g tsx"
    echo "   npm run validate:oauth"
fi 