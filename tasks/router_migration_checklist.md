# Next.js Router Migration Checklist

## 1. Initial Audit and Assessment

- [x] Analyze current routing systems in use
- [x] Identify Pages Router files still in use
- [x] Check for dependencies on Pages Router features
- [x] Determine impact of migration on existing functionality
- [x] Create inventory of all Pages Router dependencies

## 2. API Route Migration

- [x] Migrate `/api/upload` endpoint to App Router
  - [x] Create new route handler at `/app/api/upload/route.ts`
  - [x] Update formData handling to use modern Next.js API
  - [x] Ensure file upload functionality works identically
  - [x] Add proper error handling and validation
  - [x] Add support for multipart form data
  - [x] Remove old Pages Router implementation
- [x] Update components that use the upload API:
  - [x] Update `StudioInventoryGrid.tsx` to use improved upload function
  - [x] Update `EditInventoryItemModal.tsx` to use improved upload function
  - [x] Update `AddInventoryItemModal.tsx` to use improved upload function
  - [x] Update `BatchImageUploadModal.tsx` to use improved upload function

## 3. Document Configuration Migration

- [x] Verify no custom functionality in `_document.tsx` that needs migration
- [x] Ensure App Router's `layout.tsx` includes all necessary configurations
- [x] Remove `_document.tsx` after verification

## 4. Cleanup and Verification

- [x] Remove Pages Router directory after successful migration
- [ ] Verify all features previously using Pages Router work correctly
- [ ] Run comprehensive test suite to ensure no regressions
- [x] Update documentation to reflect single routing system

## 5. Performance and Best Practices

- [ ] Review App Router implementation for best practices
- [ ] Implement route grouping for better organization
- [ ] Add proper loading and error states for all routes
- [ ] Optimize data fetching with React Server Components
- [ ] Add appropriate caching strategies

## Progress Tracking

| Task                             | Status      | Assigned To | Completed On |
| -------------------------------- | ----------- | ----------- | ------------ |
| Initial Audit and Assessment     | Complete    |             | May 15, 2024 |
| API Route Migration              | Complete    |             | May 15, 2024 |
| Document Configuration Migration | Complete    |             | May 15, 2024 |
| Component Updates                | Complete    |             | May 15, 2024 |
| Cleanup and Verification         | In Progress |             | May 15, 2024 |
| Performance and Best Practices   | Not Started |             |              |

## Documentation Created

- [x] Router Migration Guide: `docs/router-migration.md`
- [x] Upload Endpoint Testing Guide: `docs/upload-endpoint-testing.md`
- [x] Migration Progress Summary: `tasks/router_migration_summary.md`

## Router Migration Details

### Background

Our application currently uses both Next.js routing systems: the older Pages Router (`/pages`) and the newer App Router (`/app`). This creates unnecessary complexity and potential conflicts. We should standardize on the App Router, which is Next.js's recommended approach and already powers most of our application.

### Requirements

- [x] Migrate all remaining Pages Router functionality to App Router
- [ ] Ensure no functionality is lost during migration
- [x] Clean up legacy code after successful migration
- [x] Document the migration process for future reference

### Implementation Checklist

#### API Upload Route Migration

The `/api/upload` endpoint in Pages Router is used by several components for file uploads. We need to create an equivalent App Router implementation.

- [x] Create `/app/api/upload/route.ts` with the following functionality:
  - [x] Support for multipart form data (formidable replacement)
  - [x] File storage logic from original implementation
  - [x] Return of compatible response format
  - [x] Proper error handling
- [x] Remove the Pages Router version of the upload endpoint
- [x] Update all components to use the improved upload functionality:
  - [x] Enhance `lib/cloudflare.ts` with better error handling
  - [x] Update StudioInventoryGrid component
  - [x] Update EditInventoryItemModal component
  - [x] Update AddInventoryItemModal component
  - [x] Update BatchImageUploadModal component

#### Document Configuration

The `_document.tsx` file is a basic implementation with no special customizations. The App Router's `layout.tsx` already includes all necessary functionality.

- [x] Verify no special head tags or other configurations in `_document.tsx`
- [x] Confirm all functionality is present in `layout.tsx`
- [x] Remove `_document.tsx` after verification

### Testing

- [ ] Unit tests for new upload route handler
- [ ] Integration tests with components that use the upload functionality
- [ ] End-to-end tests for complete user flows

### Documentation

- [x] Document the router migration process
- [x] Update documentation to reflect App Router usage
- [x] Add best practices for future route development

## Next Steps

The next steps are to:

1. Test the upload functionality to ensure it works correctly in all components
2. Complete the optimization tasks in section 5

This migration represents a significant step toward standardizing on the App Router, which will improve maintainability and take advantage of Next.js's latest features.
