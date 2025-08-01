"use client";

import React, { useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  Type,
  ImageIcon,
  Video,
  Heading,
  Minus,
  FileText,
  List,
  Code,
} from "lucide-react";
import {
  ContentBlock,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  VideoBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  ColumnsBlock,
  FrontmatterBlock,
  ContentBlockType,
  ListBlock,
  HTMLBlock,
} from "./types";
import { EmailHeaderState } from "./EmailHeaderConfig";
import { BlockContent } from "./BlockContent";
import { CSSClassSelector } from "../BlockComposer/CSSClassSelector";
import {
  CSSClass,
  classToInlineStyles,
  classToEmailInlineStyles,
} from "@/lib/css-parser";
import {
  useStylesheetData,
  getCSSClassFromStylesheet,
} from "@/hooks/useStylesheetData";
import {
  formatContent,
  stripInlineStyles,
  applyStylesheetAsInlineStyles,
} from "@/lib/content-formatter";

interface IntegratedPreviewEditorProps {
  blocks: ContentBlock[];
  emailHeader?: EmailHeaderState;
  selectedStylesheetId?: string | null;
  previewMode?: "clean" | "email";
  emailPlatform?: string;
  // Editing functionality
  activeBlockId: string | null;
  draggedBlockId: string | null;
  draggedOverIndex: number | null;
  onSetActive: (blockId: string | null) => void;
  onUpdateBlock: (blockId: string, updates: Partial<ContentBlock>) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
  onDragStart: (blockId: string) => void;
  onDragEnd: () => void;
  onDragOver: (index: number) => void;
  onBlocksChange: (blocks: ContentBlock[]) => void;
  // Frontmatter conversion
  onConvertTextToFrontmatter?: (textBlockId: string) => void;
  detectFrontmatterInTextBlock?: (textBlock: TextBlock) => any;
  // Context for AI generation
  carId?: string;
  projectId?: string;
}

/**
 * IntegratedPreviewEditor - Combined preview and editing in a single column
 *
 * This component replaces the separate PreviewColumn and BlockEditor components
 * to provide a more streamlined editing experience where users can edit content
 * directly in context with how it will appear.
 */
