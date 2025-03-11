"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Trash2, Search, Filter, CheckSquare, Square } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Deliverable,
  Platform,
  DeliverableStatus,
  DeliverableType,
} from "@/types/deliverable";
import NewDeliverableForm from "./NewDeliverableForm";
import EditDeliverableForm from "./EditDeliverableForm";
import BatchDeliverableForm from "./BatchDeliverableForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import BatchTemplateManager from "./BatchTemplateManager";
import { LoadingSpinner } from "@/components/ui/loading";

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
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    []
  );
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState("");
  const [creativeRole, setCreativeRole] = useState("");
  const [users, setUsers] = useState<
    { _id: string; name: string; creativeRoles: string[] }[]
  >([]);

  const filteredUsers = useMemo(() => {
    if (!creativeRole || creativeRole === "all") return users;
    return users.filter((user) => user.creativeRoles.includes(creativeRole));
  }, [users, creativeRole]);

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

  const fetchCars = async () => {
    try {
      const response = await fetch("/api/cars");
      if (!response.ok) throw new Error("Failed to fetch cars");
      const data = await response.json();
      setCars(data.cars);
    } catch (error) {
      console.error("Error fetching cars:", error);
      toast.error("Failed to fetch cars");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(
        data.filter(
          (user: any) =>
            user.status === "active" && user.creativeRoles.length > 0
        )
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchCars();
    fetchUsers();
  }, []);

  // Reset editor if current editor doesn't have the selected role
  useEffect(() => {
    if (creativeRole && creativeRole !== "all" && editor && editor !== "all") {
      const currentEditor = users.find((user) => user.name === editor);
      if (
        currentEditor &&
        !currentEditor.creativeRoles.includes(creativeRole)
      ) {
        setEditor("all");
      }
    }
  }, [creativeRole, editor, users]);

  const fetchDeliverables = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        sortField: "edit_deadline",
        sortDirection: "asc",
      });

      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);
      if (platform && platform !== "all") params.append("platform", platform);
      if (type && type !== "all") params.append("type", type);
      if (editor && editor !== "all") params.append("editor", editor);
      if (selectedCar && selectedCar !== "all")
        params.append("car_id", selectedCar);
      if (creativeRole && creativeRole !== "all")
        params.append("creative_role", creativeRole);

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
  }, [page, search, status, platform, type, editor, selectedCar, creativeRole]);

  const handleDelete = async (id: string, carId: string) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) return;

    try {
      const response = await fetch(`/api/cars/${carId}/deliverables/${id}`, {
        method: "DELETE",
      });

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
    try {
      const promises = selectedDeliverables.map((id) => {
        const deliverable = deliverables.find((d) => d._id?.toString() === id);
        if (!deliverable) return null;

        return fetch(
          `/api/cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: newStatus,
              updated_at: new Date(),
            }),
          }
        );
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <div className="flex gap-2">
          <BatchTemplateManager />
          <NewDeliverableForm onDeliverableCreated={fetchDeliverables} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deliverables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={selectedCar} onValueChange={setSelectedCar}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by car" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cars</SelectItem>
            {cars.map((car) => (
              <SelectItem key={car._id} value={car._id}>
                {`${car.year} ${car.make} ${car.model}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="Instagram Reels">Instagram Reels</SelectItem>
            <SelectItem value="Instagram Post">Instagram Post</SelectItem>
            <SelectItem value="Instagram Story">Instagram Story</SelectItem>
            <SelectItem value="YouTube">YouTube</SelectItem>
            <SelectItem value="YouTube Shorts">YouTube Shorts</SelectItem>
            <SelectItem value="TikTok">TikTok</SelectItem>
            <SelectItem value="Facebook">Facebook</SelectItem>
            <SelectItem value="Bring a Trailer">Bring a Trailer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Photo Gallery">Photo Gallery</SelectItem>
            <SelectItem value="Video">Video</SelectItem>
            <SelectItem value="Mixed Gallery">Mixed Gallery</SelectItem>
            <SelectItem value="Video Gallery">Video Gallery</SelectItem>
            <SelectItem value="Still">Still</SelectItem>
            <SelectItem value="Graphic">Graphic</SelectItem>
          </SelectContent>
        </Select>
        <Select value={creativeRole} onValueChange={setCreativeRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by creative role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {CREATIVE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={editor} onValueChange={setEditor}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by editor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Editors</SelectItem>
            {filteredUsers.map((user) => (
              <SelectItem key={user._id} value={user.name}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isBatchEditing && (
                <TableHead className="w-[50px]">
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
              <TableHead className="w-[200px]">Car</TableHead>
              <TableHead className="w-[200px]">Title</TableHead>
              <TableHead className="w-[140px]">Platform</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[60px]">Duration</TableHead>
              <TableHead className="w-[70px]">Aspect</TableHead>
              <TableHead className="w-[120px]">Editor</TableHead>
              <TableHead className="w-[100px]">Deadline</TableHead>
              <TableHead className="w-[100px]">Release</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={isBatchEditing ? 12 : 11}
                  className="text-center py-8"
                >
                  <LoadingSpinner size="md" />
                </TableCell>
              </TableRow>
            ) : deliverables.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isBatchEditing ? 12 : 11}
                  className="text-center py-8"
                >
                  No deliverables found
                </TableCell>
              </TableRow>
            ) : (
              deliverables.map((deliverable) => (
                <TableRow
                  key={deliverable._id?.toString()}
                  className="h-[48px]"
                >
                  {isBatchEditing && (
                    <TableCell className="py-2">
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
                  <TableCell className="py-2">
                    {deliverable.car ? (
                      <Link
                        href={`/cars/${deliverable.car._id}`}
                        className="text-info-600 dark:text-info-400 hover:underline truncate block"
                        title={`${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model}`}
                      >
                        {`${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model}`}
                      </Link>
                    ) : (
                      "Unknown Car"
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block" title={deliverable.title}>
                      {deliverable.title}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span
                      className="truncate block"
                      title={deliverable.platform}
                    >
                      {deliverable.platform}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block" title={deliverable.type}>
                      {deliverable.type}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant={
                        deliverable.status === "done"
                          ? "default"
                          : deliverable.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                      className="truncate"
                    >
                      {deliverable.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    {deliverable.type === "Photo Gallery"
                      ? "N/A"
                      : formatDuration(deliverable)}
                  </TableCell>
                  <TableCell className="py-2">
                    {deliverable.aspect_ratio || "N/A"}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block" title={deliverable.editor}>
                      {deliverable.editor}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    {deliverable.edit_deadline
                      ? format(new Date(deliverable.edit_deadline), "MM/dd/yy")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="py-2">
                    {deliverable.release_date
                      ? format(new Date(deliverable.release_date), "MM/dd/yy")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="py-2">
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
                        className="text-destructive-500 hover:text-destructive-700"
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
