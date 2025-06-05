# SSR Migration Task Assignments

## 📋 Work Distribution Strategy

### How to Use This Document:
1. **Assign one agent per task** listed below
2. **Copy the generic instructions** from `SSR_MIGRATION_INSTRUCTIONS.md`
3. **Replace `[SPECIFIC_PAGE_ASSIGNMENT]`** with the specific assignment from below
4. **Each agent creates their own branch** following the naming convention

---

## 🟢 PHASE 1: Quick Wins (Week 1-2)
*Simple pages with straightforward data structures*

### Assignment 1: Locations Page
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-locations`**
**Files to modify:**
- `src/app/locations/page.tsx` (create new server component)
- `src/app/locations/LocationsClient.tsx` (modify existing)
- `src/lib/server/fetchLocations.ts` (create new)

**Current implementation:** `src/app/locations/LocationsClient.tsx`
**Complexity:** 🟢 Low
**API endpoint:** `/api/locations`
**Estimated time:** 1-2 days

### Assignment 2: Contacts Page  
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-contacts`**
**Files to modify:**
- `src/app/contacts/page.tsx` (create new server component)
- `src/app/contacts/ContactsPageClient.tsx` (modify existing)
- `src/lib/server/fetchContacts.ts` (create new)

**Current implementation:** `src/app/contacts/ContactsPageClient.tsx`
**Complexity:** 🟢 Low
**API endpoint:** `/api/contacts`
**Estimated time:** 1-2 days

### Assignment 3: Clients List Page
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-clients-list`**
**Files to modify:**
- `src/app/clients/page.tsx` (create new server component)
- `src/components/clients/ClientsTable.tsx` (modify to receive props)
- `src/lib/server/fetchClients.ts` (create new)

**Current implementation:** `src/components/clients/ClientsTable.tsx`
**Complexity:** 🟢 Low
**API endpoint:** `/api/clients`
**Estimated time:** 1-2 days

---

## 🟡 PHASE 2: Medium Complexity (Week 3-4)
*Pages with filtering logic and moderate complexity*

### Assignment 4: Cars Collection Page
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-cars`**
**Files to modify:**
- `src/app/cars/page.tsx` (modify existing server component)
- `src/app/cars/CarsPageClient.tsx` (major refactor)
- `src/lib/server/fetchCarsWithFilters.ts` (create new)

**Current implementation:** `src/app/cars/page.tsx` + `CarsPageClient.tsx`
**Complexity:** 🟡 Medium
**API endpoints:** `/api/cars/simple`, `/api/cars/makes`, `/api/clients`
**Special notes:** Already has server structure, needs filtering implementation
**Estimated time:** 2-3 days

### Assignment 5: Client Details Pages
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-client-details`**
**Files to modify:**
- `src/app/clients/[id]/page.tsx` (major refactor)
- `src/lib/server/fetchClientDetails.ts` (create new)

**Current implementation:** `src/app/clients/[id]/page.tsx`
**Complexity:** 🟡 Medium
**API endpoints:** `/api/clients/${id}`, `/api/clients/${id}/cars`
**Special notes:** Sequential to parallel API calls
**Estimated time:** 1-2 days

### Assignment 6: Images Gallery (Initial Load Only)
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-images`**
**Files to modify:**
- `src/app/images/page.tsx` (create new server component)  
- `src/app/images/ImagesClient.tsx` (modify to receive initial data)
- `src/lib/server/fetchImages.ts` (create new)

**Current implementation:** `src/app/images/ImagesClient.tsx`
**Complexity:** 🟡 Medium
**API endpoints:** Uses SWR hook `useImages`
**Special notes:** Keep SWR for infinite scroll, SSR for initial load
**Estimated time:** 2-3 days

---

## 🔴 PHASE 3: High Complexity (Week 5-8)
*Complex pages requiring careful planning*

### Assignment 7: Projects Page
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-projects`**
**Files to modify:**
- `src/app/projects/page.tsx` (complete rewrite)
- `src/app/projects/ProjectsClient.tsx` (create new)
- `src/lib/server/fetchProjects.ts` (create new)

**Current implementation:** `src/app/projects/page.tsx` (entirely client-side)
**Complexity:** 🔴 High
**API endpoints:** `/api/projects?includeImages=true`
**Special notes:** Complex image loading, needs primary image server-side
**Estimated time:** 3-4 days

### Assignment 8: Dashboard Page
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-dashboard`**
**Files to modify:**
- `src/app/dashboard/page.tsx` (major refactor)
- `src/app/dashboard/DashboardClient.tsx` (create new)
- `src/lib/server/fetchDashboardData.ts` (create new)

