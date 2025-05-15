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
  _id: string;
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
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();

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
          setAllUsers(activeUsers);

          // For backward compatibility, still set the editors list
          // But we'll use allUsers where we need all active users
          const editors = activeUsers.filter((user: User) =>
            user.creativeRoles.includes("video_editor")
          );
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

    fetchUsers();
  }, []);

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
          console.log("Deliverable not found, refreshing list");
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

      const response = await fetch(
        `/api/cars/${id}/deliverables/${deliverableId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            [field]: processedValue,
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

      // Only update the state if the API call was successful
      setDeliverables((prevDeliverables) =>
        prevDeliverables.map((d) =>
          d._id === deliverable._id ? { ...d, [field]: processedValue } : d
        )
      );

      toast.success("Updated successfully");
    } catch (error) {
      console.error("Error updating deliverable:", error);
      toast.error("Failed to update");
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
      options = getRelevantUsers(deliverable.type).map((user) => ({
        value: user.name,
        label: user.name,
        key: user._id || user.name,
      }));
    }

    const currentOption = options.find((opt) => opt.value === value);
    const currentLabel = currentOption?.label || value;

    return (
      <Select
        defaultValue={value}
        value={value}
        onValueChange={(newValue) => {
          handleFieldChange(deliverable, field, newValue);
        }}
      >
        <SelectTrigger className="w-[180px] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-transparent hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] transition-colors">
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

  // Helper to safely handle date conversions
  const safeDateValue = (dateString: string): Date | undefined => {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch (error) {
      console.error("Error parsing date:", error);
      return undefined;
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
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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
          className="w-[180px]"
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
      <div className="flex justify-between items-center">
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

      <div className="rounded-md border w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {isBatchMode && (
                <TableHead className="w-[50px] whitespace-nowrap">
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
              <TableHead className="whitespace-nowrap w-[250px]">
                Title
              </TableHead>
              <TableHead className="whitespace-nowrap w-[180px]">
                Platform
              </TableHead>
              <TableHead className="whitespace-nowrap w-[160px]">
                Type
              </TableHead>
              <TableHead className="whitespace-nowrap w-[140px]">
                Status
              </TableHead>
              <TableHead className="whitespace-nowrap w-[100px]">
                Duration
              </TableHead>
              <TableHead className="whitespace-nowrap w-[180px]">
                Editor
              </TableHead>
              <TableHead className="whitespace-nowrap w-[130px]">
                Deadline
              </TableHead>
              <TableHead className="whitespace-nowrap w-[130px]">
                Release Date
              </TableHead>
              <TableHead className="text-right whitespace-nowrap w-[100px]">
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
                    <TableCell>
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
                  <TableCell>{renderCell(deliverable, "title")}</TableCell>
                  <TableCell>{renderCell(deliverable, "platform")}</TableCell>
                  <TableCell>{renderCell(deliverable, "type")}</TableCell>
                  <TableCell>{renderCell(deliverable, "status")}</TableCell>
                  <TableCell>{renderCell(deliverable, "duration")}</TableCell>
                  <TableCell>{renderCell(deliverable, "editor")}</TableCell>
                  <TableCell>
                    {renderCell(deliverable, "edit_deadline")}
                  </TableCell>
                  <TableCell>
                    {renderCell(deliverable, "release_date")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-2">
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
    </div>
  );
}
