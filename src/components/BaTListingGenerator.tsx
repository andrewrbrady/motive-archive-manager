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
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
        BaT Listing Generator
      </h1>
      <div className="space-y-3 rounded-lg p-3 bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Select
              value={focus}
              onValueChange={(value: ListingFocus) => setFocus(value)}
            >
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-gray-900 dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select focus" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
                <SelectItem
                  value="mechanical"
                  className="text-gray-900 dark:text-white"
                >
                  Mechanical Details
                </SelectItem>
                <SelectItem
                  value="cosmetic"
                  className="text-gray-900 dark:text-white"
                >
                  Cosmetic Condition
                </SelectItem>
                <SelectItem
                  value="historical"
                  className="text-gray-900 dark:text-white"
                >
                  Historical Background
                </SelectItem>
                <SelectItem
                  value="comprehensive"
                  className="text-gray-900 dark:text-white"
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
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-gray-900 dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
                <SelectItem
                  value="factual"
                  className="text-gray-900 dark:text-white"
                >
                  Factual
                </SelectItem>
                <SelectItem
                  value="storytelling"
                  className="text-gray-900 dark:text-white"
                >
                  Storytelling
                </SelectItem>
                <SelectItem
                  value="technical"
                  className="text-gray-900 dark:text-white"
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
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-gray-900 dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
                <SelectItem
                  value="enthusiastic"
                  className="text-gray-900 dark:text-white"
                >
                  Enthusiastic
                </SelectItem>
                <SelectItem
                  value="professional"
                  className="text-gray-900 dark:text-white"
                >
                  Professional
                </SelectItem>
                <SelectItem
                  value="casual"
                  className="text-gray-900 dark:text-white"
                >
                  Casual
                </SelectItem>
                <SelectItem
                  value="formal"
                  className="text-gray-900 dark:text-white"
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
              <SelectTrigger className="flex h-10 items-center justify-between rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-[var(--background-primary)] px-3 py-2 text-sm ring-offset-background text-gray-900 dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue placeholder="Select length" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
                <SelectItem
                  value="concise"
                  className="text-gray-900 dark:text-white"
                >
                  Concise
                </SelectItem>
                <SelectItem
                  value="standard"
                  className="text-gray-900 dark:text-white"
                >
                  Standard
                </SelectItem>
                <SelectItem
                  value="detailed"
                  className="text-gray-900 dark:text-white"
                >
                  Detailed
                </SelectItem>
                <SelectItem
                  value="comprehensive"
                  className="text-gray-900 dark:text-white"
                >
                  Comprehensive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-gray-500 dark:text-gray-400">
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
              className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900 dark:[&::-webkit-slider-thumb]:bg-white"
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
            className="min-h-[80px] bg-white dark:bg-[var(--background-primary)] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant="outline"
          className="w-full bg-[var(--background-primary)] hover:bg-black dark:bg-[var(--background-primary)] dark:hover:bg-black text-white border-gray-800"
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
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        {generatedListing && (
          <div className="group relative p-3 bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
            <p
              className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100 pr-8"
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
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
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
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                title="Save listing"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute bottom-2 right-2">
              <span className="text-xs uppercase text-gray-500 dark:text-gray-400">
                New
              </span>
            </div>
          </div>
        )}

        {savedListings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Saved Listings
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {savedListings.map((listing) => (
                <div
                  key={listing._id}
                  className="group relative p-3 bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
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
                      className="w-full resize-none bg-white dark:bg-[var(--background-primary)] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm pr-8"
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
                    <p className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100 pr-8">
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
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
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
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
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
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                          title="Edit listing"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(listing._id)}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
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
