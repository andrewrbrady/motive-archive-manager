# Cloudflare Image Variants

## Overview

The Motive Archive Manager uses Cloudflare Images to store and serve optimized images. Cloudflare Images supports different variants that apply transformations to images on-the-fly through the URL. This document describes the available variants and how to use them.

## URL Format

All image URLs in the system follow this pattern:

```
https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/{cloudflareId}/{variant}
```

Where:

- `veo1agD2ekS5yYAVWyZXBA` is our Cloudflare account hash
- `{cloudflareId}` is the unique ID assigned by Cloudflare to each image
- `{variant}` is the delivery variant (explained below)

## Standard Variants

The system supports the following standard variants:

| Variant     | Description                        | Size        | Use Case                   |
| ----------- | ---------------------------------- | ----------- | -------------------------- |
| `public`    | Original image, full quality       | Original    | Detailed view, downloads   |
| `thumbnail` | Compressed version for thumbnails  | 200px wide  | List views, thumbnails     |
| `medium`    | Medium-sized version for galleries | 600px wide  | Gallery views              |
| `large`     | Large version for detailed viewing | 1200px wide | Detail views, modal popups |
| `webp`      | WebP format with good compression  | Original    | Modern browsers            |
| `preview`   | Low-quality placeholder            | 20px wide   | Image loading placeholders |

## Usage in Code

### Using the Utility Function

Always use the `getFormattedImageUrl()` utility function to ensure consistency:

```typescript
import { getFormattedImageUrl } from "@/lib/cloudflare";

// Returns "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/public"
const publicUrl = getFormattedImageUrl(
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123"
);

// Returns "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/thumbnail"
const thumbnailUrl = getFormattedImageUrl(
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123",
  "thumbnail"
);
```

### In Components

For components, use the `LazyImage` component which supports variants:

```tsx
import LazyImage from "@/components/LazyImage";

// In your component
<LazyImage
  src="https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123"
  alt="Car image"
  width={200}
  height={150}
  variant="thumbnail"
/>;
```

## Custom Transformations

Cloudflare Images also supports custom transformations through URL parameters. For advanced use cases, you can append these parameters to the variant:

```
https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/{cloudflareId}/{variant}/w=500,h=300,fit=crop
```

Common transformation parameters:

| Parameter | Description                      | Example Values            |
| --------- | -------------------------------- | ------------------------- |
| `w`       | Width in pixels                  | `w=500`                   |
| `h`       | Height in pixels                 | `h=300`                   |
| `fit`     | How the image should fit the box | `fit=crop`, `fit=contain` |
| `q`       | Quality (1-100)                  | `q=75`                    |
| `f`       | Format                           | `f=webp`, `f=avif`        |

## Caching Behavior

Images are cached at multiple levels:

1. **Cloudflare Edge**: Images are cached at Cloudflare's edge locations (default TTL: 2 hours)
2. **API Response**: Our API adds cache headers for browser caching:
   - Individual images: Cached for 1 hour with stale-while-revalidate of 24 hours
   - Car image lists: Cached for 1 minute with stale-while-revalidate of 5 minutes
3. **Browser Cache**: Browsers will respect the cache headers from our API

## Best Practices

1. **Always use the correct variant for the use case**:

   - Use `thumbnail` for list views
   - Use `medium` for gallery views
   - Use `public` or `large` for detailed views

2. **Preload important images**:

   ```typescript
   import { preloadImage } from "@/lib/imageLoader";

   // Preload an important image
   useEffect(() => {
     if (primaryImageUrl) {
       preloadImage(primaryImageUrl, "large");
     }
   }, [primaryImageUrl]);
   ```

3. **Use responsive variants based on screen size**:

   ```tsx
   <LazyImage
     src={imageUrl}
     alt="Car image"
     width={width}
     height={height}
     variant={windowWidth < 768 ? "thumbnail" : "medium"}
   />
   ```

4. **Avoid transforming images on the fly if possible**:
   - Use predefined variants when possible
   - Create new variants in Cloudflare dashboard for frequently used transformations

## Troubleshooting

If images are not displaying correctly:

1. Check if the URL is formatted correctly with the proper variant
2. Ensure the image exists in Cloudflare (check the Dashboard)
3. Verify that the image ID is correct
4. Try clearing browser cache
5. Check network requests for any errors
