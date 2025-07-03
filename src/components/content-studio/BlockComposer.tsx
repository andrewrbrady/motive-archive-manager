"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Loader2,
  Palette,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Columns2,
  Columns,
  Eye,
} from "lucide-react";

import { ContentInsertionToolbar } from "./ContentInsertionToolbar";
import { IntegratedPreviewEditor } from "./IntegratedPreviewEditor";
import { StylesheetSelector } from "../BlockComposer/StylesheetSelector";
import { RendererFactory, PreviewMode } from "./renderers/RendererFactory";

// Custom hooks
import { useFrontmatterOperations } from "@/hooks/useFrontmatterOperations";
import { useBlockOperations } from "@/hooks/useBlockOperations";
import { useContentExport } from "@/hooks/useContentExport";
import { useBlockComposerImages } from "@/hooks/useBlockComposerImages";

import { api } from "@/lib/api-client";
import { BlockComposerProps, ContentBlock, TextBlock } from "./types";

/**
 * FRONTMATTER PARSING FIX SUMMARY:
 *
 * 1. Added parseFrontmatterFromBlocks() function to extract YAML frontmatter from text blocks
 * 2. Filters out frontmatter blocks from main content display in news article mode
 * 3. Uses parsed frontmatter data to populate article header (title, subtitle, author, date, etc.)
 * 4. Properly handles cover image extraction from frontmatter or first image block
 * 5. Removes raw frontmatter text from appearing in article body
 *
 * SAMPLE FRONTMATTER FORMAT:
 * ---
 * title: "1965 Porsche 911 Outlaw"
 * subtitle: "Street-Legal Track Beast"
 * author: "Motive Archive"
 * date: "2024-01-15"
 * status: "LIVE AUCTION"
 * cover: "https://imagedelivery.net/..."
 * tags: ["porsche", "outlaw", "track"]
 * callToAction: "Bid on this vehicle"
 * callToActionUrl: "https://bringatrailer.com/..."
 * ---
 */

/**
 * BlockComposer - Copy-Driven Content Creator for Content Studio
 *
 * This component automatically creates content blocks from selected copy and allows
 * users to enhance them with images from associated galleries.
 *
 * PHASE 3A PERFORMANCE IMPLEMENTATION:
 * - Extracted ImageGallery and ContentInsertionToolbar components for better maintainability
 * - Reduced file size from 1825 lines to improve developer experience
 * - Maintained all existing performance optimizations and React.memo usage
 * - Preserved lazy loading for gallery images with intersection observer
 * - Kept memoized callback functions to prevent unnecessary re-renders
 *
 * PHASE 3B PERFORMANCE IMPLEMENTATION:
 * - Removed redundant GalleryImage component (now handled by ImageGallery.tsx)
 * - Further reduced file size for improved maintainability
 *
 * REFACTORING PHASE 4:
 * - Extracted frontmatter operations to useFrontmatterOperations hook
 * - Extracted block operations to useBlockOperations hook
 * - Extracted export functionality to useContentExport hook and ContentExporter utility
 * - Extracted image gallery operations to useBlockComposerImages hook
 * - Reduced file size from 1733 lines to ~600 lines for better maintainability
 */
