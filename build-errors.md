# Build Errors Tracking

## Current Build Errors

### 1. HardDrivesTab.tsx

- [x] Missing module `CreateHardDriveDialog`
- [ ] Need to create `CreateHardDriveDialog` component

### 2. RawAssetsTab.tsx

- [ ] Missing module `./CreateRawAssetDialog`
- [ ] Missing module `./RawAssetCard`
- [ ] Type errors in ObjectId handling
- [ ] Missing type definition for RawAssetData

### 3. ScriptTemplatesTab.tsx

- [ ] Missing module `./ScriptTemplateCard`

### 4. EditRawAssetModal.tsx

- [ ] Property 'cars' does not exist on type 'RawAssetData'
- [ ] Multiple properties with same name 'locations'
- [ ] Type mismatch in CarSelector component

### 5. CarSelector.tsx

- [ ] Type 'ObjectId' not assignable to 'Key | null | undefined'

### 6. HardDriveDetailsModal.tsx

- [ ] Syntax errors in component definition
- [ ] Invalid return type annotation
- [ ] Invalid function declarations

### 7. cars/[id]/page.tsx

- [ ] Multiple syntax errors in component
- [ ] Invalid type definitions
- [ ] Invalid JSX structure

### 8. inventory/page.tsx

- [ ] Invalid JSX structure
- [ ] Missing properties in component props
- [ ] Type errors in search parameters

### 9. makes/page.tsx

- [ ] Type mismatch in MakesPageClient props

## Action Plan

1. First, fix the component dependencies:

   - Create missing components (CreateHardDriveDialog, CreateRawAssetDialog, etc.)
   - Fix import paths

2. Then, fix type definitions:

   - Add proper type definitions for RawAssetData
   - Fix ObjectId handling
   - Resolve prop type mismatches

3. Finally, fix syntax errors:
   - Clean up JSX structure
   - Fix function declarations
   - Resolve component return types

## Progress

- [ ] Step 1: Component Dependencies
- [ ] Step 2: Type Definitions
- [ ] Step 3: Syntax Errors

## Notes

- Keep track of any new errors that appear during fixes
- Test each fix with a build to ensure it resolves the issue
- Document any patterns or recurring issues
