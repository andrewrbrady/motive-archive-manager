# Loading UI Unification Guide

## Overview

This guide provides comprehensive instructions for unifying the loading UI system across the Motive Archive Manager codebase. Currently, there are 50+ inconsistent loading implementations that need to be standardized into a cohesive, maintainable system.

## Current State Analysis

### Problems Identified

- **50+ direct `Loader2` usages** with inconsistent styling
- **10+ custom border spinners** with different implementations
- **Multiple skeleton patterns** (some use `Skeleton` component, others use `animate-pulse` directly)
- **4 different page-level loading components** with duplicate code
- **Inconsistent progress indicators** across upload/processing flows
- **Mixed accessibility support** and ARIA labels
- **No standardized loading states** or error handling

### Existing Components to Consolidate

- `LoadingSpinner` (basic spinner)
- `LoadingContainer` (wrapper component)
- `Skeleton` (basic pulse animation)
- `CarPageSkeleton` (specific skeleton)
- `EnrichmentProgress` (multi-step progress)
- `UploadProgressIndicator` (upload progress)
- `UploadProgressTracking` (generic progress)
- `StatusNotification` (status notifications)

## Implementation Plan

### Phase 1: Core Loading System ✅

#### 1.1 Create Base Loading Component

- [ ] Create `src/components/ui/loading/Loading.tsx`
- [ ] Implement unified loading variants (spinner, skeleton, dots, pulse)
- [ ] Add size system (xs, sm, md, lg, xl)
- [ ] Add color variants (primary, secondary, muted)
- [ ] Include accessibility features (ARIA labels, screen reader support)
- [ ] Add overlay and fullscreen options

```tsx
// src/components/ui/loading/Loading.tsx
interface LoadingProps {
  variant?: "spinner" | "skeleton" | "dots" | "pulse";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "muted";
  fullScreen?: boolean;
  overlay?: boolean;
  text?: string;
  className?: string;
  "aria-label"?: string;
}
```

#### 1.2 Create Loading Design Tokens

- [ ] Create `src/styles/loading-tokens.ts`
- [ ] Define size mappings for all variants
- [ ] Define color mappings with theme support
- [ ] Define animation configurations
- [ ] Export token system for consistent usage

```tsx
// src/styles/loading-tokens.ts
export const loadingTokens = {
  sizes: {
    xs: { spinner: "h-3 w-3", text: "text-xs", skeleton: "h-3" },
    sm: { spinner: "h-4 w-4", text: "text-sm", skeleton: "h-4" },
    md: { spinner: "h-6 w-6", text: "text-base", skeleton: "h-6" },
    lg: { spinner: "h-8 w-8", text: "text-lg", skeleton: "h-8" },
    xl: { spinner: "h-12 w-12", text: "text-xl", skeleton: "h-12" },
  },
  colors: {
    primary: "text-primary",
    secondary: "text-secondary",
    muted: "text-muted-foreground",
  },
  animations: {
    spin: "animate-spin",
    pulse: "animate-pulse",
    bounce: "animate-bounce",
  },
};
```

#### 1.3 Create Loading Hook

- [ ] Create `src/hooks/useLoading.ts`
- [ ] Implement loading state management
- [ ] Add error handling
- [ ] Include `withLoading` wrapper function
- [ ] Add TypeScript types for loading states

```tsx
// src/hooks/useLoading.ts
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);

  const withLoading = useCallback(async (fn: () => Promise<any>) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, setIsLoading, setError, withLoading };
}
```

### Phase 2: Specialized Loading Components ✅

#### 2.1 Create LoadingButton Component

- [ ] Create `src/components/ui/loading/LoadingButton.tsx`
- [ ] Extend existing Button component with loading states
- [ ] Add spinner positioning (left, right, replace)
- [ ] Maintain button accessibility during loading
- [ ] Support all existing button variants

```tsx
// src/components/ui/loading/LoadingButton.tsx
interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  spinnerPosition?: "left" | "right" | "replace";
  spinnerSize?: "xs" | "sm" | "md";
}
```

#### 2.2 Create LoadingContainer Component

