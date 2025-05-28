# Image Gallery Standardization

## Overview

This document outlines the standardization of image gallery components across the Motive Archive Manager application. We have consolidated multiple gallery implementations into a single, performant, and feature-rich `ImageGallery` component that works seamlessly with Cloudflare Images optimization.

## Components

### 1. `ImageGallery` (Primary Component)

**Location:** `src/components/ImageGallery.tsx`

The main gallery component that provides:

- ✅ **Cloudflare Images optimization** via `CloudflareImage` component
- ✅ **Zoom levels** (1-5, configurable grid layouts)
- ✅ **Edit mode** with selection and deletion
- ✅ **Filters** by metadata (angle, movement, time of day, etc.)
- ✅ **Category tabs** for image organization
- ✅ **Primary image selection**
- ✅ **Upload progress tracking**
- ✅ **Pagination support**
- ✅ **Responsive design**
- ✅ **Keyboard navigation**
- ✅ **Loading states and error handling**

### 2. `ImageGalleryWithData` (Data-Fetching Wrapper)

**Location:** `src/components/ImageGallery.tsx` (exported from same file)

A wrapper around `ImageGallery` that provides:

- ✅ **React Query integration** for car images
- ✅ **Automatic data fetching** and caching
- ✅ **Upload/delete mutations**
- ✅ **Primary image management**
- ✅ **URL state management** (edit mode)
- ✅ **Toast notifications**

### 3. `ImageGalleryAdvanced` (Feature-Rich Wrapper)

**Location:** `src/components/ImageGalleryAdvanced.tsx`

An advanced wrapper for specialized use cases:

- ✅ **Global image browsing** with filters
- ✅ **Built-in zoom controls**
- ✅ **Data fetching** via `useImages` hook
- ✅ **Extensible action handlers**
- ✅ **Read-only mode** for browsing

## Migration Status

### ✅ Completed Migrations

1. **Car Detail Pages** (`/cars/[id]`)

   - **Before:** `ImageGalleryWithQuery` (sluggish, over-engineered)
   - **After:** `ImageGalleryWithData` (fast, clean)
   - **Benefits:** Eliminated performance issues, simplified state management

2. **Inventory Pages** (`/inventory/[id]`)

   - **Status:** Already using `ImageGallery` ✅
   - **No changes needed**

3. **MDX Content**
   - **Status:** Using specialized MDX variants ✅
   - **Components:** `ImageGallery` (MDX), `Gallery` (MDX)

### 🔄 Pending Migrations

1. **Global Images Page** (`/images`)

   - **Current:** `SimpleImageGallery` (works well, has specialized features)
   - **Future:** Can migrate to `ImageGalleryAdvanced` when specialized features are added
   - **Priority:** Low (current implementation is performant)

2. **Upload Contexts**
   - **Current:** `ImageUploadWithContext` → `ImageGallery`
   - **Status:** Already standardized ✅

### 🗑️ Components to Remove

1. **`ImageGalleryWithQuery`** - Replaced by `ImageGalleryWithData`
2. **`CarImageGalleryV2`** - Functionality merged into `ImageGallery`
3. **`GalleryContainer`** - No longer needed
4. **`CarImageGallery`** (legacy) - Unused

## Usage Guidelines

### For Car-Specific Galleries

```tsx
import { ImageGalleryWithData } from "@/components/ImageGallery";

<ImageGalleryWithData
  carId={carId}
  showFilters={true}
  thumbnailsPerRow={4}
  rowsPerPage={3}
/>;
```

### For General Image Display

```tsx
import { ImageGallery } from "@/components/ImageGallery";

<ImageGallery
  images={images}
  isEditMode={false}
  onRemoveImage={handleRemove}
  onImagesChange={handleUpload}
  uploading={false}
  uploadProgress={[]}
  title="My Images"
  carId={carId}
  zoomLevel={3}
/>;
```

### For Advanced Browsing

```tsx
import { ImageGalleryAdvanced } from "@/components/ImageGalleryAdvanced";

<ImageGalleryAdvanced
  page={page}
  limit={20}
  search={searchQuery}
  carId={carFilter}
  angle={angleFilter}
  zoomLevel={zoomLevel}
  onZoomChange={setZoomLevel}
  onImageView={handleImageView}
  showZoomControls={true}
/>;
```

## Cloudflare Images Integration

All gallery components now use the `CloudflareImage` component which:

- ✅ **Automatically formats URLs** with appropriate variants
- ✅ **Uses named variants** (thumbnail, gallery, large, etc.)
- ✅ **Handles error states** with fallbacks
- ✅ **Optimizes loading** with proper lazy loading
- ✅ **Supports responsive images** with different variants per breakpoint

### Variant Mapping

```typescript
const variants = {
  thumbnail: "thumbnail", // Small thumbnails
  gallery: "gallery", // Gallery grid images
  large: "large", // Full-size viewing
  hero: "hero", // Hero/banner images
  square: "square", // Square aspect ratio
  wide: "wide", // Wide aspect ratio
};
```

## Performance Benefits

### Before Standardization

- **8+ different gallery implementations**
- **Inconsistent data handling** (`_id` vs `id`)
- **Multiple API call patterns**
- **Redundant state management**
- **Performance issues** with `ImageGalleryWithQuery`

### After Standardization

- **1 primary component** with specialized wrappers
- **Consistent data structures**
- **Optimized API usage** with React Query
- **Shared state management patterns**
- **Improved performance** across all pages

## Best Practices

### 1. Component Selection

- Use `ImageGalleryWithData` for car-specific galleries
- Use `ImageGallery` for custom data handling
- Use `ImageGalleryAdvanced` for browsing/filtering scenarios

### 2. Data Structure

Always ensure images follow this structure:

```typescript
interface Image {
  id: string;
  url: string;
  filename: string;
  metadata: {
    angle?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
    category?: string;
    isPrimary?: boolean;
  };
  variants?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
```

### 3. Error Handling

- All components include loading states
- Error boundaries for failed image loads
- Graceful fallbacks for missing data

### 4. Accessibility

- Proper alt text for all images
- Keyboard navigation support
- Screen reader friendly

## Future Enhancements

1. **Infinite Scroll** - Add to `ImageGalleryAdvanced`
2. **Bulk Operations** - Enhanced selection and batch actions
3. **Drag & Drop** - Reordering and upload via drag/drop
4. **Virtual Scrolling** - For very large image sets
5. **Advanced Filters** - Date ranges, file types, etc.

## Migration Checklist

When migrating from old gallery components:

- [ ] Update imports to use standardized components
- [ ] Ensure data structure matches expected format
- [ ] Test upload/delete functionality
- [ ] Verify Cloudflare Images optimization is working
- [ ] Check responsive behavior on mobile
- [ ] Test keyboard navigation
- [ ] Validate accessibility features
- [ ] Remove old component files after migration

## Support

For questions or issues with the gallery standardization:

1. Check this documentation first
2. Review the component source code
3. Test with the existing implementations
4. Create an issue if problems persist
