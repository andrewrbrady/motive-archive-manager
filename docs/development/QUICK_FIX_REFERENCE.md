# Quick Fix Reference Card

## 🚨 **Emergency React Error Fixes**

### **Error:** "Can't perform a React state update on a component that hasn't mounted yet"

**Immediate Fix:**

```tsx
// Add this pattern to any component with async operations
const mounted = useRef(true);

useEffect(() => {
  return () => {
    mounted.current = false;
  };
}, []);

// In your async operations:
if (mounted.current) {
  setState(newValue);
}
```

---

### **Error:** "CloudflareImage load error: {}"

**Immediate Fix:**

```tsx
// Add these props to CloudflareImage components
<CloudflareImage
  src={imageUrl}
  alt={description}
  fallback="/images/placeholder.jpg" // ← Add this
  showError={false} // ← Add this
  onError={() => {}} // ← Add this
/>
```

---

### **Error:** useDebounce causing state updates

**Immediate Fix:**

```tsx
// Replace direct debounce with guarded version
const [debouncedSearch] = useDebounce((value: string) => {
  if (!mounted.current) return; // ← Add this guard
  updateSearch(value);
}, 500);
```

---

### **Error:** Console error loops / ReactQueryErrorHandler issues

**Immediate Fix:**

```tsx
// In ReactQueryErrorHandler.tsx, update the filter:
if (
  errorMessage.includes("Image failed to load") ||
  errorMessage.includes("CloudflareImage") || // ← Add this
  errorMessage.includes("createConsoleError") || // ← Add this
  errorMessage.includes("React error boundary") // ← Add this
) {
  originalConsoleError(...args);
  return; // Don't process these errors
}
```

---

## 🛡️ **Prevention Patterns**

### **useEffect Template:**

```tsx
useEffect(() => {
  let mounted = true;
  const controller = new AbortController();

  const doWork = async () => {
    try {
      const result = await fetch("/api/data", {
        signal: controller.signal,
      });
      if (mounted) setState(await result.json());
    } catch (error) {
      if (error.name !== "AbortError" && mounted) {
        setError(error);
      }
    }
  };

  doWork();

  return () => {
    mounted = false;
    controller.abort();
  };
}, []);
```

### **Safe Image Component:**

```tsx
const SafeImage = ({ src, alt, ...props }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <ImagePlaceholder />;
  }

  return (
    <CloudflareImage
      src={src}
      alt={alt}
      fallback="/images/placeholder.jpg"
      showError={false}
      onError={() => setError(true)}
      {...props}
    />
  );
};
```

---

## 🚀 **Quick Commands**

### Clear Next.js issues:

```bash
rm -rf .next && npm run dev
```

### Find problematic components:

```bash
grep -r "useEffect\|useState" src/ --include="*.tsx"
```

### Check for memory leaks:

```bash
grep -r "addEventListener\|setInterval\|setTimeout" src/ --include="*.tsx"
```

---

**Keep this reference handy during development!**
