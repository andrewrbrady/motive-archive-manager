# Client-Side Authentication Systematic Fixes - MISSION CRITICAL

## 🎯 **OBJECTIVE**

Systematically fix all 361 files identified in the authentication audit to use proper Firebase Auth patterns instead of problematic useAPI() hooks or plain fetch() calls.

## 📊 **AUDIT RESULTS SUMMARY**

- 🔴 **HIGH Priority: 131 files** (10/11 useAPI files FIXED, 1 needs special handling, 120 fetch files remaining)
- 🟡 **MEDIUM Priority: 133 files** (10/10 import files FIXED, 119 fetch files remaining)
- 🔵 **LOW Priority: 97 files** (Fix for completeness)
- **📁 TOTAL FILES TO REVIEW: 361**

### **CURRENT PROGRESS:**

- ✅ **FIXED: 10/11 useAPI hook files (90.9% complete)**
- ✅ **FIXED: 10/10 useAPI import files (100% complete)**
- ❌ **REMAINING: 1 special case (src/lib/fetcher.ts) + 239 fetch files**

## 🔴 **HIGH PRIORITY FIXES (131 files) - FIX THESE FIRST**

### **Category 1: Files using useAPI hook (11 files)**

**❌ Issue:** Using `useAPI()` hook which throws "Not authenticated" errors
**✅ Solution:** Replace with `useAuthenticatedFetch()` + `useSession()` pattern

**Files to fix:**

1. `src/app/events/page.tsx` ✅ **FIXED**
2. `src/app/projects/[id]/settings/page.tsx` ✅ **FIXED**
3. `src/app/projects/new/page.tsx` ✅ **ALREADY FIXED**
4. `src/app/projects/page.tsx` ✅ **FIXED**
5. `src/components/deliverables/deliverables-tab/hooks/useDeliverables.ts` ✅ **FIXED**
6. `src/components/deliverables/DeliverablesTab.tsx` ✅ **FIXED**
7. `src/components/projects/ProjectGalleriesTab.tsx` ✅ **FIXED**
8. `src/hooks/useUsers.ts` ✅ **ALREADY FIXED**
9. `src/lib/fetcher.ts` ❌ **NEEDS SPECIAL HANDLING**
10. `src/lib/hooks/query/useCars.ts` ✅ **ALREADY FIXED**
11. `src/lib/hooks/query/useGalleries.ts` ✅ **FIXED**

### **Category 2: Files using plain fetch to API endpoints (120 files)**

**❌ Issue:** Using plain `fetch()` calls without Authorization headers
**✅ Solution:** Replace with `authenticatedFetch()` from `useAuthenticatedFetch()` hook

**Files to fix:**

