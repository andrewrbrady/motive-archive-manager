"use client";

import React, { useMemo, useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Link,
  Type,
  Info,
  Italic,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ContentBlock,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  DividerBlock,
} from "./types";

/**
 * BlockContent - Renders block-specific editing interface
 * Phase 1 Performance: Extracted from BlockComposer.tsx for better maintainability
 * Phase 2A Performance: Added useMemo for image processing and block type optimizations
 * Phase 2 Performance: Added custom comparison function for React.memo
 * Rich Text Enhancement: Added bold and link formatting support
 */
interface BlockContentProps {
  block: ContentBlock;
  blocks: ContentBlock[];
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

// Custom comparison function for React.memo to prevent unnecessary re-renders
const areBlockContentPropsEqual = (
  prevProps: BlockContentProps,
  nextProps: BlockContentProps
) => {
  // Quick reference check for functions (they should be stable)
  if (
    prevProps.onUpdate !== nextProps.onUpdate ||
    prevProps.onBlocksChange !== nextProps.onBlocksChange
  ) {
    return false;
  }

  // Compare blocks array length only for performance
  if (prevProps.blocks.length !== nextProps.blocks.length) {
    return false;
  }

  // Deep compare the specific block that this component is editing
  const prevBlock = prevProps.block;
  const nextBlock = nextProps.block;

  // Quick primitive checks first
  if (
    prevBlock.id !== nextBlock.id ||
    prevBlock.type !== nextBlock.type ||
    prevBlock.order !== nextBlock.order
  ) {
    return false;
  }

  // Check content property only for blocks that have it
  if (
    (prevBlock.type === "text" || prevBlock.type === "heading") &&
    (nextBlock.type === "text" || nextBlock.type === "heading")
  ) {
    const prevContentBlock = prevBlock as TextBlock | HeadingBlock;
    const nextContentBlock = nextBlock as TextBlock | HeadingBlock;
    if (prevContentBlock.content !== nextContentBlock.content) {
      return false;
    }
  }

  // Compare type-specific properties efficiently
  switch (prevBlock.type) {
    case "heading": {
      const prevHeading = prevBlock as HeadingBlock;
      const nextHeading = nextBlock as HeadingBlock;
      return (
        prevHeading.level === nextHeading.level &&
        JSON.stringify(prevHeading.richFormatting) ===
          JSON.stringify(nextHeading.richFormatting)
      );
    }
    case "text": {
      const prevText = prevBlock as TextBlock;
      const nextText = nextBlock as TextBlock;
      return (
        JSON.stringify(prevText.richFormatting) ===
        JSON.stringify(nextText.richFormatting)
      );
    }
    case "image": {
      const prevImage = prevBlock as ImageBlock;
      const nextImage = nextBlock as ImageBlock;
      return (
        prevImage.imageUrl === nextImage.imageUrl &&
        prevImage.altText === nextImage.altText &&
        prevImage.width === nextImage.width &&
        prevImage.height === nextImage.height
      );
    }
    case "divider": {
      const prevDivider = prevBlock as DividerBlock;
      const nextDivider = nextBlock as DividerBlock;
      return (
        prevDivider.thickness === nextDivider.thickness &&
        prevDivider.color === nextDivider.color &&
        prevDivider.margin === nextDivider.margin
      );
    }
    default:
      return true;
  }
};

const BlockContent = React.memo<BlockContentProps>(function BlockContent({
  block,
  blocks,
  onUpdate,
  onBlocksChange,
}) {
  // Performance optimization: Memoize block type to prevent unnecessary switch recalculation
  const blockType = useMemo(() => block.type, [block.type]);

  switch (blockType) {
    case "text":
      return (
        <TextBlockContent
          block={block as TextBlock}
          blocks={blocks}
          onUpdate={onUpdate}
          onBlocksChange={onBlocksChange}
        />
      );
    case "image":
      return (
        <ImageBlockContent block={block as ImageBlock} onUpdate={onUpdate} />
      );
    case "heading":
      return (
        <HeadingBlockContent
          block={block as HeadingBlock}
          blocks={blocks}
          onUpdate={onUpdate}
          onBlocksChange={onBlocksChange}
        />
      );
    case "divider":
      return (
        <DividerBlockContent
          block={block as DividerBlock}
          onUpdate={onUpdate}
        />
      );
    default:
      return <DefaultBlockContent block={block} />;
  }
}, areBlockContentPropsEqual);

/**
 * FormattedTextPreview - Renders formatted text preview with bold and links
 * Converts markdown-like syntax to HTML for preview purposes
 */
const FormattedTextPreview = React.memo<{ content: string }>(
  function FormattedTextPreview({ content }) {
    const formattedHTML = useMemo(() => {
      let html = content;

      // Convert **bold** to <strong>bold</strong>
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Convert [text](url) to <a href="url">text</a>
      html = html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>'
      );

      // Convert line breaks to <br>
      html = html.replace(/\n/g, "<br>");

      return html;
    }, [content]);

    return (
      <div
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formattedHTML }}
      />
    );
  }
);