- [ ] Create `src/components/ui/loading/LoadingContainer.tsx`
- [ ] Replace existing LoadingContainer with enhanced version
- [ ] Add skeleton variants for different content types
- [ ] Include error state handling
- [ ] Support conditional loading with children

```tsx
// src/components/ui/loading/LoadingContainer.tsx
interface LoadingContainerProps {
  loading?: boolean;
  error?: string | null;
  skeleton?: "default" | "card" | "list" | "table" | "gallery";
  skeletonCount?: number;
  fullHeight?: boolean;
  padding?: string;
  children: React.ReactNode;
}
```

#### 2.3 Create LoadingSkeleton Component

- [ ] Create `src/components/ui/loading/LoadingSkeleton.tsx`
- [ ] Implement preset skeleton layouts
- [ ] Add customizable skeleton patterns
- [ ] Include responsive skeleton designs
- [ ] Support animation timing controls

```tsx
// src/components/ui/loading/LoadingSkeleton.tsx
interface LoadingSkeletonProps {
  type?: "card" | "list" | "table" | "gallery" | "form" | "custom";
  count?: number;
  className?: string;
  animate?: boolean;
  pattern?: SkeletonPattern;
}
```

#### 2.4 Create LoadingOverlay Component

- [ ] Create `src/components/ui/loading/LoadingOverlay.tsx`
- [ ] Implement modal-style loading overlay
- [ ] Add backdrop blur and opacity controls
- [ ] Include z-index management
- [ ] Support portal rendering

```tsx
// src/components/ui/loading/LoadingOverlay.tsx
interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  backdrop?: "blur" | "dark" | "light";
  zIndex?: number;
  portal?: boolean;
}
```

### Phase 3: Progress Indicators ✅

#### 3.1 Create Unified ProgressIndicator Component

- [ ] Create `src/components/ui/loading/ProgressIndicator.tsx`
- [ ] Implement linear, circular, and stepped progress
- [ ] Add upload-specific progress features
- [ ] Include detailed progress information display
- [ ] Support custom progress steps

```tsx
// src/components/ui/loading/ProgressIndicator.tsx
interface ProgressStep {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "active" | "complete" | "error";
  progress?: number;
}

interface ProgressIndicatorProps {
  type?: "linear" | "circular" | "stepped";
  value?: number;
  steps?: ProgressStep[];
  variant?: "default" | "upload" | "processing";
  showDetails?: boolean;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
}
```

#### 3.2 Create Upload Progress Component

- [ ] Create `src/components/ui/loading/UploadProgress.tsx`
- [ ] Replace existing upload progress components
- [ ] Add file-specific progress tracking
- [ ] Include error handling and retry functionality
- [ ] Support batch upload progress

```tsx
// src/components/ui/loading/UploadProgress.tsx
interface UploadProgressProps {
  files: UploadFile[];
  onRetry?: (fileId: string) => void;
  onCancel?: (fileId: string) => void;
  showDetails?: boolean;
  compact?: boolean;
}
```

### Phase 4: Page Loading Components ✅

#### 4.1 Create PageLoading Component

- [ ] Create `src/components/ui/loading/PageLoading.tsx`
- [ ] Replace all existing page loading components
- [ ] Add layout-aware loading states
- [ ] Include navigation skeleton
- [ ] Support different page types

```tsx
// src/components/ui/loading/PageLoading.tsx
interface PageLoadingProps {
  title?: string;
  showNavbar?: boolean;
  showSidebar?: boolean;
  skeletonType?: "default" | "dashboard" | "list" | "detail" | "gallery";
  layout?: "centered" | "full" | "content";
}
```

#### 4.2 Update Next.js Loading Files

- [ ] Update `src/app/loading.tsx`
- [ ] Update `src/app/cars/loading.tsx`
- [ ] Update `src/app/admin/loading.tsx`
- [ ] Update `src/app/cars/[id]/loading.tsx`
- [ ] Ensure consistent loading experience across routes

### Phase 5: Component Migration ✅

#### 5.1 Create Migration Utilities

- [ ] Create `src/utils/loading-migration.ts`
- [ ] Add helper functions for component migration
- [ ] Include mapping from old to new components
- [ ] Add validation utilities