1. `src/app/add-asset/page.tsx`
2. `src/app/admin/AdminTabs.tsx`
3. `src/app/admin/MakesContent.tsx`
4. `src/app/admin/user-details/page.tsx`
5. `src/app/admin/users/[id]/roles/page.tsx`
6. `src/app/api/youtube/videos/route.ts`
7. `src/app/auth/reset-password/[token]/page.tsx`
8. `src/app/cars/CarsPageClient.tsx`
9. `src/app/cars/new/page.tsx`
10. `src/app/cars/test-db.tsx`
11. `src/app/documents/DocumentsClient.tsx`
12. `src/app/hard-drives/[id]/edit/page.tsx`
13. `src/app/hard-drives/new/page.tsx`
14. `src/app/locations/LocationsClient.tsx`
15. `src/app/makes/MakesPageClient.tsx`
16. `src/app/production/raw/import/page.tsx`
17. `src/app/projects/[id]/page.tsx`
18. `src/app/raw/[id]/add-storage/page.tsx`
19. `src/app/raw/[id]/page.tsx`
20. `src/components/admin/PromptForm.tsx`
21. `src/components/admin/YouTubeAuthComponent.tsx`
22. `src/components/BaTListingGenerator.tsx`
23. `src/components/caption-generator/CaptionGenerator.tsx`
24. `src/components/caption-generator/hooks/useCaptionData.ts`
25. `src/components/caption-generator/hooks/useGenerationHandlers.ts`
26. `src/components/CaptionGenerator.tsx`
27. `src/components/cars/CanvasExtensionModal.tsx`
28. `src/components/cars/CarCopywriter.tsx`
29. `src/components/cars/CarEntryForm.tsx`
30. `src/components/cars/CarGridSelector.tsx`
31. `src/components/cars/ImageCropModal.tsx`
32. `src/components/cars/ImageMatteModal.tsx`
33. `src/components/cars/ScriptTemplates.tsx`
34. `src/components/cars/ShotListTemplates.tsx`
35. `src/components/cars/SimpleImageGallery.tsx`
36. `src/components/cars/Specifications.tsx`
37. `src/components/cars/SpecificationsStandalone.tsx`
38. `src/components/clients/CreateClientDialog.tsx`
39. `src/components/common/JsonGenerationModal.tsx`
40. `src/components/contacts/ContactSelector.tsx`
41. `src/components/contacts/CreateContactDialog.tsx`
42. `src/components/copywriting/CarCopywriter.tsx`
43. `src/components/deliverables/BatchDeliverableForm.tsx`
44. `src/components/deliverables/BatchTemplateManager.tsx`
45. `src/components/deliverables/DeliverableAssignment.tsx`
46. `src/components/deliverables/DeliverablesCalendar.tsx`
47. `src/components/deliverables/DeliverablesList.tsx`
48. `src/components/deliverables/NewDeliverableDialog.tsx`
49. `src/components/deliverables/NewDeliverableForm.tsx`
50. `src/components/deliverables/YouTubeUploadHelper.tsx`
51. `src/components/DocumentationFiles.tsx`
52. `src/components/events/EventBatchManager.tsx`
53. `src/components/events/EventBatchTemplates.tsx`
54. `src/components/events/ListView.tsx`
55. `src/components/galleries/GalleryCanvasExtensionModal.tsx`
56. `src/components/galleries/GalleryCropModal.tsx`
57. `src/components/ImageUploader.tsx`
58. `src/components/MarkdownEditor.tsx`
59. `src/components/production/AddContainerModal.tsx`
60. `src/components/production/AddInventoryItemModal.tsx`
61. `src/components/production/AdvancedFilterModal.tsx`
62. `src/components/production/BulkCheckoutModal.tsx`
63. `src/components/production/BulkEditModal.tsx`
64. `src/components/production/CheckoutModal.tsx`
65. `src/components/production/ContainersList.tsx`
66. `src/components/production/ContainersTab.tsx`
67. `src/components/production/CreateHardDriveDialog.tsx`
68. `src/components/production/CreateKitModal.tsx`
69. `src/components/production/CreateScriptTemplateDialog.tsx`
70. `src/components/production/CreateShotListTemplateDialog.tsx`
71. `src/components/production/EditContainerModal.tsx`
72. `src/components/production/EditInventoryItemModal.tsx`
73. `src/components/production/HardDriveDetailsModal.tsx`
74. `src/components/production/HardDriveModal.tsx`
75. `src/components/production/HardDrivesTab.tsx`
76. `src/components/production/ImportInventoryModal.tsx`
77. `src/components/production/ImportRawAssetsModal.tsx`
78. `src/components/production/KitCheckoutModal.tsx`
79. `src/components/production/KitsTab.tsx`
80. `src/components/production/LocationsFilter.tsx`
81. `src/components/production/RawAssetsTab.tsx`
82. `src/components/production/ScriptTemplatesTab.tsx`
83. `src/components/production/shot-list-templates/hooks/useTemplateManager.ts`
84. `src/components/production/shot-list-templates/ImageBrowser.tsx`
85. `src/components/production/StudioInventoryGrid.tsx`
86. `src/components/production/StudioInventoryList.tsx`
87. `src/components/production/StudioInventoryTab.tsx`
88. `src/components/projects/caption-generator/handlers/generationHandlers.ts`
89. `src/components/projects/caption-generator/handlers/promptHandlers.ts`
90. `src/components/projects/caption-generator/useProjectData.ts`
91. `src/components/projects/ProjectDeliverablesTab.tsx`
92. `src/components/projects/ProjectTeamTab.tsx`
93. `src/components/ResearchFiles.tsx`
94. `src/components/ResearchUpload.tsx`
95. `src/components/ResetPasswordForm.tsx`
96. `src/components/SignupForm.tsx`
97. `src/components/ui/CarImageUpload.tsx`
98. `src/components/ui/custom-dropdown.tsx`
99. `src/components/ui/DropboxImageBrowser.tsx`
100. `src/components/ui/team-member-picker.tsx`
101. `src/components/users/CreativeRolesManagement.tsx`
102. `src/components/users/DirectUserSelector.tsx`
103. `src/components/users/FirestoreUserSelector.tsx`
104. `src/components/users/UserForm.tsx`
105. `src/components/users/UserManagement.tsx`
106. `src/components/users/UserRolesManagement.tsx`
107. `src/components/youtube/YoutubeAddChannelDialog.tsx`
108. `src/components/youtube/YoutubeAddCollectionDialog.tsx`
109. `src/components/youtube/YoutubeAddVideoDialog.tsx`
110. `src/components/youtube/YoutubeChannelList.tsx`
111. `src/components/youtube/YoutubeCollectionList.tsx`
112. `src/components/youtube/YoutubeTranscriptPanel.tsx`
113. `src/components/youtube/YoutubeVideoList.tsx`
114. `src/contexts/LabelsContext.tsx`
115. `src/hooks/useFirebaseAuth.ts`
116. `src/hooks/useImageGallery.ts`
117. `src/hooks/useImageUploader.ts`
118. `src/lib/cloudflare.ts`
119. `src/lib/hooks/query/useGalleries.ts`
120. `src/lib/imageAnalyzer.ts`

