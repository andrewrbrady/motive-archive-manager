"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Mail, Newspaper, Info, Archive, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

import { CopySelector } from "./CopySelector";
import { EmailComposer } from "./EmailComposer";
import { NewsComposer } from "./NewsComposer";
import { CompositionsList } from "./CompositionsList";
import {
  ContentStudioTabProps,
  SelectedCopy,
  ContentBlock,
  ContentTemplate,
  LoadedComposition,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State management
  const [selectedCopies, setSelectedCopies] = useState<SelectedCopy[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ContentTemplate | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>("email-composer");
  const [loadedComposition, setLoadedComposition] =
    useState<LoadedComposition | null>(null);
  const [isLoadingComposition, setIsLoadingComposition] = useState(false);
  const isIntentionallyClearing = useRef(false);
  const compositionsRefetch = useRef<(() => void) | null>(null);
  const previousContext = useRef<{ carId?: string; projectId?: string } | null>(
    null
  );

  // Generate a unique key for localStorage based on context
  const workingStateKey = `content-studio-working-state-${
    projectId ? `project-${projectId}` : `car-${carId}`
  }`;

  // Determine context (car vs project mode)
  const isProjectMode = Boolean(projectId);
  const entityId = projectId || carId;
  const entityInfo = projectInfo || carInfo;

  // Save working state to localStorage
  const saveWorkingState = useCallback(() => {
    if (
      !loadedComposition &&
      (blocks.length > 0 || selectedCopies.length > 0)
    ) {
      const workingState = {
        blocks,
        selectedCopies,
        activeTemplate,
        activeTab,
        timestamp: Date.now(),
      };
      localStorage.setItem(workingStateKey, JSON.stringify(workingState));
    }
  }, [
    blocks,
    selectedCopies,
    activeTemplate,
    activeTab,
    loadedComposition,
    workingStateKey,
  ]);

  // Restore working state from localStorage
  const restoreWorkingState = useCallback(() => {
    try {
      const saved = localStorage.getItem(workingStateKey);
      if (saved) {
        const workingState = JSON.parse(saved);
        // Only restore if it's recent (within 24 hours)
        if (
          workingState.timestamp &&
          Date.now() - workingState.timestamp < 24 * 60 * 60 * 1000
        ) {
          setBlocks(workingState.blocks || []);
          setSelectedCopies(workingState.selectedCopies || []);
          setActiveTemplate(workingState.activeTemplate || null);
          setActiveTab(workingState.activeTab || "email-composer");
          return true;
        }
      }
    } catch (error) {
      console.error("Error restoring working state:", error);
    }
    return false;
  }, [workingStateKey]);

  // Clear working state from localStorage
  const clearWorkingState = useCallback(() => {
    localStorage.removeItem(workingStateKey);
  }, [workingStateKey]);

  // Function to update URL with composition ID
  const updateUrlWithComposition = useCallback(
    (compositionId: string | null) => {
      const url = new URL(window.location.href);

      if (compositionId) {
        url.searchParams.set("composition", compositionId);
      } else {
        url.searchParams.delete("composition");
      }

      // Keep existing tab parameter
      url.searchParams.set("tab", "content-studio");

      window.history.replaceState({}, "", url.toString());
    },
    []
  );

  // Function to load a composition by ID
  const loadCompositionById = useCallback(
    async (compositionId: string) => {
      // Validate composition ID format before making API call
      if (!compositionId || compositionId.length !== 24) {
        console.error("Invalid composition ID format:", compositionId);
        updateUrlWithComposition(null);
        return;
      }

      setIsLoadingComposition(true);
      try {
        const composition = await api.get<LoadedComposition>(
          `/content-studio/compositions/${compositionId}`
        );

        // Validate composition context - ensure it belongs to current car/project
        const compositionCarId = composition.metadata?.carId;
        const compositionProjectId = composition.metadata?.projectId;

        // Check if composition context matches current context
        const contextMismatch =
          (carId && compositionCarId && compositionCarId !== carId) ||
          (projectId &&
            compositionProjectId &&
            compositionProjectId !== projectId);

        if (contextMismatch) {
          console.warn("Composition context mismatch:", {
            compositionCarId,
            compositionProjectId,
            currentCarId: carId,
            currentProjectId: projectId,
          });

          toast({
            title: "Composition Not Available",
            description:
              "This composition belongs to a different context and cannot be loaded here.",
            variant: "destructive",
          });

          updateUrlWithComposition(null);
          return;
        }

        // Set the loaded composition for editing
        setLoadedComposition(composition);

        // Load the composition's blocks
        setBlocks(composition.blocks || []);

        // Set selected copies from metadata if available
        if (composition.metadata?.selectedCopies) {
          setSelectedCopies(composition.metadata.selectedCopies);
        }

        // Switch to the appropriate composer tab based on composition type
        const composerType = composition.metadata?.composerType || "email";
        setActiveTab(
          composerType === "email" ? "email-composer" : "news-composer"
        );

        // Update URL with composition ID (in case it was cleaned up)
        updateUrlWithComposition(compositionId);

        // Clear working state since we're now editing a saved composition
        clearWorkingState();

        console.log("✅ Successfully loaded composition:", {
          id: compositionId,
          name: composition.name,
          blocksCount: composition.blocks?.length || 0,
        });
      } catch (error: any) {
        console.error("Error loading composition:", error);

        // Handle specific error types
        let errorMessage = "Failed to load the composition. Please try again.";
        let shouldClearUrl = true;

        if (error?.response?.status === 404) {
          errorMessage =
            "Composition not found. It may have been deleted or you may not have access to it.";
        } else if (error?.response?.status === 401) {
          errorMessage =
            "You don't have permission to access this composition.";
        } else if (error?.response?.status === 400) {
          errorMessage = "Invalid composition ID format.";
        } else if (error?.code === "NETWORK_ERROR" || !navigator.onLine) {
          errorMessage =
            "Network error. Please check your connection and try again.";
          shouldClearUrl = false; // Don't clear URL for network errors
        }

        toast({
          title: "Error Loading Composition",
          description: errorMessage,
          variant: "destructive",
        });

        // Clear composition from URL if it failed to load (except for network errors)
        if (shouldClearUrl) {
          updateUrlWithComposition(null);
        }
      } finally {
        setIsLoadingComposition(false);
      }
    },
    [api, carId, projectId, toast, clearWorkingState]
    // Removed updateUrlWithComposition - it has empty deps and is stable
  );

  // Check URL for composition ID on mount and when search params change
  useEffect(() => {
    if (!searchParams) return;

    const compositionId = searchParams.get("composition");

    // Don't load if we're intentionally clearing
    if (isIntentionallyClearing.current) {
      isIntentionallyClearing.current = false;
      return;
    }

    // Validate composition ID format before attempting to load
    if (compositionId && (!compositionId || compositionId.length !== 24)) {
      console.error("Invalid composition ID in URL:", compositionId);
      updateUrlWithComposition(null);
      return;
    }

    // Only load if we have a valid composition ID, no loaded composition, not loading
    if (compositionId && !loadedComposition && !isLoadingComposition) {
      loadCompositionById(compositionId);
    }
  }, [
    searchParams,
    loadedComposition,
    isLoadingComposition,
    loadCompositionById,
    // Removed updateUrlWithComposition to prevent infinite loop - it has empty deps and never changes
  ]);

  // Save working state when it changes (but not when loading a saved composition)
  useEffect(() => {
    if (!loadedComposition) {
      saveWorkingState();
    }
  }, [
    blocks,
    selectedCopies,
    activeTemplate,
    activeTab,
    loadedComposition,
    // Removed saveWorkingState to prevent infinite loop - callback recreates when deps change
  ]);

  // Handle copy selection from the LoadModal (replace current content)
  const handleCopySelect = useCallback(
    (copies: SelectedCopy[]) => {
      // Set flag to prevent URL effect from reloading
      isIntentionallyClearing.current = true;

      setSelectedCopies(copies);
      // Clear any loaded composition when loading new copy
      setLoadedComposition(null);
      setBlocks([]);
      // Clear URL composition parameter
      updateUrlWithComposition(null);
    },
    [] // updateUrlWithComposition is stable (empty deps)
  );

  // Handle creating new composition with copy
  const handleCreateNewWithCopy = useCallback(
    (copies: SelectedCopy[]) => {
      // Set flag to prevent URL effect from reloading
      isIntentionallyClearing.current = true;

      // Clear everything to start fresh
      setSelectedCopies(copies);
      setLoadedComposition(null);
      setBlocks([]);
      setActiveTemplate(null);
      // Clear URL composition parameter
      updateUrlWithComposition(null);
      // Clear working state directly
      localStorage.removeItem(workingStateKey);

      toast({
        title: "New Composition Started",
        description: "Created a fresh composition with the selected copy.",
      });
    },
    [workingStateKey, toast] // updateUrlWithComposition is stable (empty deps)
  );

  // Handle creating a blank new composition
  const handleCreateNew = useCallback(() => {
    // Set flag to prevent URL effect from reloading
    isIntentionallyClearing.current = true;

    // Clear everything to start completely fresh
    setSelectedCopies([]);
    setLoadedComposition(null);
    setBlocks([]);
    setActiveTemplate(null);
    // Clear URL composition parameter
    updateUrlWithComposition(null);
    // Clear working state - call directly to avoid callback dependency
    localStorage.removeItem(workingStateKey);

    // Switch to email composer tab
    setActiveTab("email-composer");

    toast({
      title: "New Composition Started",
      description: "Started a blank composition. Ready to create!",
    });
  }, [workingStateKey, toast]); // Removed clearWorkingState dependency - call localStorage directly

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
  const handleLoadComposition = useCallback(
    (composition: LoadedComposition) => {
      // Set the loaded composition for editing
      setLoadedComposition(composition);

      // Load the composition's blocks
      setBlocks(composition.blocks || []);

      // Set selected copies from metadata if available
      if (composition.metadata?.selectedCopies) {
        setSelectedCopies(composition.metadata.selectedCopies);
      }

      // Switch to the appropriate composer tab based on composition type
      const composerType = composition.metadata?.composerType || "email";
      setActiveTab(
        composerType === "email" ? "email-composer" : "news-composer"
      );

      // Update URL with composition ID
      updateUrlWithComposition(composition._id);

      // Clear working state since we're now editing a saved composition
      clearWorkingState();
    },
    [clearWorkingState] // updateUrlWithComposition is stable (empty deps)
  );

  // Clear loaded composition when starting fresh
  const handleClearComposition = useCallback(() => {
    // Set flag to prevent URL effect from reloading
    isIntentionallyClearing.current = true;

    setLoadedComposition(null);
    setBlocks([]);
    setSelectedCopies([]);
    setActiveTemplate(null);
    // Stay on current tab instead of switching to copy-selection

    // Clear composition from URL
    updateUrlWithComposition(null);

    // Clear working state
    clearWorkingState();
  }, [clearWorkingState]); // updateUrlWithComposition is stable (empty deps)

  // Handle when a composition is saved
  const handleCompositionSaved = useCallback(
    (composition: LoadedComposition) => {
      console.log("🔔 [CONTENT STUDIO DEBUG] handleCompositionSaved called:", {
        compositionId: composition._id,
        compositionName: composition.name,
        compositionType: composition.type,
        blocksCount: composition.blocks.length,
        hasMetadata: !!composition.metadata,
        currentLoadedComposition: loadedComposition?._id || "none",
        hasRefetchFunction: !!compositionsRefetch.current,
      });

      // Update the loaded composition with the saved data
      setLoadedComposition(composition);
      console.log(
        "✅ [CONTENT STUDIO DEBUG] Updated loadedComposition state with saved data"
      );

      // Update URL with the composition ID (important for new compositions)
      updateUrlWithComposition(composition._id);
      console.log(
        "✅ [CONTENT STUDIO DEBUG] Updated URL with composition ID:",
        composition._id
      );

      // Refresh the saved compositions list
      if (compositionsRefetch.current) {
        console.log(
          "🔄 [CONTENT STUDIO DEBUG] Calling compositions refetch function"
        );
        compositionsRefetch.current();
        console.log("✅ [CONTENT STUDIO DEBUG] Compositions refetch completed");
      } else {
        console.log(
          "⚠️ [CONTENT STUDIO DEBUG] No compositions refetch function available"
        );
      }
    },
    [loadedComposition] // updateUrlWithComposition is stable (empty deps)
  );

  // Handle when CompositionsList provides its refetch function
  const handleCompositionsRefetch = useCallback((refetchFn: () => void) => {
    compositionsRefetch.current = refetchFn;
  }, []);

  // Restore working state on initial load
  useEffect(() => {
    // Only restore if we don't have a composition in the URL and no loaded composition
    if (!searchParams?.get("composition") && !loadedComposition) {
      const restored = restoreWorkingState();
      if (restored) {
        toast({
          title: "Work Restored",
          description:
            "Your previous work has been restored from your last session.",
        });
      }
    }
  }, []); // Run only once on mount

  // Reset state when switching contexts
  React.useEffect(() => {
    const currentContext = { carId, projectId };

    // Only clear state if context has actually changed (not on initial mount)
    if (
      previousContext.current &&
      (previousContext.current.carId !== currentContext.carId ||
        previousContext.current.projectId !== currentContext.projectId)
    ) {
      setSelectedCopies([]);
      setBlocks([]);
      setActiveTemplate(null);
      setLoadedComposition(null);
      setActiveTab("email-composer");

      // Clear composition from URL when switching contexts
      updateUrlWithComposition(null);
      // Clear working state when switching contexts
      clearWorkingState();
    }

    // Update the previous context
    previousContext.current = currentContext;
  }, [carId, projectId, clearWorkingState]); // updateUrlWithComposition is stable (empty deps)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">
              Content Studio
            </h2>
            <Badge variant="secondary" className="text-xs">
              Phase 1
            </Badge>
            {loadedComposition && (
              <Badge variant="outline" className="text-xs bg-primary/10">
                Editing: {loadedComposition.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Enhance your copy with multimedia elements for marketing emails and
            content
          </p>
        </div>

        {/* Context indicator and actions */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleCreateNew}
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Composition
          </Button>
          {loadedComposition && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearComposition}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Start Fresh</span>
            </Button>
          )}

          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>
              {isProjectMode
                ? `Project: ${entityInfo?.name || "Unknown"}`
                : `Car: ${entityInfo?.year || ""} ${entityInfo?.make || ""} ${entityInfo?.model || ""}`}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="email-composer"
            className="flex items-center space-x-2"
          >
            <Mail className="h-4 w-4" />
            <span>Email Composer</span>
            {activeTab === "email-composer" && blocks.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                {blocks.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="news-composer"
            className="flex items-center space-x-2"
          >
            <Newspaper className="h-4 w-4" />
            <span>News Composer</span>
            {activeTab === "news-composer" && blocks.length > 0 && (
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
        </TabsList>

        {/* Email Composer Tab */}
        <TabsContent value="email-composer" className="space-y-6">
          <EmailComposer
            selectedCopies={selectedCopies}
            blocks={blocks}
            onBlocksChange={handleBlocksChange}
            template={activeTemplate || undefined}
            onTemplateChange={handleTemplateChange}
            loadedComposition={loadedComposition}
            carId={carId}
            projectId={projectId}
            onLoadCopy={handleCopySelect}
            onLoadComposition={handleLoadComposition}
            onCreateNewWithCopy={handleCreateNewWithCopy}
            onCompositionSaved={handleCompositionSaved}
          />
        </TabsContent>

        {/* News Composer Tab */}
        <TabsContent value="news-composer" className="space-y-6">
          <NewsComposer
            selectedCopies={selectedCopies}
            blocks={blocks}
            onBlocksChange={handleBlocksChange}
            template={activeTemplate || undefined}
            onTemplateChange={handleTemplateChange}
            loadedComposition={loadedComposition}
            carId={carId}
            projectId={projectId}
            onLoadCopy={handleCopySelect}
            onLoadComposition={handleLoadComposition}
            onCreateNewWithCopy={handleCreateNewWithCopy}
            onCompositionSaved={handleCompositionSaved}
          />
        </TabsContent>

        {/* Saved Compositions Tab */}
        <TabsContent value="saved-compositions" className="space-y-6">
          <CompositionsList
            carId={carId}
            projectId={projectId}
            onLoadComposition={handleLoadComposition}
            onRefetch={handleCompositionsRefetch}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
