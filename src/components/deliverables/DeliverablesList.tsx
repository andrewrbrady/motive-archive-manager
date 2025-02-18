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
import { format } from "date-fns";
import { Trash2, Search, Filter } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Deliverable,
  Platform,
  DeliverableStatus,
  DeliverableType,
} from "@/types/deliverable";
import NewDeliverableForm from "./NewDeliverableForm";
import EditDeliverableForm from "./EditDeliverableForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface DeliverableWithCar extends Deliverable {
  car?: Car;
}

const formatDuration = (deliverable: Deliverable) => {
  if (deliverable.type === "Photo Gallery") {
    return "N/A";
  }
  const minutes = Math.floor(deliverable.duration / 60);
  const seconds = deliverable.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function DeliverablesList() {
  const [deliverables, setDeliverables] = useState<DeliverableWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [editor, setEditor] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState("");

  const fetchDeliverables = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        sortField: "edit_deadline",
        sortDirection: "asc",
      });

      if (search) params.append("search", search);
      if (status) params.append("status", status);
      if (platform) params.append("platform", platform);
      if (type) params.append("type", type);
      if (editor) params.append("editor", editor);

      const response = await fetch(`/api/deliverables?${params}`);
      if (!response.ok) throw new Error("Failed to fetch deliverables");
      const data = await response.json();
      setDeliverables(data.deliverables);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliverables();
  }, [page, search, status, platform, type, editor]);

  const handleDelete = async (deliverableId: string, carId: string) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/cars/${carId}/deliverables/${deliverableId}`,
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

  const handleFieldChange = async (
    deliverable: Deliverable,
    field: keyof Deliverable,
    value: string
  ) => {
    try {
      const response = await fetch(
        `/api/cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            [field]: field === "duration" ? parseInt(value) : value,
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
      ];
    } else if (field === "status") {
      options = [
        { value: "not_started", label: "Not Started" },
        { value: "in_progress", label: "In Progress" },
        { value: "done", label: "Done" },
      ];
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
        <SelectTrigger className="w-[180px] border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search deliverables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <div className="p-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-2">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Platforms</SelectItem>
                  <SelectItem value="Instagram Reels">
                    Instagram Reels
                  </SelectItem>
                  <SelectItem value="Instagram Post">Instagram Post</SelectItem>
                  <SelectItem value="Instagram Story">
                    Instagram Story
                  </SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="YouTube Shorts">YouTube Shorts</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Bring a Trailer">
                    Bring a Trailer
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Photo Gallery">Photo Gallery</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Mixed Gallery">Mixed Gallery</SelectItem>
                  <SelectItem value="Video Gallery">Video Gallery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Car</TableHead>
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
                <TableCell colSpan={10} className="text-center py-8">
                  Loading deliverables...
                </TableCell>
              </TableRow>
            ) : deliverables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  No deliverables found
                </TableCell>
              </TableRow>
            ) : (
              deliverables.map((deliverable) => (
                <TableRow key={deliverable._id?.toString()}>
                  <TableCell>
                    {deliverable.car ? (
                      <Link
                        href={`/cars/${deliverable.car._id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {`${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model}`}
                      </Link>
                    ) : (
                      "Unknown Car"
                    )}
                  </TableCell>
                  <TableCell>{deliverable.title}</TableCell>
                  <TableCell>
                    {renderPillCell(deliverable, "platform")}
                  </TableCell>
                  <TableCell>{renderPillCell(deliverable, "type")}</TableCell>
                  <TableCell>{renderPillCell(deliverable, "status")}</TableCell>
                  <TableCell>{formatDuration(deliverable)}</TableCell>
                  <TableCell>{deliverable.editor}</TableCell>
                  <TableCell>
                    {format(new Date(deliverable.edit_deadline), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(deliverable.release_date), "MMM d, yyyy")}
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
                          handleDelete(
                            deliverable._id?.toString() || "",
                            deliverable.car_id.toString()
                          )
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

      <div className="flex justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
