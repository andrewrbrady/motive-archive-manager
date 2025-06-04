# 🚀 Unified Copywriter Migration Guide

## Overview

The `UnifiedCopywriter` consolidates car and project copywriter functionality into a single, flexible component that can handle both single car and multiple car scenarios.

## Benefits

- ✅ **Reduced Code Duplication**: One component handles all copywriter scenarios
- ✅ **Consistent Behavior**: Same logic and UI across car and project pages
- ✅ **Easier Maintenance**: Single source of truth for copywriter features
- ✅ **Flexible Configuration**: Auto-detects usage patterns and configures accordingly
- ✅ **Performance Optimized**: Uses non-blocking useAPIQuery patterns

## Migration Steps

### 1. Car Detail Pages (`/cars/[id]`)

**Before:**

```tsx
import { CarCopywriter } from "@/components/copywriting/CarCopywriter";

// In your component
<CarCopywriter carId={carId} />;
```

**After:**

```tsx
import { UnifiedCopywriter } from "@/components/copywriting/UnifiedCopywriter";

// In your component
<UnifiedCopywriter carId={carId} showClientHandle={true} />;
```

### 2. Project Detail Pages (`/projects/[id]`)

**Before:**

```tsx
import { ProjectCopywriter } from "@/components/copywriting/ProjectCopywriter";

// In your component
<ProjectCopywriter project={project} onProjectUpdate={onProjectUpdate} />;
```

**After:**

```tsx
import { UnifiedCopywriter } from "@/components/copywriting/UnifiedCopywriter";

// In your component
<UnifiedCopywriter
  carIds={project.carIds}
  projectId={project._id}
  allowMultipleCars={true}
  allowMinimalCarData={true}
  onProjectUpdate={onProjectUpdate}
/>;
```

### 3. Custom Use Cases

**Multiple specific cars (no project):**

```tsx
<UnifiedCopywriter
  carIds={["car-123", "car-456", "car-789"]}
  title="Multi-Car Campaign"
  allowMultipleCars={true}
/>
```

**Single car with custom settings:**

```tsx
<UnifiedCopywriter
  carId="car-123"
  title="Custom Car Copywriter"
  allowEventSelection={false}
  showClientHandle={true}
/>
```

## Configuration Options

| Prop                  | Type         | Default       | Description                          |
| --------------------- | ------------ | ------------- | ------------------------------------ |
| `carId`               | `string`     | -             | Single car ID (car detail pages)     |
| `carIds`              | `string[]`   | `[]`          | Multiple car IDs (project pages)     |
| `projectId`           | `string`     | -             | Project ID for project-specific data |
| `title`               | `string`     | Auto-detected | Custom title for the copywriter      |
| `allowMultipleCars`   | `boolean`    | Auto-detected | Enable multi-car selection UI        |
| `allowEventSelection` | `boolean`    | `true`        | Enable event selection features      |
| `allowMinimalCarData` | `boolean`    | `false`       | Use minimal car data for performance |
| `showClientHandle`    | `boolean`    | `false`       | Show client handle in copywriter     |
| `onProjectUpdate`     | `() => void` | -             | Callback when project data changes   |

## Auto-Detection Features

The `UnifiedCopywriter` automatically detects usage patterns:

- **Mode Detection**: `project` if `projectId` provided, otherwise `car`
- **Multi-Car Detection**: Enabled if `carIds.length > 1` or `allowMultipleCars={true}`
- **API Endpoints**: Configured based on project vs car mode
- **Feature Flags**: Smart defaults based on usage context

## Performance Benefits

- **Shared Caching**: System prompts and length settings cached across all instances
- **Non-Blocking Loading**: UI remains responsive during data loading
- **Optimized Queries**: Uses `useAPIQuery` with proper caching strategies
- **Conditional Loading**: Only loads data for enabled features

## Testing the Migration

1. **Replace one component at a time**
2. **Test both loading and error states**
3. **Verify caption save/delete/update functionality**
4. **Check that tab switching works during loading**
5. **Ensure multi-car selection works on project pages**

## Rollback Plan

If issues arise, you can easily rollback by reverting to the original components:

- Keep the original `CarCopywriter` and `ProjectCopywriter` files as backup
- Switch imports back to original components
- The `BaseCopywriter` remains unchanged and compatible

## Next Steps

After successful migration:

1. **Remove old copywriter files** (`CarCopywriter.tsx`, `ProjectCopywriter.tsx`)
2. **Update documentation** to reference the unified component
3. **Consider additional consolidation** for other similar feature pairs
4. **Monitor performance** improvements from reduced code duplication

## Examples in the Wild

Check these files to see the `UnifiedCopywriter` in action:

- `src/components/copywriting/UnifiedCopywriter.tsx` - The main component
- Update `src/components/cars/CarTabs.tsx` to use the unified component
- Update project detail pages to use the unified component

---

_This migration consolidates copywriter functionality while maintaining all existing features and improving performance._
