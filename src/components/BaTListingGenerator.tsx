"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Copy, Check, Pencil, Trash2, X } from "lucide-react";

type ListingFocus = "mechanical" | "cosmetic" | "historical" | "comprehensive";
type Style = "factual" | "storytelling" | "technical";
type Tone = "enthusiastic" | "professional" | "casual" | "formal";
type Length = "concise" | "standard" | "detailed" | "comprehensive";

interface BaTListingGeneratorProps {
  carDetails: {
    _id: string;
    year: number;
    make: string;
    model: string;
    color?: string;
    mileage?: {
      value: number;
      unit: string;
    };
    engine?: {
      type?: string;
      displacement?: {
        value: number;
        unit: string;
      };
      power?: {
        hp?: number;
      };
    };
    transmission?: {
      type: string;
    };
    vin?: string;
    condition?: string;
    interior_color?: string;
    interior_features?: {
      seats: number;
      upholstery?: string;
    };
    description?: string;
  };
}

interface SavedBaTListing {
  _id: string;
  content: string;
  focus: ListingFocus;
  style: Style;
  tone: Tone;
  length: Length;
  additionalContext?: string;
  car: {
    _id: string;
    year: number;
    make: string;
    model: string;
    color?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function BaTListingGenerator({
  carDetails,
}: BaTListingGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedListing, setGeneratedListing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<ListingFocus>("comprehensive");
  const [style, setStyle] = useState<Style>("technical");
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<Length>("detailed");
  const [temperature, setTemperature] = useState(0.7);
  const [additionalContext, setAdditionalContext] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedListings, setSavedListings] = useState<SavedBaTListing[]>([]);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch saved listings when component mounts
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch(
          `/api/bat-listings?carId=${carDetails._id}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch listings");
        }
        const listings = await response.json();
        setSavedListings(listings);
      } catch (err) {
        console.error("Error fetching listings:", err);
      }
    };

    fetchListings();
  }, [carDetails._id]);

  // Add new useEffect for textarea height adjustment
  useEffect(() => {
    if (textareaRef.current && editingListingId) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editingText, editingListingId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/openai/generate-bat-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          carDetails,
          focus,
          style,
          tone,
          length,
          temperature,
          additionalContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate BaT listing");
      }

      const data = await response.json();
      setGeneratedListing(data.listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedListing);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/bat-listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          carId: carDetails._id,
          content: generatedListing,
          focus,
          style,
          tone,
          length,
          additionalContext,
          car: {
            _id: carDetails._id,
            year: carDetails.year,
            make: carDetails.make,
            model: carDetails.model,
            color: carDetails.color,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save listing");
      }

      const savedListing = await response.json();
      setSavedListings((prev) => [savedListing, ...prev]);
      setGeneratedListing(""); // Clear the generated listing since it's now saved
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save listing");
    }
  };

  const handleEdit = async (listingId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/bat-listings/${listingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update listing");
      }

      setSavedListings((prev) =>
        prev.map((listing) =>
          listing._id === listingId
            ? { ...listing, content: newContent }
            : listing
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    }
  };

  const handleDelete = async (listingId: string) => {
    try {
      const response = await fetch(`/api/bat-listings/${listingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete listing");
      }

      setSavedListings((prev) =>
        prev.filter((listing) => listing._id !== listingId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
    }
  };

  const handleSaveEdit = async (listingId: string) => {
    await handleEdit(listingId, editingText);
    setEditingListingId(null);
    setEditingText("");
  };

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-white uppercase">
        BaT Listing Generator
      </h1>
      <div className="space-y-3 rounded-lg p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Select
              value={focus}
              onValueChange={(value: ListingFocus) => setFocus(value)}
            >
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-[hsl(var(--foreground))] dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select focus" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-white">
                <SelectItem
                  value="mechanical"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Mechanical Details
                </SelectItem>
                <SelectItem
                  value="cosmetic"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Cosmetic Condition
                </SelectItem>
                <SelectItem
                  value="historical"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Historical Background
                </SelectItem>
                <SelectItem
                  value="comprehensive"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Comprehensive
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
                  value="factual"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Factual
                </SelectItem>
                <SelectItem
                  value="storytelling"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Storytelling
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  value="enthusiastic"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Enthusiastic
                </SelectItem>
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
                  value="formal"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Formal
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
                  Concise
                </SelectItem>
                <SelectItem
                  value="standard"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Standard
                </SelectItem>
                <SelectItem
                  value="detailed"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Detailed
                </SelectItem>
                <SelectItem
                  value="comprehensive"
                  className="text-[hsl(var(--foreground))] dark:text-white"
                >
                  Comprehensive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
              Creativity: {temperature.toFixed(1)}
            </label>
          </div>
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

        <div className="space-y-2">
          <Textarea
            placeholder="Add any specific details, history, or modifications you'd like to highlight..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            onKeyDown={(e) => {
              if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key
                )
              ) {
                e.stopPropagation();
              }
            }}
            className="min-h-[80px] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground-muted))] dark:placeholder:text-[hsl(var(--foreground-muted))]"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant="outline"
          className="w-full bg-[var(--background-primary)] hover:bg-black dark:bg-[var(--background-primary)] dark:hover:bg-black text-white border-[hsl(var(--border))]"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate BaT Listing"
          )}
        </Button>

        {error && (
          <p className="text-sm text-destructive-500 dark:text-destructive-400">{error}</p>
        )}

        {generatedListing && (
          <div className="group relative p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] dark:hover:border-[hsl(var(--border-subtle))] transition-colors">
            <p
              className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] pr-8"
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key
                  )
                ) {
                  e.stopPropagation();
                }
              }}
            >
              {generatedListing}
            </p>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                title="Copy listing"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                title="Save listing"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute bottom-2 right-2">
              <span className="text-xs uppercase text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                New
              </span>
            </div>
          </div>
        )}

        {savedListings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
              Saved Listings
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {savedListings.map((listing) => (
                <div
                  key={listing._id}
                  className="group relative p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] dark:hover:border-[hsl(var(--border-subtle))] transition-colors"
                >
                  {editingListingId === listing._id ? (
                    <Textarea
                      ref={textareaRef}
                      value={editingText || listing.content}
                      onChange={(e) => {
                        setEditingText(e.target.value);
                        // Adjust height on change
                        if (textareaRef.current) {
                          textareaRef.current.style.height = "auto";
                          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                        }
                      }}
                      className="w-full resize-none bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] text-sm pr-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSaveEdit(listing._id);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingListingId(null);
                          setEditingText("");
                        }
                      }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] pr-8">
                      {listing.content}
                    </p>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {editingListingId === listing._id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEdit(listing._id)}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                          title="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingListingId(null);
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
                            setEditingListingId(listing._id);
                            setEditingText(listing.content);
                          }}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
                          title="Edit listing"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(listing._id)}
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-destructive-600 dark:text-[hsl(var(--foreground-muted))] dark:hover:text-destructive-400"
                          title="Delete listing"
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
        )}
      </div>
    </div>
  );
}