## 🟡 **MEDIUM PRIORITY FIXES (133 files) - FIX AFTER HIGH PRIORITY**

### **Category 3: Files importing useAPI (10 files)**

**❌ Issue:** Files importing `useAPI` but not currently calling it
**✅ Solution:** Remove unused imports and update any future usage to proper pattern

**Files to fix:**

1. `src/app/events/page.tsx` ✅ **FIXED**
2. `src/app/projects/[id]/settings/page.tsx` ✅ **FIXED**
3. `src/app/projects/new/page.tsx` ✅ **ALREADY FIXED**
4. `src/app/projects/page.tsx` ✅ **FIXED**
5. `src/components/deliverables/deliverables-tab/hooks/useDeliverables.ts` ✅ **FIXED**
6. `src/components/deliverables/DeliverablesTab.tsx` ✅ **FIXED**
7. `src/components/projects/ProjectGalleriesTab.tsx` ✅ **FIXED**
8. `src/hooks/useUsers.ts` ✅ **ALREADY FIXED**
9. `src/lib/hooks/query/useCars.ts` ✅ **ALREADY FIXED**
10. `src/lib/hooks/query/useGalleries.ts` ✅ **FIXED**

### **Category 4: Files using API fetch but missing useAuthenticatedFetch (119 files)**

**❌ Issue:** Files making API calls but don't have `useAuthenticatedFetch` imported
**✅ Solution:** Add `useAuthenticatedFetch` and update all fetch calls

**Files to fix:**

