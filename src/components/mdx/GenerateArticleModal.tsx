"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useCars } from "@/lib/hooks/query/useCars";
import { useToast } from "@/components/ui/use-toast";
import { slugify, cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { MediaSelector } from "./MediaSelector";
import { getCarSpecifications } from "@/lib/services/carService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface GenerateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: {
    title: string;
    filename: string;
    content: string;
    carId?: string;
  }) => Promise<void>;
}

export default function GenerateArticleModal({
  isOpen,
  onClose,
  onGenerate,
}: GenerateArticleModalProps) {
  const [title, setTitle] = useState("");
  const [articleType, setArticleType] = useState("listing");
  const [guidance, setGuidance] = useState("");
  const [content, setContent] = useState("");
  const [selectedCarId, setSelectedCarId] = useState<string>("none");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [carSearchQuery, setCarSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const { toast } = useToast();

  // Fetch cars for selection
  const { data: carsData, isLoading: isLoadingCars } = useCars({
    limit: 100, // Limit to 100 cars for performance
    sort: "updatedAt",
    sortDirection: "desc",
  });

  // Filter cars based on search query
  const filteredCars = useMemo(() => {
    if (!carsData?.cars) return [];
    return carsData.cars.filter((car) => {
      if (!carSearchQuery) return true;
      const searchStr = `${car.year} ${car.make} ${car.model}`.toLowerCase();
      const searchTerms = carSearchQuery.toLowerCase().split(" ");
      return searchTerms.every((term) => searchStr.includes(term));
    });
  }, [carsData?.cars, carSearchQuery]);

  // Sort cars by year (newest first), then make, then model
  const sortedCars = useMemo(() => {
    return [...filteredCars].sort((a, b) => {
      // Sort by year descending
      if (a.year !== b.year) return b.year - a.year;
      // Then by make
      if (a.make !== b.make) return a.make.localeCompare(b.make);
      // Then by model
      return a.model.localeCompare(b.model);
    });
  }, [filteredCars]);

  const handleGenerateWithAI = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the article",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      console.log("Starting article generation for:", title);
      console.log("Selected car ID:", selectedCarId);
      console.log("User guidance:", guidance);

      // Get car details if a car is selected
      let carDetails = null;
      if (selectedCarId !== "none") {
        console.log("Attempting to fetch car details for ID:", selectedCarId);
        try {
          carDetails = await getCarSpecifications(selectedCarId);
          console.log("Successfully fetched car details:", carDetails);

          if (carDetails) {
            console.log(
              "Available car detail fields:",
              Object.keys(carDetails)
            );

            // Log which fields have actual data
            const fieldsWithData = Object.entries(carDetails)
              .filter(
                ([_, value]) =>
                  value &&
                  typeof value === "object" &&
                  Object.keys(value).length > 0
              )
              .map(([key]) => key);
            console.log("Fields with data:", fieldsWithData);
          } else {
            console.log("No car details available");
          }
        } catch (error) {
          console.error("Error fetching car specifications:", error);

          // Create more comprehensive fallback car details from the selected car in the dropdown
          if (carsData?.cars) {
            const selectedCar = carsData.cars.find(
              (car) => car._id === selectedCarId
            );
            if (selectedCar) {
              console.log("Selected car from dropdown:", selectedCar);
              console.log(
                "Available fields in dropdown data:",
                Object.keys(selectedCar)
              );

              // Create a minimal fallback car details object with only the essential fields
              carDetails = {
                year: selectedCar.year,
                make: selectedCar.make,
                model: selectedCar.model,
              };

              console.log(
                "Created fallback car details from dropdown data:",
                carDetails
              );
            } else {
              console.log(
                "Could not find selected car in carsData, selectedCarId:",
                selectedCarId
              );
              console.log(
                "Available cars:",
                carsData.cars.map((c) => ({
                  id: c._id,
                  make: c.make,
                  model: c.model,
                }))
              );
            }
          } else {
            console.log("No carsData available for fallback");
          }

          toast({
            title: "Warning",
            description:
              "Using limited car information. Some details couldn't be fetched.",
            variant: "default",
          });
        }
      } else {
        console.log("No car selected, skipping car details fetch");
      }

      // Prepare request payload
      const payload = {
        title,
        articleType,
        guidance: guidance.trim() || undefined,
        carId: selectedCarId !== "none" ? selectedCarId : undefined,
        carDetails,
        temperature,
        maxTokens,
      };

      console.log(
        "Sending article generation request with payload:",
        JSON.stringify(payload, null, 2)
      );

      // Call the article generation API
      const response = await fetch("/api/copywriting/article/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Article generation API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(errorData.error || "Failed to generate article");
      }

      const data = await response.json();
      console.log(
        "Received generated content length:",
        data.content?.length || 0
      );

      // Set the generated content
      setContent(data.content);

      toast({
        title: "Success",
        description: "Article generated successfully",
      });
    } catch (error) {
      console.error("Error generating article:", error);
      toast({
        title: "Error",
        description: "Failed to generate article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the article",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const filename = slugify(title);
      await onGenerate({
        title: title.trim(),
        filename,
        content,
        carId: selectedCarId === "none" ? undefined : selectedCarId,
      });
      setTitle("");
      setContent("");
      setSelectedCarId("none");
      setArticleType("listing");
      setGuidance("");
      setTemperature(0.7);
      setMaxTokens(2000);
      onClose();
    } catch (error) {
      console.error("Error generating article:", error);
      toast({
        title: "Error",
        description: "Failed to generate article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertMedia = (mdxCode: string) => {
    setContent((prev) => {
      const textarea = document.querySelector("textarea");
      const start = textarea?.selectionStart || 0;
      const end = textarea?.selectionEnd || 0;

      return prev.substring(0, start) + mdxCode + prev.substring(end);
    });
  };

  // Get the selected car's display text
  const getSelectedCarText = () => {
    if (selectedCarId === "none") return "None";
    const car = carsData?.cars.find((car) => car._id === selectedCarId);
    return car ? `${car.year} ${car.make} ${car.model}` : "Select a car";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate New Article</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Article Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title"
              disabled={isLoading}
            />
            {title && (
              <p className="text-sm text-muted-foreground">
                Filename: {slugify(title)}.mdx
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="articleType">Article Type</Label>
            <Select
              value={articleType}
              onValueChange={setArticleType}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select article type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listing">Listing</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guidance">Guidance (Optional)</Label>
            <Textarea
              id="guidance"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="Provide specific guidance for the AI about how you want the article to be written (e.g., tone, focus, specific details to include, etc.)"
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">
                    Temperature: {temperature}
                  </Label>
                  <div className="w-16">
                    <Input
                      id="temperature-input"
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      disabled={isLoading}
                      className="h-8"
                    />
                  </div>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(value) => setTemperature(value[0])}
                  disabled={isLoading}
                  className="w-full bg-[hsl(var(--border))]"
                />
                <p className="text-xs text-muted-foreground">
                  Controls randomness: Lower values produce more focused
                  content, higher values more creative output
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-tokens">Max Tokens: {maxTokens}</Label>
                  <div className="w-20">
                    <Input
                      id="max-tokens-input"
                      type="number"
                      min={100}
                      max={4000}
                      step={100}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(Number(e.target.value))}
                      disabled={isLoading}
                      className="h-8"
                    />
                  </div>
                </div>
                <Slider
                  id="max-tokens"
                  min={100}
                  max={4000}
                  step={100}
                  value={[maxTokens]}
                  onValueChange={(value) => setMaxTokens(value[0])}
                  disabled={isLoading}
                  className="w-full bg-[hsl(var(--border))]"
                />
                <p className="text-xs text-muted-foreground">
                  Limits the maximum length of the generated content
                  (approximately 1 token ≈ 4 characters, ~
                  {Math.round(maxTokens / 100)} paragraphs)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="car">Related Car (Optional)</Label>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsComboboxOpen(!isComboboxOpen);
                }}
                disabled={isLoading || isLoadingCars}
              >
                {isLoadingCars ? "Loading..." : getSelectedCarText()}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>

              {isComboboxOpen && (
                <div
                  className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border border-border shadow-md bg-background"
                  style={{
                    position: "absolute",
                    zIndex: 1000,
                  }}
                >
                  <div className="p-2 border-b border-border">
                    <Input
                      placeholder="Search cars..."
                      value={carSearchQuery}
                      onChange={(e) => setCarSearchQuery(e.target.value)}
                      className="w-full"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-[220px] overflow-y-auto">
                    {sortedCars.length === 0 && carSearchQuery ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No cars match your search.
                      </div>
                    ) : (
                      <div className="py-1">
                        <div
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            selectedCarId === "none" &&
                              "bg-accent text-accent-foreground"
                          )}
                          onClick={() => {
                            setSelectedCarId("none");
                            setCarSearchQuery("");
                            setIsComboboxOpen(false);
                          }}
                        >
                          None
                        </div>
                        {sortedCars.map((car) => (
                          <div
                            key={car._id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              selectedCarId === car._id &&
                                "bg-accent text-accent-foreground"
                            )}
                            onClick={() => {
                              console.log("Car selected:", {
                                id: car._id,
                                year: car.year,
                                make: car.make,
                                model: car.model,
                                details: car,
                              });
                              setSelectedCarId(car._id);
                              setCarSearchQuery("");
                              setIsComboboxOpen(false);
                            }}
                          >
                            {car.year} {car.make} {car.model}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isGenerating || isLoading}
              className="mb-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate with AI"
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <div className="space-y-2">
              <MediaSelector onSelect={handleInsertMedia} />
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article content here..."
                className="min-h-[300px] font-mono"
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Article"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
