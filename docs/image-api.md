# Image API Documentation

## Overview

The Image API provides endpoints for retrieving and managing car images in the Motive Archive Manager. The API supports standardized image formats, pagination, and filtering by category.

## Base URL

All endpoints are relative to the base URL of the application.

## Authentication

Authentication is required for all API endpoints. The application uses standard authentication methods as specified in the main API documentation.

## Endpoints

### Get Image by ID

Retrieves a single image by its ID.

```
GET /api/images/:id
```

#### Parameters

| Parameter | Type   | Description                 |
| --------- | ------ | --------------------------- |
| id        | string | The MongoDB ID of the image |

#### Response

A successful response returns status code 200 and the image details:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "cloudflareId": "abc123",
  "url": "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/public",
  "filename": "car_front.jpg",
  "metadata": {
    "category": "exterior",
    "angle": "front",
    "description": "Front view of car",
    "isPrimary": true
  },
  "carId": "507f1f77bcf86cd799439022",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Get Car Images

Retrieves all images for a specific car with pagination support.

```
GET /api/cars/:id/images
```

#### Parameters

| Parameter | Type   | Description                  | Required |
| --------- | ------ | ---------------------------- | -------- |
| id        | string | The MongoDB ID of the car    | Yes      |
| page      | number | Page number (default: 1)     | No       |
| limit     | number | Items per page (default: 20) | No       |
| category  | string | Filter by image category     | No       |

Valid category values: `exterior`, `interior`, `engine`, `damage`, `documents`, `other`

#### Response

A successful response returns status code 200 and a paginated list of images:

```json
{
  "images": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "cloudflareId": "abc123",
      "url": "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/public",
      "filename": "car_front.jpg",
      "metadata": {
        "category": "exterior",
        "angle": "front",
        "description": "Front view of car"
      },
      "carId": "507f1f77bcf86cd799439022",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
    // Additional images...
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### Upload Image

Uploads a new image for a specific car.

```
POST /api/cars/:id/images
```

#### Request Body

The request should use `multipart/form-data` format with the following fields:

| Field       | Type | Description                       | Required |
| ----------- | ---- | --------------------------------- | -------- |
| file        | File | The image file to upload          | Yes      |
| metadata    | JSON | Additional metadata for the image | No       |
| vehicleInfo | JSON | Vehicle information               | No       |

#### Response

A successful response returns status code 200 and the updated car document with the new image:

```json
{
  "_id": "507f1f77bcf86cd799439022",
  "make": "Porsche",
  "model": "911",
  "year": 1973,
  "imageIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439044"],
  "images": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "url": "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/public",
      "metadata": {
        /* ... */
      }
    },
    {
      "_id": "507f1f77bcf86cd799439044",
      "url": "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/def456/public",
      "metadata": {
        /* ... */
      }
    }
  ]
}
```

### Delete Image

Deletes an image (or multiple images) from a car.

```
DELETE /api/cars/:id/images
```

#### Request Body

```json
{
  "imageIds": ["507f1f77bcf86cd799439011"],
  "cloudflareIds": ["abc123"],
  "deleteFromStorage": true
}
```

| Field             | Type    | Description                                      | Required |
| ----------------- | ------- | ------------------------------------------------ | -------- |
| imageIds          | array   | Array of MongoDB image IDs to delete             | No\*     |
| cloudflareIds     | array   | Array of Cloudflare image IDs to delete          | No\*     |
| deleteFromStorage | boolean | Whether to delete images from Cloudflare storage | No       |

\*At least one of `imageIds` or `cloudflareIds` must be provided.

#### Response

A successful response returns status code 200 and details about the deletion:

```json
{
  "success": true,
  "message": "Deleted 1 images successfully",
  "deletedCount": 1,
  "imagesDeletedCount": 1,
  "cloudflareResults": [
    {
      "id": "abc123",
      "success": true
    }
  ],
  "car": {
    "_id": "507f1f77bcf86cd799439022",
    "make": "Porsche",
    "model": "911",
    "year": 1973,
    "imageIds": ["507f1f77bcf86cd799439044"]
  }
}
```

## Image URL Format

All image URLs follow this pattern:

```
https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/{cloudflareId}/{variant}
```

Where:

- `cloudflareId` is the unique ID assigned by Cloudflare
- `variant` is the delivery variant (e.g., `public`, `thumbnail`)

## Caching

The API implements the following caching strategies:

- Individual images: Cached for 1 hour with stale-while-revalidate of 24 hours
- Car image lists: Cached for 1 minute with stale-while-revalidate of 5 minutes

## Error Responses

Error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Detailed error information (optional)"
}
```

Common error status codes:

- `400`: Invalid request (e.g., invalid ID format)
- `404`: Resource not found
- `500`: Internal server error

## Utilities

The codebase includes several utility functions for working with images:

### getFormattedImageUrl(url, variant)

Formats an image URL to ensure it has the correct variant suffix.

```typescript
import { getFormattedImageUrl } from "@/lib/cloudflare";

// Returns "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/public"
const url = getFormattedImageUrl(
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123"
);

// Returns "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/thumbnail"
const thumbnailUrl = getFormattedImageUrl(
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123",
  "thumbnail"
);
```
