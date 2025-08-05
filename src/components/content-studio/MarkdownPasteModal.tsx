"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, FileText, Eye, Clipboard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  parseMarkdownToBlocks,
  previewMarkdownBlocks,
} from "@/lib/markdown-parser";
import { ContentBlock } from "./types";

interface MarkdownPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasteBlocks: (blocks: ContentBlock[]) => void;
  activeBlockId?: string | null;
}

/**
 * Modal component for pasting markdown content and converting it to content blocks
 */
export const MarkdownPasteModal = React.memo<MarkdownPasteModalProps>(
  function MarkdownPasteModal({
    isOpen,
    onClose,
    onPasteBlocks,
    activeBlockId,
  }) {
    const [markdownText, setMarkdownText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Parse markdown in real-time for preview
    const parseResult = useMemo(() => {
      if (!markdownText.trim()) {
        return { blocks: [], errors: [] };
      }
      return parseMarkdownToBlocks(markdownText);
    }, [markdownText]);

    // Generate preview text
    const previewItems = useMemo(() => {
      if (!markdownText.trim()) {
        return [];
      }
      return previewMarkdownBlocks(markdownText);
    }, [markdownText]);

    // Handle paste from clipboard
    const handlePasteFromClipboard = useCallback(async () => {
      try {
        const text = await navigator.clipboard.readText();
        setMarkdownText(text);
      } catch (error) {
        console.error("Failed to read clipboard:", error);
      }
    }, []);

    // Handle importing the blocks
    const handleImport = useCallback(async () => {
      if (parseResult.blocks.length === 0) {
        return;
      }

      setIsProcessing(true);

      try {
        // Pass the blocks to the parent component
        onPasteBlocks(parseResult.blocks);

        // Reset and close
        setMarkdownText("");
        onClose();
      } catch (error) {
        console.error("Failed to import blocks:", error);
      } finally {
        setIsProcessing(false);
      }
    }, [parseResult.blocks, onPasteBlocks, onClose]);

    // Handle modal close
    const handleClose = useCallback(() => {
      setMarkdownText("");
      onClose();
    }, [onClose]);

    // Sample markdown for demo
    const sampleMarkdown = `# Welcome to Content Studio

This is a **sample markdown** document that demonstrates the various elements you can paste.

## Features Supported

- **Headings** (H1 through H6)
- **Bold** and *italic* text
- [Links](https://example.com) to external resources
- Horizontal rules

---

### Lists

Both unordered and ordered lists are supported:

- Unordered list item 1
- Unordered list item 2
- Unordered list item 3

1. Ordered list item 1
2. Ordered list item 2
3. Ordered list item 3

### Code and Quotes

Inline \`code\` is supported, as well as code blocks:

\`\`\`
function hello() {
  console.log("Hello, world!");
}
\`\`\`

> This is a blockquote. It will be converted to an HTML block with proper styling.

### Images

![Sample Image](https://example.com/image.jpg)

*Note: Make sure image URLs are accessible from your domain.*`;

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paste Markdown Content
            </DialogTitle>
            <DialogDescription>
              Paste your markdown content below and preview how it will be
              converted to content blocks.
              {activeBlockId && (
                <span className="text-blue-600 font-medium">
                  {" "}
                  Content will be inserted below the active block.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            <Tabs defaultValue="input" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="input" className="flex items-center gap-2">
                  <Clipboard className="h-4 w-4" />
                  Input
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview ({parseResult.blocks.length} blocks)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="input" className="flex-1 mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePasteFromClipboard}
                    >
                      <Clipboard className="h-4 w-4 mr-2" />
                      Paste from Clipboard
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMarkdownText(sampleMarkdown)}
                    >
                      Load Sample
                    </Button>
                  </div>
                  {markdownText && (
                    <Badge variant="secondary">
                      {markdownText.length} characters
                    </Badge>
                  )}
                </div>

                <Textarea
                  value={markdownText}
                  onChange={(e) => setMarkdownText(e.target.value)}
                  placeholder="Paste your markdown content here..."
                  className="min-h-[300px] font-mono text-sm"
                />

                {parseResult.errors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div>Parsing errors detected:</div>
                      <ul className="list-disc list-inside mt-1">
                        {parseResult.errors.map((error, index) => (
                          <li key={index} className="text-sm">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="preview" className="flex-1 mt-4">
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  {previewItems.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No content to preview</p>
                      <p className="text-sm">
                        Paste some markdown in the Input tab to see a preview
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        The following {previewItems.length} content blocks will
                        be created:
                      </p>
                      {previewItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-md"
                        >
                          <Badge variant="outline" className="shrink-0">
                            {index + 1}
                          </Badge>
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Supported: Headings, Lists, Images, Code, Quotes, Links, Bold,
              Italic
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={parseResult.blocks.length === 0 || isProcessing}
              >
                {isProcessing
                  ? "Importing..."
                  : `Import ${parseResult.blocks.length} Block${parseResult.blocks.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
