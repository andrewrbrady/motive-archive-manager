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
import { Trash2, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import NewDeliverableForm from "./NewDeliverableForm";
import EditDeliverableForm from "./EditDeliverableForm";

interface DeliverablesTabProps {
  carId: string | string[];
}

interface EditingCell {
  id: string;
  field: keyof Deliverable;
}

const EDITORS = [
  "Andrew Brady",
  "John Smith",
  "Jane Doe",
  "Mike Johnson",
  "Sarah Wilson",
] as const;

type Editor = (typeof EDITORS)[number];

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

  const fetchDeliverables = useCallback(async () => {
    try {
      const id = Array.isArray(carId) ? carId[0] : carId;
      const response = await fetch(`/api/cars/${id}/deliverables`);
      if (!response.ok) throw new Error("Failed to fetch deliverables");
      const data = await response.json();
      setDeliverables(data);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
    } finally {
      setIsLoading(false);
    }
  }, [carId]);

  useEffect(() => {
    fetchDeliverables();
  }, [fetchDeliverables]);

  const handleDelete = async (deliverableId: string) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) {
      return;
    }

    try {
      const id = Array.isArray(carId) ? carId[0] : carId;
      const response = await fetch(
        `/api/cars/${id}/deliverables/${deliverableId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete deliverable");
      }

      toast.success("Deliverable deleted successfully");
      fetchDeliverables();
    } catch (error) {
      console.error("Error deleting deliverable:", error);
      toast.error("Failed to delete deliverable");
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
        not_started: "bg-zinc-500 hover:bg-zinc-600",
        in_progress: "bg-zinc-600 hover:bg-zinc-700",
        done: "bg-zinc-700 hover:bg-zinc-800",
      },
      platform: "bg-zinc-600 hover:bg-zinc-700",
      type: "bg-zinc-600 hover:bg-zinc-700",
      editor: "bg-zinc-600 hover:bg-zinc-700",
    };

    if (field === "status") return colors.status[value as DeliverableStatus];
    if (field === "platform") return colors.platform;
    if (field === "type") return colors.type;
    if (field === "editor") return colors.editor;
    return "bg-zinc-500";
  };

  const handleFieldChange = async (
    deliverable: Deliverable,
    field: keyof Deliverable,
    value: string
  ) => {
    try {
      const id = Array.isArray(carId) ? carId[0] : carId;

      // Convert duration to number
      const processedValue = field === "duration" ? parseInt(value) : value;

      const response = await fetch(
        `/api/cars/${id}/deliverables/${deliverable._id}`,
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
        throw new Error("Failed to update deliverable");
      }

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

  const renderPillCell = (
    deliverable: Deliverable,
    field: keyof Deliverable
  ) => {
    const value = deliverable[field]?.toString() || "";

    let options: { value: string; label: string }[] = [];
    if (field === "platform") {
      options = [
        { value: "Instagram", label: "Instagram" },
        { value: "YouTube", label: "YouTube" },
        { value: "TikTok", label: "TikTok" },
        { value: "Facebook", label: "Facebook" },
        { value: "Other", label: "Other" },
      ];
    } else if (field === "type") {
      options = [
        { value: "feature", label: "Feature" },
        { value: "promo", label: "Promo" },
        { value: "review", label: "Review" },
        { value: "walkthrough", label: "Walkthrough" },
        { value: "highlights", label: "Highlights" },
        { value: "other", label: "Other" },
      ];
    } else if (field === "status") {
      options = [
        { value: "not_started", label: "Not Started" },
        { value: "in_progress", label: "In Progress" },
        { value: "done", label: "Done" },
      ];
    } else if (field === "editor") {
      options = EDITORS.map((editor) => ({ value: editor, label: editor }));
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
        <SelectTrigger className="w-[140px] border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
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
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-red-500" />
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
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-red-500" />
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
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="promo">Promo</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="walkthrough">Walkthrough</SelectItem>
                <SelectItem value="highlights">Highlights</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      }

      if (field === "edit_deadline" || field === "release_date") {
        return (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={new Date(editValue).toISOString().split("T")[0]}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-[140px]"
            />
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-red-500" />
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
              className="w-[140px]"
            />
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCell(null)}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-[140px]"
          />
          <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
            <Check className="h-4 w-4 text-green-500" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingCell(null)}
          >
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      );
    }

    if (field === "edit_deadline" || field === "release_date") {
      const date = new Date(deliverable[field]);
      date.setDate(date.getDate() + 1);
      return (
        <div
          onClick={() => handleCellClick(deliverable, field)}
          className="cursor-pointer"
        >
          {format(date, "MMM d, yyyy")}
        </div>
      );
    }

    if (field === "duration") {
      return (
        <div
          onClick={() => handleCellClick(deliverable, field)}
          className="cursor-pointer"
        >
          {formatDuration(deliverable.duration)}
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Deliverables</h2>
        <NewDeliverableForm
          carId={Array.isArray(carId) ? carId[0] : carId}
          onDeliverableCreated={fetchDeliverables}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Editor</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Release Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading deliverables...
                </TableCell>
              </TableRow>
            ) : deliverables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No deliverables found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              deliverables.map((deliverable) => (
                <TableRow key={deliverable._id?.toString()}>
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
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
