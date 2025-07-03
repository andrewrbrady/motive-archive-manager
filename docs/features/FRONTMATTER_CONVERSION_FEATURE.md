# Frontmatter Conversion Feature

## Overview

The Content Studio now supports **automatic detection and conversion** of YAML frontmatter from text blocks into structured frontmatter blocks. This provides a seamless migration path for existing content that uses YAML frontmatter syntax.

## How It Works

### 1. Automatic Detection

- When editing any text block, the system automatically detects if it contains YAML frontmatter
- YAML frontmatter is identified by the pattern:
  ```yaml
  ---
  title: "Article Title"
  subtitle: "Article subtitle"
  author: "Author Name"
  date: "2025-01-15"
  tags: ["tag1", "tag2", "tag3"]
  ---
  ```

### 2. Visual Indicator

- Text blocks containing frontmatter will show a blue notification banner
- The banner displays:
  - **YAML Frontmatter Detected** heading with FileText icon
  - Description of the conversion feature
  - List of detected fields (title, subtitle, author, etc.)
  - **"Convert to Metadata Block"** button

### 3. Conversion Process

- Click the "Convert to Metadata Block" button
- The system parses the YAML frontmatter and extracts all fields
- Creates a new structured frontmatter block with the parsed data
- If there's content after the frontmatter, it creates a new text block for the remaining content
- The original text block is replaced with the frontmatter block (and new text block if needed)

## Supported Frontmatter Fields

The conversion supports all standard frontmatter fields:

### Required Fields

- `title` - Article title
- `subtitle` - Article subtitle or description
- `author` - Content author
- `date` - Publication date (YYYY-MM-DD format)

### Optional Fields

- `type` - Content type (e.g., "listing", "article")
- `status` - Publication status (e.g., "LIVE", "SOLD", "DRAFT")
- `tags` - Array of tags `["tag1", "tag2", "tag3"]`
- `cover` - Cover image URL
- `callToAction` - Call to action text
- `callToActionUrl` - Call to action URL

## Example Usage

### Before Conversion (Text Block)

```yaml
---
title: "1985 Porsche 911 Carrera M491 Turbo Look Sells for $165,000 on Bring a Trailer"
subtitle: "Twin-plug 3.4L flat-six, M491 widebody, and bespoke upgrades define this Guards Red icon."
type: "listing"
date: "2025-06-04"
author: "Motive Archive"
tags:
  [
    "porsche",
    "911",
    "m491",
    "turbo look",
    "auction",
    "bring a trailer",
    "aircooled",
  ]
cover: "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/f2e1b7e1-4b9d-4c2e-9f5f-8f7e8c123456/highres"
status: "SOLD"
callToAction: "This expertly modified 1985 Porsche 911 Carrera M491 Turbo Look achieved $165,000 at auction, underscoring the enduring appeal of bespoke air-cooled classics."
callToActionUrl: "https://bringatrailer.com/listing/1985-porsche-911-98/"
---
This stunning 1985 Porsche 911 Carrera M491 Turbo Look represents the pinnacle of air-cooled excellence...
```

### After Conversion

- **Frontmatter Block**: Structured metadata with editable fields
- **Text Block**: "This stunning 1985 Porsche 911 Carrera M491 Turbo Look represents the pinnacle of air-cooled excellence..."

## Benefits

### 1. **Structured Editing**

- Each frontmatter field becomes an editable form field
- No more manual YAML syntax editing
- Type-safe input validation

### 2. **Better UX**

- Visual metadata editor with labels and inputs
- Dropdown menus for status and type fields
- Tag management with add/remove functionality

### 3. **News Article Integration**

- Frontmatter blocks automatically populate news article headers
- Seamless integration with news article preview mode
- Consistent formatting across different content types

### 4. **Migration Path**

- Existing content with YAML frontmatter can be easily converted
- No data loss during conversion
- Preserves all existing fields and values

## Implementation Details

### Core Functions

- `detectFrontmatterInTextBlock()` - Detects YAML frontmatter in text blocks
- `convertTextToFrontmatterBlock()` - Converts text blocks to frontmatter blocks
- Simple YAML parser for common frontmatter patterns

### User Interface

- Blue notification banner with conversion button
- Real-time detection when editing text blocks
- One-click conversion with toast notifications
- Prevents duplicate frontmatter blocks per composition

### Integration Points

- **BlockComposer.tsx** - Main conversion logic
- **BlockContent.tsx** - UI detection and conversion button
- **IntegratedPreviewEditor.tsx** - Props passing and block management
- **types.ts** - FrontmatterBlock type definition

## Usage in News Articles

When using the news article preview mode, frontmatter blocks automatically populate:

- Article title and subtitle
- Author and publication date
- Cover image
- Tags and status badges
- Call-to-action sections

This provides a professional article layout with structured metadata that's easy to edit and maintain.
