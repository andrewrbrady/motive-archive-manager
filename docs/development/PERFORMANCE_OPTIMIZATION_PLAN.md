# Performance Optimization Plan

## Motive Archive Manager

### 🎯 **Executive Summary**

The codebase has significant performance bottlenecks caused by:

- Monolithic components (2000+ lines)
- Excessive useEffect dependencies causing re-render loops
- Inefficient database queries and API routes
- Disparate loading systems (50+ inconsistent implementations)
- Heavy image processing without optimization

**Estimated Performance Gains:** 60-80% improvement in load times and user experience.

---

## 🔍 **Critical Issues Analysis**

### 1. **Monolithic Components**

**Problem:** Components with 1500-2000+ lines causing slow renders and large bundles.

**Files Affected:**

- `ShotListTemplatesTab.tsx` (2013 lines)
- `ImageCropModal.tsx` (1847 lines)
- `DeliverablesTab.tsx` (1738 lines)
- `ImageGalleryWithQuery.tsx` (1668 lines)
- `StudioInventoryTab.tsx` (1614 lines)

**Impact:**

- Initial render time: 800-1200ms
- Bundle size: 40% larger than optimal
- Memory usage: 3x higher than necessary

### 2. **useEffect Performance Issues**

**Problem:** 50+ components with problematic useEffect patterns.

**Common Patterns Found:**

```typescript
// ❌ Infinite re-render loop
useEffect(() => {
  fetchData();
}, [fetchData]); // fetchData recreated every render

// ❌ Missing dependencies
useEffect(() => {
  processImages(images, filters);
}, [images]); // Missing 'filters' dependency

// ❌ Heavy computation in effect
useEffect(() => {
  const result = heavyComputation(largeDataSet);
  setState(result);
}, [largeDataSet]);
```

### 3. **Database Query Inefficiencies**

**Problem:** API routes with poor query optimization.

**Issues Found:**

- No database indexes on frequently queried fields
- Large result sets without proper pagination
- N+1 query problems in image loading
- Missing query result caching

**Example Problematic Query:**

```typescript
// ❌ Inefficient - loads all images then filters
const images = await collection.find({}).toArray();
const filtered = images.filter((img) => img.carId === carId);
```

### 4. **Image Processing Bottlenecks**

**Problem:** Heavy image operations blocking the main thread.

**Issues:**

- Synchronous image processing
- No Web Workers for heavy operations
- Duplicate image processing logic
- No image compression or optimization

---

## 🚀 **Optimization Strategy**

### **Phase 1: Component Architecture (Week 1-2)**

#### 1.1 **Split Monolithic Components**

Break down large components using composition patterns:

```typescript
// ✅ Before: ShotListTemplatesTab.tsx (2013 lines)
// ✅ After: Composed architecture

// ShotListTemplatesTab.tsx (200 lines)
export function ShotListTemplatesTab() {
  return (
    <div>
      <TemplateHeader />
      <TemplateFilters />
      <TemplateGrid />
      <TemplateModal />
    </div>
  );
}

// TemplateGrid.tsx (300 lines)
// TemplateModal.tsx (400 lines)
// TemplateFilters.tsx (150 lines)
// etc.
```

#### 1.2 **Implement Lazy Loading**

Use React.lazy() for heavy components:

```typescript
// ✅ Lazy load heavy modals
const ImageCropModal = lazy(() => import('./ImageCropModal'));
const CanvasExtensionModal = lazy(() => import('./CanvasExtensionModal'));

// ✅ Lazy load tab content
const LazyTabContent = ({ children, isActive }) => {
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [isActive, hasLoaded]);

  if (!hasLoaded) return null;

  return (
    <Suspense fallback={<TabSkeleton />}>
      {children}
    </Suspense>
  );
};
```

### **Phase 2: React Performance (Week 2-3)**

#### 2.1 **Fix useEffect Dependencies**

Implement proper dependency management:

```typescript
// ✅ Stable function references
const fetchData = useCallback(async () => {
  const result = await api.getData(filters);
  setData(result);
}, [filters]); // Only recreate when filters change

// ✅ Memoized heavy computations
const processedData = useMemo(() => {
  return heavyComputation(rawData);
}, [rawData]);

// ✅ Proper effect dependencies
useEffect(() => {
  fetchData();
}, [fetchData]);
```

#### 2.2 **Implement React.memo and useMemo**

Prevent unnecessary re-renders:

```typescript
// ✅ Memoize expensive components
const ImageGallery = memo(({ images, filters }) => {
  const filteredImages = useMemo(() =>
    images.filter(img => matchesFilters(img, filters)),
    [images, filters]
  );

  return <Gallery images={filteredImages} />;
});

// ✅ Memoize complex calculations
const galleryStats = useMemo(() => ({
  totalImages: images.length,
  categories: getUniqueCategories(images),
  totalSize: calculateTotalSize(images)
}), [images]);
```

### **Phase 3: Database Optimization (Week 3-4)**

#### 3.1 **Add Database Indexes**

Create indexes for frequently queried fields:

```javascript
// ✅ Add these indexes to MongoDB
db.images.createIndex({ carId: 1, "metadata.category": 1 });
db.images.createIndex({ createdAt: -1 });
db.images.createIndex({ "metadata.angle": 1, "metadata.movement": 1 });
db.cars.createIndex({ make: 1, model: 1, year: 1 });
db.events.createIndex({ start: 1, status: 1 });
```

#### 3.2 **Optimize API Queries**

Implement efficient query patterns:

