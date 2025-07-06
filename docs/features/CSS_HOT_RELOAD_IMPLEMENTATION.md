# CSS Hot-Reload Implementation

## Overview

This document describes the implementation of CSS hot-reload optimization in the Motive Archive Manager content studio to prevent full component refreshes when stylesheets are saved.

## Problem Statement

**Previous Behavior:**

- When CSS was saved, the entire preview component would refresh
- StylesheetInjector removed and re-added `<style>` elements causing DOM manipulation
- Full cache invalidation triggered re-renders across all components
- User editing state could be lost during CSS updates
- Unnecessary browser reflow and performance degradation

**Target Behavior:**

- CSS updates should only affect visual styling, not component state
- Preview components should not re-render when only CSS changes
- Style elements should be updated in-place without DOM manipulation
- User editing state should be preserved during CSS updates

## Implementation Strategy

### Phase 1: StylesheetInjector Optimization

**File:** `src/components/BlockComposer/StylesheetInjector.tsx`

**Changes:**

- Added `useRef` to track style elements for efficient updates
- Implemented `updateStyleElementContent()` function for hot-reload
- CSS content change detection to avoid unnecessary updates
- Fallback to full re-injection if hot-reload fails

**Key Features:**

```typescript
// HOT-RELOAD: Track style elements with refs
const styleElementRef = useRef<HTMLStyleElement | null>(null);
const lastCSSContentRef = useRef<string>("");

// Update existing style element instead of DOM manipulation
const updateStyleElementContent = (
  cssContent: string,
  stylesheetName: string
) => {
  if (!styleElementRef.current) return false;

  // Check if CSS content actually changed
  if (lastCSSContentRef.current === cssContent) {
    console.log(`⚡ CSS content unchanged, skipping update`);
    return true;
  }

  // Update textContent instead of removing/re-adding element
  styleElementRef.current.textContent = combinedCSS;
  lastCSSContentRef.current = cssContent;
  return true;
};
```

### Phase 2: useStylesheetData Hook Enhancement

**File:** `src/hooks/useStylesheetData.ts`

**Changes:**

- Added CSS content listeners separate from full cache invalidation
- Implemented `notifyCSSContentChange()` for selective updates
- CSS content cache for efficient change detection
- Hot-reload listeners for individual stylesheets

**Key Features:**

```typescript
// CSS content listeners for hot-reload
const cssContentListeners = new Map<
  string,
  Set<(cssContent: string) => void>
>();

// Register listener for CSS content changes
export function onCSSContentChange(
  stylesheetId: string,
  listener: (cssContent: string) => void
): () => void {
  // Implementation for selective CSS updates
}

// Notify CSS content change without full cache invalidation
export function notifyCSSContentChange(
  stylesheetId: string,
  cssContent: string
) {
  // Update only CSS content, preserve component state
}
```

### Phase 3: Preview Component Optimization

**File:** `src/components/content-studio/renderers/RendererFactory.tsx`

**Changes:**

- Added `React.memo` with custom comparison function
- Optimized re-render conditions to exclude CSS-only changes
- Memoized props to prevent unnecessary updates

**Key Features:**

```typescript
export const RendererFactory = React.memo<RendererFactoryProps>(
  function RendererFactory({ mode, blocks, /* ... */ }) {
    // Component implementation
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    return (
      prevProps.mode === nextProps.mode &&
      prevProps.blocks === nextProps.blocks &&
      // ... other prop comparisons
    );
  }
);
```

### Phase 4: BlockComposer Integration

**File:** `src/components/content-studio/BlockComposer.tsx`

**Changes:**

- Updated CSS save function to use hot-reload notification
- Added memoized preview props to prevent re-renders
- Replaced full cache invalidation with selective CSS updates

**Key Features:**

```typescript
// Use CSS content notification instead of full cache invalidation
const { notifyCSSContentChange } = await import("@/hooks/useStylesheetData");
notifyCSSContentChange(selectedStylesheetId, cssContent);

// Memoized props prevent unnecessary re-renders
const previewProps = useMemo(
  () => ({
    mode: previewMode,
    blocks,
    selectedStylesheetId,
    // ...
  }),
  [previewMode, blocks, selectedStylesheetId /* ... */]
);
```

## Performance Benefits

### Before Optimization

1. **DOM Manipulation:** Style elements removed and re-added
2. **Full Re-renders:** All preview components re-rendered on CSS changes
3. **Cache Invalidation:** Global cache invalidation triggered multiple updates
4. **State Loss:** User editing state could be lost during updates
5. **Browser Reflow:** Unnecessary layout recalculations

### After Optimization

1. **In-Place Updates:** Style element `textContent` updated directly
2. **Selective Re-renders:** Only components that need updates re-render
3. **Targeted Updates:** CSS-specific notifications without full invalidation
4. **State Preservation:** User editing state maintained during CSS updates
5. **Minimal Reflow:** Only CSS changes trigger visual updates

## Regression Prevention

### Preserved Functionality

