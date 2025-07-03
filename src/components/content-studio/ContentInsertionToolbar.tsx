"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Type,
  Heading,
  Minus,
  PlusCircle,
  ChevronDown,
  ImageIcon,
  Save,
  Loader2,
  FileText,
} from "lucide-react";
import { ImageGalleryPopup } from "./ImageGalleryPopup";

interface ContentInsertionToolbarProps {
  activeBlockId: string | null;
  isInsertToolbarExpanded: boolean;
  onToggleExpanded: () => void;
  onAddTextBlock: () => void;
  onAddDividerBlock: () => void;
  onAddFrontmatterBlock?: () => void;
  // Image gallery props
  finalImages?: any[];
  loadingImages?: boolean;
  projectId?: string;
  onRefreshImages?: () => void;
  onAddImage?: (imageUrl: string, altText?: string) => void;
  // Save functionality
  onSave?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  isUpdate?: boolean;
}

/**
 * ContentInsertionToolbar - Fixed bottom toolbar for adding content blocks
 * Extracted from BlockComposer for better maintainability and performance
 * Maintains all existing functionality and active block positioning logic
 * Enhanced with ImageGalleryPopup integration
 */
export const ContentInsertionToolbar = React.memo<ContentInsertionToolbarProps>(
  function ContentInsertionToolbar({
    activeBlockId,
    isInsertToolbarExpanded,
    onToggleExpanded,
    onAddTextBlock,
    onAddDividerBlock,
    onAddFrontmatterBlock,
    finalImages = [],
    loadingImages = false,
    projectId,
    onRefreshImages,
    onAddImage,
    onSave,
    isSaving = false,
    canSave = false,
    isUpdate = false,
  }) {
    // Show image gallery button only if we have the necessary props and images
    const showImageGallery =
      finalImages.length > 0 && onRefreshImages && onAddImage;

    return (
      <>
        {/* Fixed Bottom Content Insertion Toolbar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            {/* Collapsed State - Single Line */}
            {!isInsertToolbarExpanded ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {onSave && (
                    <Button
                      onClick={onSave}
                      disabled={isSaving || !canSave}
                      variant="default"
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isUpdate ? "Update" : "Save"}
                    </Button>
                  )}
                  <Button
                    onClick={() => onToggleExpanded()}
                    variant="outline"
                    size="sm"
                    className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Insert Content
                  </Button>
                  {activeBlockId && (
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Inserting below active block
                    </div>
                  )}
                </div>

                {/* Quick Insert - Most Common Actions */}
                <div className="flex items-center gap-2">
                  {/* Image Gallery Popup Button */}
                  {showImageGallery && (
                    <ImageGalleryPopup
                      finalImages={finalImages}
                      loadingImages={loadingImages}
                      projectId={projectId}
                      activeBlockId={activeBlockId}
                      onRefreshImages={onRefreshImages}
                      onAddImage={onAddImage}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-muted/20"
                        title="Add Images"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </ImageGalleryPopup>
                  )}
                  {onAddFrontmatterBlock && (
                    <Button
                      onClick={onAddFrontmatterBlock}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-muted/20"
                      title="Add Article Metadata"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    onClick={onAddTextBlock}
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/20"
                    title="Add Text Block"
                  >
                    <Type className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={onAddDividerBlock}
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/20"
                    title="Add Horizontal Rule"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Expanded State - Full Options */
              <div className="space-y-3">
                {/* Header with collapse button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Insert Content</h3>
                  <Button
                    onClick={() => onToggleExpanded()}
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/20"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* All Insert Options */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {/* Save Button */}
                  {onSave && (
                    <Button
                      onClick={onSave}
                      disabled={isSaving || !canSave}
                      variant="default"
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isUpdate ? "Update" : "Save"}
                    </Button>
                  )}

                  {/* Image Gallery Button */}
                  {showImageGallery && (
                    <ImageGalleryPopup
                      finalImages={finalImages}
                      loadingImages={loadingImages}
                      projectId={projectId}
                      activeBlockId={activeBlockId}
                      onRefreshImages={onRefreshImages}
                      onAddImage={onAddImage}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Add Images
                      </Button>
                    </ImageGalleryPopup>
                  )}

                  {/* Frontmatter Block Button */}
                  {onAddFrontmatterBlock && (
                    <Button
                      onClick={onAddFrontmatterBlock}
                      variant="outline"
                      size="sm"
                      className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Article Metadata
                    </Button>
                  )}

                  {/* Text Block Button */}
                  <Button
                    onClick={onAddTextBlock}
                    variant="outline"
                    size="sm"
                    className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Text Block
                  </Button>

                  {/* Horizontal Rule / Divider Button */}
                  <Button
                    onClick={onAddDividerBlock}
                    variant="outline"
                    size="sm"
                    className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Horizontal Rule
                  </Button>
                </div>

                {/* Active Block Indicator */}
                {activeBlockId && (
                  <div className="text-center">
                    <div className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Content will be inserted below the active block
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Padding to Account for Fixed Toolbar */}
        <div className="h-20" />
      </>
    );
  }
);