1. `src/app/add-asset/page.tsx`
2. `src/app/admin/AdminTabs.tsx`
3. `src/app/admin/MakesContent.tsx`
4. `src/app/admin/user-details/page.tsx`
5. `src/app/admin/users/[id]/roles/page.tsx`
6. `src/app/api/youtube/videos/route.ts`
7. `src/app/auth/reset-password/[token]/page.tsx`
8. `src/app/cars/CarsPageClient.tsx`
9. `src/app/cars/new/page.tsx`
10. `src/app/cars/test-db.tsx`
11. `src/app/documents/DocumentsClient.tsx`
12. `src/app/hard-drives/[id]/edit/page.tsx`
13. `src/app/hard-drives/new/page.tsx`
14. `src/app/locations/LocationsClient.tsx`
15. `src/app/makes/MakesPageClient.tsx`
16. `src/app/production/raw/import/page.tsx`
17. `src/app/projects/[id]/page.tsx`
18. `src/app/raw/[id]/add-storage/page.tsx`
19. `src/app/raw/[id]/page.tsx`
20. `src/components/admin/PromptForm.tsx`
21. `src/components/admin/YouTubeAuthComponent.tsx`
22. `src/components/BaTListingGenerator.tsx`
23. `src/components/caption-generator/CaptionGenerator.tsx`
24. `src/components/caption-generator/hooks/useCaptionData.ts`
25. `src/components/caption-generator/hooks/useGenerationHandlers.ts`
26. `src/components/CaptionGenerator.tsx`
27. `src/components/cars/CanvasExtensionModal.tsx`
28. `src/components/cars/CarCopywriter.tsx`
29. `src/components/cars/CarEntryForm.tsx`
30. `src/components/cars/CarGridSelector.tsx`
31. `src/components/cars/ImageCropModal.tsx`
32. `src/components/cars/ImageMatteModal.tsx`
33. `src/components/cars/ScriptTemplates.tsx`
34. `src/components/cars/ShotListTemplates.tsx`
35. `src/components/cars/SimpleImageGallery.tsx`
36. `src/components/cars/Specifications.tsx`
37. `src/components/cars/SpecificationsStandalone.tsx`
38. `src/components/clients/CreateClientDialog.tsx`
39. `src/components/common/JsonGenerationModal.tsx`
40. `src/components/contacts/ContactSelector.tsx`
41. `src/components/contacts/CreateContactDialog.tsx`
42. `src/components/copywriting/CarCopywriter.tsx`
43. `src/components/deliverables/BatchDeliverableForm.tsx`
44. `src/components/deliverables/BatchTemplateManager.tsx`
45. `src/components/deliverables/DeliverableAssignment.tsx`
46. `src/components/deliverables/DeliverablesCalendar.tsx`
47. `src/components/deliverables/DeliverablesList.tsx`
48. `src/components/deliverables/NewDeliverableDialog.tsx`
49. `src/components/deliverables/NewDeliverableForm.tsx`
50. `src/components/deliverables/YouTubeUploadHelper.tsx`
51. `src/components/DocumentationFiles.tsx`
52. `src/components/events/EventBatchManager.tsx`
53. `src/components/events/EventBatchTemplates.tsx`
54. `src/components/events/ListView.tsx`
55. `src/components/galleries/GalleryCanvasExtensionModal.tsx`
56. `src/components/galleries/GalleryCropModal.tsx`
57. `src/components/ImageUploader.tsx`
58. `src/components/MarkdownEditor.tsx`
59. `src/components/production/AddContainerModal.tsx`
60. `src/components/production/AddInventoryItemModal.tsx`
61. `src/components/production/AdvancedFilterModal.tsx`
62. `src/components/production/BulkCheckoutModal.tsx`
63. `src/components/production/BulkEditModal.tsx`
64. `src/components/production/CheckoutModal.tsx`
65. `src/components/production/ContainersList.tsx`
66. `src/components/production/ContainersTab.tsx`
67. `src/components/production/CreateHardDriveDialog.tsx`
68. `src/components/production/CreateKitModal.tsx`
69. `src/components/production/CreateScriptTemplateDialog.tsx`
70. `src/components/production/CreateShotListTemplateDialog.tsx`
71. `src/components/production/EditContainerModal.tsx`
72. `src/components/production/EditInventoryItemModal.tsx`
73. `src/components/production/HardDriveDetailsModal.tsx`
74. `src/components/production/HardDriveModal.tsx`
75. `src/components/production/HardDrivesTab.tsx`
76. `src/components/production/ImportInventoryModal.tsx`
77. `src/components/production/ImportRawAssetsModal.tsx`
78. `src/components/production/KitCheckoutModal.tsx`
79. `src/components/production/KitsTab.tsx`
80. `src/components/production/LocationsFilter.tsx`
81. `src/components/production/RawAssetsTab.tsx`
82. `src/components/production/ScriptTemplatesTab.tsx`
83. `src/components/production/shot-list-templates/hooks/useTemplateManager.ts`
84. `src/components/production/shot-list-templates/ImageBrowser.tsx`
85. `src/components/production/StudioInventoryGrid.tsx`
86. `src/components/production/StudioInventoryList.tsx`
87. `src/components/production/StudioInventoryTab.tsx`
88. `src/components/projects/caption-generator/handlers/generationHandlers.ts`
89. `src/components/projects/caption-generator/handlers/promptHandlers.ts`
90. `src/components/projects/caption-generator/useProjectData.ts`
91. `src/components/projects/ProjectDeliverablesTab.tsx`
92. `src/components/projects/ProjectTeamTab.tsx`
93. `src/components/ResearchFiles.tsx`
94. `src/components/ResearchUpload.tsx`
95. `src/components/ResetPasswordForm.tsx`
96. `src/components/SignupForm.tsx`
97. `src/components/ui/CarImageUpload.tsx`
98. `src/components/ui/custom-dropdown.tsx`
99. `src/components/ui/DropboxImageBrowser.tsx`
100. `src/components/ui/team-member-picker.tsx`
101. `src/components/users/CreativeRolesManagement.tsx`
102. `src/components/users/DirectUserSelector.tsx`
103. `src/components/users/FirestoreUserSelector.tsx`
104. `src/components/users/UserForm.tsx`
105. `src/components/users/UserManagement.tsx`
106. `src/components/users/UserRolesManagement.tsx`
107. `src/components/youtube/YoutubeAddChannelDialog.tsx`
108. `src/components/youtube/YoutubeAddCollectionDialog.tsx`
109. `src/components/youtube/YoutubeAddVideoDialog.tsx`
110. `src/components/youtube/YoutubeChannelList.tsx`
111. `src/components/youtube/YoutubeCollectionList.tsx`
112. `src/components/youtube/YoutubeTranscriptPanel.tsx`
113. `src/components/youtube/YoutubeVideoList.tsx`
114. `src/contexts/LabelsContext.tsx`
115. `src/hooks/useImageGallery.ts`
116. `src/hooks/useImageUploader.ts`
117. `src/lib/cloudflare.ts`
118. `src/lib/hooks/query/useGalleries.ts`
119. `src/lib/imageAnalyzer.ts`