/**
 * TextBlockContent - Memoized text block editor
 * Phase 2A Performance: Extracted for better memoization and paste handling optimization
 * Rich Text Enhancement: Added bold and link formatting support
 */
interface TextBlockContentProps {
  block: TextBlock;
  blocks: ContentBlock[];
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

const TextBlockContent = React.memo<TextBlockContentProps>(
  function TextBlockContent({ block, blocks, onUpdate, onBlocksChange }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkText, setLinkText] = useState("");
    const [linkUrl, setLinkUrl] = useState("");

    // Get the content to display - always use rich formatted content if available
    const displayContent = useMemo(() => {
      if (block.richFormatting?.formattedContent) {
        return block.richFormatting.formattedContent;
      }
      return block.content || "";
    }, [block.content, block.richFormatting?.formattedContent]);

    // Auto-resize textarea based on content
    const autoResizeTextarea = useMemo(() => {
      return () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = "auto";

        // Set height based on scrollHeight, with min and max limits
        const minHeight = 120; // Minimum height in pixels
        const maxHeight = 400; // Maximum height in pixels
        const newHeight = Math.min(
          Math.max(textarea.scrollHeight, minHeight),
          maxHeight
        );

        textarea.style.height = `${newHeight}px`;
      };
    }, []);

    // Auto-resize on content change
    React.useEffect(() => {
      autoResizeTextarea();
    }, [displayContent, autoResizeTextarea]);

    // Auto-resize on initial mount
    React.useEffect(() => {
      autoResizeTextarea();
    }, [autoResizeTextarea]);

    // Ensure rich formatting is always enabled
    React.useEffect(() => {
      if (!block.richFormatting?.enabled) {
        onUpdate({
          richFormatting: {
            ...block.richFormatting,
            enabled: true,
            formattedContent: block.content || "",
          },
        } as Partial<TextBlock>);
      }
    }, [block.richFormatting?.enabled, block.content, onUpdate]);

