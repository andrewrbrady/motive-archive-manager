/**
 * Stylesheet Management Types
 * For managing client-specific CSS stylesheets and their extracted classes
 */

import { CSSClass, ParsedCSS } from "@/lib/css-parser";

export interface ClientStylesheet {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  cssContent: string;
  parsedCSS: ParsedCSS;
  isDefault?: boolean;
  isActive?: boolean;
  uploadedAt: Date;
  updatedAt: Date;
  uploadedBy: string; // User ID
  description?: string;
  version?: string;
  tags?: string[];
}

export interface StylesheetMetadata {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  isDefault?: boolean;
  isActive?: boolean;
  classCount: number;
  categoryCount: number;
  uploadedAt: Date;
  uploadedBy: string;
  description?: string;
  version?: string;
  tags?: string[];
}

export interface SelectedStyleOptions {
  stylesheetId: string;
  selectedClasses: string[]; // Array of class names to use
  customOverrides?: { [className: string]: Partial<CSSClass> };
}

export interface BlockStyleOptions {
  className?: string;
  customStyles?: React.CSSProperties;
  cssClass?: CSSClass;
}

// Content block types with styling support
export interface StyledTextBlock {
  id: string;
  type: "text";
  content: string;
  order: number;
  styles: BlockStyleOptions;
  richFormatting?: {
    enabled: boolean;
    formattedContent: string;
    hasLinks?: boolean;
    hasBold?: boolean;
    hasItalic?: boolean;
  };
  metadata?: any;
}

export interface StyledHeadingBlock {
  id: string;
  type: "heading";
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  order: number;
  styles: BlockStyleOptions;
  richFormatting?: {
    enabled: boolean;
    formattedContent: string;
    hasLinks?: boolean;
    hasBold?: boolean;
  };
  metadata?: any;
}

export interface StyledImageBlock {
  id: string;
  type: "image";
  imageUrl: string;
  altText?: string;
  caption?: string;
  order: number;
  styles: BlockStyleOptions;
  width?: string;
  height?: string;
  alignment?: "left" | "center" | "right";
  metadata?: any;
}

export interface StyledDividerBlock {
  id: string;
  type: "divider";
  order: number;
  styles: BlockStyleOptions;
  thickness?: string;
  color?: string;
  margin?: string;
  metadata?: any;
}

export interface StyledButtonBlock {
  id: string;
  type: "button";
  text: string;
  url?: string;
  order: number;
  styles: BlockStyleOptions;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  padding?: string;
  metadata?: any;
}

export type StyledContentBlock =
  | StyledTextBlock
  | StyledHeadingBlock
  | StyledImageBlock
  | StyledDividerBlock
  | StyledButtonBlock;

// API request/response types
export interface CreateStylesheetRequest {
  name: string;
  clientId?: string;
  cssContent: string;
  description?: string;
  version?: string;
  tags?: string[];
  isDefault?: boolean;
}

export interface UpdateStylesheetRequest {
  name?: string;
  cssContent?: string;
  description?: string;
  version?: string;
  tags?: string[];
  isDefault?: boolean;
  isActive?: boolean;
}

export interface StylesheetListResponse {
  stylesheets: StylesheetMetadata[];
  total: number;
}

export interface StylesheetResponse {
  stylesheet: ClientStylesheet;
}

export interface ClassSearchRequest {
  stylesheetId: string;
  query?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ClassSearchResponse {
  classes: CSSClass[];
  total: number;
  categories: string[];
}
