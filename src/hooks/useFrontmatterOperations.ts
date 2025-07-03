import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  ContentBlock,
  TextBlock,
  FrontmatterBlock,
  ImageBlock,
} from "@/components/content-studio/types";

export interface FrontmatterState {
  title: string;
  subtitle: string;
  date: string;
  author: string;
  cover: string;
  status: string;
  tags: string[];
  callToAction: string;
  callToActionUrl: string;
  gallery: Array<{ id: string; src: string; alt: string }>;
}

export interface FrontmatterInfo {
  frontmatterData: Record<string, any>;
  remainingContent: string;
  originalTextBlockId: string;
}

/**
 * Custom hook for handling frontmatter operations in BlockComposer
 * Extracted from BlockComposer.tsx to reduce file size and improve maintainability
 */
export function useFrontmatterOperations(
  blocks: ContentBlock[],
  onBlocksChange: (blocks: ContentBlock[]) => void,
  setActiveBlockId: (id: string | null) => void,
  compositionName: string
) {
  const { toast } = useToast();

  // Frontmatter state
  const [frontmatter, setFrontmatter] = useState<FrontmatterState>({
    title: "",
    subtitle: "",
    date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
    author: "Motive Archive",
    cover: "",
    status: "",
    tags: [""],
    callToAction: "",
    callToActionUrl: "",
    gallery: [],
  });

  /**
   * Enhanced YAML frontmatter detection with improved parsing
   * Handles both properly formatted and malformed frontmatter
   */
  const detectFrontmatterInTextBlock = useCallback(
    (textBlock: TextBlock): FrontmatterInfo | null => {
      if (!textBlock.content) return null;

      const content = textBlock.content.trim();

      // Check if content starts with YAML frontmatter delimiters
      if (!content.startsWith("---")) return null;

      let frontmatterText = "";
      let remainingContent = "";

      // Look for closing delimiter
      const endDelimiterIndex = content.indexOf("---", 3);

      if (endDelimiterIndex !== -1) {
        // Standard frontmatter with closing delimiter
        frontmatterText = content.substring(3, endDelimiterIndex).trim();
        remainingContent = content.substring(endDelimiterIndex + 3).trim();
      } else {
        // Handle malformed frontmatter without closing delimiter
        const contentWithoutStart = content.substring(3).trim();

        // Split by double newlines to find paragraphs
        const paragraphs = contentWithoutStart.split(/\n\s*\n/);

        if (paragraphs.length > 1) {
          // Check if first paragraph contains frontmatter-like content
          const firstParagraph = paragraphs[0];
          if (
            firstParagraph.includes(":") &&
            (firstParagraph.includes("title") ||
              firstParagraph.includes("subtitle") ||
              firstParagraph.includes("author"))
          ) {
            frontmatterText = firstParagraph;
            remainingContent = paragraphs.slice(1).join("\n\n");
          } else {
            frontmatterText = contentWithoutStart;
            remainingContent = "";
          }
        } else {
          // Single paragraph - check if it contains key:value pairs
          if (
            contentWithoutStart.includes(":") &&
            (contentWithoutStart.includes("title") ||
              contentWithoutStart.includes("subtitle") ||
              contentWithoutStart.includes("author"))
          ) {
            frontmatterText = contentWithoutStart;
            remainingContent = "";
          } else {
            return null; // Not frontmatter
          }
        }
      }

      // Enhanced YAML parsing
      const parsedFrontmatter = parseYAMLFrontmatter(frontmatterText);

      // Only return if we found valid frontmatter fields
      if (Object.keys(parsedFrontmatter).length === 0) {
        return null;
      }

      return {
        frontmatterData: parsedFrontmatter,
        remainingContent,
        originalTextBlockId: textBlock.id,
      };
    },
    []
  );

  /**
   * Enhanced YAML parsing function with better handling of different formats
   */
  const parseYAMLFrontmatter = useCallback(
    (yamlText: string): Record<string, any> => {
      const parsed: Record<string, any> = {};
      let lines: string[] = [];

      if (yamlText.includes("\n")) {
        // Multi-line YAML
        lines = yamlText.split("\n");
      } else {
        // Single line - try to split by key patterns
        const keyValuePattern = /(\w+):\s*([^:]+?)(?=\s+\w+:|$)/g;
        let match;
        while ((match = keyValuePattern.exec(yamlText)) !== null) {
          const key = match[1].trim();
          const value = match[2].trim();
          lines.push(`${key}: ${value}`);
        }
      }

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;

        const colonIndex = trimmedLine.indexOf(":");
        if (colonIndex === -1) continue;

        const key = trimmedLine.substring(0, colonIndex).trim();
        let value = trimmedLine.substring(colonIndex + 1).trim();

        // Handle different value formats
        if (key === "tags") {
          // Handle array formats: [tag1, tag2] or ["tag1", "tag2"] or tag1, tag2
          if (value.startsWith("[") && value.endsWith("]")) {
            const tagsString = value.substring(1, value.length - 1);
            parsed[key] = tagsString
              .split(",")
              .map((tag: string) => tag.trim().replace(/^["']|["']$/g, ""))
              .filter(Boolean);
          } else {
            // Simple comma-separated format
            parsed[key] = value
              .split(",")
              .map((tag: string) => tag.trim().replace(/^["']|["']$/g, ""))
              .filter(Boolean);
          }
        } else {
          // Remove surrounding quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, "");
          parsed[key] = cleanValue;
        }
      }

      return parsed;
    },
    []
  );

  /**
   * Convert a text block containing frontmatter to a structured frontmatter block
   */
  const convertTextToFrontmatterBlock = useCallback(
    (textBlockId: string) => {
      const textBlock = blocks.find(
        (block) => block.id === textBlockId && block.type === "text"
      ) as TextBlock | undefined;

      if (!textBlock) return;

      const frontmatterInfo = detectFrontmatterInTextBlock(textBlock);
      if (!frontmatterInfo) return;

      // Check if a frontmatter block already exists
      const existingFrontmatter = blocks.find(
        (block) => block.type === "frontmatter"
      );
      if (existingFrontmatter) {
        toast({
          title: "Frontmatter Already Exists",
          description:
            "You can only have one frontmatter block per composition. Please remove the existing one first.",
          variant: "destructive",
        });
        return;
      }

      // Create new frontmatter block with enhanced data structure
      const frontmatterBlock: FrontmatterBlock = {
        id: `frontmatter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "frontmatter",
        order: textBlock.order,
        styles: {},
        metadata: {
          source: "converted-from-text",
          originalTextBlockId: textBlockId,
          createdAt: new Date().toISOString(),
        },
        data: {
          title: frontmatterInfo.frontmatterData.title || "",
          subtitle: frontmatterInfo.frontmatterData.subtitle || "",
          author: frontmatterInfo.frontmatterData.author || "Motive Archive",
          date:
            frontmatterInfo.frontmatterData.date ||
            new Date().toISOString().split("T")[0],
          status: frontmatterInfo.frontmatterData.status || "",
          cover: frontmatterInfo.frontmatterData.cover || "",
          tags: frontmatterInfo.frontmatterData.tags || [],
          callToAction: frontmatterInfo.frontmatterData.callToAction || "",
          callToActionUrl:
            frontmatterInfo.frontmatterData.callToActionUrl || "",
          type: frontmatterInfo.frontmatterData.type || "",
          ...frontmatterInfo.frontmatterData, // Include any additional fields
        },
      };

      let updatedBlocks: ContentBlock[] = [];

      if (frontmatterInfo.remainingContent) {
        // Create a new text block with remaining content
        const newTextBlock: TextBlock = {
          ...textBlock,
          id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: frontmatterInfo.remainingContent,
          order: textBlock.order + 1,
          metadata: {
            ...textBlock.metadata,
            source: "converted-remainder",
            originalTextBlockId: textBlockId,
            updatedAt: new Date().toISOString(),
          },
        };

        // Replace original text block with frontmatter block
        updatedBlocks = blocks.map((block) => {
          if (block.id === textBlockId) {
            return frontmatterBlock;
          }
          return block;
        });

        // Insert the new text block after the frontmatter block
        const frontmatterIndex = updatedBlocks.findIndex(
          (block) => block.id === frontmatterBlock.id
        );
        updatedBlocks.splice(frontmatterIndex + 1, 0, newTextBlock);
      } else {
        // Just replace the text block with frontmatter block
        updatedBlocks = blocks.map((block) => {
          if (block.id === textBlockId) {
            return frontmatterBlock;
          }
          return block;
        });
      }

      // Reorder all blocks
      const reorderedBlocks = updatedBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));

      onBlocksChange(reorderedBlocks);
      setActiveBlockId(frontmatterBlock.id);

      toast({
        title: "Converted to Frontmatter Block",
        description:
          "YAML frontmatter has been converted to a structured metadata block.",
      });
    },
    [
      blocks,
      onBlocksChange,
      toast,
      setActiveBlockId,
      detectFrontmatterInTextBlock,
    ]
  );

  /**
   * Create frontmatter blocks for news article mode
   */
  const createFrontmatterBlocks = useCallback(() => {
    const frontmatterBlocks: ContentBlock[] = [];
    let order = 0;

    // Article Title Block
    const titleBlock: TextBlock = {
      id: `frontmatter-title-${Date.now()}`,
      type: "text",
      order: order++,
      content: frontmatter.title || compositionName || "Article Title",
      element: "h1",
      styles: {},
      metadata: {
        source: "frontmatter",
        frontmatterType: "title",
        createdAt: new Date().toISOString(),
      },
      cssClassName: "text-4xl font-bold text-foreground mb-4 leading-tight",
    };

    // Article Subtitle Block
    const subtitleBlock: TextBlock = {
      id: `frontmatter-subtitle-${Date.now()}`,
      type: "text",
      order: order++,
      content: frontmatter.subtitle || "Article subtitle or description",
      element: "p",
      styles: {},
      metadata: {
        source: "frontmatter",
        frontmatterType: "subtitle",
        createdAt: new Date().toISOString(),
      },
      cssClassName: "text-xl text-muted-foreground leading-relaxed mb-6",
    };

    // Meta Information Block (Author, Date, Status)
    const metaBlock: TextBlock = {
      id: `frontmatter-meta-${Date.now()}`,
      type: "text",
      order: order++,
      content: `By ${frontmatter.author} • ${new Date(
        frontmatter.date
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })} • ${frontmatter.status || "LIVE AUCTION"}`,
      element: "p",
      styles: {},
      metadata: {
        source: "frontmatter",
        frontmatterType: "meta",
        createdAt: new Date().toISOString(),
      },
      cssClassName: "text-sm text-muted-foreground mb-4",
    };

    // Tags Block
    if (
      frontmatter.tags &&
      frontmatter.tags.length > 0 &&
      frontmatter.tags[0]
    ) {
      const tagsBlock: TextBlock = {
        id: `frontmatter-tags-${Date.now()}`,
        type: "text",
        order: order++,
        content: `Tags: ${frontmatter.tags.filter(Boolean).join(", ")}`,
        element: "p",
        styles: {},
        metadata: {
          source: "frontmatter",
          frontmatterType: "tags",
          createdAt: new Date().toISOString(),
        },
        cssClassName: "text-sm text-muted-foreground mb-6",
      };
      frontmatterBlocks.push(tagsBlock);
    }

    // Cover Image Block
    if (frontmatter.cover) {
      const coverBlock: ImageBlock = {
        id: `frontmatter-cover-${Date.now()}`,
        type: "image",
        order: order++,
        imageUrl: frontmatter.cover,
        altText: "Featured article image",
        width: "100%",
        alignment: "center",
        styles: {},
        metadata: {
          source: "frontmatter",
          frontmatterType: "cover",
          createdAt: new Date().toISOString(),
        },
        cssClassName: "mb-8",
      };
      frontmatterBlocks.push(coverBlock);
    }

    frontmatterBlocks.unshift(titleBlock, subtitleBlock, metaBlock);
    return frontmatterBlocks;
  }, [frontmatter, compositionName]);

  /**
   * Add a new frontmatter block
   */
  const addFrontmatterBlock = useCallback(() => {
    // Check if a frontmatter block already exists
    const existingFrontmatter = blocks.find(
      (block) => block.type === "frontmatter"
    );
    if (existingFrontmatter) {
      toast({
        title: "Frontmatter Already Exists",
        description: "You can only have one frontmatter block per composition.",
        variant: "destructive",
      });
      return;
    }

    const newBlock: FrontmatterBlock = {
      id: `frontmatter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "frontmatter",
      order: 0, // Always put frontmatter at the top
      styles: {},
      metadata: { source: "manual", createdAt: new Date().toISOString() },
      data: {
        title: compositionName || "Article Title",
        subtitle: "Article subtitle or description",
        author: "Motive Archive",
        date: new Date().toISOString().split("T")[0],
        status: "LIVE AUCTION",
        tags: ["porsche", "auction", "bring-a-trailer"],
      },
    };

    // Always insert frontmatter at the beginning
    const updatedBlocks = [
      newBlock,
      ...blocks.map((block) => ({ ...block, order: block.order + 1 })),
    ];

    const reorderedBlocks = updatedBlocks.map((block, index) => ({
      ...block,
      order: index,
    }));

    onBlocksChange(reorderedBlocks);
    setActiveBlockId(newBlock.id);

    toast({
      title: "Frontmatter Block Added",
      description:
        "Article metadata block has been added at the top of your composition.",
    });
  }, [blocks, onBlocksChange, toast, compositionName, setActiveBlockId]);

  /**
   * Add frontmatter blocks for news articles
   */
  const addFrontmatterBlocks = useCallback(() => {
    const frontmatterBlocks = createFrontmatterBlocks();
    const updatedBlocks = [
      ...frontmatterBlocks,
      ...blocks.map((block) => ({
        ...block,
        order: block.order + frontmatterBlocks.length,
      })),
    ];

    onBlocksChange(updatedBlocks);
    toast({
      title: "News Article Structure Added",
      description: "Frontmatter blocks have been added to your composition.",
    });
  }, [createFrontmatterBlocks, blocks, onBlocksChange, toast]);

  return {
    frontmatter,
    setFrontmatter,
    detectFrontmatterInTextBlock,
    convertTextToFrontmatterBlock,
    createFrontmatterBlocks,
    addFrontmatterBlock,
    addFrontmatterBlocks,
    parseYAMLFrontmatter,
  };
}
