/**
 * Content Studio Types
 *
 * TypeScript definitions for the Content Studio multimedia enhancement feature
 */

// Content block types that can be added to templates
export type ContentBlockType =
  | "text"
  | "image"
  | "video"
  | "divider"
  | "button"
  | "spacer"
  | "columns"
  | "frontmatter"
  | "list"
  | "html";

// Base interface for all content blocks
export interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
  order: number;
  styles?: Record<string, any>;
  metadata?: Record<string, any>;
  // CSS styling support
  cssClassName?: string;
  cssClass?: {
    name: string;
    selector: string;
    properties: { [key: string]: string };
    description?: string;
    category?: string;
  };
}

// Specific block types
export interface TextBlock extends BaseContentBlock {
  type: "text";
  content: string;
  // Element type - can be paragraph or any heading level
  element: "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  formatting?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: "left" | "center" | "right";
    lineHeight?: string;
    marginTop?: string;
    marginBottom?: string;
  };
  // Rich text formatting support for bold and links
  richFormatting?: {
    enabled?: boolean;
    // Store rich content as HTML or markdown-like format
    formattedContent?: string;
    // Track formatting rules applied
    hasLinks?: boolean;
    hasBold?: boolean;
  };
}

export interface ImageBlock extends BaseContentBlock {
  type: "image";
  imageUrl: string;
  altText: string;
  width?: string;
  height?: string;
  alignment?: "left" | "center" | "right";
  caption?: string;
  linkUrl?: string; // Optional link URL for the image
  linkTarget?: string; // Link target (_blank, _self, etc.)
  // Email-specific properties for fluid-hybrid pattern
  email?: {
    isFullWidth?: boolean; // Triggers fluid-hybrid wrapper
    outlookWidth?: string; // Fixed width for Outlook (default: "600")
    maxWidth?: string; // Max width for modern clients (default: "1200")
    backgroundColor?: string; // Background color for full-width sections
    minHeight?: string; // Minimum height for full-width images
    mobileMinHeight?: string; // Minimum height for mobile devices
    useCenterCrop?: boolean; // Whether to use center crop for full-width images
  };
}

export interface VideoBlock extends BaseContentBlock {
  type: "video";
  url: string;
  title?: string;
  platform: "youtube" | "vimeo";
  embedId: string;
  aspectRatio: "16:9" | "4:3" | "1:1";
  width?: string;
  height?: string;
  alignment?: "left" | "center" | "right";
}

export interface DividerBlock extends BaseContentBlock {
  type: "divider";
  thickness?: string;
  color?: string;
  margin?: string;
}

export interface ButtonBlock extends BaseContentBlock {
  type: "button";
  text: string;
  url: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  padding?: string;
}

export interface SpacerBlock extends BaseContentBlock {
  type: "spacer";
  height: string;
}

export interface ColumnsBlock extends BaseContentBlock {
  type: "columns";
  columns: ContentBlock[][];
  columnCount: 2 | 3 | 4;
  gap?: string;
}

export interface FrontmatterBlock extends BaseContentBlock {
  type: "frontmatter";
  data: {
    title?: string;
    subtitle?: string;
    author?: string;
    date?: string;
    status?: string;
    cover?: string;
    tags?: string[];
    callToAction?: string;
    callToActionUrl?: string;
    [key: string]: any; // Allow custom fields
  };
}

export interface ListBlock extends BaseContentBlock {
  type: "list";
  items: string[];
  style: "ul"; // Only unordered for now
}

export interface HTMLBlock extends BaseContentBlock {
  type: "html";
  content: string;
  description?: string; // Optional description for the HTML block
}

// Backward compatibility - HeadingBlock is now just a TextBlock with heading element
export type HeadingBlock = TextBlock & {
  element: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
};

// Union type for all content blocks
export type ContentBlock =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | DividerBlock
  | ButtonBlock
  | SpacerBlock
  | ColumnsBlock
  | FrontmatterBlock
  | ListBlock
  | HTMLBlock; // Added HTMLBlock

// Template structure
export interface ContentTemplate {
  id: string;
  name: string;
  type: "email" | "landing-page" | "social-media";
  blocks: ContentBlock[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    tags?: string[];
    description?: string;
  };
  settings: {
    maxWidth?: string;
    backgroundColor?: string;
    padding?: string;
    fontFamily?: string;
  };
}

// Copy selection from existing UnifiedCopywriter captions
export interface SelectedCopy {
  id: string;
  text: string;
  type: string;
  carId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Content Studio tab props
export interface ContentStudioTabProps {
  // For car mode
  carId?: string;
  carInfo?: any;

  // For project mode
  projectId?: string;
  projectInfo?: any;

  // Callbacks
  onUpdate?: () => void;
}

// Copy selector props
export interface CopySelectorProps {
  carId?: string;
  projectId?: string;
  onCopySelect: (copies: SelectedCopy[]) => void;
  selectedCopies: SelectedCopy[];
}

// Block composer props
export interface BlockComposerProps {
  selectedCopies: SelectedCopy[];
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
  template?: ContentTemplate;
  onTemplateChange?: (template: ContentTemplate) => void;
  loadedComposition?: any; // For editing existing compositions
  carId?: string; // For compositions not created from selected copies
  projectId?: string; // For compositions not created from selected copies
}

// API response types (reusing existing patterns)
export interface CaptionAPIResponse {
  captions: Array<{
    _id: string;
    text: string;
    type: string;
    carId?: string;
    projectId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt?: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

// Content Studio state
export interface ContentStudioState {
  selectedCopies: SelectedCopy[];
  activeTemplate: ContentTemplate | null;
  blocks: ContentBlock[];
  isLoading: boolean;
  error: string | null;
}

// Loaded composition interface for content studio
export interface LoadedComposition {
  _id: string;
  name: string;
  blocks: ContentBlock[];
  metadata?: {
    selectedCopies?: SelectedCopy[];
    [key: string]: any;
  };
  [key: string]: any;
}
