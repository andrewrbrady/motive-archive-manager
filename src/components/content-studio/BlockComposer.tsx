"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Save,
  Loader2,
  FileText,
  Palette,
  Plus,
  ImageIcon,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Heading,
  Download,
  Copy,
  Columns2,
  Columns,
} from "lucide-react";

import { ContentInsertionToolbar } from "./ContentInsertionToolbar";
import { IntegratedPreviewEditor } from "./IntegratedPreviewEditor";
import { StylesheetSelector } from "../BlockComposer/StylesheetSelector";

import { useAPIQuery } from "@/hooks/useAPIQuery";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { api } from "@/lib/api-client";
import { classToInlineStyles } from "@/lib/css-parser";
import {
  BlockComposerProps,
  ContentBlock,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  DividerBlock,
  SelectedCopy,
} from "./types";

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

  // Stylesheet management
  const [selectedStylesheetId, setSelectedStylesheetId] = useState<
    string | null
  >(null);

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

  // Determine context for image gallery
  const carId = selectedCopies[0]?.carId;
  const projectId = selectedCopies[0]?.projectId;

  // For projects: fetch linked galleries first, then extract images from them
  // For cars: fetch images directly from the car
  const galleriesUrl = projectId ? `projects/${projectId}/galleries` : null;

  const carImagesUrl = carId && !projectId ? `cars/${carId}/images` : null;

  const {
    data: galleriesData,
    isLoading: loadingGalleries,
    refetch: refetchGalleries,
  } = useAPIQuery<{ galleries: any[] }>(galleriesUrl || "null-query", {
    enabled: Boolean(galleriesUrl),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: carImagesData,
    isLoading: loadingCarImages,
    refetch: refetchCarImages,
  } = useAPIQuery<{ images: any[] }>(carImagesUrl || "null-query", {
    enabled: Boolean(carImagesUrl),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Extract all images from linked galleries (for projects)
  const galleryImages = useMemo(() => {
    if (!galleriesData?.galleries) return [];

    const images: any[] = [];
    galleriesData.galleries.forEach((gallery) => {
      // Use orderedImages if available for proper ordering, fallback to imageIds
      const imageList =
        gallery.orderedImages?.length > 0
          ? gallery.orderedImages.map((item: any) => ({
              id: item.id,
              order: item.order,
              galleryName: gallery.name,
            }))
          : gallery.imageIds?.map((id: string, index: number) => ({
              id,
              order: index,
              galleryName: gallery.name,
            })) || [];

      images.push(...imageList);
    });

    return images.sort((a, b) => a.order - b.order);
  }, [galleriesData?.galleries]);

  // Extract unique image IDs to fetch actual image data (for projects)
  const imageIds = useMemo(() => {
    return [...new Set(galleryImages.map((img) => img.id))];
  }, [galleryImages]);

  // Fetch actual image data for the image IDs (for projects)
  const { data: imageMetadata, isLoading: loadingImageData } = useAPIQuery<
    any[]
  >(
    imageIds.length > 0
      ? `images/metadata?ids=${imageIds.join(",")}`
      : "null-query",
    {
      enabled: imageIds.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  );

  // Combine gallery context with image data (for projects) - OPTIMIZED
  const enrichedGalleryImages = useMemo(() => {
    if (!imageMetadata || !galleryImages.length) return [];

    // Create a map of image ID to metadata for O(1) lookup instead of nested loops
    const imageDataMap = new Map(
      imageMetadata.map((img) => [img.imageId || img._id, img])
    );

    // Enrich gallery images with actual image data
    return galleryImages
      .map((galleryImg) => {
        const imageData = imageDataMap.get(galleryImg.id);
        if (!imageData) return null;

        return {
          ...imageData,
          id: galleryImg.id,
          order: galleryImg.order,
          galleryName: galleryImg.galleryName,
          // Ensure we have proper URL and alt text for the UI with proper Cloudflare formatting
          imageUrl: fixCloudflareImageUrl(imageData.url),
          alt: imageData.filename || `Image from ${galleryImg.galleryName}`,
        };
      })
      .filter(Boolean);
  }, [imageMetadata, galleryImages]);

  // Process car images (for cars) - OPTIMIZED
  const carImages = useMemo(() => {
    if (!carImagesData?.images) return [];

    return carImagesData.images.map((image: any, index: number) => ({
      ...image,
      id: image._id || image.id,
      imageUrl: fixCloudflareImageUrl(image.url),
      alt: image.filename || `Car image ${index + 1}`,
      galleryName: "Car Images",
    }));
  }, [carImagesData?.images]);

  // Final images list: use project galleries or car images - OPTIMIZED with proper dependencies
  const finalImages = useMemo(() => {
    return projectId ? enrichedGalleryImages : carImages;
  }, [projectId, enrichedGalleryImages, carImages]);

  // Loading state for images
  const loadingImages =
    loadingGalleries || loadingImageData || loadingCarImages;
  const refetchImages = projectId ? refetchGalleries : refetchCarImages;

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

  // Advanced block management with optimized memoization
  const memoizedCallbacks = useMemo(
    () => ({
      // Add image block from gallery
      addImageFromGallery: (imageUrl: string, altText?: string) => {
        let insertPosition: number;
        let positionDescription: string;

        if (activeBlockId) {
          // Find the active block and insert the image block below it
          const activeBlockIndex = blocks.findIndex(
            (block) => block.id === activeBlockId
          );
          if (activeBlockIndex !== -1) {
            insertPosition = activeBlockIndex + 1;
            positionDescription = `below the selected ${blocks[activeBlockIndex].type} block`;
          } else {
            // Active block not found, add to end
            insertPosition = blocks.length;
            positionDescription = "at the end";
          }
        } else {
          // No active block, add to end
          insertPosition = blocks.length;
          positionDescription = "at the end";
        }

        const newBlock: ImageBlock = {
          id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "image",
          order: insertPosition,
          imageUrl,
          altText: altText || "",
          width: "100%",
          alignment: "center",
          styles: {},
          metadata: {
            source: "gallery",
            gallerySource: projectId ? "project" : "car",
            projectId: projectId || undefined,
            carId: carId || undefined,
            createdAt: new Date().toISOString(),
          },
        };

        const updatedBlocks = [
          ...blocks.slice(0, insertPosition),
          newBlock,
          ...blocks.slice(insertPosition),
        ];

        // Reorder all blocks to have sequential order values
        const reorderedBlocks = updatedBlocks.map((block, index) => ({
          ...block,
          order: index,
        }));

        onBlocksChange(reorderedBlocks);
        setActiveBlockId(newBlock.id); // Set the new image block as active

        toast({
          title: "Image Added",
          description: `Image has been added ${positionDescription}.`,
        });
      },

      // Remove a content block
      removeBlock: (blockId: string) => {
        const updatedBlocks = blocks.filter((block) => block.id !== blockId);
        // Reorder remaining blocks
        const reorderedBlocks = updatedBlocks.map((block, index) => ({
          ...block,
          order: index,
        }));

        onBlocksChange(reorderedBlocks);

        // Clear active block if it was deleted
        if (activeBlockId === blockId) {
          setActiveBlockId(null);
        }

        toast({
          title: "Block Removed",
          description: "Content block has been removed.",
        });
      },
    }),
    [
      blocks,
      onBlocksChange,
      activeBlockId,
      projectId,
      carId,
      toast,
      setActiveBlockId,
    ]
  );

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

  // Add image block from gallery
  const addImageFromGallery = useCallback(
    (imageUrl: string, altText?: string) => {
      memoizedCallbacks.addImageFromGallery(imageUrl, altText);
    },
    [memoizedCallbacks]
  );

  // Remove a content block
  const removeBlock = useCallback(
    (blockId: string) => {
      memoizedCallbacks.removeBlock(blockId);
    },
    [memoizedCallbacks]
  );

  // Update a specific block
  const updateBlock = useCallback(
    (blockId: string, updates: Partial<ContentBlock>) => {
      const updatedBlocks = blocks.map((block) =>
        block.id === blockId
          ? ({ ...block, ...updates } as ContentBlock)
          : block
      );
      onBlocksChange(updatedBlocks);
    },
    [blocks, onBlocksChange]
  );

  // Move block up/down
  const moveBlock = useCallback(
    (blockId: string, direction: "up" | "down") => {
      const blockIndex = blocks.findIndex((block) => block.id === blockId);
      if (blockIndex === -1) return;

      const newIndex = direction === "up" ? blockIndex - 1 : blockIndex + 1;
      if (newIndex < 0 || newIndex >= blocks.length) return;

      const updatedBlocks = [...blocks];
      [updatedBlocks[blockIndex], updatedBlocks[newIndex]] = [
        updatedBlocks[newIndex],
        updatedBlocks[blockIndex],
      ];

      // Update order values
      updatedBlocks.forEach((block, index) => {
        block.order = index;
      });

      onBlocksChange(updatedBlocks);
    },
    [blocks, onBlocksChange]
  );

  // Add new text block
  const addTextBlock = useCallback(() => {
    // Helper function for block insertion logic
    const getInsertPosition = () => {
      if (activeBlockId) {
        const activeBlockIndex = blocks.findIndex(
          (block) => block.id === activeBlockId
        );
        if (activeBlockIndex !== -1) {
          return {
            position: activeBlockIndex + 1,
            description: `below the selected ${blocks[activeBlockIndex].type} block`,
          };
        }
      }
      return { position: blocks.length, description: "at the end" };
    };

    const insertBlock = (newBlock: ContentBlock, title: string) => {
      const { position, description } = getInsertPosition();
      const updatedBlocks = [
        ...blocks.slice(0, position),
        { ...newBlock, order: position },
        ...blocks.slice(position),
      ];
      const reorderedBlocks = updatedBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));
      onBlocksChange(reorderedBlocks);
      setActiveBlockId(newBlock.id);
      toast({
        title,
        description: `${title.replace(" Added", "")} has been added ${description}.`,
      });
    };

    const newBlock: TextBlock = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "text",
      order: 0, // Will be set by insertBlock
      content: "Enter your text here...",
      element: "p",
      styles: {},
      metadata: { source: "manual", createdAt: new Date().toISOString() },
    };

    insertBlock(newBlock, "Text Block Added");
  }, [blocks, onBlocksChange, toast, activeBlockId]);

  // Add new heading block
  const addHeadingBlock = useCallback(
    (level: 1 | 2 | 3 = 2) => {
      // Reuse the helper from addTextBlock
      const getInsertPosition = () => {
        if (activeBlockId) {
          const activeBlockIndex = blocks.findIndex(
            (block) => block.id === activeBlockId
          );
          if (activeBlockIndex !== -1) {
            return {
              position: activeBlockIndex + 1,
              description: `below the selected ${blocks[activeBlockIndex].type} block`,
            };
          }
        }
        return { position: blocks.length, description: "at the end" };
      };

      const insertBlock = (newBlock: ContentBlock, title: string) => {
        const { position, description } = getInsertPosition();
        const updatedBlocks = [
          ...blocks.slice(0, position),
          { ...newBlock, order: position },
          ...blocks.slice(position),
        ];
        const reorderedBlocks = updatedBlocks.map((block, index) => ({
          ...block,
          order: index,
        }));
        onBlocksChange(reorderedBlocks);
        setActiveBlockId(newBlock.id);
        toast({
          title,
          description: `H${level} heading block has been added ${description}.`,
        });
      };

      const newBlock: TextBlock = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "text",
        order: 0, // Will be set by insertBlock
        content: "Enter your heading here...",
        element: `h${level}` as "h1" | "h2" | "h3",
        styles: {},
        metadata: { source: "manual", createdAt: new Date().toISOString() },
      };

      insertBlock(newBlock, `Heading ${level} Block Added`);
    },
    [blocks, onBlocksChange, toast, activeBlockId]
  );

  // Add new divider block (horizontal rule)
  const addDividerBlock = useCallback(() => {
    // Reuse the helper from addTextBlock
    const getInsertPosition = () => {
      if (activeBlockId) {
        const activeBlockIndex = blocks.findIndex(
          (block) => block.id === activeBlockId
        );
        if (activeBlockIndex !== -1) {
          return {
            position: activeBlockIndex + 1,
            description: `below the selected ${blocks[activeBlockIndex].type} block`,
          };
        }
      }
      return { position: blocks.length, description: "at the end" };
    };

    const insertBlock = (newBlock: ContentBlock, title: string) => {
      const { position, description } = getInsertPosition();
      const updatedBlocks = [
        ...blocks.slice(0, position),
        { ...newBlock, order: position },
        ...blocks.slice(position),
      ];
      const reorderedBlocks = updatedBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));
      onBlocksChange(reorderedBlocks);
      setActiveBlockId(newBlock.id);
      toast({
        title,
        description: `Horizontal rule has been added ${description}.`,
      });
    };

    const newBlock: DividerBlock = {
      id: `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "divider",
      order: 0, // Will be set by insertBlock
      thickness: "1px",
      color: "#dddddd",
      margin: "20px",
      styles: {},
      metadata: { source: "manual", createdAt: new Date().toISOString() },
    };

    insertBlock(newBlock, "Horizontal Rule Added");
  }, [blocks, onBlocksChange, toast, activeBlockId]);

  // Get blocks with drag state consideration

  // Export to HTML
  const exportToHTML = useCallback(async () => {
    try {
      const response = (await api.post("/api/content-studio/export-html", {
        blocks,
        template: template || null,
        metadata: {
          name: compositionName || "Untitled Composition",
          exportedAt: new Date().toISOString(),
          projectId,
          carId,
        },
      })) as { data: { html?: string } };

      if (response.data?.html) {
        // Create download
        const blob = new Blob([response.data.html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${compositionName || "composition"}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "HTML Exported",
          description: "Your composition has been exported as HTML.",
        });
      }
    } catch (error) {
      console.error("Failed to export HTML:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export your composition as HTML.",
        variant: "destructive",
      });
    }
  }, [blocks, template, compositionName, projectId, carId, toast]);

  // Copy HTML to clipboard
  const copyHTMLToClipboard = useCallback(async () => {
    try {
      const response = (await api.post("/api/content-studio/export-html", {
        blocks,
        template: template || null,
        metadata: {
          name: compositionName || "Untitled Composition",
          exportedAt: new Date().toISOString(),
          projectId,
          carId,
        },
      })) as { data: { html?: string } };

      if (response.data?.html) {
        await navigator.clipboard.writeText(response.data.html);
        toast({
          title: "HTML Copied",
          description: "HTML has been copied to your clipboard.",
        });
      }
    } catch (error) {
      console.error("Failed to copy HTML:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy HTML to clipboard.",
        variant: "destructive",
      });
    }
  }, [blocks, template, compositionName, projectId, carId, toast]);

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
          projectId,
          carId,
          selectedCopies,
          createdAt: loadedComposition?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const endpoint = loadedComposition
        ? `/api/content-studio/compositions/${loadedComposition._id}`
        : "/api/content-studio/compositions";

      const method = loadedComposition ? "put" : "post";
      const response = (await api[method](endpoint, compositionData)) as {
        data: any;
      };

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
    projectId,
    carId,
    selectedCopies,
    loadedComposition,
    toast,
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
              <Button
                onClick={exportToHTML}
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export HTML
              </Button>
              <Button
                onClick={copyHTMLToClipboard}
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
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
          {/* Clean Preview Column - Left */}
          <div className="overflow-y-auto border border-border/40 rounded-lg bg-background">
            <CleanPreview
              blocks={blocks}
              selectedStylesheetId={selectedStylesheetId}
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
        />
      )}

      {/* Content Insertion Toolbar */}
      <ContentInsertionToolbar
        activeBlockId={activeBlockId}
        isInsertToolbarExpanded={isInsertToolbarExpanded}
        onToggleExpanded={handleToggleInsertToolbar}
        onAddTextBlock={addTextBlock}
        onAddDividerBlock={addDividerBlock}
        finalImages={finalImages}
        loadingImages={loadingImages}
        projectId={projectId}
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

/**
 * CleanPreview - Clean preview component that renders blocks without editing controls
 */
interface CleanPreviewProps {
  blocks: ContentBlock[];
  selectedStylesheetId?: string | null;
}

const CleanPreview = React.memo<CleanPreviewProps>(function CleanPreview({
  blocks,
  selectedStylesheetId,
}) {
  return (
    <div className="p-6 space-y-4">
      {/* Content Blocks */}
      {blocks.map((block) => (
        <CleanPreviewBlock key={block.id} block={block} />
      ))}
    </div>
  );
});

/**
 * CleanPreviewBlock - Renders individual blocks in clean preview mode
 */
interface CleanPreviewBlockProps {
  block: ContentBlock;
}

const CleanPreviewBlock = React.memo<CleanPreviewBlockProps>(
  function CleanPreviewBlock({ block }) {
    const customStyles = useMemo(() => {
      if (block.cssClass) {
        return classToInlineStyles(block.cssClass);
      }
      return {};
    }, [block.cssClass]);

    switch (block.type) {
      case "text": {
        const textBlock = block as TextBlock;
        const content = textBlock.content || "Your text will appear here...";

        const formattedContent = useMemo(() => {
          if (!textBlock.richFormatting?.formattedContent) {
            return content;
          }

          let html = textBlock.richFormatting.formattedContent;
          html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
          html = html.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
          );
          html = html.replace(/\n/g, "<br>");
          return html;
        }, [textBlock.richFormatting?.formattedContent, content]);

        const hasRichContent = textBlock.richFormatting?.formattedContent;
        const textClass = !textBlock.content
          ? "text-muted-foreground italic"
          : "text-foreground";

        // Get default classes based on element type
        const getElementClasses = (element: string) => {
          switch (element) {
            case "h1":
              return "text-3xl font-bold mb-4 mt-6";
            case "h2":
              return "text-2xl font-bold mb-3 mt-5";
            case "h3":
              return "text-xl font-bold mb-2 mt-4";
            case "h4":
              return "text-lg font-bold mb-2 mt-3";
            case "h5":
              return "text-base font-bold mb-1 mt-2";
            case "h6":
              return "text-sm font-bold mb-1 mt-2";
            case "p":
            default:
              return "mb-4 leading-relaxed";
          }
        };

        const elementType = textBlock.element || "p"; // Fallback to "p" if element is undefined
        const defaultClasses = getElementClasses(elementType);
        const finalClassName = textBlock.cssClassName
          ? `${textBlock.cssClassName} ${textClass}`
          : `${defaultClasses} ${textClass}`;

        // For headings, don't add line breaks; for paragraphs, add them
        const processedContent =
          elementType === "p"
            ? formattedContent
            : formattedContent.replace(/<br>/g, " ");

        return React.createElement(
          textBlock.element || "p", // Fallback to "p" if element is undefined
          {
            className: finalClassName,
            style: customStyles,
            ...(hasRichContent
              ? { dangerouslySetInnerHTML: { __html: processedContent } }
              : {}),
          },
          hasRichContent ? undefined : content
        );
      }

      case "image": {
        const imageBlock = block as ImageBlock;
        if (!imageBlock.imageUrl) {
          return (
            <div className="flex items-center justify-center h-48 bg-muted rounded border-2 border-dashed border-muted-foreground/25">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">No image selected</p>
              </div>
            </div>
          );
        }

        return (
          <div
            className={
              imageBlock.cssClassName ? imageBlock.cssClassName : "mb-4"
            }
          >
            <img
              src={imageBlock.imageUrl}
              alt={imageBlock.altText || "Content image"}
              style={customStyles}
              className="w-full h-auto rounded"
            />
            {imageBlock.caption && (
              <p className="text-sm text-muted-foreground mt-2 text-center italic">
                {imageBlock.caption}
              </p>
            )}
          </div>
        );
      }

      case "divider": {
        const dividerBlock = block as DividerBlock;
        return (
          <div
            className={
              dividerBlock.cssClassName
                ? dividerBlock.cssClassName
                : "my-8 border-t border-border"
            }
            style={customStyles}
          />
        );
      }

      default:
        return null;
    }
  }
);
