import { useCallback, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  VideoBlock,
  DividerBlock,
  HTMLBlock,
} from "@/components/content-studio/types";

/**
 * Custom hook for handling block operations in BlockComposer
 * Extracted from BlockComposer.tsx to reduce file size and improve maintainability
 */
export function useBlockOperations(
  blocks: ContentBlock[],
  onBlocksChange: (blocks: ContentBlock[]) => void,
  activeBlockId: string | null,
  setActiveBlockId: (id: string | null) => void,
  projectId?: string,
  carId?: string
) {
  const { toast } = useToast();

  // Helper function for block insertion logic
  const getInsertPosition = useCallback(() => {
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
  }, [activeBlockId, blocks]);

  // Generic function to insert a block
  const insertBlock = useCallback(
    (newBlock: ContentBlock, title: string) => {
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
    },
    [getInsertPosition, blocks, onBlocksChange, setActiveBlockId, toast]
  );

  // Advanced block management with optimized memoization
  const memoizedCallbacks = useMemo(
    () => ({
      // Add image block from gallery
      addImageFromGallery: (imageUrl: string, altText?: string) => {
        const { position, description } = getInsertPosition();

        const newBlock: ImageBlock = {
          id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "image",
          order: position,
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
          ...blocks.slice(0, position),
          newBlock,
          ...blocks.slice(position),
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
          description: `Image has been added ${description}.`,
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
      getInsertPosition,
    ]
  );

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
      const updatedBlocks = blocks.map((block) => {
        if (block.id !== blockId) return block;
        return { ...block, ...updates } as ContentBlock;
      });
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
  }, [insertBlock]);

  // Add new heading block
  const addHeadingBlock = useCallback(
    (level: 1 | 2 | 3 = 2) => {
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
    [insertBlock]
  );

  // Add new divider block (horizontal rule)
  const addDividerBlock = useCallback(() => {
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
  }, [insertBlock]);

  // Add new video block
  const addVideoBlock = useCallback(() => {
    const newBlock: VideoBlock = {
      id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "video",
      order: 0, // Will be set by insertBlock
      url: "",
      platform: "youtube",
      embedId: "",
      aspectRatio: "16:9",
      alignment: "center",
      styles: {},
      metadata: { source: "manual", createdAt: new Date().toISOString() },
    };

    insertBlock(newBlock, "Video Block Added");
  }, [insertBlock]);

  // Add new list block (unordered list)
  const addListBlock = useCallback(() => {
    const newBlock: import("@/components/content-studio/types").ListBlock = {
      id: `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "list",
      order: 0, // Will be set by insertBlock
      items: ["List item 1", "List item 2"],
      style: "ul",
      styles: {},
      metadata: { source: "manual", createdAt: new Date().toISOString() },
    };
    insertBlock(newBlock, "List Block Added");
  }, [insertBlock]);

  // Add new HTML block
  const addHtmlBlock = useCallback(() => {
    const newBlock: HTMLBlock = {
      id: `html-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "html",
      order: 0, // Will be set by insertBlock
      content: "<div>\n  <p>Enter your HTML content here...</p>\n</div>",
      description: "Custom HTML Block",
      styles: {},
      metadata: { source: "manual", createdAt: new Date().toISOString() },
    };
    insertBlock(newBlock, "HTML Block Added");
  }, [insertBlock]);

  return {
    addImageFromGallery,
    removeBlock,
    updateBlock,
    moveBlock,
    addTextBlock,
    addHeadingBlock,
    addDividerBlock,
    addVideoBlock,
    addListBlock, // Exported
    addHtmlBlock, // Exported
    getInsertPosition,
    insertBlock,
  };
}
