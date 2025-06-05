"use client";

import React, { useMemo, useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bold, Link, Type } from "lucide-react";
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
 * Rich Text Enhancement: Added bold and link formatting support
 */
interface BlockContentProps {
  block: ContentBlock;
  blocks: ContentBlock[];
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

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
});

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

      onUpdate({
        content: newContent, // Always update plain content too
        richFormatting: {
          ...block.richFormatting,
          enabled: true, // Always enabled
          formattedContent: newContent,
          hasLinks,
          hasBold,
        },
      } as Partial<TextBlock>);
    };

    // Handle content change (always in rich mode)
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateFormattedContent(e.target.value);
    };

    return (
      <div className="space-y-3">
        {/* Content Label */}
        <Label htmlFor={`text-${block.id}`} className="text-sm font-medium">
          Content
        </Label>

        {/* Formatting Toolbar - always visible */}
        <div className="flex items-center space-x-2 p-2 bg-muted/10 rounded-md border border-border/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={applyBoldFormatting}
            className="h-8 w-8 p-0"
            title="Bold (select text first)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertLink}
            className="h-8 w-8 p-0"
            title="Insert Link"
          >
            <Link className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            Use **bold** or [link text](url) syntax
          </span>
        </div>

        {/* Text Content Input */}
        <div>
          <textarea
            ref={textareaRef}
            id={`text-${block.id}`}
            className="w-full min-h-[100px] p-3 border border-border/40 rounded-md resize-vertical bg-transparent focus:border-border/60 focus:ring-1 focus:ring-ring transition-colors"
            placeholder="Enter your text content... Use **bold** for bold text and [link text](url) for links"
            value={displayContent}
            onChange={handleContentChange}
            onPaste={handleTextPaste}
          />
        </div>

        {/* Rich formatting preview - always show when there's content */}
        {displayContent && (
          <div className="mt-2">
            <Label className="text-sm font-medium mb-1 block">Preview</Label>
            <div className="p-3 bg-muted/10 rounded-md border border-border/20 text-sm">
              <FormattedTextPreview content={displayContent} />
            </div>
          </div>
        )}

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
      },
      [updateFormattedContent]
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
        {/* Heading Preview */}
        <div className="mb-3">
          <Label className="text-sm font-medium mb-1 block">Preview</Label>
          <div className="mt-1 p-3 bg-muted/10 rounded-md border border-border/20">
            {React.createElement(
              `h${block.level}`,
              {
                className: headingPreviewClass,
                ...(hasFormattedContent
                  ? {
                      dangerouslySetInnerHTML: {
                        __html: formattedPreviewContent,
                      },
                    }
                  : {}),
              },
              hasFormattedContent
                ? undefined
                : displayContent || "Heading content..."
            )}
          </div>
        </div>

        {/* Formatting Hint */}
        <div className="text-xs text-muted-foreground bg-muted/10 p-2 rounded border border-border/20">
          💡 Use **bold** for bold text and [link text](url) for links in
          headings
        </div>

        {/* Heading Content Input */}
        <div>
          <Label
            htmlFor={`heading-${block.id}`}
            className="text-sm font-medium"
          >
            Heading Text
          </Label>
          <Input
            id={`heading-${block.id}`}
            placeholder="Enter heading text... Use **bold** and [link](url) syntax"
            value={displayContent}
            onChange={handleContentChange}
            onPaste={handleHeadingPaste}
            className="bg-transparent border-border/40 focus:border-border/60"
          />
        </div>

        {/* Heading Level Selector */}
        <div>
          <Label
            htmlFor={`heading-level-${block.id}`}
            className="text-sm font-medium"
          >
            Heading Level
          </Label>
          <select
            id={`heading-level-${block.id}`}
            value={block.level}
            onChange={handleLevelChange}
            className="w-full mt-1 p-2 border border-border/40 rounded-md bg-transparent focus:border-border/60 focus:ring-1 focus:ring-ring transition-colors"
          >
            <option value={1}>H1 - Main Title</option>
            <option value={2}>H2 - Section Header</option>
            <option value={3}>H3 - Subsection</option>
            <option value={4}>H4 - Minor Heading</option>
            <option value={5}>H5 - Small Heading</option>
            <option value={6}>H6 - Smallest Heading</option>
          </select>
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
        {/* Divider Preview */}
        <div className="mb-3">
          <Label className="text-sm font-medium mb-1 block">Preview</Label>
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
        </div>

        {/* Thickness Input */}
        <div>
          <Label
            htmlFor={`divider-thickness-${block.id}`}
            className="text-sm font-medium"
          >
            Thickness
          </Label>
          <Input
            id={`divider-thickness-${block.id}`}
            placeholder="1px"
            value={block.thickness || "1px"}
            onChange={handleThicknessChange}
            className="bg-transparent border-border/40 focus:border-border/60"
          />
          <div className="text-xs text-muted-foreground mt-1">
            e.g., 1px, 2px, 3px
          </div>
        </div>

        {/* Color Input */}
        <div>
          <Label
            htmlFor={`divider-color-${block.id}`}
            className="text-sm font-medium"
          >
            Color
          </Label>
          <div className="flex gap-2">
            <Input
              id={`divider-color-${block.id}`}
              type="color"
              value={block.color || "#dddddd"}
              onChange={handleColorChange}
              className="w-16 h-8 p-0 border-border/40 focus:border-border/60"
            />
            <Input
              placeholder="#dddddd"
              value={block.color || "#dddddd"}
              onChange={handleColorChange}
              className="flex-1 bg-transparent border-border/40 focus:border-border/60"
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Click color picker or enter hex code
          </div>
        </div>

        {/* Margin Input */}
        <div>
          <Label
            htmlFor={`divider-margin-${block.id}`}
            className="text-sm font-medium"
          >
            Spacing (Top/Bottom)
          </Label>
          <Input
            id={`divider-margin-${block.id}`}
            placeholder="20px"
            value={block.margin || "20px"}
            onChange={handleMarginChange}
            className="bg-transparent border-border/40 focus:border-border/60"
          />
          <div className="text-xs text-muted-foreground mt-1">
            e.g., 10px, 20px, 30px
          </div>
        </div>
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
