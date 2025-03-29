# Developer Guide: Working with Images

## Introduction

This guide provides best practices for working with images in the Motive Archive Manager. Following these guidelines will ensure consistent behavior, optimal performance, and maintainable code.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Working with Backend Code](#working-with-backend-code)
3. [Working with Frontend Components](#working-with-frontend-components)
4. [Image Optimization Best Practices](#image-optimization-best-practices)
5. [Troubleshooting](#troubleshooting)

## API Endpoints

For detailed information about the available API endpoints, refer to the [Image API Documentation](./image-api.md). Here's a quick reference:

| Endpoint                    | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `GET /api/images/:id`       | Get a single image by ID                                    |
| `GET /api/cars/:id/images`  | Get all images for a car (paginated)                        |
| `GET /api/clients/:id/cars` | Get cars with their primary images for a client (paginated) |
| `GET /api/cars/list`        | Get a paginated list of cars with primary images            |

### Pagination

All list endpoints support pagination with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

Example: `/api/cars/list?page=2&limit=10`

## Working with Backend Code

### URL Formatting

Always use the `getFormattedImageUrl` utility to format Cloudflare URLs:

```typescript
import { getFormattedImageUrl } from "@/lib/cloudflare";

// Format a URL with default variant (public)
const url = getFormattedImageUrl(
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123"
);

// Format a URL with specific variant
const thumbnailUrl = getFormattedImageUrl(
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123",
  "thumbnail"
);
```

### MongoDB Aggregation

When working with MongoDB aggregation pipelines:

1. Use the standard pattern for image lookups:

```typescript
// Example: Looking up primary image for a car
const pipeline = [
  // ... other stages
  {
    $lookup: {
      from: "images",
      let: { imageIds: "$imageIds", primaryImageId: "$primaryImageId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $in: ["$_id", "$$imageIds"] },
                { $eq: ["$_id", "$$primaryImageId"] },
              ],
            },
          },
        },
        { $limit: 1 },
      ],
      as: "primaryImage",
    },
  },
  {
    $addFields: {
      displayImage: { $arrayElemAt: ["$primaryImage", 0] },
    },
  },
  // ... other stages
];
```

2. Only include necessary fields in the projection:

```typescript
{
  $project: {
    _id: 1,
    make: 1,
    model: 1,
    year: 1,
    'displayImage._id': 1,
    'displayImage.url': 1,
    'displayImage.metadata': 1
  }
}
```

### Caching

Always use the caching utilities for consistent caching behavior:

```typescript
import { createStaticResponse, createDynamicResponse } from "@/lib/cache-utils";

// For relatively static content (images that don't change often)
return createStaticResponse(imageData);

// For dynamic content (lists that change frequently)
return createDynamicResponse(carsList, { maxAge: 60 });
```

## Working with Frontend Components

### LazyImage Component

Always use the `LazyImage` component for image rendering:

```tsx
import LazyImage from "@/components/LazyImage";

function MyComponent() {
  return (
    <LazyImage
      src={imageUrl}
      alt="Car image"
      width={400}
      height={300}
      loadingVariant="skeleton"
      objectFit="cover"
      quality={90}
    />
  );
}
```

### CarImageGallery Component

For displaying multiple car images with pagination:

```tsx
import CarImageGallery from "@/components/CarImageGallery";
import { useEffect, useState } from "react";
import { loadCarImages, PaginatedImagesResponse } from "@/lib/imageLoader";

function CarDetail({ carId }) {
  const [imageData, setImageData] = useState<PaginatedImagesResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchImages() {
      setIsLoading(true);
      try {
        const data = await loadCarImages({ carId, page, limit: 12 });
        setImageData(data);
      } catch (error) {
        console.error("Error loading images:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchImages();
  }, [carId, page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <CarImageGallery
      images={imageData?.images || []}
      pagination={imageData?.pagination}
      onPageChange={handlePageChange}
      isLoading={isLoading}
      thumbnailSize={{ width: 200, height: 150 }}
      fullSize={{ width: 1200, height: 800 }}
      showCategoryTabs={true}
    />
  );
}
```

### Image Preloading

For critical images, use the preloading utilities:

```typescript
import { preloadImage, preloadImages } from "@/lib/imageLoader";

// Preload a single critical image
useEffect(() => {
  if (car?.primaryImageUrl) {
    preloadImage(car.primaryImageUrl, "large");
  }
}, [car?.primaryImageUrl]);

// Preload multiple images
useEffect(() => {
  if (car?.images?.length) {
    const imageUrls = car.images.slice(0, 5).map((img) => img.url);
    preloadImages(imageUrls, "thumbnail");
  }
}, [car?.images]);
```

## Image Optimization Best Practices

1. **Use appropriate variants for each context**:

   - `thumbnail` for lists and small previews (200px width)
   - `medium` for gallery views (600px width)
   - `large` for detailed views (1200px width)
   - `public` only when the original image is needed

2. **Optimize image dimensions**:

   - Don't load images larger than needed
   - Match the `width` and `height` props of the `LazyImage` component to the actual display size

3. **Implement proper loading states**:

   - Always include a loading state (skeleton, blur, etc.)
   - Handle error states gracefully with fallback images

4. **Prioritize important images**:

   - Use the `priority` prop for above-the-fold images
   - Preload critical images with the preloading utilities

5. **Minimize image data in list views**:
   - Only load one image per car in list views
   - Defer loading additional images until needed

## Troubleshooting

### Common Issues

1. **Images not displaying**:

   - Check the URL format using `console.log(getFormattedImageUrl(url))`
   - Verify the image exists in Cloudflare
   - Check for network errors in the browser console

2. **Slow image loading**:

   - Ensure you're using the correct variant for the context
   - Verify that preloading is implemented for critical images
   - Check that pagination is implemented correctly

3. **Inconsistent image sizes**:
   - Always provide both `width` and `height` props to prevent layout shifts
   - Use consistent aspect ratios across the application

### Performance Testing

To test image loading performance:

1. Use the Network tab in browser DevTools
2. Filter by "Img" to see only image requests
3. Check the "Size" and "Time" columns to identify slow-loading images
4. Look for cache hits (304 status) vs. full downloads