### **Category 5: Hooks making API calls that might need auth state checking (3 files)**

**❌ Issue:** Hooks that make API calls but may not properly check authentication state
**✅ Solution:** Review and add proper authentication state checking

**Files to fix:**

1. `src/hooks/useFirebaseAuth.ts`
2. `src/hooks/useImageGallery.ts`
3. `src/hooks/useImageUploader.ts`

### **Category 6: React Query hooks using API fetch without authentication (1 file)**

**❌ Issue:** React Query hook using fetch without authentication
**✅ Solution:** Update to use `authenticatedFetch`

**Files to fix:**

1. `src/components/users/FirestoreUserSelector.tsx`

## 🔵 **LOW PRIORITY FIXES (97 files) - FIX FOR COMPLETENESS**

### **Category 7: Files using fetch without response.ok checks (31 files)**

**❌ Issue:** Using `fetch()` but not checking `response.ok` for error handling
**✅ Solution:** Add proper error handling with `response.ok` checks

**Files to fix:**

1. `src/app/admin/AdminTabs.tsx`
2. `src/app/api/cars/[id]/images/route.ts`
3. `src/app/api/deliverables/[deliverableId]/upload-to-youtube/route.ts`
4. `src/app/api/deliverables/upload-youtube/route.ts`
5. `src/app/api/galleries/[id]/preview-process-image/route.ts`
6. `src/app/api/galleries/[id]/process-image/route.ts`
7. `src/app/api/galleries/[id]/replace-image/route.ts`
8. `src/app/api/images/cache-for-preview/route.ts`
9. `src/app/api/images/create-matte/route.ts`
10. `src/app/api/images/crop-image/route.ts`
11. `src/app/api/images/extend-canvas-js/route.ts`
12. `src/app/api/images/extend-canvas-remote/route.ts`
13. `src/app/api/images/extend-canvas/route.ts`
14. `src/app/api/inspections/[id]/route.ts`
15. `src/app/api/openai/generate-caption/route.ts`
16. `src/app/api/openai/generate-project-caption/route.ts`
17. `src/app/api/openai/reanalyze-image/route.ts`
18. `src/app/api/vin/route.ts`
19. `src/app/api/youtube/upload/route.ts`
20. `src/app/cars/CarsPageClient.tsx`
21. `src/app/cars/test-db.tsx`
22. `src/app/documents/page.tsx`
23. `src/app/inventory/[id]/page.tsx`
24. `src/components/cars/ImageViewModal.tsx`
25. `src/components/cars/SimpleImageGallery.tsx`
26. `src/components/contacts/ContactSelector.tsx`
27. `src/components/ImageGallery.tsx`
28. `src/components/ui/CarAvatarWithData.tsx`
29. `src/components/ui/ProgressiveImage.tsx`
30. `src/lib/imageUploadHandler.ts`
31. `src/lib/navigation/simple-cache.ts`

