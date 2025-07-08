# Deployment Fixes

This document outlines the fixes implemented to resolve the deployment and runtime issues encountered with the Motive Archive Manager application.

## Issues Fixed

### 1. Database Connections During Build Time

**Problem**: The application was trying to connect to MongoDB during the build process, causing "Database connections are not available during build time" errors.

**Root Cause**: Server-side data fetching in pages was attempting to connect to the database during static generation.

**Solution**:

- Modified `src/app/cars/page.tsx` to avoid server-side database calls during build
- Moved data fetching to client-side components
- Added proper build-time detection in `src/lib/mongodb.ts`
- Updated `CarsPageClient` to handle client-side data fetching with loading states

### 2. Cache Warmup URL Parsing Errors

**Problem**: Cache warmup was failing with "Failed to parse URL" errors during startup.

**Root Cause**: Relative URLs were being used in server-side fetch calls during cache warmup.

**Solution**:

- Updated `src/lib/database/cache.ts` to use absolute URLs with proper base URL detection
- Added build-time detection to skip cache warmup during build phase
- Improved error handling with fallback values

### 3. NextAuth CSRF Token Issues

**Problem**: "MissingCSRF: CSRF token was missing during an action signin" errors in production.

**Root Cause**: Improper cookie configuration for production environment.

**Solution**:

- Enhanced `src/auth.config.ts` with proper cookie configuration
- Added secure cookie settings for production
- Improved session handling and redirect logic

### 4. Standalone Server Configuration

**Problem**: Application was configured with `output: "standalone"` but using `npm start` instead of the recommended standalone server.

**Solution**:

- Created `start-server.js` script to automatically detect and use the appropriate server mode
- Updated package.json scripts to use the new startup script
- Added fallback to regular Next.js server when standalone build is not available

## New Scripts and Tools

### Environment Check Script

```bash
npm run check-env
```

Diagnoses environment configuration and provides recommendations.

### Improved Start Scripts

```bash
npm start              # Auto-detects best server mode
npm run start:next     # Forces Next.js server
npm run start:standalone # Forces standalone server (if available)
```

## Key Changes Made

### 1. `src/app/cars/page.tsx`

- Removed server-side data fetching
- Added `shouldFetchData` prop to client component
- Improved error handling with fallback states

### 2. `src/app/cars/CarsPageClient.tsx`

- Added client-side data fetching with useEffect
- Implemented loading states
- Added proper error handling for API calls

### 3. `src/lib/mongodb.ts`

- Enhanced build-time detection
- Improved error messages
- Better handling of environment variables

### 4. `src/lib/database/cache.ts`

- Fixed URL parsing issues
- Added build-time skip logic
- Improved error handling with fallbacks

### 5. `src/auth.config.ts`

- Added proper cookie configuration
- Enhanced security settings for production
- Improved CSRF token handling

### 6. `start-server.js`

- Intelligent server mode detection
- Proper environment variable handling
- Graceful shutdown handling

### 7. `scripts/check-env.js`

- Comprehensive environment validation
- Build artifact detection
- Configuration recommendations

## Deployment Recommendations

### For Production Deployment:

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Check environment configuration**:

   ```bash
   npm run check-env
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   This will automatically use the standalone server if available, or fall back to the regular Next.js server.

### Environment Variables Required:

**Authentication**:

- `NEXTAUTH_URL` - Full URL of your application
- `NEXTAUTH_SECRET` or `AUTH_SECRET` - Secret for session encryption
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

**Database**:

- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB` - Database name (optional, defaults to "motive_archive")

**Firebase**:

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key

### Performance Optimizations:

1. **Use standalone mode** for better performance in production
2. **Enable caching** with proper cache headers
3. **Monitor database connections** to avoid connection pool exhaustion
4. **Use environment-specific configurations** for optimal performance

## Troubleshooting

### If you encounter database connection errors:

1. Check that `MONGODB_URI` is properly set
2. Verify network connectivity to MongoDB
3. Ensure the database user has proper permissions

### If authentication fails:

1. Verify all OAuth environment variables are set
2. Check that `NEXTAUTH_URL` matches your domain
3. Ensure `NEXTAUTH_SECRET` is set and secure

### If the application won't start:

1. Run `npm run check-env` to diagnose issues
2. Check that all required environment variables are set
3. Verify the build completed successfully

## Monitoring

The application now includes better error handling and logging:

- Database connection status is logged on startup
- Authentication configuration is validated
- Cache warmup status is reported
- Build artifact detection helps with deployment verification

All errors are now handled gracefully with fallback states, preventing the application from crashing due to temporary issues.
