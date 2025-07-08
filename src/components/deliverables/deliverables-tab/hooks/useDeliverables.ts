import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAPI } from "@/hooks/useAPI";
import { useAPIQuery } from "@/hooks/useAPIQuery";
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

/**
 * useDeliverables - Phase 2 optimized deliverables hook
 * Converted from blocking useEffect pattern to non-blocking useAPIQuery pattern
 * Following successful Phase 1 copywriter optimization patterns
 */
export function useDeliverables({
  carId,
  apiEndpoint,
}: UseDeliverablesProps = {}): UseDeliverablesReturn {
  const { data: session, status } = useSession();
  const api = useAPI();

  // Build API endpoint with validation
  const deliverablesEndpoint =
    apiEndpoint || (carId ? `cars/${carId}/deliverables` : null);

  // Validate carId format before making API calls
  const isValidCarId = carId ? /^[0-9a-fA-F]{24}$/.test(carId) : true;

  // Phase 2 optimization: Use non-blocking useAPIQuery instead of blocking useEffect + fetch
  const {
    data: deliverablesData,
    isLoading: isLoadingDeliverables,
    error: deliverablesError,
    refetch: refetchDeliverables,
  } = useAPIQuery<Deliverable[]>(deliverablesEndpoint!, {
    enabled: !!(
      deliverablesEndpoint &&
      status === "authenticated" &&
      session?.user &&
      isValidCarId
    ),
    staleTime: 3 * 60 * 1000, // 3 minutes cache for deliverables data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    // Handle API response variations
    select: (data: any) => {
      if (Array.isArray(data)) {
        return data;
      }
      return data?.deliverables || [];
    },
  });

  // Shared cache for users data (used across multiple deliverable instances)
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useAPIQuery<any>(`users`, {
    queryKey: ["shared-users-data"], // Shared cache key
    enabled: !!(status === "authenticated" && session?.user),
    staleTime: 5 * 60 * 1000, // 5 minutes cache for users (static-ish data)
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Process deliverables data safely
  const deliverables = deliverablesData || [];

  // Process users data safely following Phase 1 patterns
  const processedUsers = (() => {
    if (!usersData) return { users: [], allUsers: [] };

    // Handle different API response structures
    let usersArray;
    if (usersData.users && Array.isArray(usersData.users)) {
      usersArray = usersData.users;
    } else if (Array.isArray(usersData)) {
      usersArray = usersData;
    } else {
      console.error("Unexpected users API response structure:", usersData);
      return { users: [], allUsers: [] };
    }

    const activeUsers = usersArray.filter(
      (user: User) => user.status === "active"
    );
    const editors = activeUsers.filter((user: User) =>
      user.creativeRoles?.includes("video_editor")
    );

    return {
      users: editors,
      allUsers: activeUsers,
    };
  })();

  // Combined loading state
  const isLoading = isLoadingDeliverables || isLoadingUsers;

  // Non-blocking error handling
  if (deliverablesError && !isValidCarId) {
    console.error("Invalid carId format:", carId);
  }
  if (deliverablesError) {
    console.error("Error fetching deliverables:", deliverablesError);
  }
  if (usersError) {
    console.error("Error fetching users:", usersError);
  }

  // Optimized refresh function
  const fetchDeliverables = useCallback(async () => {
    try {
      await refetchDeliverables();
    } catch (error) {
      console.error("Error refreshing deliverables:", error);
      toast.error("Failed to refresh deliverables");
    }
  }, [refetchDeliverables]);

  const handleDelete = useCallback(
    async (deliverableId: string, deliverableCarId?: string) => {
      if (!confirm("Are you sure you want to delete this deliverable?")) {
        return;
      }

      if (!api) return;

      try {
        const targetCarId = deliverableCarId || carId;
        if (!targetCarId) {
          throw new Error("No car ID available for deletion");
        }

        await api.delete(
          `/api/cars/${targetCarId}/deliverables/${deliverableId}`
        );

        toast.success("Deliverable deleted successfully");
        await fetchDeliverables();
      } catch (error) {
        console.error("Error deleting deliverable:", error);
        toast.error("Failed to delete deliverable");
      }
    },
    [carId, fetchDeliverables, api]
  );

  const handleDuplicate = useCallback(
    async (deliverable: Deliverable) => {
      if (!api) return;

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

        await api.post(`/api/cars/${targetCarId}/deliverables`, duplicateData);

        toast.success("Deliverable duplicated successfully");
        await fetchDeliverables();
      } catch (error) {
        console.error("Error duplicating deliverable:", error);
        toast.error("Failed to duplicate deliverable");
      }
    },
    [carId, fetchDeliverables, api]
  );

  const handleStatusChange = useCallback(
    async (deliverableId: string, newStatus: DeliverableStatus) => {
      if (!api) return;

      try {
        const deliverable = deliverables.find(
          (d) => d._id?.toString() === deliverableId
        );
        const targetCarId = deliverable?.car_id?.toString() || carId;

        if (!targetCarId) {
          throw new Error("No car ID available for status change");
        }

        await api.put(
          `/api/cars/${targetCarId}/deliverables/${deliverableId}`,
          { status: newStatus }
        );

        toast.success("Status updated successfully");
        await fetchDeliverables();
      } catch (error) {
        console.error("Error updating deliverable status:", error);
        toast.error("Failed to update status");
      }
    },
    [carId, deliverables, fetchDeliverables, api]
  );

  return {
    deliverables,
    isLoading,
    users: processedUsers.users,
    allUsers: processedUsers.allUsers,
    fetchDeliverables,
    handleDelete,
    handleDuplicate,
    handleStatusChange,
  };
}