    // Performance optimization: Memoize paste handler to prevent recreation on every render
    const handleTextPaste = useMemo(
      () => (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData("text");

        // Check if the pasted text contains ## headers
        const hasHeaders = /^##\s+.+$/gm.test(pastedText);

        if (hasHeaders) {
          e.preventDefault(); // Prevent normal paste

          // Split the pasted text by lines and process headers
          const lines = pastedText
            .split(/\n|\r\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          const newBlocks: (TextBlock | HeadingBlock)[] = [];
          let blockIndex = blocks.length;

          lines.forEach((line) => {
            const headerMatch = line.match(/^##\s+(.+)$/);

            if (headerMatch) {
              // Create heading block for ## headers
              const headingContent = headerMatch[1].trim();
              newBlocks.push({
                id: `heading-paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: "heading" as const,
                order: blockIndex,
                content: headingContent,
                level: 2,
                styles: {},
                metadata: {
                  sourceType: "paste",
                  importedAt: new Date().toISOString(),
                  originalMarkdown: line,
                },
              });
            } else if (line.length > 10) {
              // Create text block for regular content
              newBlocks.push({
                id: `text-paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: "text" as const,
                order: blockIndex,
                content: line,
                styles: {},
                metadata: {
                  sourceType: "paste",
                  importedAt: new Date().toISOString(),
                },
              });
            }
            blockIndex++;
          });

          if (newBlocks.length > 0) {
            // Insert new blocks after the current block
            const currentBlockIndex = blocks.findIndex(
              (b: ContentBlock) => b.id === block.id
            );
            const updatedBlocks = [
              ...blocks.slice(0, currentBlockIndex + 1),
              ...newBlocks,
              ...blocks.slice(currentBlockIndex + 1),
            ].map((b: ContentBlock, index: number) => ({ ...b, order: index }));

            onBlocksChange(updatedBlocks);
          }
        }
      },
      [blocks, block.id, onBlocksChange]
    );

    // Apply bold formatting to selected text
    const applyBoldFormatting = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = displayContent.substring(start, end);

      if (selectedText) {
        // Wrap selected text in bold markdown
        const beforeText = displayContent.substring(0, start);
        const afterText = displayContent.substring(end);
        const newContent = `${beforeText}**${selectedText}**${afterText}`;

        updateFormattedContent(newContent);

        // Restore cursor position
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, end + 4); // +4 for the ** **
        }, 0);
      }
    };

    // Apply italic formatting to selected text
    const applyItalicFormatting = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = displayContent.substring(start, end);

      if (selectedText) {
        // Wrap selected text in italic markdown
        const beforeText = displayContent.substring(0, start);
        const afterText = displayContent.substring(end);
        const newContent = `${beforeText}*${selectedText}*${afterText}`;

        updateFormattedContent(newContent);

        // Restore cursor position
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, end + 2); // +2 for the * *
        }, 0);
      }
    };

    // Insert link at cursor position
    const insertLink = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = displayContent.substring(start, end);

      // Pre-fill link text with selected text if any
      setLinkText(selectedText || "");
      setLinkUrl("");
      setShowLinkDialog(true);
    };

    // Handle link insertion
    const handleLinkInsert = () => {
      if (!linkText || !linkUrl) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const beforeText = displayContent.substring(0, start);
      const afterText = displayContent.substring(end);

      // Use markdown link format: [text](url)
      const linkMarkdown = `[${linkText}](${linkUrl})`;
      const newContent = `${beforeText}${linkMarkdown}${afterText}`;

      updateFormattedContent(newContent);
      setShowLinkDialog(false);
      setLinkText("");
      setLinkUrl("");

      // Restore focus and cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + linkMarkdown.length,
          start + linkMarkdown.length
        );
      }, 0);
    };

    // Update the formatted content (always in rich mode)
    const updateFormattedContent = (newContent: string) => {
      const hasLinks = /\[([^\]]+)\]\(([^)]+)\)/.test(newContent);
      const hasBold = /\*\*([^*]+)\*\*/.test(newContent);
      const hasItalic = /\*([^*]+)\*/.test(newContent);

      onUpdate({
        content: newContent, // Always update plain content too
        richFormatting: {
          ...block.richFormatting,
          enabled: true, // Always enabled
          formattedContent: newContent,
          hasLinks,
          hasBold,
          hasItalic,
        },
      } as Partial<TextBlock>);
    };

    // Handle content change (always in rich mode)
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateFormattedContent(e.target.value);
    };

    return (
      <div className="space-y-3">
        {/* Text Content Input with Formatting Controls */}
        <div className="flex items-start space-x-2">
          <textarea
            ref={textareaRef}
            id={`text-${block.id}`}
            className="flex-1 p-3 border border-border/40 rounded-md resize-none bg-transparent focus:border-border/60 focus:ring-1 focus:ring-ring transition-colors"
            placeholder="Enter your text content..."
            value={displayContent}
            onChange={handleContentChange}
            onPaste={handleTextPaste}
            style={{ minHeight: "120px", height: "auto" }}
          />

          {/* Formatting Controls */}
          <div className="flex flex-col space-y-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={applyBoldFormatting}
              className="h-8 w-8 p-0 hover:bg-muted/20"
              title="Bold (select text first)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={applyItalicFormatting}
              className="h-8 w-8 p-0 hover:bg-muted/20"
              title="Italic (select text first)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={insertLink}
              className="h-8 w-8 p-0 hover:bg-muted/20"
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted/20"
              title="Use **bold**, *italic*, or [link text](url) syntax"
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Link Dialog */}
        {showLinkDialog && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowLinkDialog(false)}
          >
            <div
              className="bg-background p-6 rounded-lg border shadow-lg max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="link-text" className="text-sm font-medium">
                    Link Text
                  </Label>
                  <Input
                    id="link-text"
                    placeholder="Enter link text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="link-url" className="text-sm font-medium">
                    Link URL
                  </Label>
                  <Input
                    id="link-url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLinkDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleLinkInsert}
                    disabled={!linkText || !linkUrl}
                  >
                    Insert Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

/**
 * ImageBlockContent - Memoized image block editor
 * Phase 2A Performance: Optimized image URL processing and rendering
 */
interface ImageBlockContentProps {
  block: ImageBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
}