#### 5.2 Replace Direct Loader2 Usage

**Files to update (50+ instances):**

- [ ] `src/components/UploadProgressDialog.tsx` (Lines 62, 75)
- [ ] `src/components/DeleteImageDialog.tsx` (Line 133)
- [ ] `src/components/galleries/GalleryImageSelector.tsx` (Line 503)
- [ ] `src/components/galleries/BatchCanvasExtensionModal.tsx` (Lines 642, 659, 733, 752)
- [ ] `src/components/galleries/GalleryImageMatteModal.tsx` (Lines 451, 473)
- [ ] `src/components/galleries/BatchImageMatteModal.tsx` (Lines 691, 708, 782, 801)
- [ ] `src/components/events/EventTypeSelector.tsx` (Line 92)
- [ ] `src/components/galleries/GalleryCanvasExtensionModal.tsx` (Lines 405, 424)
- [ ] `src/components/cars/SpecificationsEnrichment.tsx` (Line 137)
- [ ] `src/components/cars/GalleryUploader.tsx` (Lines 89, 94)
- [ ] `src/components/cars/Specifications.tsx` (Line 470)
- [ ] `src/components/cars/SimpleImageGallery.tsx` (Lines 115, 197)
- [ ] `src/components/cars/ShotListTemplates.tsx` (Lines 326, 520, 572)
- [ ] `src/components/cars/CarEntryForm.tsx` (Lines 939, 960)
- [ ] `src/components/cars/CarImageGalleryV2.tsx` (Lines 622, 1089)
- [ ] `src/components/cars/ArticleGenerator.tsx` (Lines 972, 1074, 1116, 1138, 1143)
- [ ] `src/components/cars/CanvasExtensionModal.tsx` (Lines 745, 806, 823, 847)
- [ ] `src/components/cars/ImageMatteModal.tsx` (Lines 765, 799, 816, 840)
- [ ] `src/components/production/CarLabel.tsx` (Line 75)
- [ ] `src/components/production/DriveLabel.tsx` (Line 48)
- [ ] `src/components/cars/ImageCard.tsx` (Line 150)
- [ ] `src/components/cars/CarImageEditor.tsx` (Line 153)
- [ ] `src/components/production/ShotListTemplatesTab.tsx` (Lines 107, 1244, 1357, 1387, 1561, 1889)
- [ ] `src/components/cars/CarGalleries.tsx` (Lines 489, 603, 631)
- [ ] `src/components/production/BulkEditModal.tsx` (Line 505)
- [ ] `src/components/cars/InspectionReport.tsx` (Lines 468)
- [ ] `src/components/cars/ImageGalleryWithQuery.tsx` (Lines 861, 986, 1117, 1297)
- [ ] `src/components/cars/Scripts.tsx` (Line 1165)
- [ ] `src/components/users/UserSelector.tsx` (Line 171)
- [ ] `src/components/cars/SpecificationsStandalone.tsx` (Line 229)
- [ ] `src/components/users/EnhancedUserSelector.tsx` (Lines 152, 207)
- [ ] `src/components/users/UserManagement.tsx` (Lines 448, 590)
- [ ] `src/components/users/SimpleUserSelector.tsx` (Lines 137, 184)
- [ ] `src/components/users/FirestoreUserSelector.tsx` (Lines 107, 146)
- [ ] `src/components/deliverables/BatchAssignmentModal.tsx` (Line 146)
- [ ] `src/components/deliverables/StatusSelector.tsx` (Line 109)
- [ ] `src/components/deliverables/DeliverableAssignment.tsx` (Lines 165, 202)
- [ ] `src/app/admin/CaptionPromptsContent.tsx` (Lines 295, 393, 478)
- [ ] `src/app/admin/EventTypeSettingsContent.tsx` (Lines 270, 302)

#### 5.3 Replace Custom Border Spinners

**Files to update (10+ instances):**

