# Next.js Router Migration Guide

## Overview

This document outlines the migration from the Pages Router to the App Router in our Next.js application. The App Router is Next.js's recommended approach for routing, offering improved features like React Server Components, nested layouts, and more efficient routing.

## Background

Our application started with the Pages Router structure (`/pages` directory) but gradually shifted towards using the App Router (`/app` directory). As of May 2024, most of our application already uses the App Router, but we maintained some legacy endpoints in the Pages Router.

## Migration Strategy

1. **Audit**: Identify all Pages Router components and API routes still in use
2. **Implement**: Create equivalent functionality in App Router
3. **Test**: Verify functionality works as expected
4. **Switch**: Update imports and references to use new implementations
5. **Remove**: Delete Pages Router code after confirming everything works

## Migrated Endpoints

### `/api/upload` Endpoint

The file upload API route was migrated from Pages Router to App Router:

**Old implementation (Pages Router):**

- Location: `src/pages/api/upload.ts`
- Used formidable to handle multipart form data
- Saved files to the public/uploads directory
- Used by multiple components for file uploads

**New implementation (App Router):**

- Location: `src/app/api/upload/route.ts`
- Uses Next.js built-in formData handling
- Maintains the same file storage pattern and response format
- No third-party dependencies needed for form parsing

**Key differences:**

- Uses modern `formData()` method instead of formidable
- Uses async file operations with the fs/promises API
- Response format remains compatible with existing code

### Document Configuration

The basic document configuration in `_document.tsx` was verified to have no special customizations. The App Router's `layout.tsx` already includes all necessary document structure and adds improvements like:

- Dark mode script for theme handling
- Font optimization with next/font
- Standard metadata configuration
- Global providers

## Testing

To ensure the migration doesn't break existing functionality:

1. Test all components that use the API endpoints
2. Verify file uploads work as expected
3. Check that all pages render correctly
4. Confirm no console errors related to routing

## Best Practices

When working with the App Router:

1. **Route Groups**: Use route grouping `(groupName)` for better organization
2. **Loading States**: Implement loading.tsx files for loading indicators
3. **Error Handling**: Add error.tsx files for error boundaries
4. **Server Components**: Use server components by default for better performance
5. **Data Fetching**: Fetch data directly in server components when possible

## References

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Migration Guide from Pages to App Router](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
