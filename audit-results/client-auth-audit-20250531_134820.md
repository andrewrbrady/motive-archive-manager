# Client-Side Authentication Audit Results

Generated: Sat May 31 13:48:20 CDT 2025

## Summary

This audit identifies all files using problematic authentication patterns that need to be updated to use proper Firebase Auth patterns.


## Files using useAPI hook (HIGH PRIORITY) (     115 files)

```
src/app/add-asset/page.tsx
src/app/admin/AdminTabs.tsx
src/app/admin/CaptionPromptsContent.tsx
src/app/admin/EventTypeSettingsContent.tsx
src/app/admin/ImageAnalysisPromptsContent.tsx
src/app/admin/LengthSettingsContent.tsx
src/app/admin/MakesContent.tsx
src/app/admin/PlatformSettingsContent.tsx
src/app/admin/SystemPromptsContent.tsx
src/app/admin/user-details/page.tsx
src/app/admin/users/[id]/roles/page.tsx
src/app/auth/reset-password/[token]/page.tsx
src/app/cars/CarsPageClient.tsx
src/app/cars/new/page.tsx
src/app/events/page.tsx
src/app/hard-drives/[id]/edit/page.tsx
src/app/hard-drives/new/page.tsx
src/app/production/raw/import/page.tsx
src/app/projects/[id]/page.tsx
src/app/projects/[id]/settings/page.tsx
src/app/projects/new/page.tsx
src/app/projects/page.tsx
src/app/raw/[id]/add-storage/page.tsx
src/app/raw/[id]/page.tsx
src/components/admin/PromptForm.tsx
src/components/admin/YouTubeAuthComponent.tsx
src/components/caption-generator/hooks/useGenerationHandlers.ts
src/components/cars/CanvasExtensionModal.tsx
src/components/cars/CarEntryForm.tsx
src/components/cars/EventsTab.tsx
src/components/cars/FullCalendarTab.tsx
src/components/cars/ImageCropModal.tsx
src/components/cars/ImageMatteModal.tsx
src/components/cars/ShotList.tsx
src/components/cars/SimpleImageGallery.tsx
src/components/cars/Specifications.tsx
src/components/cars/SpecificationsEnrichment.tsx
src/components/cars/SpecificationsStandalone.tsx
src/components/contacts/ContactSelector.tsx
src/components/contacts/CreateContactDialog.tsx
src/components/deliverables/BatchDeliverableForm.tsx
src/components/deliverables/deliverables-tab/hooks/useDeliverables.ts
src/components/deliverables/DeliverablesCalendar.tsx
src/components/deliverables/DeliverablesList.tsx
src/components/deliverables/DeliverablesTab.tsx
src/components/deliverables/EditDeliverableForm.tsx
src/components/deliverables/NewDeliverableDialog.tsx
src/components/deliverables/NewDeliverableForm.tsx
src/components/deliverables/YouTubeUploadHelper.tsx
src/components/error-boundaries/__test-auth-error-boundary.tsx
src/components/events/EventBatchManager.tsx
src/components/events/EventBatchTemplates.tsx
src/components/events/EventCard.tsx
src/components/events/EventForm.tsx
src/components/events/ListView.tsx
src/components/galleries/GalleryCanvasExtensionModal.tsx
src/components/galleries/GalleryCropModal.tsx
src/components/galleries/SortableGalleryItem.tsx
src/components/production/AddAssetModal.tsx
src/components/production/AddInventoryItemModal.tsx
src/components/production/AdvancedFilterModal.tsx
src/components/production/BulkCheckoutModal.tsx
src/components/production/BulkEditModal.tsx
src/components/production/CheckoutModal.tsx
src/components/production/ContainerItemsModal.tsx
src/components/production/ContainersList.tsx
src/components/production/ContainersTab.tsx
src/components/production/CreateHardDriveDialog.tsx
src/components/production/CreateKitModal.tsx
src/components/production/CreateScriptTemplateDialog.tsx
src/components/production/CreateShotListTemplateDialog.tsx
src/components/production/EditContainerModal.tsx
src/components/production/EditInventoryItemModal.tsx
src/components/production/EditRawAssetModal.tsx
src/components/production/HardDriveDetailsModal.tsx
src/components/production/HardDriveModal.tsx
src/components/production/HardDrivesTab.tsx
src/components/production/ImportInventoryModal.tsx
src/components/production/ImportRawAssetsModal.tsx
src/components/production/KitCheckoutModal.tsx
src/components/production/KitsTab.tsx
src/components/production/LocationsFilter.tsx
src/components/production/RawAssetsTab.tsx
src/components/production/ScriptTemplatesTab.tsx
src/components/production/shot-list-templates/hooks/useTemplateManager.ts
src/components/production/shot-list-templates/ImageBrowser.tsx
src/components/production/ShotListTemplateCard.tsx
src/components/production/StudioInventoryGrid.tsx
src/components/production/StudioInventoryList.tsx
src/components/production/StudioInventoryTab.tsx
src/components/projects/ProjectDeliverablesTab.tsx
src/components/projects/ProjectGalleriesTab.tsx
src/components/projects/ProjectTeamTab.tsx
src/components/ResearchList.tsx
src/components/users/CreativeRolesManagement.tsx
src/components/users/DirectUserSelector.tsx
src/components/users/EnhancedUserSelector.tsx
src/components/users/FirestoreUserSelector.tsx
src/components/users/UserForm.tsx
src/components/users/UserManagement.tsx
src/components/users/UserRolesManagement.tsx
src/hooks/__test-useAPIQuery.tsx
src/hooks/use-galleries.ts
src/hooks/use-images.ts
src/hooks/useAPI.ts
src/hooks/useAPIQuery.ts
src/hooks/useEventTypeSettings.ts
src/hooks/useFirebaseAuth.ts
src/hooks/useGalleryState.ts
src/hooks/useImageGallery.ts
src/hooks/useImageUploader.ts
src/hooks/useUsers.ts
src/lib/fetcher.ts
src/lib/hooks/query/useCars.ts
src/lib/hooks/useGalleryImageProcessing.ts
```

