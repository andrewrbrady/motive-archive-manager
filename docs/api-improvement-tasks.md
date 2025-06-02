# API IMPROVEMENT TASKS

_Generated: January 2025_

## 📋 **PHASE 1: CRITICAL FIXES** (1-2 days)

### 🚨 **TASK 1.1: Fix Projects Primary Image Loading**

**Priority**: CRITICAL  
**Estimated Time**: 2-3 hours  
**Files**: `/src/app/api/projects/route.ts` (lines 387-443)

**Issue**: Projects page shows fallback images instead of primary images
**Root Cause**: Aggregation pipeline has type conversion issues in $cond logic

**Steps**:

1. Copy aggregation pattern from `/src/app/api/cars/list/route.ts` lines 28-89
2. Replace Projects API aggregation pipeline (lines 387-443)
3. Add proper ObjectId validation like Cars API
4. Test with existing projects that have primaryImageId

**Success Criteria**:

- Projects page displays actual images instead of fallback
- No console errors in browser network tab
- API returns primaryImageUrl field populated

---

### 🚨 **TASK 1.2: Add Authentication to Cars Main Route**

**Priority**: CRITICAL  
**Estimated Time**: 30 minutes  
**Files**: `/src/app/api/cars/route.ts`

**Issue**: Main cars route has no authentication while other routes do
**Security Risk**: Unprotected data access

**Steps**:

1. Import `verifyAuthMiddleware` from `@/lib/firebase-auth-middleware`
2. Add auth check at start of GET function
3. Add auth check at start of POST function
4. Follow pattern from `/src/app/api/cars/simple/route.ts` lines 17-22

**Success Criteria**:

- Unauthenticated requests return 401
- Authenticated requests work normally
- Consistent with other API routes

---

### 🚨 **TASK 1.3: Add Pagination to Events API**

**Priority**: HIGH  
**Estimated Time**: 1-2 hours  
**Files**: `/src/app/api/events/route.ts`

**Issue**: No pagination - scalability blocker
**Current State**: Returns all events (60 lines total)

**Steps**:

1. Add pagination parameters like other APIs
2. Implement skip/limit logic
3. Add total count for pagination metadata
4. Follow pattern from `/src/app/api/projects/route.ts` lines 333-345

**Success Criteria**:

- API supports page/limit parameters
- Returns pagination metadata
- Handles large event datasets efficiently

---

## 📋 **PHASE 2: CONSISTENCY IMPROVEMENTS** (3-5 days)

### 📝 **TASK 2.1: Standardize Error Response Format**

**Priority**: MEDIUM  
**Estimated Time**: 2-3 hours  
**Files**: Multiple API routes

**Issue**: Inconsistent error formats across APIs
**Current State**: Mix of formats { error }, { success: false }, etc.

**Steps**:

1. Create standard error interface in `/src/types/api.ts`
2. Update all API routes to use consistent format
3. Update frontend error handling to match

**Target Format**:

```typescript
interface StandardError {
  error: string;
  details?: string;
  code?: string;
  status: number;
}
```

**Files to Update**:

- `/src/app/api/events/route.ts`
- `/src/app/api/deliverables/route.ts`
- Various other API routes

---

### 📝 **TASK 2.2: Add Authentication to Deliverables API**

**Priority**: MEDIUM  
**Estimated Time**: 30 minutes  
**Files**: `/src/app/api/deliverables/route.ts`

**Issue**: No authentication middleware
**Security Risk**: Unprotected deliverables data

**Steps**:

1. Add `verifyAuthMiddleware` to GET and POST functions
2. Follow established pattern from other APIs
3. Test with authenticated/unauthenticated requests

---

### 📝 **TASK 2.3: Add Image Support to Events API**

**Priority**: MEDIUM  
**Estimated Time**: 2-3 hours  
**Files**: `/src/app/api/events/route.ts`

**Issue**: Events have no image loading support
**Missing**: Primary image aggregation pipeline

**Steps**:

1. Add includeImages query parameter
2. Implement image lookup aggregation
3. Use Cars List API pattern as reference
4. Update frontend to handle event images

---

## 📋 **PHASE 3: OPTIMIZATION** (1 week)

### ⚡ **TASK 3.1: Consolidate Cars API Routes**

**Priority**: LOW  
**Estimated Time**: 4-6 hours  
**Files**: `/src/app/api/cars/route.ts`, `/src/app/api/cars/simple/route.ts`

**Issue**: Duplicate logic across multiple Cars API routes
**Goal**: Single, well-designed Cars API endpoint

**Steps**:

1. Analyze differences between routes
2. Merge best features into main route
3. Deprecate redundant endpoints
4. Update frontend calls

---

### ⚡ **TASK 3.2: Optimize Deliverables Query Performance**

**Priority**: LOW  
**Estimated Time**: 3-4 hours  
**Files**: `/src/app/api/deliverables/route.ts`

**Issue**: Multiple separate database queries instead of aggregation
**Current State**: 246 lines with complex manual joining

**Steps**:

1. Convert to single aggregation pipeline
2. Reduce database round trips
3. Optimize car relationship lookups
4. Add performance monitoring

---

### ⚡ **TASK 3.3: Implement Caching Strategy**

**Priority**: LOW  
**Estimated Time**: 2-3 days  
**Files**: Multiple API routes

**Issue**: No caching on frequently accessed data
**Goal**: Improve response times and reduce database load

**Steps**:

1. Identify cacheable endpoints
2. Implement Redis/memory caching
3. Add cache invalidation logic
4. Monitor cache hit rates

---

## 📋 **TESTING TASKS**

### 🧪 **TASK T.1: Create API Test Suite**

**Priority**: MEDIUM  
**Estimated Time**: 1 day  
**Files**: `scripts/api-tests/`

**Goal**: Automated testing for all API improvements

**Steps**:

1. Create baseline tests for current state
2. Add tests for each fixed issue
3. Integrate with CI/CD pipeline
4. Add performance benchmarks

---

### 🧪 **TASK T.2: Add Monitoring and Logging**

**Priority**: MEDIUM  
**Estimated Time**: 2-3 hours  
**Files**: Multiple API routes

**Goal**: Better visibility into API performance and errors

**Steps**:

1. Add response time logging
2. Track authentication failure rates
3. Monitor image loading success rates
4. Set up error rate alerts

---

## 🎯 **IMPLEMENTATION ORDER**

**Week 1**: Phase 1 Critical Fixes (Tasks 1.1, 1.2, 1.3)
**Week 2**: Phase 2 Consistency (Tasks 2.1, 2.2, 2.3)  
**Week 3**: Testing Implementation (Tasks T.1, T.2)
**Week 4**: Phase 3 Optimization (Tasks 3.1, 3.2, 3.3)

---

## 📁 **RELATED FILES**

- **Audit Report**: `docs/api-audit-2025.md`
- **Progress Tracker**: `docs/api-improvement-tracker.md`
- **Test Scripts**: `scripts/api-tests/`

---

## 🔍 **REFERENCE IMPLEMENTATIONS**

- **Best Authentication Pattern**: `/src/app/api/projects/route.ts` lines 305-320
- **Best Image Loading**: `/src/app/api/cars/list/route.ts` lines 28-89
- **Best Pagination**: `/src/app/api/projects/route.ts` lines 333-345
- **Best Error Handling**: `/src/lib/firebase-auth-middleware.ts` lines 144-270
