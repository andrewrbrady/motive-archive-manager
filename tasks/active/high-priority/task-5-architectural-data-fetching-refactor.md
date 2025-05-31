# Task 5: Architectural Data Fetching Refactor

## 🎯 **OBJECTIVE**

Systematically fix critical architectural data fetching issues discovered during the linting audit that are causing poor site performance. These issues are more impactful than lint violations and should be prioritized for maximum performance gains.

## 📊 **CURRENT STATUS**

- **Waterfall Patterns:** 20+ components doing sequential API calls
- **NUCLEAR AUTH Files:** 67 files still using direct fetch() calls
- **useEffect Dependency Issues:** 142 violations causing re-render loops
- **N+1 Query Problems:** 5+ components with database query inefficiencies
- **Over-Fetching:** 10+ API routes fetching unnecessary data

## 🚨 **IMPACT ANALYSIS**

**Current Performance Issues:**

- **API Response Times:** 200-800ms (mostly uncached)
- **Page Load Times:** 3-8 seconds
- **Database Queries:** 50-100+ per page load
- **Bundle Size:** 2-3MB initial (multiple data fetching libraries)

**Expected After Fixes:**

- **API Response Times:** 50-200ms (cached + optimized)
- **Page Load Times:** 1-2 seconds
- **Database Queries:** 5-15 per page load
- **Bundle Size:** 500KB-1MB (unified patterns)

## 📋 **IMPLEMENTATION PHASES**

### **Phase 1: Critical Waterfall Fixes (Week 1)**

**Target:** Fix 5 highest-impact waterfall patterns for immediate 60-80% performance improvement

**Priority Files:**

1. `useProjectData.ts` - 6 sequential useEffect calls
2. `CarCopywriter.tsx` - 5 sequential useEffect calls
3. `EventsContent.tsx` - N+1 query pattern
4. `CarsPageClient.tsx` - 3 separate API calls on filter change
5. `CarGalleries.tsx` - Inefficient search debouncing

**Implementation Pattern:**

```typescript
// ❌ Before: Sequential fetching (525ms)
useEffect(() => {
  fetchA();
}, []);
useEffect(() => {
  fetchB();
}, []);
useEffect(() => {
  fetchC();
}, []);

// ✅ After: Parallel fetching (~200ms)
useEffect(() => {
  Promise.all([fetchA(), fetchB(), fetchC()]);
}, []);
```

### **Phase 2: NUCLEAR AUTH Migration (Week 2)**

**Target:** Migrate remaining 67 files from direct fetch() to useAPI() pattern

**Priority Order:**

1. High-traffic components (cars, galleries, projects)
2. Admin interfaces with security implications
3. Utility components and modals

### **Phase 3: useEffect → useAPIQuery Migration (Week 3)**

**Target:** Replace custom useEffect patterns with React Query for better caching

**Implementation Pattern:**

```typescript
// ❌ Before: Manual state management
const [data, setData] = useState(null);
const fetchData = useCallback(async () => {
  /* logic */
}, [deps]);
useEffect(() => {
  fetchData();
}, [fetchData]);

// ✅ After: React Query with caching
const { data, isLoading, error } = useAPIQuery("/endpoint", {
  staleTime: 5 * 60 * 1000, // 5 minute cache
});
```

### **Phase 4: API Route Optimization (Week 4)**

**Target:** Add field selection, caching, and batch endpoints

1. Add field selection to major API routes
2. Implement result caching for static data
3. Create batch endpoints for N+1 scenarios
4. Add database indexes for common queries

## 🔄 **CURRENT PRIORITY: PHASE 1 - WATERFALL FIXES**

### **Immediate Next Steps (Stage 1 - This Week):**

**Target Files (2-3 for manageable implementation):**

1. ✅ **`src/components/projects/caption-generator/useProjectData.ts`** - **COMPLETED**

   - **Issue:** 6 separate useEffect calls creating 300ms+ delay
   - **Fix:** ✅ Combined into parallel Promise.all() calls
   - **Expected Impact:** ~300ms → ~100ms load time
   - **Implementation:** Consolidated 6 useEffect calls into single parallel fetch with console.time logging

2. ✅ **`src/components/cars/CarCopywriter.tsx`** - **COMPLETED**

   - **Issue:** 5 sequential useEffect calls + 1 NUCLEAR AUTH violation
   - **Fix:** ✅ Parallel fetching + migrated to useAPI()
   - **Expected Impact:** ~400ms → ~150ms load time
   - **Implementation:** Fixed 5 waterfall useEffect calls + removed manual Authorization header

