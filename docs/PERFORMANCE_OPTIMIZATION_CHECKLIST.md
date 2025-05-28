# Performance Optimization Checklist

## 🎯 CRITICAL ACTION ITEMS

This document provides a concrete checklist of specific actions needed to fix the major performance issues in the Motive Archive Manager application.

## ✅ COMPLETED ITEMS

### Navigation Performance

- [x] **Removed global loading spinner** - Deleted `src/app/loading.tsx`
- [x] **Optimized admin loading** - Replaced spinner with skeleton UI in `src/app/admin/loading.tsx`
- [x] **Removed navigation delays** - Eliminated debouncing timeouts from router

### API Route Optimizations

- [x] **Root Layout** - Removed `export const dynamic = "force-dynamic"` from `src/app/layout.tsx`
- [x] **Cars Makes API** - Removed force-dynamic, added ISR caching (1 hour) in `src/app/api/cars/makes/route.ts`
- [x] **User Role Stats API** - Removed force-dynamic, added ISR caching (30 min) in `src/app/api/users/role-stats/route.ts`
- [x] **Makes API** - Removed force-dynamic, added ISR caching (2 hours) in `src/app/api/makes/route.ts`

### Component Breakdown Progress

- [x] **ImageCropModal.tsx** - Started breakdown (1,851 lines → multiple components)
  - [x] Created `src/components/cars/image-crop/types.ts` with extracted interfaces
  - [x] Created `src/components/cars/image-crop/hooks/useCropSettings.ts` for state management
  - [x] Created `src/components/cars/image-crop/hooks/usePreviewSettings.ts` for preview state
  - [x] Created `src/components/cars/image-crop/components/CropCanvas.tsx` for interactive cropping
  - [x] Created `src/components/cars/image-crop/components/CropControls.tsx` for settings controls
  - [x] Created `src/components/cars/image-crop/components/ImagePreview.tsx` for image previews
  - [x] Created `src/components/cars/image-crop/components/ProcessingButtons.tsx` for action buttons

## 🚨 IMMEDIATE PRIORITY ACTIONS

### 1. Complete ImageCropModal Refactoring

**Status**: 70% Complete
**Estimated Time**: 2-3 hours

**Action Items**:

- [ ] **Refactor main ImageCropModal.tsx** to use the new sub-components
- [ ] **Test functionality** to ensure no regressions
- [ ] **Verify performance improvement** (should reduce bundle size significantly)

### 2. Remove Force-Dynamic from Remaining API Routes

**Status**: 4 of 80+ routes optimized
**Estimated Time**: 1-2 days

**High Priority Routes to Optimize**:

- [ ] `src/app/api/auctions/route.ts` - Static auction data, add ISR caching
- [ ] `src/app/api/documents/route.ts` - Document listings, add pagination caching
- [ ] `src/app/api/locations/[id]/route.ts` - Location data, add ISR caching
- [ ] `src/app/api/hard-drives/[id]/route.ts` - Hardware info, add ISR caching
- [ ] `src/app/api/batch-templates/[name]/route.ts` - Template data, add ISR caching
- [ ] `src/app/api/event-templates/[name]/route.ts` - Template data, add ISR caching

**Routes to Keep Dynamic** (user-specific or real-time data):

- `src/app/api/auth/**` - Authentication routes
- `src/app/api/cars/route.ts` - Has POST operations and search
- `src/app/api/images/**` - Real-time image processing
- `src/app/api/projects/**` - User-specific project data

### 3. Break Down Remaining Monolithic Components

**Status**: 1 of 10+ components started
**Estimated Time**: 2-3 weeks

**Next Priority Components**:

1. [ ] **DeliverablesTab.tsx** (1,738 lines)
   - Split into: DeliverablesList, DeliverableForm, DeliverableFilters, DeliverableActions
2. [ ] **ImageGalleryWithQuery.tsx** (1,673 lines)
   - Split into: GalleryGrid, GalleryFilters, GalleryPagination, ImageModal
3. [ ] **StudioInventoryTab.tsx** (1,614 lines)
   - Split into: InventoryList, InventoryForm, InventorySearch, InventoryActions
4. [ ] **CaptionGenerator.tsx** (1,613 lines)
   - Split into: CaptionForm, CaptionPreview, CaptionHistory, CaptionSettings

## 📋 DETAILED ACTION PLAN

### Week 1: Complete Current Work

**Days 1-2**: Finish ImageCropModal refactoring

- [ ] Refactor main component to use sub-components
- [ ] Test all functionality (crop, preview, upload, download)
- [ ] Measure performance improvement

**Days 3-5**: Optimize 10-15 more API routes

