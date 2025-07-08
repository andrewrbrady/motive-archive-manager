# Image Metadata Sanitization Scripts

## Overview

This collection of scripts fixes the image filtering system by addressing two critical metadata issues:

1. **Nested Metadata Structure**: Processed images store filter metadata in `metadata.originalImage.metadata` instead of directly in `metadata`
2. **Invalid Metadata Values**: Some images contain invalid values that don't match the expected filter options

## Scripts Included

### 1. `sanitize-image-metadata.ts`

Main script that fixes metadata issues by flattening nested structures and cleaning invalid values.

### 2. `backup-images-collection.ts`

Creates backups of the images collection before making changes and can restore from backups if needed.

## Valid Metadata Values

The scripts enforce these valid values for each metadata field:

```typescript
const VALID_METADATA = {
  angle: [
    "front",
    "front 3/4",
    "side",
    "rear 3/4",
    "rear",
    "overhead",
    "under",
  ],
  view: ["exterior", "interior"],
  movement: ["static", "motion"],
  tod: ["sunrise", "day", "sunset", "night"],
  side: ["driver", "passenger", "rear", "overhead"],
};
```

## Execution Plan

### Phase 1: Test Car Analysis and Backup

```bash
# 1. Create backup of test car images
npx tsx scripts/backup-images-collection.ts

# 2. Analyze metadata issues (test car only)
npx tsx scripts/sanitize-image-metadata.ts --analyze-only
```

### Phase 2: Test Car Dry Run

```bash
# 3. Dry run to see what would be changed (test car)
npx tsx scripts/sanitize-image-metadata.ts --dry-run
```

### Phase 3: Test Car Execution

```bash
# 4. Fix metadata issues on test car
npx tsx scripts/sanitize-image-metadata.ts

# 5. Verify the fixes worked
npx tsx scripts/sanitize-image-metadata.ts --analyze-only --skip-analysis
```

### Phase 4: Full Collection (After Test Success)

```bash
# 6. Create backup of full collection
npx tsx scripts/backup-images-collection.ts --full

# 7. Analyze full collection issues
npx tsx scripts/sanitize-image-metadata.ts --full --analyze-only

# 8. Dry run on full collection
npx tsx scripts/sanitize-image-metadata.ts --full --dry-run

# 9. Execute fixes on full collection (PRODUCTION!)
npx tsx scripts/sanitize-image-metadata.ts --full
```

## Command Reference

### Sanitization Script

```bash
# Analysis only (test car)
npx tsx scripts/sanitize-image-metadata.ts --analyze-only

# Dry run (test car) - see what would be changed
npx tsx scripts/sanitize-image-metadata.ts --dry-run

# Fix test car
npx tsx scripts/sanitize-image-metadata.ts

# Fix full collection (PRODUCTION)
npx tsx scripts/sanitize-image-metadata.ts --full

# Dry run on full collection
npx tsx scripts/sanitize-image-metadata.ts --full --dry-run
```

### Backup Script

```bash
# Create backup of test car
npx tsx scripts/backup-images-collection.ts

# Create backup of full collection
npx tsx scripts/backup-images-collection.ts --full

# List available backups
npx tsx scripts/backup-images-collection.ts --list

# Restore from backup (dry run)
npx tsx scripts/backup-images-collection.ts --restore --file=temp/backups/backup-file.json

# Restore from backup (actual restore)
npx tsx scripts/backup-images-collection.ts --restore --file=temp/backups/backup-file.json --confirm-restore
```

## Test Car Details

- **Test Car ID**: `67d13094dc27b630a36fb449`
- **Expected Images**: ~320 images
- **Purpose**: Safe testing environment before applying changes to full collection

## What Gets Fixed

### 1. Nested Metadata Flattening

**Before (Broken)**:

```javascript
{
  "_id": "6838bc01595aebe7ef4a041e",
  "metadata": {
    "category": "processed",
    "originalImage": {
      "metadata": {
        "angle": "side",        // ← Buried in nested structure
        "view": "exterior",
        "movement": "static",
        "tod": "day",
        "side": "driver"
      }
    }
  }
}
```

**After (Fixed)**:

```javascript
{
  "_id": "6838bc01595aebe7ef4a041e",
  "metadata": {
    "category": "processed",
    "angle": "side",           // ← Now at top level
    "view": "exterior",
    "movement": "static",
    "tod": "day",
    "side": "driver",
    "originalImage": { ... }   // Original reference preserved
  }
}
```

### 2. Invalid Value Cleanup

Removes invalid values like:

- `"interior"` in the `angle` field (should only be in `view`)
- Values not in the VALID_METADATA lists
- Empty strings and undefined values

## Safety Features

1. **Test Car First**: Always test on car `67d13094dc27b630a36fb449` before full collection
2. **Dry Run Mode**: See exactly what would be changed without making changes
3. **Backup System**: Automated backups before any modifications
4. **Analysis Mode**: Detailed analysis of issues before fixing
5. **Verification**: Built-in verification after fixes are applied

## Expected Results

After running the scripts:

- ✅ Filter dropdowns populate with correct values
- ✅ Filtering actually works when values are selected
- ✅ No "interior" in angles dropdown
- ✅ No invalid values in any metadata field
- ✅ Metadata accessible at `image.metadata.{field}` for all images
- ✅ Processed images can be filtered properly

## Troubleshooting

### If something goes wrong:

1. **Check the backup**: Backups are stored in `temp/backups/`
2. **List backups**: `npm run ts-node scripts/backup-images-collection.ts --list`
3. **Restore backup**: Use the restore command with the appropriate backup file
4. **Verify connection**: Ensure MONGODB_URI is set correctly in .env

### Common issues:

- **No changes made**: Check if images actually have the nested structure
- **Connection errors**: Verify MongoDB URI and network connectivity
- **Permission errors**: Ensure MongoDB user has write permissions

## Environment Variables Required

```env
MONGODB_URI=mongodb://your-connection-string
MONGODB_DB=motive_archive  # Optional, defaults to "motive_archive"
```

## Monitoring Progress

The scripts provide detailed logging:

- 📍 Nested metadata found
- ❌ Invalid metadata detected
- ✅ Successfully processed
- ⚠️ Warnings and non-critical issues
- 📊 Final statistics and verification

## Post-Execution Verification

After running the scripts, verify in the UI:

1. Go to car `67d13094dc27b630a36fb449` gallery
2. Check that filter dropdowns show expected values
3. Test filtering by each metadata field
4. Confirm processed images are now filterable
5. Verify no "interior" appears in angle dropdown

## Support

If you encounter issues:

1. Check the logs for specific error messages
2. Ensure you have a recent backup
3. Run analysis mode to understand the current state
4. Use dry-run mode to preview changes before applying
