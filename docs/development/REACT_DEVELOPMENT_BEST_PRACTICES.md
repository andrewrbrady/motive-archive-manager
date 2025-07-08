# React Development Best Practices Guide

## 🚨 **Critical Issues This Guide Addresses**

This guide addresses the most common React development issues that occur repeatedly in our Next.js/React/TypeScript application:

1. **React state update on unmounted component errors**
2. **CloudflareImage load errors during development**
3. **useEffect and cleanup issues**
4. **Error boundary and console.error interference**
5. **Debounce/throttle timing issues**
6. **Image loading and lazy loading problems**

---

## ⚡ **Quick Reference - Common Error Fixes**

### Error 1: "Can't perform a React state update on a component that hasn't mounted yet"

**Root Cause:** State updates happening in async operations after component unmounts.

**Quick Fix:**

```tsx
// ❌ BAD: No cleanup, can cause memory leaks
useEffect(() => {
  fetchData().then(setData);
}, []);

// ✅ GOOD: Proper cleanup with abort signal
useEffect(() => {
  const abortController = new AbortController();

  const fetchData = async () => {
    try {
      const response = await fetch("/api/data", {
        signal: abortController.signal,
      });
      const data = await response.json();
      setData(data);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Fetch failed:", error);
      }
    }
  };

  fetchData();

  return () => {
    abortController.abort();
  };
}, []);
```

### Error 2: "CloudflareImage load error: {}"

**Root Cause:** Image URLs becoming invalid or network issues during development.

**Quick Fix:**

```tsx
// ✅ GOOD: Always provide fallback and proper error handling
<CloudflareImage
  src={gallery.thumbnailImage?.url}
  alt={gallery.name}
  fallback="/images/placeholder.jpg"
  showError={false} // Disable error UI during development
  onError={(e) => {
    // Silent handling during development
    if (process.env.NODE_ENV === "development") {
      console.warn("Image failed to load (dev mode):", src);
    }
  }}
/>
```

---

## 📋 **Development Rules & Guidelines**

### 1. **useEffect Cleanup Rules**

**Always clean up side effects:**

```tsx
// ✅ Template for proper useEffect cleanup
useEffect(() => {
  let mounted = true;
  const controller = new AbortController();

  const doAsyncWork = async () => {
    try {
      const result = await someAsyncOperation({
        signal: controller.signal,
      });

      if (mounted) {
        setState(result);
      }
    } catch (error) {
      if (error.name !== "AbortError" && mounted) {
        setError(error);
      }
    }
  };

  doAsyncWork();

  return () => {
    mounted = false;
    controller.abort();
  };
}, [dependency]);
```

### 2. **Debounced Operations Rules**

**Proper debounce implementation:**

```tsx
// ✅ GOOD: Safe debounced operation with cleanup
const GalleriesClient = () => {
  const [searchInput, setSearchInput] = useState("");
  const mounted = useRef(true);

  // Use mounted ref instead of state
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [debouncedSearch] = useDebounce((value: string) => {
    if (!mounted.current) return; // Guard against unmounted updates

    // Safe to update URL/state here
    updateSearchParams(value);
  }, 500);

  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  return (
    <Input
      value={searchInput}
      onChange={handleSearchInput}
      placeholder="Search galleries..."
    />
  );
};
```

### 3. **Image Loading Best Practices**

**Defensive image component usage:**

```tsx
// ✅ GOOD: Defensive image loading with proper fallbacks
const GalleryThumbnail = ({ gallery }: { gallery: Gallery }) => {
  const [imageError, setImageError] = useState(false);

  // Null safety checks
  if (!gallery?.thumbnailImage?.url) {
    return <DefaultGalleryPlaceholder name={gallery?.name} />;
  }

  if (imageError) {
    return <DefaultGalleryPlaceholder name={gallery.name} />;
  }

  return (
    <CloudflareImage
      src={gallery.thumbnailImage.url}
      alt={gallery.name || "Gallery"}
      variant="thumbnail"
      fallback="/images/gallery-placeholder.jpg"
      showError={false}
      onError={() => setImageError(true)}
      className="w-full h-48 object-cover rounded-lg"
    />
  );
};
```

