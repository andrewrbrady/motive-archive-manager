"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Loader2,
  ChevronRight,
  PenLine,
  RotateCcw,
  Save,
  History,
  Clock,
  Trash2,
  Pencil,
  Copy,
  Check,
  X as LucideX, // Renamed to avoid conflict with X from Headless UI
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModelSelector } from "@/components/ModelSelector"; // Assuming this can be reused or adapted
import MarkdownViewer from "@/components/MarkdownViewer";
import type { Car } from "@/types/car"; // Assuming Car type is available
import type { ModelType } from "@/types/models";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import ArticlePromptForm, {
  ArticlePromptFormData,
} from "@/components/admin/ArticlePromptForm";
import {
  ProviderId,
  getAllModels,
  llmProviders,
  findModelById,
} from "@/lib/llmProviders";

// --- Interfaces & Types for Article Generator ---

interface ArticlePrompt {
  _id: string;
  name: string;
  prompt: string;
  aiModel: ModelType;
  llmProvider: ProviderId; // Ensure this is consistent with how CaptionGenerator handles it
  modelParams?: {
    temperature?: number;
    // other params like maxTokens, etc.
  };
  // Potentially add fields like tone, style, length if specific to articles
  // and different from captions, otherwise manage within the prompt text.
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GeneratedArticle {
  content: string;
  promptIdUsed: string | null; // ID of the ArticlePrompt used
  timestamp: Date;
  modelUsed: ModelType;
}

interface SavedArticleVersion {
  _id: string; // Or some unique ID for the saved version
  carId: string;
  articleContent: string;
  promptSnapshot: Partial<ArticlePrompt>; // Store a snapshot of the prompt used
  modelUsed: ModelType;
  createdAt: string;
  updatedAt: string;
  // Add a user-friendly name or a version number if needed
  versionName?: string;
}

interface ArticleGeneratorProps {
  carId: string;
}

// --- Main Component ---

export function ArticleGenerator({ carId }: ArticleGeneratorProps) {
  // --- Car Details State ---
  const [carDetails, setCarDetails] = useState<Car | null>(null);
  const [carLoading, setCarLoading] = useState(true);
  const [carError, setCarError] = useState<string | null>(null);

  // --- Article Prompt Management State ---
  const [articlePromptList, setArticlePromptList] = useState<ArticlePrompt[]>(
    []
  );
  const [selectedArticlePrompt, setSelectedArticlePrompt] =
    useState<ArticlePrompt | null>(null);
  const [isArticlePromptModalOpen, setIsArticlePromptModalOpen] =
    useState(false);
  const [isCreatingArticlePrompt, setIsCreatingArticlePrompt] = useState(false);
  const [articlePromptLoading, setArticlePromptLoading] = useState(false); // For fetching list
  const [articlePromptSubmitting, setArticlePromptSubmitting] = useState(false); // For form submission
  const [articlePromptError, setArticlePromptError] = useState<string | null>(
    null
  );

  // --- Article Generation State ---
  const [generatedArticleContent, setGeneratedArticleContent] =
    useState<string>("");
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [articleGenerationError, setArticleGenerationError] = useState<
    string | null
  >(null);
  const [currentGenerationStream, setCurrentGenerationStream] =
    useState<string>(""); // For streaming
  const [additionalContext, setAdditionalContext] = useState<string>("");
  const [lengthPreference, setLengthPreference] = useState<string>("medium");

  // --- Saved Articles State ---
  const [savedArticles, setSavedArticles] = useState<SavedArticleVersion[]>([]);
  const [isFetchingSavedArticles, setIsFetchingSavedArticles] = useState(false);
  const [selectedSavedArticleContent, setSelectedSavedArticleContent] =
    useState<string | null>(null);
  const [isViewingSavedArticle, setIsViewingSavedArticle] = useState(false); // To toggle between current and saved view

  // --- AI Model Configuration (Defaults, can be overridden by prompt) ---
  // These might be managed within the ArticlePromptForm primarily
  const [model, setModel] = useState<ModelType>("claude-3-5-sonnet-20241022");
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [temperature, setTemperature] = useState(0.7); // Default temperature

  // --- Editing State (for inline editing of generated/saved articles) ---
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null); // For saved articles
  const [editingText, setEditingText] = useState<string>("");
  const [isEditingCurrentGenerated, setIsEditingCurrentGenerated] =
    useState(false);