### **Category 8: Files using old toast patterns (66 files)**

**❌ Issue:** Using old `toast.` pattern instead of `useToast()` hook
**✅ Solution:** Update to use `useToast()` hook pattern

**Files to fix:**

1. `src/app/admin/CaptionPromptsContent.tsx`
2. `src/app/admin/ImageAnalysisPromptsContent.tsx`
3. `src/app/admin/users/[id]/roles/page.tsx`
4. `src/app/cars/[id]/events/page.tsx`
5. `src/app/cars/[id]/inspections/[inspectionId]/edit/page.tsx`
6. `src/app/cars/[id]/inspections/[inspectionId]/page.tsx`
7. `src/app/cars/new/page.tsx`
8. `src/app/dashboard/page.tsx`
9. `src/app/events/page.tsx`
10. `src/app/makes/MakesPageClient.tsx`
11. `src/components/admin/YouTubeAuthComponent.tsx`
12. `src/components/calendar/FullCalendar.tsx`
13. `src/components/calendar/MotiveCalendar.tsx`
14. `src/components/caption-generator/CaptionPreview.tsx`
15. `src/components/caption-generator/hooks/useCaptionData.ts`
16. `src/components/caption-generator/hooks/useGenerationHandlers.ts`
17. `src/components/cars/CalendarTab.tsx`
18. `src/components/cars/CarEntryForm.tsx`
19. `src/components/cars/CarGalleries.tsx`
20. `src/components/cars/CarTabs.tsx`
21. `src/components/cars/FullCalendarTab.tsx`
22. `src/components/cars/InspectionForm.tsx`
23. `src/components/cars/InspectionReport.tsx`
24. `src/components/cars/InspectionTab.tsx`
25. `src/components/cars/JsonUploadModal.tsx`
26. `src/components/cars/Scripts.tsx`
27. `src/components/cars/ScriptTemplates.tsx`
28. `src/components/cars/ShotList.tsx`
29. `src/components/cars/ShotListTemplates.tsx`
30. `src/components/cars/Specifications.tsx`
31. `src/components/common/JsonGenerationModal.tsx`
32. `src/components/common/JsonImportUtility.tsx`
33. `src/components/common/JsonUploadPasteModal.tsx`
34. `src/components/contacts/ContactsTable.tsx`
35. `src/components/contacts/CreateContactDialog.tsx`
36. `src/components/contacts/EditContactDialog.tsx`
37. `src/components/deliverables/BatchAssignmentModal.tsx`
38. `src/components/deliverables/BatchDeliverableForm.tsx`
39. `src/components/deliverables/BatchTemplateManager.tsx`
40. `src/components/deliverables/DeliverableAssignment.tsx`
41. `src/components/deliverables/deliverables-tab/hooks/useBatchMode.ts`
42. `src/components/deliverables/deliverables-tab/hooks/useDeliverables.ts`
43. `src/components/deliverables/DeliverablesCalendar.tsx`
44. `src/components/deliverables/DeliverablesList.tsx`
45. `src/components/deliverables/DeliverablesTab.tsx`
46. `src/components/deliverables/EditDeliverableForm.tsx`
47. `src/components/deliverables/NewDeliverableForm.tsx`
48. `src/components/deliverables/YouTubeUploadHelper.tsx`
49. `src/components/DocumentationFiles.tsx`
50. `src/components/events/EditEventDialog.tsx`
51. `src/components/events/EventBatchManager.tsx`
52. `src/components/events/EventBatchTemplates.tsx`
53. `src/components/events/EventForm.tsx` ✅ **ALREADY FIXED**
54. `src/components/events/EventsTab.tsx`
55. `src/components/events/ListView.tsx`
56. `src/components/production/ScriptTemplatesTab.tsx`
57. `src/components/production/shot-list-templates/hooks/useTemplateManager.ts`
58. `src/components/projects/ProjectCalendarTab.tsx`
59. `src/components/projects/ProjectDeliverablesTab.tsx`
60. `src/components/projects/ProjectEventsTab.tsx`
61. `src/components/schedule/CalendarContent.tsx`
62. `src/components/schedule/EventsContent.tsx`
63. `src/components/ui/DropboxImageBrowser.tsx`
64. `src/components/ui/json-upload.tsx`
65. `src/components/users/UserRolesManagement.tsx`
66. `src/hooks/useImageUploader.ts`

