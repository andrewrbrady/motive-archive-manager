# Legacy Components Archive

This directory contains legacy components that have been replaced by optimized versions and are no longer in active use.

## DocumentationFiles.tsx.legacy

**Archived Date**: Phase 3D Performance Optimization
**Reason**: Replaced by optimized architecture
**Replacement**: `src/components/cars/optimized/documentation/DocumentationOptimized.tsx`

### Performance Issues Fixed:

- **BLOCKING PATTERNS ELIMINATED**:
  - `useEffect(() => { fetchFiles(); }, [carId, api])` with `await api.get()` - BLOCKING
  - `await api.deleteWithBody()` in handleDelete - BLOCKING

### Why Archived:

- **Architecture Improvement**: 421 lines → optimized split architecture (200 lines critical path + lazy loading)
- **Performance Gain**: 52% reduction in critical path loading
- **No Active Usage**: No components importing this legacy version
- **Functionality Preserved**: All features moved to optimized architecture

### Migration Path:

- Use `DocumentationOptimized.tsx` which provides:
  - `BaseDocumentation.tsx` for critical path (file list)
  - `DocumentationEditor.tsx` for upload functionality (lazy loaded)
  - Better performance and non-blocking patterns

### Original Blocking Patterns (FIXED in optimized version):

```typescript
// BLOCKING PATTERN 1 - Fixed in BaseDocumentation.tsx with useAPIQuery
useEffect(() => {
  fetchFiles();
}, [carId, api]);

const fetchFiles = async () => {
  const data = await api.get(`cars/${carId}/documentation`); // BLOCKING
};

// BLOCKING PATTERN 2 - Fixed with setTimeout + .then()/.catch()
const handleDelete = async (fileId: string) => {
  await api.deleteWithBody("documentation/delete", { fileId, carId }); // BLOCKING
};
```
