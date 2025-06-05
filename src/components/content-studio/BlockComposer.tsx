"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save,
  Type,
  Image,
  Loader2,
  FileText,
  Palette,
  Plus,
  ImageIcon,
  RefreshCw,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Heading,
  Download,
  Copy,
  Settings,
  Minus,
  PlusCircle,
} from "lucide-react";

import { PreviewColumn } from "./PreviewColumn";
import { BlockEditor } from "./BlockEditor";
import { EmailHeaderConfig, type EmailHeaderState } from "./EmailHeaderConfig";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { api } from "@/lib/api-client";
import {
  BlockComposerProps,
  ContentBlock,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  DividerBlock,
  ContentBlockType,
  SelectedCopy,
} from "./types";

/**
 * BlockComposer - Copy-Driven Content Creator for Content Studio
 *
 * This component automatically creates content blocks from selected copy and allows
 * users to enhance them with images from associated galleries.
 *
 * PHASE 1 PERFORMANCE IMPLEMENTATION:
 * - Phase 1 Performance: Component extraction complete
 * - Extracted BlockEditor and EmailHeaderConfig components for better maintainability
 * - Added React.memo to expensive computations
 * - Optimized image processing with useMemo
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
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Email header configuration
  const [emailHeader, setEmailHeader] = useState<EmailHeaderState>({
    enabled: false,
    headerImageUrl: "",
    headerImageAlt: "Email Header",
    headerImageHeight: "100",
    stripes: {
      enabled: false,
      topColor: "#BC1F1F",
      bottomColor: "#0E2D4E",
      height: "4px",
    },
  });

  // Initialize composition name when loading existing composition
  React.useEffect(() => {
    if (loadedComposition) {
      setCompositionName(loadedComposition.name || "");

      // Load header settings if they exist in metadata
      if (loadedComposition.metadata?.emailHeader) {
        setEmailHeader((prev) => ({
          ...prev,
          // Spread the loaded header data, but ensure all fields have defaults
          ...loadedComposition.metadata.emailHeader,
          // Ensure new fields have defaults if they don't exist in saved data
          headerImageUrl:
            loadedComposition.metadata.emailHeader.headerImageUrl ?? "",
          headerImageAlt:
            loadedComposition.metadata.emailHeader.headerImageAlt ??
            "Email Header",
          headerImageHeight:
            loadedComposition.metadata.emailHeader.headerImageHeight ?? "100",
        }));
      }
    }
  }, [loadedComposition]);

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
  }, [galleriesData]);

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

  // Combine gallery context with image data (for projects)
  const enrichedGalleryImages = useMemo(() => {
    if (!imageMetadata || !galleryImages.length) return [];

    // Create a map of image ID to metadata
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

  // Process car images (for cars)
  const carImages = useMemo(() => {
    if (!carImagesData?.images) return [];

    return carImagesData.images.map((image: any, index: number) => ({
      ...image,
      id: image._id || image.id,
      imageUrl: fixCloudflareImageUrl(image.url),
      alt: image.filename || `Car image ${index + 1}`,
      galleryName: "Car Images",
    }));
  }, [carImagesData]);

  // Final images list: use project galleries or car images
  const finalImages = projectId ? enrichedGalleryImages : carImages;

  // Loading state for images
  const loadingImages =
    loadingGalleries || loadingImageData || loadingCarImages;
  const refetchImages = projectId ? refetchGalleries : refetchCarImages;

  // Debug logging
  useEffect(() => {
    if (finalImages.length > 0) {
      console.log("🖼️ BlockComposer - Final images:", {
        count: finalImages.length,
        projectId,
        carId,
        firstImageUrl: finalImages[0]?.imageUrl,
        sampleImages: finalImages.slice(0, 3).map((img) => ({
          id: img.id,
          url: img.imageUrl,
          galleryName: img.galleryName,
        })),
      });
    }
  }, [finalImages, projectId, carId]);

  // Automatically import selected copy into blocks (split by paragraphs with ## header detection)
  useEffect(() => {
    if (selectedCopies.length > 0 && blocks.length === 0) {
      const textBlocks: (TextBlock | HeadingBlock)[] = [];
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

        // If still only one paragraph, keep it as is
        if (paragraphs.length <= 1) {
          paragraphs = [copy.text.trim()];
        }

        paragraphs.forEach((paragraph) => {
          // Skip very short lines that are likely headers or separators
          if (paragraph.length > 10) {
            // Check if paragraph starts with ## markdown header
            const headerMatch = paragraph.match(/^##\s+(.+)$/);

            if (headerMatch) {
              // Create heading block for ## headers
              const headingContent = headerMatch[1].trim();
              textBlocks.push({
                id: `heading-${copy.id}-h${blockIndex}`,
                type: "heading" as const,
                order: blockIndex,
                content: headingContent,
                level: 2,
                styles: {},
                metadata: {
                  sourceType: copy.type,
                  sourceCopyId: copy.id,
                  paragraphIndex: blockIndex,
                  importedAt: new Date().toISOString(),
                  originalMarkdown: paragraph,
                },
              });
            } else {
              // Create text block for regular content
              textBlocks.push({
                id: `text-${copy.id}-p${blockIndex}`,
                type: "text" as const,
                order: blockIndex,
                content: paragraph,
                styles: {},
                metadata: {
                  sourceType: copy.type,
                  sourceCopyId: copy.id,
                  paragraphIndex: blockIndex,
                  importedAt: new Date().toISOString(),
                },
              });
            }
            blockIndex++;
          }
        });
      });

      onBlocksChange(textBlocks);

      const headingCount = textBlocks.filter(
        (block) => block.type === "heading"
      ).length;
      const textCount = textBlocks.filter(
        (block) => block.type === "text"
      ).length;

      toast({
        title: "Copy Imported",
        description: `${textBlocks.length} blocks created: ${headingCount} headers, ${textCount} text paragraphs from ${selectedCopies.length} copy items.`,
      });
    }
  }, [selectedCopies, blocks.length, onBlocksChange, toast]);

  // Get display order for blocks (for real-time preview during drag)
  const getDisplayBlocks = () => {
    if (!draggedBlockId || draggedOverIndex === null) {
      return blocks;
    }

    const draggedIndex = blocks.findIndex(
      (block) => block.id === draggedBlockId
    );
    if (draggedIndex === -1) return blocks;

    const newBlocks = [...blocks];
    const draggedBlock = newBlocks[draggedIndex];

    // Remove from current position
    newBlocks.splice(draggedIndex, 1);

    // Insert at new position
    newBlocks.splice(draggedOverIndex, 0, draggedBlock);

    return newBlocks;
  };

  // Performance optimization: Memoize block statistics for better rendering performance
  const blockStats = useMemo(
    () => ({
      totalBlocks: blocks.length,
      hasBlocks: blocks.length > 0,
      blockTypes: blocks.reduce(
        (acc, block) => {
          acc[block.type] = (acc[block.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    }),
    [blocks]
  );

  // Handle global drag events
  const handleDragStart = (blockId: string) => {
    setDraggedBlockId(blockId);
  };

  const handleDragEnd = () => {
    if (draggedBlockId && draggedOverIndex !== null) {
      // Make the rearrangement permanent
      const draggedIndex = blocks.findIndex(
        (block) => block.id === draggedBlockId
      );
      if (draggedIndex !== -1 && draggedIndex !== draggedOverIndex) {
        const newBlocks = [...blocks];
        const draggedBlock = newBlocks[draggedIndex];

        // Remove from current position
        newBlocks.splice(draggedIndex, 1);

        // Insert at new position
        newBlocks.splice(draggedOverIndex, 0, draggedBlock);

        // Update order values
        const reorderedBlocks = newBlocks.map((block, index) => ({
          ...block,
          order: index,
        }));

        onBlocksChange(reorderedBlocks);

        toast({
          title: "Block Reordered",
          description: "Block order has been updated.",
        });
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

  // Generate auto-name for composition
  const generateAutoName = useCallback(() => {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/T|:/g, "-");
    return `Composition-${timestamp}`;
  }, []);

  // Add image block from gallery
  const addImageFromGallery = useCallback(
    (imageUrl: string, altText?: string) => {
      const newBlock: ImageBlock = {
        id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "image",
        order: blocks.length,
        imageUrl,
        altText: altText || "Gallery image",
        alignment: "center",
        styles: {},
        metadata: {
          source: "gallery",
          importedAt: new Date().toISOString(),
        },
      };

      let updatedBlocks: ContentBlock[];
      let insertPosition: number;
      let positionDescription: string;

      if (activeBlockId) {
        // Find the active block and insert the image above it
        const activeBlockIndex = blocks.findIndex(
          (block) => block.id === activeBlockId
        );
        if (activeBlockIndex !== -1) {
          insertPosition = activeBlockIndex;
          updatedBlocks = [
            ...blocks.slice(0, activeBlockIndex),
            newBlock,
            ...blocks.slice(activeBlockIndex),
          ];
          positionDescription = `above the selected ${blocks[activeBlockIndex].type} block`;
        } else {
          // Active block not found, add to end
          insertPosition = blocks.length;
          updatedBlocks = [...blocks, newBlock];
          positionDescription = "at the end";
        }
      } else {
        // No active block, add to end
        insertPosition = blocks.length;
        updatedBlocks = [...blocks, newBlock];
        positionDescription = "at the end";
      }

      // Reorder all blocks to have sequential order values
      updatedBlocks = updatedBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));

      onBlocksChange(updatedBlocks);

      toast({
        title: "Image Added",
        description: `Image has been added ${positionDescription}.`,
      });
    },
    [blocks, onBlocksChange, toast, activeBlockId]
  );

  // Remove a content block
  const removeBlock = useCallback(
    (blockId: string) => {
      const updatedBlocks = blocks.filter((block) => block.id !== blockId);
      // Reorder remaining blocks
      const reorderedBlocks = updatedBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));
      onBlocksChange(reorderedBlocks);
    },
    [blocks, onBlocksChange]
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
    let insertPosition: number;
    let positionDescription: string;

    if (activeBlockId) {
      // Find the active block and insert the text block below it
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

    const newBlock: TextBlock = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "text",
      order: insertPosition,
      content: "Enter your text here...",
      styles: {},
      metadata: {
        source: "manual",
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
    setActiveBlockId(newBlock.id); // Set the new block as active

    toast({
      title: "Text Block Added",
      description: `Text block has been added ${positionDescription}.`,
    });
  }, [blocks, onBlocksChange, toast, activeBlockId]);

  // Add new heading block
  const addHeadingBlock = useCallback(
    (level: 1 | 2 | 3 = 2) => {
      let insertPosition: number;
      let positionDescription: string;

      if (activeBlockId) {
        // Find the active block and insert the heading block below it
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

      const newBlock: HeadingBlock = {
        id: `heading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "heading",
        order: insertPosition,
        content: "Enter your heading here...",
        level,
        styles: {},
        metadata: {
          source: "manual",
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
      setActiveBlockId(newBlock.id); // Set the new block as active

      toast({
        title: `Heading ${level} Block Added`,
        description: `H${level} heading block has been added ${positionDescription}.`,
      });
    },
    [blocks, onBlocksChange, toast, activeBlockId]
  );

  // Add new divider block (horizontal rule)
  const addDividerBlock = useCallback(() => {
    let insertPosition: number;
    let positionDescription: string;

    if (activeBlockId) {
      // Find the active block and insert the divider block below it
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

    const newBlock: DividerBlock = {
      id: `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "divider",
      order: insertPosition,
      thickness: "1px",
      color: "#dddddd",
      margin: "20px",
      styles: {},
      metadata: {
        source: "manual",
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
    setActiveBlockId(newBlock.id); // Set the new block as active

    toast({
      title: "Divider Added",
      description: `Horizontal rule has been added ${positionDescription}.`,
    });
  }, [blocks, onBlocksChange, toast, activeBlockId]);

  // Save composition to database
  const saveComposition = useCallback(async () => {
    if (blocks.length === 0) {
      toast({
        title: "Cannot Save",
        description:
          "Please select copy to create content blocks before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const compositionData = {
        name: compositionName || generateAutoName(),
        type: "email", // Default type for Phase 1
        blocks,
        template: template || null,
        metadata: {
          selectedCopies,
          blockCount: blocks.length,
          autoGenerated: !compositionName,
          carId,
          projectId,
          emailHeader, // Save header settings
          // Preserve existing metadata if updating
          ...(loadedComposition?.metadata || {}),
        },
      };

      let result;
      if (loadedComposition?._id) {
        // Update existing composition
        result = await api.put(
          `/content-studio/compositions/${loadedComposition._id}`,
          compositionData
        );

        toast({
          title: "Composition Updated",
          description: `"${compositionData.name}" has been updated successfully.`,
        });
      } else {
        // Create new composition
        result = await api.post(
          "/content-studio/compositions",
          compositionData
        );

        toast({
          title: "Composition Saved",
          description: `Your composition "${compositionData.name}" has been saved successfully.`,
        });

        // Clear the name input after successful save for new compositions
        setCompositionName("");
      }
    } catch (error) {
      console.error("Error saving composition:", error);
      toast({
        title: loadedComposition ? "Update Failed" : "Save Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    blocks,
    compositionName,
    generateAutoName,
    template,
    selectedCopies,
    carId,
    projectId,
    emailHeader,
    loadedComposition,
    toast,
  ]);

  // Create template from current composition
  const createTemplate = useCallback(() => {
    if (blocks.length === 0) {
      toast({
        title: "Cannot Create Template",
        description:
          "Please select copy to create content blocks before creating a template.",
        variant: "destructive",
      });
      return;
    }

    const templateName = compositionName || generateAutoName();
    const newTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      type: "email" as const,
      blocks: [...blocks],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        description: `Template created from composition with ${blocks.length} blocks`,
      },
      settings: {
        maxWidth: "600px",
        backgroundColor: "#ffffff",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      },
    };

    onTemplateChange?.(newTemplate);

    toast({
      title: "Template Created",
      description: `Template "${templateName}" has been created from your current composition.`,
    });
  }, [blocks, compositionName, generateAutoName, onTemplateChange, toast]);

  // Generate MailChimp-friendly HTML from current blocks
  const generateMailChimpHTML = useCallback(() => {
    if (blocks.length === 0) {
      toast({
        title: "Cannot Export",
        description: "Please create content blocks before exporting HTML.",
        variant: "destructive",
      });
      return;
    }

    // Helper function to escape HTML entities
    const escapeHTML = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
    };

    // Generate table-based HTML for each block - Email client compatible approach
    const blockHTML = blocks
      .sort((a, b) => a.order - b.order)
      .map((block) => {
        switch (block.type) {
          case "heading":
            const headingBlock = block as HeadingBlock;
            let headingContent = headingBlock.content || "";

            // If rich formatting content exists, process it
            if (headingBlock.richFormatting?.formattedContent) {
              headingContent = headingBlock.richFormatting.formattedContent;

              // Convert **bold** to <strong>bold</strong>
              headingContent = headingContent.replace(
                /\*\*([^*]+)\*\*/g,
                "<strong>$1</strong>"
              );

              // Convert [text](url) to <a href="url">text</a>
              headingContent = headingContent.replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                '<a href="$2" style="color: #007bff; text-decoration: underline;">$1</a>'
              );
            } else {
              // For plain text, escape HTML
              headingContent = escapeHTML(headingContent);
            }

            // Table-based heading with inline styles
            const headingSize =
              headingBlock.level === 1
                ? "28px"
                : headingBlock.level === 2
                  ? "24px"
                  : "20px";
            const headingMargin =
              headingBlock.level === 1
                ? "30px"
                : headingBlock.level === 2
                  ? "25px"
                  : "20px";

            return `
              <tr>
                <td style="padding: 0; margin: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" class="email-content" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td class="mobile-text-padding" style="padding: ${headingMargin} 20px 15px 20px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: ${headingSize}; font-weight: bold; line-height: 1.3; color: #333333; margin: 0; mso-line-height-rule: exactly;">
                        ${headingContent}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;

          case "text":
            const textBlock = block as TextBlock;
            let content = textBlock.content || "";

            // If rich formatting content exists, process it
            if (textBlock.richFormatting?.formattedContent) {
              content = textBlock.richFormatting.formattedContent;

              // Convert **bold** to <strong>bold</strong>
              content = content.replace(
                /\*\*([^*]+)\*\*/g,
                "<strong>$1</strong>"
              );

              // Convert [text](url) to <a href="url">text</a>
              content = content.replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                '<a href="$2" style="color: #007bff; text-decoration: underline;">$1</a>'
              );

              // Convert line breaks to <br>
              content = content.replace(/\n/g, "<br>");
            } else {
              // For plain text, escape HTML and convert line breaks
              content = escapeHTML(content).replace(/\n/g, "<br>");
            }

            // Table-based text with inline styles
            return `
              <tr>
                <td style="padding: 0; margin: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" class="email-content" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td class="mobile-text-padding" style="padding: 10px 20px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0; mso-line-height-rule: exactly;">
                        ${content}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;

          case "image":
            const imageBlock = block as ImageBlock;
            if (!imageBlock.imageUrl) return "";

            // Table-based image with inline styles
            return `
              <tr>
                <td style="padding: 0; margin: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" class="email-content" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td class="mobile-padding" style="padding: 20px; text-align: center; line-height: 0; font-size: 0;">
                        <img src="${escapeHTML(imageBlock.imageUrl)}" alt="${escapeHTML(imageBlock.altText || "")}" class="email-content" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;

          case "divider":
            const dividerBlock = block as DividerBlock;
            const dividerMargin = dividerBlock.margin || "20px";
            const dividerColor = dividerBlock.color || "#dddddd";
            const dividerThickness = dividerBlock.thickness || "1px";

            // Table-based horizontal rule with inline styles
            return `
              <tr>
                <td style="padding: 0; margin: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" class="email-content" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td class="mobile-text-padding" style="padding: ${dividerMargin} 20px;">
                        <hr style="border: 0; height: ${dividerThickness}; background-color: ${dividerColor}; margin: 0; width: 100%; mso-line-height-rule: exactly;">
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;

          default:
            return "";
        }
      })
      .join("");

    // Create plain text version for multi-part email
    const plainTextContent = blocks
      .sort((a, b) => a.order - b.order)
      .map((block) => {
        switch (block.type) {
          case "heading":
            const headingBlock = block as HeadingBlock;
            return `\n${headingBlock.content || ""}\n${"=".repeat((headingBlock.content || "").length)}\n`;
          case "text":
            const textBlock = block as TextBlock;
            return `${textBlock.content || ""}\n`;
          case "image":
            const imageBlock = block as ImageBlock;
            return `[Image: ${imageBlock.altText || "Image"}]\n${imageBlock.imageUrl}\n`;
          case "divider":
            return `\n${"─".repeat(50)}\n`;
          default:
            return "";
        }
      })
      .join("\n");

    // Bullet-proof table-based HTML structure
    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${escapeHTML(compositionName || "Email")}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Gmail Mobile Fixes */
        .gmail-mobile-forced-width { width: 100% !important; }
        
        /* Mobile-first responsive design */
        @media only screen and (max-width: 600px) {
            .email-container { 
                width: 100% !important; 
                max-width: 100% !important; 
                padding: 0 !important; 
            }
            .email-content { 
                width: 100% !important; 
                max-width: 100% !important; 
            }
            .mobile-padding { 
                padding: 10px !important; 
            }
            .mobile-text-padding { 
                padding: 10px 15px !important; 
            }
            .header-image { 
                height: auto !important; 
                max-height: none !important; 
            }
            .mobile-spacing {
                padding: 10px 0 !important;
            }
        }
        
        /* Prevent Gmail auto-resizing */
        @media screen and (max-width: 525px) {
            .email-container {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <!-- Gmail Mobile Spacing Fix -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;</div>
    <table role="presentation" cellpadding="0" cellspacing="0" class="gmail-mobile-forced-width" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4; margin: 0; padding: 0;">
        <tr>
            <td class="mobile-spacing" style="padding: 10px 0; text-align: center;">
                <!-- Main Content Container -->
                <table role="presentation" cellpadding="0" cellspacing="0" class="email-container" style="width: 600px; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse;">`;

    // Add header if enabled - Gmail mobile optimized approach
    if (emailHeader.enabled && emailHeader.headerImageUrl) {
      if (emailHeader.stripes?.enabled) {
        htmlContent += `
                    <tr>
                        <td style="padding: 0; margin: 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="height: ${emailHeader.stripes.height || "4px"}; background-color: ${emailHeader.stripes.topColor || "#BC1F1F"}; font-size: 0; line-height: 0; mso-line-height-rule: exactly;">&nbsp;</td>
                                </tr>
                            </table>
                        </td>
                    </tr>`;
      }

      // Fixed header image implementation for Gmail mobile
      htmlContent += `
                    <tr>
                        <td style="padding: 0; margin: 0; text-align: center; line-height: 0; font-size: 0;">
                            <img src="${escapeHTML(emailHeader.headerImageUrl)}" alt="${escapeHTML(emailHeader.headerImageAlt)}" class="header-image email-content" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0; margin: 0; padding: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
                        </td>
                    </tr>`;

      if (emailHeader.stripes?.enabled) {
        htmlContent += `
                    <tr>
                        <td style="padding: 0; margin: 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="height: ${emailHeader.stripes.height || "4px"}; background-color: ${emailHeader.stripes.bottomColor || "#0E2D4E"}; font-size: 0; line-height: 0; mso-line-height-rule: exactly;">&nbsp;</td>
                                </tr>
                            </table>
                        </td>
                    </tr>`;
      }
    }

    // Add content blocks
    htmlContent += blockHTML;

    // Close the HTML structure
    htmlContent += `
                </table>
                <!-- End Main Content Container -->
            </td>
        </tr>
    </table>
</body>
</html>`;

    return htmlContent;
  }, [blocks, compositionName, emailHeader, toast]);

  // Export HTML to clipboard
  const exportToClipboard = useCallback(async () => {
    const html = generateMailChimpHTML();
    if (!html) return;

    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "HTML Copied!",
        description:
          "MailChimp-friendly HTML has been copied to your clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast({
        title: "Copy Failed",
        description:
          "Could not copy to clipboard. Please try the download option.",
        variant: "destructive",
      });
    }
  }, [generateMailChimpHTML, toast]);

  // Download HTML file
  const downloadHTML = useCallback(() => {
    const html = generateMailChimpHTML();
    if (!html) return;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${compositionName || "email-template"}-mailchimp.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "HTML Downloaded!",
      description: `File "${a.download}" has been downloaded.`,
    });
  }, [generateMailChimpHTML, compositionName, toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-transparent border border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Content Composer</span>
              {blocks.length > 0 && (
                <Badge variant="secondary" className="bg-muted/20">
                  {blocks.length} blocks
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Export HTML Dropdown */}
              {blocks.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={exportToClipboard}
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-border/40 hover:bg-muted/20"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy HTML
                  </Button>
                  <Button
                    onClick={downloadHTML}
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-border/40 hover:bg-muted/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download HTML
                  </Button>
                  <Button
                    onClick={async () => {
                      const html = generateMailChimpHTML();
                      if (!html) return;

                      try {
                        await navigator.clipboard.writeText(html);
                        console.log("🔍 Generated HTML:", html);

                        toast({
                          title: "Debug HTML Copied!",
                          description:
                            "Gmail-optimized HTML has been copied to your clipboard. Also logged to console for inspection.",
                        });
                      } catch (error) {
                        console.error("Failed to copy to clipboard:", error);
                        console.log("🔍 Generated HTML:", html);

                        toast({
                          title: "Copy Failed - Check Console",
                          description:
                            "Could not copy to clipboard, but HTML has been logged to console.",
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-border/40 hover:bg-muted/20"
                  >
                    Debug HTML
                  </Button>
                </div>
              )}

              {/* Save Button - Only show when blocks exist */}
              {blocks.length > 0 && (
                <Button
                  onClick={saveComposition}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {loadedComposition ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {loadedComposition ? "Update" : "Save"}
                    </>
                  )}
                </Button>
              )}

              {/* Create Template Button */}
              <Button
                onClick={createTemplate}
                disabled={blocks.length === 0}
                variant="outline"
                size="sm"
                className="bg-transparent border-border/40 hover:bg-muted/20"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Composition Name Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="composition-name">
                  Composition Name (Optional)
                </Label>
                <Input
                  id="composition-name"
                  placeholder="Enter name or leave blank for auto-generated name"
                  value={compositionName}
                  onChange={(e) => setCompositionName(e.target.value)}
                  className="bg-transparent border-border/40 focus:border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label>Selected Copy</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedCopies.length > 0
                    ? `${selectedCopies.length} copy items imported as paragraph blocks`
                    : "No copy selected - go to Copy Selection tab"}
                </div>
              </div>
              {blocks.length > 0 && (
                <div className="space-y-2">
                  <Label>Export Options</Label>
                  <div className="text-sm text-muted-foreground">
                    Use "Copy HTML" or "Download HTML" above to get
                    MailChimp-friendly email template code
                  </div>
                </div>
              )}
            </div>

            {/* Email Header Configuration */}
            <EmailHeaderConfig
              emailHeader={emailHeader}
              onEmailHeaderChange={setEmailHeader}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Insertion Toolbar */}
      <Card className="bg-transparent border border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PlusCircle className="h-5 w-5" />
            <span>Insert Content</span>
            {activeBlockId && (
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-800 text-xs"
              >
                Will insert below active block
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Text Block Button */}
            <Button
              onClick={addTextBlock}
              variant="outline"
              size="sm"
              className="bg-transparent border-border/40 hover:bg-muted/20"
            >
              <Type className="h-4 w-4 mr-2" />
              Text Block
            </Button>

            {/* Heading Buttons */}
            <Button
              onClick={() => addHeadingBlock(1)}
              variant="outline"
              size="sm"
              className="bg-transparent border-border/40 hover:bg-muted/20"
            >
              <Heading className="h-4 w-4 mr-2" />
              H1 Heading
            </Button>

            <Button
              onClick={() => addHeadingBlock(2)}
              variant="outline"
              size="sm"
              className="bg-transparent border-border/40 hover:bg-muted/20"
            >
              <Heading className="h-4 w-4 mr-2" />
              H2 Heading
            </Button>

            <Button
              onClick={() => addHeadingBlock(3)}
              variant="outline"
              size="sm"
              className="bg-transparent border-border/40 hover:bg-muted/20"
            >
              <Heading className="h-4 w-4 mr-2" />
              H3 Heading
            </Button>

            {/* Divider Button */}
            <Button
              onClick={addDividerBlock}
              variant="outline"
              size="sm"
              className="bg-transparent border-border/40 hover:bg-muted/20"
            >
              <Minus className="h-4 w-4 mr-2" />
              Horizontal Rule
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-3 text-sm text-muted-foreground">
            <p>
              Click any block in the preview or editor to make it active, then
              use these buttons to insert content above or below it.
              {!activeBlockId &&
                " If no block is active, new content will be added at the end."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Preview (60% width on desktop) */}
        <div className="lg:col-span-3">
          <PreviewColumn
            blocks={getDisplayBlocks()}
            emailHeader={emailHeader}
          />
        </div>

        {/* Right Column - Block Editing Controls (40% width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          {(galleriesUrl || carImagesUrl) && (
            <Card className="bg-transparent border border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5" />
                    <span>Image Gallery</span>
                    {finalImages.length > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-transparent text-xs"
                      >
                        {finalImages.length} images
                      </Badge>
                    )}
                    {activeBlockId && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 text-xs"
                      >
                        Insert above active block
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchImages()}
                      disabled={loadingImages}
                      className="hover:bg-muted/20"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${loadingImages ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsGalleryCollapsed(!isGalleryCollapsed)}
                      className="hover:bg-muted/20"
                    >
                      {isGalleryCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              {!isGalleryCollapsed && (
                <CardContent>
                  {loadingImages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading images...</span>
                    </div>
                  ) : finalImages && finalImages.length > 0 ? (
                    <ScrollArea className="h-96">
                      <div className="grid grid-cols-3 gap-2">
                        {finalImages.map((image: any, index: number) => (
                          <div
                            key={image.id || index}
                            className="relative group cursor-pointer rounded-lg overflow-hidden border border-border/40 hover:border-border/60 transition-all"
                            onClick={() =>
                              addImageFromGallery(image.imageUrl, image.alt)
                            }
                            title={`${image.alt} - ${image.galleryName}`}
                          >
                            <img
                              src={image.imageUrl}
                              alt={image.alt || "Gallery image"}
                              className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform bg-muted/10"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                console.error("❌ Image failed to load:", {
                                  src: image.imageUrl,
                                  alt: image.alt,
                                  galleryName: image.galleryName,
                                  originalUrl: image.url,
                                });
                                target.src = "/placeholder-image.jpg";
                              }}
                              onLoad={() => {
                                console.log("✅ Image loaded successfully:", {
                                  src: image.imageUrl,
                                  galleryName: image.galleryName,
                                });
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                              <Plus className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {/* Gallery name badge */}
                            <div className="absolute bottom-1 left-1 right-1">
                              <div className="bg-black/70 text-white text-xs px-2 py-1 rounded text-center truncate">
                                {image.galleryName}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>
                        No images found in{" "}
                        {projectId ? "project galleries" : "car gallery"}
                      </p>
                      {projectId && (
                        <p className="text-xs mt-1">
                          Make sure galleries are linked to this project
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Block List */}
          {blocks.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center space-x-2 text-sm">
                <Type className="h-4 w-4" />
                <span>Content Blocks</span>
                <Badge variant="outline" className="bg-transparent text-xs">
                  {blocks.length}
                </Badge>
              </h3>
              {getDisplayBlocks().map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  blocks={blocks}
                  index={index}
                  total={blocks.length}
                  isDragging={draggedBlockId === block.id}
                  isActive={activeBlockId === block.id}
                  onUpdate={(updates) => updateBlock(block.id, updates)}
                  onRemove={() => removeBlock(block.id)}
                  onMove={(direction) => moveBlock(block.id, direction)}
                  onDragStart={() => handleDragStart(block.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={() => handleDragOver(index)}
                  onSetActive={() => setActiveBlockId(block.id)}
                  onBlocksChange={onBlocksChange}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {blocks.length === 0 && (
            <Card className="bg-transparent border border-border/40">
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted/20 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Select Copy to Get Started</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Go to the Copy Selection tab to choose copy from your
                      project or car. Selected copy will automatically be split
                      into paragraph blocks here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
