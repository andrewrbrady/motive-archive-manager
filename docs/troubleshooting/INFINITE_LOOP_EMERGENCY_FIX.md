# Emergency Fix: Maximum Update Depth Exceeded - Infinite Loops

## Critical Issue

The gallery was experiencing "Maximum update depth exceeded" errors, causing complete application crashes. This was happening due to circular dependencies in React effects that created infinite update loops.

## Root Causes Identified

### 1. Circular Dependencies in Effects

**Problem**: Effects had state variables in their dependencies that they were also updating, creating infinite loops.

```typescript
// PROBLEMATIC CODE:
useEffect(() => {
  // ... logic that calls setCurrentImage
  setCurrentImage(urlImage);
}, [filteredImages, currentImageId, selectLast, currentImage]); // currentImage in deps!
```

**Solution**: Removed circular dependencies by using refs to track state without triggering re-renders.

```typescript
// FIXED CODE:
const currentImageRef = useRef<ExtendedImageType | null>(null);

useEffect(() => {
  currentImageRef.current = currentImage;
}, [currentImage]);

useEffect(() => {
  // ... logic that calls setCurrentImage
  if (urlImage && urlImage._id !== currentImageRef.current?._id) {
    setCurrentImage(urlImage);
  }
}, [filteredImages, currentImageId, selectLast]); // No currentImage in deps
```

### 2. Object Reference Instability

**Problem**: Filter objects were being recreated on every render, causing effects that depend on filters to run continuously.

```typescript
// PROBLEMATIC CODE:
const [filters, setFilters] = useState<FilterState>({});

useEffect(() => {
  // ... updates that depend on filters
}, [images, filters, debouncedSearchQuery]); // filters object changes every time
```

**Solution**: Stabilized filter references and memoized filter options.

```typescript
// FIXED CODE:
const [filters, setFilters] = useState<FilterState>(() => ({}));

const memoizedFilterOptions = useMemo(() => {
  // ... filter options logic
  return newFilterOptions;
}, [images]); // Only depend on images, not filters
```

### 3. Multiple URL Update Mechanisms

**Problem**: Multiple functions were updating URLs and state simultaneously, causing race conditions.

**Solution**: Consolidated all image navigation through a single atomic function and removed conflicting URL sync effects.

## Key Changes Made

### 1. Fixed Circular Dependencies

- **File**: `src/hooks/useGenericImageGallery.ts`
- **Change**: Removed `currentImage` from effect dependencies
- **Method**: Used `currentImageRef` to track state without triggering effects

### 2. Stabilized Filter Objects

- **File**: `src/hooks/useGenericImageGallery.ts`
- **Change**: Memoized filter options and used stable filter references
- **Method**: Split filter processing into separate memoized computation and effect

### 3. Eliminated Duplicate URL Updates

- **File**: `src/hooks/useGenericImageGallery.ts`
- **Change**: Removed conflicting URL sync effect
- **Method**: Made all image navigation go through single `navigateToImage` function

## Technical Details

### Before Fix - Problematic Effects Chain:

1. User changes filter → `setFilters()` called
2. Filter object reference changes → Effect triggers
3. Effect calls `setFilteredImages()` and `setFilterOptions()`
4. Filter options change → Radix UI components re-render
5. Component re-render triggers filter change → Loop back to step 1
6. **Result**: Infinite loop, maximum update depth exceeded

### After Fix - Stable Effects Chain:

1. User changes filter → `setFilters()` called
2. Filter change triggers filtered images update (stable)
3. Filter options are memoized based only on images (stable)
4. No circular dependencies in effects
5. **Result**: Single update cycle, no loops

## Files Modified

- `src/hooks/useGenericImageGallery.ts` - Core infinite loop fixes
- `docs/troubleshooting/GALLERY_NAVIGATION_FIX.md` - Updated with additional context

## Critical Lessons Learned

### 1. Effect Dependencies Must Be Carefully Managed

- **Never** include state variables in effect dependencies if the effect updates those same variables
- Use refs to access current state without triggering re-renders
- Always question: "Will this effect trigger itself?"

### 2. Object References Must Be Stable

- Memoize computed objects that are used as dependencies
- Use functional state updates when possible
- Avoid recreating objects in render cycles

### 3. Multiple State Update Sources Are Dangerous

- Consolidate state updates through single functions
- Avoid having multiple effects that update the same state
- Make one source of truth for each piece of state

## Prevention Strategies

### 1. Effect Dependency Auditing

```typescript
// ALWAYS ASK: Does this effect update any of its dependencies?
useEffect(() => {
  // If this calls setState for any variable in the dependency array,
  // you have a potential infinite loop
}, [dependency1, dependency2, dependency3]);
```

### 2. State Update Consolidation

```typescript
// GOOD: Single function handles all related state updates
const handleNavigation = (imageId: string) => {
  setCurrentImage(image);
  updateURL(imageId);
};

// BAD: Multiple effects updating the same state
useEffect(() => { setCurrentImage(...) }, [dep1]);
useEffect(() => { updateURL(...) }, [currentImage]); // LOOP!
```

### 3. Memoization for Stability

```typescript
// GOOD: Stable object reference
const memoizedOptions = useMemo(() => computeOptions(), [stableDeps]);

// BAD: New object every render
const options = computeOptions(); // Different reference each time
```

## Emergency Response Checklist

If you encounter "Maximum update depth exceeded" errors:

1. **Identify the Loop Source**

   - Look for effects that update their own dependencies
   - Check for object reference instability
   - Search for multiple state update sources

2. **Apply Immediate Fixes**

   - Remove circular dependencies from effects
   - Use refs for state access without re-renders
   - Memoize computed objects

3. **Test Thoroughly**

   - Test all user interactions (clicks, keyboard shortcuts)
   - Test filter changes and navigation
   - Monitor console for any remaining loops

4. **Document the Fix**
   - Record what caused the loop
   - Document the solution approach
   - Update prevention strategies

## Result

- ✅ Eliminated all infinite loops
- ✅ Fixed "Maximum update depth exceeded" errors
- ✅ Maintained all existing functionality
- ✅ Improved performance by reducing unnecessary re-renders
- ✅ Created stable foundation for future development
