# String to ObjectId Migration

## Overview

This migration script converts string-based reference IDs to proper MongoDB ObjectIds in the projects collection. This is necessary because the original schema incorrectly stored ObjectId references as strings, which can cause performance issues and data integrity problems.

## What Gets Migrated

The script converts the following fields from strings to ObjectIds:

### Single Reference Fields

- `clientId` - Reference to client document
- `primaryImageId` - Reference to primary image document
- `templateId` - Reference to project template document

### Array Reference Fields

- `carIds[]` - Array of car document references
- `galleryIds[]` - Array of gallery document references
- `deliverableIds[]` - Array of deliverable document references
- `eventIds[]` - Array of event document references

## Before Running the Migration

### 1. Backup Your Database

**CRITICAL**: Always backup your database before running any migration:

```bash
# MongoDB Atlas backup (if using Atlas)
# Use the Atlas UI to create a backup snapshot

# Local MongoDB backup
mongodump --uri="your-mongodb-uri" --out=backup-$(date +%Y%m%d-%H%M%S)
```

### 2. Verify Environment Variables

Ensure your `.env.local` file has the correct MongoDB connection string:

```bash
MONGODB_URI=your-mongodb-connection-string
MONGODB_DB=your-database-name  # Optional, defaults to 'motive-archive'
```

## Running the Migration

### Step 1: Dry Run (Recommended)

Always run a dry run first to see what would be changed:

```bash
# Using npm script (recommended)
npm run migrate:string-to-objectids:dry-run

# Or directly
node scripts/migrate-string-ids-to-objectids.js --dry-run
```

The dry run will:

- Show you exactly which projects need migration
- Identify any invalid IDs that would be removed
- Give you a count of how many documents would be affected
- **NOT make any changes to your database**

### Step 2: Review the Dry Run Output

Look for:

- ✅ Projects that will be successfully migrated
- ⚠️ Projects with invalid IDs that will be cleaned up
- ❌ Any errors that need to be addressed first

### Step 3: Run the Actual Migration

If the dry run looks good, run the real migration:

```bash
# Using npm script (recommended)
npm run migrate:string-to-objectids

# Or directly
node scripts/migrate-string-ids-to-objectids.js
```

## Command Line Options

```bash
# Dry run - shows what would be changed without making changes
--dry-run

# Custom batch size (default: 100)
--batch-size=50

# Example: Dry run with smaller batches
node scripts/migrate-string-ids-to-objectids.js --dry-run --batch-size=25
```

## What the Script Does

1. **Connects** to your MongoDB database
2. **Scans** all projects in the collection
3. **Analyzes** each project to identify string IDs that need conversion
4. **Validates** that string IDs are valid ObjectId format (24 character hex strings)
5. **Converts** valid string IDs to ObjectIds
6. **Removes** invalid IDs (with warnings)
7. **Updates** the `updatedAt` timestamp for modified projects
8. **Reports** detailed results

## Expected Output

```
🚀 Starting String to ObjectId Migration
📊 Mode: DRY RUN
📦 Batch Size: 100

🔌 Connecting to MongoDB...
✅ Connected to database

📊 Total projects in database: 15

🔄 Starting migration...

📝 Project "AMG History" (6833cacc214fd075f219ab41)
   carIds: 3 IDs to convert
   deliverableIds: 1 IDs to convert
   eventIds: 1 IDs to convert
   🔍 Would update (dry run)

📈 Progress: 15/15 projects processed

🎉 Migration Complete!
========================
📊 Total projects processed: 15
✅ Projects that would be migrated: 1
❌ Errors encountered: 0
⚠️  Projects with issues: 0

💡 This was a dry run. To perform the actual migration, run:
   node scripts/migrate-string-ids-to-objectids.js
```

## Troubleshooting

### Invalid ObjectId Errors

If you see warnings about invalid IDs:

- These are IDs that don't follow the 24-character hex format
- The script will remove these invalid IDs
- Review the warnings to ensure this is expected

### Connection Errors

- Verify your `MONGODB_URI` environment variable
- Ensure your database is accessible
- Check your network connection

### Permission Errors

- Ensure your MongoDB user has read/write permissions
- For Atlas, ensure your IP is whitelisted

## Post-Migration Verification

After running the migration, verify it worked correctly:

1. **Check a few projects manually** in your MongoDB client
2. **Test your application** to ensure it still works
3. **Run the dry run again** - it should show no projects need migration

## Rollback Plan

If something goes wrong:

1. **Stop your application** immediately
2. **Restore from your backup**:
   ```bash
   # Restore from mongodump backup
   mongorestore --uri="your-mongodb-uri" --drop backup-folder/
   ```
3. **Investigate the issue** before trying again

## Performance Notes

- The script processes projects in batches (default: 100)
- Large databases may take several minutes
- The script shows progress updates every 500 projects
- No downtime is required, but consider running during low-traffic periods

## Support

If you encounter issues:

1. Check the error messages carefully
2. Ensure you have a recent backup
3. Try running with a smaller batch size
4. Review the MongoDB logs for additional details
