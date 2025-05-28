import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Deliverable } from "@/types/deliverable";
import { BatchModeState } from "../types";

interface UseBatchModeProps {
  deliverables: Deliverable[];
  onRefresh: () => Promise<void>;
  carId?: string;
}

export function useBatchMode({
  deliverables,
  onRefresh,
  carId,
}: UseBatchModeProps): BatchModeState {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    []
  );

  const toggleBatchMode = useCallback(() => {
    setIsBatchMode(!isBatchMode);
    setSelectedDeliverables([]);
  }, [isBatchMode]);

  const toggleDeliverableSelection = useCallback((id: string) => {
    setSelectedDeliverables((prev) =>
      prev.includes(id)
        ? prev.filter((deliverableId) => deliverableId !== id)
        : [...prev, id]
    );
  }, []);

  const toggleAllDeliverables = useCallback(() => {
    if (selectedDeliverables.length === deliverables.length) {
      setSelectedDeliverables([]);
    } else {
      setSelectedDeliverables(
        deliverables.map((deliverable) => deliverable._id?.toString() || "")
      );
    }
  }, [selectedDeliverables.length, deliverables]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedDeliverables.length === 0) {
      toast.error("No deliverables selected");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedDeliverables.length} deliverable(s)?`
      )
    ) {
      return;
    }

    try {
      const deletePromises = selectedDeliverables.map(async (id) => {
        const deliverable = deliverables.find((d) => d._id?.toString() === id);
        if (!deliverable) return;

        const targetCarId = deliverable.car_id?.toString() || carId;
        if (!targetCarId) {
          throw new Error(`No car ID available for deliverable ${id}`);
        }

        const response = await fetch(
          `/api/cars/${targetCarId}/deliverables/${id}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete deliverable ${id}`);
        }
      });

      await Promise.all(deletePromises);

      toast.success(
        `Successfully deleted ${selectedDeliverables.length} deliverable(s)`
      );
      setSelectedDeliverables([]);
      setIsBatchMode(false);
      await onRefresh();
    } catch (error) {
      console.error("Error in batch delete:", error);
      toast.error("Failed to delete some deliverables");
    }
  }, [selectedDeliverables, deliverables, carId, onRefresh]);

  return {
    isBatchMode,
    selectedDeliverables,
    toggleBatchMode,
    toggleDeliverableSelection,
    toggleAllDeliverables,
    handleBatchDelete,
  };
}
