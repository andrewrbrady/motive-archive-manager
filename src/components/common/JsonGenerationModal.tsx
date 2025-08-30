"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Wand2,
  Copy,
  CheckCircle,
  Eye,
  FileText,
  Pencil,
  Check,
  X,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ICaptionPrompt } from "@/models/CaptionPrompt";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { PromptEditModal } from "@/components/projects/caption-generator/PromptEditModal";
import type { PromptTemplate } from "@/components/projects/caption-generator/types";
import type { ProviderId } from "@/lib/llmProviders";
import { useAPI } from "@/hooks/useAPI";

interface JsonGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (jsonText: string) => void;
  carData?: {
    make?: string;
    model?: string;
    year?: number;
    [key: string]: any;
  };
}

type ViewMode = "preview" | "saved";

interface SavedJson {
  _id: string;
  content: string;
  context: string;
  createdAt: string;
}

interface SystemPrompt {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  type: string;
  prompt: string;
}

export default function JsonGenerationModal({
  isOpen,
  onClose,
  onGenerated,
  carData,
}: JsonGenerationModalProps) {
  const { user } = useFirebaseAuth();
  const api = useAPI();

  // Template and generation state
  const [promptTemplates, setPromptTemplates] = useState<ICaptionPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [additionalContext, setAdditionalContext] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // System prompts state
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] =
    useState<string>("");
  const [loadingSystemPrompts, setLoadingSystemPrompts] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(
    null
  );

  // Form state for prompt template values
  const [formTone, setFormTone] = useState("professional");
  const [formStyle, setFormStyle] = useState("descriptive");
  const [formPlatform] = useState("JSON"); // Fixed to JSON
  const [formModel, setFormModel] = useState("claude-3-5-sonnet-20241022");
  const [formProvider, setFormProvider] = useState<ProviderId>("anthropic");
  const [formTemperature, setFormTemperature] = useState(0.7);

  // Preview and editing state
  const [generatedJson, setGeneratedJson] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [previewEditText, setPreviewEditText] = useState("");

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // LLM Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [editableLLMText, setEditableLLMText] = useState<string>("");

  // Prompt editing state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [modalModel, setModalModel] = useState("claude-3-5-sonnet-20241022");
  const [modalProvider, setModalProvider] = useState<ProviderId>("anthropic");
  const [modalTemperature, setModalTemperature] = useState(0.7);

  // Saved content state
  const [savedJsons, setSavedJsons] = useState<SavedJson[]>([]);
  const [editingJsonId, setEditingJsonId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Fetch JSON prompt templates
  const fetchJsonPrompts = useCallback(async () => {
    if (!api) return;

    try {
      setLoading(true);
      const prompts = (await api.get(
        "caption-prompts?platform=JSON"
      )) as ICaptionPrompt[];

      // Filter for templates that use the "JSON" platform
      const jsonPrompts = prompts.filter(
        (prompt: ICaptionPrompt) => prompt.platform === "JSON"
      );

      setPromptTemplates(jsonPrompts);

      // Auto-select the first available prompt
      if (jsonPrompts.length > 0) {
        setSelectedPromptId(String(jsonPrompts[0]._id));
      }
    } catch (error) {
      console.error("Error fetching JSON prompts:", error);
      toast.error("Failed to load AI prompt templates");
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Fetch saved JSONs (you'd implement this endpoint)
  const fetchSavedJsons = useCallback(async () => {
    try {
      // This would be a new endpoint for saved JSON content
      // For now, using empty array as placeholder
      setSavedJsons([]);
    } catch (error) {
      console.error("Error fetching saved JSONs:", error);
    }
  }, []);

  // Fetch system prompts with JSON filtering
  const fetchSystemPrompts = useCallback(async () => {
    if (!api) return;

    try {
      setLoadingSystemPrompts(true);
      setSystemPromptError(null);

      if (!user) {
        console.log(
          "JsonGenerationModal: No user available for fetchSystemPrompts, skipping..."
        );
        return; // Return early instead of throwing error
      }

      const data = (await api.get("system-prompts/list")) as SystemPrompt[];

      // Filter for system prompts that contain "JSON" in their name (case-insensitive)
      const jsonSystemPrompts = data.filter(
        (prompt: SystemPrompt) =>
          prompt.name && prompt.name.toLowerCase().includes("json")
      );

      setSystemPrompts(jsonSystemPrompts);

      // Auto-select the first JSON system prompt if available
      if (jsonSystemPrompts.length > 0) {
        setSelectedSystemPromptId(String(jsonSystemPrompts[0]._id));
      }
    } catch (error) {
      console.error("Error fetching system prompts:", error);
      setSystemPromptError(
        error instanceof Error
          ? error.message
          : "Failed to fetch system prompts"
      );
    } finally {
      setLoadingSystemPrompts(false);
    }
  }, [user, api]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchJsonPrompts();
      fetchSavedJsons();
      if (user) {
        fetchSystemPrompts();
      }
      setViewMode("preview");
      setGeneratedJson("");
      setIsEditingPreview(false);
      setPreviewEditText("");
      setAdditionalContext("");
      setShowPreview(false);
      setEditableLLMText("");

      // Reset form state to defaults
      setFormTone("professional");
      setFormStyle("descriptive");
      setFormModel("claude-3-5-sonnet-20241022");
      setFormProvider("anthropic");
      setFormTemperature(0.7);
    }
  }, [isOpen, fetchJsonPrompts, fetchSavedJsons, fetchSystemPrompts, user]);

  // Update form state when prompt template changes
  useEffect(() => {
    if (selectedPromptId && promptTemplates.length > 0) {
      const selectedPrompt = promptTemplates.find(
        (p) => p._id === selectedPromptId
      );
      if (selectedPrompt) {
        setFormTone(selectedPrompt.tone || "professional");
        setFormStyle(selectedPrompt.style || "descriptive");
        setFormModel(selectedPrompt.aiModel || "claude-3-5-sonnet-20241022");
        setFormProvider(
          (selectedPrompt.llmProvider as ProviderId) || "anthropic"
        );

        // Only set temperature if it's still at default value to avoid overriding user changes
        if (formTemperature === 0.7) {
          setFormTemperature(selectedPrompt.modelParams?.temperature || 0.7);
          setModalTemperature(selectedPrompt.modelParams?.temperature || 0.7);
        }
      }
    }
  }, [selectedPromptId, promptTemplates]); // Remove formTemperature from dependencies

  // Build context for AI generation
  const buildGenerationContext = useCallback(() => {
    let context = "";

    if (carData) {
      context += "EXISTING CAR DATA:\n";
      Object.entries(carData).forEach(([key, value]) => {
        if (value) {
          context += `${key}: ${value}\n`;
        }
      });
      context += "\n";
    }

    if (additionalContext.trim()) {
      context += `ADDITIONAL CONTEXT:\n${additionalContext}\n\n`;
    }

    context +=
      "Please generate a comprehensive JSON object for this car with all relevant specifications and details.";

    return context;
  }, [carData, additionalContext]);

  // Build LLM text for preview
  const buildLLMText = useCallback(() => {
    if (!selectedSystemPromptId || !selectedPromptId) return "";

    let llmText = "";

    // Add system prompt context
    const systemPrompt = systemPrompts.find(
      (p) => p._id === selectedSystemPromptId
    );
    if (systemPrompt) {
      llmText += `SYSTEM PROMPT: ${systemPrompt.name}\n`;
      llmText += `${systemPrompt.prompt}\n\n`;
    }

    // Add prompt template context
    const promptTemplate = promptTemplates.find(
      (p) => p._id === selectedPromptId
    );
    if (promptTemplate) {
      llmText += `PROMPT TEMPLATE: ${promptTemplate.name}\n`;
      llmText += `${promptTemplate.prompt}\n\n`;
    }

    // Add context from user input
    const generationContext = buildGenerationContext();
    if (generationContext) {
      llmText += `CONTEXT:\n${generationContext}\n\n`;
    }

    // Add car details if available
    if (carData && Object.keys(carData).some((key) => carData[key])) {
      llmText += "CAR DETAILS:\n";
      Object.entries(carData).forEach(([key, value]) => {
        if (value) {
          llmText += `${key.replace("_", " ").toUpperCase()}: ${value}\n`;
        }
      });
      llmText += "\n";
    }

    // Add generation settings
    llmText += "GENERATION SETTINGS:\n";
    llmText += `Platform: JSON\n`;
    llmText += `Tone: ${formTone}\n`;
    llmText += `Style: ${formStyle}\n`;
    llmText += `Length: ${promptTemplate?.length || "standard"}\n`;
    llmText += `Model: ${formModel}\n`;
    llmText += `Temperature: ${formTemperature}\n`;
    llmText += "\n";

    llmText +=
      "Generate a comprehensive JSON object for this car with all relevant specifications and details.";

    return llmText;
  }, [
    selectedSystemPromptId,
    selectedPromptId,
    systemPrompts,
    promptTemplates,
    buildGenerationContext,
    carData,
    formTone,
    formStyle,
    formModel,
    formTemperature,
  ]);

  // LLM Preview handlers
  const handleShowPreviewToggle = useCallback(() => {
    if (!showPreview) {
      // Generate the LLM text when opening preview
      const generatedText = buildLLMText();
      setEditableLLMText(generatedText);
    }
    setShowPreview(!showPreview);
  }, [showPreview, buildLLMText]);

  const handleRefreshLLMText = useCallback(() => {
    const generatedText = buildLLMText();
    setEditableLLMText(generatedText);
  }, [buildLLMText]);

  // Helper function to strip markdown code fences
  const stripCodeFences = useCallback((text: string): string => {
    // Remove ```json at the start and ``` at the end
    return text
      .replace(/^```(?:json|JSON)?\s*\n?/, "") // Remove opening fence
      .replace(/\n?\s*```\s*$/, "") // Remove closing fence
      .trim();
  }, []);

  // Prompt editing handlers
  const handleEditPrompt = useCallback(() => {
    const selectedPrompt = promptTemplates.find(
      (p) => p._id === selectedPromptId
    );
    if (selectedPrompt) {
      // Update modal state from selected prompt
      setModalModel(selectedPrompt.aiModel || formModel);
      setModalProvider(
        (selectedPrompt.llmProvider as ProviderId) || formProvider
      );
      setModalTemperature(
        selectedPrompt.modelParams?.temperature || formTemperature
      );

      // Update form state from selected prompt
      setFormTone(selectedPrompt.tone || "professional");
      setFormStyle(selectedPrompt.style || "descriptive");
      setFormModel(selectedPrompt.aiModel || "claude-3-5-sonnet-20241022");
      setFormProvider(
        (selectedPrompt.llmProvider as ProviderId) || "anthropic"
      );
      setFormTemperature(selectedPrompt.modelParams?.temperature || 0.7);

      setIsCreatingPrompt(false);
      setIsPromptModalOpen(true);
    }
  }, [
    selectedPromptId,
    promptTemplates,
    formModel,
    formProvider,
    formTemperature,
  ]);

  const handleNewPrompt = useCallback(() => {
    // Reset to defaults for new prompt
    setModalModel("claude-3-5-sonnet-20241022");
    setModalProvider("anthropic");
    setModalTemperature(0.7);
    setFormTone("professional");
    setFormStyle("descriptive");
    setFormModel("claude-3-5-sonnet-20241022");
    setFormProvider("anthropic");
    setFormTemperature(0.7);
    setIsCreatingPrompt(true);
    setIsPromptModalOpen(true);
  }, []);

  const handlePromptSaved = useCallback(
    async (prompt: PromptTemplate) => {
      try {
        // Refresh the prompts list to include the new/updated prompt
        await fetchJsonPrompts();

        // Select the saved prompt
        setSelectedPromptId(prompt._id);

        // Update form state with saved prompt values
        setFormTone(prompt.tone || "professional");
        setFormStyle(prompt.style || "descriptive");
        setFormModel(prompt.aiModel || "claude-3-5-sonnet-20241022");
        setFormProvider((prompt.llmProvider as ProviderId) || "anthropic");
        setFormTemperature(prompt.modelParams?.temperature || 0.7);
        setModalTemperature(prompt.modelParams?.temperature || 0.7);

        // Close the modal
        setIsPromptModalOpen(false);

        toast.success(
          isCreatingPrompt
            ? "Prompt created successfully!"
            : "Prompt updated successfully!"
        );
      } catch (error) {
        console.error("Error after prompt save:", error);
      }
    },
    [fetchJsonPrompts, isCreatingPrompt]
  );

  const updateFormFromPromptValues = useCallback(
    (values: {
      context: string;
      tone: string;
      style: string;
      platform: string;
      model: string;
      provider: string;
      temperature: number;
    }) => {
      // Update all form state
      setAdditionalContext(values.context || "");
      setFormTone(values.tone || "professional");
      setFormStyle(values.style || "descriptive");
      setFormModel(values.model || "claude-3-5-sonnet-20241022");
      setFormProvider((values.provider as ProviderId) || "anthropic");
      setFormTemperature(values.temperature || 0.7);

      // Also update modal state to keep them in sync
      setModalModel(values.model || "claude-3-5-sonnet-20241022");
      setModalProvider((values.provider as ProviderId) || "anthropic");
      setModalTemperature(values.temperature || 0.7);
    },
    []
  );

  // Enhanced temperature change handler
  const handleTemperatureChange = useCallback((newTemperature: number) => {
    setFormTemperature(newTemperature);
    setModalTemperature(newTemperature);
  }, []);

  // Enhanced model change handler
  const handleModelChange = useCallback((newModel: string) => {
    setFormModel(newModel);
    setModalModel(newModel);
  }, []);

  // Enhanced provider change handler
  const handleProviderChange = useCallback((newProvider: ProviderId) => {
    setFormProvider(newProvider);
    setModalProvider(newProvider);
  }, []);

  // Convert ICaptionPrompt to PromptTemplate format
  const convertToPromptTemplate = useCallback(
    (prompt: ICaptionPrompt): PromptTemplate => {
      return {
        _id: String(prompt._id),
        name: prompt.name,
        prompt: prompt.prompt,
        aiModel: prompt.aiModel,
        llmProvider: prompt.llmProvider,
        platform: prompt.platform,
        tone: prompt.tone,
        style: prompt.style,
        length: prompt.length,
        modelParams: prompt.modelParams,
      };
    },
    []
  );

  // Generate JSON with AI
  const handleGenerate = async () => {
    if (!api) {
      toast.error("API not available");
      return;
    }

    if (!selectedPromptId) {
      toast.error("Please select a prompt template");
      return;
    }

    if (!selectedSystemPromptId) {
      toast.error("Please select a system prompt");
      return;
    }

    const selectedPrompt = promptTemplates.find(
      (p) => p._id === selectedPromptId
    );
    if (!selectedPrompt) {
      toast.error("Selected prompt template not found");
      return;
    }

    try {
      setGenerating(true);

      // Prepare car details in the expected format
      const combinedCarDetails = carData
        ? {
            count: 1,
            cars: [carData],
            makes: carData.make ? [carData.make] : [],
            years: carData.year ? [carData.year] : [],
            colors: carData.color ? [carData.color] : [],
          }
        : {
            count: 0,
            cars: [],
            makes: [],
            years: [],
            colors: [],
          };

      // Empty event details since this is for new car creation
      const combinedEventDetails = {
        count: 0,
        events: [],
        types: [],
        upcomingEvents: [],
        pastEvents: [],
      };

      // Use custom LLM text if preview is shown, otherwise build context
      const context =
        showPreview && editableLLMText
          ? editableLLMText
          : buildGenerationContext();

      // Prepare the request payload to match the existing API
      const requestPayload = {
        platform: "JSON", // Using JSON platform
        context: context,
        clientInfo: null,
        carDetails: combinedCarDetails,
        eventDetails: combinedEventDetails,
        temperature: formTemperature,
        tone: formTone,
        style: formStyle,
        length: selectedPrompt.length || "standard",
        template: selectedPrompt.prompt,
        aiModel: formModel,
        projectId: "", // Empty for individual car
        selectedCarIds: carData ? ["temp-car-id"] : [],
        selectedEventIds: [],
        systemPromptId: selectedSystemPromptId,
        useMinimalCarData: false,
      };

      const result = await api.post(
        "openai/generate-project-caption",
        requestPayload
      );
      const cleanedJson = stripCodeFences((result as any).caption); // Strip markdown code fences
      setGeneratedJson(cleanedJson);
      setViewMode("preview");
      toast.success("JSON generated successfully!");
    } catch (error) {
      console.error("Error generating JSON:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate JSON. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  // Copy functionality
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("JSON copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Preview editing
  const handleStartPreviewEdit = () => {
    setPreviewEditText(generatedJson);
    setIsEditingPreview(true);
  };

  const handleCancelPreviewEdit = () => {
    setIsEditingPreview(false);
    setPreviewEditText("");
  };

  const handleSavePreviewEdit = () => {
    setIsEditingPreview(false);
    setGeneratedJson(previewEditText);
  };

  // Save content functionality (placeholder)
  const handleSaveContent = async () => {
    try {
      // This would save to a new endpoint for JSON content
      toast.success("JSON saved successfully!");
      fetchSavedJsons();
      setViewMode("saved");
    } catch (error) {
      console.error("Error saving JSON:", error);
      toast.error("Failed to save JSON");
    }
  };

  // Use generated JSON
  const handleUseGenerated = () => {
    const textToUse = getCurrentPreviewText();
    if (!textToUse.trim()) {
      toast.error("No JSON to use");
      return;
    }

    onGenerated(textToUse);
    handleClose();
  };

  const handleClose = () => {
    setGeneratedJson("");
    setAdditionalContext("");
    setCopiedId(null);
    setIsEditingPreview(false);
    setPreviewEditText("");
    setViewMode("preview");
    setSelectedPromptId("");
    setSelectedSystemPromptId("");
    setShowPreview(false);
    setEditableLLMText("");
    setIsPromptModalOpen(false);
    setIsCreatingPrompt(false);

    // Reset form state
    setFormTone("professional");
    setFormStyle("descriptive");
    setFormModel("claude-3-5-sonnet-20241022");
    setFormProvider("anthropic");
    setFormTemperature(0.7);

    onClose();
  };

  const getCurrentPreviewText = () => {
    const text = isEditingPreview ? previewEditText : generatedJson;
    return stripCodeFences(text);
  };

  // Handle loading state when API is not available
  if (!api) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Generate Car JSON with AI
            </DialogTitle>
            <DialogDescription>Loading...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Generate Car JSON with AI
          </DialogTitle>
          <DialogDescription>
            Use AI to generate comprehensive car specifications in JSON format.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-120px)]">
          {/* Left Column - Configuration */}
          <div className="space-y-6 overflow-y-auto pr-1">
            {/* Prompt Template Selection */}
            <div className="pb-4 border-b border-border-primary">
              <div className="pb-2 text-sm font-medium text-text-primary">AI Prompt Template</div>
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading prompt templates...
                  </div>
                ) : promptTemplates.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No JSON prompt templates found. Please create one with
                    platform "JSON" in the admin panel.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                      <Select
                        value={selectedPromptId}
                        onValueChange={setSelectedPromptId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a prompt template" />
                        </SelectTrigger>
                        <SelectContent>
                          {promptTemplates.map((prompt) => (
                            <SelectItem
                              key={String(prompt._id)}
                              value={String(prompt._id)}
                            >
                              {prompt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditPrompt}
                        disabled={!selectedPromptId}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNewPrompt}
                      >
                        New
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* System Prompt Selection */}
            <div className="pb-4 border-b border-border-primary">
              <div className="pb-2 text-sm font-medium text-text-primary">System Prompt</div>
              <div className="space-y-3">
                {loadingSystemPrompts ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading system prompts...
                  </div>
                ) : systemPromptError ? (
                  <div className="text-sm text-destructive">
                    {systemPromptError}
                  </div>
                ) : systemPrompts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No JSON system prompts found. Please create one with "JSON"
                    in the name.
                  </div>
                ) : (
                  <Select
                    value={selectedSystemPromptId}
                    onValueChange={setSelectedSystemPromptId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a system prompt" />
                    </SelectTrigger>
                    <SelectContent>
                      {systemPrompts.map((prompt) => (
                        <SelectItem
                          key={String(prompt._id)}
                          value={String(prompt._id)}
                        >
                          {prompt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* LLM Preview */}
            <div className="pb-4 border-b border-border-primary">
              <div className="flex items-center justify-between pb-2">
                <div className="text-sm font-medium text-text-primary">LLM Preview</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowPreviewToggle}
                    disabled={!selectedPromptId || !selectedSystemPromptId}
                  >
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </Button>
                  {showPreview && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshLLMText}
                    >
                      Refresh
                    </Button>
                  )}
                </div>
              </div>
              {showPreview && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Preview and edit what will be sent to the AI model:
                  </Label>
                  <Textarea
                    value={editableLLMText}
                    onChange={(e) => setEditableLLMText(e.target.value)}
                    placeholder="LLM preview will appear here..."
                    className="min-h-[220px] font-mono text-xs resize-none"
                  />
                </div>
              )}
            </div>

            {/* Additional Context */}
            <div className="pb-4 border-b border-border-primary">
              <div className="pb-2 text-sm font-medium text-text-primary">Additional Context</div>
              <Textarea
                placeholder="Provide any additional details about the car (special features, modifications, history, etc.)"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>

            {/* Existing Car Data Display */}
            {carData && Object.keys(carData).some((key) => carData[key]) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Existing Car Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {Object.entries(carData).map(
                      ([key, value]) =>
                        value && (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium capitalize">
                              {key.replace("_", " ")}:
                            </span>
                            <span className="text-muted-foreground">
                              {String(value)}
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generation Controls */}
            <div className="space-y-3">
              <Button
                onClick={handleGenerate}
                disabled={
                  generating ||
                  !selectedPromptId ||
                  !selectedSystemPromptId ||
                  promptTemplates.length === 0
                }
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate JSON
                  </>
                )}
              </Button>

              {generatedJson && (
                <Button
                  onClick={handleUseGenerated}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use Generated JSON
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Preview and Saved Content */}
          <div className="flex flex-col h-full max-h-[calc(90vh-160px)]">
            {/* Mode Toggle Buttons */}
            <div className="flex gap-2 mb-4 flex-shrink-0">
              <Button
                variant={viewMode === "preview" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("preview")}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button
                variant={viewMode === "saved" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("saved")}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Saved ({savedJsons.length})
              </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {viewMode === "preview" && (
                <div className="h-full flex flex-col">
                  {generatedJson ? (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium">
                          Generated JSON Preview
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCopy(getCurrentPreviewText(), "preview")
                            }
                          >
                            {copiedId === "preview" ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          {isEditingPreview ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSavePreviewEdit}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelPreviewEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStartPreviewEdit}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSaveContent}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 border rounded-lg overflow-hidden min-h-[400px] max-h-[500px]">
                        {isEditingPreview ? (
                          <Textarea
                            value={previewEditText}
                            onChange={(e) => setPreviewEditText(e.target.value)}
                            className="h-full w-full resize-none border-none font-mono text-sm focus:ring-0 focus:outline-none"
                            placeholder="Edit your JSON..."
                          />
                        ) : (
                          <div className="h-full overflow-auto p-4 font-mono text-sm whitespace-pre-wrap bg-muted/30">
                            {generatedJson}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Generate JSON to see preview</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewMode === "saved" && (
                <div className="h-full overflow-auto">
                  {savedJsons.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No saved JSON content yet</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedJsons.map((savedJson) => (
                        <Card key={savedJson._id} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                savedJson.createdAt
                              ).toLocaleDateString()}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopy(savedJson.content, savedJson._id)
                                }
                              >
                                {copiedId === savedJson._id ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="font-mono text-xs bg-muted/30 p-2 rounded max-h-32 overflow-auto">
                            {savedJson.content.substring(0, 200)}...
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Modal for Editing or Creating Prompts */}
      <PromptEditModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        isCreating={isCreatingPrompt}
        selectedPrompt={
          selectedPromptId
            ? (() => {
                const prompt = promptTemplates.find(
                  (p) => p._id === selectedPromptId
                );
                return prompt ? convertToPromptTemplate(prompt) : null;
              })()
            : null
        }
        model={formModel}
        provider={formProvider}
        temperature={modalTemperature}
        clientHandle={null}
        onPromptSaved={handlePromptSaved}
        onModelChange={handleModelChange}
        onProviderChange={handleProviderChange}
        onTemperatureChange={handleTemperatureChange}
        onFormValuesUpdate={updateFormFromPromptValues}
        currentFormValues={{
          context: additionalContext,
          platform: formPlatform,
          tone: formTone,
          style: formStyle,
        }}
      />
    </Dialog>
  );
}