## Files using plain fetch to API endpoints (HIGH PRIORITY) (      43 files)

```
src/app/api/youtube/videos/route.ts
src/app/cars/test-db.tsx
src/app/documents/DocumentsClient.tsx
src/app/locations/LocationsClient.tsx
src/app/makes/MakesPageClient.tsx
src/components/BaTListingGenerator.tsx
src/components/caption-generator/CaptionGenerator.tsx
src/components/caption-generator/hooks/useCaptionData.ts
src/components/CaptionGenerator.tsx
src/components/cars/CarCopywriter.tsx
src/components/cars/CarGridSelector.tsx
src/components/cars/ScriptTemplates.tsx
src/components/cars/ShotListTemplates.tsx
src/components/clients/CreateClientDialog.tsx
src/components/common/JsonGenerationModal.tsx
src/components/copywriting/CarCopywriter.tsx
src/components/deliverables/BatchTemplateManager.tsx
src/components/deliverables/DeliverableAssignment.tsx
src/components/DocumentationFiles.tsx
src/components/error-boundaries/__test-auth-error-boundary.tsx
src/components/ImageUploader.tsx
src/components/MarkdownEditor.tsx
src/components/production/AddContainerModal.tsx
src/components/projects/caption-generator/handlers/generationHandlers.ts
src/components/projects/caption-generator/handlers/promptHandlers.ts
src/components/projects/caption-generator/useProjectData.ts
src/components/ResearchFiles.tsx
src/components/ResearchUpload.tsx
src/components/ResetPasswordForm.tsx
src/components/SignupForm.tsx
src/components/ui/CarImageUpload.tsx
src/components/ui/custom-dropdown.tsx
src/components/ui/DropboxImageBrowser.tsx
src/components/ui/team-member-picker.tsx
src/components/youtube/YoutubeAddChannelDialog.tsx
src/components/youtube/YoutubeAddCollectionDialog.tsx
src/components/youtube/YoutubeAddVideoDialog.tsx
src/components/youtube/YoutubeChannelList.tsx
src/components/youtube/YoutubeCollectionList.tsx
src/components/youtube/YoutubeTranscriptPanel.tsx
src/components/youtube/YoutubeVideoList.tsx
src/contexts/LabelsContext.tsx
src/hooks/useImageUploader.ts
```

