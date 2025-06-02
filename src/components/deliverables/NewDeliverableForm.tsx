"use client";

import { useState, useEffect } from "react";
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
import { FirestoreUser } from "@/types/firebase";
import { useAPI } from "@/hooks/useAPI";
import { DateTimePicker } from "@/components/ui/datetime-picker";

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
  const [availablePlatforms, setAvailablePlatforms] = useState<
    DeliverablePlatform[]
  >([]);
  const [type, setType] = useState<DeliverableType>();
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("");
  const [editor, setEditor] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [dropboxLink, setDropboxLink] = useState("");
  const [socialMediaLink, setSocialMediaLink] = useState("");
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState(carId || "");
  const [openSelects, setOpenSelects] = useState<Record<string, boolean>>({});

  const handleSelectOpenChange = (selectId: string, open: boolean) => {
    setOpenSelects((prev) => ({ ...prev, [selectId]: open }));
  };

  const isAnySelectOpen = Object.values(openSelects).some(Boolean);

  useEffect(() => {
    const fetchPlatforms = async () => {
      if (!api) {
        console.log("API client not available for fetching platforms");
        return;
      }

      try {
        const response = await api.get("platforms");
        const data = response as DeliverablePlatform[];
        console.log("NewDeliverableForm: Fetched platforms:", data);
        setAvailablePlatforms(data);
      } catch (error) {
        console.error("Error fetching platforms:", error);
        toast.error("Failed to fetch platforms");
      }
    };

    const fetchUsers = async () => {
      if (!api) {
        console.log("API client not available for fetching users");
        return;
      }

      try {
        // Use the new editors endpoint that doesn't require admin access
        const response = await api.get("users/editors");
        const data = response as any;

        console.log("NewDeliverableForm: Raw API response:", data);
        console.log("NewDeliverableForm: Data is array:", Array.isArray(data));

        if (Array.isArray(data)) {
          // Filter to only active users
          const activeUsers = data.filter(
            (user: FirestoreUser) => user.status === "active"
          );
          console.log("NewDeliverableForm: Active users:", activeUsers.length);
          console.log("NewDeliverableForm: Sample user:", activeUsers[0]);
          setUsers(activeUsers);
        } else {
          console.error("Unexpected API response structure:", data);
          toast.error("Failed to load users properly");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      }
    };

    // Only fetch platforms and users if we don't already have them
    if (availablePlatforms.length === 0 && api) {
      fetchPlatforms();
    }
    if (users.length === 0 && api) {
      fetchUsers();
    }

    // Only fetch cars if no carId was provided
    if (!carId && api) {
      const fetchCars = async () => {
        try {
          const response = await api.get("cars");
          const data = response as any;
          setCars(data.cars || []);
        } catch (error) {
          console.error("Error fetching cars:", error);
          toast.error("Failed to fetch cars");
        }
      };

      if (cars.length === 0) {
        fetchCars();
      }
    }
  }, [api]); // Add api as dependency

  const resetForm = () => {
    setTitle("");
    setSelectedPlatforms([]);
    setType(undefined);
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
    if (
      !title ||
      selectedPlatforms.length === 0 ||
      !type ||
      !editor ||
      !editDeadline ||
      !releaseDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!api) {
      toast.error("Authentication required");
      return;
    }

    const deliverableCarId = carId || selectedCarId;

    // Find the selected user to get both name and firebase_uid
    const selectedUser = users.find((user) => user.uid === editor);
    if (!selectedUser) {
      toast.error("Please select a valid editor");
      return;
    }

    setIsLoading(true);
    try {
      // Determine which API endpoint to use based on whether we have a car
      const apiUrl = deliverableCarId
        ? `cars/${deliverableCarId}/deliverables`
        : `deliverables`;

      const requestBody: any = {
        title,
        platforms: selectedPlatforms.map((p) => p.value), // Send array of platform IDs
        type,
        duration,
        aspect_ratio: aspectRatio,
        editor: selectedUser.name, // Store the name for display
        firebase_uid: selectedUser.uid, // Store the UID for filtering
        status: "not_started", // Default status
        edit_deadline: new Date(editDeadline),
        release_date: new Date(releaseDate),
        dropbox_link: dropboxLink || undefined,
        social_media_link: socialMediaLink || undefined,
      };

      // Only add car_id if we have one
      if (deliverableCarId) {
        requestBody.car_id = deliverableCarId;
      }

      await api.post(apiUrl, requestBody);

      toast.success("Deliverable created successfully!");
      resetForm();
      setIsOpen(false);
      onDeliverableCreated();
    } catch (error) {
      console.error("Error creating deliverable:", error);
      toast.error("Failed to create deliverable");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full"
        onEscapeKeyDown={(e) => isAnySelectOpen && e.preventDefault()}
        onPointerDownOutside={(e) => isAnySelectOpen && e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
          <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            Create New Deliverable
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Basic Information Section */}
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
                    placeholder="Enter title"
                    required
                    className="text-sm"
                  />
                </div>

                {!carId && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="car"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Car (Optional)
                    </label>
                    <Select
                      value={selectedCarId}
                      onValueChange={(value) => setSelectedCarId(value)}
                      open={openSelects["car"]}
                      onOpenChange={(open) =>
                        handleSelectOpenChange("car", open)
                      }
                    >
                      <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <SelectValue placeholder="Select car (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No car selected</SelectItem>
                        {cars.map((car) => (
                          <SelectItem key={car._id} value={car._id.toString()}>
                            {car.year} {car.make} {car.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="platform"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Platform
                    </label>
                    <MultiSelect
                      value={selectedPlatforms}
                      onChange={(values) => setSelectedPlatforms(values)}
                      options={availablePlatforms.map((p) => ({
                        label: p.name,
                        value: p._id,
                      }))}
                      placeholder="Select platforms"
                      className="text-sm"
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
                      value={type || ""}
                      onValueChange={(value) =>
                        setType(value as DeliverableType)
                      }
                      open={openSelects["type"]}
                      onOpenChange={(open) =>
                        handleSelectOpenChange("type", open)
                      }
                    >
                      <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="feature" value="feature">
                          Feature
                        </SelectItem>
                        <SelectItem key="promo" value="promo">
                          Promo
                        </SelectItem>
                        <SelectItem key="review" value="review">
                          Review
                        </SelectItem>
                        <SelectItem key="walkthrough" value="walkthrough">
                          Walkthrough
                        </SelectItem>
                        <SelectItem key="highlights" value="highlights">
                          Highlights
                        </SelectItem>
                        <SelectItem key="photo_gallery" value="photo_gallery">
                          Photo Gallery
                        </SelectItem>
                        <SelectItem
                          key="marketing-email"
                          value="Marketing Email"
                        >
                          Marketing Email
                        </SelectItem>
                        <SelectItem key="blog" value="Blog">
                          Blog
                        </SelectItem>
                        <SelectItem key="other-type" value="other">
                          Other
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
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
                      value={isNaN(duration) ? "" : duration.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setDuration(isNaN(value) ? 0 : value);
                      }}
                      min={0}
                      required
                      className="text-sm"
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
                      open={openSelects["aspectRatio"]}
                      onOpenChange={(open) =>
                        handleSelectOpenChange("aspectRatio", open)
                      }
                    >
                      <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <SelectValue placeholder="Select aspect ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="16:9" value="16:9">
                          16:9
                        </SelectItem>
                        <SelectItem key="9:16" value="9:16">
                          9:16
                        </SelectItem>
                        <SelectItem key="1:1" value="1:1">
                          1:1
                        </SelectItem>
                        <SelectItem key="4:3" value="4:3">
                          4:3
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment & Dates Section */}
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
                  <Select
                    value={editor}
                    onValueChange={(value) => setEditor(value)}
                    open={openSelects["editor"]}
                    onOpenChange={(open) =>
                      handleSelectOpenChange("editor", open)
                    }
                  >
                    <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                      <SelectValue placeholder="Select editor" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.uid} value={user.uid}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="editDeadline"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Edit Deadline
                    </label>
                    <DateTimePicker
                      value={editDeadline}
                      onChange={(value) => setEditDeadline(value)}
                      className="text-sm"
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
                      onChange={(value) => setReleaseDate(value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Links Section */}
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
                    className="text-sm"
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
                    placeholder="Enter Social Media link"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Actions Footer */}
        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            size="sm"
            onClick={handleSubmit}
          >
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
