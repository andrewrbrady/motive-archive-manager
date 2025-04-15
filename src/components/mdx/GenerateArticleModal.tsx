"use client";

import { useState } from "react";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { useCars } from "@/lib/hooks/query/useCars";
import { useToast } from "@/components/ui/use-toast";
import { slugify, cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { MediaSelector } from "./MediaSelector";

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
  const [content, setContent] = useState("");
  const [selectedCarId, setSelectedCarId] = useState<string>("none");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch cars for selection
  const { data: carsData, isLoading: isLoadingCars } = useCars({
    limit: 100, // Limit to 100 cars for performance
    sort: "updatedAt",
    sortDirection: "desc",
  });

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
      <DialogContent
        className="sm:max-w-2xl"
        style={{ position: "relative", zIndex: 50 }}
      >
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
            <Label htmlFor="car">Related Car (Optional)</Label>
            <Popover
              open={isComboboxOpen}
              onOpenChange={setIsComboboxOpen}
              modal={true}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isComboboxOpen}
                  className="w-full justify-between"
                  disabled={isLoading || isLoadingCars}
                  onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                >
                  {isLoadingCars ? "Loading..." : getSelectedCarText()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
                sideOffset={4}
                style={{ zIndex: 999 }}
              >
                <Command
                  className="w-full"
                  filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase()))
                      return 1;
                    return 0;
                  }}
                >
                  <CommandInput placeholder="Search cars..." />
                  <CommandEmpty>No cars found.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-y-auto">
                    <CommandItem
                      key="none"
                      value="none"
                      onSelect={() => {
                        setSelectedCarId("none");
                        setIsComboboxOpen(false);
                      }}
                      className="cursor-pointer hover:bg-accent"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCarId === "none" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      None
                    </CommandItem>
                    {carsData?.cars.map((car) => (
                      <CommandItem
                        key={car._id}
                        value={`${car.year} ${car.make} ${car.model}`}
                        onSelect={() => {
                          setSelectedCarId(car._id);
                          setIsComboboxOpen(false);
                        }}
                        className="cursor-pointer hover:bg-accent"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCarId === car._id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {car.year} {car.make} {car.model}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
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
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
