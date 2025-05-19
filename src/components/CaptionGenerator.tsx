"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCw,
  Pencil,
  Trash2,
  Copy,
  Check,
  Instagram,
  Youtube,
  X,
} from "lucide-react";
import {
  getRandomQuestion,
  formatQuestion,
} from "@/constants/question-examples";
import type { BaTCarDetails } from "@/types/car-page";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import PromptForm, { PromptFormData } from "@/components/admin/PromptForm";
import { Switch } from "@/components/ui/switch";
import {
  getAllModels,
  llmProviders,
  ProviderId,
  findModelById,
} from "@/lib/llmProviders";

type Platform = "instagram" | "youtube";
type Template = "none" | "bat" | "dealer" | "question";
type Tone = "professional" | "casual" | "enthusiastic" | "technical";
type Style = "descriptive" | "minimal" | "storytelling";
type Length = "concise" | "standard" | "detailed" | "comprehensive";

const TEMPLATE_CONTEXTS = {
  none: "",
  dealer: "", // This will be dynamically set based on the client's Instagram handle
  bat: "", // This will be dynamically set based on the client's Instagram handle
};

interface CaptionGeneratorProps {
  carId: string;
}

const generateQuestion = async (carDetails: BaTCarDetails) => {
  // Instead of calling the API, directly use our question generator
  const randomQuestion = getRandomQuestion();
  return formatQuestion(randomQuestion, {
    year: carDetails.year,
    make: carDetails.make,
    model: carDetails.model,
    // Optionally add a feature if we want to highlight something specific
    // feature: carDetails.engine?.type || carDetails.color
  });
};