  // --- State for saving article ---
  const [isSavingArticle, setIsSavingArticle] = useState(false);

  // --- State for editing saved articles ---
  const [isEditingSavedArticle, setIsEditingSavedArticle] = useState(false);
  const [editingSavedArticleId, setEditingSavedArticleId] = useState<
    string | null
  >(null); // ID of the saved article being edited

  // --- Utility and Constants ---
  const allModels = getAllModels(); // From llmProviders

  // --- TODO: useEffect for fetching carDetails ---
  useEffect(() => {
    if (!carId) {
      setCarLoading(false);
      setCarError("No Car ID provided.");
      return;
    }
    const fetchCarDetails = async () => {
      setCarLoading(true);
      setCarError(null);
      try {
        const response = await fetch(`/api/cars/${carId}`);
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Failed to fetch car details" }));
          throw new Error(
            errorData.message ||
              `Failed to fetch car details (status: ${response.status})`
          );
        }
        const data = await response.json();
        setCarDetails(data);
      } catch (err) {
        setCarError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred while fetching car details"
        );
        setCarDetails(null);
      } finally {
        setCarLoading(false);
      }
    };
    fetchCarDetails();
  }, [carId]);

  // --- TODO: useEffect for fetching articlePromptList ---
  useEffect(() => {
    setArticlePromptLoading(true);
    setArticlePromptError(null);
    fetch("/api/article-prompts") // Assuming this endpoint exists or will be created
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: "Failed to fetch article prompts" }));
          throw new Error(
            errorData.message ||
              `Failed to fetch article prompts (status: ${res.status})`
          );
        }
        return res.json();
      })
      .then((data) => {
        setArticlePromptList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setArticlePromptError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred while fetching prompts"
        );
        setArticlePromptList([]);
      })
      .finally(() => {
        setArticlePromptLoading(false);
      });
  }, []); // Fetch once on mount

  // --- TODO: useEffect for fetching savedArticles ---
  useEffect(() => {
    if (!carId) return; // Don't fetch if no carId

    setIsFetchingSavedArticles(true);
    fetch(`/api/cars/${carId}/article/saved`) // Assuming this endpoint exists
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: "Failed to fetch saved articles" }));
          throw new Error(
            errorData.message ||
              `Failed to fetch saved articles (status: ${res.status})`
          );
        }
        return res.json();
      })
      .then((data) => {
        setSavedArticles(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to load saved articles"
        );
        setSavedArticles([]);
      })
      .finally(() => {
        setIsFetchingSavedArticles(false);
      });
  }, [carId]);

  // --- TODO: useEffect for loading default prompt ---
  useEffect(() => {
    // Only load default if no prompt is explicitly selected by the user AND prompts have loaded
    if (
      selectedArticlePrompt ||
      articlePromptLoading ||
      articlePromptList.length === 0
    )
      return;

    // Attempt to find a default prompt from the fetched list or fetch a specific default endpoint
    const defaultPrompt = articlePromptList.find((prompt) => prompt.isDefault);
    if (defaultPrompt) {
      setSelectedArticlePrompt(defaultPrompt);
      // Optionally set model, provider, temp from this default prompt
      setModel(defaultPrompt.aiModel);
      setProvider(defaultPrompt.llmProvider);
      if (defaultPrompt.modelParams?.temperature !== undefined) {
        setTemperature(defaultPrompt.modelParams.temperature);
      }
    } else if (articlePromptList.length > 0) {
      // If no explicit default, maybe select the first one as a fallback?
      // Or leave it null to force user selection.
      // For now, let's leave it null and user must select unless a prompt is marked as default.
    }
    // Alternatively, fetch from a dedicated default endpoint like CaptionGenerator does:
    // fetch(`/api/article-prompts?defaultOnly=true&platform=article`) // platform might be irrelevant for articles
    //   .then(res => res.ok ? res.json() : null)
    //   .then(data => { if (data && data._id) setSelectedArticlePrompt(data); });
  }, [articlePromptList, articlePromptLoading, selectedArticlePrompt]);

  // --- Function to handle Article Prompt Form submission ---
  const handlePromptFormSubmit = async (formData: ArticlePromptFormData) => {
    if (!carId) {
      setArticlePromptError("Car ID is missing, cannot save prompt.");
      toast.error("Car ID is missing.");
      return;
    }

    setArticlePromptSubmitting(true);
    setArticlePromptError(null);

    try {
      const method = isCreatingArticlePrompt ? "POST" : "PATCH";
      const url = isCreatingArticlePrompt
        ? "/api/article-prompts"
        : `/api/article-prompts?id=${selectedArticlePrompt?._id}`;

      // Construct payload, ensuring carId might be needed if prompts are car-specific
      // Or if not, it's a global prompt, adjust API and payload accordingly.
      // For now, assuming prompts are global or carId is handled by API if needed.
      const payload: any = {
        ...formData,
        // carId: carId, // Add if prompts are scoped to cars
      };
      if (!isCreatingArticlePrompt && selectedArticlePrompt) {
        payload.id = selectedArticlePrompt._id; // Ensure ID is in payload for PATCH
      }

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to save article prompt" }));
        throw new Error(
          errorData.message ||
            `Failed to save prompt (status: ${response.status})`
        );
      }

      const updatedOrCreatedPrompt = await response.json();

      // Refresh prompt list and update selection
      setArticlePromptList((prevList) => {
        if (isCreatingArticlePrompt) {
          return [updatedOrCreatedPrompt, ...prevList];
        }
        return prevList.map((p) =>
          p._id === updatedOrCreatedPrompt._id ? updatedOrCreatedPrompt : p
        );
      });
      setSelectedArticlePrompt(updatedOrCreatedPrompt);

      // Update local model/provider/temp from the successfully saved prompt
      setModel(updatedOrCreatedPrompt.aiModel);
      setProvider(updatedOrCreatedPrompt.llmProvider);
      if (updatedOrCreatedPrompt.modelParams?.temperature !== undefined) {
        setTemperature(updatedOrCreatedPrompt.modelParams.temperature);
      }

      setIsArticlePromptModalOpen(false);
      setIsCreatingArticlePrompt(false);
      toast.success(
        `Article prompt ${isCreatingArticlePrompt ? "created" : "updated"} successfully!`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while saving the prompt.";
      setArticlePromptError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setArticlePromptSubmitting(false);
    }
  };

  // --- Article Generation Function ---
  const handleGenerateArticle = async () => {
    if (!selectedArticlePrompt) {
      setArticleGenerationError(
        "No article prompt selected. Please select or create a prompt."
      );
      toast.error("No article prompt selected.");
      return;
    }
    if (!carDetails) {
      setArticleGenerationError(
        "Car details are not loaded. Cannot generate article."
      );
      toast.error("Car details not available.");
      return;
    }

    setIsGeneratingArticle(true);
    setArticleGenerationError(null);
    setGeneratedArticleContent(""); // Clear previous content
    setCurrentGenerationStream(""); // Clear stream buffer

    // Prepare a more detailed car data object for the backend/prompt replacement
    const carDataForPrompt = {
      id: carDetails._id,
      year: carDetails.year,
      make: carDetails.make,
      model: carDetails.model,
      vin: carDetails.vin,
      mileage: carDetails.mileage, // This is { value: number, unit: string }
      engine: carDetails.engine, // This is a complex object
      transmission: carDetails.transmission, // This is { type: string, speeds?: number }
      exteriorColor: carDetails.color, // Corrected: 'color' is the exterior color
      interiorColor: carDetails.interior_color, // Corrected: 'interior_color'
      descriptionSummary: carDetails.description?.substring(0, 500) + "...",
      fullDescription: carDetails.description,
      // --- Fields to review based on Car type ---
      // highlights: carDetails.highlights, // No direct 'highlights' field. Consider deriving from description or features.
      // equipment: carDetails.equipment, // No direct 'equipment' field. Consider engine.features or interior_features.features
      engineFeatures: carDetails.engine?.features, // Example: using engine.features
      interiorFeatures: carDetails.interior_features?.features, // Example: using interior_features.features
      // modifications: carDetails.modifications, // No direct 'modifications' field.
      // serviceHistorySummary: carDetails.serviceHistory?.slice(0,3), // No direct 'serviceHistory' field.
      // knownFlawsSummary: carDetails.knownFlaws?.slice(0,3), // No direct 'knownFlaws' field.
      status: carDetails.status,
      condition: carDetails.condition,
      location: carDetails.location,
      // Potentially add more specific, existing fields as needed by prompts
      // e.g., manufacturing details, dimensions, performance, if they exist and are useful.
      manufacturingPlant: carDetails.manufacturing?.plant,
      bodyStyle: carDetails.manufacturing?.body_style,
      performance_0_to_60: carDetails.performance?.["0_to_60_mph"],
      topSpeed: carDetails.performance?.top_speed,
    };

    try {
      const payload = {
        carId: carDetails._id,
        promptText: selectedArticlePrompt.prompt, // The actual template string
        aiModel: selectedArticlePrompt.aiModel,
        llmProvider: selectedArticlePrompt.llmProvider,
        modelParams: selectedArticlePrompt.modelParams || { temperature: 0.7 }, // Ensure modelParams exists
        carData: carDataForPrompt, // Detailed car data for placeholder replacement by the backend
        additionalContext: additionalContext,
        lengthPreference: lengthPreference,
      };

      // Removed sensitive payload logging - only log non-sensitive summary in development
      if (process.env.NODE_ENV !== "production") {
        console.log("Generating article with payload summary:", {
          carId: carDetails._id.substring(0, 8) + "***",
          hasPromptText: !!selectedArticlePrompt.prompt,
          aiModel: selectedArticlePrompt.aiModel,
          llmProvider: selectedArticlePrompt.llmProvider,
          hasCarData: !!carDataForPrompt,
          additionalContextLength: additionalContext?.length || 0,
          lengthPreference: lengthPreference,
        });
      }

      const response = await fetch(
        `/api/cars/${carDetails._id}/article/generate`,
        {
          // Ensure this API endpoint is correct
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to generate article" }));
        throw new Error(
          errorData.message ||
            `Failed to generate article (status: ${response.status})`
        );
      }

      // Assuming non-streaming for now. For SSE, you'd handle the stream here.
      const result = await response.json();
      if (result.articleContent) {
        setGeneratedArticleContent(result.articleContent);
        toast.success("Article generated successfully!");
      } else {
        throw new Error("Generated content not found in API response.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while generating the article.";
      setArticleGenerationError(errorMessage);
      toast.error(errorMessage);
      setGeneratedArticleContent(
        "Failed to generate article. Please try again. Error: " + errorMessage
      );
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  // --- TODO: handleSaveArticle function ---
  const handleSaveArticle = async () => {
    if (!generatedArticleContent) {
      toast.error("No article content to save.");
      return;
    }
    if (!carDetails?._id) {
      toast.error("Car ID not found. Cannot save article.");
      return;
    }
    if (!selectedArticlePrompt) {
      toast.error(
        "Selected prompt information is missing. Cannot save article with prompt context."
      );
      // Decide if saving without prompt context is allowed or return
      return;
    }

    setIsSavingArticle(true);
    try {
      const payload = {
        carId: carDetails._id,
        articleContent: generatedArticleContent,
        promptSnapshot: {
          _id: selectedArticlePrompt._id,
          name: selectedArticlePrompt.name,
          aiModel: selectedArticlePrompt.aiModel,
          llmProvider: selectedArticlePrompt.llmProvider,
          modelParams: selectedArticlePrompt.modelParams,
        },
        modelUsed: selectedArticlePrompt.aiModel, // Redundant but can be direct
        // versionName: `Version from ${new Date().toISOString()}`, // Optional: generate a version name
      };

      const response = await fetch(`/api/cars/${carDetails._id}/article/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to save article" }));
        throw new Error(
          errorData.message ||
            `Failed to save article (status: ${response.status})`
        );
      }

      const newSavedArticle = await response.json();

      // Add to local state or refetch
      setSavedArticles((prev) => [newSavedArticle, ...prev]);
      // Or: await fetchSavedArticles(); // If you have a dedicated fetch function for saved articles

      toast.success("Article version saved successfully!");
      // Optionally clear generatedArticleContent or mark it as saved
      // setGeneratedArticleContent("");
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while saving the article.";
      toast.error(errorMessage);
    } finally {
      setIsSavingArticle(false);
    }
  };

  // --- Functions to manage saved articles ---
  const handleDeleteSavedArticle = async (articleVersionId: string) => {
    if (!carDetails?._id) {
      toast.error("Car ID not found. Cannot delete article version.");
      return;
    }

    // Simple confirmation, consider a styled dialog for better UX
    if (
      !confirm("Are you sure you want to delete this saved article version?")
    ) {
      return;
    }

    try {
      // Assuming a DELETE endpoint like /api/cars/:carId/article/saved/:versionId
      const response = await fetch(
        `/api/cars/${carDetails._id}/article/saved/${articleVersionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to delete article version" }));
        throw new Error(
          errorData.message ||
            `Failed to delete article version (status: ${response.status})`
        );
      }

      // Remove from local state
      setSavedArticles((prev) =>
        prev.filter((article) => article._id !== articleVersionId)
      );

      // If the deleted article was being viewed, clear the view
      if (isViewingSavedArticle && editingSavedArticleId === articleVersionId) {
        setIsEditingSavedArticle(false);
        setEditingSavedArticleId(null);
        setEditingText("");
        // Also clear the main view if the edited one was deleted
        setIsViewingSavedArticle(false);
        setSelectedSavedArticleContent(null);
      } else if (isViewingSavedArticle && selectedSavedArticleContent) {
        // If a different saved article (not being edited) was deleted while viewing another,
        // and if that viewed article happened to be the one deleted (though we don't have its ID easily here)
        // For simplicity, if any delete happens while viewing *any* saved article, we might revert.
        // This part is tricky without storing the ID of the *viewed* saved article separately.
        // Let's assume for now the above check for editingSavedArticleId is sufficient.
      }

      toast.success("Saved article version deleted successfully!");
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while deleting the article version.";
      toast.error(errorMessage);
    }
  };

  const handleUpdateSavedArticle = async () => {
    if (!editingSavedArticleId || !editingText.trim()) {
      toast.error("No article selected for update or content is empty.");
      return;
    }
    if (!carDetails?._id) {
      toast.error("Car ID not found. Cannot update article.");
      return;
    }

    // Consider adding a loading state for this update operation if it might take time
    // setIsUpdatingSavedArticle(true);

    try {
      const payload = {
        articleContent: editingText,
        // Potentially send other metadata if it can be updated, e.g., versionName
      };

      const response = await fetch(
        `/api/cars/${carDetails._id}/article/saved/${editingSavedArticleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to update article" }));
        throw new Error(
          errorData.message ||
            `Failed to update article (status: ${response.status})`
        );
      }

      const updatedArticle = await response.json();

      // Update in local state
      setSavedArticles((prev) =>
        prev.map((sa) =>
          sa._id === editingSavedArticleId ? updatedArticle : sa
        )
      );

      // Update the main view if this article was being viewed/edited
      setSelectedSavedArticleContent(updatedArticle.articleContent);

      toast.success("Article version updated successfully!");
      setIsEditingSavedArticle(false);
      setEditingSavedArticleId(null);
      setEditingText(""); // Clear editing text
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while updating the article.";
      toast.error(errorMessage);
    } finally {
      // setIsUpdatingSavedArticle(false);
    }
  };

  // --- TODO: CRUD functions for article prompts (interact with ArticlePromptForm) ---
  // This was moved to handlePromptFormSubmit earlier

  if (carLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading article generator...
      </div>
    );
  }

  if (carError) {
    return <div className="py-8 text-center text-destructive">{carError}</div>;
  }

  if (!carDetails) {
    // Should ideally be covered by carLoading, but as a fallback
    return (
      <div className="py-8 text-center text-muted-foreground">
        Car details not available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">
        Article Generator for {carDetails.year} {carDetails.make}{" "}
        {carDetails.model}
      </h1>

      {/* Row 1: Prompt Selection and Management */}
      <Card className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-end gap-4">
          <div>
            <label
              htmlFor="article-prompt-select"
              className="block text-sm font-medium mb-1 text-muted-foreground"
            >
              Article Prompt Template
            </label>
            <Select
              value={selectedArticlePrompt?._id || ""}
              onValueChange={(promptId) => {
                if (promptId === "__PROMPT_NONE__") {
                  setSelectedArticlePrompt(null);
                  // Reset relevant generation params or rely on defaults
                  return;
                }
                const found = articlePromptList.find((p) => p._id === promptId);
                setSelectedArticlePrompt(found || null);
                if (found) {
                  // Optionally set model, provider, temp from prompt if they differ
                  setModel(found.aiModel);
                  setProvider(found.llmProvider);
                  if (found.modelParams?.temperature !== undefined) {
                    setTemperature(found.modelParams.temperature);
                  }
                }
                setIsCreatingArticlePrompt(false);
              }}
              disabled={
                articlePromptLoading ||
                (articlePromptList.length === 0 && !articlePromptError)
              }
            >
              <SelectTrigger id="article-prompt-select" className="w-full">
                <SelectValue
                  placeholder={
                    articlePromptLoading
                      ? "Loading prompts..."
                      : articlePromptError
                        ? "Error loading prompts"
                        : "Select an article prompt..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {articlePromptError && (
                  <SelectItem
                    value="__ERROR__"
                    disabled
                    className="text-destructive"
                  >
                    Error: {articlePromptError}
                  </SelectItem>
                )}
                {!articlePromptError &&
                  articlePromptList.length === 0 &&
                  !articlePromptLoading && (
                    <SelectItem value="__NO_PROMPTS__" disabled>
                      No prompts. Click 'New' to create.
                    </SelectItem>
                  )}
                <SelectItem value="__PROMPT_NONE__">
                  -- None (Manual Configuration) --
                </SelectItem>
                {articlePromptList.map((prompt) => (
                  <SelectItem key={prompt._id} value={prompt._id}>
                    {prompt.name}{" "}
                    <span className="text-xs text-muted-foreground ml-2">
                      (
                      {findModelById(prompt.aiModel)?.model.name ||
                        prompt.aiModel}
                      )
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (selectedArticlePrompt) {
                setIsCreatingArticlePrompt(false);
                setIsArticlePromptModalOpen(true);
              }
            }}
            disabled={!selectedArticlePrompt}
          >
            Edit Prompt
          </Button>
          <Button
            variant="default" // Changed to default for primary action
            onClick={() => {
              setSelectedArticlePrompt(null); // Clear selection for new prompt
              setIsCreatingArticlePrompt(true);
              // Reset states for a new prompt form
              // setModel(defaultModel); setProvider(defaultProvider); setTemperature(defaultTemp);
              setIsArticlePromptModalOpen(true);
            }}
          >
            New Prompt
          </Button>
        </div>
      </Card>

      {/* TODO: ArticlePromptForm Dialog - Placeholder for now */}
      <Dialog
        open={isArticlePromptModalOpen}
        onOpenChange={setIsArticlePromptModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreatingArticlePrompt
                ? "Create New Article Prompt"
                : `Edit Prompt: ${selectedArticlePrompt?.name || ""}`}
            </DialogTitle>
            <DialogDescription>
              {isCreatingArticlePrompt
                ? "Define a new reusable prompt template for article generation."
                : "Modify the existing article prompt template."}
            </DialogDescription>
          </DialogHeader>
          <ArticlePromptForm
            key={
              isCreatingArticlePrompt
                ? "new-article-prompt"
                : selectedArticlePrompt?._id || "edit-article-prompt"
            }
            prompt={
              isCreatingArticlePrompt
                ? undefined
                : selectedArticlePrompt || undefined
            }
            isSubmitting={articlePromptSubmitting}
            onSubmit={handlePromptFormSubmit}
            onCancel={() => {
              setIsArticlePromptModalOpen(false);
              setArticlePromptError(null); // Clear any modal errors on cancel
            }}
            // Pass initial model/provider/temp if ArticlePromptForm expects them for a new form
            initialModel={model} // Current global model as default for new prompt
            initialProvider={provider}
            initialTemperature={temperature}
          />
          {/* Remove the placeholder div and error display from here, as it's handled by ArticlePromptForm or below it */}
          {/* <div className="p-6 text-center">Article Prompt Form Placeholder</div> */}
          {articlePromptError && !isArticlePromptModalOpen && (
            // This error display is for general errors outside the modal context if any
            // Modal specific errors should be inside the modal or handled by form itself
            <p className="mt-4 text-sm text-destructive text-center">
              {articlePromptError}
            </p>
          )}
          {/* DialogFooter might be part of ArticlePromptForm itself, or here if form doesn't include it */}
          {/* <DialogFooter className="mt-6">
// ... existing code ...

        </DialogFooter> */}
        </DialogContent>
      </Dialog>

      {/* Row 2: Generation Button & Summary of Current Settings */}
      <Card className="p-4 sm:p-6">
        {selectedArticlePrompt && (
          <div className="mb-4 p-3 rounded-md bg-muted/50 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Selected Prompt: {selectedArticlePrompt.name}
            </h3>
            <p className="text-xs text-muted-foreground whitespace-pre-line truncate max-h-20 overflow-hidden">
              {selectedArticlePrompt.prompt}
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              Model:{" "}
              {findModelById(selectedArticlePrompt.aiModel)?.model.name ||
                selectedArticlePrompt.aiModel}
              {selectedArticlePrompt.modelParams?.temperature &&
                ` (Temp: ${selectedArticlePrompt.modelParams.temperature})`}
            </div>
          </div>
        )}
        {!selectedArticlePrompt && (
          <div className="mb-4 p-3 rounded-md bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              No prompt selected. Manual configuration or a new prompt is
              needed.
            </p>
            {/* Display current manual model/temp settings if applicable */}
          </div>
        )}
        {/* Add additional context control */}
        <div className="mb-4">
          <label
            htmlFor="additional-context"
            className="block text-sm font-medium mb-1 text-muted-foreground"
          >
            Additional Context (Optional)
          </label>
          <Textarea
            id="additional-context"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Specify additional themes, focuses, or requirements for the article..."
            className="w-full resize-y"
            rows={3}
          />
        </div>

        {/* Add length preference control */}
        <div className="mb-4">
          <label
            htmlFor="length-preference"
            className="block text-sm font-medium mb-1 text-muted-foreground"
          >
            Article Length
          </label>
          <Select
            value={lengthPreference}
            onValueChange={(value) => setLengthPreference(value)}
          >
            <SelectTrigger id="length-preference" className="w-full">
              <SelectValue placeholder="Select length" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short (300-500 words)</SelectItem>
              <SelectItem value="medium">Medium (800-1200 words)</SelectItem>
              <SelectItem value="long">Long (1500-2000 words)</SelectItem>
              <SelectItem value="very-long">Very Long (2000+ words)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerateArticle}
          disabled={
            isGeneratingArticle || !selectedArticlePrompt || !carDetails
          }
          className="w-full flex items-center justify-center gap-2"
          size="lg"
        >
          {isGeneratingArticle ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Article...
            </>
          ) : (
            <>
              <PenLine className="w-5 h-5" />
              Generate Article
            </>
          )}
        </Button>
        {articleGenerationError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{articleGenerationError}</AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Main Content Area: Generated Article / Editor / Saved Article Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0">
            {" "}
            {/* Remove padding for MarkdownViewer to control it */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">
                {isViewingSavedArticle && selectedSavedArticleContent
                  ? isEditingSavedArticle
                    ? `Editing Saved Version`
                    : "Viewing Saved Version"
                  : "Generated Article"}
              </h2>
              <div className="flex items-center gap-2">
                {isViewingSavedArticle && !isEditingSavedArticle && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingSavedArticle(true);
                      // Assuming selectedSavedArticleContent is the content of the article whose ID would be editingSavedArticleId
                      // We need to set editingSavedArticleId when "View" on a saved article is clicked.
                      // For now, this will rely on editingSavedArticleId being set correctly before this button is shown.
                      if (
                        editingSavedArticleId &&
                        selectedSavedArticleContent
                      ) {
                        setEditingText(selectedSavedArticleContent);
                      } else {
                        // Fallback or error if ID isn't set when trying to edit
                        // This implies view logic needs to set editingSavedArticleId too.
                        toast.error("Cannot determine which article to edit.");
                        setIsEditingSavedArticle(false);
                      }
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit This Version
                  </Button>
                )}
                {isEditingSavedArticle && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleUpdateSavedArticle}
                    >
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingSavedArticle(false);
                        setEditingSavedArticleId(null); // Clear which article was being edited
                        setEditingText(""); // Clear edited text
                        // selectedSavedArticleContent remains as it was, so view reverts to non-edit mode
                      }}
                    >
                      Cancel Edit
                    </Button>
                  </>
                )}
                {isViewingSavedArticle && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsViewingSavedArticle(false);
                      setSelectedSavedArticleContent(null);
                      setIsEditingSavedArticle(false); // Also cancel editing if switching view
                      setEditingSavedArticleId(null);
                      setEditingText("");
                    }}
                  >
                    Back to Current
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4 min-h-[400px]">
              {" "}
              {/* Padding for content */}
              {isGeneratingArticle && !generatedArticleContent && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p>Generating, please wait...</p>
                  {/* TODO: Add progress details if streaming */}
                </div>
              )}
              {isEditingSavedArticle ? (
                <Textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full min-h-[400px] font-mono text-sm p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                  placeholder="Editing article content..."
                />
              ) : (
                <MarkdownViewer
                  content={
                    isViewingSavedArticle && selectedSavedArticleContent
                      ? selectedSavedArticleContent
                      : generatedArticleContent ||
                        (isGeneratingArticle
                          ? currentGenerationStream
                          : "Article content will appear here...")
                  }
                  filename={
                    isViewingSavedArticle
                      ? `saved-article-${editingArticleId || "view"}.md`
                      : `generated-article-${carDetails._id}.md`
                  }
                />
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <Button
                onClick={handleSaveArticle}
                disabled={
                  isSavingArticle ||
                  !generatedArticleContent ||
                  isViewingSavedArticle
                }
                size="sm"
              >
                {isSavingArticle ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Current Article
                  </>
                )}
              </Button>
            </div>
          </Card>
          {/* TODO: Add controls for saving current generated article, or editing it */}
        </div>

        {/* Right Panel: Saved Articles List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                Saved Versions
              </h3>
              {/* <Button variant="outline" size="sm" onClick={fetchSavedArticles} disabled={isFetchingSavedArticles}>
                {isFetchingSavedArticles ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
              </Button> */}
            </div>
            {isFetchingSavedArticles ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved article versions yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {savedArticles.map((articleVer) => (
                  <div
                    key={articleVer._id}
                    className="p-3 bg-muted/30 rounded-md border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium truncate">
                          {articleVer.versionName ||
                            `Version from ${new Date(articleVer.createdAt).toLocaleDateString()}`}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(articleVer.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setSelectedSavedArticleContent(
                              articleVer.articleContent
                            );
                            setEditingSavedArticleId(articleVer._id); // <<< SET THE ID HERE
                            setIsViewingSavedArticle(true);
                            setIsEditingSavedArticle(false); // Ensure not in edit mode when first viewing
                            setEditingText(""); // Clear any lingering edit text
                          }}
                          title="View"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() =>
                            handleDeleteSavedArticle(articleVer._id)
                          }
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {articleVer.promptSnapshot?.name && (
                      <p className="mt-1 text-xs text-muted-foreground border-t border-border/50 pt-1">
                        Prompt: {articleVer.promptSnapshot.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ArticleGenerator;
