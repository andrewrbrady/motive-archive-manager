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
} from "lucide-react";

import { PreviewColumn } from "./PreviewColumn";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import {
  BlockComposerProps,
  ContentBlock,
  TextBlock,
  ImageBlock,
  ContentBlockType,
  SelectedCopy,
} from "./types";

/**
 * BlockComposer - Copy-Driven Content Creator for Content Studio
 *
 * This component automatically creates content blocks from selected copy and allows
 * users to enhance them with images from associated galleries.
 *
 * PHASE 1 IMPLEMENTATION (Copy-Driven):
 * - Automatically imports selected copy into text blocks
 * - Provides image gallery from project/car for easy insertion
 * - Two-column layout: preview (60%) and controls (40%)
 * - Focus on copy enhancement rather than generic block creation
 */
export function BlockComposer({
  selectedCopies,
  blocks,
  onBlocksChange,
  template,
  onTemplateChange,
}: BlockComposerProps) {
  const { toast } = useToast();

  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [compositionName, setCompositionName] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

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

  // Automatically import selected copy into blocks (split by paragraphs)
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

        // If still only one paragraph, keep it as is
        if (paragraphs.length <= 1) {
          paragraphs = [copy.text.trim()];
        }

        paragraphs.forEach((paragraph) => {
          // Skip very short lines that are likely headers or separators
          if (paragraph.length > 10) {
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
            blockIndex++;
          }
        });
      });

      onBlocksChange(textBlocks);

      toast({
        title: "Copy Imported",
        description: `${textBlocks.length} paragraph blocks created from ${selectedCopies.length} copy items.`,
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
        },
      };

      const response = await fetch("/api/content-studio/compositions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(compositionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save composition");
      }

      const result = await response.json();

      toast({
        title: "Composition Saved",
        description: `Your composition "${compositionData.name}" has been saved successfully.`,
      });

      // Clear the name input after successful save
      setCompositionName("");
    } catch (error) {
      console.error("Error saving composition:", error);
      toast({
        title: "Save Failed",
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Preview (60% width on desktop) */}
        <div className="lg:col-span-3">
          <PreviewColumn blocks={getDisplayBlocks()} />
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

/**
 * BlockEditor - Individual block editor component
 */
interface BlockEditorProps {
  block: ContentBlock;
  index: number;
  total: number;
  isDragging: boolean;
  isActive: boolean;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onSetActive: () => void;
}

function BlockEditor({
  block,
  index,
  total,
  isDragging,
  isActive,
  onUpdate,
  onRemove,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onSetActive,
}: BlockEditorProps) {
  const getBlockIcon = (type: ContentBlockType) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />;
      case "image":
        // eslint-disable-next-line jsx-a11y/alt-text
        return <Image className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", block.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver();
  };

  return (
    <div
      className={`relative group transition-all duration-200 ease-out ${
        isDragging ? "opacity-50 scale-[0.98] z-50" : ""
      }`}
      onDragOver={handleDragOver}
    >
      <Card
        className={`bg-transparent border transition-all duration-200 cursor-pointer ${
          isDragging
            ? "border-primary shadow-lg"
            : isActive
              ? "border-blue-500 shadow-md bg-blue-50/10"
              : "border-border/40 hover:border-border/60"
        }`}
        onClick={onSetActive}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getBlockIcon(block.type)}
              <span className="font-medium capitalize text-sm">
                {block.type} Block
              </span>
              <Badge variant="outline" className="bg-transparent">
                #{index + 1}
              </Badge>
              {isActive && (
                <Badge
                  variant="default"
                  className="bg-blue-500 text-white text-xs"
                >
                  Active
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Quick Reorder Controls */}
              <div className="flex items-center space-x-1 bg-muted/20 rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMove("up")}
                  disabled={index === 0}
                  className="h-6 w-6 p-0 hover:bg-muted/40"
                  title="Move up"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMove("down")}
                  disabled={index === total - 1}
                  className="h-6 w-6 p-0 hover:bg-muted/40"
                  title="Move down"
                >
                  ↓
                </Button>
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Remove block"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BlockContent block={block} onUpdate={onUpdate} />
        </CardContent>
      </Card>

      {/* Full-Height Drag Handle - Right Edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-muted/30 hover:to-muted/50 rounded-r-lg flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all duration-150 z-10"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        title="Drag to reorder block"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

/**
 * BlockContent - Renders block-specific editing interface
 */
interface BlockContentProps {
  block: ContentBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
}

function BlockContent({ block, onUpdate }: BlockContentProps) {
  switch (block.type) {
    case "text":
      return (
        <div className="space-y-3">
          <div>
            <Label htmlFor={`text-${block.id}`} className="text-sm font-medium">
              Content
            </Label>
            <textarea
              id={`text-${block.id}`}
              className="w-full min-h-[100px] p-3 border border-border/40 rounded-md resize-vertical bg-transparent focus:border-border/60 focus:ring-1 focus:ring-ring transition-colors"
              placeholder="Enter your text content..."
              value={(block as TextBlock).content || ""}
              onChange={(e) =>
                onUpdate({ content: e.target.value } as Partial<TextBlock>)
              }
            />
          </div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <div>
            <Label
              htmlFor={`image-url-${block.id}`}
              className="text-sm font-medium"
            >
              Image URL
            </Label>
            <Input
              id={`image-url-${block.id}`}
              placeholder="https://example.com/image.jpg"
              value={(block as ImageBlock).imageUrl || ""}
              onChange={(e) =>
                onUpdate({ imageUrl: e.target.value } as Partial<ImageBlock>)
              }
              className="bg-transparent border-border/40 focus:border-border/60"
            />
          </div>
          <div>
            <Label
              htmlFor={`image-alt-${block.id}`}
              className="text-sm font-medium"
            >
              Alt Text
            </Label>
            <Input
              id={`image-alt-${block.id}`}
              placeholder="Describe the image..."
              value={(block as ImageBlock).altText || ""}
              onChange={(e) =>
                onUpdate({ altText: e.target.value } as Partial<ImageBlock>)
              }
              className="bg-transparent border-border/40 focus:border-border/60"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground bg-muted/10 rounded-md p-3 border border-border/20">
          {block.type} blocks are managed automatically
        </div>
      );
  }
}
