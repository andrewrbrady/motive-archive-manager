# CSS Preview Display Fix

## Problem Summary

CSS classes like `.cta-section` and `.cta-section-alt` were not displaying properly in preview windows, despite working correctly when exported to SendGrid. This caused a significant disconnect between what users saw in the content studio and the final output.

## Root Cause Analysis

The investigation revealed two critical issues in the `StylesheetInjector.tsx` component:

### 1. CSS Comment Parsing Bug

**Issue**: The regex pattern `/([^{]+)\{([^}]+)\}/g` was capturing CSS comments as part of selectors.

**Example**:

```css
/* ---------- CTA Section ---------- */
.cta-section {
  background: #000;
  color: #ffffff;
}
```

The regex captured:

- Selector: `"/* ---------- CTA Section ---------- */\n.cta-section"`
- This caused the entire rule to be treated as having a "dangerous" selector

### 2. Overly Broad Dangerous Selector Detection

**Issue**: The dangerous selector check used `.includes()` which incorrectly flagged CSS classes containing dangerous words.

**Example**:

```javascript
// This incorrectly flagged .cta-section as dangerous because it contains "section"
const shouldSkip = dangerousSelectors.some(
  (dangerous) => trimmedSelector.includes(dangerous) // ❌ Too broad
);
```

### 3. Overly Complex CSS Selectors

**Issue**: The generated CSS selectors were extremely complex and didn't match the actual DOM structure.

**Example**:

```css
/* Generated overly complex selectors that didn't match DOM */
.content-studio-preview.content-studio-preview .content-blocks-area.content-blocks-area [data-block-type="html"][data-block-type="html"] .cta-section.cta-section
```

## Solution Implementation

### 1. Fixed CSS Comment Handling

**Before**:

```javascript
return css.replace(/([^{]+)\{([^}]+)\}/g, (match, selector, declarations) => {
  // Comments were included in selectors
});
```

**After**:

```javascript
// Remove CSS comments first to prevent them from being parsed as selectors
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

return cssWithoutComments.replace(
  /([^{]+)\{([^}]+)\}/g,
  (match, selector, declarations) => {
    // Now selectors are clean
  }
);
```

### 2. Precise Dangerous Selector Detection

**Before**:

```javascript
const shouldSkip = dangerousSelectors.some(
  (dangerous) =>
    trimmedSelector.includes(dangerous) || // ❌ Too broad
    trimmedSelector.startsWith(dangerous) ||
    trimmedSelector === dangerous
);
```

**After**:

```javascript
const shouldSkip = dangerousSelectors.some((dangerous) => {
  // Only skip if it's exactly the dangerous selector (element selector)
  // or if it starts with the dangerous selector followed by a CSS combinator
  return (
    trimmedSelector === dangerous ||
    trimmedSelector.startsWith(dangerous + " ") ||
    trimmedSelector.startsWith(dangerous + ":") ||
    trimmedSelector.startsWith(dangerous + "[") ||
    trimmedSelector.startsWith(dangerous + ">") ||
    trimmedSelector.startsWith(dangerous + "+") ||
    trimmedSelector.startsWith(dangerous + "~")
  );
});
```

### 3. Simplified CSS Selectors

**Before**:

```javascript
// Overly complex selectors
const ultraHighSpecificitySelectors = [
  `.content-studio-preview.content-studio-preview .content-blocks-area.content-blocks-area ${trimmedSelector}${trimmedSelector}`,
  // ... many more complex selectors
];
```

**After**:

```javascript
// Simplified selectors that match actual DOM structure
const targetedSelectors = [
  `.content-studio-preview .html-block${trimmedSelector}`,
  `.email-preview .html-block${trimmedSelector}`,
  `.clean-preview .html-block${trimmedSelector}`,
  `[data-block-type="html"] .html-block${trimmedSelector}`,
  `.html-block${trimmedSelector}`,
];
```

### 4. Enhanced Property Targeting

Added more CSS properties to the `!important` enhancement:

```javascript
const enhancedDeclarations = declarations
  .trim()
  .replace(/color\s*:\s*([^;]+);?/g, "color: $1 !important;")
  .replace(/background\s*:\s*([^;]+);?/g, "background: $1 !important;")
  .replace(
    /background-color\s*:\s*([^;]+);?/g,
    "background-color: $1 !important;"
  )
  .replace(/text-align\s*:\s*([^;]+);?/g, "text-align: $1 !important;")
  .replace(/padding\s*:\s*([^;]+);?/g, "padding: $1 !important;")
  .replace(/margin\s*:\s*([^;]+);?/g, "margin: $1 !important;");
```

## Files Modified

1. **`src/components/BlockComposer/StylesheetInjector.tsx`**
   - Fixed `scopeCSS()` function
   - Fixed `createHTMLContentCSS()` function
   - Added CSS comment removal
   - Improved dangerous selector detection
   - Simplified CSS selectors

## Testing

Created comprehensive test scripts to verify the fix:

1. **`scripts/debug-css-preview-issue.cjs`** - Initial problem analysis
2. **`scripts/debug-css-regex-issue.cjs`** - Regex parsing investigation
3. **`scripts/test-fixed-css-injection.cjs`** - Verification of the fix

### Test Results

**Before Fix**:

```
❌ .cta-section skipped due to comment parsing
❌ .cta-section-alt skipped due to dangerous selector detection
❌ No CSS applied to preview windows
```

**After Fix**:

```
✅ Both .cta-section and .cta-section-alt processed correctly
✅ CSS classes no longer skipped due to comment parsing issues
✅ Dangerous selector detection is now more precise
✅ Simplified selectors match actual DOM structure
```

## Expected DOM Structure

The fix ensures CSS classes are applied to this DOM structure:

```html
<div class="content-studio-preview">
  <div data-block-type="html">
    <div class="html-block cta-section">
      <!-- User's div content with dangerouslySetInnerHTML -->
    </div>
  </div>
</div>
```

## Impact

- **✅ Fixed**: CSS classes like `.cta-section` now display properly in all preview modes
- **✅ Improved**: More reliable CSS injection mechanism
- **✅ Enhanced**: Better alignment between preview and export output
- **✅ Maintained**: Security by still blocking truly dangerous selectors

## Verification Steps

1. Create a div block in content studio
2. Apply a CSS class like `.cta-section` with background, color, and padding styles
3. Verify the styles appear in preview windows
4. Export to SendGrid and confirm styles match

The fix ensures that preview windows now accurately reflect the final exported output, eliminating the disconnect that users were experiencing.
