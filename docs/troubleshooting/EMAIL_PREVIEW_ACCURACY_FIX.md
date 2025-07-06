# Email Preview Accuracy Fix

## Problem

The email preview system was not accurately reflecting what users would receive in their actual emails. The preview showed content with raw CSS while the email export used processed CSS, creating a mismatch where users saw one thing in preview but got something different in the final email.

## Root Cause

The issue was that the preview system and email export system used different CSS processing:

- **Preview System**: Used `classToInlineStyles()` which applied raw CSS directly
- **Email Export**: Used `processEmailCSSForSendGrid()` and `processStylesheetForEmail()` which filtered and processed CSS for email compatibility

This created a disconnect where the preview didn't account for the CSS transformations that happen during email generation.

## Solution

### 1. Enhanced CSS Parser (`src/lib/css-parser.ts`)

Added new functions to mirror the email export CSS processing:

```typescript
// Process CSS for email compatibility (same as email export)
export function processStylesheetForEmail(cssContent: string): string;
export function processEmailCSSForSendGrid(cssContent: string): string;
export function processClassForEmailPreview(
  cssClass: CSSClass,
  emailPlatform: string
): CSSClass;
export function classToEmailInlineStyles(
  cssClass: CSSClass,
  emailPlatform: string
): React.CSSProperties;
export function parseEmailCSS(
  cssContent: string,
  emailPlatform: string
): ParsedCSS;
```

### 2. Updated Preview Components

Modified preview components to use processed CSS when in email mode:

- **CleanRenderer**: Now accepts `emailPlatform` prop and uses `classToEmailInlineStyles()` for email mode
- **IntegratedPreviewEditor**: Passes preview mode and email platform to child components
- **TextBlockPreview & HeadingBlockPreview**: Apply processed CSS based on preview mode

### 3. CSS Processing Logic

The preview now applies the same filtering as email export:

**Generic Email Processing:**

- Removes: `transform`, `animation`, `transition` properties
- Preserves: colors, typography, spacing, backgrounds

**SendGrid Processing:**

- All generic processing plus:
- Removes: `@import` statements, `@font-face` blocks, ID selectors, attribute selectors
- Preserves: class names, hex colors, standard CSS properties

### 4. Preview Mode Integration

Updated the BlockComposer to pass the correct preview mode:

```typescript
<IntegratedPreviewEditor
  previewMode={previewMode === "email" ? "email" : "clean"}
  emailPlatform="generic"
  // ... other props
/>
```

## Implementation Details

### CSS Processing Functions

```typescript
// Basic email processing - removes problematic CSS properties
function processStylesheetForEmail(cssContent: string): string {
  let processedCSS = cssContent.replace(/\.content-studio-preview\s+/g, "");
  processedCSS = processedCSS.replace(/^\s*transform\s*:[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^\s*animation\s*:[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^\s*transition\s*:[^;]+;/gm, "");
  return processedCSS;
}

// SendGrid-specific processing - more aggressive filtering
function processEmailCSSForSendGrid(cssContent: string): string {
  let processedCSS = processStylesheetForEmail(cssContent);
  processedCSS = processedCSS.replace(/^@import\s+[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^@font-face\s*\{[^}]*\}/gm, "");
  processedCSS = processedCSS.replace(
    /^#[a-zA-Z][a-zA-Z0-9_-]*\s*\{[^}]*\}/gm,
    ""
  );
  processedCSS = processedCSS.replace(
    /^\[[\w-]+[\^$*~|]?=?[^]]*\]\s*\{[^}]*\}/gm,
    ""
  );
  return processedCSS;
}
```

### Preview Component Updates

```typescript
// TextBlockPreview now uses processed CSS for email mode
const customStyles = useMemo(() => {
  if (block.cssClass) {
    return previewMode === "email"
      ? classToEmailInlineStyles(block.cssClass, emailPlatform)
      : classToInlineStyles(block.cssClass);
  }
  return {};
}, [block.cssClass, previewMode, emailPlatform]);
```

## Testing

### Verification Script

Created `scripts/test-email-preview-accuracy.cjs` to verify the implementation:

```bash
node scripts/test-email-preview-accuracy.cjs
```

### Test Results

✅ **All critical tests passing:**

- Transform properties removed
- Animation properties removed
- Transition properties removed
- @import statements removed
- @font-face blocks removed
- ID selectors removed
- Color properties preserved
- Hex colors preserved
- Class names preserved

## Benefits

1. **Accurate Previews**: Users now see exactly what they'll get in their emails
2. **No Surprises**: Eliminates the disconnect between preview and final email
3. **Better UX**: Users can confidently style their emails knowing the preview is accurate
4. **Maintained Compatibility**: All existing functionality preserved while adding accuracy

## Files Modified

- `src/lib/css-parser.ts` - Added email processing functions
- `src/components/content-studio/renderers/CleanRenderer.tsx` - Updated for email preview
- `src/components/content-studio/IntegratedPreviewEditor.tsx` - Added email mode support
- `src/components/content-studio/BlockComposer.tsx` - Passes preview mode
- `src/components/content-studio/renderers/RendererFactory.tsx` - Updated email renderer
- `scripts/test-email-preview-accuracy.cjs` - Test script for verification

## Migration Notes

This is a backward-compatible enhancement. Existing functionality continues to work unchanged, while email previews now show processed CSS for accuracy.

The implementation uses the same processing functions as the email export system, ensuring consistency between preview and final output.
