# Legacy Archive

This directory contains legacy components that have been superseded by optimized implementations but may contain valuable reference code or need to be temporarily preserved during migration phases.

## Archive Policy

### When to Archive (vs. Delete)

- **Archive**: Components with unique functionality that might be needed for reference
- **Archive**: Large components being replaced in phases
- **Delete**: Pure backup files with `.backup` extension
- **Delete**: Development/testing utilities with no production value

### Archive Structure

```
src/legacy/
├── cars/                          # Cars-related legacy components
│   ├── CarsPageClient.tsx.archived    # Legacy page component
│   └── README.md                      # Cars-specific archive notes
├── components/                    # Generic legacy components
└── README.md                      # This file
```

### Archived Components

| Component  | Archived Date | Reason | Replacement | Can Remove After |
| ---------- | ------------- | ------ | ----------- | ---------------- |
| (none yet) | -             | -      | -           | -                |

### Archive Retention Policy

1. **3 months**: Review archived components for safe deletion
2. **6 months**: Remove if no issues found with replacements
3. **Document**: Any unique functionality before final removal

### How to Archive a Component

1. Move file to appropriate subdirectory with `.archived` extension
2. Update table above with details
3. Add entry to replacement component's documentation
4. Update imports in active code

---

**Created**: January 25, 2025  
**Last Updated**: January 25, 2025  
**Related**: `docs/development/CARS_LEGACY_AUDIT_RESULTS.md`
