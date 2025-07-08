#!/bin/bash

# Avatar Sync Script
echo "🔄 Starting avatar sync for all users..."

# Check if server is running
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "❌ Server not running on localhost:3000"
    echo "Please start the development server first: npm run dev"
    exit 1
fi

echo "✅ Server is running"

# You need to be logged in as an admin user in your browser first
# This script will use your browser's session cookie

echo "📋 Instructions:"
echo "1. Make sure you're logged in as an admin user in your browser"
echo "2. Open browser DevTools (F12)"
echo "3. Go to Application/Storage tab"
echo "4. Copy your auth token from localStorage or cookies"
echo ""
echo "Alternatively, get your Firebase Auth token:"
echo "1. In browser console, run: firebase.auth().currentUser.getIdToken().then(token => console.log(token))"
echo "2. Copy the token and set it as AUTH_TOKEN environment variable"
echo ""

# Check if AUTH_TOKEN is provided
if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ AUTH_TOKEN environment variable not set"
    echo ""
    echo "To run this script:"
    echo "AUTH_TOKEN='your-firebase-token-here' ./sync-avatars.sh"
    echo ""
    echo "Or export it first:"
    echo "export AUTH_TOKEN='your-firebase-token-here'"
    echo "./sync-avatars.sh"
    exit 1
fi

echo "🔑 Auth token found, calling avatar sync endpoint..."

# Call the avatar sync endpoint
response=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    http://localhost:3000/api/users/sync-all-avatars)

# Extract HTTP status code (last 3 characters)
http_code="${response: -3}"
# Extract response body (everything except last 3 characters)
response_body="${response%???}"

echo "📡 HTTP Status: $http_code"

if [ "$http_code" = "200" ]; then
    echo "✅ Avatar sync completed successfully!"
    echo "📄 Response:"
    echo "$response_body" | jq . 2>/dev/null || echo "$response_body"
elif [ "$http_code" = "401" ]; then
    echo "❌ Authentication failed - invalid or expired token"
    echo "Please get a fresh Firebase auth token"
elif [ "$http_code" = "403" ]; then
    echo "❌ Access denied - admin role required"
    echo "Please ensure you're logged in as an admin user"
else
    echo "❌ Request failed with status $http_code"
    echo "📄 Response:"
    echo "$response_body"
fi

echo ""
echo "🔍 Check the application logs for detailed sync results" 