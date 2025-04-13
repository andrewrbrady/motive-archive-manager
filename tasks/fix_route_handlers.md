# Fix Next.js Route Handlers

In Next.js 14/15, the API for route handlers with dynamic parameters has changed. We need to update all route handlers to use the new pattern, as described in FIXING-NEXT-ROUTES.md.

## Route Handler Files to Fix

- [x] src/app/api/cars/[id]/article/saved/route.ts
- [x] src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts
- [x] src/app/api/cars/[id]/deliverables/assign/route.ts
- [x] src/app/api/cars/[id]/deliverables/route.ts
- [x] src/app/api/cars/[id]/documentation/route.ts
- [x] src/app/api/cars/[id]/documents/route.ts
- [x] src/app/api/cars/[id]/events/[eventId]/route.ts
- [x] src/app/api/cars/[id]/events/route.ts
- [x] src/app/api/cars/[id]/image-sync/route.ts
- [x] src/app/api/cars/[id]/images/batch/route.ts
- [x] src/app/api/cars/[id]/images/route.ts
- [x] src/app/api/cars/[id]/research/all/route.ts
- [x] src/app/api/cars/[id]/research/chat/route.ts
- [x] src/app/api/cars/[id]/research/content/route.ts
- [x] src/app/api/cars/[id]/research/route.ts
- [x] src/app/api/cars/[id]/research/search/route.ts
- [x] src/app/api/cars/[id]/route.ts
- [ ] src/app/api/cloudflare/metadata/[id]/route.ts
- [ ] src/app/api/kits/[id]/route.ts
- [ ] src/app/api/assets/[id]/route.ts

## Pattern to Follow

```typescript
// OLD PATTERN - NO LONGER WORKS
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ...
}

// NEW PATTERN
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // Adjust index based on URL structure

    // ... rest of your code ...
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
```