export const IntegratedPreviewEditor = React.memo<IntegratedPreviewEditorProps>(
  function IntegratedPreviewEditor({
    blocks,
    emailHeader,
    selectedStylesheetId,
    previewMode = "clean",
    emailPlatform = "generic",
    activeBlockId,
    draggedBlockId,
    draggedOverIndex,
    onSetActive,
    onUpdateBlock,
    onRemoveBlock,
    onMoveBlock,
    onDragStart,
    onDragEnd,
    onDragOver,
    onBlocksChange,
    onConvertTextToFrontmatter,
    detectFrontmatterInTextBlock,
    carId,
    projectId,
  }) {
    // Load stylesheet data reactively
    const { stylesheetData } = useStylesheetData(selectedStylesheetId || null);

    // Performance optimization: Memoize block count and sorting
    const blockCount = useMemo(() => blocks.length, [blocks]);
    const sortedBlocks = useMemo(
      () => [...blocks].sort((a, b) => a.order - b.order),
      [blocks]
    );

    // Performance optimization: Memoize email header container styles
    const emailContainerStyle = useMemo(
      () => ({
        maxWidth: "600px",
      }),
      []
    );

    // Performance optimization: Memoize header stripe styles
    const headerStripeStyles = useMemo(() => {
      if (!emailHeader?.stripes?.enabled) return null;

      return {
        top: {
          backgroundColor: emailHeader.stripes.topColor || "#BC1F1F",
          height: emailHeader.stripes.height || "4px",
        },
        bottom: {
          backgroundColor: emailHeader.stripes.bottomColor || "#0E2D4E",
          height: emailHeader.stripes.height || "4px",
        },
      };
    }, [
      emailHeader?.stripes?.enabled,
      emailHeader?.stripes?.topColor,
      emailHeader?.stripes?.bottomColor,
      emailHeader?.stripes?.height,
    ]);

    // Performance optimization: Memoize header image styles
    const headerImageStyle = useMemo(
      () => ({
        maxHeight: emailHeader?.headerImageHeight
          ? `${emailHeader.headerImageHeight}px`
          : "100px",
        height: "auto",
        objectFit: "contain" as const,
      }),
      [emailHeader?.headerImageHeight]
    );

    // Get display blocks considering drag state
    const getDisplayBlocks = useCallback(() => {
      if (!draggedBlockId || draggedOverIndex === null) return sortedBlocks;

      const draggedIndex = sortedBlocks.findIndex(
        (block) => block.id === draggedBlockId
      );
      if (draggedIndex === -1) return sortedBlocks;

      const reorderedBlocks = [...sortedBlocks];
      const [draggedBlock] = reorderedBlocks.splice(draggedIndex, 1);
      reorderedBlocks.splice(draggedOverIndex, 0, draggedBlock);

      return reorderedBlocks;
    }, [sortedBlocks, draggedBlockId, draggedOverIndex]);

    return (
      <div className="h-full">
        <div className="sticky top-0 bg-background pb-4 border-b border-border/20 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Content Editor</h3>
              <p className="text-sm text-muted-foreground">
                Edit your content in context - click any block to start editing
              </p>
            </div>
            {/* Debug info */}
            <div className="text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded">
              {blockCount} block{blockCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Card className="min-h-[500px] bg-background border shadow-sm">
            <CardContent className="p-6">
              {/* Email-style container */}
              <div
                className="mx-auto bg-background/60 backdrop-blur-sm border border-border/20 rounded-lg shadow-sm overflow-hidden"
                style={emailContainerStyle}
              >
                {/* Email Header Preview */}
                {emailHeader?.enabled && emailHeader.headerImageUrl && (
                  <div className="border-b border-border/10">
                    {/* Top stripe if enabled */}
                    {headerStripeStyles?.top && (
                      <div style={headerStripeStyles.top} />
                    )}

                    <img
                      src={emailHeader.headerImageUrl}
                      alt={emailHeader.headerImageAlt || "Email Header"}
                      className="w-full block"
                      style={headerImageStyle}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                          <div class="w-full h-20 bg-muted/20 border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground">
                            <div class="text-center text-sm">
                              <div class="mb-1">🖼️</div>
                              <div>Header image failed to load</div>
                            </div>
                          </div>
                        `;
                        }
                      }}
                    />

                    {/* Bottom stripe if enabled */}
                    {headerStripeStyles?.bottom && (
                      <div style={headerStripeStyles.bottom} />
                    )}
                  </div>
                )}

                {/* Placeholder for disabled header */}
                {emailHeader?.enabled && !emailHeader.headerImageUrl && (
                  <div className="border-b border-border/10">
                    <div className="w-full h-20 bg-muted/10 border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground">
                      <div className="text-center text-sm">
                        <div className="mb-1">🖼️</div>
                        <div>Add header image URL to see preview</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Blocks with Inline Editing */}
                {blockCount === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">✏️</span>
                    </div>
                    <p>Use the toolbar below to add your first content block</p>
                    <p className="text-xs mt-2 opacity-60">
                      Text, headings, images, and more...
                    </p>
                  </div>
                ) : (
                  <div className="content-studio-preview content-blocks-area space-y-0">
                    {getDisplayBlocks().map((block, index) => (
                      <EditablePreviewBlock
                        key={block.id}
                        block={block}
                        blocks={blocks}
                        index={index}
                        total={blocks.length}
                        isActive={activeBlockId === block.id}
                        isDragging={draggedBlockId === block.id}
                        stylesheetData={stylesheetData}
                        previewMode={previewMode}
                        emailPlatform={emailPlatform}
                        onSetActive={onSetActive}
                        onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                        onRemove={() => onRemoveBlock(block.id)}
                        onMove={(direction) => onMoveBlock(block.id, direction)}
                        onDragStart={() => onDragStart(block.id)}
                        onDragEnd={onDragEnd}
                        onDragOver={() => onDragOver(index)}
                        onBlocksChange={onBlocksChange}
                        onConvertTextToFrontmatter={onConvertTextToFrontmatter}
                        detectFrontmatterInTextBlock={
                          detectFrontmatterInTextBlock
                        }
                        carId={carId}
                        projectId={projectId}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
);

/**
 * EditablePreviewBlock - Individual block that combines preview and editing
 */
interface EditablePreviewBlockProps {
  block: ContentBlock;
  blocks: ContentBlock[];
  index: number;
  total: number;
  isActive: boolean;
  isDragging: boolean;
  stylesheetData: any; // StylesheetData from useStylesheetData
  previewMode?: "clean" | "email";
  emailPlatform?: string;
  onSetActive: (blockId: string | null) => void;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onBlocksChange: (blocks: ContentBlock[]) => void;
  // Frontmatter conversion
  onConvertTextToFrontmatter?: (textBlockId: string) => void;
  detectFrontmatterInTextBlock?: (textBlock: TextBlock) => any;
  // Context for AI generation
  carId?: string;
  projectId?: string;
}

const EditablePreviewBlock = React.memo<EditablePreviewBlockProps>(
  function EditablePreviewBlock({
    block,
    blocks,
    index,
    total,
    isActive,
    isDragging,
    stylesheetData,
    previewMode = "clean",
    emailPlatform = "generic",
    onSetActive,
    onUpdate,
    onRemove,
    onMove,
    onDragStart,
    onDragEnd,
    onDragOver,
    onBlocksChange,
    onConvertTextToFrontmatter,
    detectFrontmatterInTextBlock,
    carId,
    projectId,
  }) {
    const getBlockIcon = (type: ContentBlockType) => {
      switch (type) {
        case "text":
          return <Type className="h-3 w-3" />;
        case "image":
          return <ImageIcon className="h-3 w-3" />;
        case "video":
          return <Video className="h-3 w-3" />;
        case "divider":
          return <Minus className="h-3 w-3" />;
        case "button":
          return <Type className="h-3 w-3" />;
        case "spacer":
          return <Minus className="h-3 w-3" />;
        case "columns":
          return <Type className="h-3 w-3" />;
        case "frontmatter":
          return <FileText className="h-3 w-3" />;
        case "list":
          return <List className="h-3 w-3" />;
        case "html":
          return <Code className="h-3 w-3" />;
        default:
          return <Type className="h-3 w-3" />;
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

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
    };

    return (
      <div
        className={`relative group transition-all duration-200 ${
          isDragging ? "opacity-50 scale-[0.98] z-50" : ""
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Block Container */}
        <div
          className={`relative transition-all duration-200 ${
            isActive
              ? "bg-blue-50/20 ring-2 ring-blue-500/30 rounded-lg"
              : "hover:bg-muted/10 rounded-lg cursor-pointer"
          }`}
          onClick={isActive ? undefined : () => onSetActive(block.id)}
        >
          {/* Editing Controls Overlay - Top Right */}
          <div
            className={`absolute top-2 right-2 z-20 transition-opacity duration-150 ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <div className="flex items-center space-x-1 bg-black/80 backdrop-blur-sm rounded-md p-1">
              {/* Block type indicator */}
              <div className="text-white/70 px-1">
                {getBlockIcon(block.type)}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove("up");
                }}
                disabled={index === 0}
                className="h-6 w-6 p-0 text-white hover:bg-white/20 disabled:opacity-50"
                title="Move up"
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove("down");
                }}
                disabled={index === total - 1}
                className="h-6 w-6 p-0 text-white hover:bg-white/20 disabled:opacity-50"
                title="Move down"
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="h-6 w-6 p-0 text-white hover:bg-red-500/20"
                title="Remove block"
              >
                ×
              </Button>
            </div>
          </div>

          {/* Drag Handle - Left Edge */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-muted/30 to-transparent rounded-l-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity duration-150 z-10 ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            title="Drag to reorder block"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Content Area */}
          <div className="relative">
            {isActive ? (
              // Show editing interface when active
              <div
                className="p-4 bg-background/50 border border-border/40 rounded-lg m-2"
                onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up
              >
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Editing {block.type} block
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetActive(null);
                      }}
                      className="h-6 text-xs"
                    >
                      Done
                    </Button>
                  </div>

                  {/* CSS Class Selector */}
                  {stylesheetData && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Style:
                      </span>
                      <CSSClassSelector
                        stylesheetId={stylesheetData.id}
                        selectedClassName={(block as any).cssClassName}
                        onClassSelect={(cssClass) => {
                          onUpdate({
                            cssClassName: cssClass?.name || undefined,
                            cssClass: cssClass || undefined,
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
                <BlockContent
                  block={block}
                  blocks={blocks}
                  onUpdate={onUpdate}
                  onBlocksChange={onBlocksChange}
                  onConvertTextToFrontmatter={onConvertTextToFrontmatter}
                  detectFrontmatterInTextBlock={detectFrontmatterInTextBlock}
                  carId={carId}
                  projectId={projectId}
                />
              </div>
            ) : (
              // Show preview when not active
              <div className="relative">
                <PreviewBlock
                  block={block}
                  stylesheetData={stylesheetData}
                  previewMode={previewMode}
                  emailPlatform={emailPlatform}
                />
                {/* Click overlay hint */}
                <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Click to edit
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

/**
 * PreviewBlock - Renders individual block preview (simplified version)
 */
interface PreviewBlockProps {
  block: ContentBlock;
  stylesheetData: any; // StylesheetData from useStylesheetData
  previewMode?: "clean" | "email";
  emailPlatform?: string;
}

// Add ListBlockPreview component before PreviewBlock
const ListBlockPreview = React.memo<{
  block: ListBlock;
  stylesheetData: any;
}>(function ListBlockPreview({ block, stylesheetData }) {
  const items = block.items || [];

  // Apply CSS class styles if available
  const customStyles = useMemo(() => {
    const currentCSSClass = getCSSClassFromStylesheet(
      stylesheetData,
      block.cssClassName
    );
    if (currentCSSClass) {
      return classToInlineStyles(currentCSSClass);
    }
    return {};
  }, [stylesheetData, block.cssClassName]);

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground italic p-6">Empty list block</div>
    );
  }

  return (
    <div className="p-6">
      <ul
        className={`list-disc pl-6 space-y-2 ${block.cssClassName || ""}`}
        style={customStyles}
      >
        {items.map((item, idx) => (
          <li key={idx} className="text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
});

// Add HTMLBlockPreview component before PreviewBlock
const HTMLBlockPreview = React.memo<{
  block: HTMLBlock;
  stylesheetData: any;
  previewMode?: "clean" | "email";
  emailPlatform?: string;
}>(function HTMLBlockPreview({
  block,
  stylesheetData,
  previewMode = "clean",
  emailPlatform = "generic",
}) {
  const rawContent = block.content || "<p>No HTML content provided</p>";

  // CRITICAL FIX: Strip inline styles and rely on CSS injection for all modes
  const content = useMemo(() => {
    const strippedContent = stripInlineStyles(rawContent);
    console.log(
      "🧹 HTMLBlockPreview - Stripped inline styles (using CSS injection):"
    );
    console.log("- Original:", rawContent.substring(0, 200) + "...");
    console.log("- Stripped:", strippedContent.substring(0, 200) + "...");
    return strippedContent;
  }, [rawContent]);

  // Apply CSS class styles if available
  const customStyles = useMemo(() => {
    const currentCSSClass = getCSSClassFromStylesheet(
      stylesheetData,
      block.cssClassName
    );
    if (currentCSSClass) {
      return previewMode === "email"
        ? classToEmailInlineStyles(currentCSSClass, emailPlatform)
        : classToInlineStyles(currentCSSClass);
    }
    return {};
  }, [stylesheetData, block.cssClassName, previewMode, emailPlatform]);

  return (
    <div
      className={block.cssClassName ? "" : "p-6"}
      data-block-type="html"
      data-block-id={block.id}
    >
      <div
        className={`html-block ${block.cssClassName || ""}`}
        style={customStyles}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
});

const PreviewBlock = React.memo<PreviewBlockProps>(function PreviewBlock({
  block,
  stylesheetData,
  previewMode = "clean",
  emailPlatform = "generic",
}) {
  switch (block.type) {
    case "html":
      return (
        <HTMLBlockPreview
          block={block as HTMLBlock}
          stylesheetData={stylesheetData}
          previewMode={previewMode}
          emailPlatform={emailPlatform}
        />
      );
    case "text":
      // Check if this is a heading text block
      const textBlock = block as TextBlock;
      if (textBlock.element && textBlock.element.startsWith("h")) {
        return (
          <HeadingBlockPreview
            block={textBlock}
            stylesheetData={stylesheetData}
            previewMode={previewMode}
            emailPlatform={emailPlatform}
          />
        );
      }
      return (
        <TextBlockPreview
          block={textBlock}
          stylesheetData={stylesheetData}
          previewMode={previewMode}
          emailPlatform={emailPlatform}
        />
      );
    case "list":
      return (
        <ListBlockPreview
          block={block as ListBlock}
          stylesheetData={stylesheetData}
        />
      );
    case "image":
      return <ImageBlockPreview block={block as ImageBlock} />;
    case "video":
      return <VideoBlockPreview block={block as VideoBlock} />;
    case "divider":
      return <DividerBlockPreview block={block as DividerBlock} />;
    case "frontmatter":
      return <FrontmatterBlockPreview block={block as FrontmatterBlock} />;
    case "button":
    case "spacer":
    case "columns":
      return (
        <div className="p-6 text-center text-muted-foreground">
          {block.type} block (preview not implemented)
        </div>
      );
    default:
      return null;
  }
});

// Simplified preview components
const TextBlockPreview = React.memo<{
  block: TextBlock;
  stylesheetData: any; // StylesheetData from useStylesheetData
  previewMode?: "clean" | "email";
  emailPlatform?: string;
}>(function TextBlockPreview({
  block,
  stylesheetData,
  previewMode = "clean",
  emailPlatform = "generic",
}) {
  const content = block.content || "Your text will appear here...";

  const formattedContent = useMemo(() => {
    // Use richFormatting.formattedContent if available, otherwise use regular content
    const sourceContent = block.richFormatting?.formattedContent || content;

    // Use smart content formatting that preserves HTML tags
    return formatContent(sourceContent, {
      preserveHtml: true,
      emailMode: previewMode === "email",
      emailPlatform: emailPlatform,
      stylesheetData: stylesheetData,
    });
  }, [
    block.richFormatting?.formattedContent,
    content,
    previewMode,
    emailPlatform,
    stylesheetData,
  ]);

  // Always apply formatting if there's any content
  const hasFormattableContent = !!(
    block.richFormatting?.formattedContent || content
  );

  // Apply CSS class styles if available
  const customStyles = useMemo(() => {
    // Get updated CSS class data from current stylesheet
    const currentCSSClass = getCSSClassFromStylesheet(
      stylesheetData,
      block.cssClassName
    );

    if (currentCSSClass) {
      return previewMode === "email"
        ? classToEmailInlineStyles(currentCSSClass, emailPlatform)
        : classToInlineStyles(currentCSSClass);
    }
    return {};
  }, [stylesheetData, block.cssClassName, previewMode, emailPlatform]);

  const containerClass = block.cssClassName
    ? block.cssClassName
    : "p-6 text-base leading-relaxed";
  const textClass = !block.content
    ? "text-muted-foreground italic"
    : "text-foreground";

  return (
    <div
      className={block.cssClassName ? "" : "p-6"}
      data-block-type="text"
      data-block-id={block.id}
    >
      <div
        className={
          block.cssClassName
            ? `${block.cssClassName} whitespace-pre-wrap ${textClass}`
            : `whitespace-pre-wrap ${textClass}`
        }
        style={customStyles}
        dangerouslySetInnerHTML={{ __html: formattedContent }}
        data-css-class={block.cssClassName || "none"}
      />
    </div>
  );
});

const HeadingBlockPreview = React.memo<{
  block: TextBlock;
  stylesheetData: any; // StylesheetData from useStylesheetData
  previewMode?: "clean" | "email";
  emailPlatform?: string;
}>(function HeadingBlockPreview({
  block,
  stylesheetData,
  previewMode = "clean",
  emailPlatform = "generic",
}) {
  const content = block.content || "Your heading will appear here...";

  const formattedContent = useMemo(() => {
    // Use richFormatting.formattedContent if available, otherwise use regular content
    const sourceContent = block.richFormatting?.formattedContent || content;

    // Use smart content formatting that preserves HTML tags
    return formatContent(sourceContent, {
      preserveHtml: true,
      emailMode: previewMode === "email",
      emailPlatform: emailPlatform,
      stylesheetData: stylesheetData,
    });
  }, [
    block.richFormatting?.formattedContent,
    content,
    previewMode,
    emailPlatform,
    stylesheetData,
  ]);

  const getHeadingClasses = (element: string) => {
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
      default:
        return "text-xl font-bold mb-2 mt-4";
    }
  };

  // Apply CSS class styles if available
  const customStyles = useMemo(() => {
    // Get updated CSS class data from current stylesheet
    const currentCSSClass = getCSSClassFromStylesheet(
      stylesheetData,
      block.cssClassName
    );

    if (currentCSSClass) {
      return previewMode === "email"
        ? classToEmailInlineStyles(currentCSSClass, emailPlatform)
        : classToInlineStyles(currentCSSClass);
    }
    return {};
  }, [stylesheetData, block.cssClassName, previewMode, emailPlatform]);

  const defaultClasses = getHeadingClasses(block.element || "h2");
  const textClass = !block.content
    ? "text-muted-foreground italic"
    : "text-foreground";
  const finalClassName = block.cssClassName
    ? `${block.cssClassName} ${textClass}`
    : `${defaultClasses} ${textClass}`;

  return (
    <div className={block.cssClassName ? "" : "px-6"}>
      {React.createElement(block.element || "h2", {
        className: finalClassName,
        style: customStyles,
        dangerouslySetInnerHTML: { __html: formattedContent },
      })}
    </div>
  );
});

const ImageBlockPreview = React.memo<{ block: ImageBlock }>(
  function ImageBlockPreview({ block }) {
    const hasImage = useMemo(
      () => block.imageUrl && block.imageUrl.trim() !== "",
      [block.imageUrl]
    );

    const isFullWidthEmail = block.email?.isFullWidth;

    return (
      <div
        className={`p-6 text-center ${isFullWidthEmail ? "bg-blue-50/30 border-l-4 border-blue-400" : ""}`}
      >
        {/* Full-width email indicator */}
        {isFullWidthEmail && (
          <div className="mb-3 text-left">
            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              📧 Full-Width Email Header
              <span className="text-blue-500">
                ({block.email?.outlookWidth || "600"}px →{" "}
                {block.email?.maxWidth || "1200"}px)
              </span>
            </span>
          </div>
        )}

        {hasImage ? (
          <div>
            <img
              src={block.imageUrl}
              alt={block.altText || ""}
              className={`max-w-full h-auto rounded-lg border border-border/20 mx-auto ${
                isFullWidthEmail ? "shadow-md" : ""
              }`}
              style={
                isFullWidthEmail
                  ? {
                      backgroundColor:
                        block.email?.backgroundColor || "#111111",
                      padding: "8px",
                    }
                  : undefined
              }
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                  <div class="bg-muted/20 border-2 border-dashed border-border/40 rounded-lg p-8 text-center text-muted-foreground">
                    <div class="text-2xl mb-2">🖼️</div>
                    <div>Image failed to load</div>
                    <div class="text-xs mt-1">${block.imageUrl}</div>
                  </div>
                `;
                }
              }}
            />

            {block.caption && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {block.caption}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-muted/20 border-2 border-dashed border-border/40 rounded-lg p-8 text-center text-muted-foreground">
            <div className="text-2xl mb-2">🖼️</div>
            <div>Image URL required</div>
          </div>
        )}
      </div>
    );
  }
);