**Current implementation:** `src/app/dashboard/page.tsx`
**Complexity:** 🔴 High
**API endpoints:** `/api/deliverables` with complex filtering
**Special notes:** Authentication-dependent, user-specific data
**Estimated time:** 3-4 days

### Assignment 9: Deliverables Page (Hybrid Approach)
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-deliverables`**
**Files to modify:**
- `src/app/deliverables/page.tsx` (modify to provide initial data)
- `src/components/deliverables/DeliverablesList.tsx` (hybrid approach)
- `src/lib/server/fetchDeliverables.ts` (create new)

**Current implementation:** `src/components/deliverables/DeliverablesList.tsx`
**Complexity:** 🔴 High
**API endpoints:** `/api/deliverables` with many query parameters
**Special notes:** Keep real-time updates, SSR initial load only
**Estimated time:** 4-5 days

### Assignment 10: Galleries Page
**Agent: `[ASSIGN_AGENT_NAME]`**
**Branch: `ssr-migration-galleries`**
**Files to modify:**
- `src/app/galleries/page.tsx` (create new server component)
- `src/app/galleries/GalleriesClient.tsx` (modify existing)
- `src/lib/server/fetchGalleries.ts` (create new)

**Current implementation:** `src/app/galleries/GalleriesClient.tsx`
**Complexity:** 🟡 Medium
**API endpoints:** Uses `use-galleries.ts` hook
**Special notes:** Replace SWR with server-side initial load
**Estimated time:** 2-3 days

---

## 📋 Assignment Template

When assigning work, copy this template:

```
ASSIGNMENT: [Page Name] SSR Migration

AGENT: [Agent Name]
BRANCH: ssr-migration-[page-name]
COMPLEXITY: [Low/Medium/High]
ESTIMATED TIME: [X days]

INSTRUCTIONS:
1. Read SSR_MIGRATION_INSTRUCTIONS.md
2. Replace [SPECIFIC_PAGE_ASSIGNMENT] with: "[Page Name] Page Migration"
3. Follow the step-by-step process
4. Test thoroughly using the quality checklist
5. Submit PR with title: "SSR Migration: [Page Name]"

CURRENT FILES TO STUDY:
- [List current implementation files]

NEW FILES TO CREATE:
- [List new files needed]

API ENDPOINTS TO MIGRATE:
- [List current API calls]

SPECIAL CONSIDERATIONS:
- [Any specific notes or challenges]
```

---

## 🚦 Coordination Rules

### Before Starting Work:
1. **Claim your assignment** in team chat/project management tool
2. **Create your branch** immediately after claiming
3. **Read the analysis report** for your specific page
4. **Study the reference implementation** (`/inventory` page)

### During Development:
1. **Stick to your assigned files** - don't modify other pages
2. **Ask questions early** if you encounter complex issues
3. **Test frequently** to catch issues early
4. **Follow the quality checklist** strictly

### Before Submitting:
1. **Test all functionality** on your branch
2. **Run Lighthouse audit** for performance validation
3. **Ensure no console errors**
4. **Document any discovered issues**

### Merge Conflicts Prevention:
- Each assignment works on different files
- If you need to modify shared utilities, coordinate with team
- Pull from main regularly to stay updated

---

## 📊 Progress Tracking

Update this section as work progresses:

- [ ] Assignment 1: Locations Page - **Status: [Not Started/In Progress/Ready for Review/Complete]**
- [ ] Assignment 2: Contacts Page - **Status: [Not Started/In Progress/Ready for Review/Complete]**  
- [ ] Assignment 3: Clients List Page - **Status: [Not Started/In Progress/Ready for Review/Complete]**
- [ ] Assignment 4: Cars Collection Page - **Status: [Not Started/In Progress/Ready for Review/Complete]**
- [ ] Assignment 5: Client Details Pages - **Status: [Not Started/In Progress/Ready for Review/Complete]**
- [ ] Assignment 6: Images Gallery - **Status: [Not Started/In Progress/Ready for Review/Complete]**
- [ ] Assignment 7: Projects Page - **Status: [Not Started/In Progress/Ready for Review/Complete]**
- [ ] Assignment 8: Dashboard Page - **Status: [Not Started/In Progress/Ready for Review/Complete]**
- [ ] Assignment 9: Deliverables Page - **Status: [Not Started/In Progress/Ready for Review/Complete]**
- [ ] Assignment 10: Galleries Page - **Status: [Not Started/In Progress/Ready for Review/Complete]**

---

**📞 Questions or Issues?**
- Tag the team lead in your PR
- Use project management tool for coordination
- Reference the main analysis report for context