## 🔧 **STANDARD FIX PATTERNS**

### **Pattern A: useAPI → useAuthenticatedFetch (For hooks and components)**

**Before:**

```typescript
import { useAPI } from "@/lib/fetcher";

export function MyComponent() {
  const api = useAPI();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const data = await api.get("/api/endpoint");
    setData(data);
  };
}
```

**After:**

```typescript
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAuthenticatedFetch } from "@/hooks/useFirebaseAuth";

export function MyComponent() {
  const { data: session, status } = useSession();
  const { authenticatedFetch } = useAuthenticatedFetch();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    const response = await authenticatedFetch("/api/endpoint");
    const data = await response.json();
    setData(data);
  };
}
```

### **Pattern B: Plain fetch → authenticatedFetch**

**Before:**

```typescript
const response = await fetch("/api/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

**After:**

```typescript
import { useAuthenticatedFetch } from "@/hooks/useFirebaseAuth";

const { authenticatedFetch } = useAuthenticatedFetch();

const response = await authenticatedFetch("/api/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

### **Pattern C: Old toast → useToast hook**

**Before:**

```typescript
toast.success("Success message");
toast.error("Error message");
```

**After:**

```typescript
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();

toast({
  title: "Success",
  description: "Success message",
});

toast({
  title: "Error",
  description: "Error message",
  variant: "destructive",
});
```

## 📋 **EXECUTION PLAN**

### **Phase 1: HIGH Priority (131 files) - IMMEDIATE**

1. Start with useAPI hook files (11 files) - these are causing immediate errors
2. Move to plain fetch files (120 files) - these cause 401 errors
3. Test each fix thoroughly before moving to next file
4. Verify authentication flow works properly

### **Phase 2: MEDIUM Priority (133 files) - NEXT**

1. Clean up import statements and unused references
2. Add proper authentication checks to hooks
3. Update React Query patterns
4. Verify no regressions introduced

### **Phase 3: LOW Priority (97 files) - FINAL**

1. Add proper error handling with response.ok checks
2. Update toast patterns for consistency
3. Final testing and verification

## 🧪 **TESTING CHECKLIST**

For each fixed file:

- [ ] Component renders without authentication errors
- [ ] API calls include proper Authorization headers
- [ ] Authentication state is checked before making requests
- [ ] Error handling works properly
- [ ] Loading states work correctly
- [ ] Toast notifications use correct pattern

## 📊 **PROGRESS TRACKING**

**HIGH Priority Progress:**

- ✅ `src/hooks/useEventTypeSettings.ts` - COMPLETED
- ✅ `src/components/events/EventForm.tsx` - COMPLETED
- ✅ `src/components/cars/EventsTab.tsx` - COMPLETED
- ✅ `src/app/projects/new/page.tsx` - COMPLETED
- ✅ `src/hooks/useUsers.ts` - COMPLETED
- ✅ `src/lib/hooks/query/useCars.ts` - COMPLETED
- [ ] Remaining 125 HIGH priority files

**Total Completed: 6/361 files (1.7%)**
**Remaining: 355 files (98.3%)**

## 🎯 **SUCCESS CRITERIA**

1. **Zero 401 authentication errors** from client-side components
2. **Zero "Not authenticated" errors** from useAPI hook usage
3. **All API calls use proper Authorization headers** via authenticatedFetch
4. **Consistent authentication patterns** across the entire codebase
5. **Proper error handling** for all network requests
6. **Consistent toast notification patterns** using useToast hook

---

**⚠️ CRITICAL:** Do not skip any files in this list. Each file represents a potential authentication vulnerability or user experience issue. The application will not be fully secure and stable until ALL 361 files have been properly fixed.