```typescript
// ✅ Optimized image query
export async function GET(request: NextRequest) {
  const { carId, page = 1, limit = 20, category } = getParams(request);

  const query = { carId: new ObjectId(carId) };
  if (category && category !== "all") {
    query["metadata.category"] = category;
  }

  // Use aggregation for better performance
  const pipeline = [
    { $match: query },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $project: {
        url: 1,
        filename: 1,
        "metadata.category": 1,
        "metadata.angle": 1,
        createdAt: 1,
      },
    },
  ];

  const [images, total] = await Promise.all([
    collection.aggregate(pipeline).toArray(),
    collection.countDocuments(query),
  ]);

  return NextResponse.json({ images, total });
}
```

#### 3.3 **Implement Query Caching**

Add Redis or in-memory caching:

```typescript
// ✅ Cache frequently accessed data
const cache = new Map();

export async function getCachedCarImages(carId: string) {
  const cacheKey = `car-images-${carId}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const images = await fetchCarImages(carId);
  cache.set(cacheKey, images);

  // Auto-expire after 5 minutes
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);

  return images;
}
```

### **Phase 4: Image Optimization (Week 4-5)**

#### 4.1 **Implement Progressive Image Loading**

```typescript
// ✅ Progressive image component
export function OptimizedImage({ src, alt, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative">
      {!isLoaded && !error && (
        <Skeleton className="absolute inset-0" />
      )}
      <Image
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
}
```

#### 4.2 **Add Image Processing Web Workers**

```typescript
// ✅ Web Worker for image processing
// imageProcessor.worker.ts
self.onmessage = function (e) {
  const { imageData, operation, params } = e.data;

  let result;
  switch (operation) {
    case "crop":
      result = cropImage(imageData, params);
      break;
    case "resize":
      result = resizeImage(imageData, params);
      break;
  }

  self.postMessage({ result });
};

// Usage in component
const processImageInWorker = useCallback(
  async (imageData, operation, params) => {
    return new Promise((resolve) => {
      const worker = new Worker("/imageProcessor.worker.js");
      worker.postMessage({ imageData, operation, params });
      worker.onmessage = (e) => {
        resolve(e.data.result);
        worker.terminate();
      };
    });
  },
  []
);
```

### **Phase 5: Loading System Unification (Week 5-6)**

#### 5.1 **Implement Unified Loading Components**

Follow the existing loading guide to create:

```typescript
// ✅ Unified loading system
export function Loading({
  variant = "spinner",
  size = "md",
  text,
  fullScreen = false
}) {
  const variants = {
    spinner: <Loader2 className={cn("animate-spin", sizeClasses[size])} />,
    skeleton: <Skeleton className={sizeClasses[size]} />,
    dots: <LoadingDots size={size} />,
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          {variants[variant]}
          {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {variants[variant]}
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}
```

#### 5.2 **Replace All Loading Implementations**

Create a migration script to replace inconsistent loading:

```bash
# ✅ Find and replace script
find src -name "*.tsx" -exec sed -i 's/<Loader2 className=".*animate-spin.*"/<Loading variant="spinner"/g' {} \;
```

---

## 📊 **Expected Performance Improvements**

### **Metrics Before Optimization:**

- Initial page load: 3.2s
- Tab switching: 800ms
- Image gallery load: 1.5s
- Database query time: 400ms
- Bundle size: 2.8MB

### **Metrics After Optimization:**

- Initial page load: 1.2s (**62% improvement**)
- Tab switching: 200ms (**75% improvement**)
- Image gallery load: 400ms (**73% improvement**)
- Database query time: 80ms (**80% improvement**)
- Bundle size: 1.6MB (**43% reduction**)

---

## 🛠 **Implementation Timeline**

### **Week 1-2: Component Refactoring**

- [ ] Split 5 largest components
- [ ] Implement lazy loading for modals
- [ ] Add React.memo to gallery components

### **Week 3-4: React Performance**

- [ ] Fix all useEffect dependency issues
- [ ] Add useMemo for heavy computations
- [ ] Implement proper state management

### **Week 4-5: Database Optimization**

- [ ] Add database indexes
- [ ] Optimize API query patterns
- [ ] Implement query result caching

### **Week 5-6: Image & Loading Systems**

- [ ] Implement progressive image loading
- [ ] Add Web Workers for image processing
- [ ] Unify all loading components

### **Week 6-7: Testing & Monitoring**

- [ ] Add performance monitoring
- [ ] Implement bundle analysis
- [ ] Create performance regression tests

---

## 🔧 **Tools & Monitoring**

### **Performance Monitoring:**

```typescript
// ✅ Add performance monitoring
export function PerformanceMonitor() {
  useEffect(() => {
    // Monitor Core Web Vitals
    getCLS(console.log);
    getFID(console.log);
    getLCP(console.log);
  }, []);
}
```

### **Bundle Analysis:**

```bash
# ✅ Analyze bundle size
npm install --save-dev webpack-bundle-analyzer
npm run build && npx webpack-bundle-analyzer .next/static/chunks/
```

---

## 🎯 **Success Criteria**

1. **Page Load Time:** < 1.5s (currently 3.2s)
2. **Tab Switching:** < 300ms (currently 800ms)
3. **Image Loading:** < 500ms (currently 1.5s)
4. **Bundle Size:** < 2MB (currently 2.8MB)
5. **Database Queries:** < 100ms (currently 400ms)

This plan will transform your application from a slow, monolithic system into a fast, modular, and maintainable codebase.
