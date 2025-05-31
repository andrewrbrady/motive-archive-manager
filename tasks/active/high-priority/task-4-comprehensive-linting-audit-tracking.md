# Comprehensive Linting Audit - File Tracking

## STATUS LEGEND

- ✅ **COMPLETED** - All violations in file resolved
- 🔄 **IN PROGRESS** - Currently being worked on
- ❌ **TODO** - Needs attention (has violations)
- ⚠️ **NEEDS REVIEW** - Complex violations requiring review
- 🚫 **SKIP** - Intentionally not fixed (external libraries, etc.)

## PROGRESS SUMMARY

- **Total Violations:** 638 across ~219 files
- **Completed:** 0 (0%)
- **Phase 1 (NUCLEAR AUTH):** 0/67 files (0%)
- **Phase 2 (Console):** 0/55 files (0%)
- **Phase 3 (Hook Deps):** 0/97 files (0%)
- **Phase 4 (Hook Rules):** 0/40 files (0%)

---

## PHASE 1: NUCLEAR AUTH VIOLATIONS (67 files, 165 violations) ❌

**Priority: ⚠️ CRITICAL SECURITY**

### **High-Priority Files (Multiple Violations)**

❌ `src/app/hard-drives/[id]/page.tsx` (5 violations)
❌ `src/components/calendar/MotiveCalendar.tsx` (4 violations)  
❌ `src/components/cars/CarCard.tsx` (3 violations)
❌ `src/app/cars/[id]/events/page.tsx` (3 violations)
❌ `src/components/cars/CarGalleries.tsx` (3 violations)
❌ `src/components/cars/CarImageEditor.tsx` (3 violations)
❌ `src/components/calendar/FullCalendar.tsx` (3 violations)

### **Medium-Priority Files (2 violations each)**

❌ `src/app/galleries/[id]/page.tsx` (2 violations)
❌ `src/app/clients/[id]/page.tsx` (2 violations)
❌ `src/components/cars/CalendarTab.tsx` (2 violations)
❌ `src/components/cars/CanvasExtensionModal.tsx` (2 violations)
❌ `src/components/cars/CarTabs.tsx` (2 violations)

### **Single Violation Files**

❌ `src/app/cars/[id]/inspections/[inspectionId]/edit/page.tsx` (1 violation)
❌ `src/app/cars/[id]/inspections/[inspectionId]/page.tsx` (1 violation)
❌ `src/app/contacts/ContactsPageClient.tsx` (1 violation)
❌ `src/app/dashboard/page.tsx` (1 violation)
❌ `src/app/documents/page.tsx` (1 violation)
❌ `src/app/inventory/[id]/page.tsx` (1 violation)
❌ `src/app/users/[id]/page.tsx` (1 violation)
❌ `src/components/cars/CarCopywriter.tsx` (1 violation)

**[Additional files to be listed in full audit...]**

---

## PHASE 2: CONSOLE STATEMENT VIOLATIONS (55 files, 235 violations) ❌

**Priority: 🟡 PRODUCTION CLEANLINESS**

### **Files with Multiple Console Statements**

❌ `src/app/cars/CarsPageClient.tsx` (4+ console statements)
❌ `src/components/cars/[specific files to be audited]`
❌ `src/components/galleries/[specific files to be audited]`

**[Full list to be populated during detailed audit...]**

---

## PHASE 3: REACT HOOK DEPENDENCY VIOLATIONS (97 files, 142 violations) ❌

**Priority: 🟠 FUNCTIONAL RELIABILITY**

### **Common Patterns to Fix**

❌ `useEffect(() => { fetchData(); }, [])` - Missing fetchData dependency
❌ `useEffect(() => { update(); }, [state])` - Missing function dependencies
❌ Missing useCallback for functions passed to dependencies

### **Files Needing Hook Dependency Fixes**

❌ `src/app/admin/EventTypeSettingsContent.tsx` (missing fetchEventTypeSettings)
❌ `src/app/admin/ImageAnalysisPromptsContent.tsx` (missing fetchPrompts)
❌ `src/app/admin/LengthSettingsContent.tsx` (missing fetchLengthSettings)
❌ `src/app/admin/MakesContent.tsx` (missing fetchMakes)
❌ `src/app/admin/PlatformSettingsContent.tsx` (missing fetchPlatformSettings)
❌ `src/app/admin/SystemPromptsContent.tsx` (missing fetchSystemPrompts)
❌ `src/components/cars/CarCopywriter.tsx` (missing promptHandlers)

