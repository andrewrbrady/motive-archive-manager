"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trash2, CheckSquare, Square } from "lucide-react";
import { toast } from "react-hot-toast";
import { Deliverable, DeliverableStatus } from "@/types/deliverable";
import { FirestoreUser } from "@/types/firebase";
import NewDeliverableForm from "./NewDeliverableForm";
import EditDeliverableForm from "./EditDeliverableForm";
import BatchDeliverableForm from "./BatchDeliverableForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import BatchTemplateManager from "./BatchTemplateManager";
import { LoadingSpinner } from "@/components/ui/loading";
import BatchAssignmentModal from "./BatchAssignmentModal";
import FirestoreUserSelector from "@/components/users/FirestoreUserSelector";
import { useAPI } from "@/hooks/useAPI";
import { useMediaTypes } from "@/hooks/useMediaTypes";
import { PlatformBadges } from "./PlatformBadges";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface DeliverableWithCar extends Deliverable {
  car?: Car;
  firebase_uid?: string;
  editor: string;
}

const formatDuration = (deliverable: Deliverable) => {
  // Check if this is a photo gallery type using either new or legacy system
  const isPhotoGallery = deliverable.mediaTypeId
    ? false // We'll check this below using media types
    : deliverable.type === "Photo Gallery";

  if (isPhotoGallery) {
    return "N/A";
  }
  const minutes = Math.floor(deliverable.duration / 60);
  const seconds = deliverable.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function DeliverablesList() {
  const api = useAPI();
  const { mediaTypes } = useMediaTypes();
  const [deliverables, setDeliverables] = useState<DeliverableWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [editor, setEditor] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState("");
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    []
  );
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [isBatchAssigning, setIsBatchAssigning] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState("");
  const [creativeRole, setCreativeRole] = useState("all");

  // Helper function to get the proper media type name for display
  const getMediaTypeName = (deliverable: Deliverable) => {
    if (deliverable.mediaTypeId) {
      const mediaType = mediaTypes.find(
        (mt) => mt._id.toString() === deliverable.mediaTypeId?.toString()
      );
      return mediaType ? mediaType.name : deliverable.type;
    }
    return deliverable.type;
  };

  // Updated formatDuration to use media type info
  const formatDeliverableDuration = (deliverable: Deliverable) => {
    const mediaTypeName = getMediaTypeName(deliverable);

    // Check if this is a photo gallery type
    if (mediaTypeName === "Photo Gallery") {
      return "N/A";
    }

    const minutes = Math.floor(deliverable.duration / 60);
    const seconds = deliverable.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const CREATIVE_ROLES = [
    "video_editor",
    "photographer",
    "content_writer",
    "social_media_manager",
    "cinematographer",
    "sound_engineer",
    "graphic_designer",
    "storyboard_artist",
  ];

  useEffect(() => {
    if (!api) return; // Guard inside hook
    fetchCars();
  }, [api]);

  useEffect(() => {
    if (!api) return; // Guard inside hook
    fetchDeliverables();
  }, [search, status, platform, editor, type, selectedCar, page, api]);

  const fetchCars = async () => {
    if (!api) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("API client not available for fetching cars");
      return;
    }

    try {
      const response = await api.get("/cars");
      const data = response as any;
      setCars(data.cars);
    } catch (error) {
      console.error("Error fetching cars:", error);
      toast.error("Failed to fetch cars");
    }
  };

  const fetchDeliverables = async () => {
    if (!api) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();

      if (search) queryParams.append("search", search);
      if (status) queryParams.append("status", status);
      if (platform) queryParams.append("platform", platform);
      if (editor) queryParams.append("editor", editor);
      if (type) queryParams.append("type", type);
      if (selectedCar) queryParams.append("car_id", selectedCar);
      if (page > 1) queryParams.append("page", page.toString());

      const response = await api.get(`/deliverables?${queryParams}`);
      const data = response as any;
      setDeliverables(data.deliverables || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, carId: string) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) return;

    if (!api) {
      toast.error("Authentication required");
      return;
    }

    try {
      await api.delete(`/cars/${carId}/deliverables/${id}`);
      toast.success("Deliverable deleted successfully");
      fetchDeliverables();
    } catch (error) {
      console.error("Error deleting deliverable:", error);
      toast.error("Failed to delete deliverable");
    }
  };

  const toggleDeliverableSelection = (id: string) => {
    setSelectedDeliverables((prev) =>
      prev.includes(id)
        ? prev.filter((deliverableId) => deliverableId !== id)
        : [...prev, id]
    );
  };

  const toggleAllDeliverables = () => {
    if (selectedDeliverables.length === deliverables.length) {
      setSelectedDeliverables([]);
    } else {
      setSelectedDeliverables(
        deliverables.map((deliverable) => deliverable._id?.toString() || "")
      );
    }
  };

  const handleBatchStatusUpdate = async (newStatus: DeliverableStatus) => {
    if (!api) {
      toast.error("Authentication required");
      return;
    }

    try {
      const promises = selectedDeliverables.map((id) => {
        const deliverable = deliverables.find((d) => d._id?.toString() === id);
        if (!deliverable) return null;

        return api.put(`/cars/${deliverable.car_id}/deliverables/${id}`, {
          status: newStatus,
          updated_at: new Date(),
        });
      });

      await Promise.all(promises.filter(Boolean));
      toast.success("Updated status for selected deliverables");
      setSelectedDeliverables([]);
      fetchDeliverables();
    } catch (error) {
      console.error("Error updating deliverables:", error);
      toast.error("Failed to update deliverables");
    }
  };

  const handleAssignDeliverable = async (
    deliverableId: string,
    userId: string | null
  ): Promise<void> => {
    if (!api) {
      toast.error("Authentication required");
      return;
    }

    const deliverable = deliverables.find(
      (d) => d._id?.toString() === deliverableId
    );
    if (!deliverable) return;

    // Create a new array with the updated deliverable
    const updatedDeliverables = deliverables.map((d) =>
      d._id?.toString() === deliverableId
        ? { ...d, firebase_uid: userId ?? undefined }
        : d
    );

    try {
      // Optimistically update the UI
      setDeliverables(updatedDeliverables);

      await api.put(
        `/cars/${deliverable.car_id}/deliverables/${deliverableId}`,
        {
          firebase_uid: userId,
          updated_at: new Date(),
        }
      );

      toast.success("Editor assigned successfully");
    } catch (error) {
      // Revert the optimistic update on error
      setDeliverables(deliverables);
      console.error("Error assigning deliverable:", error);
      toast.error("Failed to assign deliverable");
    }
  };

  const getSelectedDeliverablesData = () => {
    return deliverables
      .filter((deliverable) =>
        selectedDeliverables.includes(deliverable._id?.toString() || "")
      )
      .map((deliverable) => ({
        _id: deliverable._id?.toString() || "",
        car_id: deliverable.car_id?.toString() || "",
        title: deliverable.title || "Untitled",
      }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="min-w-[200px]">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all-statuses" value="all">
                All Statuses
              </SelectItem>
              <SelectItem key="not_started" value="not_started">
                Not Started
              </SelectItem>
              <SelectItem key="in_progress" value="in_progress">
                In Progress
              </SelectItem>
              <SelectItem key="done" value="done">
                Done
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all-platforms" value="all">
                All Platforms
              </SelectItem>
              <SelectItem key="instagram-reels" value="Instagram Reels">
                Instagram Reels
              </SelectItem>
              <SelectItem key="instagram-post" value="Instagram Post">
                Instagram Post
              </SelectItem>
              <SelectItem key="instagram-story" value="Instagram Story">
                Instagram Story
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
              <SelectItem key="other-platform" value="Other">
                Other
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all-types" value="all">
                All Types
              </SelectItem>
              <SelectItem key="photo-gallery" value="Photo Gallery">
                Photo Gallery
              </SelectItem>
              <SelectItem key="video" value="Video">
                Video
              </SelectItem>
              <SelectItem key="mixed-gallery" value="Mixed Gallery">
                Mixed Gallery
              </SelectItem>
              <SelectItem key="video-gallery" value="Video Gallery">
                Video Gallery
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCar} onValueChange={setSelectedCar}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Cars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all-cars" value="all">
                All Cars
              </SelectItem>
              {cars.map((car) => (
                <SelectItem key={car._id.toString()} value={car._id.toString()}>
                  {car.year} {car.make} {car.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={creativeRole} onValueChange={setCreativeRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Creative Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all-roles" value="all">
                All Roles
              </SelectItem>
              {CREATIVE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <FirestoreUserSelector
            value={editor || null}
            onChange={(userId: string | null) => {
              if (userId) {
                setEditor(userId);
              } else {
                setEditor("");
              }
            }}
            placeholder="Filter by editor"
            className="w-[180px]"
            allowUnassign={false}
            showAvatar={true}
          />
        </div>

        <div className="flex gap-2">
          <BatchTemplateManager />
          <NewDeliverableForm onDeliverableCreated={fetchDeliverables} />
          {selectedCar && selectedCar !== "all" && (
            <BatchDeliverableForm
              carId={selectedCar}
              onDeliverableCreated={fetchDeliverables}
            />
          )}
        </div>
      </div>

      <div className="space-y-4">
        {selectedDeliverables.length > 0 && (
          <div className="p-2 bg-muted rounded-md flex items-center gap-2">
            <span>
              {selectedDeliverables.length}{" "}
              {selectedDeliverables.length === 1
                ? "deliverable"
                : "deliverables"}{" "}
              selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedDeliverables([])}
            >
              Clear
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Batch Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => handleBatchStatusUpdate("not_started")}
                >
                  Mark as Not Started
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBatchStatusUpdate("in_progress")}
                >
                  Mark as In Progress
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBatchStatusUpdate("done")}
                >
                  Mark as Done
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBatchAssigning(true)}>
                  Assign Editor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBatchEditing(true)}>
                  Edit Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleAllDeliverables}
                  >
                    {selectedDeliverables.length === deliverables.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Edit Deadline</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead className="w-[180px]">Editor</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center p-4">
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : deliverables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center p-4">
                    No deliverables found
                  </TableCell>
                </TableRow>
              ) : (
                deliverables.map((deliverable) => {
                  const id = deliverable._id?.toString() || "";
                  const carId = deliverable.car_id?.toString() || "";
                  const editorKey = deliverable.firebase_uid || "unassigned";

                  return (
                    <TableRow key={`row-${id}-${editorKey}`}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleDeliverableSelection(id)}
                        >
                          {selectedDeliverables.includes(id) ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/deliverables/${id}`}
                          className="font-medium hover:underline"
                        >
                          {deliverable.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {deliverable.car?.year} {deliverable.car?.make}{" "}
                        {deliverable.car?.model}
                      </TableCell>
                      <TableCell>
                        <PlatformBadges
                          platform_id={deliverable.platform_id?.toString()}
                          platform={deliverable.platform}
                          platforms={deliverable.platforms}
                          maxVisible={1}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>{getMediaTypeName(deliverable)}</TableCell>
                      <TableCell>
                        {formatDeliverableDuration(deliverable)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            deliverable.status === "done"
                              ? "success"
                              : deliverable.status === "in_progress"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {deliverable.status === "not_started"
                            ? "Not Started"
                            : deliverable.status === "in_progress"
                              ? "In Progress"
                              : "Done"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(deliverable.edit_deadline),
                          "MM/dd/yyyy"
                        )}
                      </TableCell>
                      <TableCell>
                        {deliverable.release_date
                          ? format(
                              new Date(deliverable.release_date),
                              "MM/dd/yyyy"
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <FirestoreUserSelector
                          value={deliverable.firebase_uid || null}
                          onChange={(userId: string | null) =>
                            handleAssignDeliverable(
                              deliverable._id?.toString() || "",
                              userId
                            )
                          }
                          className="w-[180px]"
                          showAvatar={true}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <EditDeliverableForm
                            deliverable={deliverable}
                            onDeliverableUpdated={fetchDeliverables}
                            onClose={() => {}}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(id, carId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center">
          <div>
            {page > 1 && (
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
            )}
          </div>
          <div>
            Page {page} of {totalPages}
          </div>
          <div>
            {page < totalPages && (
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Batch assignment modal */}
      <BatchAssignmentModal
        isOpen={isBatchAssigning}
        onClose={() => setIsBatchAssigning(false)}
        selectedDeliverables={getSelectedDeliverablesData()}
        onSuccess={() => {
          fetchDeliverables();
          setSelectedDeliverables([]);
        }}
      />
    </div>
  );
}
