# Project Components

## PrimaryImageSelector

A React component for selecting a primary image for projects. This component provides a searchable and filterable interface to browse and select images from the image API.

### Features

- **Search**: Search images by filename, description, angle, or view
- **Filtering**: Filter images by:
  - Car (with searchable dropdown)
  - Angle (front, front 3/4, side, rear 3/4, rear, overhead, under)
  - View (exterior, interior)
  - Movement (static, rolling, tracking, panning)
  - Time of Day (day, golden hour, blue hour, night)
- **Pagination**: Navigate through large image collections
- **Visual Selection**: Click to select images with visual feedback
- **Preview**: Shows selected image with thumbnail and details
- **Responsive**: Works on desktop and mobile devices

### Usage

```tsx
import { PrimaryImageSelector } from "@/components/projects/PrimaryImageSelector";

function MyComponent() {
  const [selectedImageId, setSelectedImageId] = useState<string | undefined>();

  const handleImageSelect = (imageId: string | null) => {
    setSelectedImageId(imageId || undefined);
  };

  return (
    <PrimaryImageSelector
      selectedImageId={selectedImageId}
      onImageSelect={handleImageSelect}
      className="w-full"
    />
  );
}
```

### Props

| Prop              | Type                                | Required | Description                                      |
| ----------------- | ----------------------------------- | -------- | ------------------------------------------------ |
| `selectedImageId` | `string \| undefined`               | No       | The currently selected image ID                  |
| `onImageSelect`   | `(imageId: string \| null) => void` | Yes      | Callback when an image is selected or deselected |
| `className`       | `string`                            | No       | Additional CSS classes                           |

### Implementation Details

- Uses the `/api/images` endpoint with filtering and pagination
- Integrates with the existing `useImages` hook
- Follows the same filtering patterns as `GalleryImageSelector`
- Provides a modal dialog interface for image selection
- Shows selected image preview with removal option
- Resets filters when dialog opens for consistent UX

### Dependencies

- `@/hooks/use-images` - For fetching images
- `@/lib/hooks/query/useCars` - For car filtering
- `@/components/ui/*` - UI components (Button, Input, Select, Dialog, etc.)
- `use-debounce` - For search input debouncing
- `lucide-react` - For icons

## ProjectAvatar

A React component for displaying project primary images as circular avatars. Similar to `CarAvatar` but designed for projects.

### Features

- **Image Loading**: Fetches and displays project primary images
- **Fallback**: Shows an image icon when no primary image is set or loading fails
- **Caching**: Caches image URLs to avoid repeated API calls
- **Error Handling**: Gracefully handles network errors and missing images
- **Responsive Sizes**: Three size variants (sm, md, lg)
- **Timeout Protection**: 5-second timeout for image fetching

### Usage

```tsx
import { ProjectAvatar } from "@/components/ui/ProjectAvatar";

function MyComponent() {
  return (
    <ProjectAvatar
      primaryImageId={project.primaryImageId}
      entityName={project.title}
      size="md"
    />
  );
}
```

### Props

| Prop             | Type                   | Required | Description                            |
| ---------------- | ---------------------- | -------- | -------------------------------------- |
| `primaryImageId` | `string \| ObjectId`   | No       | The ID of the primary image to display |
| `entityName`     | `string`               | Yes      | Name for accessibility (alt text)      |
| `size`           | `"sm" \| "md" \| "lg"` | No       | Size variant (default: "md")           |
| `className`      | `string`               | No       | Additional CSS classes                 |

### Size Variants

- **sm**: 32x32px (w-8 h-8)
- **md**: 48x48px (w-12 h-12)
- **lg**: 64x64px (w-16 h-16)

### Implementation Details

- Uses `/api/images/{id}` endpoint to fetch image data
- Implements URL caching to prevent duplicate requests
- Uses AbortController for request cancellation
- Handles component unmounting gracefully
- Shows fallback icon when image is unavailable
- Optimized for performance with React.useCallback and proper cleanup

### Dependencies

- `@/lib/utils` - For className utilities
- `lucide-react` - For fallback icon
- `mongodb` - For ObjectId type support
