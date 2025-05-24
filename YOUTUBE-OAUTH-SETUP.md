# YouTube OAuth Setup

## Environment Variables

The following environment variables are required for YouTube OAuth functionality:

```bash
# YouTube API Credentials (required)
YOUTUBE_CLIENT_ID="your-client-id"
YOUTUBE_CLIENT_SECRET="your-client-secret"
YOUTUBE_REFRESH_TOKEN="your-refresh-token"

# Base URL for OAuth callbacks (required for production)
NEXTAUTH_URL="https://yourdomain.com"
```

## Development vs Production

### Development

- The system automatically detects localhost and converts `0.0.0.0` binding to `localhost:3000`
- No need to set `NEXTAUTH_URL` in development
- OAuth callbacks will use `http://localhost:3000/api/youtube/callback`

### Production (Vercel/Netlify/etc.)

- **Must set `NEXTAUTH_URL`** to your production domain
- Example: `NEXTAUTH_URL="https://myapp.vercel.app"`
- OAuth callbacks will use `https://myapp.vercel.app/api/youtube/callback`

## Google Cloud Console Setup

Make sure your OAuth callback URLs are configured in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to APIs & Services > Credentials
4. Edit your OAuth 2.0 Client
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/youtube/callback` (for development)
   - `https://yourdomain.com/api/youtube/callback` (for production)

## Authentication Flow

1. User visits `/admin/youtube-auth`
2. Click "Authenticate with YouTube"
3. Redirected to Google OAuth
4. After authorization, redirected back to `/api/youtube/callback`
5. Tokens are saved and user is redirected back to auth page

## Troubleshooting

- **0.0.0.0 redirect issues**: The system automatically handles this in development
- **Production redirect issues**: Ensure `NEXTAUTH_URL` is set correctly
- **Missing channels**: Make sure the authenticated Google account has a YouTube channel
- **Scope issues**: The app requests upload and readonly permissions automatically
