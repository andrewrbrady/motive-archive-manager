"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Platform,
  DeliverableType,
  DeliverableStatus,
} from "@/types/deliverable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

interface NewDeliverableDialogProps {
  children: React.ReactNode;
}

interface CarsListResponse {
  cars?: Car[];
}

interface UsersResponse {
  users?: User[];
}

interface CreateDeliverableData {
  car_id: string;
  title: string;
  description: string;
  platform: Platform;
  type: DeliverableType;
  duration: number;
  aspect_ratio: string;
  editor: string;
  target_audience: string;
  music_track: string;
  tags: string[];
  priority_level: number;
  edit_deadline: Date;
  release_date: Date;
  status: DeliverableStatus;
}

interface CreateDeliverableResponse {
  success: boolean;
  deliverable?: any;
  error?: string;
}

export default function NewDeliverableDialog({
  children,
}: NewDeliverableDialogProps) {
  const router = useRouter();
  const api = useAPI();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [creatives, setCreatives] = useState<User[]>([]);
  const [editDeadline, setEditDeadline] = useState<Date>();
  const [releaseDate, setReleaseDate] = useState<Date>();
  const [showCarSearch, setShowCarSearch] = useState(false);

  const [formData, setFormData] = useState({
    car_id: "",
    title: "",
    description: "",
    platform: "" as Platform,
    type: "" as DeliverableType,
    duration: 0,
    aspect_ratio: "16:9",
    editor: "",
    target_audience: "",
    music_track: "",
    tags: "",
    priority_level: 1,
  });

  // Authentication check - don't render if not authenticated
  if (!api) {
    return null;
  }

  useEffect(() => {
    const fetchCars = async () => {
      try {
        const data = await api.get<Car[]>("cars/list");
        setCars(data || []);
        setFilteredCars(data || []);
      } catch (error: any) {
        console.error("Error fetching cars:", error);
        toast.error("Failed to fetch cars");
      }
    };

    const fetchCreatives = async () => {
      try {
        const data = await api.get<User[]>("users");
        const activeCreatives = (data || []).filter(
          (user: User) =>
            user.status === "active" && user.creativeRoles.length > 0
        );
        setCreatives(activeCreatives);
      } catch (error: any) {
        console.error("Error fetching creatives:", error);
        toast.error("Failed to fetch creative users");
      }
    };

    if (open) {
      fetchCars();
      fetchCreatives();
    }
  }, [open, api]);

  const filterCars = (search: string) => {
    const searchTerms = search.toLowerCase().split(" ");
    const filtered = cars.filter((car) => {
      const carString = `${car.year} ${car.make} ${car.model}`.toLowerCase();
      return searchTerms.every((term) => carString.includes(term));
    });
    setFilteredCars(filtered);
  };

  const getRelevantCreatives = (deliverableType: DeliverableType) => {
    return creatives.filter((user) => {
      if (deliverableType === "Photo Gallery") {
        return user.creativeRoles.includes("photographer");
      }
      return user.creativeRoles.includes("video_editor");
    });
  };

  const selectedCar = cars.find((car) => car._id === formData.car_id);
  const relevantCreatives = getRelevantCreatives(formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeadline || !releaseDate || !formData.car_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const createData: CreateDeliverableData = {
        ...formData,
        edit_deadline: editDeadline,
        release_date: releaseDate,
        status: "not_started" as DeliverableStatus,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        duration:
          formData.type === "Photo Gallery" ? 0 : Number(formData.duration),
        priority_level: Number(formData.priority_level),
      };

      const response = await api.post<CreateDeliverableResponse>(
        "deliverables",
        createData
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to create deliverable");
      }

      toast.success("Deliverable created successfully");
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error("Error creating deliverable:", error);
      toast.error(error.message || "Failed to create deliverable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Deliverable</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="car">Car</Label>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={showCarSearch}
                className="w-full justify-between"
                onClick={() => setShowCarSearch(true)}
              >
                {selectedCar ? (
                  `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}`
                ) : (
                  <span className="text-muted-foreground">Select a car...</span>
                )}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  required
                  value={formData.platform}
                  onValueChange={(value: Platform) =>
                    setFormData({ ...formData, platform: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram Reels">
                      Instagram Reels
                    </SelectItem>
                    <SelectItem value="Instagram Post">
                      Instagram Post
                    </SelectItem>
                    <SelectItem value="Instagram Story">
                      Instagram Story
                    </SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="YouTube Shorts">
                      YouTube Shorts
                    </SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Bring a Trailer">
                      Bring a Trailer
                    </SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  required
                  value={formData.type}
                  onValueChange={(value: DeliverableType) =>
                    setFormData({ ...formData, type: value, editor: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Photo Gallery">Photo Gallery</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Mixed Gallery">Mixed Gallery</SelectItem>
                    <SelectItem value="Video Gallery">Video Gallery</SelectItem>
                    <SelectItem value="Still">Still</SelectItem>
                    <SelectItem value="Graphic">Graphic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  required={formData.type !== "Photo Gallery"}
                  min="0"
                  value={
                    formData.type === "Photo Gallery"
                      ? "N/A"
                      : formData.duration
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value),
                    })
                  }
                  disabled={formData.type === "Photo Gallery"}
                  placeholder={
                    formData.type === "Photo Gallery" ? "N/A" : undefined
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aspect_ratio">Aspect Ratio</Label>
                <Select
                  required
                  value={formData.aspect_ratio}
                  onValueChange={(value) =>
                    setFormData({ ...formData, aspect_ratio: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="4:5">4:5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editor">Creative</Label>
                <Select
                  required
                  value={formData.editor}
                  onValueChange={(value) =>
                    setFormData({ ...formData, editor: value })
                  }
                  disabled={!formData.type}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        formData.type ? "Select creative" : "Select type first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {relevantCreatives.map((creative) => (
                      <SelectItem key={creative._id} value={creative.name}>
                        {creative.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Edit Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editDeadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDeadline ? (
                        format(editDeadline, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editDeadline}
                      onSelect={setEditDeadline}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Release Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !releaseDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {releaseDate ? (
                        format(releaseDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={releaseDate}
                      onSelect={setReleaseDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_audience">Target Audience</Label>
                <Input
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_audience: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="music_track">Music Track</Label>
                <Input
                  id="music_track"
                  value={formData.music_track}
                  onChange={(e) =>
                    setFormData({ ...formData, music_track: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority_level">Priority Level (1-5)</Label>
                <Input
                  id="priority_level"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.priority_level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority_level: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Deliverable"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CommandDialog open={showCarSearch} onOpenChange={setShowCarSearch}>
        <CommandInput
          placeholder="Search cars... (e.g. '2023 porsche' or '911')"
          onValueChange={filterCars}
        />
        <CommandList>
          <CommandEmpty>No cars found.</CommandEmpty>
          <CommandGroup heading="Cars">
            {filteredCars.map((car) => (
              <CommandItem
                key={car._id}
                value={`${car.year} ${car.make} ${car.model}`}
                onSelect={() => {
                  setFormData({ ...formData, car_id: car._id });
                  setShowCarSearch(false);
                }}
              >
                <span className="font-medium">{car.year}</span>
                <span className="ml-2">{car.make}</span>
                <span className="ml-2">{car.model}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
