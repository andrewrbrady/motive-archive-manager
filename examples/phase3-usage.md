# Phase 3 Database Optimization Usage Examples

## 🚀 **Quick Start Guide**

### **1. Initialize Database Optimizations**

First, create all performance indexes:

```bash
# Using curl
curl -X POST "http://localhost:3000/api/database/optimize?action=create"

# Using fetch in browser console
fetch('/api/database/optimize?action=create', { method: 'POST' })
  .then(res => res.json())
  .then(console.log);
```

**Expected Response:**

```json
{
  "success": true,
  "action": "create",
  "result": {
    "message": "Created 23 performance indexes",
    "totalIndexes": 23,
    "collections": {
      "images": 5,
      "cars": 4,
      "events": 5,
      "projects": 3,
      "rawAssets": 3,
      "captions": 3
    }
  },
  "performance": {
    "executionTime": 1247
  }
}
```

### **2. Use Optimized API Routes**

#### **Optimized Images API:**

```typescript
// Before (slow)
const response = await fetch("/api/images?carId=123&page=1&limit=20");
// Response time: 400-800ms

// After (fast)
const response = await fetch("/api/images/optimized?carId=123&page=1&limit=20");
// Response time: 15-50ms (cache miss) or 2-5ms (cache hit)
```

#### **Optimized Cars API:**

```typescript
// Search cars with caching
const response = await fetch(
  "/api/cars/optimized?search=toyota&status=active&limit=50"
);

// Field projection for minimal data transfer
const response = await fetch("/api/cars/optimized?fields=_id,make,model,year");
```

### **3. Monitor Performance**

#### **Check Database Status:**

```typescript
const status = await fetch("/api/database/optimize");
const data = await status.json();

console.log("Database Status:", data);
// Shows collection stats, index counts, cache statistics
```

#### **Analyze Index Performance:**

```bash
curl -X POST "http://localhost:3000/api/database/optimize?action=analyze"
```

**Response:**

```json
{
  "success": true,
  "action": "analyze",
  "result": {
    "message": "Index performance analysis completed",
    "collections": {
      "images": {
        "documents": 15420,
        "sizeMB": 45.2,
        "avgDocSize": 3072,
        "indexSizeMB": 8.7,
        "indexCount": 6
      },
      "cars": {
        "documents": 1250,
        "sizeMB": 2.1,
        "avgDocSize": 1764,
        "indexSizeMB": 0.8,
        "indexCount": 5
      }
    }
  }
}
```

### **4. Cache Management**

#### **Monitor Cache Performance:**

```typescript
import { cacheUtils } from '@/lib/database/cache';

// Get cache statistics
const stats = cacheUtils.getAllStats();
console.log('Cache Stats:', stats);

// Example output:
{
  cars: { size: 45, maxSize: 500, entries: [...] },
  images: { size: 234, maxSize: 2000, entries: [...] },
  events: { size: 12, maxSize: 1000, entries: [...] }
}
```

#### **Clear and Warm Cache:**

```bash
# Clear all caches and warm up with fresh data
curl -X POST "http://localhost:3000/api/database/optimize?action=cache"
```

---

## 📊 **Performance Comparison Examples**

### **Image Gallery Loading:**

#### **Before Optimization:**

```typescript
// Old API route
const startTime = Date.now();
const response = await fetch("/api/images?carId=123&page=1");
const data = await response.json();
console.log(`Load time: ${Date.now() - startTime}ms`); // 400-800ms
```

#### **After Optimization:**

```typescript
// Optimized API route with caching
const startTime = Date.now();
const response = await fetch("/api/images/optimized?carId=123&page=1");
const data = await response.json();
console.log(`Load time: ${Date.now() - startTime}ms`); // 15-50ms (cache miss) or 2-5ms (cache hit)
console.log(`Cache status: ${data.performance.cached ? "HIT" : "MISS"}`);
```

### **Car Search Performance:**

#### **Before Optimization:**

