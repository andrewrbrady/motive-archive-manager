# BlockComposer Refactoring Strategy

## 🚨 Current State Analysis

The `BlockComposer.tsx` component is **2,170 lines** - too large for maintainability. It handles multiple concerns:

- Block editing and management
- Preview rendering (clean, news article, email)
- Gallery image integration
- Frontmatter parsing
- Composition saving/loading
- Drag & drop functionality

## 🏗️ Refactoring Strategy

### Phase 1: Extract Rendering Logic (✅ STARTED)

**Files Created:**

- `src/components/content-studio/renderers/EmailRenderer.tsx` - Email HTML generation
- `src/components/content-studio/renderers/RendererFactory.tsx` - Central preview management

**What This Achieves:**

- Separates preview rendering from editing logic
- Makes adding new preview modes easier
- Reduces main component complexity

### Phase 2: Component Architecture (RECOMMENDED)

```
src/components/content-studio/
├── BlockComposer.tsx                 # Main orchestrator (< 500 lines)
├── components/
│   ├── BlockEditor.tsx              # Block editing interface
│   ├── CompositionHeader.tsx        # Header with save/preview controls
│   ├── PreviewPanel.tsx             # Preview wrapper with mode selector
│   └── BlockList.tsx                # Drag & drop block list
├── renderers/
│   ├── RendererFactory.tsx          # Preview mode switcher
│   ├── EmailRenderer.tsx            # Email HTML generation
│   ├── NewsArticleRenderer.tsx      # News article formatting
│   └── CleanRenderer.tsx            # Clean preview mode
├── hooks/
│   ├── useBlockManagement.ts        # Block CRUD operations
│   ├── useCompositionSave.ts        # Save/load logic
│   └── useDragAndDrop.ts            # Drag & drop state
└── types.ts                         # Type definitions
```

### Phase 3: Email Template Implementation

**Email Features to Add:**

- ✅ HTML email generation with inline styles
- ✅ Motive Archive branding template
- ✅ Mobile-responsive design
- ✅ Dark mode support
- ✅ Export controls (copy HTML, download file)

**Email-Specific Block Types:**

- `EmailSectionBlock` - Full-width sections with background colors
- `EmailCTABlock` - Call-to-action buttons with tracking
- `EmailSocialBlock` - Social media links footer

## 🎯 Implementation Steps

### Step 1: Extract Core Components (Next Priority)

```typescript
// src/components/content-studio/components/CompositionHeader.tsx
export function CompositionHeader({
  compositionName,
  onNameChange,
  previewMode,
  onPreviewModeChange,
  showPreview,
  onTogglePreview,
  onSave,
  isSaving,
  canSave,
  isUpdate,
}) {
  // Header UI with controls
}

// src/components/content-studio/components/BlockEditor.tsx
export function BlockEditor({
  blocks,
  onBlocksChange,
  activeBlockId,
  onSetActive,
  // ... other props
}) {
  // Block editing interface
}
```

### Step 2: Create Email-Specific Hooks

```typescript
// src/components/content-studio/hooks/useEmailGeneration.ts
export function useEmailGeneration(blocks: ContentBlock[], frontmatter: any) {
  const generateHTML = useCallback(() => {
    return generateEmailHTML(blocks, frontmatter);
  }, [blocks, frontmatter]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(generateHTML());
  }, [generateHTML]);

  const downloadHTML = useCallback(
    (filename: string) => {
      const blob = new Blob([generateHTML()], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [generateHTML]
  );

  return { generateHTML, copyToClipboard, downloadHTML };
}
```

### Step 3: Enhanced Email Template System

**Email Template Structure:**

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Email-safe meta tags -->
    <!-- Inline CSS for maximum compatibility -->
  </head>
  <body>
    <!-- Header Section -->
    <div class="email-container">
      <div class="header">
        <img src="[LOGO_URL]" alt="Motive Archive" />
      </div>

      <!-- Dynamic Content Blocks -->
      <!-- Generated from BlockComposer blocks -->

      <!-- CTA Section -->
      <!-- From frontmatter or CTA blocks -->

      <!-- Footer -->
      <div class="footer">
        <!-- Social links, unsubscribe, etc. -->
      </div>
    </div>
  </body>
</html>
```

## 📋 Migration Checklist

### Phase 1: Renderer Extraction (✅ In Progress)

- [x] Create EmailRenderer component
- [x] Create RendererFactory component
- [x] Update BlockComposer to use RendererFactory
- [ ] Remove old CleanPreview components
- [ ] Test all preview modes work correctly

### Phase 2: Component Breakdown (Next)

- [ ] Extract CompositionHeader component
- [ ] Extract BlockEditor component
- [ ] Extract PreviewPanel component
- [ ] Create useBlockManagement hook
- [ ] Create useCompositionSave hook
- [ ] Create useDragAndDrop hook

### Phase 3: Email Enhancement (Final)

- [ ] Add email-specific block types
- [ ] Implement email template variants
- [ ] Add email testing/preview tools
- [ ] Create email export API endpoint
- [ ] Add email sending integration

## 🔧 Immediate Action Items

1. **Complete Phase 1** - Finish renderer extraction
2. **Test Email Generation** - Verify HTML output matches requirements
3. **Plan Phase 2** - Break down component extraction priorities
4. **Create Email Templates** - Build library of email template variants

## 🎨 Email Template Variants

After refactoring, we can easily add:

- **Welcome Email** - Onboarding new users
- **Newsletter** - Regular content updates
- **Auction Alerts** - Vehicle listing notifications
- **Event Invitations** - Car show and event announcements
- **Collection Updates** - User collection highlights

## 📈 Benefits of This Approach

1. **Maintainability** - Smaller, focused components
2. **Testability** - Each component can be tested independently
3. **Reusability** - Renderers can be used elsewhere
4. **Extensibility** - Easy to add new preview modes/templates
5. **Performance** - Better code splitting and lazy loading
6. **Developer Experience** - Easier to understand and modify

## 🚀 Next Steps

1. Complete the current renderer extraction
2. Test email HTML generation thoroughly
3. Begin component breakdown (CompositionHeader first)
4. Plan email template library structure
5. Consider API integration for email sending

This refactoring will transform the BlockComposer from a monolithic component into a modular, maintainable system that can easily support email templates and future enhancements.
