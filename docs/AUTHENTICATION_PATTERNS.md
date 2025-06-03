# Authentication Patterns Guide

_Preventing the "Missing Authorization Token" Error_

## 🚨 **The Problem**

Components keep getting this error:

```
Error: Authentication required
Details: Missing or invalid authorization token. Please sign in and try again.
Code: MISSING_AUTH_HEADER
```

## 🎯 **Root Cause**

The codebase has **two conflicting authentication patterns**:

### ❌ **WRONG PATTERN**: Raw `fetch()` calls

```typescript
// THIS IS WRONG - No authentication headers!
const response = await fetch("/api/deliverables");
```

### ✅ **CORRECT PATTERN**: Authenticated `useAPI()` hook

```typescript
// THIS IS RIGHT - Automatic authentication!
const api = useAPI();
const data = await api.get("/api/deliverables");
```

## 📋 **The Nuclear Auth Rules**

### Rule 1: **NEVER use raw `fetch()` for `/api/*` endpoints**

```typescript
// ❌ FORBIDDEN
const response = await fetch("/api/users");
const response = await fetch(`${baseURL}/api/cars`);

// ✅ REQUIRED
const api = useAPI();
const data = await api.get("/api/users");
```

### Rule 2: **ALWAYS use the `useAPI()` hook**

```typescript
import { useAPI } from "@/hooks/useAPI";

function MyComponent() {
  const api = useAPI();

  // Early return if API not ready
  if (!api) {
    return <LoadingSpinner />;
  }

  // Use authenticated API client
  const fetchData = async () => {
    const data = await api.get('/api/endpoint');
  };
}
```

### Rule 3: **Handle API client initialization**

```typescript
function MyComponent() {
  const api = useAPI();

  useEffect(() => {
    if (!api) return; // Wait for API to be ready

    fetchData();
  }, [api]); // Include api in dependencies

  // Show loading while API initializes
  if (!api) return <LoadingSpinner />;
}
```

## 🔧 **Migration Checklist**

When refactoring a component:

- [ ] ✅ Replace `fetch()` calls with `useAPI()` hook
- [ ] ✅ Add `const api = useAPI();` at the top of component
- [ ] ✅ Add API null checks before making calls
- [ ] ✅ Include `api` in useEffect dependencies
- [ ] ✅ Show loading state when `!api`
- [ ] ✅ Remove manual Authorization headers
- [ ] ✅ Test authentication flow works

## 🎯 **Common Patterns**

### Pattern A: Simple API Call

```typescript
function SimpleComponent() {
  const api = useAPI();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!api) return;

    const fetchData = async () => {
      try {
        const result = await api.get('/api/endpoint');
        setData(result);
      } catch (error) {
        console.error('API error:', error);
      }
    };

    fetchData();
  }, [api]);

  if (!api) return <LoadingSpinner />;

  return <div>{/* Render data */}</div>;
}
```

### Pattern B: With React Query

```typescript
import { useAPIQuery } from "@/hooks/useAPIQuery";

function QueryComponent() {
  const { data, isLoading, error } = useAPIQuery('/api/endpoint');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{/* Render data */}</div>;
}
```

### Pattern C: Form Submission

```typescript
function FormComponent() {
  const api = useAPI();

  const handleSubmit = async (formData) => {
    if (!api) {
      toast.error('Authentication required');
      return;
    }

    try {
      await api.post('/api/endpoint', formData);
      toast.success('Success!');
    } catch (error) {
      toast.error('Failed to submit');
    }
  };

  if (!api) return <LoadingSpinner />;

  return <form onSubmit={handleSubmit}>{/* Form */}</form>;
}
```

## 🚫 **What NOT to Do**

### ❌ Manual Authorization Headers

```typescript
// FORBIDDEN - Manual auth headers
const response = await fetch("/api/users", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### ❌ Raw Fetch in useEffect

```typescript
// FORBIDDEN - Raw fetch without auth
useEffect(() => {
  fetch("/api/users").then(/* ... */);
}, []);
```

### ❌ Missing API Dependency

```typescript
// WRONG - Missing api in dependencies
useEffect(() => {
  if (api) {
    api.get("/api/users");
  }
}, []); // Missing [api]
```

## 🔍 **Detection & Prevention**

### ESLint Rules

Our `.eslintrc.json` has rules to catch these issues:

```json
{
  "no-restricted-syntax": [
    "error",
    {
      "selector": "CallExpression[callee.name='fetch']",
      "message": "Direct fetch() calls should use authenticated API client"
    }
  ]
}
```

### Pre-commit Hooks

The git hooks scan for authentication violations:

```bash
🔍 Nuclear Auth Check: Scanning for authentication violations...
❌ Found manual Authorization header in src/components/MyComponent.tsx
```

## 🏥 **Emergency Fix Procedure**

When you see the "Missing Authorization Token" error:

1. **Identify the component** making the API call
2. **Find the raw `fetch()` call**
3. **Add `useAPI()` hook**:
   ```typescript
   const api = useAPI();
   ```
4. **Replace fetch with api call**:

   ```typescript
   // Before
   const response = await fetch("/api/endpoint");

   // After
   const data = await api.get("/api/endpoint");
   ```

5. **Add null checks**:
   ```typescript
   if (!api) return <LoadingSpinner />;
   ```
6. **Test authentication flow**

## 📚 **Related Documentation**

- [useAPI Hook Documentation](../src/hooks/useAPI.ts)
- [API Client Documentation](../src/lib/api-client.ts)
- [React Query Integration](../src/hooks/useAPIQuery.ts)
- [Authentication Troubleshooting](./AUTH_TROUBLESHOOTING.md)

## ✅ **Success Criteria**

A component is properly authenticated when:

- ✅ No raw `fetch()` calls to `/api/*` endpoints
- ✅ Uses `useAPI()` hook consistently
- ✅ Has proper loading states when API not ready
- ✅ No manual Authorization headers
- ✅ Passes ESLint authentication rules
- ✅ No "Missing Authorization Token" errors in console
