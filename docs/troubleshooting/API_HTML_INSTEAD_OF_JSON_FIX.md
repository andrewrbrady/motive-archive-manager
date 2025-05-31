# Fix Instructions: "API returned HTML instead of JSON" Error

## 🚨 Problem Description

**Error Message:** `🚨 API returned HTML instead of JSON`

**Symptoms:**

- API calls return HTML pages instead of JSON responses
- Browser Network tab shows `content-type: text/html` instead of `application/json`
- URLs hitting page routes instead of API routes
- Example: `http://localhost:3000/cars/123/events` instead of `http://localhost:3000/api/cars/123/events`

## 🔍 Root Cause

The API client's URL construction logic incorrectly handles endpoints that start with `/`. When an endpoint starts with `/`, it uses the endpoint as-is instead of prepending `/api/`.

**Problematic logic in `src/lib/api-client.ts`:**

```typescript
// WRONG - This causes the issue
const url = endpoint.startsWith("/")
  ? endpoint // "/cars/123" stays "/cars/123" (hits page route)
  : `${this.baseURL}/${endpoint}`; // "cars/123" becomes "/api/cars/123" (correct)
```

**Result:**

- `api.get("/cars/123/events")` → hits `/cars/123/events` (page route) → returns HTML
- `api.get("cars/123/events")` → hits `/api/cars/123/events` (API route) → returns JSON

## ⚡ Quick Fix

### Step 1: Fix API Client URL Construction

**File:** `src/lib/api-client.ts`

**Find the `request` method and replace this code:**

```typescript
// Ensure endpoint starts with /api or is absolute
const url = endpoint.startsWith("/") ? endpoint : `${this.baseURL}/${endpoint}`;
```

**With this code:**

```typescript
// Construct the full URL ensuring /api prefix
let url: string;

if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
  // Absolute URL - use as-is
  url = endpoint;
} else if (endpoint.startsWith("/api/")) {
  // Already has /api prefix - use as-is
  url = endpoint;
} else if (endpoint.startsWith("/")) {
  // Starts with / but not /api/ - prepend /api
  url = `/api${endpoint}`;
} else {
  // Relative endpoint - prepend baseURL
  url = `${this.baseURL}/${endpoint}`;
}
```

### Step 2: Standardize API Calls (Recommended)

For consistency, update API calls to use relative URLs without leading slashes:

**Before (can cause issues):**

```typescript
api.get("/cars/123/events"); // Leading slash format
api.get("/projects/users"); // Leading slash format
```

**After (recommended):**

```typescript
api.get("cars/123/events"); // Relative format
api.get("projects/users"); // Relative format
```

**Common files to check:**

- `src/components/cars/EventsTab.tsx`
- `src/components/events/ListView.tsx`
- `src/components/cars/FullCalendarTab.tsx`
- `src/components/cars/CarCopywriter.tsx`

## 🧪 Verification Steps

After applying the fix:

1. **Check Browser Network Tab:**

   - API requests should hit `/api/...` URLs
   - Response `content-type` should be `application/json`
   - Status should be `200` (or appropriate status code)

2. **Verify API Calls Work:**

   ```typescript
   // All these should now work correctly:
   api.get("/cars/123/events"); // Transforms to /api/cars/123/events
   api.get("cars/123/events"); // Transforms to /api/cars/123/events
   api.get("/api/cars/123/events"); // Stays as /api/cars/123/events
   ```

3. **No More Error Messages:**
   - Console should not show "API returned HTML instead of JSON"
   - Components should load data successfully

## 🔧 Example Fix Implementation

**File: `src/components/cars/EventsTab.tsx`**

```diff
- const data = (await api.get(`/cars/${carId}/events`)) as Event[];
+ const data = (await api.get(`cars/${carId}/events`)) as Event[];
```

**File: `src/components/events/ListView.tsx`**

```diff
- const data = await api.get("/projects/users");
+ const data = await api.get("projects/users");
```

## 🚨 Why This Happens

1. **Next.js Routing:** Next.js serves both pages and API routes

   - `/cars/[id]/events` → Page route (returns HTML)
   - `/api/cars/[id]/events` → API route (returns JSON)

2. **Middleware Interference:** Sometimes middleware can intercept API routes
   - Ensure middleware excludes `/api/` routes:
   ```typescript
   export const config = {
     matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
   };
   ```

## ✅ Prevention

To prevent this issue in the future:

1. **Use consistent URL patterns** in API calls
2. **Prefer relative URLs** without leading slashes: `"cars/123/events"`
3. **Test API endpoints** with curl to verify they return JSON:
   ```bash
   curl http://localhost:3000/api/cars/123/events
   ```

## 🔍 Debugging Tips

If the issue persists:

1. **Add logging** to the API client to see what URLs are being constructed
2. **Check middleware configuration** to ensure it's not intercepting API routes
3. **Verify API route files exist** in the correct location: `src/app/api/...`
4. **Clear browser cache** and try incognito mode
5. **Restart the development server** to clear any cached middleware

---

**This fix resolves the core issue where API client URLs were hitting page routes instead of API routes, causing HTML responses instead of JSON.**
