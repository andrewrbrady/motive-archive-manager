# React Hooks Order Error Audit Instructions

## Overview

This document provides detailed instructions for auditing and fixing React hooks order errors across the codebase. This audit addresses components with early returns that occur before all hooks are called, which violates the Rules of Hooks and causes runtime errors.

## Problem Pattern

**Error Signature**: `Error: React has detected a change in the order of Hooks called by [ComponentName]`

**Root Cause**: Components that:

1. Use the `useAPI()` hook
2. Have early returns based on `if (!api) return null/jsx`
3. Call additional hooks AFTER the early return
4. This creates conditional hook calls, violating React's Rules of Hooks

## Search Patterns

### 1. File Discovery

- **Primary Pattern**: `grep -r "useAPI" src/components --include="*.tsx"`
- **Secondary Pattern**: `grep -r "if (!api)" src/components --include="*.tsx"`
- **Target Directories**:
  - `src/components/**/*.tsx`
  - `src/app/**/*.tsx` (page components)
  - Any file importing `useAPI` hook

### 2. Code Pattern Identification

Look for this specific pattern:

```typescript
export function ComponentName() {
  const api = useAPI();
  const [someState, setSomeState] = useState(); // ✅ Good - hook before return

  // ❌ PROBLEM: Early return here
  if (!api) {
    return null;
  }

  // ❌ PROBLEM: More hooks after early return
  const { data } = useCustomHook();
  const memoValue = useMemo(() => {...}, []);
  useEffect(() => {...}, []);
}
```

## Fix Strategy

### Step 1: Move ALL Hooks Before Conditional Returns

```typescript
export function ComponentName() {
  // ✅ ALL hooks first
  const api = useAPI();
  const [someState, setSomeState] = useState();
  const { data } = useCustomHook();
  const memoValue = useMemo(() => {...}, []);

  // ✅ useEffect with conditional logic inside
  useEffect(() => {
    if (!api) return; // ✅ Conditional check inside hook
    // ... effect logic
  }, [api]); // ✅ Add api to dependencies

  // ✅ Authentication guard at END
  if (!api) {
    return null;
  }

  // Rest of component logic...
}
```

### Step 2: Handle Async Functions

Add conditional checks inside async functions:

```typescript
const handleAsyncFunction = async () => {
  if (!api) return; // ✅ Guard clause
  // ... async logic using api
};
```

### Step 3: Update Dependencies

- Add `api` to dependency arrays where conditional checks are used
- Ensure all dependencies are properly declared

## Verification Process

### During Fix

1. **Visual Check**: Ensure all hooks are called before any conditional returns
2. **Console Check**: No "hooks order" errors in browser console
3. **Functionality Check**: Component still behaves correctly

### Testing Checklist

- [ ] Component renders without console errors
- [ ] All hooks are called in the same order every render
- [ ] Authentication guard is at the end of the hook section
- [ ] Async functions have proper api checks
- [ ] useEffect dependencies include `api` where needed

## Common Variations

### Pattern A: Simple Early Return

```typescript
// ❌ Before
if (!api) return null;
const data = useMemo(() => {...}, []);

// ✅ After
const data = useMemo(() => {...}, []);
if (!api) return null;
```

### Pattern B: Complex Component with Multiple Hooks

```typescript
// ✅ Correct structure
const api = useAPI();
const [state1, setState1] = useState();
const [state2, setState2] = useState();
const { customHook } = useCustomHook();
const memoValue = useMemo(() => {...}, []);
const router = useRouter();

useEffect(() => {
  if (!api) return;
  // logic here
}, [api]);

if (!api) return <LoadingSpinner />;
```

### Pattern C: useEffect with API Dependencies

```typescript
useEffect(() => {
  if (!api) return; // ✅ Check inside effect

  const fetchData = async () => {
    const result = await api.get("/endpoint");
    // handle result
  };

  fetchData();
}, [api]); // ✅ Include api in dependencies
```

## Quality Assurance

### Code Review Checklist

- [ ] All `useAPI()` calls are at the top of the component
- [ ] No hooks are called after conditional returns
- [ ] Authentication guards are at the end of the hook declarations
- [ ] All async functions have api null checks
- [ ] Dependencies arrays are updated appropriately

### File Completion Criteria

A file is considered "complete" when:

1. ✅ All hooks are called before any conditional returns
2. ✅ No console errors related to hooks order
3. ✅ Component functionality is preserved
4. ✅ Code follows the established pattern

## References

- [React Rules of Hooks](https://reactjs.org/docs/hooks-rules.html)
- [useAPI Hook Documentation](src/hooks/useAPI.ts)
- [Authentication Pattern Documentation](AUTH_FIXES.md)
