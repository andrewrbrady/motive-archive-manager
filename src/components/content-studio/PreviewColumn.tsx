"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  ColumnsBlock,
} from "./types";

interface PreviewColumnProps {
  blocks: ContentBlock[];
}

/**
 * PreviewColumn - Live preview of content blocks
 *
 * Renders blocks as they would appear in the final output,
 * styled like email content with proper typography and spacing.
 */
export function PreviewColumn({ blocks }: PreviewColumnProps) {
  return (
    <div className="h-full">
      <div className="sticky top-0 bg-background pb-4 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Live Preview</h3>
            <p className="text-sm text-muted-foreground">
              See how your content will look
            </p>
          </div>
          {/* Debug info */}
          <div className="text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded">
            {blocks.length} block{blocks.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Card className="min-h-[500px] bg-background border shadow-sm">
          <CardContent className="p-6">
            {/* Email-style container */}
            <div
              className="mx-auto bg-background/60 backdrop-blur-sm border border-border/20 rounded-lg shadow-sm overflow-hidden"
              style={{ maxWidth: "600px" }}
            >
              {blocks.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👁️</span>
                  </div>
                  <p>Add blocks to see your content preview</p>
                  <p className="text-xs mt-2 opacity-60">
                    Content will appear here as you create it
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {blocks.map((block, index) => (
                    <div key={block.id} className="relative">
                      <PreviewBlock block={block} />
                    </div>
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

/**
 * PreviewBlock - Renders individual block preview
 */
interface PreviewBlockProps {
  block: ContentBlock;
}

function PreviewBlock({ block }: PreviewBlockProps) {
  switch (block.type) {
    case "text":
      return <TextBlockPreview block={block as TextBlock} />;
    case "image":
      return <ImageBlockPreview block={block as ImageBlock} />;
    case "button":
      return <ButtonBlockPreview block={block as ButtonBlock} />;
    case "divider":
      return <DividerBlockPreview block={block as DividerBlock} />;
    case "spacer":
      return <SpacerBlockPreview block={block as SpacerBlock} />;
    case "columns":
      return <ColumnsBlockPreview block={block as ColumnsBlock} />;
    default:
      return null;
  }
}

function TextBlockPreview({ block }: { block: TextBlock }) {
  const content = block.content || "Your text will appear here...";
  const formatting = block.formatting || {};

  return (
    <div
      className="p-6"
      style={{
        fontSize: formatting.fontSize || "16px",
        fontWeight: formatting.fontWeight || "normal",
        color: formatting.color || "currentColor",
        textAlign: formatting.textAlign || "left",
        lineHeight: formatting.lineHeight || "1.6",
      }}
    >
      <div
        className={`whitespace-pre-wrap ${!block.content ? "text-muted-foreground italic" : "text-foreground"}`}
      >
        {content}
      </div>
    </div>
  );
}

function ImageBlockPreview({ block }: { block: ImageBlock }) {
  const hasImage = block.imageUrl && block.imageUrl.trim() !== "";

  return (
    <div className="p-6" style={{ textAlign: block.alignment || "center" }}>
      {hasImage ? (
        <div>
          <img
            src={block.imageUrl}
            alt={block.altText || ""}
            className="max-w-full h-auto rounded-lg border border-border/20"
            style={{
              width: block.width || "auto",
              height: block.height || "auto",
            }}
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

function ButtonBlockPreview({ block }: { block: ButtonBlock }) {
  const hasContent = block.text && block.text.trim() !== "";
  const buttonText = hasContent ? block.text : "Button Text";

  return (
    <div className="p-6 text-center">
      <Button
        variant="default"
        className="inline-flex items-center px-6 py-3 rounded-lg font-medium"
        style={{
          backgroundColor: block.backgroundColor || "#007bff",
          color: block.textColor || "#ffffff",
          borderRadius: block.borderRadius || "6px",
          padding: block.padding || "12px 24px",
        }}
        disabled={true} // Disabled in preview
      >
        {buttonText}
        {!hasContent && <span className="ml-1 opacity-50">(empty)</span>}
      </Button>
      {block.url && (
        <div className="text-xs text-muted-foreground mt-2 font-mono">
          → {block.url}
        </div>
      )}
    </div>
  );
}

function DividerBlockPreview({ block }: { block: DividerBlock }) {
  return (
    <div className="px-6" style={{ margin: block.margin || "20px 0" }}>
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

function SpacerBlockPreview({ block }: { block: SpacerBlock }) {
  return (
    <div
      style={{ height: block.height || "20px" }}
      className="w-full bg-muted/10 flex items-center justify-center text-xs text-muted-foreground border-t border-b border-dashed border-border/30"
    >
      Spacer ({block.height || "20px"})
    </div>
  );
}

function ColumnsBlockPreview({ block }: { block: ColumnsBlock }) {
  return (
    <div className="p-6">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${block.columnCount}, 1fr)`,
          gap: block.gap || "16px",
        }}
      >
        {block.columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="bg-muted/20 border-2 border-dashed border-border/40 rounded-lg p-4 text-center text-muted-foreground min-h-[100px] flex items-center justify-center"
          >
            <div>
              <div className="text-lg mb-1">📋</div>
              <div className="text-xs">Column {columnIndex + 1}</div>
              <div className="text-xs">{column.length} blocks</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