const VideoBlockPreview = React.memo<{ block: VideoBlock }>(
  function VideoBlockPreview({ block }) {
    const hasVideo = useMemo(
      () => block.url && block.embedId && block.platform,
      [block.url, block.embedId, block.platform]
    );

    const embedUrl = useMemo(() => {
      if (!hasVideo) return "";

      if (block.platform === "youtube") {
        return `https://www.youtube.com/embed/${block.embedId}`;
      } else if (block.platform === "vimeo") {
        return `https://player.vimeo.com/video/${block.embedId}`;
      }
      return "";
    }, [hasVideo, block.platform, block.embedId]);

    const aspectRatioClass = useMemo(() => {
      return block.aspectRatio === "16:9"
        ? "aspect-video"
        : block.aspectRatio === "4:3"
          ? "aspect-[4/3]"
          : "aspect-square";
    }, [block.aspectRatio]);

    return (
      <div className="p-6" style={{ textAlign: block.alignment || "center" }}>
        {hasVideo && embedUrl ? (
          <div>
            <div
              className={`relative w-full ${aspectRatioClass} max-w-2xl mx-auto`}
            >
              <iframe
                src={embedUrl}
                title={block.title || "Video"}
                className="w-full h-full rounded-lg border border-border/20"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {block.title && (
              <p className="text-sm text-muted-foreground mt-2 italic text-center">
                {block.title}
              </p>
            )}

            <div className="text-xs text-muted-foreground mt-1 text-center">
              {block.platform === "youtube" ? "YouTube" : "Vimeo"} •{" "}
              {block.aspectRatio}
            </div>
          </div>
        ) : (
          <div className="bg-muted/20 border-2 border-dashed border-border/40 rounded-lg p-8 text-center text-muted-foreground">
            <div className="text-2xl mb-2">🎥</div>
            <div>Video URL required</div>
            <div className="text-xs mt-1">Add a YouTube or Vimeo URL</div>
          </div>
        )}
      </div>
    );
  }
);