## Files importing useAPI (     113 files)

```
src/app/add-asset/page.tsx
src/app/admin/AdminTabs.tsx
src/app/admin/CaptionPromptsContent.tsx
src/app/admin/EventTypeSettingsContent.tsx
src/app/admin/ImageAnalysisPromptsContent.tsx
src/app/admin/LengthSettingsContent.tsx
src/app/admin/MakesContent.tsx
src/app/admin/PlatformSettingsContent.tsx
src/app/admin/SystemPromptsContent.tsx
src/app/admin/user-details/page.tsx
src/app/admin/users/[id]/roles/page.tsx
src/app/auth/reset-password/[token]/page.tsx
src/app/cars/CarsPageClient.tsx
src/app/cars/new/page.tsx
src/app/events/page.tsx
src/app/hard-drives/[id]/edit/page.tsx
src/app/hard-drives/new/page.tsx
src/app/production/raw/import/page.tsx
src/app/projects/[id]/page.tsx
src/app/projects/[id]/settings/page.tsx
src/app/projects/new/page.tsx
src/app/projects/page.tsx
src/app/raw/[id]/add-storage/page.tsx
src/app/raw/[id]/page.tsx
src/components/admin/PromptForm.tsx
src/components/admin/YouTubeAuthComponent.tsx
src/components/caption-generator/hooks/useGenerationHandlers.ts
src/components/cars/CanvasExtensionModal.tsx
src/components/cars/CarEntryForm.tsx
src/components/cars/EventsTab.tsx
src/components/cars/FullCalendarTab.tsx
src/components/cars/ImageCropModal.tsx
src/components/cars/ImageMatteModal.tsx
src/components/cars/ShotList.tsx
src/components/cars/SimpleImageGallery.tsx
src/components/cars/Specifications.tsx
src/components/cars/SpecificationsEnrichment.tsx
src/components/cars/SpecificationsStandalone.tsx
src/components/contacts/ContactSelector.tsx
src/components/contacts/CreateContactDialog.tsx
src/components/deliverables/BatchDeliverableForm.tsx
src/components/deliverables/deliverables-tab/hooks/useDeliverables.ts
src/components/deliverables/DeliverablesCalendar.tsx
src/components/deliverables/DeliverablesList.tsx
src/components/deliverables/DeliverablesTab.tsx
src/components/deliverables/EditDeliverableForm.tsx
src/components/deliverables/NewDeliverableDialog.tsx
src/components/deliverables/NewDeliverableForm.tsx
src/components/deliverables/YouTubeUploadHelper.tsx
src/components/error-boundaries/__test-auth-error-boundary.tsx
src/components/events/EventBatchManager.tsx
src/components/events/EventBatchTemplates.tsx
src/components/events/EventCard.tsx
src/components/events/EventForm.tsx
src/components/events/ListView.tsx
src/components/galleries/GalleryCanvasExtensionModal.tsx
src/components/galleries/GalleryCropModal.tsx
src/components/galleries/SortableGalleryItem.tsx
src/components/production/AddAssetModal.tsx
src/components/production/AddInventoryItemModal.tsx
src/components/production/AdvancedFilterModal.tsx
src/components/production/BulkCheckoutModal.tsx
src/components/production/BulkEditModal.tsx
src/components/production/CheckoutModal.tsx
src/components/production/ContainerItemsModal.tsx
src/components/production/ContainersList.tsx
src/components/production/ContainersTab.tsx
src/components/production/CreateHardDriveDialog.tsx
src/components/production/CreateKitModal.tsx
src/components/production/CreateScriptTemplateDialog.tsx
src/components/production/CreateShotListTemplateDialog.tsx
src/components/production/EditContainerModal.tsx
src/components/production/EditInventoryItemModal.tsx
src/components/production/EditRawAssetModal.tsx
src/components/production/HardDriveDetailsModal.tsx
src/components/production/HardDriveModal.tsx
src/components/production/HardDrivesTab.tsx
src/components/production/ImportInventoryModal.tsx
src/components/production/ImportRawAssetsModal.tsx
src/components/production/KitCheckoutModal.tsx
src/components/production/KitsTab.tsx
src/components/production/LocationsFilter.tsx
src/components/production/RawAssetsTab.tsx
src/components/production/ScriptTemplatesTab.tsx
src/components/production/shot-list-templates/hooks/useTemplateManager.ts
src/components/production/shot-list-templates/ImageBrowser.tsx
src/components/production/ShotListTemplateCard.tsx
src/components/production/StudioInventoryGrid.tsx
src/components/production/StudioInventoryList.tsx
src/components/production/StudioInventoryTab.tsx
src/components/projects/ProjectDeliverablesTab.tsx
src/components/projects/ProjectGalleriesTab.tsx
src/components/projects/ProjectTeamTab.tsx
src/components/ResearchList.tsx
src/components/users/CreativeRolesManagement.tsx
src/components/users/DirectUserSelector.tsx
src/components/users/EnhancedUserSelector.tsx
src/components/users/FirestoreUserSelector.tsx
src/components/users/UserForm.tsx
src/components/users/UserManagement.tsx
src/components/users/UserRolesManagement.tsx
src/hooks/__test-useAPIQuery.tsx
src/hooks/use-galleries.ts
src/hooks/use-images.ts
src/hooks/useAPIQuery.ts
src/hooks/useEventTypeSettings.ts
src/hooks/useFirebaseAuth.ts
src/hooks/useGalleryState.ts
src/hooks/useImageGallery.ts
src/hooks/useImageUploader.ts
src/hooks/useUsers.ts
src/lib/hooks/query/useCars.ts
src/lib/hooks/useGalleryImageProcessing.ts
```