### 4. **Error Boundary Integration**

**Proper error boundary usage:**

```tsx
// ✅ GOOD: Isolated error boundaries for risky components
const GalleriesPage = () => {
  return (
    <div>
      <PageTitle title="Galleries" />

      {/* Wrap potentially failing components */}
      <ErrorBoundary fallback={<GalleriesErrorFallback />}>
        <Suspense fallback={<GalleriesLoading />}>
          <GalleriesClient />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

// Don't let image errors crash the entire page
const GalleryGrid = ({ galleries }: { galleries: Gallery[] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {galleries.map((gallery) => (
        <ErrorBoundary key={gallery._id} fallback={<GalleryCardError />}>
          <GalleryCard gallery={gallery} />
        </ErrorBoundary>
      ))}
    </div>
  );
};
```

---

## 🛠️ **Development Environment Setup**

### 1. **Environment Variables for Development**

Create `.env.local` with development-friendly settings:

```bash
# Development settings to reduce errors
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_SUPPRESS_HYDRATION_WARNING=true

# Cloudflare Images - use development account
CLOUDFLARE_ACCOUNT_ID=your_dev_account
CLOUDFLARE_API_TOKEN=your_dev_token

# MongoDB - use local or dev database
MONGODB_URI=mongodb://localhost:27017/motive_archive_dev
```

### 2. **Next.js Configuration for Development**

```javascript
// next.config.js - Development optimizations
const nextConfig = {
  // Reduce hydration mismatches
  experimental: {
    suppressHydrationWarnings: true,
  },

  // Better error handling
  onError: (err, req, res) => {
    if (process.env.NODE_ENV === "development") {
      console.error("Next.js Error:", err);
    }
  },

  // Image domains for development
  images: {
    domains: [
      "imagedelivery.net", // Cloudflare
      "localhost",
      "127.0.0.1",
    ],
    dangerouslyAllowSVG: true,
    unoptimized: process.env.NODE_ENV === "development",
  },
};
```

### 3. **TypeScript Configuration**

```json
// tsconfig.json - Development-friendly settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true, // Prevent undefined errors
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]
}
```

---

## 🐛 **Common Development Issues & Solutions**

### Issue 1: Console.error Interception Conflicts

**Problem:** Error handlers interfering with each other.

**Solution:**

```tsx
// ✅ GOOD: Specific error handling without interference
useEffect(() => {
  const originalError = console.error;

  console.error = (...args) => {
    const message = args.join(" ");

    // Only intercept specific patterns we care about
    if (message.includes("React Query") && message.includes("401")) {
      handleAuthError(args[0]);
    }

    // Don't intercept image loading or component errors
    if (
      !message.includes("CloudflareImage") &&
      !message.includes("Avatar") &&
      !message.includes("createConsoleError")
    ) {
      originalError(...args);
    }
  };

  return () => {
    console.error = originalError;
  };
}, []);
```

### Issue 2: Hydration Mismatches

**Problem:** Server and client rendering differently.

**Solution:**

```tsx
// ✅ GOOD: Client-only rendering for problematic components
const ClientOnlyComponent = dynamic(() => import("./SomeComponent"), {
  ssr: false,
  loading: () => <ComponentSkeleton />,
});

// Or use the suppressHydrationWarning flag sparingly
<div suppressHydrationWarning>
  {typeof window !== "undefined" && <ClientSpecificContent />}
</div>;
```

### Issue 3: Memory Leaks from Event Listeners

**Problem:** Event listeners not cleaned up.

**Solution:**

