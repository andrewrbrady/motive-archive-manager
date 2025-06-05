"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Palette, FileText, Sparkles, Info, Archive } from "lucide-react";

import { CopySelector } from "./CopySelector";
import { BlockComposer } from "./BlockComposer";
import { CompositionsList } from "./CompositionsList";
import {
  ContentStudioTabProps,
  SelectedCopy,
  ContentBlock,
  ContentTemplate,
} from "./types";

/**
 * ContentStudioTab - Main component for the Content Studio feature
 *
 * This component provides a multimedia enhancement interface that works alongside
 * the existing UnifiedCopywriter. Users can select plain text copy and enhance it
 * with multimedia elements for marketing emails and other content types.
 */
export function ContentStudioTab({
  carId,
  carInfo,
  projectId,
  projectInfo,
  onUpdate,
}: ContentStudioTabProps) {
  // State management
  const [selectedCopies, setSelectedCopies] = useState<SelectedCopy[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ContentTemplate | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>("copy-selection");
  const [loadedComposition, setLoadedComposition] = useState<any>(null);

  // Determine context (car vs project mode)
  const isProjectMode = Boolean(projectId);
  const entityId = projectId || carId;
  const entityInfo = projectInfo || carInfo;

  // Handle copy selection from the CopySelector
  const handleCopySelect = useCallback(
    (copies: SelectedCopy[]) => {
      setSelectedCopies(copies);

      // Auto-advance to composer if copies are selected
      if (copies.length > 0 && activeTab === "copy-selection") {
        setActiveTab("block-composer");
      }
    },
    [activeTab]
  );

  // Handle block changes from the BlockComposer
  const handleBlocksChange = useCallback((newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
  }, []);

  // Handle template changes
  const handleTemplateChange = useCallback(
    (template: ContentTemplate) => {
      setActiveTemplate(template);
      onUpdate?.();
    },
    [onUpdate]
  );

  // Handle loading a saved composition
  const handleLoadComposition = useCallback((composition: any) => {
    // Set the loaded composition for editing
    setLoadedComposition(composition);

    // Load the composition's blocks
    setBlocks(composition.blocks || []);

    // Set selected copies from metadata if available
    if (composition.metadata?.selectedCopies) {
      setSelectedCopies(composition.metadata.selectedCopies);
    }

    // Switch to the block composer tab
    setActiveTab("block-composer");
  }, []);

  // Clear loaded composition when starting fresh
  const handleClearComposition = useCallback(() => {
    setLoadedComposition(null);
  }, []);

  // Reset state when switching contexts
  React.useEffect(() => {
    setSelectedCopies([]);
    setBlocks([]);
    setActiveTemplate(null);
    setLoadedComposition(null);
    setActiveTab("copy-selection");
  }, [carId, projectId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">
              Content Studio
            </h2>
            <Badge variant="secondary" className="text-xs">
              Phase 1
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Enhance your copy with multimedia elements for marketing emails and
            content
          </p>
        </div>

        {/* Context indicator */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>
            {isProjectMode
              ? `Project: ${entityInfo?.name || "Unknown"}`
              : `Car: ${entityInfo?.year || ""} ${entityInfo?.make || ""} ${entityInfo?.model || ""}`}
          </span>
        </div>
      </div>

      <Separator />

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger
            value="copy-selection"
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Copy Selection</span>
            {selectedCopies.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                {selectedCopies.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="block-composer"
            className="flex items-center space-x-2"
          >
            <Palette className="h-4 w-4" />
            <span>Block Composer</span>
            {blocks.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                {blocks.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="saved-compositions"
            className="flex items-center space-x-2"
          >
            <Archive className="h-4 w-4" />
            <span>Saved</span>
          </TabsTrigger>

          <TabsTrigger
            value="preview"
            className="flex items-center space-x-2 hidden lg:flex"
          >
            <Sparkles className="h-4 w-4" />
            <span>Preview</span>
          </TabsTrigger>
        </TabsList>

        {/* Copy Selection Tab */}
        <TabsContent value="copy-selection" className="space-y-6">
          <CopySelector
            carId={carId}
            projectId={projectId}
            onCopySelect={handleCopySelect}
            selectedCopies={selectedCopies}
          />
        </TabsContent>

        {/* Block Composer Tab */}
        <TabsContent value="block-composer" className="space-y-6">
          <BlockComposer
            selectedCopies={selectedCopies}
            blocks={blocks}
            onBlocksChange={handleBlocksChange}
            template={activeTemplate || undefined}
            onTemplateChange={handleTemplateChange}
            loadedComposition={loadedComposition}
          />
        </TabsContent>

        {/* Saved Compositions Tab */}
        <TabsContent value="saved-compositions" className="space-y-6">
          <CompositionsList
            carId={carId}
            projectId={projectId}
            onLoadComposition={handleLoadComposition}
          />
        </TabsContent>

        {/* Preview Tab (placeholder for future phases) */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>Content Preview</span>
                <Badge variant="outline">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Preview Coming Soon</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Live preview of your enhanced content will be available in
                      future phases, including email template rendering and
                      export functionality.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