## Files using API fetch but missing useAuthenticatedFetch (      43 files)

```
src/app/api/youtube/videos/route.ts
src/app/cars/test-db.tsx
src/app/documents/DocumentsClient.tsx
src/app/locations/LocationsClient.tsx
src/app/makes/MakesPageClient.tsx
src/components/BaTListingGenerator.tsx
src/components/caption-generator/CaptionGenerator.tsx
src/components/caption-generator/hooks/useCaptionData.ts
src/components/CaptionGenerator.tsx
src/components/cars/CarCopywriter.tsx
src/components/cars/CarGridSelector.tsx
src/components/cars/ScriptTemplates.tsx
src/components/cars/ShotListTemplates.tsx
src/components/clients/CreateClientDialog.tsx
src/components/common/JsonGenerationModal.tsx
src/components/copywriting/CarCopywriter.tsx
src/components/deliverables/BatchTemplateManager.tsx
src/components/deliverables/DeliverableAssignment.tsx
src/components/DocumentationFiles.tsx
src/components/error-boundaries/__test-auth-error-boundary.tsx
src/components/ImageUploader.tsx
src/components/MarkdownEditor.tsx
src/components/production/AddContainerModal.tsx
src/components/projects/caption-generator/handlers/generationHandlers.ts
src/components/projects/caption-generator/handlers/promptHandlers.ts
src/components/projects/caption-generator/useProjectData.ts
src/components/ResearchFiles.tsx
src/components/ResearchUpload.tsx
src/components/ResetPasswordForm.tsx
src/components/SignupForm.tsx
src/components/ui/CarImageUpload.tsx
src/components/ui/custom-dropdown.tsx
src/components/ui/DropboxImageBrowser.tsx
src/components/ui/team-member-picker.tsx
src/components/youtube/YoutubeAddChannelDialog.tsx
src/components/youtube/YoutubeAddCollectionDialog.tsx
src/components/youtube/YoutubeAddVideoDialog.tsx
src/components/youtube/YoutubeChannelList.tsx
src/components/youtube/YoutubeCollectionList.tsx
src/components/youtube/YoutubeTranscriptPanel.tsx
src/components/youtube/YoutubeVideoList.tsx
src/contexts/LabelsContext.tsx
src/hooks/useImageUploader.ts
```

