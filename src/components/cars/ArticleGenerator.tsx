"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  ChevronRight,
  PenLine,
  RotateCcw,
  Save,
  History,
  Clock,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModelSelector } from "@/components/ModelSelector";
import { Textarea } from "@/components/ui/textarea";
import MarkdownViewer from "@/components/MarkdownViewer";
import type { Car } from "@/types/car";
import type { ModelType } from "@/types/models";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface Stage {
  stage: "planning" | "drafting" | "polishing";
  content: string;
  timestamp: Date;
}

interface ArticleMetadata {
  carId: string;
  model: ModelType;
  stages: Stage[];
  currentStage: "planning" | "drafting" | "polishing";
  createdAt: Date;
  updatedAt: Date;
  isComplete: boolean;
  sessionId: string;
}

interface SavedArticle {
  content: string;
  stage: "planning" | "drafting" | "polishing";
  metadata: ArticleMetadata;
  createdAt: string;
  updatedAt: string;
}

interface ArticleGeneratorProps {
  car: Car;
}

export function ArticleGenerator({ car }: ArticleGeneratorProps) {
  const [metadata, setMetadata] = useState<ArticleMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelType>(
    "claude-3-5-sonnet-20241022"
  );
  const [focus, setFocus] = useState("");
  const [isRevising, setIsRevising] = useState(false);
  const [revisionContext, setRevisionContext] = useState("");
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [isViewingSaved, setIsViewingSaved] = useState(false);
  const [selectedSavedArticle, setSelectedSavedArticle] =
    useState<SavedArticle | null>(null);
  const [isFetchingSaved, setIsFetchingSaved] = useState(false);
  const [progress, setProgress] = useState<{
    stage: "planning" | "drafting" | "polishing";
    step: string;
    message: string;
  } | null>(null);

  const stages = ["planning", "drafting", "polishing"] as const;

  const stageDescriptions = {
    planning: {
      title: "Planning Stage",
      description: "Creating a detailed outline and structure",
      details: [
        "Analyzing vehicle specifications and research data",
        "Identifying key themes and angles",
        "Creating section structure",
        "Planning technical content flow",
        "Organizing historical context",
      ],
    },
    drafting: {
      title: "Drafting Stage",
      description: "Writing the initial article draft",
      details: [
        "Expanding outline into full content",
        "Including technical specifications",
        "Adding research insights",
        "Developing narrative flow",
        "Ensuring comprehensive coverage",
      ],
    },
    polishing: {
      title: "Polishing Stage",
      description: "Enhancing style and readability",
      details: [
        "Refining writing style",
        "Adding engaging transitions",
        "Improving technical explanations",
        "Ensuring consistent tone",
        "Crafting compelling intro/conclusion",
      ],
    },
  };

  const getNextStage = (
    currentStage: "planning" | "drafting" | "polishing"
  ) => {
    const stageIndex = stages.indexOf(currentStage);
    if (stageIndex < stages.length - 1) {
      return stages[stageIndex + 1];
    }
    return currentStage;
  };

  const generateArticle = async (
    targetStage?: "planning" | "drafting" | "polishing",
    context?: string
  ) => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);

    try {
      const stage =
        targetStage ||
        (!metadata ? "planning" : getNextStage(metadata.currentStage));

      console.log("Sending article generation request:", {
        model: selectedModel,
        stage,
        context: context || undefined,
        focus: focus || undefined,
        currentStage: metadata?.currentStage,
      });

      const response = await fetch(`/api/cars/${car._id}/article`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          stage,
          context: context || undefined,
          focus: focus || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate article");
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("Failed to initialize stream reader");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete events in the buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (line.trim() === "") continue;

          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(5).trim();
              const data = JSON.parse(jsonStr);
              console.log("Received SSE data:", data);

              if (data.type === "error") {
                setError(data.error);
                setIsGenerating(false);
                return;
              }

              if (data.type === "complete") {
                setMetadata(data.metadata);
                setProgress(null);
                continue;
              }

              if (data.type === "progress") {
                setProgress({
                  stage: data.stage,
                  step: data.step,
                  message: data.message,
                });
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e, "Line:", line);
            }
          }
        }
      }

      setRevisionContext("");
      setIsRevising(false);
    } catch (err) {
      console.error("Article generation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while generating the article"
      );
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const getCurrentStageContent = () => {
    if (!metadata?.stages?.length) {
      console.log("No stages available in metadata");
      return null;
    }

    const currentStageContent = metadata.stages.find(
      (s) => s.stage === metadata.currentStage
    );

    console.log("Getting current stage content:", {
      currentStage: metadata.currentStage,
      hasContent: !!currentStageContent?.content,
      contentLength: currentStageContent?.content?.length,
    });

    return currentStageContent?.content || null;
  };

  const handleRevise = () => {
    setIsRevising(true);
    setRevisionContext("");
  };

  const handleCancelRevision = () => {
    setIsRevising(false);
    setRevisionContext("");
  };

  const handleSubmitRevision = () => {
    if (!revisionContext.trim()) {
      setError("Please provide context for the revision");
      return;
    }

    if (!metadata?.currentStage) {
      setError("No current stage found");
      return;
    }

    console.log("Submitting revision:", {
      stage: metadata.currentStage,
      context: revisionContext,
      hasCurrentContent: !!getCurrentStageContent(),
    });

    // Send the revision request with the current stage
    generateArticle(metadata.currentStage, revisionContext);
  };

  const handleSave = async () => {
    if (!metadata) return;

    try {
      const currentContent = getCurrentStageContent();
      if (!currentContent) {
        throw new Error("No content available to save");
      }

      const response = await fetch(`/api/cars/${car._id}/article/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: currentContent,
          stage: metadata.currentStage,
          metadata: {
            ...metadata,
            _id: undefined, // Remove _id from metadata as it will be generated by MongoDB
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save article");
      }

      // Refresh saved articles list
      const savedResponse = await fetch(`/api/cars/${car._id}/article/saved`);
      if (!savedResponse.ok) {
        throw new Error("Failed to refresh saved articles");
      }
      const savedArticlesData = await savedResponse.json();
      setSavedArticles(savedArticlesData);

      toast.success("Article saved successfully");
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save article"
      );
    }
  };

  const fetchSavedArticles = async () => {
    try {
      setIsFetchingSaved(true);
      const response = await fetch(`/api/cars/${car._id}/article/saved`);
      if (!response.ok) {
        throw new Error("Failed to fetch saved articles");
      }
      const articles = await response.json();
      setSavedArticles(articles);
    } catch (error) {
      console.error("Error fetching saved articles:", error);
      setError("Failed to fetch saved articles");
    } finally {
      setIsFetchingSaved(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsFetchingSaved(true);
      try {
        const response = await fetch(`/api/cars/${car._id}/article/saved`);
        if (!response.ok) {
          throw new Error("Failed to fetch saved articles");
        }
        const savedArticlesData = await response.json();
        setSavedArticles(savedArticlesData);
      } catch (error) {
        console.error("Error fetching saved articles:", error);
        toast.error("Failed to load saved articles");
      } finally {
        setIsFetchingSaved(false);
      }
    };

    fetchInitialData();
  }, [car._id]);

  const handleViewSaved = (article: SavedArticle) => {
    setSelectedSavedArticle(article);
    setIsViewingSaved(true);
  };

  const handleReturnToCurrent = () => {
    setSelectedSavedArticle(null);
    setIsViewingSaved(false);
  };

  const handleDeleteSaved = async (article: SavedArticle) => {
    if (!confirm("Are you sure you want to delete this saved article?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/cars/${car._id}/article/saved/${article.metadata.sessionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete saved article");
      }

      // Refresh saved articles list
      const savedResponse = await fetch(`/api/cars/${car._id}/article/saved`);
      if (!savedResponse.ok) {
        throw new Error("Failed to refresh saved articles");
      }
      const savedArticlesData = await savedResponse.json();
      setSavedArticles(savedArticlesData);

      // If the deleted article was selected, clear the selection
      if (
        selectedSavedArticle?.metadata.sessionId === article.metadata.sessionId
      ) {
        setSelectedSavedArticle(null);
      }

      toast.success("Article deleted successfully");
    } catch (error) {
      console.error("Error deleting saved article:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete saved article"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      {metadata && !isViewingSaved && (
        <div className="bg-background-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {stages.map((stage, index) => {
                const isCurrentStage = metadata.currentStage === stage;
                const isPastStage =
                  stages.indexOf(metadata.currentStage) > index;
                const isActiveStage = progress?.stage === stage;
                return (
                  <div
                    key={stage}
                    className={cn(
                      "flex items-center gap-2",
                      isCurrentStage && "text-accent-primary",
                      isPastStage && "text-text-secondary",
                      !isCurrentStage && !isPastStage && "text-text-tertiary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isGenerating && isActiveStage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            isCurrentStage && "bg-accent-primary",
                            isPastStage && "bg-text-secondary",
                            !isCurrentStage &&
                              !isPastStage &&
                              "bg-text-tertiary"
                          )}
                        />
                      )}
                      <span className="text-sm font-medium capitalize">
                        {stage}
                      </span>
                    </div>
                    {index < stages.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    )}
                  </div>
                );
              })}
            </div>
            {isGenerating && progress && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progress.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Panel - Content */}
        <div className="w-full md:w-2/3 space-y-6">
          {isGenerating && progress && (
            <div className="bg-background-secondary border border-border-primary rounded-lg p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
                <div>
                  <h3 className="font-medium capitalize">
                    {progress.stage} in Progress
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {progress.message}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {stageDescriptions[progress.stage].details.map(
                  (detail, index) => (
                    <div
                      key={index}
                      className="h-4 bg-background-tertiary rounded animate-pulse"
                    />
                  )
                )}
              </div>
            </div>
          )}

          {(metadata || selectedSavedArticle) && (
            <div className="space-y-6">
              {isViewingSaved && selectedSavedArticle && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Clock className="w-4 h-4" />
                    Viewing saved version from{" "}
                    {new Date(selectedSavedArticle.createdAt).toLocaleString()}
                  </div>
                  <Button variant="ghost" onClick={handleReturnToCurrent}>
                    Return to Current Version
                  </Button>
                </div>
              )}

              <div className="border border-border-primary rounded-lg p-6">
                <MarkdownViewer
                  content={
                    isViewingSaved && selectedSavedArticle
                      ? selectedSavedArticle.content
                      : getCurrentStageContent() || ""
                  }
                  filename={
                    isViewingSaved && selectedSavedArticle
                      ? `${selectedSavedArticle.stage}-stage-${new Date(
                          selectedSavedArticle.createdAt
                        ).getTime()}.md`
                      : metadata?.sessionId
                      ? `${metadata.currentStage}-stage-${metadata.sessionId}.md`
                      : "article.md"
                  }
                />
              </div>

              {!isViewingSaved && !isRevising && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button onClick={handleRevise} variant="outline">
                      Request Revision
                    </Button>
                    <Button onClick={handleSave} variant="outline">
                      Save Version
                    </Button>
                  </div>
                  {metadata &&
                    metadata.currentStage !== "polishing" &&
                    !isGenerating && (
                      <Button
                        onClick={() =>
                          generateArticle(getNextStage(metadata.currentStage))
                        }
                        className="flex items-center gap-2"
                      >
                        Next Stage
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Revision Form */}
          {isRevising && (
            <div className="space-y-4">
              <div className="p-4 border border-border-primary rounded-lg">
                <h3 className="font-medium mb-2">Current Content</h3>
                <div className="max-h-[300px] overflow-y-auto border border-border-primary rounded-lg p-4 bg-background-secondary">
                  <MarkdownViewer
                    content={getCurrentStageContent() || ""}
                    filename="current-content.md"
                  />
                </div>
              </div>

              <Textarea
                value={revisionContext}
                onChange={(e) => setRevisionContext(e.target.value)}
                placeholder="Enter your revision instructions..."
                className="min-h-[100px]"
              />

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleCancelRevision}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRevision}
                  disabled={!revisionContext.trim()}
                >
                  Submit Revision
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert
              variant={
                error.includes("successfully") ? "default" : "destructive"
              }
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Right Panel - Controls */}
        <div className="w-full md:w-1/3 space-y-8">
          {/* Process Overview */}
          <div className="bg-background-secondary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Current Stage</h3>
              {metadata && (
                <span className="text-sm text-text-secondary capitalize">
                  {metadata.currentStage}
                </span>
              )}
            </div>
            {metadata && (
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  {stageDescriptions[metadata.currentStage].description}
                </p>
                <ul className="text-xs text-text-tertiary space-y-1">
                  {stageDescriptions[metadata.currentStage].details.map(
                    (detail, i) => (
                      <li key={i} className="flex items-center">
                        <span className="w-1 h-1 bg-text-tertiary rounded-full mr-2" />
                        {detail}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Model Selection and Controls */}
          <div className="flex flex-col gap-4">
            <ModelSelector
              value={selectedModel}
              onChange={(value) => setSelectedModel(value as ModelType)}
              focus={focus}
              onFocusChange={setFocus}
            />
            {!isGenerating && !isRevising && !isViewingSaved && (
              <Button
                onClick={() => generateArticle("planning")}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2"
              >
                {isGenerating ? (
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
            )}
          </div>

          {/* Saved Articles Section */}
          {!isGenerating && !isRevising && savedArticles.length > 0 && (
            <div className="border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Saved Versions
                </h3>
              </div>

              {isFetchingSaved ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {savedArticles.map((article, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-background-secondary rounded-md hover:bg-background-tertiary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium capitalize">
                            {article.stage} Version
                          </span>
                          <span className="text-xs text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(article.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSaved(article)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSaved(article)}
                          className="text-accent-error hover:text-accent-error/90 hover:bg-accent-error/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
