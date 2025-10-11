"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Columns2,
  Columns,
  Eye,
  Code,
  FileText,
} from "lucide-react";

import { ContentInsertionToolbar } from "./ContentInsertionToolbar";
import { IntegratedPreviewEditor } from "./IntegratedPreviewEditor";
import { StylesheetSelector } from "../BlockComposer/StylesheetSelector";
import { StylesheetInjector } from "../BlockComposer/StylesheetInjector";
import { RendererFactory, PreviewMode } from "./renderers/RendererFactory";
import { ExportModal } from "./ExportModal";
import { ExportOptions } from "@/lib/content-export";
import {
  EmailContainerConfig,
  EmailContainerConfig as EmailContainerConfigComponent,
  defaultEmailContainerConfig,
} from "./EmailContainerConfig";
import { CSSEditor } from "./CSSEditor";
import { MarkdownPasteModal } from "./MarkdownPasteModal";
import { ToolbarRow } from "./ToolbarRow";
import { Switch } from "@/components/ui/switch";

// Custom hooks
import { useFrontmatterOperations } from "@/hooks/useFrontmatterOperations";
import { useBlockOperations } from "@/hooks/useBlockOperations";
import { useContentExport } from "@/hooks/useContentExport";
import { useBlockComposerImages } from "@/hooks/useBlockComposerImages";
import {
  useStylesheetData,
  invalidateStylesheetCache,
} from "@/hooks/useStylesheetData";

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
  carId,
  projectId,
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
  const [editorMode, setEditorMode] = useState<"blocks" | "css">("blocks");

  // Stylesheet management
  const [selectedStylesheetId, setSelectedStylesheetId] = useState<
    string | null
  >(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [minimalHtml, setMinimalHtml] = useState(false);

  // Markdown paste modal state
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);

  // Email container configuration
  const [emailContainerConfig, setEmailContainerConfig] =
    useState<EmailContainerConfig>(defaultEmailContainerConfig);
  const [showEmailContainerConfig, setShowEmailContainerConfig] =
    useState(false);

  // CSS Editor state
  const [cssContent, setCSSContent] = useState<string>("");
  const [isSavingCSS, setIsSavingCSS] = useState(false);

  // Ref to store the latest CSS content for VIM mode saves
  const cssContentRef = useRef<string>("");

  // Determine effective carId and projectId - prioritize selectedCopies, fallback to props
  const effectiveCarId = selectedCopies[0]?.carId || carId;
  const effectiveProjectId = selectedCopies[0]?.projectId || projectId;

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
    addVideoBlock,
    addListBlock, // Added
    addHtmlBlock, // Added
    addButtonBlock, // Added
  } = useBlockOperations(
    blocks,
    onBlocksChange,
    activeBlockId,
    setActiveBlockId,
    effectiveProjectId,
    effectiveCarId
  );

  const { exportWithOptions, exportToMDX, hasEmailFeatures } =
    useContentExport();

  const { finalImages, loadingImages, refetchImages } = useBlockComposerImages(
    selectedCopies,
    effectiveCarId,
    effectiveProjectId
  );

  // Load stylesheet data for CSS editor
  // HOT-RELOAD OPTIMIZATION: Use useMemo to prevent unnecessary re-renders when stylesheet data changes
  const { stylesheetData, loading: stylesheetLoading } =
    useStylesheetData(selectedStylesheetId);

  // Memoize stylesheet data to prevent unnecessary re-renders of preview components
  // CRITICAL FIX: Include cssContent and timestamp in dependencies to ensure preview updates when CSS changes
  const memoizedStylesheetData = useMemo(() => {
    console.log(`🎯 BlockComposer - Memoizing stylesheet data:`, {
      stylesheetId: stylesheetData?.id,
      cssContentLength: stylesheetData?.cssContent?.length || 0,
      timestamp: (stylesheetData as any)?._lastUpdated || "no timestamp",
    });
    return stylesheetData;
  }, [
    stylesheetData?.id,
    stylesheetData?.name,
    stylesheetData?.cssContent,
    (stylesheetData as any)?._lastUpdated,
  ]);

  // Memoize preview props to prevent unnecessary re-renders
  // CRITICAL FIX: Include memoizedStylesheetData in dependencies for CSS hot-reload
  const previewProps = useMemo(() => {
    console.log(
      `🎯 BlockComposer - Creating preview props with stylesheet data:`,
      {
        mode: previewMode,
        hasStylesheetData: !!memoizedStylesheetData,
        stylesheetId: selectedStylesheetId,
        cssContentLength: memoizedStylesheetData?.cssContent?.length || 0,
      }
    );
    return {
      mode: previewMode,
      blocks,
      selectedStylesheetId,
      compositionName,
      frontmatter,
      emailContainerConfig,
      // Pass stylesheet data to preview components
      stylesheetData: memoizedStylesheetData,
    };
  }, [
    previewMode,
    blocks,
    selectedStylesheetId,
    compositionName,
    frontmatter,
    emailContainerConfig,
    memoizedStylesheetData,
  ]);

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

      // Load email container config if it exists in metadata
      if (loadedComposition.metadata?.emailContainerConfig) {
        setEmailContainerConfig({
          ...defaultEmailContainerConfig,
          ...loadedComposition.metadata.emailContainerConfig,
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

  // Load CSS content when switching to CSS mode or when stylesheet changes
  React.useEffect(() => {
    if (editorMode === "css" && stylesheetData) {
      const content =
        stylesheetData.cssContent || "/* No CSS content available */";
      setCSSContent(content);
      cssContentRef.current = content;
    }
  }, [editorMode, stylesheetData]);

  // Update CSS content ref whenever cssContent changes
  React.useEffect(() => {
    cssContentRef.current = cssContent;
  }, [cssContent]);

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
          emailContainerConfig,
          projectId: effectiveProjectId,
          carId: effectiveCarId,
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
    emailContainerConfig,
    selectedCopies,
    loadedComposition,
    toast,
    api,
    effectiveProjectId,
    effectiveCarId,
  ]);

  // Save CSS content to selected stylesheet
  const saveCSSContent = useCallback(async () => {
    if (!selectedStylesheetId) {
      toast({
        title: "No Stylesheet Selected",
        description: "Please select a stylesheet to save CSS content.",
        variant: "destructive",
      });
      return;
    }

    // CRITICAL FIX: Use cssContentRef.current to get the most up-to-date content
    // This ensures VIM mode saves work correctly even if state hasn't updated yet
    const latestContent = cssContentRef.current || cssContent;
    const contentToSave = latestContent.trim() || "/* Empty stylesheet */";

    console.log(
      "💾 BlockComposer Save - CSS content length:",
      contentToSave.length
    );
    console.log(
      "💾 BlockComposer Save - CSS content preview:",
      contentToSave.substring(0, 100) + "..."
    );
    console.log(
      "💾 BlockComposer Save - Using ref content:",
      cssContentRef.current === latestContent
    );

    setIsSavingCSS(true);
    try {
      await api.put(`/api/stylesheets/${selectedStylesheetId}`, {
        cssContent: contentToSave,
      });

      // HOT-RELOAD OPTIMIZATION: Use CSS content notification instead of full cache invalidation
      // This preserves component state and prevents unnecessary re-renders
      const { notifyCSSContentChange } = await import(
        "@/hooks/useStylesheetData"
      );

      // CRITICAL FIX: Add small delay to ensure database save completes before notification
      setTimeout(() => {
        notifyCSSContentChange(selectedStylesheetId, contentToSave);
        console.log("🔄 CSS content change notification sent");
      }, 50);

      // Update local CSS content state to match what was saved
      if (contentToSave !== cssContent) {
        setCSSContent(contentToSave);
      }

      toast({
        title: "CSS Saved",
        description: "Your CSS changes have been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save CSS:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save CSS content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCSS(false);
    }
  }, [selectedStylesheetId, cssContent, toast, api]);

  // Callback functions for extracted components
  const handleToggleInsertToolbar = useCallback(() => {
    setIsInsertToolbarExpanded(!isInsertToolbarExpanded);
  }, [isInsertToolbarExpanded]);

  // Editor mode toggle handler
  const handleEditorModeToggle = useCallback((mode: "blocks" | "css") => {
    setEditorMode(mode);
  }, []);

  // Handle markdown paste
  const handlePasteMarkdown = useCallback(() => {
    setShowMarkdownModal(true);
  }, []);

  // Handle importing blocks from markdown
  const handleImportMarkdownBlocks = useCallback(
    (markdownBlocks: ContentBlock[]) => {
      if (markdownBlocks.length === 0) return;

      // Find the insertion position
      let insertPosition = blocks.length;
      if (activeBlockId) {
        const activeBlockIndex = blocks.findIndex(
          (block) => block.id === activeBlockId
        );
        if (activeBlockIndex !== -1) {
          insertPosition = activeBlockIndex + 1;
        }
      }

      // Insert the new blocks and reorder
      const updatedBlocks = [
        ...blocks.slice(0, insertPosition),
        ...markdownBlocks.map((block, index) => ({
          ...block,
          order: insertPosition + index,
        })),
        ...blocks.slice(insertPosition),
      ];

      // Reorder all blocks to have sequential order values
      const reorderedBlocks = updatedBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));

      onBlocksChange(reorderedBlocks);

      // Set the first imported block as active
      if (markdownBlocks.length > 0) {
        setActiveBlockId(markdownBlocks[0].id);
      }

      toast({
        title: "Markdown Imported",
        description: `${markdownBlocks.length} content block${
          markdownBlocks.length === 1 ? "" : "s"
        } have been added from markdown.`,
      });
    },
    [blocks, activeBlockId, onBlocksChange, toast]
  );

  // Handle uploaded images - convert to image blocks and refresh galleries
  const handleImagesUploaded = useCallback(
    async (uploadedImages: { url: string; galleryId: string }[]) => {
      try {
        // Add each uploaded image as an image block
        for (const image of uploadedImages) {
          // Create image object with proper structure
          const imageObject = {
            _id: `temp_${Date.now()}_${Math.random()}`,
            url: image.url,
            altText: "",
            metadata: {
              uploadedFrom: "block-composer",
              galleryId: image.galleryId,
            },
          };

          // Add image block using existing function
          addImageFromGallery(image.url, "", imageObject);
        }

        // Refresh gallery images to show newly uploaded images
        if (refetchImages) {
          await refetchImages();
        }

        toast({
          title: "Images Uploaded",
          description: `${uploadedImages.length} image(s) added to composition`,
        });
      } catch (error) {
        console.error("Error handling uploaded images:", error);
        toast({
          title: "Error",
          description: "Failed to add uploaded images to composition",
          variant: "destructive",
        });
      }
    },
    [addImageFromGallery, refetchImages, toast]
  );

  return (
    <div className="flex-1 space-y-6 pb-6">
      {/* CSS Stylesheet Injector */}
      <StylesheetInjector selectedStylesheetId={selectedStylesheetId} />

      {/* Header Controls - Full Width */}
      <Card className="bg-transparent border-0 shadow-none">
        <CardHeader className="p-0 border-b-0">
          <ToolbarRow>
              <Button
                onClick={saveComposition}
                disabled={isSaving || !compositionName.trim()}
                variant="default"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                title={loadedComposition ? "Update composition" : "Save composition"}
                aria-label={loadedComposition ? "Update" : "Save"}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>

              {/* Stylesheet Selector */}
              <StylesheetSelector
                selectedStylesheetId={selectedStylesheetId || undefined}
                onStylesheetChange={setSelectedStylesheetId}
                className="w-auto"
              />

              {/* Preview Button - Disabled in CSS mode since preview is always shown */}
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant={
                  showPreview || editorMode === "css" ? "default" : "outline"
                }
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
                title={
                  editorMode === "css"
                    ? "Preview is always shown in CSS mode"
                    : showPreview
                      ? "Hide preview"
                      : "Show preview"
                }
                disabled={editorMode === "css"}
              >
                {showPreview || editorMode === "css" ? (
                  <Columns className="h-4 w-4 mr-2" />
                ) : (
                  <Columns2 className="h-4 w-4 mr-2" />
                )}
                {editorMode === "css"
                  ? "CSS Preview"
                  : showPreview
                    ? "Single View"
                    : "Preview"}
              </Button>

              {/* Preview Mode Selector - Always show in CSS mode or when preview is enabled */}
              {(showPreview || editorMode === "css") && (
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
              <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background px-3 py-1">
                <Switch
                  id="block-composer-minimal-html"
                  checked={minimalHtml}
                  onCheckedChange={setMinimalHtml}
                />
                <Label
                  htmlFor="block-composer-minimal-html"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Minimal HTML
                </Label>
              </div>
              <Button
                onClick={() => setShowExportModal(true)}
                variant="outline"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
                {hasEmailFeatures(blocks) && (
                  <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                    Fluid
                  </span>
                )}
              </Button>
              <Button
                onClick={() => exportToMDX(blocks, compositionName)}
                variant="outline"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export MDX
              </Button>
              {/* Editor Mode Selector - Dropdown (Blocks / CSS) */}
              <Select
                value={editorMode}
                onValueChange={(value: "blocks" | "css") =>
                  handleEditorModeToggle(value)
                }
              >
                <SelectTrigger className="w-[140px] bg-background border-border/40 hover:bg-muted/20 shadow-sm">
                  {editorMode === "css" ? (
                    <Code className="h-4 w-4 mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocks">Blocks</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                variant="ghost"
                className="hover:bg-muted/20"
                title={isHeaderCollapsed ? "Expand header" : "Collapse header"}
              >
                {isHeaderCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
          </ToolbarRow>
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
              <Badge variant="outline" className="bg-transparent text-xs">
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Email Container Configuration - Show only in email preview mode */}
      {previewMode === "email" && (
        <EmailContainerConfigComponent
          config={emailContainerConfig}
          onConfigChange={setEmailContainerConfig}
          isOpen={showEmailContainerConfig}
          onToggle={() =>
            setShowEmailContainerConfig(!showEmailContainerConfig)
          }
        />
      )}

      {/* Content Editor - Conditional Rendering Based on Editor Mode */}
      {editorMode === "blocks" ? (
        // Block Editor Mode - Single or Two Column Layout
        showPreview ? (
          <div className="grid grid-cols-2 gap-6 h-[calc(100vh-300px)]">
            {/* Preview Column - Left */}
            <div className="overflow-y-auto border border-border/40 rounded-lg bg-background">
              <RendererFactory {...previewProps} />
            </div>

            {/* Editor Column - Right */}
            <div className="overflow-y-auto">
              <IntegratedPreviewEditor
                blocks={blocks}
                selectedStylesheetId={selectedStylesheetId}
                previewMode={previewMode === "email" ? "email" : "clean"}
                emailPlatform="generic"
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
                carId={effectiveCarId}
                projectId={effectiveProjectId}
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
            carId={effectiveCarId}
            projectId={effectiveProjectId}
          />
        )
      ) : (
        // CSS Editor Mode - Always show preview with CSS editor
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-300px)]">
          {/* Preview Column - Left */}
          <div className="overflow-y-auto border border-border/40 rounded-lg bg-background">
            <RendererFactory {...previewProps} />
          </div>

          {/* CSS Editor Column - Right */}
          <div className="overflow-y-auto">
            <CSSEditor
              cssContent={cssContent}
              onCSSChange={(content) => {
                setCSSContent(content);
                cssContentRef.current = content;
                console.log(
                  "📝 BlockComposer - CSS content updated via onCSSChange, length:",
                  content.length
                );
              }}
              selectedStylesheetId={selectedStylesheetId}
              onSave={saveCSSContent}
              isSaving={isSavingCSS}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Content Insertion Toolbar - Only show in blocks mode */}
      {editorMode === "blocks" && (
        <ContentInsertionToolbar
          activeBlockId={activeBlockId}
          isInsertToolbarExpanded={isInsertToolbarExpanded}
          onToggleExpanded={handleToggleInsertToolbar}
          onAddTextBlock={addTextBlock}
          onAddDividerBlock={addDividerBlock}
          onAddVideoBlock={addVideoBlock}
          onAddButtonBlock={addButtonBlock}
          onAddFrontmatterBlock={addFrontmatterBlock}
          onAddListBlock={addListBlock} // Pass to toolbar
          onAddHtmlBlock={addHtmlBlock} // Pass to toolbar
          onPasteMarkdown={handlePasteMarkdown}
          finalImages={finalImages}
          loadingImages={loadingImages}
          projectId={effectiveProjectId}
          onRefreshImages={refetchImages}
          onAddImage={addImageFromGallery}
          onImagesUploaded={handleImagesUploaded}
          onSave={saveComposition}
          isSaving={isSaving}
          canSave={!!compositionName.trim()}
          isUpdate={!!loadedComposition}
          currentBlocks={blocks}
          onBlocksChange={onBlocksChange}
          carId={effectiveCarId}
        />
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        blocks={blocks}
        compositionName={compositionName}
        selectedStylesheetId={selectedStylesheetId}
        template={template?.id || null}
        projectId={effectiveProjectId}
        carId={effectiveCarId}
        hasEmailFeatures={hasEmailFeatures(blocks)}
        minimalHtml={minimalHtml}
        onMinimalHtmlChange={setMinimalHtml}
        onExport={async (options: ExportOptions) => {
          const resolvedOptions: ExportOptions = {
            ...options,
            minimalHtml: options.minimalHtml ?? minimalHtml,
          };
          await exportWithOptions(
            blocks,
            template?.id || null,
            compositionName,
            resolvedOptions,
            effectiveProjectId,
            effectiveCarId,
            selectedStylesheetId
          );
        }}
      />

      {/* Markdown Paste Modal */}
      <MarkdownPasteModal
        isOpen={showMarkdownModal}
        onClose={() => setShowMarkdownModal(false)}
        onPasteBlocks={handleImportMarkdownBlocks}
        activeBlockId={activeBlockId}
      />
    </div>
  );
}