const ImageBlockContent = React.memo<ImageBlockContentProps>(
  function ImageBlockContent({ block, onUpdate }) {
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Performance optimization: Memoize image URL validation and processing
    const imageUrlState = useMemo(() => {
      const url = block.imageUrl?.trim() || "";
      return {
        hasImageUrl: url !== "",
        imageUrl: url,
      };
    }, [block.imageUrl]);

    // Performance optimization: Memoize image error handler to prevent recreation
    const handleImageError = useMemo(
      () => (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        const parent = target.parentElement;
        if (parent) {
          parent.innerHTML = `
        <div class="w-full aspect-[16/9] bg-muted/20 border-2 border-dashed border-border/40 rounded-md flex items-center justify-center text-muted-foreground">
          <div class="text-center">
            <div class="text-2xl mb-2">🖼️</div>
            <div>Image failed to load</div>
            <div class="text-xs mt-1 break-all px-2">${imageUrlState.imageUrl}</div>
          </div>
        </div>
      `;
        }
      },
      [imageUrlState.imageUrl]
    );

    // Performance optimization: Memoize input change handlers
    const handleImageUrlChange = useMemo(
      () => (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ imageUrl: e.target.value } as Partial<ImageBlock>);
      },
      [onUpdate]
    );

    const handleAltTextChange = useMemo(
      () => (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ altText: e.target.value } as Partial<ImageBlock>);
      },
      [onUpdate]
    );

    return (
      <div className="space-y-3">
        {/* Image Display */}
        {imageUrlState.hasImageUrl ? (
          <div className="mb-4">
            <img
              src={imageUrlState.imageUrl}
              alt={block.altText || "Block image"}
              className="w-full aspect-[16/9] object-cover rounded-md border border-border/20"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div className="w-full aspect-[16/9] bg-muted/20 border-2 border-dashed border-border/40 rounded-md flex items-center justify-center text-muted-foreground mb-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🖼️</div>
              <div>No image URL provided</div>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Image Settings</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted/20"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Collapsible Image Settings */}
        {!isCollapsed && (
          <div className="space-y-3 pt-2">
            {/* Image URL Input */}
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
                value={block.imageUrl || ""}
                onChange={handleImageUrlChange}
                className="bg-transparent border-border/40 focus:border-border/60"
              />
            </div>

            {/* Alt Text Input */}
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
                value={block.altText || ""}
                onChange={handleAltTextChange}
                className="bg-transparent border-border/40 focus:border-border/60"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

/**
 * HeadingBlockContent - Memoized heading block editor
 * Phase 2A Performance: Optimized heading preview rendering and paste handling
 */
interface HeadingBlockContentProps {
  block: HeadingBlock;
  blocks: ContentBlock[];
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

const HeadingBlockContent = React.memo<HeadingBlockContentProps>(
  function HeadingBlockContent({ block, blocks, onUpdate, onBlocksChange }) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Performance optimization: Memoize heading preview class calculation
    const headingPreviewClass = useMemo(() => {
      const levelClassMap = {
        1: "text-3xl",
        2: "text-2xl",
        3: "text-xl",
        4: "text-lg",
        5: "text-base",
        6: "text-sm",
      };
      return `${levelClassMap[block.level] || "text-xl"} font-bold text-foreground`;
    }, [block.level]);

    // Get the content to display - always use rich formatted content if available
    const displayContent = useMemo(() => {
      if (block.richFormatting?.formattedContent) {
        return block.richFormatting.formattedContent;
      }
      return block.content || "";
    }, [block.content, block.richFormatting?.formattedContent]);

    // Auto-resize input based on content
    const autoResizeInput = useMemo(() => {
      return () => {
        const input = inputRef.current;
        if (!input) return;

        // Create a temporary element to measure text width
        const temp = document.createElement("span");
        temp.style.visibility = "hidden";
        temp.style.position = "absolute";
        temp.style.whiteSpace = "nowrap";
        temp.style.font = window.getComputedStyle(input).font;
        temp.textContent = input.value || input.placeholder;

        document.body.appendChild(temp);
        const textWidth = temp.offsetWidth;
        document.body.removeChild(temp);

        // Set width with some padding, min and max limits
        const minWidth = 200; // Minimum width in pixels
        const maxWidth = 600; // Maximum width in pixels
        const padding = 24; // Extra padding for comfortable editing
        const newWidth = Math.min(
          Math.max(textWidth + padding, minWidth),
          maxWidth
        );

        input.style.width = `${newWidth}px`;
      };
    }, []);

    // Auto-resize on content change
    React.useEffect(() => {
      autoResizeInput();
    }, [displayContent, autoResizeInput]);

    // Auto-resize on initial mount
    React.useEffect(() => {
      autoResizeInput();
    }, [autoResizeInput]);

    // Ensure rich formatting is always enabled for headings
    React.useEffect(() => {
      if (!block.richFormatting?.enabled) {
        onUpdate({
          richFormatting: {
            ...block.richFormatting,
            enabled: true,
            formattedContent: block.content || "",
          },
        } as Partial<HeadingBlock>);
      }
    }, [block.richFormatting?.enabled, block.content, onUpdate]);

    // Performance optimization: Memoize rich content formatting for preview
    const formattedPreviewContent = useMemo(() => {
      if (!displayContent) {
        return "Heading content...";
      }

      let html = displayContent;

      // Convert **bold** to <strong>bold</strong>
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Convert [text](url) to <a href="url">text</a>
      html = html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>'
      );

      return html;
    }, [displayContent]);

    // Update the formatted content (always in rich mode)
    const updateFormattedContent = (newContent: string) => {
      const hasLinks = /\[([^\]]+)\]\(([^)]+)\)/.test(newContent);
      const hasBold = /\*\*([^*]+)\*\*/.test(newContent);

      onUpdate({
        content: newContent, // Always update plain content too
        richFormatting: {
          ...block.richFormatting,
          enabled: true, // Always enabled
          formattedContent: newContent,
          hasLinks,
          hasBold,
        },
      } as Partial<HeadingBlock>);
    };

    // Performance optimization: Memoize heading paste handler
    const handleHeadingPaste = useMemo(
      () => (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData("text");

        // Check if the pasted text contains ## headers
        const hasHeaders = /^##\s+.+$/gm.test(pastedText);

        if (hasHeaders) {
          e.preventDefault(); // Prevent normal paste

          // Split the pasted text by lines and process headers
          const lines = pastedText
            .split(/\n|\r\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          const newBlocks: (TextBlock | HeadingBlock)[] = [];
          let blockIndex = blocks.length;

          // First, update the current heading with the first header content
          const firstHeaderMatch = lines[0]?.match(/^##\s+(.+)$/);
          if (firstHeaderMatch) {
            const content = firstHeaderMatch[1].trim();
            updateFormattedContent(content);
            lines.shift(); // Remove the first line as it's been used
          }

          // Process remaining lines
          lines.forEach((line) => {
            const headerMatch = line.match(/^##\s+(.+)$/);

            if (headerMatch) {
              // Create heading block for ## headers
              const headingContent = headerMatch[1].trim();
              newBlocks.push({
                id: `heading-paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: "heading" as const,
                order: blockIndex,
                content: headingContent,
                level: 2,
                styles: {},
                metadata: {
                  sourceType: "paste",
                  importedAt: new Date().toISOString(),
                  originalMarkdown: line,
                },
              });
            } else if (line.length > 10) {
              // Create text block for regular content
              newBlocks.push({
                id: `text-paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: "text" as const,
                order: blockIndex,
                content: line,
                styles: {},
                metadata: {
                  sourceType: "paste",
                  importedAt: new Date().toISOString(),
                },
              });
            }
            blockIndex++;
          });

          if (newBlocks.length > 0) {
            // Insert new blocks after the current block
            const currentBlockIndex = blocks.findIndex(
              (b: ContentBlock) => b.id === block.id
            );
            const updatedBlocks = [
              ...blocks.slice(0, currentBlockIndex + 1),
              ...newBlocks,
              ...blocks.slice(currentBlockIndex + 1),
            ].map((b: ContentBlock, index: number) => ({ ...b, order: index }));

            onBlocksChange(updatedBlocks);
          }
        }
      },
      [blocks, block.id, onBlocksChange, updateFormattedContent]
    );

    // Performance optimization: Memoize input change handlers
    const handleContentChange = useMemo(
      () => (e: React.ChangeEvent<HTMLInputElement>) => {
        updateFormattedContent(e.target.value);
        // Trigger auto-resize after content change
        setTimeout(autoResizeInput, 0);
      },
      [updateFormattedContent, autoResizeInput]
    );

    const handleLevelChange = useMemo(
      () => (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate({
          level: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
        } as Partial<HeadingBlock>);
      },
      [onUpdate]
    );

    const hasFormattedContent =
      displayContent && formattedPreviewContent !== displayContent;

    return (
      <div className="space-y-3">
        {/* Heading Content Input with Level Selector */}
        <div className="flex items-center space-x-2">
          <Input
            id={`heading-${block.id}`}
            placeholder="Enter heading text..."
            value={displayContent}
            onChange={handleContentChange}
            onPaste={handleHeadingPaste}
            className="bg-transparent border-border/40 focus:border-border/60 min-w-0"
            ref={inputRef}
            style={{ width: "200px" }} // Initial width, will be overridden by auto-resize
          />
          <select
            id={`heading-level-${block.id}`}
            value={block.level}
            onChange={handleLevelChange}
            className="px-3 py-2 border border-border/40 rounded-md bg-transparent focus:border-border/60 focus:ring-1 focus:ring-ring transition-colors text-sm min-w-16"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
            <option value={4}>H4</option>
            <option value={5}>H5</option>
            <option value={6}>H6</option>
          </select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted/20"
            title="Use **bold** for bold text and [link text](url) for links"
          >
            <Info className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    );
  }
);

/**
 * DividerBlockContent - Memoized divider block editor
 * Phase 2A Performance: Extracted for consistent memoization
 */
interface DividerBlockContentProps {
  block: DividerBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
}

const DividerBlockContent = React.memo<DividerBlockContentProps>(
  function DividerBlockContent({ block, onUpdate }) {
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Performance optimization: Memoize change handlers
    const handleThicknessChange = useMemo(
      () => (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ thickness: e.target.value } as Partial<DividerBlock>);
      },
      [onUpdate]
    );

    const handleColorChange = useMemo(
      () => (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ color: e.target.value } as Partial<DividerBlock>);
      },
      [onUpdate]
    );

    const handleMarginChange = useMemo(
      () => (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ margin: e.target.value } as Partial<DividerBlock>);
      },
      [onUpdate]
    );

    return (
      <div className="space-y-3">
        {/* Divider Preview with Toggle Button */}
        <div className="mb-3 relative">
          <div className="mt-1 p-3 bg-muted/10 rounded-md border border-border/20">
            <hr
              style={{
                border: "0",
                height: block.thickness || "1px",
                backgroundColor: block.color || "#dddddd",
                margin: `${block.margin || "20px"} 0`,
                width: "100%",
              }}
            />
          </div>

          {/* Toggle Button positioned on the right */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-muted/20 bg-background/80 backdrop-blur-sm border border-border/20"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Collapsible Divider Settings */}
        {!isCollapsed && (
          <div className="pt-2">
            {/* Single Line Controls */}
            <div className="flex items-center space-x-3">
              {/* Thickness Input */}
              <div className="flex-1">
                <Input
                  id={`divider-thickness-${block.id}`}
                  placeholder="1px"
                  value={block.thickness || "1px"}
                  onChange={handleThicknessChange}
                  className="bg-transparent border-border/40 focus:border-border/60 text-sm"
                />
              </div>

              {/* Color Picker */}
              <div className="flex items-center space-x-1">
                <Input
                  id={`divider-color-${block.id}`}
                  type="color"
                  value={block.color || "#dddddd"}
                  onChange={handleColorChange}
                  className="w-10 h-8 p-0 border-border/40 focus:border-border/60 cursor-pointer"
                />
                <Input
                  placeholder="#dddddd"
                  value={block.color || "#dddddd"}
                  onChange={handleColorChange}
                  className="w-20 bg-transparent border-border/40 focus:border-border/60 text-sm"
                />
              </div>

              {/* Margin Input */}
              <div className="flex-1">
                <Input
                  id={`divider-margin-${block.id}`}
                  placeholder="20px"
                  value={block.margin || "20px"}
                  onChange={handleMarginChange}
                  className="bg-transparent border-border/40 focus:border-border/60 text-sm"
                />
              </div>
            </div>

            {/* Compact Hints */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
              <span>Thickness</span>
              <span>Color</span>
              <span>Spacing</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

/**
 * DefaultBlockContent - Memoized default block content renderer
 * Phase 2A Performance: Extracted for consistent memoization
 */
interface DefaultBlockContentProps {
  block: ContentBlock;
}

const DefaultBlockContent = React.memo<DefaultBlockContentProps>(
  function DefaultBlockContent({ block }) {
    return (
      <div className="text-sm text-muted-foreground bg-muted/10 rounded-md p-3 border border-border/20">
        {block.type} blocks are managed automatically
      </div>
    );
  }
);

export { BlockContent };