## Files using fetch without response.ok checks (      33 files)

```
src/app/api/cars/[id]/images/route.ts
src/app/api/deliverables/[deliverableId]/upload-to-youtube/route.ts
src/app/api/deliverables/upload-youtube/route.ts
src/app/api/galleries/[id]/preview-process-image/route.ts
src/app/api/galleries/[id]/process-image/route.ts
src/app/api/galleries/[id]/replace-image/route.ts
src/app/api/images/cache-for-preview/route.ts
src/app/api/images/create-matte/route.ts
src/app/api/images/crop-image/route.ts
src/app/api/images/extend-canvas-js/route.ts
src/app/api/images/extend-canvas-remote/route.ts
src/app/api/images/extend-canvas/route.ts
src/app/api/inspections/[id]/route.ts
src/app/api/openai/generate-caption/route.ts
src/app/api/openai/generate-project-caption/route.ts
src/app/api/openai/reanalyze-image/route.ts
src/app/api/vin/route.ts
src/app/api/youtube/upload/route.ts
src/app/cars/test-db.tsx
src/app/documents/page.tsx
src/app/inventory/[id]/page.tsx
src/components/cars/CanvasExtensionModal.tsx
src/components/cars/ImageMatteModal.tsx
src/components/cars/ImageViewModal.tsx
src/components/galleries/GalleryCanvasExtensionModal.tsx
src/components/ImageGallery.tsx
src/components/ResearchList.tsx
src/components/ui/CarAvatarWithData.tsx
src/components/ui/ProgressiveImage.tsx
src/components/users/FirestoreUserSelector.tsx
src/hooks/use-images.ts
src/lib/imageUploadHandler.ts
src/lib/navigation/simple-cache.ts
```

## Hooks making API calls that might need auth state checking (       1 files)

```
src/hooks/useImageUploader.ts
```

## Components with loading states missing auth checks (       0 files)

No files found.

## Files using old toast patterns (should use useToast hook) (      89 files)

