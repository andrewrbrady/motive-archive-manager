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
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Platform, DeliverableType } from "@/types/deliverable";
import { FirestoreUser } from "@/types/firebase";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>();
  const [type, setType] = useState<DeliverableType>();
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("");
  const [editor, setEditor] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState(carId || "");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // [REMOVED] // [REMOVED] console.log("NewDeliverableForm: Starting to fetch users...");
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();

        // [REMOVED] // [REMOVED] console.log("NewDeliverableForm: Raw API response:", data);
        // [REMOVED] // [REMOVED] console.log("NewDeliverableForm: Data is array:", Array.isArray(data));

        if (Array.isArray(data)) {
          const activeUsers = data.filter(
            (user: FirestoreUser) => user.status === "active"
          );
          // [REMOVED] // [REMOVED] console.log("NewDeliverableForm: Active users:", activeUsers.length);
          // [REMOVED] // [REMOVED] console.log("NewDeliverableForm: Sample user:", activeUsers[0]);
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

    // Only fetch users if we don't already have them
    if (users.length === 0) {
      fetchUsers();
    }

    // Only fetch cars if no carId was provided
    if (!carId) {
      const fetchCars = async () => {
        try {
          const response = await fetch("/api/cars");
          if (!response.ok) {
            throw new Error("Failed to fetch cars");
          }
          const data = await response.json();
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
  }, []); // Remove dependencies to prevent re-fetching

  const resetForm = () => {
    setTitle("");
    setPlatform(undefined);
    setType(undefined);
    setDuration(0);
    setAspectRatio("");
    setEditor("");
    setEditDeadline("");
    setReleaseDate("");
    if (!carId) {
      setSelectedCarId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title ||
      !platform ||
      !type ||
      !editor ||
      !editDeadline ||
      !releaseDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // If no carId was provided and no car was selected, show error
    if (!carId && !selectedCarId) {
      toast.error("Please select a car");
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
      const response = await fetch(
        `/api/cars/${deliverableCarId}/deliverables`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            platform,
            type,
            duration,
            aspect_ratio: aspectRatio,
            editor: selectedUser.name, // Store the name for display
            firebase_uid: selectedUser.uid, // Store the UID for filtering
            status: "not_started", // Default status
            edit_deadline: new Date(editDeadline),
            release_date: new Date(releaseDate),
            car_id: deliverableCarId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create deliverable");
      }

      toast.success("Deliverable created successfully");
      onDeliverableCreated();
      setIsOpen(false);
      resetForm();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Deliverable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              required
            />
          </div>

          {!carId && (
            <div className="space-y-2">
              <label htmlFor="car" className="text-sm font-medium">
                Car
              </label>
              <Select
                value={selectedCarId}
                onValueChange={(value) => setSelectedCarId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select car" />
                </SelectTrigger>
                <SelectContent>
                  {cars.map((car) => (
                    <SelectItem key={car._id} value={car._id.toString()}>
                      {car.year} {car.make} {car.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="platform" className="text-sm font-medium">
              Platform
            </label>
            <Select
              value={platform || ""}
              onValueChange={(value) => setPlatform(value as Platform)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="instagram-reels" value="Instagram Reels">
                  Instagram Reels
                </SelectItem>
                <SelectItem key="youtube" value="YouTube">
                  YouTube
                </SelectItem>
                <SelectItem key="youtube-shorts" value="YouTube Shorts">
                  YouTube Shorts
                </SelectItem>
                <SelectItem key="tiktok" value="TikTok">
                  TikTok
                </SelectItem>
                <SelectItem key="facebook" value="Facebook">
                  Facebook
                </SelectItem>
                <SelectItem key="bring-a-trailer" value="Bring a Trailer">
                  Bring a Trailer
                </SelectItem>
                <SelectItem key="other" value="Other">
                  Other
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Type
            </label>
            <Select
              value={type || ""}
              onValueChange={(value) => setType(value as DeliverableType)}
            >
              <SelectTrigger>
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
                <SelectItem key="marketing-email" value="Marketing Email">
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

          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Duration (seconds)
            </label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min={0}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="aspectRatio" className="text-sm font-medium">
              Aspect Ratio
            </label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <label htmlFor="editor" className="text-sm font-medium">
              Editor
            </label>
            <Select value={editor} onValueChange={(value) => setEditor(value)}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <label htmlFor="editDeadline" className="text-sm font-medium">
              Edit Deadline
            </label>
            <Input
              id="editDeadline"
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="releaseDate" className="text-sm font-medium">
              Release Date
            </label>
            <Input
              id="releaseDate"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
