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
import {
  Trash2,
  Search,
  Filter,
  CheckSquare,
  Square,
  UserPlus,
  User,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Deliverable,
  Platform,
  DeliverableStatus,
  DeliverableType,
} from "@/types/deliverable";
import { FirestoreUser } from "@/lib/firestore/users";
import NewDeliverableForm from "./NewDeliverableForm";
import EditDeliverableForm from "./EditDeliverableForm";
import BatchDeliverableForm from "./BatchDeliverableForm";
import DeliverableAssignment from "./DeliverableAssignment";
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
  const [users, setUsers] = useState<FirestoreUser[]>([]);

  // State for deliverable assignment
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [
    selectedDeliverableForAssignment,
    setSelectedDeliverableForAssignment,
  ] = useState<Deliverable | null>(null);

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

      console.log(
        "Fetched users:",
        Array.isArray(data) ? data.length : "not an array"
      );

      // API returns an array directly, not an object with users property
      // Include all active users
      setUsers(
        Array.isArray(data)
          ? data.filter((user: FirestoreUser) => user.status === "active")
          : []
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
      setDeliverables(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
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

  // Open assignment dialog for a deliverable
  const handleOpenAssignment = (deliverable: Deliverable) => {
    // Reset any user filtering that might be in effect
    fetchUsers();
    setSelectedDeliverableForAssignment(deliverable);
    setIsAssignmentOpen(true);
  };

  // Handle the assignment of a deliverable to a user
  const handleAssignDeliverable = async (
    deliverableId: string,
    userId: string | null
  ) => {
    try {
      const response = await fetch("/api/deliverables/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deliverableId,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign deliverable");
      }

      // Refresh deliverables list
      fetchDeliverables();
      return true;
    } catch (error) {
      console.error("Error assigning deliverable:", error);
      toast.error((error as Error).message || "Failed to assign deliverable");
      return false;
    }
  };

  // Find Firebase user for a given editor name (if applicable)
  const findUserForDeliverable = (deliverable: Deliverable) => {
    if (deliverable.firebase_uid) {
      return users.find((user) => user.uid === deliverable.firebase_uid);
    }
    return null;
  };

  // Format user role information for display
  const formatUserRoles = (user: FirestoreUser) => {
    const roles = [];

    // Add admin/editor status if present
    if (user.roles.includes("admin")) {
      roles.push("Admin");
    } else if (user.roles.includes("editor")) {
      roles.push("Editor");
    }

    // Add creative roles if any
    if (user.creativeRoles.length > 0) {
      roles.push(...user.creativeRoles.map((role) => role.replace("_", " ")));
    }

    return roles.length > 0 ? `(${roles.join(", ")})` : "";
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
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Platform" />
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
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Photo Gallery">Photo Gallery</SelectItem>
              <SelectItem value="Video">Video</SelectItem>
              <SelectItem value="Mixed Gallery">Mixed Gallery</SelectItem>
              <SelectItem value="Video Gallery">Video Gallery</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCar} onValueChange={setSelectedCar}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Cars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cars</SelectItem>
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
              <SelectItem value="all">All Roles</SelectItem>
              {CREATIVE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={editor} onValueChange={setEditor}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Editor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Editors</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.uid} value={user.name}>
                  {user.name} {formatUserRoles(user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  const carId = deliverable.car_id.toString();
                  const firebaseUser = findUserForDeliverable(deliverable);

                  return (
                    <TableRow key={id}>
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
                      <TableCell>{deliverable.platform}</TableCell>
                      <TableCell>{deliverable.type}</TableCell>
                      <TableCell>{formatDuration(deliverable)}</TableCell>
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
                        <div className="flex items-center gap-2">
                          {deliverable.firebase_uid && firebaseUser ? (
                            <>
                              <User className="h-4 w-4 text-primary" />
                              <span>{deliverable.editor}</span>
                              {firebaseUser && (
                                <span className="text-xs text-muted-foreground">
                                  {formatUserRoles(firebaseUser)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span>{deliverable.editor || "Unassigned"}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAssignment(deliverable)}
                            title="Assign to user"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <EditDeliverableForm
                            deliverable={deliverable}
                            onDeliverableUpdated={fetchDeliverables}
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

      {/* Assignment Modal */}
      <DeliverableAssignment
        isOpen={isAssignmentOpen}
        onClose={() => {
          setIsAssignmentOpen(false);
          setSelectedDeliverableForAssignment(null);
        }}
        deliverable={selectedDeliverableForAssignment}
        onAssign={handleAssignDeliverable}
      />
    </div>
  );
}