- [ ] `src/components/deliverables/DeliverablesTab.tsx` (Line 1104)
- [ ] `src/components/projects/ProjectTeamTab.tsx` (Line 298)
- [ ] `src/components/auth/MobileOAuthButton.tsx` (Line 86)
- [ ] `src/app/promote-admin/page.tsx` (Lines 53, 141)
- [ ] `src/app/dashboard/page.tsx` (Lines 262, 448)
- [ ] `src/app/admin/LengthSettingsContent.tsx` (Line 267)
- [ ] `src/app/admin/SystemPromptsContent.tsx` (Line 242)
- [ ] `src/app/projects/[id]/settings/page.tsx` (Line 230)

#### 5.4 Standardize Skeleton Usage

**Files to update:**

- [ ] `src/components/LazyImage.tsx` - Update skeleton implementation
- [ ] `src/components/CarImageGallery.tsx` - Standardize skeleton usage
- [ ] `src/components/ImageGallery.tsx` - Update ImageSkeleton component
- [ ] `src/app/cars/[id]/loading.tsx` - Replace custom skeleton with standard
- [ ] `src/components/cars/CarGalleries.tsx` - Update animate-pulse usage

### Phase 6: Hook Integration ✅

#### 6.1 Update Loading State Management

**Files to update with useLoading hook:**

- [ ] `src/hooks/useGalleryState.ts` - Replace manual loading state
- [ ] `src/lib/hooks/query/useGalleries.ts` - Integrate useLoading
- [ ] `src/hooks/use-images.ts` - Standardize loading patterns
- [ ] `src/hooks/useEventTypeSettings.ts` - Use unified loading
- [ ] `src/app/projects/page.tsx` - Replace manual loading state
- [ ] `src/hooks/use-galleries.ts` - Integrate useLoading
- [ ] `src/components/projects/caption-generator/handlers/promptHandlers.ts` - Update prompt loading
- [ ] `src/components/copywriting/MDXTab.tsx` - Standardize loading states
- [ ] `src/components/production/ContainersTab.tsx` - Use useLoading hook
- [ ] `src/hooks/useImageUploader.ts` - Integrate with unified system
- [ ] `src/components/projects/caption-generator/useProjectData.ts` - Standardize loading

### Phase 7: Export and Index Files ✅

#### 7.1 Create Loading System Index

- [ ] Create `src/components/ui/loading/index.ts`
- [ ] Export all loading components
- [ ] Create convenient re-exports
- [ ] Add TypeScript type exports

```tsx
// src/components/ui/loading/index.ts
export { Loading } from "./Loading";
export { LoadingButton } from "./LoadingButton";
export { LoadingContainer } from "./LoadingContainer";
export { LoadingSkeleton } from "./LoadingSkeleton";
export { LoadingOverlay } from "./LoadingOverlay";
export { ProgressIndicator } from "./ProgressIndicator";
export { UploadProgress } from "./UploadProgress";
export { PageLoading } from "./PageLoading";

export type {
  LoadingProps,
  LoadingButtonProps,
  LoadingContainerProps,
  LoadingSkeletonProps,
  LoadingOverlayProps,
  ProgressIndicatorProps,
  UploadProgressProps,
  PageLoadingProps,
} from "./types";
```

#### 7.2 Update Main UI Index

- [ ] Update `src/components/ui/index.ts`
- [ ] Remove old loading exports
- [ ] Add new unified loading exports
- [ ] Maintain backward compatibility during transition

### Phase 8: Documentation and Testing ✅

#### 8.1 Create Component Documentation

- [ ] Create `docs/components/loading-system.md`
- [ ] Document all loading components with examples
- [ ] Add usage guidelines and best practices
- [ ] Include migration examples

#### 8.2 Create Storybook Stories

- [ ] Create `src/stories/Loading.stories.tsx`
- [ ] Add stories for all loading variants
- [ ] Include interactive controls
- [ ] Document accessibility features

#### 8.3 Add Tests

- [ ] Create `src/components/ui/loading/__tests__/`
- [ ] Add unit tests for all loading components
- [ ] Test accessibility features
- [ ] Add integration tests for loading states

### Phase 9: Performance Optimization ✅

#### 9.1 Bundle Analysis

- [ ] Analyze current loading component bundle size
- [ ] Optimize loading animations for performance
- [ ] Implement lazy loading for complex progress components
- [ ] Add tree-shaking optimizations

