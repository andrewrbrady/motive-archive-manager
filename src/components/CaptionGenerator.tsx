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

  // Fetch car details when carId changes
  useEffect(() => {
    const fetchCarDetails = async () => {
      setCarLoading(true);
      setCarError(null);
      try {
        const response = await fetch(`/api/cars/${carId}`);
        if (!response.ok) throw new Error("Failed to fetch car details");
        const data = await response.json();
        setCarDetails(data);
      } catch (err) {
        setCarError(
          err instanceof Error ? err.message : "Failed to fetch car details"
        );
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

  const handleGenerate = async (_captionId?: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Generate new caption text
      const response = await fetch("/api/openai/generate-caption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          context,
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
      <div className="space-y-3 rounded-lg p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
        <div className="flex gap-3">
          <div className="flex-1">
            <Select
              defaultValue="instagram"
              value={platform}
              onValueChange={(value: Platform) => setPlatform(value)}
            >
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-[hsl(var(--foreground))] dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-white">
                <SelectItem
                  value="instagram"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Instagram
                </SelectItem>
                <SelectItem
                  value="youtube"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  YouTube
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select
              defaultValue="none"
              value={template}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-[hsl(var(--foreground))] dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-white">
                <SelectItem
                  value="none"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  No Template
                </SelectItem>
                <SelectItem
                  value="bat"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Bring a Trailer
                </SelectItem>
                <SelectItem
                  value="dealer"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Dealer Reference
                </SelectItem>
                <SelectItem
                  value="question"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Ask Question
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {template === "question" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const newQuestion = await generateQuestion(carDetails);
                  setContext(newQuestion);
                }}
                className="ml-auto h-8 px-2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                title="Generate new question"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={(e) => {
              // Prevent event propagation when arrow keys are pressed
              if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key
                )
              ) {
                e.stopPropagation();
              }
            }}
            placeholder="Add any additional context for the caption..."
            className="min-h-[80px] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground-muted))] dark:placeholder:text-[hsl(var(--foreground-muted))]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Select
              value={tone}
              onValueChange={(value: Tone) => setTone(value)}
            >
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-[hsl(var(--foreground))] dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-white">
                <SelectItem
                  value="professional"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Professional
                </SelectItem>
                <SelectItem
                  value="casual"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Casual
                </SelectItem>
                <SelectItem
                  value="enthusiastic"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Enthusiastic
                </SelectItem>
                <SelectItem
                  value="technical"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Technical
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={style}
              onValueChange={(value: Style) => setStyle(value)}
            >
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-[hsl(var(--foreground))] dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-white">
                <SelectItem
                  value="descriptive"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Descriptive
                </SelectItem>
                <SelectItem
                  value="minimal"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Minimal
                </SelectItem>
                <SelectItem
                  value="storytelling"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Storytelling
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={length}
              onValueChange={(value: Length) => setLength(value)}
            >
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-[hsl(var(--foreground))] dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select length" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-white">
                <SelectItem
                  value="concise"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Concise (1-2 lines)
                </SelectItem>
                <SelectItem
                  value="standard"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Standard (2-3 lines)
                </SelectItem>
                <SelectItem
                  value="detailed"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Detailed (3-4 lines)
                </SelectItem>
                <SelectItem
                  value="comprehensive"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Comprehensive (4+ lines)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
              Creativity: {temperature}
            </label>
            <div className="relative flex items-center">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1 bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(var(--background))] dark:[&::-webkit-slider-thumb]:bg-[var(--background-primary)]"
              />
            </div>
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
    </div>
  );
}
