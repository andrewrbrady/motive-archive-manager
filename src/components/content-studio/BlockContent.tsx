"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { stripInlineStyles } from "@/lib/content-formatter";
import {
  ContentBlock,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  VideoBlock,
  DividerBlock,
  FrontmatterBlock,
  ListBlock, // Import ListBlock
  HTMLBlock, // Import HTMLBlock
} from "./types";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";

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
  // Frontmatter conversion
  onConvertTextToFrontmatter?: (textBlockId: string) => void;
  detectFrontmatterInTextBlock?: (textBlock: TextBlock) => any;
  // Context for AI generation
  carId?: string;
  projectId?: string;
}

// Custom comparison function for React.memo to prevent unnecessary re-renders
const areBlockContentPropsEqual = (
  prevProps: BlockContentProps,
  nextProps: BlockContentProps
) => {
  if (prevProps.block.type !== nextProps.block.type) return false;

  switch (prevProps.block.type) {
    case "text": {
      const prevText = prevProps.block as TextBlock;
      const nextText = nextProps.block as TextBlock;
      return (
        prevText.content === nextText.content &&
        prevText.element === nextText.element &&
        JSON.stringify(prevText.styles) === JSON.stringify(nextText.styles)
      );
    }
    case "image": {
      const prevImage = prevProps.block as ImageBlock;
      const nextImage = nextProps.block as ImageBlock;
      return (
        prevImage.imageUrl === nextImage.imageUrl &&
        prevImage.altText === nextImage.altText &&
        prevImage.width === nextImage.width &&
        prevImage.alignment === nextImage.alignment &&
        prevImage.caption === nextImage.caption &&
        prevImage.linkUrl === nextImage.linkUrl &&
        prevImage.linkTarget === nextImage.linkTarget &&
        JSON.stringify(prevImage.styles) === JSON.stringify(nextImage.styles)
      );
    }
    case "video": {
      const prevVideo = prevProps.block as VideoBlock;
      const nextVideo = nextProps.block as VideoBlock;
      return (
        prevVideo.url === nextVideo.url &&
        prevVideo.platform === nextVideo.platform &&
        prevVideo.embedId === nextVideo.embedId &&
        prevVideo.aspectRatio === nextVideo.aspectRatio &&
        prevVideo.alignment === nextVideo.alignment &&
        JSON.stringify(prevVideo.styles) === JSON.stringify(nextVideo.styles)
      );
    }
    case "divider": {
      const prevDivider = prevProps.block as DividerBlock;
      const nextDivider = nextProps.block as DividerBlock;
      return (
        prevDivider.thickness === nextDivider.thickness &&
        prevDivider.color === nextDivider.color &&
        prevDivider.margin === nextDivider.margin &&
        JSON.stringify(prevDivider.styles) ===
          JSON.stringify(nextDivider.styles)
      );
    }
    case "frontmatter": {
      const prevFrontmatter = prevProps.block as FrontmatterBlock;
      const nextFrontmatter = nextProps.block as FrontmatterBlock;
      return (
        JSON.stringify(prevFrontmatter.data) ===
          JSON.stringify(nextFrontmatter.data) &&
        JSON.stringify(prevFrontmatter.styles) ===
          JSON.stringify(nextFrontmatter.styles)
      );
    }
    case "list": {
      const prevList = prevProps.block as ListBlock;
      const nextList = nextProps.block as ListBlock;
      return (
        prevList.style === nextList.style &&
        JSON.stringify(prevList.items) === JSON.stringify(nextList.items) &&
        JSON.stringify(prevList.styles) === JSON.stringify(nextList.styles)
      );
    }
    case "html": {
      const prevHtml = prevProps.block as HTMLBlock;
      const nextHtml = nextProps.block as HTMLBlock;
      return (
        prevHtml.content === nextHtml.content &&
        prevHtml.description === nextHtml.description &&
        JSON.stringify(prevHtml.styles) === JSON.stringify(nextHtml.styles)
      );
    }
    default:
      return false;
  }
};

