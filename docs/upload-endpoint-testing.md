# Upload Endpoint Testing Guide

This guide outlines how to test the newly migrated `/api/upload` endpoint to ensure it works correctly with all dependent components.

## Prerequisites

- Run the application in development mode: `npm run dev`
- Have test images ready for upload testing
- Ensure the `/app/api/upload/route.ts` file is properly implemented

## Testing StudioInventoryGrid Component

1. Navigate to the Studio Inventory page
2. Enable edit mode on the inventory grid
3. Select an item and attempt to upload an image by:
   - Dragging and dropping an image onto the item
   - Clicking the item to open the file dialog
4. Verify the image uploads successfully
5. Check that the image URL is properly displayed in the component
6. Verify the save functionality works with the newly uploaded image

## Testing AddInventoryItemModal Component

1. Navigate to the inventory management page
2. Open the "Add Inventory Item" modal
3. Fill in the required fields
4. Upload an image using the image upload button
5. Verify the image preview appears correctly
6. Submit the form and check that the new item is created with the image

## Testing BatchImageUploadModal Component

1. Navigate to the batch upload interface
2. Open the batch image upload modal
3. Select multiple images for upload
4. Initiate the upload process
5. Verify all images upload successfully
6. Check that progress indicators work correctly
7. Confirm the uploaded images appear in the correct location

## Testing lib/cloudflare.ts Integration

1. Open the browser console
2. Set a breakpoint in the Cloudflare utility functions that use the upload endpoint
3. Perform an upload operation that triggers these functions
4. Step through the code and verify:
   - The request is properly formatted
   - The response is correctly parsed
   - Error handling works as expected

## Verifying Response Format

For all tests, check the Network tab in browser dev tools and verify:

1. The request is sent to the correct endpoint
2. The response has a 200 status code
3. The response JSON includes:
   - `id` - unique identifier
   - `filename` - original filename
   - `uploaded` - timestamp
   - `variants` - array of image variants
   - `imageUrl` - URL to access the uploaded image

## Error Handling Testing

Test error cases to ensure proper handling:

1. Attempt to upload without selecting a file
2. Try to upload a file without providing an itemId
3. Upload a very large file to test size limitations
4. Upload an unsupported file format
5. Simulate network errors during upload

## Regression Testing

After confirming the new endpoint works:

1. Temporarily modify components to use the new App Router path (`/api/upload` remains the same)
2. Test all upload functionality again
3. If all tests pass, proceed with removing the Pages Router implementation

## Reporting Issues

If you encounter any issues:

1. Note the specific component and action that triggered the error
2. Capture the error message from the console
3. Document the expected vs. actual behavior
4. Note any network request/response differences

## Success Criteria

The migration is considered successful when:

- All components can upload files successfully
- No errors appear in the console
- The response format matches the original implementation
- All images are correctly saved and accessible
