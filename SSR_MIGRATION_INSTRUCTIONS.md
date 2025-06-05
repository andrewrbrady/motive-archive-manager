# Server-Side Rendering Migration Instructions

## 🎯 Your Assignment
**You are assigned to migrate: `[SPECIFIC_PAGE_ASSIGNMENT]`**

> **Important**: Only work on your assigned page(s). Check with the team lead before starting work to ensure no conflicts.

## 📋 Before You Start

### Prerequisites
1. Read the `PERFORMANCE_ANALYSIS_REPORT.md` for context
2. Ensure you have the development environment running
3. Familiarize yourself with the existing `/inventory` page implementation as a reference
4. Create a new branch: `git checkout -b ssr-migration-[page-name]`

### Reference Implementation
Study `src/app/inventory/page.tsx` - this is the gold standard example of proper SSR implementation.

## 🔄 Migration Process (Step-by-Step)

### Step 1: Analyze Current Implementation
1. **Locate the current page file** for your assignment
2. **Identify all client-side data fetching patterns**:
   - `useEffect` hooks with `fetch` calls
   - React Query (`useQuery`) usage
   - SWR hooks (`useSWR`)
   - `useState` for data storage
3. **Document all API endpoints** being called
4. **Note any complex filtering/search logic**

### Step 2: Create Server-Side Data Fetching Function
```typescript
// Create: src/lib/server/fetch[YourPageData].ts
export async function fetch[YourPageData](params: {
  // Define your parameter types
  search?: string;
  page?: number;
  limit?: number;
  // ... other filters
}) {
  try {
    // Use direct database calls or internal API calls
    // DO NOT use external fetch() calls in server components
    
    // Example pattern:
    const db = await getDatabase();
    const query = buildQuery(params);
    const data = await db.collection('[collection]').find(query).toArray();
    
    return {
      items: data,
      pagination: {
        total: data.length,
        page: params.page || 1,
        limit: params.limit || 20
      }
    };
  } catch (error) {
    console.error('Error fetching [YourPageData]:', error);
    throw new Error('Failed to fetch data');
  }
}
```

### Step 3: Convert Page to Server Component
```typescript
// Transform your page file
import React from "react";
import { Metadata } from "next";
import { fetch[YourPageData] } from "@/lib/server/fetch[YourPageData]";
import [YourPageData]Client from "./[YourPageData]Client";

// Mark as dynamic for proper SSR
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "[Your Page Title] | Motive Archive Manager",
  description: "[Page description]",
};

export default async function [YourPageData]Page({ searchParams }: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  try {
    // Parse search parameters
    const page = Number(searchParams.page) || 1;
    const limit = Number(searchParams.limit) || 20;
    const search = searchParams.search?.toString() || "";
    
    // Add other filters as needed...
    
    // Fetch data server-side (use Promise.all for multiple data sources)
    const [data, otherData] = await Promise.all([
      fetch[YourPageData]({ page, limit, search /* other params */ }),
      // fetchOtherData() if needed
    ]);

    // Pass data to client component
    return (
      <[YourPageData]Client
        initialData={data.items}
        pagination={data.pagination}
        // Pass other props as needed
      />
    );
  } catch (error) {
    console.error("Error in [YourPageData]Page:", error);
    // Return error UI instead of throwing
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold text-red-600">Error Loading Data</h1>
        <p>Please try again later.</p>
      </div>
    );
  }
}
```

### Step 4: Create Client Component for Interactivity
```typescript
// Create: [YourPageData]Client.tsx
"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// Import other needed components

interface [YourPageData]ClientProps {
  initialData: YourDataType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
  // Other props
}

export default function [YourPageData]Client({
  initialData,
  pagination,
}: [YourPageData]ClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Local state for UI interactions only (not data)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Handle URL updates for filtering/pagination
  const updateUrl = (params: Record<string, string>) => {
    const current = new URLSearchParams(searchParams?.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });
    router.push(`?${current.toString()}`);
  };

  // Render your UI with the server-provided data
  return (
    <div className="container mx-auto py-8">
      {/* Your existing UI components */}
      {/* Use initialData instead of state */}
      {/* Handle interactions with updateUrl() */}
    </div>
  );
}
```

### Step 5: Handle Authentication (If Required)
```typescript
// For authenticated pages, add auth checks
import { auth } from "@/lib/auth"; // or your auth implementation

export default async function [YourPageData]Page({ searchParams }: any) {
  // Check authentication server-side
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  
  // Proceed with data fetching...
}
```

## ✅ Quality Checklist

### Before Submitting Your PR:
- [ ] **Page loads immediately** with content (no loading spinners on initial load)
- [ ] **All filters/search work** via URL parameters
- [ ] **Pagination works** without client-side API calls
- [ ] **Authentication is handled** server-side (if applicable)
- [ ] **Error boundaries** are implemented
- [ ] **TypeScript types** are properly defined
- [ ] **Console errors** are resolved
- [ ] **Performance** is visibly improved
- [ ] **SEO meta tags** are added/updated
- [ ] **Accessibility** is maintained

### Test Cases:
- [ ] Direct URL access works (e.g., `/your-page?page=2&search=test`)
- [ ] Page refresh maintains state through URL params
- [ ] Back/forward browser buttons work correctly
- [ ] Search and filtering work without loading states
- [ ] Error states are handled gracefully

## 🚫 Common Pitfalls to Avoid

1. **Don't use `fetch()` in server components** - Use direct database calls or internal functions
2. **Don't keep client-side data fetching** - Move ALL data fetching to server-side
3. **Don't break URL sharing** - Ensure all filters are in URL parameters
4. **Don't ignore error handling** - Always wrap server calls in try/catch
5. **Don't forget authentication** - Handle auth server-side for protected pages
6. **Don't create loading states for initial data** - Only for user interactions

## 📁 File Structure Pattern

```
src/app/[your-page]/
├── page.tsx (Server Component)
├── [YourPage]Client.tsx (Client Component for interactions)
└── components/ (if needed)
    └── [YourPage]Filters.tsx
    └── [YourPage]Table.tsx

src/lib/server/
└── fetch[YourPageData].ts (Server-side data fetching)
```

## 🔧 API Route Modifications (If Needed)

Some API routes may need optimization for server-side usage:

```typescript
// src/app/api/[your-endpoint]/route.ts
export async function GET(request: Request) {
  // Add server-side optimizations
  // Ensure proper error handling
  // Add caching headers if appropriate
}
```

## 📊 Performance Validation

After your migration, verify improvements:
1. **Lighthouse audit** - should show improved FCP and LCP scores
2. **Network tab** - initial page load should have fewer requests
3. **Visual comparison** - content should appear immediately
4. **SEO test** - view page source to confirm content is present

## 🚀 Submission Process

1. **Create PR** with title: `SSR Migration: [Page Name]`
2. **Include before/after** Lighthouse scores if possible
3. **Test all functionality** thoroughly
4. **Document any breaking changes**
5. **Tag team lead** for review

## 📞 Need Help?

- **Stuck on complex filtering?** - Check `/inventory` page implementation
- **Authentication issues?** - Review middleware.ts file
- **Database queries?** - Look at existing models in `/src/models/`
- **Type errors?** - Ensure proper interface definitions

---

**Remember**: The goal is immediate content visibility without loading spinners. Users should see data instantly when the page loads!