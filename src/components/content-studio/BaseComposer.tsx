"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Save,
  Loader2,
  Palette,
  ChevronDown,
  ChevronUp,
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
import { CSSEditor } from "./CSSEditor";
import { LoadModal } from "./LoadModal";
import { SaveModal } from "./SaveModal";

// Custom hooks
import { useFrontmatterOperations } from "@/hooks/useFrontmatterOperations";
import { useBlockOperations } from "@/hooks/useBlockOperations";
import { useBlockComposerImages } from "@/hooks/useBlockComposerImages";
import {
  useStylesheetData,
  invalidateStylesheetCache,
} from "@/hooks/useStylesheetData";
import { useAutosave } from "@/hooks/useAutosave";

import { useAPI } from "@/hooks/useAPI";
import {
  BlockComposerProps,
  ContentBlock,
  TextBlock,
  SelectedCopy,
  LoadedComposition,
} from "./types";

export interface BaseComposerProps extends BlockComposerProps {
  composerType: "email" | "news";
  // Render props for specialized functionality
  renderPreview: (props: PreviewRenderProps) => React.ReactNode;
  renderExportButtons: (props: ExportButtonsProps) => React.ReactNode;
  renderSpecializedControls?: (
    props: SpecializedControlsProps
  ) => React.ReactNode;
  // Load functionality
  onLoadCopy?: (copies: SelectedCopy[]) => void;
  onLoadComposition?: (composition: LoadedComposition) => void;
  onCreateNewWithCopy?: (copies: SelectedCopy[]) => void;
  // Save functionality
  onCompositionSaved?: (composition: LoadedComposition) => void;
  // Optional overrides
  defaultPreviewMode?: string;
  supportedPreviewModes?: Array<{ value: string; label: string }>;
  supportsCSSEditor?: boolean;
  supportsEmailContainer?: boolean;
  supportsFrontmatter?: boolean;
}

export interface PreviewRenderProps {
  blocks: ContentBlock[];
  previewMode: string;
  selectedStylesheetId: string | null;
  compositionName: string;
  frontmatter: any;
  stylesheetData: any;
  showPreview: boolean;
}

export interface ExportButtonsProps {
  blocks: ContentBlock[];
  compositionName: string;
  selectedStylesheetId: string | null;
  effectiveProjectId?: string;
  effectiveCarId?: string;
  template?: string | null;
}

export interface SpecializedControlsProps {
  blocks: ContentBlock[];
  previewMode: string;
  onPreviewModeChange: (mode: string) => void;
  compositionName: string;
  frontmatter: any;
  setFrontmatter: (frontmatter: any) => void;
}

/**
 * BaseComposer - Shared functionality for all composer types
 *
 * This component contains all the common functionality between email and news composers:
 * - Stylesheet management and injection
 * - Block operations (add, edit, remove, reorder)
 * - Drag and drop functionality
 * - Save/load composition functionality
 * - CSS editor mode
 * - Basic UI structure and layout
 *
 * Specialized composers extend this with their specific preview modes and export functionality.
 */