```tsx
// ✅ GOOD: Proper event listener cleanup
useEffect(() => {
  const handleResize = () => {
    if (mounted.current) {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  };

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

---

## 🎯 **Component-Specific Guidelines**

### CloudflareImage Component Usage

```tsx
// ✅ GOOD: Production-ready CloudflareImage usage
<CloudflareImage
  src={imageUrl}
  alt={description || "Image"}
  variant="thumbnail"
  fallback="/images/placeholder.jpg"
  showError={process.env.NODE_ENV !== "development"}
  onError={(e) => {
    // Log in development, silent in production
    if (process.env.NODE_ENV === "development") {
      console.warn("Image load failed:", imageUrl);
    }
  }}
  className="w-full h-auto"
  loading="lazy"
  placeholder="blur"
/>
```

### React Query Error Handling

```tsx
// ✅ GOOD: Proper React Query error handling
const { data, error, isLoading } = useQuery({
  queryKey: ["galleries", { page, search }],
  queryFn: ({ signal }) => fetchGalleries({ page, search, signal }),
  retry: (failureCount, error) => {
    // Don't retry auth errors
    if (error.status === 401) return false;
    return failureCount < 3;
  },
  onError: (error) => {
    // Handle errors appropriately
    if (error.status === 401) {
      // Let error boundary handle this
      throw error;
    } else {
      // Show user-friendly error
      toast({
        title: "Error loading galleries",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  },
});
```

---

## 📝 **Development Checklist**

Before pushing code, verify:

### State Management ✅

- [ ] All useEffect hooks have proper cleanup
- [ ] No state updates after component unmount
- [ ] Debounced operations use mounted guards
- [ ] Async operations use AbortController

### Error Handling ✅

- [ ] Components wrapped in error boundaries
- [ ] Image components have fallbacks
- [ ] API calls have proper error handling
- [ ] Console.error interception is specific

### Performance ✅

- [ ] Images use proper loading strategies
- [ ] Heavy components are lazy-loaded
- [ ] Event listeners are cleaned up
- [ ] Memory leaks are prevented

### TypeScript ✅

- [ ] No any types used
- [ ] Proper null safety checks
- [ ] Optional chaining used appropriately
- [ ] Return types are explicit

---

## 🚀 **Development Workflow**

### 1. **Start Development Server Safely**

```bash
# Clear Next.js cache if having issues
rm -rf .next

# Start with clean slate
npm run dev

# Or with error debugging
DEBUG=* npm run dev 2>&1 | tee dev.log
```

### 2. **Testing New Components**

```bash
# Test components in isolation first
npm run storybook  # If using Storybook

# Or create a test page
touch src/app/test-component/page.tsx
```

### 3. **Debugging React Issues**

```tsx
// Add to problematic components for debugging
useEffect(() => {
  console.log("Component mounted:", componentName);
  return () => {
    console.log("Component unmounting:", componentName);
  };
}, []);

// Use React DevTools Profiler
// Install React Developer Tools browser extension
```

---

## 📚 **Additional Resources**

### Official Documentation

- [React useEffect Guide](https://react.dev/reference/react/useEffect)
- [Next.js Error Handling](https://nextjs.org/docs/advanced-features/error-handling)
- [React Query Error Boundaries](https://tanstack.com/query/latest/docs/react/guides/error-boundaries)

### Our Codebase Examples

- Good examples: `src/components/ui/CloudflareImage.tsx`
- Error boundaries: `src/components/error-boundaries/`
- Hooks patterns: `src/lib/hooks/query/`

---

## 🆘 **Emergency Fixes**

If you encounter the errors mentioned at the top:

### Quick Fix 1: State Update Error

```bash
# Find the problematic component
grep -r "useState\|useEffect" src/app/galleries/
# Add mounted guards to useEffect cleanup
```

### Quick Fix 2: Image Loading Error

```bash
# Disable image error UI temporarily
export NEXT_PUBLIC_SUPPRESS_IMAGE_ERRORS=true
```

### Quick Fix 3: Console Error Loop

```bash
# Disable error interception temporarily
export NEXT_PUBLIC_DISABLE_ERROR_INTERCEPTION=true
```

Remember: These are temporary fixes. Always implement proper solutions following this guide.

---

**Last Updated:** December 2024  
**Maintainer:** Development Team  
**Review:** Required for all new developers