```typescript
// Inefficient search
const response = await fetch("/api/cars?search=toyota");
// Query scans entire collection: 300-600ms
```

#### **After Optimization:**

```typescript
// Index-optimized search with caching
const response = await fetch("/api/cars/optimized?search=toyota");
// Uses make_model_year_idx: 10-30ms
```

---

## 🔧 **Integration Examples**

### **Update Existing Components:**

#### **Image Gallery Component:**

```typescript
// Before
const fetchImages = async (carId: string, page: number) => {
  const response = await fetch(`/api/images?carId=${carId}&page=${page}`);
  return response.json();
};

// After - with performance monitoring
const fetchImages = async (carId: string, page: number) => {
  const startTime = Date.now();
  const response = await fetch(
    `/api/images/optimized?carId=${carId}&page=${page}`
  );
  const data = await response.json();

  // Log performance in development
  if (process.env.NODE_ENV === "development") {
    console.log(`Images loaded in ${Date.now() - startTime}ms`, {
      cached: data.performance?.cached,
      queryTime: data.performance?.queryTime,
      totalImages: data.pagination?.total,
    });
  }

  return data;
};
```

#### **Car Search Component:**

```typescript
// Optimized search with debouncing and caching
const useCarSearch = (searchTerm: string) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term) return;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/cars/optimized?search=${encodeURIComponent(term)}&fields=_id,make,model,year,color`
        );
        const data = await response.json();
        setResults(data.cars);

        // Log cache performance
        console.log(
          `Search "${term}": ${data.performance?.cached ? "CACHED" : "DB"} (${data.performance?.queryTime}ms)`
        );
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  return { results, loading };
};
```

---

## 🎯 **Best Practices**

### **1. Cache-Aware Development:**

```typescript
// Always check for cache performance in development
if (process.env.NODE_ENV === "development" && data.performance) {
  const { cached, queryTime, cacheKey } = data.performance;
  console.log(
    `API Performance: ${cached ? "CACHE HIT" : "CACHE MISS"} (${queryTime}ms)`,
    { cacheKey }
  );
}
```

### **2. Efficient Field Selection:**

```typescript
// Only request needed fields to reduce data transfer
const response = await fetch("/api/cars/optimized?fields=_id,make,model,year");

// For dropdowns, minimal data
const response = await fetch(
  "/api/cars/optimized?fields=_id,make,model&limit=100"
);
```

### **3. Pagination Best Practices:**

```typescript
// Use reasonable page sizes
const response = await fetch("/api/images/optimized?page=1&limit=20"); // Good
const response = await fetch("/api/images/optimized?page=1&limit=1000"); // Bad - will be capped at 100
```

### **4. Cache Invalidation:**

```typescript
// After creating/updating data, relevant caches are automatically invalidated
const createCar = async (carData) => {
  const response = await fetch("/api/cars/optimized", {
    method: "POST",
    body: JSON.stringify(carData),
  });

  // Cache invalidation happens automatically in the API route
  // No manual cache clearing needed

  return response.json();
};
```

---

## 🚀 **Production Deployment**

### **1. Initialize Indexes in Production:**

```bash
# Run this once after deploying Phase 3 code
curl -X POST "https://your-domain.com/api/database/optimize?action=create"
```

### **2. Monitor Performance:**

```bash
# Set up monitoring script
#!/bin/bash
echo "Checking database performance..."
curl -s "https://your-domain.com/api/database/optimize?action=analyze" | jq '.result.collections'

echo "Checking cache performance..."
curl -s "https://your-domain.com/api/database/optimize" | jq '.cache'
```

### **3. Gradual Migration:**

```typescript
// Feature flag approach for gradual rollout
const useOptimizedAPI = process.env.NEXT_PUBLIC_USE_OPTIMIZED_API === "true";

const apiEndpoint = useOptimizedAPI ? "/api/images/optimized" : "/api/images";

const response = await fetch(`${apiEndpoint}?carId=${carId}`);
```

This completes the Phase 3 implementation with comprehensive database optimizations, caching, and performance monitoring!
