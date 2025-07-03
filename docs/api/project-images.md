# Project Images API

## Overview

The Project Images API follows the same pattern as the Car Images API for consistent image association and retrieval.

## Fixed Issue (2025-01-06)

**Problem**: Project image uploads were completing but images weren't appearing in project galleries.

**Root Cause**: The `/api/cloudflare/images/analyze` endpoint was storing `imageIds` as ObjectIds for projects but as strings for cars, creating inconsistency.

**Solution**: Updated the analyze endpoint to store all `imageIds` as strings, matching the car upload pattern.

## API Endpoints

### GET `/api/projects/[id]/images`

Retrieves images associated with a project.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 200)
- `search`: Search in filename and metadata
- `category`: Filter by image category
- `angle`, `movement`, `view`, `side`, `imageType`: Metadata filters
- `sort`: Sort field (default: "updatedAt")
- `sortDirection`: "asc" or "desc" (default: "desc")
- `includeCount`: Include total count for pagination

**Response:**

```json
{
  "images": [
    {
      "_id": "string",
      "imageId": "string",
      "cloudflareId": "string",
      "url": "string",
      "filename": "string",
      "metadata": {},
      "projectId": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "pagination": {
    "totalImages": 10,
    "totalPages": 1,
    "currentPage": 1,
    "itemsPerPage": 50
  }
}
```

### POST `/api/projects/[id]/images`

Upload images directly to a project (alternative to the analyze endpoint).

### DELETE `/api/projects/[id]/images`

Remove images from a project.

## Image Upload Flow

### Via ImageUploader Component (Recommended)

1. **Frontend**: `ImageUploader` with `mode="general"` and `metadata.projectId`
2. **Upload**: Images uploaded to Cloudflare via `/api/cloudflare/thumbnails`
3. **Analysis**: `/api/cloudflare/images/analyze` processes and stores image
4. **Association**: Image `_id` stored as string in project's `imageIds` array

### Database Schema

**Images Collection:**

```javascript
{
  _id: ObjectId,
  cloudflareId: "string",
  url: "string",
  filename: "string",
  metadata: {},
  projectId: ObjectId, // Reference to project
  carId: ObjectId | null,
  createdAt: "string",
  updatedAt: "string"
}
```

**Projects Collection:**

```javascript
{
  _id: ObjectId,
  name: "string",
  description: "string",
  imageIds: ["string"], // Array of image _id strings (FIXED)
  createdAt: "string",
  updatedAt: "string"
}
```

## Key Implementation Details

### String vs ObjectId Consistency

- **Fixed**: All `imageIds` arrays store strings, not ObjectIds
- **Car API**: `$push: { imageIds: imageId.toString() }`
- **Project API**: `$push: { imageIds: imageId.toString() }`
- **Gallery API**: `$push: { imageIds: imageId.toString() }`

### Image Lookup

```javascript
// Frontend lookups work correctly with string IDs
const imageObjectIds = project.imageIds.map((id) => new ObjectId(id));
const images = await db
  .collection("images")
  .find({
    _id: { $in: imageObjectIds },
  })
  .toArray();
```

### Error Prevention

- Rate limiting prevents infinite loops
- Validation ensures proper ObjectId formats
- Consistent error handling across endpoints

## Testing

Run validation: `node scripts/debug/test-project-image-upload.cjs`

This validates:

- ✅ imageIds stored as strings
- ✅ Project images findable by projectId
- ✅ Frontend can lookup images by imageIds
- ✅ Data format matches car pattern
