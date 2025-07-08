"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import {
  Platform,
  DeliverableType,
  DeliverablePlatform,
} from "@/types/deliverable";
import { useAPI } from "@/hooks/useAPI";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { usePlatforms } from "@/contexts/PlatformContext";
import { useMediaTypes } from "@/hooks/useMediaTypes";
import { EditorSelector } from "./EditorSelector";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface NewDeliverableFormProps {
  carId?: string;
  onDeliverableCreated: () => void;
}

export default function NewDeliverableForm({
  carId,
  onDeliverableCreated,
}: NewDeliverableFormProps) {
  const api = useAPI();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    { label: string; value: string }[]
  >([]);
  const [type, setType] = useState<DeliverableType>();
  const [mediaTypeId, setMediaTypeId] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("");
  const [editor, setEditor] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [dropboxLink, setDropboxLink] = useState("");
  const [socialMediaLink, setSocialMediaLink] = useState("");
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState(carId || "");

  const { platforms: availablePlatforms } = usePlatforms();
  const { mediaTypes, isLoading: mediaTypesLoading } = useMediaTypes();

  // Helper function to get media type name for display
  const getMediaTypeName = (mediaTypeId: string) => {
    if (!mediaTypeId) return null;
    const mediaType = mediaTypes.find(
      (mt) => mt._id.toString() === mediaTypeId
    );
    return mediaType ? mediaType.name : null;
  };

  const fetchCars = async () => {
    if (!api) return;

    try {
      const response = await api.get("cars");
      const data = response as any;
      setCars(data.cars || []);
    } catch (error) {
      console.error("Error fetching cars:", error);
      toast.error("Failed to fetch cars");
    }
  };

  const resetForm = () => {
    setTitle("");
    setSelectedPlatforms([]);
    setType(undefined);
    setMediaTypeId("");
    setDuration(0);
    setAspectRatio("");
    setEditor("");
    setEditDeadline("");
    setReleaseDate("");
    setDropboxLink("");
    setSocialMediaLink("");
    if (!carId) {
      setSelectedCarId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || title.trim() === "") {
      toast.error("Please enter a title");
      return;
    }

    if (!api) {
      toast.error("Authentication required");
      return;
    }

    const deliverableCarId = carId || selectedCarId;

    try {
      setIsLoading(true);

      const response = await api.post("/api/deliverables", {
        title: title.trim(),
        type,
        mediaTypeId,
        platform_id: selectedPlatforms[0]?.value,
        duration,
        aspect_ratio: aspectRatio,
        edit_deadline: editDeadline
          ? new Date(editDeadline).toISOString()
          : undefined,
        release_date: releaseDate
          ? new Date(releaseDate).toISOString()
          : undefined,
        editor,
        car_id: deliverableCarId || undefined,
        dropbox_link: dropboxLink,
        social_media_link: socialMediaLink,
      });

      // Reset form
      resetForm();

      // Close modal and notify parent
      setIsOpen(false);
      onDeliverableCreated();

      toast.success("Deliverable created successfully");
    } catch (error) {
      console.error("Error creating deliverable:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create deliverable"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Deliverable
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Deliverable</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Basic Information
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="title"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Title
                  </label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter deliverable title"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="platforms"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Platform
                  </label>
                  <MultiSelect
                    value={selectedPlatforms}
                    onChange={setSelectedPlatforms}
                    options={availablePlatforms.map((platform) => ({
                      label: platform.name,
                      value: platform._id,
                    }))}
                    placeholder="Select platform"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="type"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Type
                  </label>
                  <Select
                    value={mediaTypeId}
                    onValueChange={setMediaTypeId}
                    disabled={isLoading || mediaTypesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {mediaTypes.map((mediaType) => (
                        <SelectItem
                          key={mediaType._id.toString()}
                          value={mediaType._id.toString()}
                        >
                          {mediaType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!carId && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="car"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Car
                    </label>
                    <Select
                      value={selectedCarId}
                      onValueChange={setSelectedCarId}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select car" />
                      </SelectTrigger>
                      <SelectContent>
                        {cars.map((car) => (
                          <SelectItem key={car._id} value={car._id}>
                            {car.year} {car.make} {car.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Technical Details
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="duration"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Duration (seconds)
                  </label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    placeholder="Enter duration in seconds"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="aspectRatio"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Aspect Ratio
                  </label>
                  <Select
                    value={aspectRatio}
                    onValueChange={setAspectRatio}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                      <SelectItem value="4:5">4:5</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Assignment & Dates
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="editor"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Editor
                  </label>
                  <EditorSelector
                    deliverableId="new"
                    size="lg"
                    onEditorChange={(newEditor) => setEditor(newEditor)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="editDeadline"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Edit Deadline
                  </label>
                  <DateTimePicker
                    value={editDeadline}
                    onChange={setEditDeadline}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="releaseDate"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Release Date
                  </label>
                  <DateTimePicker
                    value={releaseDate}
                    onChange={setReleaseDate}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Links
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="dropboxLink"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Dropbox Link
                  </label>
                  <Input
                    id="dropboxLink"
                    value={dropboxLink}
                    onChange={(e) => setDropboxLink(e.target.value)}
                    placeholder="Enter Dropbox link"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="socialMediaLink"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Social Media Link
                  </label>
                  <Input
                    id="socialMediaLink"
                    value={socialMediaLink}
                    onChange={(e) => setSocialMediaLink(e.target.value)}
                    placeholder="Enter social media link"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              Create Deliverable
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
