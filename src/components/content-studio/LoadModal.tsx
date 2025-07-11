"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Archive, Loader2 } from "lucide-react";

import { CopySelector } from "./CopySelector";
import { CompositionsList } from "./CompositionsList";
import { LoadCopyModal } from "./LoadCopyModal";
import { SelectedCopy, LoadedComposition, ContentBlock } from "./types";

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  carId?: string;
  projectId?: string;
  composerType: "email" | "news";
  // Information about existing content
  hasExistingContent: boolean;
  currentCompositionName?: string;
  // Callbacks for different load actions
  onLoadCopy: (copies: SelectedCopy[]) => void;
  onLoadComposition: (composition: LoadedComposition) => void;
  onCreateNewWithCopy: (copies: SelectedCopy[]) => void;
}

/**
 * LoadModal - Unified modal for loading content into composers
 *
 * This modal combines two loading options:
 * 1. Load from Copy Selection - Select existing copy to enhance
 * 2. Load Saved Compositions - Load previously saved compositions
 *
 * The modal filters compositions by composer type to only show relevant ones.
 */
export function LoadModal({
  isOpen,
  onClose,
  carId,
  projectId,
  composerType,
  hasExistingContent,
  currentCompositionName,
  onLoadCopy,
  onLoadComposition,
  onCreateNewWithCopy,
}: LoadModalProps) {
  const [activeTab, setActiveTab] = useState<string>("copy-selection");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadCopyModal, setShowLoadCopyModal] = useState(false);
  const [selectedCopiesForLoad, setSelectedCopiesForLoad] = useState<
    SelectedCopy[]
  >([]);

  // Handle copy selection
  const handleCopySelect = useCallback((copies: SelectedCopy[]) => {
    setSelectedCopiesForLoad(copies);
    setShowLoadCopyModal(true);
  }, []);

  // Handle replacing current content with copy
  const handleReplaceContent = useCallback(
    (copies: SelectedCopy[]) => {
      onLoadCopy(copies);
      setShowLoadCopyModal(false);
      onClose();
    },
    [onLoadCopy, onClose]
  );

  // Handle creating new composition with copy
  const handleCreateNewWithCopy = useCallback(
    (copies: SelectedCopy[]) => {
      onCreateNewWithCopy(copies);
      setShowLoadCopyModal(false);
      onClose();
    },
    [onCreateNewWithCopy, onClose]
  );

  // Handle composition loading
  const handleCompositionLoad = useCallback(
    (composition: LoadedComposition) => {
      setIsLoading(true);
      try {
        onLoadComposition(composition);
        onClose();
      } finally {
        setIsLoading(false);
      }
    },
    [onLoadComposition, onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Load Content for {composerType === "email" ? "Email" : "News"}{" "}
            Composer
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="copy-selection"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Load from Copy
            </TabsTrigger>
            <TabsTrigger
              value="saved-compositions"
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Saved Compositions
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex-1 overflow-hidden">
            {/* Copy Selection Tab */}
            <TabsContent value="copy-selection" className="mt-0 h-full">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Select existing copy from your {projectId ? "project" : "car"}{" "}
                  to enhance with multimedia elements.
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  <CopySelector
                    carId={carId}
                    projectId={projectId}
                    onCopySelect={handleCopySelect}
                    selectedCopies={[]}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Saved Compositions Tab */}
            <TabsContent value="saved-compositions" className="mt-0 h-full">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Load a previously saved {composerType} composition to continue
                  editing.
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  <CompositionsList
                    carId={carId}
                    projectId={projectId}
                    onLoadComposition={handleCompositionLoad}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading content...</span>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Load Copy Modal - for handling existing content conflicts */}
      <LoadCopyModal
        isOpen={showLoadCopyModal}
        onClose={() => setShowLoadCopyModal(false)}
        selectedCopies={selectedCopiesForLoad}
        hasExistingContent={hasExistingContent}
        compositionName={currentCompositionName}
        onReplaceContent={handleReplaceContent}
        onCreateNew={handleCreateNewWithCopy}
      />
    </Dialog>
  );
}
