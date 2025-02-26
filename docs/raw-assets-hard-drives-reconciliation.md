# Raw Assets and Hard Drives Reconciliation

This document provides instructions on how to fix issues with raw assets not being properly associated with hard drives in the storage locations.

## Background

In our application, raw assets can be stored in multiple hard drives (storage locations). This relationship is bidirectional:

1. Each raw asset has a `locations` array containing references to hard drive IDs
2. Each hard drive has a `rawAssets` array containing references to raw asset IDs

If this bidirectional relationship is not properly maintained, raw assets may not show up as associated with the hard drives they are stored in.

## Common Issues

1. **Inconsistent Data Types**: Location IDs might be stored as strings in some places and as ObjectIds in others
2. **Broken Bidirectional Relationship**: A raw asset might reference a hard drive, but the hard drive might not reference the raw asset (or vice versa)
3. **Invalid References**: References to non-existent hard drives or raw assets

## How to Fix

### 1. Run the Reconciliation Script

We've created a script that automatically fixes inconsistencies in the bidirectional relationship between raw assets and hard drives.

```bash
npm run reconcile-raw-assets
```

This script will:

- Find raw assets with locations that don't reference them back
- Find hard drives with raw assets that don't have the hard drive in their locations
- Fix these inconsistencies by updating the appropriate collections
- Report on any invalid references that need manual attention

### 2. Check the Script Output

The script will output statistics about the issues it found and fixed. Pay attention to:

- **Invalid location references**: Raw assets referencing non-existent hard drives
- **Invalid asset references**: Hard drives referencing non-existent raw assets

These will need manual attention.

### 3. Manual Fixes (if needed)

If the script reports invalid references, you'll need to manually decide how to handle them:

- For invalid location references: Either remove the reference or create the missing hard drive
- For invalid asset references: Either remove the reference or restore the missing raw asset

## Preventing Future Issues

The code has been updated to properly maintain the bidirectional relationship:

1. When updating a raw asset's locations, the hard drives' `rawAssets` arrays are now automatically updated
2. When deleting a raw asset, it's now automatically removed from all associated hard drives
3. Data types are now consistently handled (ObjectIds in the database, strings in the UI)

## Troubleshooting

If you continue to experience issues after running the reconciliation script:

1. Check the MongoDB collections directly to verify the data structure
2. Look for any custom code that might be modifying raw assets or hard drives outside the standard API routes
3. Ensure that all client-side code is sending the correct data format to the API

## Contact

If you need further assistance, please contact the development team.