```
src/app/admin/CaptionPromptsContent.tsx
src/app/admin/ImageAnalysisPromptsContent.tsx
src/app/admin/user-details/page.tsx
src/app/admin/users/[id]/roles/page.tsx
src/app/cars/[id]/events/page.tsx
src/app/cars/[id]/inspections/[inspectionId]/edit/page.tsx
src/app/cars/[id]/inspections/[inspectionId]/page.tsx
src/app/cars/new/page.tsx
src/app/dashboard/page.tsx
src/app/events/page.tsx
src/app/makes/MakesPageClient.tsx
src/components/admin/YouTubeAuthComponent.tsx
src/components/calendar/FullCalendar.tsx
src/components/calendar/MotiveCalendar.tsx
src/components/caption-generator/CaptionPreview.tsx
src/components/caption-generator/hooks/useCaptionData.ts
src/components/caption-generator/hooks/useGenerationHandlers.ts
src/components/cars/CalendarTab.tsx
src/components/cars/CarEntryForm.tsx
src/components/cars/CarGalleries.tsx
src/components/cars/CarTabs.tsx
src/components/cars/FullCalendarTab.tsx
src/components/cars/InspectionForm.tsx
src/components/cars/InspectionReport.tsx
src/components/cars/InspectionTab.tsx
src/components/cars/JsonUploadModal.tsx
src/components/cars/Scripts.tsx
src/components/cars/ScriptTemplates.tsx
src/components/cars/ShotList.tsx
src/components/cars/ShotListTemplates.tsx
src/components/cars/Specifications.tsx
src/components/cars/SpecificationsEnrichment.tsx
src/components/common/JsonGenerationModal.tsx
src/components/common/JsonImportUtility.tsx
src/components/common/JsonUploadPasteModal.tsx
src/components/contacts/ContactSelector.tsx
src/components/contacts/ContactsTable.tsx
src/components/contacts/CreateContactDialog.tsx
src/components/contacts/EditContactDialog.tsx
src/components/deliverables/BatchAssignmentModal.tsx
src/components/deliverables/BatchDeliverableForm.tsx
src/components/deliverables/BatchTemplateManager.tsx
src/components/deliverables/DeliverableAssignment.tsx
src/components/deliverables/deliverables-tab/hooks/useBatchMode.ts
src/components/deliverables/deliverables-tab/hooks/useDeliverables.ts
src/components/deliverables/DeliverablesCalendar.tsx
src/components/deliverables/DeliverablesList.tsx
src/components/deliverables/DeliverablesTab.tsx
src/components/deliverables/EditDeliverableForm.tsx
src/components/deliverables/NewDeliverableDialog.tsx
src/components/deliverables/NewDeliverableForm.tsx
src/components/deliverables/YouTubeUploadHelper.tsx
src/components/DocumentationFiles.tsx
src/components/events/EditEventDialog.tsx
src/components/events/EventBatchManager.tsx
src/components/events/EventBatchTemplates.tsx
src/components/events/EventCard.tsx
src/components/events/EventForm.tsx
src/components/events/EventsTab.tsx
src/components/events/ListView.tsx
src/components/production/AddAssetModal.tsx
src/components/production/AdvancedFilterModal.tsx
src/components/production/BulkCheckoutModal.tsx
src/components/production/BulkEditModal.tsx
src/components/production/CheckoutModal.tsx
src/components/production/CreateKitModal.tsx
src/components/production/CreateScriptTemplateDialog.tsx
src/components/production/CreateShotListTemplateDialog.tsx
src/components/production/EditContainerModal.tsx
src/components/production/ImportInventoryModal.tsx
src/components/production/ImportRawAssetsModal.tsx
src/components/production/KitCheckoutModal.tsx
src/components/production/LocationsFilter.tsx
src/components/production/RawAssetsTab.tsx
src/components/production/ScriptTemplatesTab.tsx
src/components/production/shot-list-templates/hooks/useTemplateManager.ts
src/components/production/shot-list-templates/ImageBrowser.tsx
src/components/production/ShotListTemplateCard.tsx
src/components/projects/ProjectCalendarTab.tsx
src/components/projects/ProjectDeliverablesTab.tsx
src/components/projects/ProjectEventsTab.tsx
src/components/ResearchList.tsx
src/components/schedule/CalendarContent.tsx
src/components/schedule/EventsContent.tsx
src/components/ui/DropboxImageBrowser.tsx
src/components/ui/json-upload.tsx
src/components/users/UserRolesManagement.tsx
src/hooks/useGalleryState.ts
src/hooks/useImageUploader.ts
```

## React Query hooks using API fetch without authentication (       0 files)

No files found.

## Components with useEffect API calls missing auth dependencies (       5 files)

```
src/components/CaptionGenerator.tsx
src/components/cars/CarGridSelector.tsx
src/components/ui/team-member-picker.tsx
src/components/youtube/YoutubeChannelList.tsx
src/components/youtube/YoutubeCollectionList.tsx
```

## AUDIT SUMMARY

| Category | Count | Priority |
|----------|-------|----------|
| Files using useAPI hook | 115 | 🔴 HIGH |
| Files using plain fetch to API | 43 | 🔴 HIGH |
| Files importing useAPI | 113 | 🟡 MEDIUM |
| Files missing useAuthenticatedFetch | 43 | 🟡 MEDIUM |
| Files without response.ok checks | 33 | 🔵 LOW |
| Hooks needing auth state checking | 1 | 🟡 MEDIUM |
| Components missing auth checks | 0 | 🔵 LOW |
| Files using old toast patterns | 89 | 🔵 LOW |
| React Query hooks missing auth | 0 | 🟡 MEDIUM |
| useEffect missing auth dependencies | 5 | 🔴 HIGH |

**TOTALS:**
- 🔴 HIGH Priority: 163 files
- 🟡 MEDIUM Priority: 157 files
- 🔵 LOW Priority: 122 files
- **TOTAL FILES TO REVIEW: 442**