export function BlockComposer({
  selectedCopies,
  blocks,
  onBlocksChange,
  template,
  onTemplateChange,
  loadedComposition,
}: BlockComposerProps) {
  const { toast } = useToast();

  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [compositionName, setCompositionName] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isInsertToolbarExpanded, setIsInsertToolbarExpanded] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("clean");

  // Stylesheet management
  const [selectedStylesheetId, setSelectedStylesheetId] = useState<
    string | null
  >(null);

  // Custom hooks for extracted functionality
  const {
    frontmatter,
    setFrontmatter,
    detectFrontmatterInTextBlock,
    convertTextToFrontmatterBlock,
    addFrontmatterBlock,
    addFrontmatterBlocks,
  } = useFrontmatterOperations(
    blocks,
    onBlocksChange,
    setActiveBlockId,
    compositionName
  );

  const {
    addImageFromGallery,
    removeBlock,
    updateBlock,
    moveBlock,
    addTextBlock,
    addHeadingBlock,
    addDividerBlock,
  } = useBlockOperations(
    blocks,
    onBlocksChange,
    activeBlockId,
    setActiveBlockId,
    selectedCopies[0]?.projectId,
    selectedCopies[0]?.carId
  );

  const { exportToHTML, copyHTMLToClipboard, exportToMDX, hasEmailFeatures } =
    useContentExport();

  const { finalImages, loadingImages, refetchImages } =
    useBlockComposerImages(selectedCopies);

  // Initialize composition name when loading existing composition
  React.useEffect(() => {
    if (loadedComposition) {
      setCompositionName(loadedComposition.name || "");

      // Load stylesheet selection if it exists in metadata
      if (loadedComposition.metadata?.selectedStylesheetId) {
        setSelectedStylesheetId(
          loadedComposition.metadata.selectedStylesheetId
        );
      }

      // Load frontmatter if it exists in metadata
      if (loadedComposition.metadata?.frontmatter) {
        setFrontmatter({
          ...frontmatter,
          ...loadedComposition.metadata.frontmatter,
        });
      }
    }
  }, [loadedComposition]);

  // Migration effect: ensure all text blocks have an element property
  React.useEffect(() => {
    const needsMigration = blocks.some(
      (block) => block.type === "text" && !(block as TextBlock).element
    );

    if (needsMigration) {
      const migratedBlocks = blocks.map((block) => {
        if (block.type === "text" && !(block as TextBlock).element) {
          return {
            ...block,
            element: "p", // Default to paragraph for existing text blocks
          } as TextBlock;
        }
        return block;
      });
      onBlocksChange(migratedBlocks);
    }
  }, [blocks, onBlocksChange]);

  // Automatically import selected copy into blocks (split by paragraphs with ## header detection)
  useEffect(() => {
    if (selectedCopies.length > 0 && blocks.length === 0) {
      const textBlocks: TextBlock[] = [];
      let blockIndex = 0;

      selectedCopies.forEach((copy) => {
        // Split copy into paragraphs - handle different paragraph separation patterns
        let paragraphs: string[] = [];

        // First try double line breaks (common in articles)
        const doubleBreakSplit = copy.text.split(/\n\s*\n|\r\n\s*\r\n/);

        if (doubleBreakSplit.length > 1) {
          // Use double line break splitting
          paragraphs = doubleBreakSplit
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
        } else {
          // Fallback to single line breaks for email/newsletter format
          paragraphs = copy.text
            .split(/\n|\r\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
            .filter((p) => p !== "---"); // Remove separator lines
        }

        paragraphs.forEach((paragraph) => {
          // Helper function to create heading blocks (now unified with text blocks)
          const createHeadingBlock = (content: string, level: 1 | 2 | 3) => ({
            id: `text-${Date.now()}-${blockIndex}`,
            type: "text" as const,
            order: blockIndex,
            content: content.trim(),
            element: `h${level}` as "h1" | "h2" | "h3",
            styles: {},
            metadata: {
              source: "copy-import",
              copyId: copy.id,
              originalText: paragraph,
              createdAt: new Date().toISOString(),
            },
          });

          // Check for heading indicators (## H2, ### H3, # H1)
          if (paragraph.startsWith("### ")) {
            textBlocks.push(createHeadingBlock(paragraph.substring(4), 3));
          } else if (paragraph.startsWith("## ")) {
            textBlocks.push(createHeadingBlock(paragraph.substring(3), 2));
          } else if (paragraph.startsWith("# ")) {
            textBlocks.push(createHeadingBlock(paragraph.substring(2), 1));
          } else {
            // Regular text block
            const textBlock: TextBlock = {
              id: `text-${Date.now()}-${blockIndex}`,
              type: "text",
              order: blockIndex,
              content: paragraph,
              element: "p",
              styles: {},
              metadata: {
                source: "copy-import",
                copyId: copy.id,
                originalText: paragraph,
                createdAt: new Date().toISOString(),
              },
            };
            textBlocks.push(textBlock);
          }
          blockIndex++;
        });
      });

      onBlocksChange(textBlocks);
    }
  }, [selectedCopies, blocks.length, onBlocksChange]);

  // Drag and drop handlers - simplified for reliability
  const handleDragStart = (blockId: string) => {
    setDraggedBlockId(blockId);
  };

  const handleDragEnd = () => {
    if (draggedBlockId && draggedOverIndex !== null) {
      const draggedIndex = blocks.findIndex(
        (block) => block.id === draggedBlockId
      );
      if (draggedIndex !== -1 && draggedIndex !== draggedOverIndex) {
        const reorderedBlocks = [...blocks];
        const [draggedBlock] = reorderedBlocks.splice(draggedIndex, 1);
        reorderedBlocks.splice(draggedOverIndex, 0, draggedBlock);

        // Update order values
        reorderedBlocks.forEach((block, index) => {
          block.order = index;
        });

        onBlocksChange(reorderedBlocks);
      }
    }

    setDraggedBlockId(null);
    setDraggedOverIndex(null);
  };

  const handleDragOver = (index: number) => {
    if (draggedBlockId) {
      setDraggedOverIndex(index);
    }
  };

  // Save composition
  const saveComposition = useCallback(async () => {
    if (!compositionName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your composition.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const compositionData = {
        name: compositionName,
        type: "content-composition",
        blocks,
        template: template || null,
        metadata: {
          selectedStylesheetId,
          frontmatter,
          projectId: selectedCopies[0]?.projectId,
          carId: selectedCopies[0]?.carId,
          selectedCopies,
          createdAt: loadedComposition?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const endpoint = loadedComposition
        ? `/api/content-studio/compositions/${loadedComposition._id}`
        : "/api/content-studio/compositions";

      const method = loadedComposition ? "put" : "post";
      const response = await api[method](endpoint, compositionData);

      toast({
        title: loadedComposition ? "Composition Updated" : "Composition Saved",
        description: `"${compositionName}" has been ${
          loadedComposition ? "updated" : "saved"
        }.`,
      });
    } catch (error) {
      console.error("Failed to save composition:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save your composition. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    compositionName,
    blocks,
    template,
    selectedStylesheetId,
    frontmatter,
    selectedCopies,
    loadedComposition,
    toast,
    api,
  ]);

  // Callback functions for extracted components
  const handleToggleInsertToolbar = useCallback(() => {
    setIsInsertToolbarExpanded(!isInsertToolbarExpanded);
  }, [isInsertToolbarExpanded]);

  return (
    <div className="flex-1 space-y-6 pb-6">
      {/* Header Controls - Full Width */}
      <Card className="bg-transparent border border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Content Composition
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={saveComposition}
                disabled={isSaving || !compositionName.trim()}
                variant="default"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {loadedComposition ? "Update" : "Save"}
              </Button>

              {/* Stylesheet Selector */}
              <StylesheetSelector
                selectedStylesheetId={selectedStylesheetId || undefined}
                onStylesheetChange={setSelectedStylesheetId}
                className="w-auto"
              />

              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant={showPreview ? "default" : "outline"}
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
                title={showPreview ? "Hide preview" : "Show preview"}
              >
                {showPreview ? (
                  <Columns className="h-4 w-4 mr-2" />
                ) : (
                  <Columns2 className="h-4 w-4 mr-2" />
                )}
                {showPreview ? "Single View" : "Preview"}
              </Button>

              {/* Preview Mode Selector */}
              {showPreview && (
                <Select
                  value={previewMode}
                  onValueChange={(value: "clean" | "news-article" | "email") =>
                    setPreviewMode(value)
                  }
                >
                  <SelectTrigger className="w-auto min-w-[140px] bg-background border-border/40 hover:bg-muted/20 shadow-sm">
                    <Eye className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">Clean Preview</SelectItem>
                    <SelectItem value="news-article">News Article</SelectItem>
                    <SelectItem value="email">Email Layout</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={() =>
                  exportToHTML(
                    blocks,
                    template,
                    compositionName,
                    "web",
                    selectedCopies[0]?.projectId,
                    selectedCopies[0]?.carId
                  )
                }
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Web HTML
              </Button>
              <Button
                onClick={() =>
                  exportToHTML(
                    blocks,
                    template,
                    compositionName,
                    "email",
                    selectedCopies[0]?.projectId,
                    selectedCopies[0]?.carId
                  )
                }
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Email HTML
                {hasEmailFeatures(blocks) && (
                  <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                    Fluid
                  </span>
                )}
              </Button>
              <Button
                onClick={() =>
                  copyHTMLToClipboard(
                    blocks,
                    template,
                    compositionName,
                    "web",
                    selectedCopies[0]?.projectId,
                    selectedCopies[0]?.carId
                  )
                }
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Web HTML
              </Button>
              <Button
                onClick={() =>
                  copyHTMLToClipboard(
                    blocks,
                    template,
                    compositionName,
                    "email",
                    selectedCopies[0]?.projectId,
                    selectedCopies[0]?.carId
                  )
                }
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Email HTML
                {hasEmailFeatures(blocks) && (
                  <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                    Fluid
                  </span>
                )}
              </Button>
              <Button
                onClick={() => exportToMDX(blocks, compositionName)}
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export MDX
              </Button>
              <Button
                onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                variant="ghost"
                size="sm"
                className="hover:bg-muted/20"
                title={isHeaderCollapsed ? "Expand header" : "Collapse header"}
              >
                {isHeaderCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {!isHeaderCollapsed && (
          <CardContent className="space-y-4">
            {/* Composition Name */}
            <div className="space-y-2">
              <Label htmlFor="composition-name" className="text-sm font-medium">
                Composition Name
              </Label>
              <Input
                id="composition-name"
                value={compositionName}
                onChange={(e) => setCompositionName(e.target.value)}
                placeholder="Enter a name for your composition..."
                className="bg-background border-border/40"
              />
            </div>

            {/* News Article Actions - Show only in news-article preview mode */}
            {previewMode === "news-article" && (
              <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50/30">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  News Article Tools
                </h4>
                <div className="flex gap-2 items-start">
                  <Button
                    onClick={addFrontmatterBlocks}
                    variant="outline"
                    size="sm"
                    className="bg-background border-border/40 hover:bg-muted/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Add Article Structure
                  </Button>
                  <div className="text-xs text-blue-700 flex items-center max-w-md">
                    Adds editable title, subtitle, meta info, and content
                    sections to your article. Each section becomes an editable
                    block.
                  </div>
                </div>
              </div>
            )}

            {/* Block Count Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-transparent">
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Content Editor - Single or Two Column Layout */}
      {showPreview ? (
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-300px)]">
          {/* Preview Column - Left */}
          <div className="overflow-y-auto border border-border/40 rounded-lg bg-background">
            <RendererFactory
              mode={previewMode}
              blocks={blocks}
              selectedStylesheetId={selectedStylesheetId}
              compositionName={compositionName}
              frontmatter={frontmatter}
            />
          </div>

          {/* Editor Column - Right */}
          <div className="overflow-y-auto">
            <IntegratedPreviewEditor
              blocks={blocks}
              selectedStylesheetId={selectedStylesheetId}
              activeBlockId={activeBlockId}
              draggedBlockId={draggedBlockId}
              draggedOverIndex={draggedOverIndex}
              onSetActive={setActiveBlockId}
              onUpdateBlock={updateBlock}
              onRemoveBlock={removeBlock}
              onMoveBlock={moveBlock}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onBlocksChange={onBlocksChange}
              onConvertTextToFrontmatter={convertTextToFrontmatterBlock}
              detectFrontmatterInTextBlock={detectFrontmatterInTextBlock}
            />
          </div>
        </div>
      ) : (
        <IntegratedPreviewEditor
          blocks={blocks}
          selectedStylesheetId={selectedStylesheetId}
          activeBlockId={activeBlockId}
          draggedBlockId={draggedBlockId}
          draggedOverIndex={draggedOverIndex}
          onSetActive={setActiveBlockId}
          onUpdateBlock={updateBlock}
          onRemoveBlock={removeBlock}
          onMoveBlock={moveBlock}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onBlocksChange={onBlocksChange}
          onConvertTextToFrontmatter={convertTextToFrontmatterBlock}
          detectFrontmatterInTextBlock={detectFrontmatterInTextBlock}
        />
      )}

      {/* Content Insertion Toolbar */}
      <ContentInsertionToolbar
        activeBlockId={activeBlockId}
        isInsertToolbarExpanded={isInsertToolbarExpanded}
        onToggleExpanded={handleToggleInsertToolbar}
        onAddTextBlock={addTextBlock}
        onAddDividerBlock={addDividerBlock}
        onAddFrontmatterBlock={addFrontmatterBlock}
        finalImages={finalImages}
        loadingImages={loadingImages}
        projectId={selectedCopies[0]?.projectId}
        onRefreshImages={refetchImages}
        onAddImage={addImageFromGallery}
        onSave={saveComposition}
        isSaving={isSaving}
        canSave={!!compositionName.trim()}
        isUpdate={!!loadedComposition}
      />
    </div>
  );
}
