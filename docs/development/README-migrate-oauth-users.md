# OAuth User Migration Guide

This guide explains how to identify and migrate users with OAuth IDs to proper Firebase UIDs.

## The Problem

Some users who signed in with Google OAuth have their OAuth ID (e.g., `115667720852671300123`) stored as their document ID in Firestore instead of their Firebase UID (e.g., `WKpeOcIcq6MAgLzLoIjqSHxNMFC2`).

This causes issues with:

- User assignment to deliverables
- User lookup
- Authentication flows

## Migration Process

1. **Identify OAuth Users**: Look for user documents where the ID is a long numeric string (21+ digits)
2. **Find Correct Firebase UID**: For each OAuth user, look up their Firebase Auth account by email
3. **Create/Update Proper User Documents**: Create or update user documents with the correct Firebase UID
4. **Update Deliverables**: Update any deliverables that reference the OAuth ID

## Running the Migration

The migration script can be run with:

```bash
node src/scripts/migrate-oauth-users.cjs
```

If you encounter issues with the script, you can perform a manual migration:

1. Open the Firebase Console
2. Go to Firestore
3. Look for user documents with numeric IDs (21+ digits)
4. For each user:
   - Note their email address
   - Go to Firebase Authentication
   - Find the user by email
   - Note their Firebase UID
   - Create a new document with the Firebase UID as the ID
   - Copy the data from the OAuth ID document to the new document
   - Add a field `oauthId` with the original OAuth ID
   - Update any deliverables that reference this user

## Troubleshooting Environment Variables

If you're having issues with environment variables, ensure your `.env.local` file contains:

```
FIREBASE_PROJECT_ID=motive-archive-manager
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@motive-archive-manager.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your-private-key-here
MONGODB_URI=your-mongodb-uri-here
MONGODB_DB_NAME=motive_archive
```

## Verifying the Migration

After migration:

1. Check that there are no deliverables with OAuth IDs in the `firebase_uid` field
2. Verify that all Google sign-in users have documents with their Firebase UID
3. Test the assignment functionality to ensure it works properly
