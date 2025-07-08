# BlockComposer Frontmatter Parsing Fix

## Issue Fixed

Previously, frontmatter data in news article preview mode was showing as raw YAML text instead of properly formatted article header content.

## Solution Implemented

Added intelligent frontmatter parsing to the `CleanPreview` component in `BlockComposer.tsx`:

### 1. Frontmatter Parsing Function

- `parseFrontmatterFromBlocks()` extracts YAML frontmatter from the first text block
- Supports common frontmatter fields: title, subtitle, author, date, status, cover, tags, callToAction, etc.
- Handles array parsing for tags field
- Returns both parsed data and block ID for filtering

### 2. Content Filtering

- Filters out raw frontmatter blocks from main article content
- Removes blocks with `metadata.source === "frontmatter"`
- Prevents raw YAML from appearing in article body

### 3. Header Population

- Uses parsed frontmatter to populate article header elements
- Falls back to composition name and default values if frontmatter missing
- Properly formats dates and handles cover image extraction

## Sample Frontmatter Format

```yaml
---
title: "1965 Porsche 911 Outlaw"
subtitle: "Street-Legal Track Beast"
author: "Motive Archive"
date: "2024-01-15"
status: "LIVE AUCTION"
cover: "https://imagedelivery.net/abc123/image-id/public"
tags: ["porsche", "outlaw", "track"]
callToAction: "Bid on this vehicle"
callToActionUrl: "https://bringatrailer.com/listing/123"
---
```

## Testing

1. Create a new composition with frontmatter as the first text block
2. Switch to "News Article" preview mode
3. Verify header shows parsed values instead of raw YAML
4. Confirm raw frontmatter text doesn't appear in article body
5. Test cover image display from frontmatter URL
6. Validate tags display correctly

## Files Modified

- `src/components/content-studio/BlockComposer.tsx` - Added frontmatter parsing logic

## Success Criteria ✅

- [x] News article preview shows formatted header (title, subtitle, author, date, status)
- [x] Cover image displays when URL provided in frontmatter
- [x] Raw frontmatter text no longer appears in article content
- [x] Dark/light mode switching works correctly
- [x] No TypeScript errors or console warnings