export function BaseComposer({
  selectedCopies,
  blocks,
  onBlocksChange,
  template,
  onTemplateChange,
  loadedComposition,
  carId,
  projectId,
  composerType,
  renderPreview,
  renderExportButtons,
  renderSpecializedControls,
  onLoadCopy,
  onLoadComposition,
  onCreateNewWithCopy,
  onCompositionSaved,
  defaultPreviewMode = "clean",
  supportedPreviewModes = [{ value: "clean", label: "Clean" }],
  supportsCSSEditor = true,
  supportsEmailContainer = false,
  supportsFrontmatter = false,
}: BaseComposerProps) {
  const { toast } = useToast();
  const api = useAPI();

  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [compositionName, setCompositionName] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isInsertToolbarExpanded, setIsInsertToolbarExpanded] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<string>(defaultPreviewMode);
  const [editorMode, setEditorMode] = useState<"blocks" | "css">("blocks");

  // Stylesheet management
  const [selectedStylesheetId, setSelectedStylesheetId] = useState<
    string | null
  >(null);

  // Memoize setSelectedStylesheetId to prevent unnecessary re-renders
  const handleStylesheetChange = useCallback((stylesheetId: string | null) => {
    setSelectedStylesheetId(stylesheetId);
  }, []);

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
    addListBlock,
    addHtmlBlock,
  } = useBlockOperations(
    blocks,
    onBlocksChange,
    activeBlockId,
    setActiveBlockId,
    effectiveProjectId,
    effectiveCarId
  );

  const { finalImages, loadingImages, refetchImages } = useBlockComposerImages(
    selectedCopies,
    effectiveCarId,
    effectiveProjectId
  );

  // Autosave functionality
  const handleAutosave = useCallback(
    async (data: any) => {
      if (!data.blocks || data.blocks.length === 0) return;

      // Only autosave if we have a loaded composition (don't auto-create new ones)
      if (!loadedComposition || !api) return;

      const compositionData = {
        name:
          data.compositionName ||
          loadedComposition.name ||
          "Untitled Composition",
        type: composerType,
        blocks: data.blocks,
        template: template?.id || null,
        metadata: {
          selectedCopies: data.selectedCopies,
          selectedStylesheetId,
          composerType,
          projectId: effectiveProjectId,
          carId: effectiveCarId,
          ...(supportsFrontmatter && { frontmatter }),
        },
      };

      await api.put(
        `/api/content-studio/compositions/${loadedComposition._id}`,
        compositionData
      );
    },
    [
      loadedComposition,
      composerType,
      template,
      selectedStylesheetId,
      effectiveProjectId,
      effectiveCarId,
      supportsFrontmatter,
      frontmatter,
      api,
    ]
  );

  const { scheduleAutosave, clearAutosave } = useAutosave({
    delay: 5000, // 5 seconds delay
    enabled: !!loadedComposition, // Only enable autosave for existing compositions
    onSave: handleAutosave,
    onError: (error) => {
      console.error("Autosave failed:", error);
    },
  });

  // Load stylesheet data for CSS editor
  const { stylesheetData, loading: stylesheetLoading } =
    useStylesheetData(selectedStylesheetId);

  // Memoize stylesheet data to prevent unnecessary re-renders of preview components
  const memoizedStylesheetData = useMemo(() => {
    console.log(`🎯 BaseComposer - Memoizing stylesheet data:`, {
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

      // Load frontmatter if it exists in metadata and is supported
      if (supportsFrontmatter && loadedComposition.metadata?.frontmatter) {
        setFrontmatter({
          ...frontmatter,
          ...loadedComposition.metadata.frontmatter,
        });
      }
    } else {
      // Clear composition name when loadedComposition is null
      setCompositionName("");
    }
  }, [loadedComposition, supportsFrontmatter]);

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
  }, [blocks]);

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
          // Skip empty paragraphs
          if (!paragraph.trim()) return;

          // Detect headings (starting with ##)
          if (paragraph.startsWith("## ")) {
            textBlocks.push({
              id: `text-${blockIndex++}`,
              type: "text",
              content: paragraph.replace("## ", "").trim(),
              order: blockIndex,
              element: "h2",
              metadata: {
                source: "selected-copy",
                copyId: copy.id,
              },
            });
          } else if (paragraph.startsWith("# ")) {
            textBlocks.push({
              id: `text-${blockIndex++}`,
              type: "text",
              content: paragraph.replace("# ", "").trim(),
              order: blockIndex,
              element: "h1",
              metadata: {
                source: "selected-copy",
                copyId: copy.id,
              },
            });
          } else {
            // Regular paragraph
            textBlocks.push({
              id: `text-${blockIndex++}`,
              type: "text",
              content: paragraph,
              order: blockIndex,
              element: "p",
              metadata: {
                source: "selected-copy",
                copyId: copy.id,
              },
            });
          }
        });
      });

      if (textBlocks.length > 0) {
        onBlocksChange(textBlocks);
      }
    }
  }, [selectedCopies, blocks.length]);

  // Autosave effect - trigger autosave when composition data changes
  React.useEffect(() => {
    // Only schedule autosave if we have a loaded composition
    if (loadedComposition && blocks.length > 0) {
      scheduleAutosave({
        blocks,
        selectedCopies,
        activeTemplate: template,
        compositionName,
        hasChanges: true,
      });
    }
  }, [
    blocks,
    selectedCopies,
    template,
    compositionName,
    loadedComposition,
    // Removed scheduleAutosave to prevent infinite loop - callback recreates when deps change
  ]);

  // Clean up autosave when component unmounts or composition changes
  React.useEffect(() => {
    return () => {
      clearAutosave();
    };
  }, [clearAutosave, loadedComposition?._id]);

  // Handle save button click
  const handleSaveClick = useCallback(() => {
    if (loadedComposition && compositionName.trim()) {
      // For existing compositions with names, save directly
      saveComposition(compositionName);
    } else {
      // For new compositions or compositions without names, show modal
      setShowSaveModal(true);
    }
  }, [loadedComposition, compositionName]);

  // Save composition functionality
  const saveComposition = useCallback(
    async (name: string) => {
      console.log("🔄 Starting save:", {
        name,
        hasAPI: !!api,
        loadedCompositionId: loadedComposition?._id,
      });

      if (!api) {
        toast({
          title: "Error",
          description: "API client not available. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);

      try {
        const compositionData = {
          name: name,
          type: composerType,
          blocks,
          template: template?.id || null,
          metadata: {
            selectedCopies,
            selectedStylesheetId,
            composerType,
            projectId: effectiveProjectId,
            carId: effectiveCarId,
            ...(supportsFrontmatter && { frontmatter }),
          },
        };

        console.log("📦 Sending data:", { name, blocksCount: blocks.length });

        let response;
        if (loadedComposition) {
          console.log(
            "🔄 Updating existing composition:",
            loadedComposition._id
          );
          console.log(
            "🔄 Frontend - Making PUT request to:",
            `/api/content-studio/compositions/${loadedComposition._id}`
          );
          console.log(
            "🔄 Frontend - Request payload:",
            JSON.stringify(compositionData, null, 2)
          );
          console.log("🔄 Frontend - API client instance:", !!api);

          response = await api.put(
            `/api/content-studio/compositions/${loadedComposition._id}`,
            compositionData
          );

          console.log(
            "✅ Frontend - PUT request completed, response:",
            response
          );
        } else {
          console.log("🆕 Creating new composition");
          console.log(
            "🆕 Frontend - Making POST request to:",
            "/api/content-studio/compositions"
          );
          console.log(
            "🆕 Frontend - Request payload:",
            JSON.stringify(compositionData, null, 2)
          );

          response = await api.post(
            "/api/content-studio/compositions",
            compositionData
          );

          console.log(
            "✅ Frontend - POST request completed, response:",
            response
          );
        }

        console.log("✅ API response:", response);

        setCompositionName(name);

        if (onCompositionSaved) {
          // Extract the composition ID correctly based on whether it's a new or existing composition
          let compositionId: string;

          if (loadedComposition) {
            // For updates, use the existing composition ID
            compositionId = loadedComposition._id;
            console.log(
              "✅ Frontend - Using existing composition ID:",
              compositionId
            );
          } else {
            // For new compositions, extract ID from API response
            // The POST API returns { success: true, id: ObjectId, message: "..." }
            compositionId =
              (response as any)?.id?.toString() ||
              (response as any)?._id?.toString();
            console.log(
              "✅ Frontend - Extracted new composition ID from response:",
              {
                responseId: (response as any)?.id,
                responseIdString: (response as any)?.id?.toString(),
                finalId: compositionId,
              }
            );

            if (!compositionId) {
              console.error(
                "❌ Frontend - Failed to extract composition ID from response:",
                response
              );
              throw new Error(
                "Failed to get composition ID from server response"
              );
            }
          }

          const savedComposition: LoadedComposition = {
            _id: compositionId,
            name,
            type: composerType,
            blocks,
            template: template?.id || null,
            metadata: {
              selectedCopies,
              selectedStylesheetId,
              composerType,
              projectId: effectiveProjectId,
              carId: effectiveCarId,
              ...(supportsFrontmatter && { frontmatter }),
            },
            createdAt: loadedComposition?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          console.log("🔔 Frontend - Calling onCompositionSaved with:", {
            compositionId: savedComposition._id,
            compositionName: savedComposition.name,
            isUpdate: !!loadedComposition,
          });

          onCompositionSaved(savedComposition);
        }

        toast({
          title: loadedComposition
            ? "Composition Updated"
            : "Composition Saved",
          description: `"${name}" has been ${
            loadedComposition ? "updated" : "saved"
          } successfully.`,
        });
      } catch (error) {
        console.error("❌ Save failed:", error);
        toast({
          title: "Save Failed",
          description: "Unable to save composition. Please try again.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [
      api,
      blocks,
      template,
      effectiveProjectId,
      effectiveCarId,
      selectedCopies,
      selectedStylesheetId,
      composerType,
      supportsFrontmatter,
      frontmatter,
      loadedComposition,
      toast,
      onCompositionSaved,
    ]
  );

  // CSS Editor functionality
  const saveCSSContent = useCallback(async () => {
    if (!api) {
      toast({
        title: "Error",
        description: "API client not available. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStylesheetId) {
      toast({
        title: "No Stylesheet Selected",
        description: "Please select a stylesheet to edit.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCSS(true);

    try {
      await api.put(`/api/stylesheets/${selectedStylesheetId}`, {
        cssContent: cssContentRef.current,
      });

      // Invalidate cache to trigger preview updates
      invalidateStylesheetCache();

      toast({
        title: "CSS Saved",
        description: "Stylesheet updated successfully.",
      });
    } catch (error) {
      console.error("Failed to save CSS:", error);
      toast({
        title: "Save Failed",
        description: "Unable to save CSS changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCSS(false);
    }
  }, [api, selectedStylesheetId, toast]);

  // Drag and drop handlers
  const handleDragStart = useCallback((blockId: string) => {
    setDraggedBlockId(blockId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedBlockId(null);
    setDraggedOverIndex(null);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDraggedOverIndex(index);
  }, []);

  // Editor mode toggle
  const handleEditorModeToggle = useCallback(
    (mode: "blocks" | "css") => {
      if (mode === "css" && !supportsCSSEditor) {
        return; // Prevent switching to CSS mode if not supported
      }
      setEditorMode(mode);
      if (mode === "css") {
        setShowPreview(true); // Always show preview in CSS mode
      }
    },
    [supportsCSSEditor]
  );

  // Toggle handlers
  const handleToggleInsertToolbar = useCallback(() => {
    setIsInsertToolbarExpanded(!isInsertToolbarExpanded);
  }, [isInsertToolbarExpanded]);

  const handleTogglePreview = useCallback(() => {
    setShowPreview(!showPreview);
  }, [showPreview]);

  const handleToggleHeader = useCallback(() => {
    setIsHeaderCollapsed(!isHeaderCollapsed);
  }, [isHeaderCollapsed]);

  // Preview props for render prop
  const previewProps: PreviewRenderProps = useMemo(
    () => ({
      blocks,
      previewMode,
      selectedStylesheetId,
      compositionName,
      frontmatter,
      stylesheetData: memoizedStylesheetData,
      showPreview,
    }),
    [
      blocks,
      previewMode,
      selectedStylesheetId,
      compositionName,
      frontmatter,
      memoizedStylesheetData,
      showPreview,
    ]
  );

  // Export buttons props for render prop
  const exportButtonsProps: ExportButtonsProps = useMemo(
    () => ({
      blocks,
      compositionName,
      selectedStylesheetId,
      effectiveProjectId,
      effectiveCarId,
      template: template?.id || null,
    }),
    [
      blocks,
      compositionName,
      selectedStylesheetId,
      effectiveProjectId,
      effectiveCarId,
      template,
    ]
  );

  // Specialized controls props for render prop
  const specializedControlsProps: SpecializedControlsProps = useMemo(
    () => ({
      blocks,
      previewMode,
      onPreviewModeChange: setPreviewMode,
      compositionName,
      frontmatter,
      setFrontmatter,
    }),
    [blocks, previewMode, compositionName, frontmatter, setFrontmatter]
  );

  return (
    <div className="flex-1 space-y-6 pb-6">
      {/* CSS Stylesheet Injector */}
      <StylesheetInjector selectedStylesheetId={selectedStylesheetId} />

      {/* Header Controls - Full Width */}
      <Card className="bg-transparent border border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {composerType === "email" ? "Email" : "News Article"} Composition
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveClick}
                disabled={isSaving}
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

              {/* Load Button */}
              {(onLoadCopy || onLoadComposition) && (
                <Button
                  onClick={() => setShowLoadModal(true)}
                  variant="outline"
                  size="sm"
                  className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Load
                </Button>
              )}

              {/* Stylesheet Selector */}
              <StylesheetSelector
                selectedStylesheetId={selectedStylesheetId || undefined}
                onStylesheetChange={handleStylesheetChange}
                className="w-auto"
              />

              {/* Preview Button - Disabled in CSS mode since preview is always shown */}
              <Button
                onClick={handleTogglePreview}
                variant={showPreview ? "default" : "outline"}
                size="sm"
                disabled={editorMode === "css"}
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>

              {/* Preview Mode Selector */}
              {supportedPreviewModes.length > 1 && (
                <select
                  value={previewMode}
                  onChange={(e) => setPreviewMode(e.target.value)}
                  className="px-3 py-1 text-xs border border-border/40 rounded-md bg-background"
                >
                  {supportedPreviewModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Export Buttons */}
              {renderExportButtons(exportButtonsProps)}

              {/* Editor Mode Toggle - Show only if CSS editor is supported */}
              {supportsCSSEditor && (
                <div className="flex items-center bg-muted/20 rounded-md p-1">
                  <Button
                    onClick={() => handleEditorModeToggle("blocks")}
                    variant={editorMode === "blocks" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Blocks
                  </Button>
                  <Button
                    onClick={() => handleEditorModeToggle("css")}
                    variant={editorMode === "css" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    <Code className="h-3 w-3 mr-1" />
                    CSS
                  </Button>
                </div>
              )}

              {/* Header Toggle */}
              <Button
                onClick={handleToggleHeader}
                variant="ghost"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
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
          <CardContent className="pt-0 space-y-4">
            {/* Specialized Controls */}
            {renderSpecializedControls &&
              renderSpecializedControls(specializedControlsProps)}

            {/* Block Count Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-transparent text-xs">
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}
              </Badge>
              {compositionName && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary text-xs"
                >
                  {compositionName}
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Content Editor - Conditional Rendering Based on Editor Mode */}
      {editorMode === "blocks" ? (
        // Block Editor Mode - Single or Two Column Layout
        showPreview ? (
          <div className="grid grid-cols-2 gap-6 h-[calc(100vh-300px)]">
            {/* Preview Column - Left */}
            <div className="overflow-y-auto border border-border/40 rounded-lg bg-background">
              {renderPreview(previewProps)}
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
                onConvertTextToFrontmatter={
                  supportsFrontmatter
                    ? convertTextToFrontmatterBlock
                    : undefined
                }
                detectFrontmatterInTextBlock={
                  supportsFrontmatter ? detectFrontmatterInTextBlock : undefined
                }
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
            onConvertTextToFrontmatter={
              supportsFrontmatter ? convertTextToFrontmatterBlock : undefined
            }
            detectFrontmatterInTextBlock={
              supportsFrontmatter ? detectFrontmatterInTextBlock : undefined
            }
            carId={effectiveCarId}
            projectId={effectiveProjectId}
          />
        )
      ) : (
        // CSS Editor Mode - Always show preview with CSS editor
        supportsCSSEditor && (
          <div className="grid grid-cols-2 gap-6 h-[calc(100vh-300px)]">
            {/* Preview Column - Left */}
            <div className="overflow-y-auto border border-border/40 rounded-lg bg-background">
              {renderPreview(previewProps)}
            </div>

            {/* CSS Editor Column - Right */}
            <div className="overflow-y-auto">
              <CSSEditor
                cssContent={cssContent}
                onCSSChange={(content) => {
                  setCSSContent(content);
                  cssContentRef.current = content;
                  console.log(
                    "📝 BaseComposer - CSS content updated via onCSSChange, length:",
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
        )
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
          onAddFrontmatterBlock={
            supportsFrontmatter ? addFrontmatterBlock : undefined
          }
          onAddListBlock={addListBlock}
          onAddHtmlBlock={addHtmlBlock}
          finalImages={finalImages}
          loadingImages={loadingImages}
          projectId={effectiveProjectId}
          onRefreshImages={refetchImages}
          onAddImage={addImageFromGallery}
          onSave={handleSaveClick}
          isSaving={isSaving}
          canSave={blocks.length > 0}
          isUpdate={!!loadedComposition}
          currentBlocks={blocks}
          onBlocksChange={onBlocksChange}
          carId={effectiveCarId}
        />
      )}

      {/* Load Modal */}
      {(onLoadCopy || onLoadComposition) && (
        <LoadModal
          isOpen={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          carId={effectiveCarId}
          projectId={effectiveProjectId}
          composerType={composerType}
          hasExistingContent={blocks.length > 0 || !!loadedComposition}
          currentCompositionName={compositionName}
          onLoadCopy={onLoadCopy || (() => {})}
          onLoadComposition={onLoadComposition || (() => {})}
          onCreateNewWithCopy={onCreateNewWithCopy || (() => {})}
        />
      )}

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={saveComposition}
        composerType={composerType}
        isUpdate={!!loadedComposition}
        currentName={compositionName}
      />
    </div>
  );
}
