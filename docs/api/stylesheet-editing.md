# Stylesheet Editing API Documentation

This document describes the API endpoints for editing and managing CSS stylesheets in the Content Studio.

## Overview

The stylesheet editing functionality allows users to:

- Update existing stylesheets (content, metadata)
- Soft delete stylesheets (set isActive: false)
- Maintain version history
- Re-parse CSS when content changes

## Endpoints

### PUT /api/stylesheets/[id]

Update an existing stylesheet by ID.

**Request Body** (all fields optional):

```typescript
{
  name?: string;              // Stylesheet name
  cssContent?: string;        // CSS content (triggers re-parsing)
  description?: string;       // Description
  version?: string;          // Version string
  tags?: string[];          // Array of tags
  isDefault?: boolean;      // Default stylesheet flag
  isActive?: boolean;       // Active status
}
```

**Response** (200 OK):

```typescript
{
  stylesheet: ClientStylesheet; // Full updated stylesheet object
}
```

**Error Responses**:

- `400 Bad Request`: Invalid data (empty name or CSS content)
- `404 Not Found`: Stylesheet not found
- `500 Internal Server Error`: Database or parsing error

**Features**:

- Automatic CSS re-parsing when `cssContent` is updated
- Automatic `updatedAt` timestamp update
- Validates required fields if provided
- Preserves existing values for omitted fields

### DELETE /api/stylesheets/[id]

Soft delete a stylesheet by setting `isActive: false`.

**Response** (200 OK):

```typescript
{
  message: "Stylesheet deleted successfully";
  id: string; // ID of deleted stylesheet
}
```

**Error Responses**:

- `403 Forbidden`: Cannot delete demo stylesheet
- `404 Not Found`: Stylesheet not found
- `500 Internal Server Error`: Database error

**Features**:

- Soft delete only (preserves data)
- Prevents deletion of demo stylesheet (`demo-stylesheet-1`)
- Updates `updatedAt` timestamp
- Stylesheet becomes inactive but remains in database

## Usage Examples

### Update Stylesheet Metadata Only

```javascript
const response = await fetch("/api/stylesheets/my-stylesheet-id", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Updated Stylesheet Name",
    description: "Updated description",
    version: "2.0.0",
    tags: ["updated", "version-2"],
  }),
});

const { stylesheet } = await response.json();
```

### Update CSS Content (triggers re-parsing)

```javascript
const newCSS = `
.container { 
  background: #f8f9fa; 
  padding: 30px; 
}
.header { 
  color: #2c3e50; 
  font-size: 24px; 
}
`;

const response = await fetch("/api/stylesheets/my-stylesheet-id", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    cssContent: newCSS,
    version: "2.1.0",
  }),
});

const { stylesheet } = await response.json();
// stylesheet.parsedCSS will contain newly parsed CSS classes
```

### Soft Delete Stylesheet

```javascript
const response = await fetch("/api/stylesheets/my-stylesheet-id", {
  method: "DELETE",
});

const { message, id } = await response.json();
// Stylesheet is now inactive (isActive: false)
```

## CSS Re-parsing

When `cssContent` is updated, the API automatically:

1. **Parses CSS** using the `parseCSS()` function
2. **Extracts classes** with properties and categories
3. **Updates parsedCSS** field in database
4. **Maintains metadata** like description and version

**Example of parsed CSS structure**:

```typescript
{
  classes: [
    {
      name: "container",
      selector: ".container",
      properties: {
        "background-color": "#f8f9fa",
        "padding": "30px"
      },
      description: "container, background styling, spacing",
      category: "layout"
    }
  ],
  variables: {},
  globalStyles: {}
}
```

## Error Handling

### Validation Errors (400)

- Empty name after trimming
- Empty CSS content
- Invalid field types

### Not Found Errors (404)

- Stylesheet ID doesn't exist
- Stylesheet was soft-deleted (isActive: false)

### Forbidden Errors (403)

- Attempting to delete demo stylesheet

### Server Errors (500)

- Database connection issues
- CSS parsing failures
- Unexpected errors

## Best Practices

1. **Version Management**: Always update version when changing CSS content
2. **Partial Updates**: Only send fields you want to update
3. **Error Handling**: Check response status and handle errors appropriately
4. **CSS Validation**: Validate CSS on client-side before sending
5. **Backup Strategy**: Consider keeping version history for important stylesheets

## Testing

Use the test script to verify functionality:

```bash
node scripts/api-tests/test-stylesheet-editing.js
```

This script tests:

- Creating test stylesheet
- Updating metadata only
- Updating CSS content with re-parsing
- Error handling for invalid data
- Deletion protection for demo stylesheet
- Soft deletion functionality
- Verification of deleted state

## Integration with Content Studio

These endpoints integrate with the existing Content Studio functionality:

- **StylesheetSelector**: Can refresh list after updates/deletions
- **BlockComposer**: Uses updated parsed CSS for class suggestions
- **Template System**: Respects isActive flag for stylesheet availability
- **Version History**: Tracks changes through updatedAt timestamps

## Database Schema

The endpoints work with the existing Stylesheet MongoDB schema:

```typescript
{
  id: String,           // Unique identifier
  name: String,         // Stylesheet name
  clientId?: String,    // Associated client
  cssContent: String,   // Raw CSS content
  parsedCSS: Object,    // Parsed CSS structure
  isDefault: Boolean,   // Default stylesheet flag
  isActive: Boolean,    // Active status (soft delete)
  uploadedAt: Date,     // Creation timestamp
  updatedAt: Date,      // Last update timestamp
  uploadedBy: String,   // User identifier
  description?: String, // Optional description
  version?: String,     // Version string
  tags?: [String]       // Optional tags
}
```

## Security Considerations

- No authentication implemented yet (TODO)
- Demo stylesheet protection prevents accidental deletion
- Soft delete preserves data for recovery
- Input validation prevents injection attacks
- Database errors are logged but not exposed to client