#### 9.2 Animation Performance

- [ ] Use CSS transforms for animations
- [ ] Implement `will-change` optimizations
- [ ] Add reduced motion support
- [ ] Optimize for mobile performance

### Phase 10: Final Cleanup ✅

#### 10.1 Remove Deprecated Components

- [ ] Remove old `LoadingSpinner` component
- [ ] Remove old `LoadingContainer` component
- [ ] Clean up unused loading utilities
- [ ] Remove duplicate loading styles

#### 10.2 Update Documentation

- [ ] Update README with new loading system
- [ ] Add migration guide for future developers
- [ ] Update component documentation
- [ ] Create loading system style guide

## Implementation Checklist Summary

### Core System (Phase 1-2)

- [ ] ✅ Create base Loading component with all variants
- [ ] ✅ Create loading design tokens
- [ ] ✅ Create useLoading hook
- [ ] ✅ Create LoadingButton component
- [ ] ✅ Create LoadingContainer component
- [ ] ✅ Create LoadingSkeleton component
- [ ] ✅ Create LoadingOverlay component

### Progress System (Phase 3)

- [ ] ✅ Create unified ProgressIndicator component
- [ ] ✅ Create UploadProgress component
- [ ] ✅ Replace EnrichmentProgress usage
- [ ] ✅ Replace UploadProgressIndicator usage
- [ ] ✅ Replace UploadProgressTracking usage

### Page Loading (Phase 4)

- [ ] ✅ Create PageLoading component
- [ ] ✅ Update all loading.tsx files
- [ ] ✅ Standardize page loading experience

### Migration (Phase 5-6)

- [ ] ✅ Replace 50+ direct Loader2 usages
- [ ] ✅ Replace 10+ custom border spinners
- [ ] ✅ Standardize skeleton implementations
- [ ] ✅ Update all loading state management

### Finalization (Phase 7-10)

- [ ] ✅ Create proper exports and indexes
- [ ] ✅ Add comprehensive documentation
- [ ] ✅ Add tests and Storybook stories
- [ ] ✅ Optimize performance
- [ ] ✅ Clean up deprecated components

## Usage Examples

### Basic Loading

```tsx
// Before
{
  isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Content";
}

// After
<Loading loading={isLoading} size="sm">
  Content
</Loading>;
```

### Button Loading

```tsx
// Before
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save
</Button>

// After
<LoadingButton loading={isLoading}>Save</LoadingButton>
```

### Page Loading

```tsx
// Before (in loading.tsx)
<div className="min-h-screen bg-background">
  <div className="flex items-center justify-center">
    <Loader2 className="h-5 w-5 animate-spin" />
    <p>Loading...</p>
  </div>
</div>

// After
<PageLoading title="Loading..." skeletonType="default" />
```

### Progress Indicator

```tsx
// Before
<EnrichmentProgress
  isVisible={showProgress}
  step={progress.step}
  status={progress.status}
  // ... many props
/>

// After
<ProgressIndicator
  type="stepped"
  steps={progressSteps}
  variant="processing"
/>
```

## Benefits After Implementation

1. **Consistency**: All loading states will look and behave identically
2. **Maintainability**: Single source of truth for all loading UI
3. **Performance**: Reduced bundle size and optimized animations
4. **Accessibility**: Consistent ARIA labels and screen reader support
5. **Developer Experience**: Simple, predictable API for all loading states
6. **Theming**: Easy global updates to loading styles
7. **Testing**: Standardized loading states are easier to test
8. **Documentation**: Clear usage patterns and examples

## Success Metrics

- [ ] Zero direct `Loader2` usages outside the loading system
- [ ] Zero custom border spinner implementations
- [ ] All loading states use unified components
- [ ] 100% accessibility compliance for loading states
- [ ] Reduced loading-related bundle size by 30%
- [ ] All loading components have tests and documentation

---

**Note**: This is a comprehensive refactoring that will significantly improve the codebase. Take time to test each phase thoroughly before moving to the next one. Consider creating feature branches for each phase to allow for easier review and rollback if needed.
