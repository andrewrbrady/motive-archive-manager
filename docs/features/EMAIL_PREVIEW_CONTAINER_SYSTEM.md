# Email Preview and Container Configuration System

## Overview

The new email preview and container configuration system provides accurate email previews that match the actual exported email structure and allows complete customization of the email container appearance and behavior.

## Key Features

### 1. Accurate Email Previews

- **Platform-Specific Rendering**: Different preview layouts for SendGrid (div-based), Mailchimp (table-based), and Generic platforms
- **Exact Export Matching**: Email previews now match the actual exported email structure exactly
- **Proper CSS Processing**: Uses the same CSS processing pipeline as email export for consistent styling
- **Container Structure**: Includes proper header, content, and footer sections with configurable styling

### 2. Email Container Configuration

- **Complete Customization**: Full control over email container appearance including width, colors, padding, borders
- **Platform-Specific Settings**: Different configurations for different email platforms
- **Header/Footer Management**: Toggle and customize email headers and footers
- **Logo Integration**: Configure logo display in email headers
- **Content Area Styling**: Customize content background, text colors, and link colors
- **Mobile Responsiveness**: Configure mobile-specific settings
- **Custom CSS**: Add custom CSS for advanced styling

## Components

### EmailContainerConfig Interface

```typescript
interface EmailContainerConfig {
  // Layout
  maxWidth: string;
  backgroundColor: string;
  backgroundImage?: string;
  padding: string;
  borderRadius: string;
  boxShadow: string;

  // Header
  headerEnabled: boolean;
  headerBackgroundColor: string;
  headerPadding: string;
  logoUrl: string;
  logoAlt: string;
  logoHeight: string;

  // Footer
  footerEnabled: boolean;
  footerBackgroundColor: string;
  footerPadding: string;
  footerText: string;
  copyrightText: string;

  // Content area
  contentBackgroundColor: string;
  contentPadding: string;
  textColor: string;
  linkColor: string;

  // Platform-specific
  platform: "sendgrid" | "mailchimp" | "generic";
  forceTableLayout: boolean;

  // Mobile responsiveness
  mobileMaxWidth: string;
  mobilePadding: string;

  // Advanced
  customCSS: string;
  inlineStyles: boolean;
}
```

### EmailContainerConfig Component

- **Configuration Panel**: Rich UI for configuring all email container settings
- **Collapsible Interface**: Expandable panel that shows configuration when needed
- **Platform Selection**: Choose between SendGrid, Mailchimp, or Generic email platforms
- **Real-time Preview**: Changes instantly reflected in the email preview
- **Reset Functionality**: Quick reset to default settings
- **Validation**: Ensures valid CSS values and settings

### AccurateEmailPreview Component

- **Platform Rendering**: Renders emails differently based on selected platform
- **Container Structure**: Proper email container with header, content, and footer
- **Block Rendering**: Accurate rendering of content blocks with email-optimized CSS
- **Responsive Design**: Handles different screen sizes and email client constraints
- **Error Handling**: Graceful fallbacks for missing images or invalid content

## Usage

### 1. Basic Email Preview

```tsx
import { AccurateEmailPreview } from "./AccurateEmailPreview";
import { defaultEmailContainerConfig } from "./EmailContainerConfig";

<AccurateEmailPreview
  blocks={contentBlocks}
  containerConfig={defaultEmailContainerConfig}
  selectedStylesheetId={stylesheetId}
/>;
```

### 2. Email Container Configuration

```tsx
import { EmailContainerConfig } from "./EmailContainerConfig";

<EmailContainerConfig
  config={emailContainerConfig}
  onConfigChange={setEmailContainerConfig}
  isOpen={showEmailContainerConfig}
  onToggle={() => setShowEmailContainerConfig(!showEmailContainerConfig)}
/>;
```

### 3. Integration with BlockComposer

The system is automatically integrated with the BlockComposer component:

- Email container configuration appears when "Email Layout" preview mode is selected
- Configuration is saved/loaded with compositions
- Settings persist across sessions
- Real-time preview updates as you configure settings

## Platform Differences

### SendGrid Platform

