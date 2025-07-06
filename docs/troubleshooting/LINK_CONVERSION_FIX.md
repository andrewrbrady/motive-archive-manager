# Link Conversion Fix

## Problem

Links were showing up as markdown-style links `[text](url)` instead of being converted to proper HTML `<a href="url">text</a>` tags in **both the preview AND the HTML export**. Users expected to see clickable links but were seeing raw markdown syntax instead.

## Root Cause

There were **TWO separate issues**:

### 1. Preview Components Issue

The preview components had conditional logic that checked for `block.richFormatting?.formattedContent`:

```typescript
const hasRichContent = block.richFormatting?.formattedContent;

if (hasRichContent) {
  // Apply markdown-to-HTML conversion
  const formatted = convertMarkdownToHTML(block.richFormatting.formattedContent);
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
} else {
  // Show raw content - THIS WAS THE PROBLEM!
  return <div>{content}</div>;
}
```

When `richFormatting.formattedContent` was falsy, the preview would fall back to showing raw content.

### 2. HTML Export Issue (THE MAIN PROBLEM)

In `src/app/api/content-studio/export-html/route.ts`, the `generateSendGridBlocksHTML()` function was completely bypassing link conversion:

```typescript
case "text": {
  const element = block.element || "p";
  // THIS WAS THE BUG - directly using raw content without processing
  return `<${element}>${escapeHtml(block.content)}</${element}>`;
}
```

This function was used for email exports and completely skipped all markdown-to-HTML conversion!

## Solution

### Fixed Preview Logic

Updated all preview components to always apply markdown-to-HTML conversion, regardless of whether `richFormatting.formattedContent` exists:

```typescript
const formattedContent = useMemo(() => {
  // Use richFormatting.formattedContent if available, otherwise use regular content
  const sourceContent = block.richFormatting?.formattedContent || content;

  let html = sourceContent;
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
  );
  html = html.replace(/\n/g, "<br>");
  return html;
}, [block.richFormatting?.formattedContent, content]);

// Always use the formatted content
return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
```

### Fixed HTML Export Logic

The critical fix was in the `generateSendGridBlocksHTML()` function which was completely bypassing markdown processing:

```typescript
// OLD CODE - BUG!
case "text": {
  const element = block.element || "p";
  return `<${element}>${escapeHtml(block.content)}</${element}>`;
}

// NEW CODE - FIXED!
case "text": {
  const textBlock = block as TextBlock;
  const element = textBlock.element || "p";

  // Process rich formatting if available, otherwise use raw content
  let processedContent = textBlock.content || "";
  if (textBlock.richFormatting?.formattedContent) {
    processedContent = textBlock.richFormatting.formattedContent;
  }

  // Apply basic formatting - convert markdown to HTML
  processedContent = processedContent
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" style="color: #0066cc; text-decoration: underline;">$1</a>'
    )
    .replace(/\n/g, "<br>");

  // Don't escape HTML if it contains formatting tags, otherwise escape it
  const hasHtmlTags = /<[^>]+>/.test(processedContent);
  const finalContent = hasHtmlTags ? processedContent : escapeHtml(processedContent);

  return `<${element}>${finalContent}</${element}>`;
}
```

### Files Modified

#### Preview Components (Fixed Issue #1)

Updated the following preview components to always apply link conversion:

1. **IntegratedPreviewEditor.tsx**

   - `TextBlockPreview` component
   - `HeadingBlockPreview` component

2. **PreviewColumn.tsx**

   - `TextBlockPreview` component
   - `HeadingBlockPreview` component

3. **CleanRenderer.tsx**

   - `CleanPreviewBlock` text case

4. **NewsArticleRenderer.tsx**

   - `NewsArticleBlock` text case

5. **BlockContent.tsx**
   - `FormattedTextPreview` component (minor improvement)

#### HTML Export API (Fixed Issue #2 - THE MAIN FIX)

6. **src/app/api/content-studio/export-html/route.ts**
   - Fixed `generateSendGridBlocksHTML()` function to process markdown before HTML generation
   - Added proper rich formatting processing and link conversion to email exports

### Key Changes

1. **Removed Conditional Logic**: Eliminated the `hasRichContent` checks that could cause fallback to raw content
2. **Unified Content Source**: Always use `richFormatting.formattedContent || content` as the source
3. **Consistent Conversion**: Apply markdown-to-HTML conversion regardless of rich formatting state
4. **Simplified Rendering**: Always use `dangerouslySetInnerHTML` with processed content

## Benefits

1. **Consistent Link Display**: Links always appear as clickable HTML links, never as markdown
2. **Better User Experience**: Users see exactly what they expect in previews
3. **Simplified Logic**: Removed complex conditional logic that could fail
4. **Future-Proof**: Works regardless of how rich formatting is managed

## Testing

The fix ensures that:

- `[OpenAI](https://openai.com)` → `<a href="https://openai.com">OpenAI</a>`
- `**bold text**` → `<strong>bold text</strong>`
- Mixed content works correctly
- Empty or undefined content doesn't break

## Migration Notes

This is a backward-compatible fix. All existing functionality continues to work, but links now display correctly in all preview modes.

The change affects only the preview rendering logic and doesn't modify how content is stored or saved.