**[Full list of 97 files to be populated...]**

---

## PHASE 4: REACT HOOK RULES VIOLATIONS (40 files, 74 violations) ❌

**Priority: 🔴 REACT COMPLIANCE**

### **Common Violations**

❌ Hooks called conditionally
❌ Hooks called in loops
❌ Hooks called in nested functions
❌ Early returns before hook calls

**[Specific files to be identified...]**

---

## IMPLEMENTATION PATTERNS

### **NUCLEAR AUTH Pattern**

```typescript
// BEFORE (❌ Violation)
const response = await fetch("/api/endpoint", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

// AFTER (✅ Fixed)
import { useAPI } from "@/hooks/useAPI";

const Component = () => {
  const api = useAPI();

  const fetchData = async () => {
    try {
      const response = await api.get("endpoint");
      // Handle success
    } catch (error) {
      // Handle error
      toast.error("Failed to fetch data");
    }
  };
};
```

### **Console Cleanup Pattern**

```typescript
// BEFORE (❌ Violation)
console.log("Debug:", data);
console.error("Error:", error);

// AFTER (✅ Fixed)
// Option 1: Remove entirely
// console.log("Debug:", data);

// Option 2: Development only
if (process.env.NODE_ENV === "development") {
  console.log("Debug:", data);
}

// Option 3: Replace with proper logging
import { logger } from "@/lib/logger";
logger.debug("Debug:", data);
```

### **Hook Dependencies Pattern**

```typescript
// BEFORE (❌ Violation)
const fetchData = async () => {
  /* logic */
};

useEffect(() => {
  fetchData();
}, []); // Missing fetchData

// AFTER (✅ Fixed)
const fetchData = useCallback(async () => {
  /* logic */
}, [dependency1, dependency2]);

useEffect(() => {
  fetchData();
}, [fetchData]); // Include fetchData
```

---

## VALIDATION COMMANDS

```bash
# Check specific file
npx eslint src/path/to/file.tsx --format=compact

# Check specific violation type
npx eslint --ext .ts,.tsx src/ --format=compact | grep "NUCLEAR AUTH"
npx eslint --ext .ts,.tsx src/ --format=compact | grep "no-console"
npx eslint --ext .ts,.tsx src/ --format=compact | grep "react-hooks/exhaustive-deps"

# Get total count
npx eslint --ext .ts,.tsx src/ --format=compact | wc -l

# Test commit (after fixes)
git add . && git commit -m "test: linting fixes"
```

---

## CURRENT PHASE: PHASE 1 - NUCLEAR AUTH

### **Next Batch (Top 5 Files):**

🔄 **START HERE:**

1. `src/app/hard-drives/[id]/page.tsx` (5 violations) - ⚠️ CRITICAL
2. `src/components/calendar/MotiveCalendar.tsx` (4 violations) - ⚠️ HIGH
3. `src/components/cars/CarCard.tsx` (3 violations) - ⚠️ HIGH
4. `src/app/cars/[id]/events/page.tsx` (3 violations) - ⚠️ HIGH
5. `src/components/cars/CarGalleries.tsx` (3 violations) - ⚠️ HIGH

### **Implementation Steps per File:**

1. ✅ **Analyze** - Run eslint on specific file
2. ✅ **Import** - Add `import { useAPI } from '@/hooks/useAPI';`
3. ✅ **Hook** - Add `const api = useAPI();` in component
4. ✅ **Replace** - Convert fetch calls to api methods
5. ✅ **Remove** - Delete manual Authorization headers
6. ✅ **Test** - Verify functionality works
7. ✅ **Validate** - Run eslint to confirm fixes

---

## SUCCESS METRICS

- ✅ **Primary Goal:** 0 linting violations
- ✅ **Security Goal:** 0 NUCLEAR AUTH violations
- ✅ **Quality Goal:** 0 console statements in production
- ✅ **Performance Goal:** All React hooks properly optimized
- ✅ **Process Goal:** Clean commits without `--no-verify`

---

**Last Updated:** January 2, 2025  
**Current Focus:** Phase 1 - NUCLEAR AUTH security violations  
**Next Target:** `src/app/hard-drives/[id]/page.tsx` (5 violations)