// Function to fetch client's Instagram handle
const fetchClientInstagram = async (clientId: string) => {
  try {
    const response = await fetch(`/api/clients/${clientId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch client");
    }
    const client = await response.json();
    return client.socialMedia?.instagram
      ? `@${client.socialMedia.instagram.replace(/^@/, "")}`
      : null;
  } catch (error) {
    console.error("Error fetching client Instagram:", error);
    return null;
  }
};

export default function CaptionGenerator({ carId }: CaptionGeneratorProps) {
  const [carDetails, setCarDetails] = useState<BaTCarDetails | null>(null);
  const [carLoading, setCarLoading] = useState(true);
  const [carError, setCarError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [template, setTemplate] = useState<Template>("none");
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(1.0);
  const [tone, setTone] = useState<Tone>("professional");
  const [style, setStyle] = useState<Style>("descriptive");
  const [length, setLength] = useState<Length>("concise");
  const [savedCaptions, setSavedCaptions] = useState<
    Array<{
      _id: string;
      platform: string;
      context: string;
      caption: string;
      createdAt: string;
    }>
  >([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  // Modal state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptList, setPromptList] = useState<any[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);
  const [isPromptSubmitting, setIsPromptSubmitting] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  // Add model state
  const [model, setModel] = useState<string>("claude-3-5-sonnet-20241022");
  // Client info state
  const [clientHandle, setClientHandle] = useState<string | null>(null);
  const [includeClientHandle, setIncludeClientHandle] = useState(false);
  // Add provider state
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  // Get all available models
  const allModels = getAllModels();

  // Group models by provider for UI display
  const modelsByProvider = Object.values(llmProviders).map((provider) => ({
    provider: provider,
    models: provider.models,
  }));

  // Fetch car details and client handle when carId changes
  useEffect(() => {
    const fetchCarDetails = async () => {
      setCarLoading(true);
      setCarError(null);
      try {
        const response = await fetch(`/api/cars/${carId}`);
        if (!response.ok) throw new Error("Failed to fetch car details");
        const data = await response.json();
        setCarDetails(data);
        // Try to get clientId from car details
        const clientId = data.client || data.clientId || data.clientInfo?._id;
        if (clientId) {
          const clientRes = await fetch(`/api/clients/${clientId}`);
          if (clientRes.ok) {
            const client = await clientRes.json();
            if (client.socialMedia?.instagram) {
              setClientHandle(
                `@${client.socialMedia.instagram.replace(/^@/, "")}`
              );
            } else {
              setClientHandle(null);
            }
          } else {
            setClientHandle(null);
          }
        } else {
          setClientHandle(null);
        }
      } catch (err) {
        setCarError(
          err instanceof Error ? err.message : "Failed to fetch car details"
        );
        setClientHandle(null);
      } finally {
        setCarLoading(false);
      }
    };
    fetchCarDetails();
  }, [carId]);

  // Fetch existing captions when component mounts
  useEffect(() => {
    const fetchCaptions = async () => {
      try {
        const response = await fetch(`/api/captions?carId=${carId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch captions");
        }
        const captions = await response.json();
        setSavedCaptions(captions);
      } catch (err) {
        console.error("Error fetching captions:", err);
      }
    };

    fetchCaptions();
  }, [carId]);

  // Fetch prompts when component mounts (was previously on modal open)
  useEffect(() => {
    setPromptLoading(true);
    setPromptError(null);
    fetch("/api/caption-prompts")
      .then((res) => res.json())
      .then((data) => {
        setPromptList(Array.isArray(data) ? data : []);
        // If no prompt is selected yet, and we have prompts, try to load default
        // This logic will be refined in the default prompt loading useEffect
      })
      .catch((err) => setPromptError("Failed to fetch prompts"))
      .finally(() => setPromptLoading(false));
  }, []); // Fetch once on mount

  // When a prompt is selected, update local state for prompt/model
  useEffect(() => {
    if (selectedPrompt) {
      setContext(selectedPrompt.prompt);
      setTone(selectedPrompt.tone);
      setStyle(selectedPrompt.style);
      setLength(selectedPrompt.length);
      setPlatform(selectedPrompt.platform);
      setModel(selectedPrompt.aiModel);

      // Ensure the provider is updated based on the selected prompt's AI model
      const modelDetails = findModelById(selectedPrompt.aiModel);
      if (modelDetails) {
        setProvider(modelDetails.provider.id as ProviderId);
      } else if (selectedPrompt.llmProvider) {
        // Fallback to llmProvider field on prompt if it exists
        setProvider(selectedPrompt.llmProvider as ProviderId);
      }
      // If neither is found, the provider remains unchanged, which might be an issue
      // if the model is from a new, unrecognised provider or the prompt data is incomplete.
      // However, llmProviders should be the source of truth for models.
    }
  }, [selectedPrompt]);

  // Automatically load the default prompt for the current platform on mount or when platform changes
  useEffect(() => {
    // Only load default if no prompt is selected AND the main list has potentially loaded.
    if (selectedPrompt || promptLoading) return;

    // If promptList is empty after loading, don't attempt to fetch default (unless API handles it)
    // For now, let's assume if promptList is empty, we wait for user to create one.
    // Or, if the default prompt API is robust, this check isn't strictly needed.
    // if (promptList.length === 0 && !promptLoading) return;

    fetch(`/api/caption-prompts?defaultOnly=true&platform=${platform}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data._id) {
          // Check if a prompt is already selected by the user, if so, don't override.
          // This condition is now at the start of the useEffect.
          setSelectedPrompt(data);
          setContext(data.prompt);
          setTone(data.tone);
          setStyle(data.style);
          setLength(data.length);
          // setPlatform(data.platform); // Careful: This could cause a loop if data.platform is different
          setModel(data.aiModel);
          const modelDetails = findModelById(data.aiModel);
          if (modelDetails) {
            setProvider(modelDetails.provider.id as ProviderId);
          } else if (data.llmProvider) {
            setProvider(data.llmProvider as ProviderId);
          }
        }
      })
      .catch(() => {
        // Silently fail or set an error state if default prompt loading is critical
        console.warn(`No default prompt found for platform: ${platform}`);
      });
  }, [platform, selectedPrompt, promptLoading]); // Ensure all relevant dependencies are here. `promptList` was considered but might cause too many re-runs.

  const handleGenerate = async (_captionId?: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      let contextToUse = context;

      // Always send the context as the prompt, regardless of client handle
      console.log("Debug - sending prompt:", contextToUse);

      const clientInfo =
        includeClientHandle && clientHandle
          ? {
              handle: clientHandle,
              includeInCaption: true,
            }
          : null;

      // Log what's being sent for debugging
      console.log("Generating caption with:", {
        platform,
        context: contextToUse,
        clientInfo,
        model,
        carDetails: {
          year: carDetails?.year,
          make: carDetails?.make,
          model: carDetails?.model,
        },
      });

      // Generate new caption text
      const response = await fetch("/api/openai/generate-caption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          context: contextToUse,
          clientInfo,
          carDetails: {
            _id: carDetails?._id,
            year: carDetails?.year,
            make: carDetails?.make,
            model: carDetails?.model,
            color: carDetails?.color,
            engine: carDetails?.engine,
            mileage: carDetails?.mileage,
            description: carDetails?.description || "",
          },
          temperature,
          tone,
          style,
          length,
          template,
          aiModel: model,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate caption");
      }

      const data = await response.json();

      // If we're editing, update the existing caption
      if (_captionId) {
        const updateResponse = await fetch(`/api/captions?id=${_captionId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform,
            context,
            caption: data.caption,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update caption");
        }

        // Update the caption in the local state
        setSavedCaptions((prev) =>
          prev.map((caption) =>
            caption._id === _captionId
              ? {
                  ...caption,
                  caption: data.caption,
                  platform,
                  context,
                }
              : caption
          )
        );
        setGeneratedCaption(""); // Clear the generated caption since it's now saved
        setEditingCaptionId(null); // Reset editing state
      } else {
        // Save new caption to MongoDB with car association
        const saveResponse = await fetch("/api/captions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform,
            carId: carDetails?._id,
            context,
            caption: data.caption,
          }),
        });

        if (!saveResponse.ok) {
          throw new Error("Failed to save caption to database");
        }

        // Add the new caption to the saved captions list
        const { caption: savedCaption } = await saveResponse.json();
        setSavedCaptions((prev) => [savedCaption, ...prev]);
        setGeneratedCaption(""); // Clear the generated caption since it's now saved
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateChange = async (value: Template) => {
    setTemplate(value);
    if (value === "question") {
      const question = await generateQuestion(carDetails!);
      setContext(question);
    } else if (value === "dealer") {
      setContext("This car is now available from our friends at [DEALER]");
    } else if (value === "bat") {
      setContext(
        "This car is currently live from our friends [DEALER] on @bringatrailer. Follow the link in our bio to view the auction."
      );
    } else {
      setContext(TEMPLATE_CONTEXTS[value]);
    }
  };

  const handleDelete = async (captionId: string) => {
    try {
      const response = await fetch(
        `/api/captions?id=${captionId}&carId=${carDetails?._id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete caption");
      }

      // Remove the caption from the local state
      setSavedCaptions((prev) =>
        prev.filter((caption) => caption._id !== captionId)
      );
      // Clear the generated caption if it was the one being displayed
      if (
        savedCaptions.find((c) => c._id === captionId)?.caption ===
        generatedCaption
      ) {
        setGeneratedCaption("");
      }
    } catch (err) {
      console.error("Error deleting caption:", err);
    }
  };

  const handleEdit = async (captionId: string, currentCaption: string) => {
    try {
      // Find the caption we're editing
      const captionToEdit = savedCaptions.find((c) => c._id === captionId);
      if (!captionToEdit) {
        throw new Error("Caption not found");
      }

      // Update the caption directly
      const updateResponse = await fetch(`/api/captions?id=${captionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: currentCaption,
          platform: captionToEdit.platform,
          context: captionToEdit.context || "",
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update caption");
      }

      // Update the caption in the local state
      setSavedCaptions((prev) =>
        prev.map((caption) =>
          caption._id === captionId
            ? {
                ...caption,
                caption: currentCaption,
              }
            : caption
        )
      );
    } catch (err) {
      console.error("Error editing caption:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleTextChange = (text: string, _captionId: string) => {
    setEditingText(text);
  };

  const handleSaveEdit = async (captionId: string) => {
    await handleEdit(captionId, editingText);
    setEditingCaptionId(null);
    setEditingText("");
  };

  // Show a loading or error state if car details are not loaded
  if (carLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading caption generator...
      </div>
    );
  }
  if (carError) {
    return (
      <div className="py-8 text-center text-destructive-500">{carError}</div>
    );
  }
  if (!carDetails) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-white uppercase">
        Caption Generator
      </h1>
      {/* New Prompt Selection and Action Buttons */}
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2 mb-3">
        <div className="flex-grow">
          <label
            htmlFor="main-prompt-select"
            className="block text-xs font-medium mb-1 text-[hsl(var(--foreground-muted))]"
          >
            Active Prompt Template
          </label>
          <Select
            value={selectedPrompt?._id || ""}
            onValueChange={(promptId) => {
              if (promptId === "__PROMPT_NONE__") {
                setSelectedPrompt(null);
                setContext("");
                setTone("professional");
                setStyle("descriptive");
                setLength("concise");
                setModel("claude-3-5-sonnet-20241022");
                setProvider("anthropic");
                return;
              }
              const found = promptList.find((p) => p._id === promptId);
              setSelectedPrompt(found || null);
              setIsCreatingPrompt(false);
            }}
            disabled={
              promptLoading || (promptList.length === 0 && !promptError)
            }
          >
            <SelectTrigger
              id="main-prompt-select"
              className="w-full bg-transparent border-[hsl(var(--border))]"
            >
              <SelectValue
                placeholder={
                  promptLoading
                    ? "Loading prompts..."
                    : promptError
                      ? "Error loading"
                      : "Select a prompt..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              {promptError && (
                <SelectItem
                  value="__ERROR__"
                  disabled
                  className="text-destructive-500"
                >
                  Error: {promptError}
                </SelectItem>
              )}
              {!promptError && promptList.length === 0 && !promptLoading && (
                <SelectItem value="__NO_PROMPTS__" disabled>
                  No prompts. Click 'New' to create.
                </SelectItem>
              )}
              <SelectItem value="__PROMPT_NONE__">-- None --</SelectItem>
              {promptList.map((prompt) => (
                <SelectItem key={prompt._id} value={prompt._id}>
                  {prompt.name}{" "}
                  <span className="text-xs text-[hsl(var(--foreground-muted))] ml-2">
                    ({prompt.platform},{" "}
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
            if (selectedPrompt) {
              setIsCreatingPrompt(false);
              setIsPromptModalOpen(true);
            }
          }}
          disabled={!selectedPrompt}
          className="border-[hsl(var(--border))]"
        >
          Edit
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            // For a new prompt, reset relevant states to defaults
            setSelectedPrompt(null);
            setIsCreatingPrompt(true);
            setContext(""); // Default or empty context for new prompt
            setTone("professional"); // Default tone
            setStyle("descriptive"); // Default style
            setLength("concise"); // Default length
            // setPlatform("instagram"); // Keep current platform or set a default
            setModel("claude-3-5-sonnet-20241022"); // Default model
            setProvider("anthropic"); // Default provider
            setTemperature(1.0); // Default temperature
            setIsPromptModalOpen(true);
          }}
          className="border-[hsl(var(--border))]"
        >
          New
        </Button>
      </div>

      {/* Modal for Editing or Creating Prompts - Trigger is removed, controlled by buttons */}
      <Dialog
        open={isPromptModalOpen}
        onOpenChange={(isOpen) => {
          setIsPromptModalOpen(isOpen);
          if (!isOpen) {
            // Optional: Reset isCreatingPrompt if modal is closed without saving,
            // but typically form submission or cancel should handle this.
            // setIsCreatingPrompt(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {" "}
          {/* Increased width for better form layout */}
          <DialogHeader>
            <DialogTitle>
              {isCreatingPrompt
                ? "Create New Prompt Template"
                : `Edit Prompt: ${selectedPrompt?.name || "Selected Prompt"}`}
            </DialogTitle>
            <DialogDescription>
              {isCreatingPrompt
                ? "Define a new reusable prompt template for caption generation."
                : "Modify the existing prompt template, including its content, parameters, and AI model."}
            </DialogDescription>
          </DialogHeader>
          {/* Client handle switch - remains the same */}
          {clientHandle && (
            <div className="flex items-center gap-2 my-4">
              <Switch
                id="include-client-handle"
                checked={includeClientHandle}
                onCheckedChange={setIncludeClientHandle}
              />
              <label htmlFor="include-client-handle" className="text-sm">
                Make client handle ({clientHandle}) available to prompt
              </label>
            </div>
          )}
          {/* Render PromptForm only when modal is open to ensure it can pick up selectedPrompt or undefined correctly */}
          {isPromptModalOpen && (
            <PromptForm
              key={
                isCreatingPrompt
                  ? "new-prompt-form"
                  : selectedPrompt?._id || "edit-prompt-form"
              }
              prompt={
                isCreatingPrompt ? undefined : selectedPrompt || undefined
              }
              isSubmitting={isPromptSubmitting}
              onCancel={() => {
                setIsPromptModalOpen(false);
                // setIsCreatingPrompt(false); // Optionally reset, but opening "New" again will set it true
              }}
              onSubmit={async (formData) => {
                setIsPromptSubmitting(true);
                setPromptError(null); // Clear previous errors
                try {
                  const method = isCreatingPrompt ? "POST" : "PATCH";
                  const url = "/api/caption-prompts";

                  const payload: Record<string, any> = {
                    ...formData, // This should include name, prompt, tone, style, length, platform, etc. from PromptForm
                    aiModel: model, // Model from CaptionGenerator's state
                    llmProvider: provider, // Provider from CaptionGenerator's state
                    modelParams: {
                      // Params from CaptionGenerator's state
                      temperature: temperature || undefined,
                      // maxTokens: 1000, // This should ideally be part of PromptForm or a shared config
                    },
                  };

                  if (!isCreatingPrompt && selectedPrompt) {
                    payload.id = selectedPrompt._id;
                  }

                  console.log(
                    `Saving prompt (${method}) with payload:`,
                    JSON.stringify(payload, null, 2)
                  );

                  const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });

                  if (!res.ok) {
                    const errorData = await res
                      .json()
                      .catch(() => ({ message: "Failed to save prompt" }));
                    console.error(
                      "Failed to save prompt:",
                      res.status,
                      errorData
                    );
                    throw new Error(
                      errorData.message ||
                        `Failed to save prompt: ${res.status}`
                    );
                  }

                  const updatedOrCreatedPrompt = await res.json();

                  // Refresh prompt list
                  const refreshedList = await fetch(
                    "/api/caption-prompts"
                  ).then((r) => r.json());
                  setPromptList(
                    Array.isArray(refreshedList) ? refreshedList : []
                  );

                  // Update selected prompt with the newly created or edited one
                  setSelectedPrompt(updatedOrCreatedPrompt);
                  setIsCreatingPrompt(false); // Exit creation mode

                  // Update local states from the newly selected/updated prompt
                  setContext(updatedOrCreatedPrompt.prompt);
                  setTone(updatedOrCreatedPrompt.tone);
                  setStyle(updatedOrCreatedPrompt.style);
                  setLength(updatedOrCreatedPrompt.length);
                  setPlatform(updatedOrCreatedPrompt.platform);
                  setModel(updatedOrCreatedPrompt.aiModel);

                  const modelDetailsOnSave = findModelById(
                    updatedOrCreatedPrompt.aiModel
                  );
                  if (modelDetailsOnSave) {
                    setProvider(modelDetailsOnSave.provider.id as ProviderId);
                  } else if (updatedOrCreatedPrompt.llmProvider) {
                    setProvider(
                      updatedOrCreatedPrompt.llmProvider as ProviderId
                    );
                  }
                  // Temperature is already part of CaptionGenerator's state,
                  // if PromptForm can change it, that change needs to reflect back or be included in formData.
                  // For now, assuming temperature is managed in CaptionGenerator and passed to modelParams.

                  setIsPromptModalOpen(false); // Close the modal upon successful save
                } catch (err) {
                  console.error("Error saving prompt:", err);
                  setPromptError(
                    err instanceof Error
                      ? err.message
                      : "An unexpected error occurred while saving the prompt."
                  );
                  // Keep modal open to show error
                } finally {
                  setIsPromptSubmitting(false);
                }
              }}
              renderModelSelector={() => (
                <div className="space-y-4 mt-4 p-4 border border-[hsl(var(--border))] rounded-md">
                  <h3 className="text-sm font-medium text-[hsl(var(--foreground-muted))]">
                    AI Model Configuration
                  </h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      AI Provider
                    </label>
                    <select
                      className="w-full border rounded p-2 bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border))]"
                      value={provider}
                      onChange={(e) => {
                        const newProvider = e.target.value as ProviderId;
                        setProvider(newProvider);
                        const providerModels =
                          llmProviders[newProvider]?.models || [];
                        if (!providerModels.some((m) => m.id === model)) {
                          setModel(providerModels[0]?.id || "");
                        }
                      }}
                    >
                      {Object.values(llmProviders)
                        .filter((p) => p.models.length > 0)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      AI Model
                    </label>
                    <select
                      className="w-full border rounded p-2 bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border))]"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      disabled={
                        !provider ||
                        !llmProviders[provider] ||
                        llmProviders[provider].models.length === 0
                      }
                    >
                      {(llmProviders[provider]?.models || []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                      {(!provider ||
                        !llmProviders[provider] ||
                        llmProviders[provider].models.length === 0) && (
                        <option value="" disabled>
                          Select a provider with models
                        </option>
                      )}
                    </select>

                    {model && llmProviders[provider] && (
                      <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                        {llmProviders[provider].models.find(
                          (m) => m.id === model
                        )?.contextWindow
                          ? `Context: ${(llmProviders[provider].models.find((m) => m.id === model)?.contextWindow || 0).toLocaleString()} tokens`
                          : ""}
                        {llmProviders[provider].models.find(
                          (m) => m.id === model
                        )?.costPer1KTokens
                          ? ` • Cost: $${(llmProviders[provider].models.find((m) => m.id === model)?.costPer1KTokens || 0).toFixed(5)}/1K tokens`
                          : ""}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label className="text-sm font-medium mb-1">
                        Temperature
                      </label>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {temperature.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={temperature}
                      onChange={(e) =>
                        setTemperature(parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
          {promptError && ( // Display prompt saving error inside the modal
            <p className="mt-4 text-sm text-destructive-500 dark:text-destructive-400 text-center">
              {promptError}
            </p>
          )}
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            {/* The submit button is now part of PromptForm */}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show summary of selected prompt/model */}
      <div className="mb-4 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-xs text-[hsl(var(--foreground-muted))] mb-1">
              Prompt
            </div>
            <div className="font-medium text-[hsl(var(--foreground))] dark:text-white whitespace-pre-line">
              {context}
            </div>
          </div>
          <div className="flex flex-col md:items-end gap-1 min-w-[180px]">
            <div className="text-xs text-[hsl(var(--foreground-muted))]">
              Model
            </div>
            <div className="font-mono text-sm text-[hsl(var(--foreground))] dark:text-white">
              {(model && findModelById(model)?.model?.name) || model}
            </div>
            <div className="text-xs text-[hsl(var(--foreground-muted))]">
              {provider && llmProviders[provider as ProviderId]
                ? llmProviders[provider as ProviderId].name
                : ""}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-[hsl(var(--foreground-muted))]">
          <span>
            Platform:{" "}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {platform}
            </span>
          </span>
          <span>
            Tone:{" "}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {tone}
            </span>
          </span>
          <span>
            Style:{" "}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {style}
            </span>
          </span>
          <span>
            Length:{" "}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {length}
            </span>
          </span>
        </div>
      </div>
      <Button
        onClick={() => handleGenerate()}
        disabled={isGenerating}
        variant="outline"
        className="w-full bg-[var(--background-primary)] hover:bg-black dark:bg-[var(--background-primary)] dark:hover:bg-black text-white border-[hsl(var(--border))]"
      >
        {isGenerating ? "Generating..." : "Generate Caption"}
      </Button>
      {error && (
        <p className="text-sm text-destructive-500 dark:text-destructive-400">
          {error}
        </p>
      )}
      {/* Grid layout for all captions */}
      <div className="space-y-6">
        {/* Instagram Captions */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Instagram className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
              Instagram Captions
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Generated caption (only if it's Instagram) */}
            {generatedCaption && platform === "instagram" && (
              <div className="group relative p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] dark:hover:border-[hsl(var(--border-subtle))] transition-colors">
                <p
                  className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] pr-8"
                  onKeyDown={(e) => {
                    if (
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                      ].includes(e.key)
                    ) {
                      e.stopPropagation();
                    }
                  }}
                >
                  {generatedCaption}
                </p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generatedCaption, "generated")}
                    className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                    title="Copy caption"
                  >
                    {copiedId === "generated" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="absolute bottom-2 right-2">
                  <span className="text-xs uppercase text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                    New
                  </span>
                </div>
              </div>
            )}
            {/* Saved Instagram captions */}
            {savedCaptions
              .filter((caption) => caption.platform === "instagram")
              .map((caption) => (
                <div
                  key={caption._id}
                  className="group relative p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] dark:hover:border-[hsl(var(--border-subtle))] transition-colors"
                >
                  {editingCaptionId === caption._id ? (
                    <Textarea
                      value={editingText || caption.caption}
                      onChange={(e) =>
                        handleTextChange(e.target.value, caption._id)
                      }
                      className="min-h-[200px] w-full resize-none bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] text-sm pr-8"
                      onKeyDown={(e) => {
                        // Only stop propagation for arrow keys, don't prevent default
                        if (
                          [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ].includes(e.key)
                        ) {
                          e.stopPropagation();
                        }
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSaveEdit(caption._id);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingCaptionId(null);
                          setEditingText("");
                        }
                      }}
                    />
                  ) : (
                    <p
                      className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] pr-8"
                      onKeyDown={(e) => {
                        if (
                          [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ].includes(e.key)
                        ) {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {caption.caption}
                    </p>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(caption.caption, caption._id)}
                      className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                      title="Copy caption"
                    >
                      {copiedId === caption._id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    {editingCaptionId === caption._id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEdit(caption._id)}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                          title="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCaptionId(null);
                            setEditingText("");
                          }}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-destructive-600 dark:text-[hsl(var(--foreground-muted))] dark:hover:text-destructive-400"
                          title="Cancel editing"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCaptionId(caption._id);
                            setEditingText(caption.caption);
                          }}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                          title="Edit caption"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(caption._id)}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-destructive-600 dark:text-[hsl(var(--foreground-muted))] dark:hover:text-destructive-400"
                          title="Delete caption"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* YouTube Captions */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Youtube className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
              YouTube Captions
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Generated caption (only if it's YouTube) */}
            {generatedCaption && platform === "youtube" && (
              <div className="group relative p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] dark:hover:border-[hsl(var(--border-subtle))] transition-colors">
                <p
                  className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] pr-8"
                  onKeyDown={(e) => {
                    if (
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                      ].includes(e.key)
                    ) {
                      e.stopPropagation();
                    }
                  }}
                >
                  {generatedCaption}
                </p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generatedCaption, "generated")}
                    className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                    title="Copy caption"
                  >
                    {copiedId === "generated" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="absolute bottom-2 right-2">
                  <span className="text-xs uppercase text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                    New
                  </span>
                </div>
              </div>
            )}
            {/* Saved YouTube captions */}
            {savedCaptions
              .filter((caption) => caption.platform === "youtube")
              .map((caption) => (
                <div
                  key={caption._id}
                  className="group relative p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] dark:hover:border-[hsl(var(--border-subtle))] transition-colors"
                >
                  {editingCaptionId === caption._id ? (
                    <Textarea
                      value={editingText || caption.caption}
                      onChange={(e) =>
                        handleTextChange(e.target.value, caption._id)
                      }
                      className="min-h-[200px] w-full resize-none bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] text-sm pr-8"
                      onKeyDown={(e) => {
                        // Only stop propagation for arrow keys, don't prevent default
                        if (
                          [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ].includes(e.key)
                        ) {
                          e.stopPropagation();
                        }
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSaveEdit(caption._id);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingCaptionId(null);
                          setEditingText("");
                        }
                      }}
                    />
                  ) : (
                    <p
                      className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] pr-8"
                      onKeyDown={(e) => {
                        if (
                          [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ].includes(e.key)
                        ) {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {caption.caption}
                    </p>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(caption.caption, caption._id)}
                      className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                      title="Copy caption"
                    >
                      {copiedId === caption._id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    {editingCaptionId === caption._id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEdit(caption._id)}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                          title="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCaptionId(null);
                            setEditingText("");
                          }}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-destructive-600 dark:text-[hsl(var(--foreground-muted))] dark:hover:text-destructive-400"
                          title="Cancel editing"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCaptionId(caption._id);
                            setEditingText(caption.caption);
                          }}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                          title="Edit caption"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(caption._id)}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-destructive-600 dark:text-[hsl(var(--foreground-muted))] dark:hover:text-destructive-400"
                          title="Delete caption"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