- ✅ CSS comment parsing and removal
- ✅ Dangerous selector detection (body, html, nav, etc.)
- ✅ CSS class scoping (`.cta-section`, etc.)
- ✅ CSS property enhancement with `!important`
- ✅ HTML block CSS injection
- ✅ Email and clean preview modes

### Test Coverage

- **Script:** `scripts/test-css-hot-reload.cjs`
- **Regression Tests:** Verify existing CSS functionality preserved
- **Hot-Reload Tests:** Validate new optimization features
- **Integration Tests:** Ensure no breaking changes

## Usage Instructions

### CSS Editor Mode

1. **Switch to CSS Mode:** Click the "CSS" tab in the editor mode toggle
2. **Select Stylesheet:** Choose a stylesheet from the dropdown
3. **Edit CSS:** Make changes in the Monaco editor with syntax highlighting
4. **Save Changes:**
   - Click "Save CSS" button
   - Use **Ctrl+S** keyboard shortcut
   - **VIM Mode**: Type `:w` and press Enter (VIM keybindings)
   - **VIM Mode**: Type `:write` and press Enter (full command)
5. **Preview Updates:** See changes reflected immediately in the left preview panel

### VIM Mode Features

- **Enable/Disable:** Toggle VIM mode using the "VIM: ON/OFF" button
- **Save Commands:**
  - `:w` - Quick save command
  - `:write` - Full save command
- **Visual Feedback:** VIM status bar shows "CSS saved!" confirmation
- **Status Display:** Current VIM mode (NORMAL, INSERT, etc.) shown in status bar
- **Keybindings:** Standard VIM navigation and editing commands supported

### For Developers

1. **CSS Updates:** Use the CSS editor in BlockComposer
2. **Save CSS:** Click save button - should see hot-reload console messages
3. **Monitor Console:** Look for `⚡ CSS Hot-Reload:` messages
4. **Verify State:** Ensure editing state is preserved during CSS updates

### Console Messages

```javascript
// Hot-reload success
⚡ CSS Hot-Reload: Updated StylesheetName without DOM manipulation
⚡ CSS content unchanged for StylesheetName, skipping update

// Fallback to full re-injection
⚠️ Hot-reload failed, falling back to full re-injection

// CSS content notification
⚡ CSS Hot-Reload: Notifying 2 listeners for stylesheet abc123

// VIM save commands
⚡ VIM :w command triggered - saving CSS
⚡ VIM :write command triggered - saving CSS
⚡ Ctrl+S triggered - saving CSS
```

## Technical Details

### File Structure

```
src/
├── components/
│   ├── BlockComposer/
│   │   └── StylesheetInjector.tsx    # Hot-reload style element updates
│   └── content-studio/
│       ├── BlockComposer.tsx         # Memoized props, CSS save optimization
│       └── renderers/
│           └── RendererFactory.tsx   # React.memo optimization
├── hooks/
│   └── useStylesheetData.ts          # CSS content listeners, hot-reload hooks
└── scripts/
    ├── debug-css-refresh-triggers.cjs # Analysis script
    └── test-css-hot-reload.cjs       # Test and validation script
```

### Dependencies

- React hooks: `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`
- React optimization: `React.memo`
- Browser APIs: DOM style element manipulation

### Browser Compatibility

- Modern browsers supporting `textContent` property
- CSS custom properties and `!important` declarations
- ES6+ JavaScript features (Map, Set, arrow functions)

## Troubleshooting

### Common Issues

1. **CSS Not Updating**

   - Check console for hot-reload messages
   - Verify stylesheet is selected in CSS editor
   - Ensure CSS content actually changed

2. **Component Still Re-rendering**

   - Check React DevTools for re-render causes
   - Verify memoized props are stable
   - Look for unnecessary dependency changes

3. **CSS Classes Not Working**
   - Run regression test script: `node scripts/test-css-hot-reload.cjs`
   - Check dangerous selector filtering
   - Verify CSS scoping is preserved

### Debug Commands

```bash
# Run hot-reload functionality tests
node scripts/test-css-hot-reload.cjs

# Analyze refresh triggers
node scripts/debug-css-refresh-triggers.cjs
```

## Future Improvements

### Potential Enhancements

1. **CSS Validation:** Real-time CSS syntax validation
2. **Style Diffing:** More granular CSS change detection
3. **Performance Metrics:** Measure re-render reduction
4. **Error Recovery:** Better fallback mechanisms
5. **Developer Tools:** CSS hot-reload debugging panel

### Monitoring

- Track console messages for hot-reload success/failure rates
- Monitor component re-render frequency in development
- Measure CSS update performance improvements
- User feedback on editing experience preservation

## Conclusion

The CSS hot-reload implementation successfully eliminates unnecessary component re-renders when stylesheets are saved, while preserving all existing CSS functionality. This optimization improves the user experience by maintaining editing state and reducing visual disruption during CSS updates.

**Key Achievements:**

- ✅ Eliminated full component refreshes on CSS save
- ✅ Preserved user editing state during CSS updates
- ✅ Maintained all existing CSS class functionality
- ✅ Improved performance with selective updates
- ✅ Added comprehensive test coverage for regression prevention

The implementation follows React best practices and provides a solid foundation for future CSS editing enhancements.
