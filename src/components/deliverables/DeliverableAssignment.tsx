"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { Deliverable } from "@/types/deliverable";
import { FirestoreUser } from "@/types/firebase";
import { useAPI } from "@/hooks/useAPI";

interface DeliverableAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  deliverable: Deliverable | null;
  onAssign: (deliverableId: string, userId: string | null) => Promise<boolean>;
}

export default function DeliverableAssignment({
  isOpen,
  onClose,
  deliverable,
  onAssign,
}: DeliverableAssignmentProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(
    deliverable?.firebase_uid || null
  );
  const router = useRouter();
  const api = useAPI();

  if (!api) return <div>Loading...</div>;

  // Fetch users when the dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUser(deliverable?.firebase_uid || null);
    }
  }, [isOpen, deliverable, api]);

  // Fetch eligible users from your API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = (await api.get("users")) as
        | { users?: FirestoreUser[] }
        | FirestoreUser[];

      // Log the raw response to see what we're getting
      console.log(
        "API response received, count:",
        Array.isArray(data)
          ? data.length
          : (data as any).users?.length || "not an array"
      );

      // Handle the correct API response structure: { users: [...], total: number }
      let usersArray: FirestoreUser[];
      if (
        !Array.isArray(data) &&
        (data as any).users &&
        Array.isArray((data as any).users)
      ) {
        usersArray = (data as any).users;
      } else if (Array.isArray(data)) {
        // Fallback for legacy API responses that return array directly
        usersArray = data;
      } else {
        console.error("Unexpected API response structure:", data);
        toast.error("Invalid user data format received");
        return;
      }

      // Allow all active users to be assigned to deliverables
      // No additional filtering by role - ensures maximum flexibility
      const eligibleUsers = usersArray.filter(
        (user: FirestoreUser) => user.status === "active"
      );

      // Make sure we're setting all active users to the state
      setUsers(eligibleUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Add a useEffect for logging the users
  useEffect(() => {
    if (users.length > 0) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Users state updated:", users.length);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("User names:", users.map((u) => u.name).join(", "));
    }
  }, [users]);

  // Handle assignment
  const handleAssign = async () => {
    if (!deliverable || !deliverable._id) return;

    try {
      setLoading(true);
      const success = await onAssign(deliverable._id.toString(), selectedUser);

      if (success) {
        toast.success(
          selectedUser
            ? "Deliverable assigned successfully"
            : "Deliverable unassigned successfully"
        );
        router.refresh();
        onClose();
      } else {
        toast.error("Failed to update assignment");
      }
    } catch (error) {
      console.error("Error assigning deliverable:", error);
      toast.error("An error occurred while updating assignment");
    } finally {
      setLoading(false);
    }
  };

  if (!deliverable) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Assign Deliverable</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Deliverable</h3>
            <p className="text-sm">{deliverable.title}</p>
            <p className="text-xs text-gray-500">
              {deliverable.platform} • {deliverable.type}
            </p>
            <p className="text-xs text-gray-500">
              Deadline:{" "}
              {new Date(deliverable.edit_deadline).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Editor</h3>
            <p className="text-sm">{deliverable.editor || "Unassigned"}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Assign to</h3>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}

            {!loading && (
              <Select
                value={selectedUser || ""}
                onValueChange={(value) => setSelectedUser(value || null)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedUser
                        ? users.find((u) => u.uid === selectedUser)?.name ||
                          "Select user"
                        : "Select user"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Unassign</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.uid} value={user.uid}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedUser ? "Assign" : "Unassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
