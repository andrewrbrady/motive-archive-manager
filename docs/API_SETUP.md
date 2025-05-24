# API Setup Guide for Dropbox to YouTube Upload Feature

This guide will help you set up the necessary API credentials for the Dropbox to YouTube upload feature.

## Overview

The video upload feature allows you to upload videos from Dropbox shared links directly to YouTube through the deliverables tab on your car pages. The process involves:

1. **Dropbox API** - To download videos from shared Dropbox links
2. **YouTube Data API v3** - To upload videos to YouTube
3. **OAuth2 Authentication** - For user consent to upload to YouTube

## Prerequisites

- A Dropbox account with API access
- A Google account
- A Google Cloud Platform project
- YouTube channel associated with your Google account

---

## Part 1: Setting up Dropbox API

### Step 1: Create a Dropbox App

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click **"Create app"**
3. Choose **"Scoped access"**
4. Choose **"Full Dropbox"** or **"App folder"** (recommended: Full Dropbox for flexibility)
5. Name your app (e.g., "Motive Archive Manager")
6. Click **"Create app"**

### Step 2: Configure App Permissions

1. In your app settings, go to the **"Permissions"** tab
2. Enable the following permissions:
   - `files.metadata.read` - Read file metadata
   - `files.content.read` - Read file content
   - `sharing.read` - Read shared links
3. Click **"Submit"** to save the permissions

### Step 3: Generate Access Token (Simple Method)

**Note:** Dropbox shows you an **App Key** and **App Secret** on the Settings tab. These are for OAuth flow, but for server-to-server access, it's easier to generate a direct access token.

1. Go to the **"Settings"** tab in your app
2. Scroll down to the **"OAuth 2"** section
3. Under **"Generated access token"**, click **"Generate"**
4. Copy the generated token - this is your `DROPBOX_ACCESS_TOKEN`

**Important:** If you don't see the "Generate" button, make sure you've submitted your permissions in Step 2 first.

### Alternative: OAuth Flow (More Complex)

If you prefer the OAuth flow using App Key + App Secret:

1. Use the **App Key** and **App Secret** from your app settings
2. Implement OAuth flow to get user authorization
3. Exchange authorization code for access token
4. Store and refresh tokens as needed

For this tutorial, we'll use the **simple direct token method** above.

### Step 4: Add to Environment Variables

Add to your `.env.local` file:

```env
DROPBOX_ACCESS_TOKEN=your_generated_access_token_here
```

**Do NOT use the App Key or App Secret** - use the generated access token from Step 3.

---

## Part 2: Setting up YouTube Data API v3 with OAuth2

**Important:** YouTube Data API v3 requires OAuth2 user consent for uploading videos. Service accounts cannot upload videos to YouTube because they cannot act on behalf of a YouTube channel owner.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name your project (e.g., "Motive Archive YouTube API")
4. Click **"Create"**

### Step 2: Enable YouTube Data API v3

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"YouTube Data API v3"**
3. Click on it and press **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** user type (unless you have Google Workspace)
3. Fill in the required information:
   - **App name**: "Motive Archive Manager" (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **"Save and Continue"**
5. **Scopes**: Click **"Add or Remove Scopes"**
   - Search for "YouTube"
   - Select **"../auth/youtube.upload"** - Upload YouTube videos
   - Click **"Update"**
   - Click **"Save and Continue"**
6. **Test users** (for development):
   - Add your Gmail address that owns the YouTube channel
   - Click **"Save and Continue"**
7. Review and click **"Back to Dashboard"**

### Step 4: Create OAuth2 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
3. Choose **"Web application"**
4. Name it (e.g., "YouTube Upload Client")
5. Add **Authorized redirect URIs**:
   - For development: `http://localhost:3000/api/youtube/callback`
   - For production: `https://yourdomain.com/api/youtube/callback`
6. Click **"Create"**
7. Copy the **Client ID** and **Client Secret**

### Step 5: Add to Environment Variables

Add to your `.env.local` file:

```env
YOUTUBE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=http://localhost:3000
```

**For production, update `NEXTAUTH_URL` to your domain:**

```env
NEXTAUTH_URL=https://yourdomain.com
```

---

## Part 3: Complete Environment Variables

Your final `.env.local` file should contain:

```env
# Dropbox API
DROPBOX_ACCESS_TOKEN=your_generated_access_token_here

# YouTube OAuth2
YOUTUBE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=http://localhost:3000

# Other existing variables...
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
```

---

## How the OAuth2 Flow Works

1. **User clicks "Upload to YouTube"** in the deliverables tab
2. **If not authenticated**, user gets an error with "Authorize YouTube Access" button
3. **User clicks authorize** → redirected to Google OAuth consent screen
4. **User grants permission** → redirected back to your app with authorization code
5. **Your app exchanges code for access/refresh tokens** → stores them in secure cookies
6. **Future uploads use stored tokens** → automatically refreshes expired tokens

## Testing the Setup

1. **Test Dropbox**: Try downloading a video from a Dropbox shared link
2. **Test YouTube OAuth**:
   - Click "Upload to YouTube" on a video deliverable
   - You should be redirected to Google for authorization
   - After granting permission, you should be redirected back
   - The upload should now work

## Troubleshooting

### Dropbox Issues

- **"Invalid Dropbox URL"**: Check that your shared link is public and accessible
- **"Failed to get direct download URL"**: Verify your access token and permissions
- **"Dropbox access token not configured"**: Check your `.env.local` file

### YouTube Issues

- **"YouTube authentication required"**: The OAuth flow needs to be completed
- **"Invalid client"**: Check your Client ID and secret
- **"Redirect URI mismatch"**: Ensure your redirect URI matches what's configured in Google Cloud Console
- **"Access blocked"**: Your app might need verification for production use

### Google Cloud Console

- **Publishing status**: For production, you may need to submit your app for verification
- **Quota limits**: YouTube API has daily quotas - monitor usage in Google Cloud Console
- **Scopes**: Ensure you've added the correct YouTube upload scope

## Security Notes

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Secure cookies** are used to store YouTube tokens
4. **HTTPS required** for production OAuth callbacks
5. **Rotate tokens** periodically for security

## API Limits

- **Dropbox**: Rate limits apply to API calls
- **YouTube**: Daily quota limits (usually 10,000 units/day)
- **File size**: YouTube has file size limits (typically 128GB)
- **Upload time**: Large files may take significant time to upload