3. 🚀 **`src/components/schedule/EventsContent.tsx`** - **NEXT TARGET**
   - **Issue:** N+1 queries (1 + N car fetches)
   - **Fix:** Batch car fetching or server-side joins
   - **Expected Impact:** 20+ queries → 2 queries

### **Implementation Guidelines:**

1. **Maintain Existing APIs** - Don't break existing endpoints
2. **Preserve Functionality** - Ensure all features continue working
3. **Add Error Handling** - Improve error states with parallel fetching
4. **Validate Performance** - Measure before/after load times
5. **Test Authentication** - Ensure useAPI() migration preserves auth

## ✅ **SUCCESS CRITERIA**

### **Phase 1 Complete When:**

- ✅ Target files load 50%+ faster
- ✅ No increase in error rates
- ✅ All existing functionality preserved
- ✅ Console shows parallel vs sequential timing logs
- ✅ No new lint violations introduced

### **Overall Project Complete When:**

- ✅ All pre-commit hooks pass
- ✅ Page load times under 2 seconds
- ✅ API response times under 200ms average
- ✅ Database queries reduced by 50%+
- ✅ No NUCLEAR AUTH violations remain

## 🔧 **TOOLS & COMMANDS**

### **Performance Measurement:**

```bash
# Before changes - measure baseline
curl -w "@curl-format.txt" http://localhost:3000/api/projects/[id]

# After changes - compare performance
curl -w "@curl-format.txt" http://localhost:3000/api/projects/[id]

# Browser performance
# Open DevTools → Network → Disable cache → Measure page load
```

### **Validation Commands:**

```bash
# Ensure no new lint violations
npx eslint src/components/projects/caption-generator/useProjectData.ts
npx eslint src/components/cars/CarCopywriter.tsx
npx eslint src/components/schedule/EventsContent.tsx

# Test authentication still works
npm run dev
# Navigate to /cars/[id]?tab=captions and verify auth
```

## 📝 **TRACKING WORKFLOW**

### **Documentation Structure:**

- **Main Tracking:** This document - High-level progress and priorities
- **Detailed Tracking:** `task-5-architectural-data-fetching-tracking.md` - File-by-file checklist
- **Session Log:** `tasks/logs/architectural-refactor-session-log.md` - Implementation details
- **Completion Records:** `tasks/completed/architectural-refactor-phase-[X]-completed.md`

### **Progress Tracking:**

1. **Implementation**: Use detailed tracking document for current file priorities
2. **Logging**: Record performance measurements and patterns in log file
3. **Progress**: Update completion counters in main tracking document
4. **Validation**: Measure performance before/after each file

## 📊 **PROGRESS SUMMARY**

### **Phase 1: Critical Waterfall Fixes**

- **Target:** 5 files with waterfall patterns
- **Status:** 🔄 **READY TO START**
- **Priority:** ⚠️ **CRITICAL**
- **Expected Impact:** 60-80% performance improvement

### **Phase 2: NUCLEAR AUTH Migration**

- **Target:** 67 files with direct fetch() calls
- **Status:** ⏳ **PENDING PHASE 1**
- **Priority:** 🔴 **HIGH SECURITY**

### **Phase 3: useAPIQuery Migration**

- **Target:** 50+ files with useEffect patterns
- **Status:** ⏳ **PENDING PHASE 2**
- **Priority:** 🟠 **MEDIUM PERFORMANCE**

### **Phase 4: API Route Optimization**

- **Target:** 10+ API routes needing optimization
- **Status:** ⏳ **PENDING PHASE 3**
- **Priority:** 🟡 **LONG-TERM PERFORMANCE**

---

## 📋 **QUICK REFERENCE**

- **Next Action:** Start Phase 1 - Fix waterfall patterns in 3 target files
- **Implementation Pattern:** Sequential useEffect → Parallel Promise.all()
- **Validation:** Measure load times before/after with DevTools
- **Documentation:** Update tracking documents with performance metrics

**🎯 Objective:** Achieve 60-80% performance improvement through architectural fixes\*\*

---

**Last Updated:** January 2, 2025  
**Current Focus:** Phase 1 - Critical waterfall pattern fixes  
**Next Target:** `useProjectData.ts` (6 sequential useEffect calls)
