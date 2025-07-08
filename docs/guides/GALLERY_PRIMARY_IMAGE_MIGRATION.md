# Gallery Primary Image Migration

## Overview

This document outlines the implementation of `primaryImageId` functionality for galleries to fix gallery cover image loading issues. The implementation follows the same pattern successfully used in the cars system.

## Problem Solved

- Gallery cover images were showing as null/undefined causing CloudflareImage component errors
- Galleries lacked a reliable way to determine which image should be used as thumbnail
- Inconsistent thumbnail population in gallery listings

## Implementation Details

### 1. Schema Changes

- **File**: `src/models/Gallery.ts` (new file)
- **Changes**: Added `primaryImageId` field as optional ObjectId reference to Image collection
- **Backward Compatibility**: Field is optional to support existing galleries

### 2. Migration Script

- **File**: `scripts/migrate-gallery-primary-images.js`
- **Purpose**: Populate `primaryImageId` for all existing galleries
- **Logic**: Sets `primaryImageId` to first image in `imageIds` array
- **Features**:
  - Handles both ObjectId and string formats in imageIds
  - Progress logging and error handling
  - Verification function to check migration results
  - Safe execution with proper MongoDB connection management

### 3. API Updates

- **File**: `src/app/api/galleries/route.ts`
- **Changes**:

  - Updated GET endpoint to use MongoDB aggregation pipeline
  - Follows same pattern as cars API for primaryImage lookup
  - Falls back to first image if no primaryImageId set
  - Proper URL formatting with Cloudflare optimization
  - POST endpoint now sets primaryImageId automatically

- **File**: `src/app/api/galleries/[id]/route.ts`
- **Changes**:

  - PUT endpoint handles primaryImageId updates
  - Defaults to first image when imageIds change

- **File**: `src/app/api/galleries/[id]/duplicate/route.ts`
- **Changes**: Copies primaryImageId when duplicating galleries

### 4. Type Definition Updates

Updated Gallery interfaces in:

- `src/types/index.ts`
- `src/lib/hooks/query/useGalleries.ts`
- `src/hooks/use-galleries.ts`
- `src/components/cars/optimized/galleries/index.ts`

## Migration Process

### Step 1: Run Migration Script

```bash
cd /path/to/project
node scripts/migrate-gallery-primary-images.js
```

### Step 2: Verify Migration

The script includes automatic verification, but you can also test manually:

```bash
node scripts/test-gallery-primary-images.js
```

### Step 3: Test Gallery API

Verify that `/api/galleries` endpoint now returns `thumbnailImage` data for all galleries.

## Testing Scripts

### Migration Script

- **File**: `scripts/migrate-gallery-primary-images.js`
- **Features**: Migration + verification in one script
- **Usage**: `node scripts/migrate-gallery-primary-images.js`

### Test Script

- **File**: `scripts/test-gallery-primary-images.js`
- **Features**: Comprehensive testing of implementation
- **Usage**: `node scripts/test-gallery-primary-images.js`

## Expected Results

### Before Migration

```json
{
  "_id": "gallery123",
  "name": "Sample Gallery",
  "imageIds": ["img1", "img2", "img3"],
  "thumbnailImage": null
}
```

### After Migration

```json
{
  "_id": "gallery123",
  "name": "Sample Gallery",
  "imageIds": ["img1", "img2", "img3"],
  "primaryImageId": "img1",
  "thumbnailImage": {
    "_id": "img1",
    "url": "https://imagedelivery.net/.../img1/thumbnail"
  }
}
```

## Implementation Pattern

This implementation exactly mirrors the successful pattern from the cars system:

1. ✅ **Schema**: primaryImageId field as ObjectId reference
2. ✅ **Migration**: Populate field for existing data
3. ✅ **API**: MongoDB aggregation with primary/fallback lookup
4. ✅ **Types**: Updated interfaces across codebase
5. ✅ **Automation**: New galleries automatically get primaryImageId

## Rollback Plan

If issues arise, the migration can be rolled back by:

1. Removing `primaryImageId` from gallery documents
2. Reverting API changes to use previous thumbnail logic
3. The old code path still works as fallback

## Performance Considerations

- Uses MongoDB aggregation pipeline for efficient queries
- Single database query per gallery list request
- Cloudflare CDN optimization for thumbnail URLs
- Indexed queries on ObjectId references

## Monitoring

After deployment, monitor:

- Gallery listing page load times
- Image loading success rates
- Any CloudflareImage component errors
- Database query performance on galleries collection

## Future Enhancements

- Admin UI to manually set primary image for galleries
- Bulk update tools for changing primary images
- Analytics on most effective thumbnail images
