import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Deliverable, DeliverableStatus } from "@/types/deliverable";
import { User } from "../types";

interface UseDeliverablesProps {
  carId?: string;
  apiEndpoint?: string;
}

interface UseDeliverablesReturn {
  deliverables: Deliverable[];
  isLoading: boolean;
  users: User[];
  allUsers: User[];
  fetchDeliverables: () => Promise<void>;
  handleDelete: (deliverableId: string, carId?: string) => Promise<void>;
  handleDuplicate: (deliverable: Deliverable) => Promise<void>;
  handleStatusChange: (
    deliverableId: string,
    newStatus: DeliverableStatus
  ) => Promise<void>;
}

export function useDeliverables({
  carId,
  apiEndpoint,
}: UseDeliverablesProps = {}): UseDeliverablesReturn {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const fetchDeliverables = useCallback(async () => {
    try {
      let url = apiEndpoint;

      if (!url && carId) {
        // Check if carId is a valid MongoDB ObjectId before making the request
        if (!/^[0-9a-fA-F]{24}$/.test(carId)) {
          console.error("Invalid carId format:", carId);
          setDeliverables([]);
          setIsLoading(false);
          return;
        }
        url = `/api/cars/${carId}/deliverables`;
      }

      if (!url) {
        throw new Error("No API endpoint provided");
      }

      const response = await fetch(url);
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
      setDeliverables(Array.isArray(data) ? data : data.deliverables || []);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
      setDeliverables([]);
    } finally {
      setIsLoading(false);
    }
  }, [carId, apiEndpoint]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();

      // Handle the correct API response structure: { users: [...], total: number }
      let usersArray;
      if (data.users && Array.isArray(data.users)) {
        usersArray = data.users;
      } else if (Array.isArray(data)) {
        // Fallback for legacy API responses that return array directly
        usersArray = data;
      } else {
        console.error("Unexpected API response structure:", data);
        toast.error("Failed to load users properly");
        return;
      }

      // Store all users
      const activeUsers = usersArray.filter(
        (user: User) => user.status === "active"
      );
      setAllUsers(activeUsers);

      // For backward compatibility, still set the editors list
      const editors = activeUsers.filter((user: User) =>
        user.creativeRoles.includes("video_editor")
      );
      setUsers(editors);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
  }, []);

  const handleDelete = useCallback(
    async (deliverableId: string, deliverableCarId?: string) => {
      if (!confirm("Are you sure you want to delete this deliverable?")) {
        return;
      }

      try {
        const targetCarId = deliverableCarId || carId;
        if (!targetCarId) {
          throw new Error("No car ID available for deletion");
        }

        const response = await fetch(
          `/api/cars/${targetCarId}/deliverables/${deliverableId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete deliverable");
        }

        toast.success("Deliverable deleted successfully");
        await fetchDeliverables();
      } catch (error) {
        console.error("Error deleting deliverable:", error);
        toast.error("Failed to delete deliverable");
      }
    },
    [carId, fetchDeliverables]
  );

  const handleDuplicate = useCallback(
    async (deliverable: Deliverable) => {
      try {
        const targetCarId = deliverable.car_id?.toString() || carId;
        if (!targetCarId) {
          throw new Error("No car ID available for duplication");
        }

        const duplicateData = {
          ...deliverable,
          title: `${deliverable.title} (Copy)`,
          status: "not_started" as DeliverableStatus,
          created_at: new Date(),
          updated_at: new Date(),
        };

        // Remove fields that shouldn't be duplicated
        delete duplicateData._id;
        delete duplicateData.publishing_url;
        delete duplicateData.social_media_link;
        delete duplicateData.metrics;

        const response = await fetch(`/api/cars/${targetCarId}/deliverables`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(duplicateData),
        });

        if (!response.ok) {
          throw new Error("Failed to duplicate deliverable");
        }

        toast.success("Deliverable duplicated successfully");
        await fetchDeliverables();
      } catch (error) {
        console.error("Error duplicating deliverable:", error);
        toast.error("Failed to duplicate deliverable");
      }
    },
    [carId, fetchDeliverables]
  );

  const handleStatusChange = useCallback(
    async (deliverableId: string, newStatus: DeliverableStatus) => {
      try {
        const deliverable = deliverables.find(
          (d) => d._id?.toString() === deliverableId
        );
        const targetCarId = deliverable?.car_id?.toString() || carId;

        if (!targetCarId) {
          throw new Error("No car ID available for status update");
        }

        const response = await fetch(
          `/api/cars/${targetCarId}/deliverables/${deliverableId}`,
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

        if (!response.ok) {
          throw new Error("Failed to update deliverable status");
        }

        // Update local state immediately for better UX
        setDeliverables((prev) =>
          prev.map((d) =>
            d._id?.toString() === deliverableId
              ? { ...d, status: newStatus }
              : d
          )
        );

        toast.success("Status updated successfully");
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
      }
    },
    [deliverables, carId]
  );

  useEffect(() => {
    fetchDeliverables();
  }, [fetchDeliverables]);

  useEffect(() => {
    // Only fetch users if we don't already have them
    if (allUsers.length === 0) {
      fetchUsers();
    }
  }, [fetchUsers, allUsers.length]);

  return {
    deliverables,
    isLoading,
    users,
    allUsers,
    fetchDeliverables,
    handleDelete,
    handleDuplicate,
    handleStatusChange,
  };
}