const BlockContent = React.memo<BlockContentProps>(function BlockContent({
  block,
  blocks,
  onUpdate,
  onBlocksChange,
  onConvertTextToFrontmatter,
  detectFrontmatterInTextBlock,
  carId,
  projectId,
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
          onConvertTextToFrontmatter={onConvertTextToFrontmatter}
          detectFrontmatterInTextBlock={detectFrontmatterInTextBlock}
        />
      );
    case "image":
      return (
        <ImageBlockContent
          block={block as ImageBlock}
          onUpdate={onUpdate}
          carId={carId}
          projectId={projectId}
        />
      );
    case "video":
      return (
        <VideoBlockContent block={block as VideoBlock} onUpdate={onUpdate} />
      );
    case "divider":
      return (
        <DividerBlockContent
          block={block as DividerBlock}
          onUpdate={onUpdate}
        />
      );
    case "frontmatter":
      return (
        <FrontmatterBlockContent
          block={block as FrontmatterBlock}
          onUpdate={onUpdate}
        />
      );
    case "list":
      return (
        <ListBlockContent block={block as ListBlock} onUpdate={onUpdate} />
      );
    case "html":
      return (
        <HTMLBlockContent block={block as HTMLBlock} onUpdate={onUpdate} />
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
      let html = content || "";

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
  // Frontmatter conversion
  onConvertTextToFrontmatter?: (textBlockId: string) => void;
  detectFrontmatterInTextBlock?: (textBlock: TextBlock) => any;
}

const TextBlockContent = React.memo<TextBlockContentProps>(
  function TextBlockContent({
    block,
    blocks,
    onUpdate,
    onBlocksChange,
    onConvertTextToFrontmatter,
    detectFrontmatterInTextBlock,
  }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkText, setLinkText] = useState("");
    const [linkUrl, setLinkUrl] = useState("");

    // Handle Escape key to close modal
    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape" && showLinkDialog) {
          setShowLinkDialog(false);
        }
      };

      if (showLinkDialog) {
        document.addEventListener("keydown", handleEscape);
        // Prevent body scroll when modal is open
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        // Restore body scroll
        document.body.style.overflow = "unset";
      };
    }, [showLinkDialog]);

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
          const newBlocks: TextBlock[] = [];
          let blockIndex = blocks.length;

          lines.forEach((line) => {
            const headerMatch = line.match(/^##\s+(.+)$/);

            if (headerMatch) {
              // Create text block with h2 element for ## headers
              const headingContent = headerMatch[1].trim();
              newBlocks.push({
                id: `text-paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: "text" as const,
                order: blockIndex,
                content: headingContent,
                element: "h2",
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
                element: "p",
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

    // Handle Enter key in modal inputs
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && linkText && linkUrl) {
        event.preventDefault();
        handleLinkInsert();
      }
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
        {/* Frontmatter Detection and Conversion */}
        {detectFrontmatterInTextBlock &&
          onConvertTextToFrontmatter &&
          (() => {
            const frontmatterInfo = detectFrontmatterInTextBlock(block);
            return frontmatterInfo ? (
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        YAML Frontmatter Detected
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                      This text block contains YAML frontmatter that can be
                      converted to a structured metadata block for better
                      editing.
                    </p>
                    {frontmatterInfo.frontmatterData && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                        <strong>Detected fields:</strong>{" "}
                        {Object.keys(frontmatterInfo.frontmatterData).join(
                          ", "
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => onConvertTextToFrontmatter(block.id)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                  >
                    Convert to Metadata Block
                  </Button>
                </div>
              </div>
            ) : null;
          })()}

        {/* Element Type Selector */}
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium text-muted-foreground">
            Element:
          </Label>
          <select
            value={block.element || "p"}
            onChange={(e) =>
              onUpdate({ element: e.target.value as TextBlock["element"] })
            }
            className="px-3 py-1 border border-border/40 rounded-md bg-transparent focus:border-border/60 focus:ring-1 focus:ring-ring transition-colors text-sm"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="h5">Heading 5</option>
            <option value="h6">Heading 6</option>
          </select>
        </div>

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

        {/* Link Dialog - Using React portal to render outside parent containers to avoid stacking context issues */}
        {showLinkDialog &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center"
              style={{ zIndex: 9999 }}
              onClick={() => setShowLinkDialog(false)}
            >
              <div
                className="bg-background p-6 rounded-lg border shadow-lg max-w-md w-full mx-4 relative"
                style={{ zIndex: 10000 }}
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
                      onKeyDown={handleKeyDown}
                      className="mt-1"
                      autoFocus
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
                      onKeyDown={handleKeyDown}
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
            </div>,
            document.body
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
  carId?: string;
  projectId?: string;
}

const ImageBlockContent = React.memo<ImageBlockContentProps>(
  function ImageBlockContent({ block, onUpdate, carId, projectId }) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isGeneratingAlt, setIsGeneratingAlt] = useState(false);
    const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
    const [customContextAlt, setCustomContextAlt] = useState("");
    const [customContextCaption, setCustomContextCaption] = useState("");
    const { toast } = useToast();

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

    // AI Generation handlers
    const handleGenerateAltText = useCallback(async () => {
      if (!block.imageUrl || isGeneratingAlt) return;

      setIsGeneratingAlt(true);
      try {
        // Try to extract context from the image URL or block metadata
        const imageData = {
          imageUrl: block.imageUrl,
          imageId:
            block.metadata?.originalImageObject?.id || block.metadata?.id,
          metadata: block.metadata || {},
          analysisType: "alt",
          carId,
          projectId,
          customContext: customContextAlt.trim() || undefined,
        };

        const response = (await api.post("ai/analyze-image", imageData)) as any;

        if (response.success && response.altText) {
          onUpdate({ altText: response.altText } as Partial<ImageBlock>);
          toast({
            title: "Alt text generated",
            description: "AI-generated alt text has been applied to the image.",
          });
        } else {
          throw new Error("Failed to generate alt text");
        }
      } catch (error) {
        console.error("Error generating alt text:", error);
        toast({
          title: "Generation failed",
          description: "Failed to generate alt text. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingAlt(false);
      }
    }, [
      block.imageUrl,
      block.metadata,
      isGeneratingAlt,
      onUpdate,
      toast,
      customContextAlt,
      carId,
      projectId,
    ]);

    const handleGenerateCaption = useCallback(async () => {
      if (!block.imageUrl || isGeneratingCaption) return;

      setIsGeneratingCaption(true);
      try {
        // Try to extract context from the image URL or block metadata
        const imageData = {
          imageUrl: block.imageUrl,
          imageId:
            block.metadata?.originalImageObject?.id || block.metadata?.id,
          metadata: block.metadata || {},
          analysisType: "caption",
          carId,
          projectId,
          customContext: customContextCaption.trim() || undefined,
        };

        const response = (await api.post("ai/analyze-image", imageData)) as any;

        if (response.success && response.caption) {
          onUpdate({ caption: response.caption } as Partial<ImageBlock>);
          toast({
            title: "Caption generated",
            description: "AI-generated caption has been applied to the image.",
          });
        } else {
          throw new Error("Failed to generate caption");
        }
      } catch (error) {
        console.error("Error generating caption:", error);
        toast({
          title: "Generation failed",
          description: "Failed to generate caption. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingCaption(false);
      }
    }, [
      block.imageUrl,
      block.metadata,
      isGeneratingCaption,
      onUpdate,
      toast,
      customContextCaption,
      carId,
      projectId,
    ]);

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
              <div className="flex gap-2">
                <Input
                  id={`image-alt-${block.id}`}
                  placeholder="Describe the image..."
                  value={block.altText || ""}
                  onChange={handleAltTextChange}
                  className="bg-transparent border-border/40 focus:border-border/60 flex-1"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateAltText}
                        disabled={!block.imageUrl || isGeneratingAlt}
                        className="px-3 py-1 h-9"
                      >
                        {isGeneratingAlt ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      className="w-80 p-3 z-[9999]"
                      side="left"
                      align="start"
                      sideOffset={5}
                      avoidCollisions={true}
                      sticky="always"
                    >
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Generate Alt Text with AI
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Add custom context to help the AI generate better alt
                          text
                        </p>
                        <Input
                          placeholder="e.g., front view, driver side, interior shot..."
                          value={customContextAlt}
                          onChange={(e) => setCustomContextAlt(e.target.value)}
                          className="text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleGenerateAltText();
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Press Enter to generate or click the button
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Caption Input */}
            <div>
              <Label
                htmlFor={`image-caption-${block.id}`}
                className="text-sm font-medium"
              >
                Caption (optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`image-caption-${block.id}`}
                  placeholder="Add a caption..."
                  value={block.caption || ""}
                  onChange={(e) =>
                    onUpdate({ caption: e.target.value } as Partial<ImageBlock>)
                  }
                  className="bg-transparent border-border/40 focus:border-border/60 flex-1"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateCaption}
                        disabled={!block.imageUrl || isGeneratingCaption}
                        className="px-3 py-1 h-9"
                      >
                        {isGeneratingCaption ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      className="w-80 p-3 z-[9999]"
                      side="left"
                      align="start"
                      sideOffset={5}
                      avoidCollisions={true}
                      sticky="always"
                    >
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Generate Caption with AI
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Add custom context to help the AI generate better
                          captions
                        </p>
                        <Input
                          placeholder="e.g., highlight the wheels, focus on engine details..."
                          value={customContextCaption}
                          onChange={(e) =>
                            setCustomContextCaption(e.target.value)
                          }
                          className="text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleGenerateCaption();
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Press Enter to generate or click the button
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Link URL Input */}
            <div>
              <Label
                htmlFor={`image-link-${block.id}`}
                className="text-sm font-medium"
              >
                Link URL (optional)
              </Label>
              <Input
                id={`image-link-${block.id}`}
                placeholder="https://example.com"
                value={block.linkUrl || ""}
                onChange={(e) =>
                  onUpdate({ linkUrl: e.target.value } as Partial<ImageBlock>)
                }
                className="bg-transparent border-border/40 focus:border-border/60"
              />
            </div>

            {/* Link Target Checkbox */}
            {block.linkUrl && (
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Open in new tab</Label>
                  <p className="text-xs text-muted-foreground">
                    Opens link in a new window/tab
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`link-target-${block.id}`}
                    checked={block.linkTarget === "_blank"}
                    onChange={(e) =>
                      onUpdate({
                        linkTarget: e.target.checked ? "_blank" : "_self",
                      } as Partial<ImageBlock>)
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Email Settings Section */}
            <div className="border-t border-border/20 pt-3 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  📧 Email Settings
                </span>
                <span className="text-xs text-muted-foreground bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  Fluid-Hybrid
                </span>
              </div>

              {/* Full Width Toggle */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-medium">
                    Full-Width Email Header
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Edge-to-edge in modern clients, centered in Outlook
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`full-width-${block.id}`}
                    checked={block.email?.isFullWidth || false}
                    onChange={(e) =>
                      onUpdate({
                        email: {
                          ...block.email,
                          isFullWidth: e.target.checked,
                        },
                      } as Partial<ImageBlock>)
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Email-specific controls - only show when full-width is enabled */}
              {block.email?.isFullWidth && (
                <div className="space-y-3 pt-3 border-t border-border/20">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Outlook Width */}
                    <div>
                      <Label
                        htmlFor={`outlook-width-${block.id}`}
                        className="text-sm font-medium"
                      >
                        Outlook Width
                      </Label>
                      <Input
                        id={`outlook-width-${block.id}`}
                        placeholder="600"
                        value={block.email?.outlookWidth || "600"}
                        onChange={(e) =>
                          onUpdate({
                            email: {
                              ...block.email,
                              outlookWidth: e.target.value,
                            },
                          } as Partial<ImageBlock>)
                        }
                        className="bg-transparent border-border/40 focus:border-border/60 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Fixed width for Outlook desktop (px)
                      </p>
                    </div>

                    {/* Max Width */}
                    <div>
                      <Label
                        htmlFor={`max-width-${block.id}`}
                        className="text-sm font-medium"
                      >
                        Max Width
                      </Label>
                      <Input
                        id={`max-width-${block.id}`}
                        placeholder="1200"
                        value={block.email?.maxWidth || "1200"}
                        onChange={(e) =>
                          onUpdate({
                            email: {
                              ...block.email,
                              maxWidth: e.target.value,
                            },
                          } as Partial<ImageBlock>)
                        }
                        className="bg-transparent border-border/40 focus:border-border/60 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Max width for modern clients (px)
                      </p>
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <Label
                      htmlFor={`bg-color-${block.id}`}
                      className="text-sm font-medium"
                    >
                      Background Color
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`bg-color-${block.id}`}
                        type="color"
                        value={block.email?.backgroundColor || "#111111"}
                        onChange={(e) =>
                          onUpdate({
                            email: {
                              ...block.email,
                              backgroundColor: e.target.value,
                            },
                          } as Partial<ImageBlock>)
                        }
                        className="w-12 h-8 p-1 border-border/40 rounded cursor-pointer"
                      />
                      <Input
                        placeholder="#111111"
                        value={block.email?.backgroundColor || "#111111"}
                        onChange={(e) =>
                          onUpdate({
                            email: {
                              ...block.email,
                              backgroundColor: e.target.value,
                            },
                          } as Partial<ImageBlock>)
                        }
                        className="bg-transparent border-border/40 focus:border-border/60 text-sm flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Background color for full-width section
                    </p>
                  </div>

                  {/* Desktop and Mobile Heights */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Desktop Height */}
                    <div>
                      <Label
                        htmlFor={`min-height-${block.id}`}
                        className="text-sm font-medium"
                      >
                        Desktop Height
                      </Label>
                      <Input
                        id={`min-height-${block.id}`}
                        placeholder="300"
                        value={block.email?.minHeight || "300"}
                        onChange={(e) =>
                          onUpdate({
                            email: {
                              ...block.email,
                              minHeight: e.target.value,
                            },
                          } as Partial<ImageBlock>)
                        }
                        className="bg-transparent border-border/40 focus:border-border/60 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Height in pixels for desktop
                      </p>
                    </div>

                    {/* Mobile Height */}
                    <div>
                      <Label
                        htmlFor={`mobile-height-${block.id}`}
                        className="text-sm font-medium"
                      >
                        Mobile Min Height
                      </Label>
                      <Input
                        id={`mobile-height-${block.id}`}
                        placeholder="100"
                        value={block.email?.mobileMinHeight || "100"}
                        onChange={(e) =>
                          onUpdate({
                            email: {
                              ...block.email,
                              mobileMinHeight: e.target.value,
                            },
                          } as Partial<ImageBlock>)
                        }
                        className="bg-transparent border-border/40 focus:border-border/60 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Min height, crops sides on mobile
                      </p>
                    </div>
                  </div>

                  {/* Center Crop Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">
                        Full-Width Crop
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Show image at full width with fixed height and center
                        cropping
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`center-crop-${block.id}`}
                        checked={block.email?.useCenterCrop || false}
                        onChange={(e) =>
                          onUpdate({
                            email: {
                              ...block.email,
                              useCenterCrop: e.target.checked,
                            },
                          } as Partial<ImageBlock>)
                        }
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Email Pattern Info */}
                  <div className="border-t border-border/20 pt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">
                      ✨ Fluid-Hybrid Pattern
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This creates an edge-to-edge header that expands to full
                      device width in Gmail, Apple Mail, and mobile clients,
                      while showing a centered{" "}
                      {block.email?.outlookWidth || "600"}px version in Outlook
                      desktop.
                    </p>
                    {block.email?.useCenterCrop && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Full-Width Crop:</strong> Desktop shows{" "}
                        {block.email?.minHeight || "300"}px height with center
                        crop. Mobile shows natural height (min{" "}
                        {block.email?.mobileMinHeight || "100"}px) and crops
                        sides.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

/**
 * VideoBlockContent - Memoized video block editor
 * Handles YouTube and Vimeo URLs with automatic platform detection and embed ID extraction
 */
interface VideoBlockContentProps {
  block: VideoBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
}

const VideoBlockContent = React.memo<VideoBlockContentProps>(
  function VideoBlockContent({ block, onUpdate }) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [urlInput, setUrlInput] = useState(block.url || "");

    // Helper function to extract video ID and platform from URL
    const parseVideoUrl = (
      url: string
    ): { platform: "youtube" | "vimeo"; embedId: string } | null => {
      // YouTube URL patterns
      const youtubePatterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      ];

      // Vimeo URL patterns
      const vimeoPatterns = [
        /vimeo\.com\/([0-9]+)/,
        /vimeo\.com\/video\/([0-9]+)/,
      ];

      // Check YouTube patterns
      for (const pattern of youtubePatterns) {
        const match = url.match(pattern);
        if (match) {
          return { platform: "youtube", embedId: match[1] };
        }
      }

      // Check Vimeo patterns
      for (const pattern of vimeoPatterns) {
        const match = url.match(pattern);
        if (match) {
          return { platform: "vimeo", embedId: match[1] };
        }
      }

      return null;
    };

    // Handle URL input changes
    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newUrl = e.target.value;
      setUrlInput(newUrl);

      if (newUrl.trim()) {
        const parsed = parseVideoUrl(newUrl);
        if (parsed) {
          onUpdate({
            url: newUrl,
            platform: parsed.platform,
            embedId: parsed.embedId,
          } as Partial<VideoBlock>);
        } else {
          onUpdate({ url: newUrl } as Partial<VideoBlock>);
        }
      } else {
        onUpdate({ url: "" } as Partial<VideoBlock>);
      }
    };

    // Handle aspect ratio changes
    const handleAspectRatioChange = (aspectRatio: "16:9" | "4:3" | "1:1") => {
      onUpdate({ aspectRatio } as Partial<VideoBlock>);
    };

    // Handle alignment changes
    const handleAlignmentChange = (alignment: "left" | "center" | "right") => {
      onUpdate({ alignment } as Partial<VideoBlock>);
    };

    // Handle title changes
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ title: e.target.value } as Partial<VideoBlock>);
    };

    // Generate embed URL for preview
    const getEmbedUrl = () => {
      if (!block.embedId || !block.platform) return "";

      if (block.platform === "youtube") {
        return `https://www.youtube.com/embed/${block.embedId}`;
      } else if (block.platform === "vimeo") {
        return `https://player.vimeo.com/video/${block.embedId}`;
      }
      return "";
    };

    const embedUrl = getEmbedUrl();

    return (
      <div className="space-y-3">
        {/* Video Preview/Input */}
        <div className="mb-3 relative">
          {embedUrl ? (
            <div className="relative">
              <div
                className={`relative w-full ${
                  block.aspectRatio === "16:9"
                    ? "aspect-video"
                    : block.aspectRatio === "4:3"
                      ? "aspect-[4/3]"
                      : "aspect-square"
                }`}
                style={{
                  textAlign: block.alignment || "center",
                }}
              >
                <iframe
                  src={embedUrl}
                  title={block.title || "Video"}
                  className="w-full h-full rounded-md border border-border/20"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {block.title && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {block.title}
                </p>
              )}
            </div>
          ) : (
            <div className="p-8 bg-muted/10 rounded-md border border-border/20 border-dashed text-center">
              <div className="text-muted-foreground">
                <p className="text-sm mb-2">Enter a YouTube or Vimeo URL</p>
                <p className="text-xs text-muted-foreground/70">
                  Supported formats: youtube.com/watch?v=..., youtu.be/...,
                  vimeo.com/...
                </p>
              </div>
            </div>
          )}

          {/* Toggle Button */}
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

        {/* Video URL Input */}
        <div>
          <Label
            htmlFor={`video-url-${block.id}`}
            className="text-sm font-medium"
          >
            Video URL
          </Label>
          <Input
            id={`video-url-${block.id}`}
            type="url"
            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            value={urlInput}
            onChange={handleUrlChange}
            className="mt-1 bg-background border-border/40 focus:border-border/60"
          />
          {block.url && !block.embedId && (
            <p className="text-xs text-red-600 mt-1">
              Unable to parse video URL. Please check the format.
            </p>
          )}
          {block.platform && block.embedId && (
            <p className="text-xs text-green-600 mt-1">
              ✓ {block.platform === "youtube" ? "YouTube" : "Vimeo"} video
              detected
            </p>
          )}
        </div>

        {/* Collapsible Video Settings */}
        {!isCollapsed && (
          <div className="pt-2 space-y-4">
            {/* Title Input */}
            <div>
              <Label
                htmlFor={`video-title-${block.id}`}
                className="text-sm font-medium"
              >
                Video Title (Optional)
              </Label>
              <Input
                id={`video-title-${block.id}`}
                placeholder="Enter video title..."
                value={block.title || ""}
                onChange={handleTitleChange}
                className="mt-1 bg-background border-border/40 focus:border-border/60"
              />
            </div>

            {/* Aspect Ratio Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Aspect Ratio
              </Label>
              <div className="flex gap-2">
                {(["16:9", "4:3", "1:1"] as const).map((ratio) => (
                  <Button
                    key={ratio}
                    type="button"
                    variant={
                      block.aspectRatio === ratio ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleAspectRatioChange(ratio)}
                    className="flex-1"
                  >
                    {ratio}
                  </Button>
                ))}
              </div>
            </div>

            {/* Alignment Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Alignment
              </Label>
              <div className="flex gap-2">
                {(["left", "center", "right"] as const).map((align) => (
                  <Button
                    key={align}
                    type="button"
                    variant={block.alignment === align ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleAlignmentChange(align)}
                    className="flex-1 capitalize"
                  >
                    {align}
                  </Button>
                ))}
              </div>
            </div>

            {/* Platform Info */}
            {block.platform && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/10 rounded">
                <p>
                  <strong>Platform:</strong>{" "}
                  {block.platform === "youtube" ? "YouTube" : "Vimeo"}
                </p>
                <p>
                  <strong>Video ID:</strong> {block.embedId}
                </p>
              </div>
            )}
          </div>
        )}
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
 * FrontmatterBlockContent - Memoized frontmatter block editor
 * Provides structured editing interface for article metadata
 */
interface FrontmatterBlockContentProps {
  block: FrontmatterBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
}

const FrontmatterBlockContent = React.memo<FrontmatterBlockContentProps>(
  function FrontmatterBlockContent({ block, onUpdate }) {
    const [tags, setTags] = useState<string[]>(block.data?.tags || []);
    const [newTag, setNewTag] = useState("");

    // Sync tags state with block data when it changes
    React.useEffect(() => {
      setTags(block.data?.tags || []);
    }, [block.data?.tags]);

    const handleDataUpdate = (field: string, value: any) => {
      const updatedData = {
        ...block.data,
        [field]: value,
      };
      onUpdate({ data: updatedData } as Partial<FrontmatterBlock>);
    };

    const addTag = () => {
      if (newTag.trim() && !tags.includes(newTag.trim())) {
        const updatedTags = [...tags, newTag.trim()];
        setTags(updatedTags);
        handleDataUpdate("tags", updatedTags);
        setNewTag("");
      }
    };

    const removeTag = (tagToRemove: string) => {
      const updatedTags = tags.filter((tag) => tag !== tagToRemove);
      setTags(updatedTags);
      handleDataUpdate("tags", updatedTags);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    };

    return (
      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="frontmatter-title" className="text-sm font-medium">
            Title
          </Label>
          <Input
            id="frontmatter-title"
            value={block.data?.title || ""}
            onChange={(e) => handleDataUpdate("title", e.target.value)}
            placeholder="Article title"
            className="mt-1"
          />
        </div>

        {/* Subtitle */}
        <div>
          <Label htmlFor="frontmatter-subtitle" className="text-sm font-medium">
            Subtitle
          </Label>
          <Input
            id="frontmatter-subtitle"
            value={block.data?.subtitle || ""}
            onChange={(e) => handleDataUpdate("subtitle", e.target.value)}
            placeholder="Article subtitle or description"
            className="mt-1"
          />
        </div>

        {/* Author and Date Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="frontmatter-author" className="text-sm font-medium">
              Author
            </Label>
            <Input
              id="frontmatter-author"
              value={block.data?.author || ""}
              onChange={(e) => handleDataUpdate("author", e.target.value)}
              placeholder="Author name"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="frontmatter-date" className="text-sm font-medium">
              Date
            </Label>
            <Input
              id="frontmatter-date"
              type="date"
              value={block.data?.date || ""}
              onChange={(e) => handleDataUpdate("date", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Status and Type Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="frontmatter-status" className="text-sm font-medium">
              Status
            </Label>
            <select
              id="frontmatter-status"
              value={block.data?.status || ""}
              onChange={(e) => handleDataUpdate("status", e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-colors text-sm"
            >
              <option value="">Select status</option>
              <option value="LIVE AUCTION">Live Auction</option>
              <option value="SOLD">Sold</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
          <div>
            <Label htmlFor="frontmatter-type" className="text-sm font-medium">
              Type
            </Label>
            <select
              id="frontmatter-type"
              value={block.data?.type || ""}
              onChange={(e) => handleDataUpdate("type", e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-colors text-sm"
            >
              <option value="">Select type</option>
              <option value="listing">Listing</option>
              <option value="article">Article</option>
              <option value="news">News</option>
              <option value="review">Review</option>
            </select>
          </div>
        </div>

        {/* Cover Image */}
        <div>
          <Label htmlFor="frontmatter-cover" className="text-sm font-medium">
            Cover Image URL
          </Label>
          <Input
            id="frontmatter-cover"
            value={block.data?.cover || ""}
            onChange={(e) => handleDataUpdate("cover", e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="mt-1"
          />
        </div>

        {/* Tags */}
        <div>
          <Label className="text-sm font-medium">Tags</Label>
          <div className="mt-1 space-y-2">
            {/* Tag Display */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-primary/70 hover:text-primary transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Tag Input */}
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addTag}
                disabled={!newTag.trim()}
                size="sm"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div>
          <Label htmlFor="frontmatter-cta" className="text-sm font-medium">
            Call to Action Text
          </Label>
          <Input
            id="frontmatter-cta"
            value={block.data?.callToAction || ""}
            onChange={(e) => handleDataUpdate("callToAction", e.target.value)}
            placeholder="Call to action text"
            className="mt-1"
          />
        </div>

        {/* Call to Action URL */}
        <div>
          <Label htmlFor="frontmatter-cta-url" className="text-sm font-medium">
            Call to Action URL
          </Label>
          <Input
            id="frontmatter-cta-url"
            value={block.data?.callToActionUrl || ""}
            onChange={(e) =>
              handleDataUpdate("callToActionUrl", e.target.value)
            }
            placeholder="https://example.com"
            className="mt-1"
          />
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

/**
 * ListBlockContent: Basic UI for editing unordered list items
 */
interface ListBlockContentProps {
  block: ListBlock;
  onUpdate: (updates: Partial<ListBlock>) => void;
}
const ListBlockContent = React.memo<ListBlockContentProps>(
  function ListBlockContent({ block, onUpdate }) {
    // This is now a fully controlled component. It derives its state directly from props.
    const items = block.items || [];

    const handleItemChange = (idx: number, value: string) => {
      // Create a new array with the updated item and call onUpdate immediately.
      const newItems = [...items];
      newItems[idx] = value;
      onUpdate({ items: newItems });
    };

    const handleAddItem = () => {
      // Add a new item and update immediately.
      const newItems = [...items, "New list item"];
      onUpdate({ items: newItems });
    };

    const handleRemoveItem = (idx: number) => {
      // Remove an item and update immediately.
      const newItems = items.filter((_, i) => i !== idx);
      onUpdate({ items: newItems });
    };

    const handleMoveItem = (idx: number, dir: -1 | 1) => {
      // Move an item and update immediately.
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= items.length) return;
      const newItems = [...items];
      const [moved] = newItems.splice(idx, 1);
      newItems.splice(newIdx, 0, moved);
      onUpdate({ items: newItems });
    };

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Unordered List Items
        </div>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => handleItemChange(idx, e.target.value)}
                className="flex-1"
                placeholder={`List item ${idx + 1}`}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleMoveItem(idx, -1)}
                disabled={idx === 0}
                title="Move up"
              >
                ↑
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleMoveItem(idx, 1)}
                disabled={idx === items.length - 1}
                title="Move down"
              >
                ↓
              </Button>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={() => handleRemoveItem(idx)}
                title="Remove"
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          onClick={handleAddItem}
          className="mt-2"
        >
          Add Item
        </Button>
        {/* TODO: Stage 2 - Implement preview/export rendering for list blocks */}
        <div className="text-xs text-blue-700 mt-4">
          TODO: List block preview/export logic will be implemented in Stage 2.
        </div>
      </div>
    );
  }
);

/**
 * HTMLBlockContent - Memoized HTML block editor
 * Phase 2A Performance: Extracted for consistent memoization
 */
interface HTMLBlockContentProps {
  block: HTMLBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
}

const HTMLBlockContent = React.memo<HTMLBlockContentProps>(
  function HTMLBlockContent({ block, onUpdate }) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [htmlContent, setHtmlContent] = useState(block.content || "");
    const [htmlDescription, setHtmlDescription] = useState(
      block.description || ""
    );

    // Sync content and description state with block data when it changes
    React.useEffect(() => {
      setHtmlContent(block.content || "");
      setHtmlDescription(block.description || "");
    }, [block.content, block.description]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHtmlContent(e.target.value);
      onUpdate({ content: e.target.value } as Partial<HTMLBlock>);
    };

    const handleDescriptionChange = (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      setHtmlDescription(e.target.value);
      onUpdate({ description: e.target.value } as Partial<HTMLBlock>);
    };

    return (
      <div className="space-y-3">
        {/* HTML Preview/Input */}
        <div className="mb-3 relative">
          <div
            className="p-3 bg-muted/10 rounded-md border border-border/20"
            dangerouslySetInnerHTML={{
              __html: stripInlineStyles(htmlContent),
            }}
          />

          {/* Toggle Button */}
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

        {/* Collapsible HTML Settings */}
        {!isCollapsed && (
          <div className="pt-2">
            {/* Content Input */}
            <div>
              <Label
                htmlFor={`html-content-${block.id}`}
                className="text-sm font-medium"
              >
                HTML Content
              </Label>
              <textarea
                id={`html-content-${block.id}`}
                className="w-full p-2 border border-border/40 rounded-md bg-transparent focus:border-border/60 focus:ring-1 focus:ring-ring transition-colors"
                rows={10}
                value={htmlContent}
                onChange={handleContentChange}
                placeholder="Enter your HTML content here..."
              />
            </div>

            {/* Description Input */}
            <div>
              <Label
                htmlFor={`html-description-${block.id}`}
                className="text-sm font-medium"
              >
                Description (Optional)
              </Label>
              <Input
                id={`html-description-${block.id}`}
                placeholder="Brief description for this HTML block"
                value={htmlDescription}
                onChange={handleDescriptionChange}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

export { BlockContent };
