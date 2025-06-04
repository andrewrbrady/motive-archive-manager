# Project Structure

This document outlines the organized file structure for the Motive Archive Manager project.

## Root Directory Organization

The project root has been cleaned and organized to maintain a professional structure:

### Core Next.js Files (Root Level)

- `README.md` - Main project documentation
- `package.json` & `package-lock.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration (primary)
- `tailwind.config.ts` - Tailwind CSS configuration (primary)
- `postcss.config.mjs` - PostCSS configuration (primary)
- `vercel.json` - Deployment configuration
- `.gitignore` - Git ignore patterns
- `.nvmrc` - Node version specification
- `middleware.ts` - Next.js middleware

## Organized Directories

### `/docs/` - Documentation Hub

- **`project-summaries/`** - Implementation and completion summaries
  - Phase completion reports
  - Feature implementation summaries
  - Optimization reports
- **`guides/`** - Implementation and development guides
  - Development pattern guides
  - Migration guides
- **`deployment/`** - Deployment-related documentation
- **`features/`** - Feature-specific documentation
- **`troubleshooting/`** - Debugging and issue resolution docs
- **`development/`** - Development environment and setup docs

### `/scripts/` - Automation and Utilities

- **`debug/`** - Debug and diagnostic scripts
  - Image loading diagnostics
  - Site-wide audit tools
  - Component debugging utilities
- **`testing/`** - Test scripts and validation tools
  - API testing scripts
  - OAuth configuration tests
  - Environment validation
- **`api-tests/`** - API-specific testing utilities
- **Root scripts/** - Database migrations, maintenance, and utility scripts

### `/temp/` - Temporary Files and Backups

- **`backups/`** - Configuration backups and deprecated files
- Temporary environment files
- Build artifacts and logs

### `/examples/` - Example Files and Templates

- Sample configurations
- Example data structures

## File Organization Principles

1. **Documentation First**: All `.md` files (except README.md) moved to appropriate `docs/` subdirectories
2. **Script Categorization**: Debug, test, and utility scripts organized by purpose
3. **Backup Preservation**: Old configurations preserved in `temp/backups/`
4. **Clean Root**: Only essential Next.js and configuration files remain at root level
5. **Git History Preserved**: Used `git mv` to maintain file history where possible

## Benefits of This Structure

- **Easier Navigation**: Clear separation of concerns
- **Better Maintenance**: Related files grouped together
- **Cleaner Root**: Reduced clutter in project root
- **Scalable**: Structure supports future growth
- **Professional**: Industry-standard organization patterns

## Migration Notes

- All file moves were performed with `git mv` to preserve history
- TypeScript compilation verified after reorganization
- Updated `.gitignore` patterns for new structure
- No functional code changes - purely organizational

## Next Steps

Future phases will organize:

- Configuration file consolidation
- Build artifact management
- Environment configuration standardization