const DividerBlockPreview = React.memo<{ block: DividerBlock }>(
  function DividerBlockPreview({ block }) {
    return (
      <div className="px-6 py-4">
        <hr
          className="border-0"
          style={{
            height: block.thickness || "1px",
            backgroundColor: block.color || "#e5e7eb",
          }}
        />
      </div>
    );
  }
);

const FrontmatterBlockPreview = React.memo<{ block: FrontmatterBlock }>(
  function FrontmatterBlockPreview({ block }) {
    const { data } = block;

    return (
      <div className="mx-6 my-4 border border-border/40 rounded-lg bg-transparent overflow-hidden">
        <div className="bg-muted/10 px-4 py-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Article Metadata
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Title:</span>
              <p className="text-foreground mt-1">{data.title || "Not set"}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Author:</span>
              <p className="text-foreground mt-1">{data.author || "Not set"}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Date:</span>
              <p className="text-foreground mt-1">{data.date || "Not set"}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Status:</span>
              <p className="text-foreground mt-1">{data.status || "Not set"}</p>
            </div>
          </div>

          {data.subtitle && (
            <div>
              <span className="font-medium text-muted-foreground">
                Subtitle:
              </span>
              <p className="text-foreground mt-1">{data.subtitle}</p>
            </div>
          )}

          {data.tags && data.tags.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block bg-muted/20 text-foreground text-xs px-2 py-1 rounded border border-border/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.cover && (
            <div>
              <span className="font-medium text-muted-foreground">
                Cover Image:
              </span>
              <p className="text-foreground mt-1 text-xs font-mono bg-muted/10 p-2 rounded border border-border/20">
                {data.cover}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);
