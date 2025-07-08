# Email CSS Integration Implementation

## Overview

This document describes the implementation of CSS stylesheet integration for email HTML export functionality in the Motive Archive Manager Content Studio.

## Problem Statement

Previously, when users selected a custom CSS stylesheet and used the "Copy Email HTML" button, the exported HTML did not include the selected stylesheet content. This meant that custom styling was lost in email exports, limiting the visual customization capabilities for email campaigns.

## Solution

We implemented a comprehensive CSS integration system that:

1. Accepts `selectedStylesheetId` parameter in export functions
2. Fetches stylesheet CSS content from the database when provided
3. Processes CSS for email compatibility (removes problematic CSS features)
4. Inlines the processed CSS into email HTML exports
5. Maintains backward compatibility with existing export functionality

## Implementation Details

### 1. API Endpoint Changes (`src/app/api/content-studio/export-html/route.ts`)

#### Added Dependencies

```typescript
import { dbConnect } from "@/lib/mongodb";
import { Stylesheet } from "@/models/Stylesheet";
```

#### Updated Request Handler

- Added `selectedStylesheetId` parameter extraction from request body
- Added stylesheet CSS fetching logic with error handling
- Updated function signatures to pass stylesheet CSS to HTML generators

#### New Functions

**`fetchStylesheetCSS(stylesheetId: string)`**

- Connects to MongoDB and fetches stylesheet by ID
- Returns CSS content or null if not found
- Includes error handling and logging

**`processStylesheetForEmail(cssContent: string)`**

- Removes `.content-studio-preview` scoping for email compatibility
- Strips email-incompatible CSS features:
  - Complex media queries
  - `:hover`, `:focus`, `:active` pseudo-selectors
  - `transform`, `animation`, `transition` properties
- Returns email-safe CSS

#### Updated HTML Generation

- Modified `generateEmailHTMLFromBlocks` to accept `stylesheetCSS` parameter
- Added processed stylesheet CSS to email template `<style>` section
- Added indicator in email footer when CSS is applied
- Also updated `generateHTMLFromBlocks` for web export consistency

### 2. Content Export Utility Updates (`src/lib/content-export.ts`)

#### Updated Method Signatures

All export methods now accept optional `selectedStylesheetId` parameter:

- `exportToHTML()`
- `downloadHTML()`
- `copyHTMLToClipboard()`
- `getHTMLContent()`

#### Enhanced Toast Messages

- Updated success messages to indicate when custom CSS is applied
- Added "Custom CSS applied" / "Custom CSS included" notifications

### 3. Hook Updates (`src/hooks/useContentExport.ts`)

#### Updated Function Signatures

All hook functions now accept and pass through `selectedStylesheetId`:

- `exportToHTML()`
- `copyHTMLToClipboard()`
- `getHTMLContent()`

#### Enhanced User Feedback

- Updated toast notifications to show CSS application status
- Improved error handling and user messaging

### 4. Component Integration (`src/components/content-studio/BlockComposer.tsx`)

#### Updated Export Button Handlers

All export buttons now pass the `selectedStylesheetId` from component state:

- Export Web HTML button
- Export Email HTML button
- Copy Web HTML button
- Copy Email HTML button

This ensures that when a user has selected a stylesheet, it will be included in all HTML exports.

## CSS Processing for Email Compatibility

The `processStylesheetForEmail` function applies several transformations to make CSS email-compatible:

### Removed Features

1. **Preview Scoping**: Removes `.content-studio-preview` wrapper classes
2. **Media Queries**: Strips complex media queries that may not work in email clients
3. **Interactive States**: Removes `:hover`, `:focus`, `:active` pseudo-selectors
4. **Animations**: Removes `transform`, `animation`, and `transition` properties

### Preserved Features

- Basic CSS properties (colors, fonts, spacing, etc.)
- Class selectors and element selectors
- Email-safe styling properties

## Validation Testing

Created comprehensive test script (`scripts/test-email-css-export.cjs`) that validates:

### Test Cases

1. **Email export without CSS**: Ensures basic functionality works
2. **Email export with CSS**: Validates CSS integration and processing
3. **Web export regression**: Ensures no breaking changes to web exports

### Test Validations

- HTML structure integrity
- CSS content inclusion and processing
- Email compatibility transformations
- Footer indicators for CSS application
- Proper error handling

## Usage Instructions

### For Content Creators

1. Select a custom CSS stylesheet using the StylesheetSelector component
2. Create your content composition with text blocks and images
3. Use the "Copy Email HTML" button to export with custom styling
4. The exported HTML will include the processed CSS inline for email compatibility

### For Developers

The integration is transparent - existing export functionality continues to work without changes. The new `selectedStylesheetId` parameter is optional and backwards compatible.

## Error Handling

The implementation includes robust error handling:

- Failed stylesheet fetches don't break the export process
- Warning logs for missing stylesheets
- Graceful fallback to export without CSS if stylesheet unavailable
- User-friendly error messages through toast notifications

## Performance Considerations

- CSS processing is lightweight and fast
- Database queries are optimized with proper indexing
- Error handling prevents export failures from CSS issues
- Minimal impact on existing export performance

## Security Considerations

- Proper database connection handling with connection cleanup
- Input validation for stylesheet IDs
- No user-controlled CSS injection (stylesheets are admin-managed)
- Auth middleware protection on API endpoints

## Future Enhancements

Potential improvements for future iterations:

1. **CSS Caching**: Cache processed CSS for repeated exports
2. **CSS Validation**: Validate CSS compatibility before processing
3. **Template Integration**: Allow stylesheets to be saved with specific templates
4. **Email Preview**: Real-time preview with applied CSS in email mode
5. **CSS Variables**: Support for CSS custom properties in email exports

## Testing

To test the implementation:

```bash
# Run the validation script
node scripts/test-email-css-export.cjs

# Or with custom API URL
API_BASE_URL=http://localhost:3000 node scripts/test-email-css-export.cjs
```

The test script will verify all functionality and report any issues.

## Conclusion

This implementation successfully integrates custom CSS stylesheets into email HTML exports while maintaining email client compatibility and preserving existing functionality. The solution is robust, well-tested, and ready for production use.
