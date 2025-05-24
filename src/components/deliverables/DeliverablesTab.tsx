import { useState, useEffect, useCallback } from "react";
import {
  Deliverable,
  Platform,
  DeliverableType,
  DeliverableStatus,
} from "@/types/deliverable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Trash2, Check, X, CheckSquare, Square } from "lucide-react";
import { toast } from "react-hot-toast";
import NewDeliverableForm from "./NewDeliverableForm";
import EditDeliverableForm from "./EditDeliverableForm";
import BatchDeliverableForm from "./BatchDeliverableForm";
import { DatePicker } from "@/components/ui/date-picker";

interface DeliverablesTabProps {
  carId: string | string[];
}

interface EditingCell {
  id: string;
  field: keyof Deliverable;
}

interface User {
  uid: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function DeliverablesTab({ carId }: DeliverablesTabProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    []
  );
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] =
    useState<Deliverable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDeliverables = useCallback(async () => {
    try {
      const id = Array.isArray(carId) ? carId[0] : carId;

      // Check if carId is a valid MongoDB ObjectId before making the request
      if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.error("Invalid carId format:", id);
        setDeliverables([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/cars/${id}/deliverables`);
      if (!response.ok) {
        console.error(`API returned status: ${response.status}`);
        // Only show error for actual API errors, not empty results
        if (response.status !== 404) {
          throw new Error("Failed to fetch deliverables");
        }
        // If 404, just set empty array and don't show error
        setDeliverables([]);
        return;
      }

      const data = await response.json();
      // Handle both array responses and empty responses correctly
      setDeliverables(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
      setDeliverables([]);
    } finally {
      setIsLoading(false);
    }
  }, [carId]);

  useEffect(() => {
    fetchDeliverables();
  }, [fetchDeliverables]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Starting to fetch users...");
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();

        // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Raw API response:", data);
        console.log(
          "Fetched users in DeliverablesTab:",
          Array.isArray(data) ? data.length : "not an array"
        );

        // API returns an array directly, not an object with users property
        // Store all users
        if (Array.isArray(data)) {
          const activeUsers = data.filter(
            (user: User) => user.status === "active"
          );
          // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Active users:", activeUsers.length);
          // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Sample user:", activeUsers[0]);
          setAllUsers(activeUsers);

          // For backward compatibility, still set the editors list
          // But we'll use allUsers where we need all active users
          const editors = activeUsers.filter((user: User) =>
            user.creativeRoles.includes("video_editor")
          );
          // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Editors:", editors.length);
          setUsers(editors);
        } else {
          console.error("Unexpected API response structure:", data);
          toast.error("Failed to load users properly");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      }
    };

    // Only fetch if we don't already have users
    if (allUsers.length === 0) {
      fetchUsers();
    }
  }, []); // Remove allUsers.length from dependency to prevent re-fetching

  const handleDelete = async (deliverableId: string) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) {
      return;
    }

    try {
      const id = Array.isArray(carId) ? carId[0] : carId;

      // Validate carId
      if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.error("Invalid carId format:", id);
        toast.error("Cannot delete: Invalid car ID");
        return;
      }

      // Validate deliverableId
      if (!deliverableId || typeof deliverableId !== "string") {
        console.error("Invalid deliverableId:", deliverableId);
        toast.error("Cannot delete: Invalid deliverable ID");
        return;
      }

      const response = await fetch(
        `/api/cars/${id}/deliverables/${deliverableId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        // If the deliverable was not found, don't show an error, just refresh the list
        if (response.status === 404) {
          // [REMOVED] // [REMOVED] console.log("Deliverable not found, refreshing list");
          fetchDeliverables();
          return;
        }
        throw new Error("Failed to delete deliverable");
      }

      toast.success("Deliverable deleted successfully");
      fetchDeliverables();
    } catch (error) {
      console.error("Error deleting deliverable:", error);
      toast.error("Failed to delete deliverable");
    }
  };

  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedDeliverables([]);
  };

  const toggleDeliverableSelection = (id: string) => {
    setSelectedDeliverables((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const toggleAllDeliverables = () => {
    if (selectedDeliverables.length === deliverables.length) {
      setSelectedDeliverables([]);
    } else {
      setSelectedDeliverables(deliverables.map((d) => d._id?.toString() || ""));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedDeliverables.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedDeliverables.length} deliverables?`
    );

    if (!confirmed) return;

    try {
      const id = Array.isArray(carId) ? carId[0] : carId;

      // Validate carId
      if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.error("Invalid carId format:", id);
        toast.error("Cannot delete: Invalid car ID");
        return;
      }

      // Filter out any invalid deliverable IDs
      const validDeliverableIds = selectedDeliverables.filter(
        (delId) => delId && typeof delId === "string"
      );

      if (validDeliverableIds.length === 0) {
        console.error("No valid deliverable IDs to delete");
        toast.error("Cannot delete: No valid deliverables selected");
        return;
      }

      // Track any deletion failures
      let failureCount = 0;

      await Promise.all(
        validDeliverableIds.map(async (delId) => {
          try {
            const response = await fetch(
              `/api/cars/${id}/deliverables/${delId}`,
              {
                method: "DELETE",
              }
            );

            if (!response.ok && response.status !== 404) {
              failureCount++;
            }
          } catch (err) {
            console.error("Error deleting deliverable:", delId, err);
            failureCount++;
          }
        })
      );

      if (failureCount > 0) {
        toast.error(`Failed to delete ${failureCount} deliverables`);
      } else {
        toast.success(`Deleted ${validDeliverableIds.length} deliverables`);
      }

      setSelectedDeliverables([]);
      setIsBatchMode(false);
      fetchDeliverables();
    } catch (error) {
      console.error("Error deleting deliverables:", error);
      toast.error("Failed to delete deliverables");
    }
  };

  const handleCellClick = (
    deliverable: Deliverable,
    field: keyof Deliverable
  ) => {
    if (field === "_id" || field === "car_id") return;

    setEditingCell({ id: deliverable._id?.toString() || "", field });
    setEditValue(deliverable[field]?.toString() || "");
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    try {
      const deliverable = deliverables.find(
        (d) => d._id?.toString() === editingCell.id
      );
      if (!deliverable) return;

      const id = Array.isArray(carId) ? carId[0] : carId;

      // Validate carId
      if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.error("Invalid carId format:", id);
        toast.error("Cannot update: Invalid car ID");
        setEditingCell(null);
        setEditValue("");
        return;
      }

      // Validate deliverable._id
      if (!editingCell.id || typeof editingCell.id !== "string") {
        console.error("Invalid deliverable._id:", editingCell.id);
        toast.error("Cannot update: Invalid deliverable");
        setEditingCell(null);
        setEditValue("");
        return;
      }

      // Process the value based on the field type
      const processedValue =
        editingCell.field === "duration" ? parseInt(editValue) : editValue;

      const response = await fetch(
        `/api/cars/${id}/deliverables/${editingCell.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            [editingCell.field]: processedValue,
            updated_at: new Date(),
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.error("Deliverable not found");
          toast.error("Deliverable not found");
          fetchDeliverables();
          return;
        }
        throw new Error("Failed to update deliverable");
      }

      toast.success("Updated successfully");
      fetchDeliverables();
    } catch (error) {
      console.error("Error updating deliverable:", error);
      toast.error("Failed to update");
    } finally {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const getPillColor = (field: string, value: string) => {
    const colors = {
      status: {
        not_started:
          "bg-[hsl(var(--background))] hover:bg-[hsl(var(--background))]",
        in_progress:
          "bg-[hsl(var(--background))] hover:bg-[hsl(var(--background))]",
        done: "bg-[hsl(var(--background))] hover:bg-[hsl(var(--background))]",
      },
      platform: "bg-[hsl(var(--background))] hover:bg-[hsl(var(--background))]",
      type: "bg-[hsl(var(--background))] hover:bg-[hsl(var(--background))]",
      editor: "bg-[hsl(var(--background))] hover:bg-[hsl(var(--background))]",
    };

    if (field === "status") return colors.status[value as DeliverableStatus];
    if (field === "platform") return colors.platform;
    if (field === "type") return colors.type;
    if (field === "editor") return colors.editor;
    return "bg-[hsl(var(--background))]";
  };

  const handleFieldChange = async (
    deliverable: Deliverable,
    field: keyof Deliverable,
    value: string
  ) => {
    try {
      const id = Array.isArray(carId) ? carId[0] : carId;

      // Validate carId
      if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.error("Invalid carId format:", id);
        toast.error("Cannot update: Invalid car ID");
        return;
      }

      // Validate deliverable._id
      const deliverableId = deliverable._id?.toString();
      if (!deliverableId || typeof deliverableId !== "string") {
        console.error("Invalid deliverable._id:", deliverable._id);
        toast.error("Cannot update: Invalid deliverable");
        return;
      }

      // Convert duration to number
      const processedValue = field === "duration" ? parseInt(value) : value;

      // Prepare the update payload
      let updatePayload: any = {
        [field]: processedValue,
        updated_at: new Date(),
      };

      // Special handling for editor field - also update firebase_uid
      if (field === "editor") {
        const selectedUser = allUsers.find((user) => user.uid === value);
        if (selectedUser) {
          updatePayload = {
            editor: selectedUser.name, // Store the name for display
            firebase_uid: selectedUser.uid, // Store the UID for filtering
            updated_at: new Date(),
          };
        }
      }

      // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Making API request...");
      console.log(
        "DeliverablesTab: URL:",
        `/api/cars/${id}/deliverables/${deliverableId}`
      );
      // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Payload:", updatePayload);
      // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Field:", field, "Value:", value);

      const response = await fetch(
        `/api/cars/${id}/deliverables/${deliverableId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Response status:", response.status);
      // [REMOVED] // [REMOVED] console.log("DeliverablesTab: Response ok:", response.ok);

      if (!response.ok) {
        if (response.status === 404) {
          console.error("Deliverable not found");
          toast.error("Deliverable not found");
          fetchDeliverables();
          return;
        }
        const errorText = await response.text();
        console.error("DeliverablesTab: API error response:", errorText);
        throw new Error(
          `Failed to update deliverable: ${response.status} ${errorText}`
        );
      }

      // Update the state appropriately
      if (field === "editor") {
        const selectedUser = allUsers.find((user) => user.uid === value);
        if (selectedUser) {
          setDeliverables((prevDeliverables) =>
            prevDeliverables.map((d) =>
              d._id === deliverable._id
                ? {
                    ...d,
                    editor: selectedUser.name,
                    firebase_uid: selectedUser.uid,
                  }
                : d
            )
          );
        }
      } else {
        // Only update the state if the API call was successful
        setDeliverables((prevDeliverables) =>
          prevDeliverables.map((d) =>
            d._id === deliverable._id ? { ...d, [field]: processedValue } : d
          )
        );
      }

      toast.success("Updated successfully");
    } catch (error) {
      console.error("DeliverablesTab: Error in handleFieldChange:", error);

      // Type guard for error handling
      const err = error as Error;
      console.error("DeliverablesTab: Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });

      // Check if it's a network error
      if (
        error instanceof TypeError &&
        err.message.includes("Failed to fetch")
      ) {
        console.error("DeliverablesTab: Network error detected");
        toast.error(
          "Network error: Please check your connection and try again"
        );
      } else {
        toast.error(`Failed to update: ${err.message}`);
      }
      fetchDeliverables();
    }
  };

  const getRelevantUsers = (deliverableType: string) => {
    // Return all active users without filtering by creative role
    // This ensures maximum flexibility in assigning users to deliverables
    return allUsers;
  };

  const renderPillCell = (
    deliverable: Deliverable,
    field: keyof Deliverable
  ) => {
    const value = deliverable[field]?.toString() || "";

    let options: { value: string; label: string; key?: string }[] = [];
    if (field === "platform") {
      options = [
        { value: "Instagram Reels", label: "Instagram Reels" },
        { value: "Instagram Post", label: "Instagram Post" },
        { value: "Instagram Story", label: "Instagram Story" },
        { value: "YouTube", label: "YouTube" },
        { value: "YouTube Shorts", label: "YouTube Shorts" },
        { value: "TikTok", label: "TikTok" },
        { value: "Facebook", label: "Facebook" },
        { value: "Bring a Trailer", label: "Bring a Trailer" },
        { value: "Other", label: "Other" },
      ];
    } else if (field === "type") {
      options = [
        { value: "Photo Gallery", label: "Photo Gallery" },
        { value: "Video", label: "Video" },
        { value: "Mixed Gallery", label: "Mixed Gallery" },
        { value: "Video Gallery", label: "Video Gallery" },
        { value: "Still", label: "Still" },
        { value: "Graphic", label: "Graphic" },
      ];
    } else if (field === "status") {
      options = [
        { value: "not_started", label: "Not Started" },
        { value: "in_progress", label: "In Progress" },
        { value: "done", label: "Done" },
      ];
    } else if (field === "editor") {
      const relevantUsers = getRelevantUsers(deliverable.type);

      // Group users by name to detect duplicates
      const usersByName = relevantUsers.reduce(
        (acc, user) => {
          if (!acc[user.name]) {
            acc[user.name] = [];
          }
          acc[user.name].push(user);
          return acc;
        },
        {} as Record<string, User[]>
      );

      options = relevantUsers.map((user) => {
        const usersWithSameName = usersByName[user.name];
        const isDuplicate = usersWithSameName.length > 1;

        // If there are duplicate names, show email in parentheses
        const label = isDuplicate ? `${user.name} (${user.email})` : user.name;

        return {
          value: user.uid, // Use UID as value to ensure uniqueness
          label: label,
          key: user.uid,
        };
      });
    }

    // For editor field, handle both UID-based and name-based values (backward compatibility)
    let currentValue = value;
    let currentLabel = value;

    if (field === "editor") {
      // Check if we have a firebase_uid to use as the value
      const firebaseUid = (deliverable as any).firebase_uid;

      if (firebaseUid) {
        // Use the firebase_uid as the value and find the user for the label
        currentValue = firebaseUid;
        const currentUser = allUsers.find((user) => user.uid === firebaseUid);
        if (currentUser) {
          const usersWithSameName = allUsers.filter(
            (u) => u.name === currentUser.name
          );
          const isDuplicate = usersWithSameName.length > 1;
          currentLabel = isDuplicate
            ? `${currentUser.name} (${currentUser.email})`
            : currentUser.name;
        } else {
          // Fallback to stored editor name if user not found
          currentLabel = value;
        }
      } else {
        // Legacy format: try to find by name but don't auto-update
        const currentUser = allUsers.find((user) => user.name === value);
        if (currentUser) {
          currentValue = currentUser.uid;
          const usersWithSameName = allUsers.filter(
            (u) => u.name === currentUser.name
          );
          const isDuplicate = usersWithSameName.length > 1;
          currentLabel = isDuplicate
            ? `${currentUser.name} (${currentUser.email})`
            : currentUser.name;
        } else {
          // If we can't find the user, show the stored value
          currentLabel = value;
        }
      }
    } else {
      const currentOption = options.find((opt) => opt.value === value);
      currentLabel = currentOption?.label || value;
    }

    return (
      <Select
        value={currentValue}
        onValueChange={(newValue) => {
          handleFieldChange(deliverable, field, newValue);
        }}
      >
        <SelectTrigger className="w-full border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-transparent hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] transition-colors text-xs md:text-sm">
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.key || option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const isValidDate = (date: any): boolean => {
    if (!date) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  };

  const safeFormat = (date: any, formatStr: string): string => {
    try {
      if (!isValidDate(date)) return "N/A";
      return format(new Date(date), formatStr);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const safeDateValue = (dateString: string): Date | undefined => {
    try {
      if (!dateString) return undefined;
      const date = new Date(dateString);
      return isValidDate(date) ? date : undefined;
    } catch (error) {
      return undefined;
    }
  };

  const handleOpenModal = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedDeliverable(null);
    setIsModalOpen(false);
  };

  const getStatusColor = (status: DeliverableStatus) => {
    switch (status) {
      case "not_started":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "done":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusText = (status: DeliverableStatus) => {
    switch (status) {
      case "not_started":
        return "Not Started";
      case "in_progress":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return status;
    }
  };

  const renderCell = (deliverable: Deliverable, field: keyof Deliverable) => {
    const isEditing =
      editingCell?.id === deliverable._id?.toString() &&
      editingCell?.field === field;

    if (isEditing) {
      if (field === "status") {
        return (
          <div className="flex items-center gap-2">
            <Select
              value={editValue}
              onValueChange={(value) => setEditValue(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-success-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-destructive-500" />
            </Button>
          </div>
        );
      }

      if (field === "platform") {
        return (
          <div className="flex items-center gap-2">
            <Select
              value={editValue}
              onValueChange={(value) => setEditValue(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram Reels">Instagram Reels</SelectItem>
                <SelectItem value="Instagram Post">Instagram Post</SelectItem>
                <SelectItem value="Instagram Story">Instagram Story</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="YouTube Shorts">YouTube Shorts</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Bring a Trailer">Bring a Trailer</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-success-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-destructive-500" />
            </Button>
          </div>
        );
      }

      if (field === "type") {
        return (
          <div className="flex items-center gap-2">
            <Select
              value={editValue}
              onValueChange={(value) => setEditValue(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
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
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-success-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-destructive-500" />
            </Button>
          </div>
        );
      }

      if (field === "duration") {
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-[180px]"
            />
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-success-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-destructive-500" />
            </Button>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full"
          />
          <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
            <Check className="h-4 w-4 text-success-500" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingCell(null)}
          >
            <X className="h-4 w-4 text-destructive-500" />
          </Button>
        </div>
      );
    }

    if (field === "edit_deadline" || field === "release_date") {
      // Directly render the DatePicker without requiring an edit mode first
      // Get the value from the deliverable as a string
      const deliverableValue = String(deliverable[field] || "");
      const dateValue = safeDateValue(deliverableValue);

      return (
        <DatePicker
          date={dateValue}
          setDate={(date) => {
            if (date) {
              // When date changes, update the deliverable
              // Need to call the async function but we don't need to await its result here
              void handleFieldChange(deliverable, field, date.toISOString());
            }
          }}
          className="w-full"
        />
      );
    }

    if (field === "duration") {
      return (
        <div
          onClick={() => handleCellClick(deliverable, field)}
          className="cursor-pointer"
        >
          {deliverable.type === "Photo Gallery"
            ? "N/A"
            : formatDuration(deliverable.duration)}
        </div>
      );
    }

    if (["platform", "type", "status", "editor"].includes(field)) {
      return renderPillCell(deliverable, field);
    }

    return (
      <div
        onClick={() => handleCellClick(deliverable, field)}
        className="cursor-pointer"
      >
        {deliverable[field]?.toString()}
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Desktop Header - Title and buttons side by side */}
      <div className="hidden md:flex justify-between items-center">
        <h2 className="text-2xl font-bold">Deliverables</h2>
        <div className="flex gap-2">
          {isBatchMode ? (
            <>
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={selectedDeliverables.length === 0}
              >
                Delete Selected ({selectedDeliverables.length})
              </Button>
              <Button variant="outline" onClick={toggleBatchMode}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={toggleBatchMode}>
                Batch Delete
              </Button>
              <BatchDeliverableForm
                carId={Array.isArray(carId) ? carId[0] : carId}
                onDeliverableCreated={fetchDeliverables}
              />
              <NewDeliverableForm
                carId={Array.isArray(carId) ? carId[0] : carId}
                onDeliverableCreated={fetchDeliverables}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile Header - Title on top, buttons below */}
      <div className="block md:hidden space-y-3">
        <h2 className="text-2xl font-bold">Deliverables</h2>
        <div className="flex gap-2 flex-wrap">
          {isBatchMode ? (
            <>
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={selectedDeliverables.length === 0}
                size="sm"
              >
                Delete Selected ({selectedDeliverables.length})
              </Button>
              <Button variant="outline" onClick={toggleBatchMode} size="sm">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={toggleBatchMode} size="sm">
                Batch Delete
              </Button>
              <BatchDeliverableForm
                carId={Array.isArray(carId) ? carId[0] : carId}
                onDeliverableCreated={fetchDeliverables}
              />
              <NewDeliverableForm
                carId={Array.isArray(carId) ? carId[0] : carId}
                onDeliverableCreated={fetchDeliverables}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile View - Cards */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading deliverables...</p>
          </div>
        ) : deliverables.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No deliverables found. Create your first one!
            </p>
          </div>
        ) : (
          deliverables.map((deliverable) => (
            <div
              key={deliverable._id?.toString()}
              onClick={() => handleOpenModal(deliverable)}
              className="border border-border rounded-lg px-3 py-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {/* Title - takes up remaining space */}
                <h3 className="font-medium text-foreground line-clamp-1 flex-1 min-w-0">
                  {deliverable.title}
                </h3>

                {/* Platform Dropdown */}
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  {renderPillCell(deliverable, "platform")}
                </div>

                {/* Status Dropdown */}
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  {renderPillCell(deliverable, "status")}
                </div>

                {/* Batch Mode Checkbox */}
                {isBatchMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDeliverableSelection(
                        deliverable._id?.toString() || ""
                      );
                    }}
                    className="p-1 shrink-0"
                  >
                    {selectedDeliverables.includes(
                      deliverable._id?.toString() || ""
                    ) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block rounded-md border w-full overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              {isBatchMode && (
                <TableHead className="w-12 whitespace-nowrap px-2 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllDeliverables}
                    className="p-0"
                  >
                    {selectedDeliverables.length === deliverables.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              <TableHead className="w-[20%] px-2 py-2">Title</TableHead>
              <TableHead className="w-[15%] px-2 py-2">Platform</TableHead>
              <TableHead className="w-[10%] px-2 py-2">Type</TableHead>
              <TableHead className="w-[8%] px-2 py-2">Status</TableHead>
              <TableHead className="w-[6%] px-2 py-2">Duration</TableHead>
              <TableHead className="w-[15%] px-2 py-2">Editor</TableHead>
              <TableHead className="w-[10%] px-2 py-2">Deadline</TableHead>
              <TableHead className="w-[10%] px-2 py-2">Release Date</TableHead>
              <TableHead className="w-[6%] text-right px-2 py-2">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={isBatchMode ? 10 : 9}
                  className="text-center py-8"
                >
                  Loading deliverables...
                </TableCell>
              </TableRow>
            ) : deliverables.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isBatchMode ? 10 : 9}
                  className="text-center py-8"
                >
                  No deliverables found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              deliverables.map((deliverable) => (
                <TableRow key={deliverable._id?.toString()}>
                  {isBatchMode && (
                    <TableCell className="px-2 py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleDeliverableSelection(
                            deliverable._id?.toString() || ""
                          )
                        }
                        className="p-0"
                      >
                        {selectedDeliverables.includes(
                          deliverable._id?.toString() || ""
                        ) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1">
                    {renderCell(deliverable, "title")}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {renderCell(deliverable, "platform")}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {renderCell(deliverable, "type")}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {renderCell(deliverable, "status")}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {renderCell(deliverable, "duration")}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {renderCell(deliverable, "editor")}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {renderCell(deliverable, "edit_deadline")}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {renderCell(deliverable, "release_date")}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex justify-end items-center gap-1">
                      {!isBatchMode && (
                        <>
                          <EditDeliverableForm
                            deliverable={deliverable}
                            onDeliverableUpdated={fetchDeliverables}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDelete(deliverable._id?.toString() || "")
                            }
                            className="text-destructive-500 hover:text-destructive-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Deliverable Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedDeliverable?.title}
            </DialogTitle>
            <DialogClose />
          </DialogHeader>

          {selectedDeliverable && (
            <div className="space-y-6 pt-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Title
                    </label>
                    <p className="text-foreground">
                      {selectedDeliverable.title}
                    </p>
                  </div>

                  {selectedDeliverable.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Description
                      </label>
                      <p className="text-foreground">
                        {selectedDeliverable.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Platform
                    </label>
                    <Badge variant="outline" className="mt-1">
                      {selectedDeliverable.platform}
                    </Badge>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Type
                    </label>
                    <Badge variant="outline" className="mt-1">
                      {selectedDeliverable.type}
                    </Badge>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <Badge
                      className={`mt-1 ${getStatusColor(selectedDeliverable.status)}`}
                    >
                      {getStatusText(selectedDeliverable.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Technical Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Duration
                    </label>
                    <p className="text-foreground">
                      {selectedDeliverable.type === "Photo Gallery"
                        ? "N/A"
                        : formatDuration(selectedDeliverable.duration)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Aspect Ratio
                    </label>
                    <p className="text-foreground">
                      {selectedDeliverable.aspect_ratio}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Editor
                    </label>
                    <p className="text-foreground">
                      {selectedDeliverable.editor}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Important Dates</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Edit Deadline
                    </label>
                    <p className="text-foreground">
                      {selectedDeliverable.edit_deadline
                        ? safeFormat(selectedDeliverable.edit_deadline, "PPP")
                        : "Not set"}
                    </p>
                  </div>

                  {selectedDeliverable.release_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Release Date
                      </label>
                      <p className="text-foreground">
                        {safeFormat(selectedDeliverable.release_date, "PPP")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {(selectedDeliverable.target_audience ||
                selectedDeliverable.music_track ||
                selectedDeliverable.tags?.length > 0 ||
                selectedDeliverable.publishing_url ||
                selectedDeliverable.assets_location) && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedDeliverable.target_audience && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Target Audience
                        </label>
                        <p className="text-foreground">
                          {selectedDeliverable.target_audience}
                        </p>
                      </div>
                    )}

                    {selectedDeliverable.music_track && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Music Track
                        </label>
                        <p className="text-foreground">
                          {selectedDeliverable.music_track}
                        </p>
                      </div>
                    )}

                    {selectedDeliverable.tags &&
                      selectedDeliverable.tags.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Tags
                          </label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedDeliverable.tags.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {selectedDeliverable.publishing_url && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Publishing URL
                        </label>
                        <a
                          href={selectedDeliverable.publishing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 break-all"
                        >
                          {selectedDeliverable.publishing_url}
                        </a>
                      </div>
                    )}

                    {selectedDeliverable.assets_location && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Assets Location
                        </label>
                        <p className="text-foreground">
                          {selectedDeliverable.assets_location}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <EditDeliverableForm
                  deliverable={selectedDeliverable}
                  onDeliverableUpdated={() => {
                    fetchDeliverables();
                    handleCloseModal();
                  }}
                />
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedDeliverable._id?.toString() || "");
                    handleCloseModal();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
