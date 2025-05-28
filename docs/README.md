# Motive Archive Manager Documentation

This directory contains all documentation for the Motive Archive Manager project, organized by category for easy navigation.

## 📁 Directory Structure

### `/deployment/`

Documentation related to deploying services and infrastructure:

- **CLOUD_SERVICE_DEPLOYMENT.md** - Guide for deploying the canvas service to Google Cloud Run
- **DEPLOY_CANVAS_SERVICE.md** - Canvas service deployment instructions

### `/features/`

Documentation for major features and their implementation:

- **PROJECTS_IMPLEMENTATION.md** - Comprehensive guide to the projects feature implementation
- **CANVAS_EXTENSION_README.md** - Canvas extension feature documentation

### `/guides/`

User and developer guides:

- **MOTIVE_STYLING_GUIDE.md** - Complete styling and UI/UX guidelines
- **LOADING_UI_UNIFICATION_GUIDE.md** - Guide for consistent loading states across the app

### `/troubleshooting/`

Troubleshooting guides and setup instructions:

- **OAUTH-TROUBLESHOOTING.md** - OAuth authentication troubleshooting
- **MOBILE-OAUTH-TROUBLESHOOTING.md** - Mobile-specific OAuth issues
- **YOUTUBE-OAUTH-SETUP.md** - YouTube OAuth configuration
- **FIXING-NEXT-ROUTES.md** - Next.js routing issues and fixes

### `/development/`

Development-specific documentation:

- **EVENT_SYSTEM_ANALYSIS.md** - Analysis of the event system architecture
- **CAPTION_GENERATOR_MIGRATION.md** - Caption generator migration guide
- **README-migrate-oauth-users.md** - OAuth user migration instructions
- **BAT_SCRAPER_INSTRUCTIONS.md** - BAT scraper development instructions
- **SECURITY_AUDIT_CHECKLIST.md** - Security audit checklist for development
- **INSPECTION_FEATURE_CHECKLIST.md** - Inspection feature development checklist

### Root Level Documentation

- **cars-api-documentation.md** - Cars API documentation
- **API_SETUP.md** - API setup and configuration
- **cloudflare_images_api_documentation.md** - Cloudflare Images API documentation
- **developer-guide.md** - General developer guide
- **image-api.md** - Image API documentation
- **image-variants.md** - Image variants documentation
- **KIT_SYSTEM_IMPLEMENTATION.md** - Kit system implementation guide
- **list-components.md** - Component listing and documentation
- **router-migration.md** - Router migration guide
- **upload-endpoint-testing.md** - Upload endpoint testing guide
- **url-fix-summary.md** - URL fix summary

## 🚀 Quick Start

1. **For Deployment**: Start with `/deployment/` guides
2. **For Feature Development**: Check `/features/` and `/development/`
3. **For Styling**: See `/guides/MOTIVE_STYLING_GUIDE.md`
4. **For Issues**: Check `/troubleshooting/`
5. **For API Reference**: See root-level API documentation files

## 📝 Contributing to Documentation

When adding new documentation:

1. Place it in the appropriate category directory
2. Use descriptive filenames with `.md` extension
3. Update this README with a brief description
4. Follow the existing documentation style and formatting

## 🔍 Finding Documentation

Use your IDE's search functionality or `grep` to find specific topics across all documentation files:

```bash
# Search for a specific topic
grep -r "oauth" docs/

# Find files containing specific terms
find docs/ -name "*.md" -exec grep -l "deployment" {} \;
```