- [ ] Audit routes for static vs dynamic data requirements
- [ ] Add ISR caching to appropriate routes
- [ ] Test caching behavior

### Week 2: Major Component Breakdown

**Days 1-3**: DeliverablesTab.tsx breakdown

- [ ] Extract types and interfaces
- [ ] Create custom hooks for state management
- [ ] Split into 4-5 focused sub-components
- [ ] Refactor main component

**Days 4-5**: ImageGalleryWithQuery.tsx breakdown

- [ ] Extract gallery logic into hooks
- [ ] Create reusable gallery components
- [ ] Implement lazy loading for images

### Week 3: Data Fetching Optimization

**Days 1-2**: Set up React Query

- [ ] Install and configure React Query
- [ ] Create query hooks for common data fetching patterns
- [ ] Replace useEffect patterns in 5-10 components

**Days 3-5**: Server Component Migration

- [ ] Identify components that can be Server Components
- [ ] Move data fetching to server side where appropriate
- [ ] Add proper loading states and error boundaries

## 🎯 SPECIFIC FILE TARGETS

### API Routes to Optimize (Remove force-dynamic, add caching)

```
src/app/api/auctions/route.ts
src/app/api/documents/route.ts
src/app/api/containers/[id]/route.ts
src/app/api/locations/[id]/route.ts
src/app/api/hard-drives/[id]/route.ts
src/app/api/batch-templates/[name]/route.ts
src/app/api/event-templates/[name]/route.ts
src/app/api/shot-templates/[id]/route.ts
src/app/api/inventory/[id]/route.ts
src/app/api/contacts/[id]/route.ts
src/app/api/clients/[id]/route.ts
src/app/api/kits/[id]/route.ts
src/app/api/studio_inventory/[id]/route.ts
```

### Components to Break Down (Target: <300 lines each)

```
src/components/deliverables/DeliverablesTab.tsx (1,738 lines)
src/components/cars/ImageGalleryWithQuery.tsx (1,673 lines)
src/components/production/StudioInventoryTab.tsx (1,614 lines)
src/components/CaptionGenerator.tsx (1,613 lines)
src/components/cars/Scripts.tsx (1,571 lines)
src/components/cars/CarImageGalleryV2.tsx (1,413 lines)
src/components/production/RawAssetsTab.tsx (1,260 lines)
src/components/production/HardDrivesTab.tsx (1,243 lines)
src/components/cars/CarEntryForm.tsx (1,241 lines)
src/components/cars/ArticleGenerator.tsx (1,215 lines)
```

## 🚀 EXPECTED PERFORMANCE GAINS

### After Week 1 (ImageCropModal + API Routes)

- **30-40% reduction** in initial bundle size
- **50-70% faster** API responses for cached routes
- **Instant navigation** between routes (already achieved)

### After Week 2 (Component Breakdown)

- **60-80% reduction** in component bundle sizes
- **Faster rendering** due to smaller components
- **Better code splitting** and lazy loading

### After Week 3 (Data Fetching)

- **40-60% reduction** in unnecessary API calls
- **Better caching** and offline support
- **Improved user experience** with proper loading states

## 📊 SUCCESS METRICS

### Performance Targets

- [ ] **First Contentful Paint**: <1.5 seconds (currently 3-5s)
- [ ] **Largest Contentful Paint**: <2.5 seconds (currently 5-8s)
- [ ] **Time to Interactive**: <3 seconds (currently 8-12s)
- [ ] **Bundle Size**: <500KB initial (currently 2-3MB)
- [ ] **Navigation Speed**: <500ms (✅ already achieved)

### Code Quality Targets

- [ ] **No components >300 lines** (currently 10+ components >1000 lines)
- [ ] **No force-dynamic exports** except where necessary (currently 80+ routes)
- [ ] **Proper data fetching patterns** (currently mostly useEffect patterns)
- [ ] **Comprehensive error boundaries** and loading states

## 🔧 IMPLEMENTATION COMMANDS

### Quick Wins (Can be done immediately)

```bash
# Remove force-dynamic from static API routes
find src/app/api -name "route.ts" -exec grep -l "force-dynamic" {} \;

# Find largest components
find src -name "*.tsx" -exec wc -l {} \; | sort -nr | head -20

# Check bundle size
npm run build && npm run analyze
```

### Testing Commands

```bash
# Test API route caching
curl -I http://localhost:3000/api/cars/makes

# Test component loading
npm run dev
# Open browser dev tools → Network → Disable cache → Navigate between pages
```

---

**Next Action**: Complete the ImageCropModal refactoring by updating the main component to use the new sub-components.