- **Structure**: Div-based layout with CSS classes
- **Container**: Simple div wrapper with background and styling
- **Compatibility**: Modern email clients with CSS support
- **Best For**: Marketing emails, newsletters with rich formatting

### Mailchimp Platform

- **Structure**: Table-based layout for maximum compatibility
- **Container**: HTML table structure with proper cellspacing/cellpadding
- **Compatibility**: All email clients including legacy ones
- **Best For**: Transactional emails, wide audience reach

### Generic Platform

- **Structure**: Standard HTML email format
- **Container**: Basic div structure with inline styles
- **Compatibility**: Balanced approach for most use cases
- **Best For**: General purpose emails, cross-platform compatibility

## Configuration Options

### Layout Settings

- **Max Width**: Control email container width (default: 600px)
- **Background Color**: Set container background color
- **Padding**: Configure spacing around email content
- **Border Radius**: Add rounded corners to container
- **Box Shadow**: Add drop shadow for visual depth

### Header Configuration

- **Enable/Disable**: Toggle email header display
- **Background Color**: Header background color
- **Padding**: Header spacing configuration
- **Logo URL**: Company logo image URL
- **Logo Alt Text**: Accessibility text for logo
- **Logo Height**: Control logo size

### Footer Configuration

- **Enable/Disable**: Toggle email footer display
- **Background Color**: Footer background color
- **Padding**: Footer spacing configuration
- **Footer Text**: Main footer text (e.g., "The Collector's Resource")
- **Copyright Text**: Copyright notice text

### Content Area

- **Background Color**: Content area background
- **Padding**: Content area spacing
- **Text Color**: Default text color for content
- **Link Color**: Color for links throughout the email

### Advanced Settings

- **Force Table Layout**: Use table-based layout regardless of platform
- **Inline Styles**: Convert CSS classes to inline styles
- **Custom CSS**: Add custom CSS for advanced styling
- **Mobile Settings**: Configure mobile-specific responsive behavior

## Benefits

### For Users

1. **WYSIWYG Accuracy**: What you see in preview is exactly what gets exported
2. **Complete Control**: Full customization of email appearance
3. **Platform Optimization**: Different configurations for different email services
4. **Professional Results**: Email-optimized layouts that work across all clients
5. **Easy Configuration**: Intuitive UI for all email container settings

### For Developers

1. **Consistent Architecture**: Clean separation between preview and export
2. **Maintainable Code**: Modular components for email rendering
3. **Extensible System**: Easy to add new platforms or features
4. **Type Safety**: Full TypeScript support for all configurations
5. **CSS Processing**: Proper email CSS optimization and inlining

## Migration from Old System

The new system automatically replaces the old email preview when "Email Layout" mode is selected. Existing compositions will continue to work with default settings, and users can gradually configure their email containers as needed.

### Breaking Changes

- None - the system is backward compatible

### Recommended Migration Steps

1. **Switch to Email Layout**: Use "Email Layout" preview mode for email content
2. **Configure Container**: Customize email container settings for your brand
3. **Test Exports**: Verify email exports match your preview expectations
4. **Save Configurations**: Email container settings are automatically saved with compositions

## Troubleshooting

### Preview Not Matching Export

- **Check Platform Setting**: Ensure preview platform matches export platform
- **Verify CSS Processing**: Both preview and export use same CSS processing
- **Test Container Config**: Reset to defaults and gradually customize

### Container Not Displaying

- **Check Email Mode**: Container config only appears in "Email Layout" preview mode
- **Verify Component Import**: Ensure EmailContainerConfig component is properly imported
- **Check Props**: Verify all required props are passed to components

### Styling Issues

- **Inline Styles**: Enable inline styles for better email client compatibility
- **Platform Compatibility**: Use table layout for maximum compatibility
- **Custom CSS**: Use custom CSS field for advanced styling needs

## Future Enhancements

- **Template Library**: Pre-built container configurations for common use cases
- **Brand Presets**: Save and reuse brand-specific container configurations
- **A/B Testing**: Compare different container configurations
- **Advanced Mobile**: More granular mobile responsiveness controls
- **Platform Sync**: Automatically sync configurations between platforms
