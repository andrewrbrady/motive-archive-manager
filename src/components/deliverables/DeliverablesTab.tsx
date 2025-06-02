import React, { useState } from "react";
import { Deliverable } from "@/types/deliverable";
import { DeliverablesTabProps } from "./deliverables-tab/types";
import { useDeliverables } from "./deliverables-tab/hooks/useDeliverables";
import { useBatchMode } from "./deliverables-tab/hooks/useBatchMode";
import { useAPI } from "@/hooks/useAPI";
import DeliverablesHeader from "./deliverables-tab/components/DeliverablesHeader";
import DeliverableCard from "./deliverables-tab/components/DeliverableCard";
import DeliverablesTable from "./deliverables-tab/components/DeliverablesTable";
import DeliverableModal from "./deliverables-tab/components/DeliverableModal";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import { toast } from "sonner";

export default function DeliverablesTab({ carId }: DeliverablesTabProps) {
  const [selectedDeliverable, setSelectedDeliverable] =
    useState<Deliverable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);

  // Get the actual carId string
  const actualCarId = Array.isArray(carId) ? carId[0] : carId;

  // Initialize API client
  const api = useAPI();

  // Use our custom hooks
  const {
    deliverables,
    isLoading,
    fetchDeliverables,
    handleDelete,
    handleDuplicate,
    handleStatusChange,
  } = useDeliverables({ carId: actualCarId });

  const batchMode = useBatchMode({
    deliverables,
    onRefresh: fetchDeliverables,
    carId: actualCarId,
  });

  // Modal handlers
  const handleOpenModal = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedDeliverable(null);
    setIsModalOpen(false);
  };

  const handleJsonSubmit = async (jsonData: any[]) => {
    if (!api) return;

    try {
      setIsSubmittingJson(true);

      const result = (await api.post(
        `/api/cars/${actualCarId}/deliverables/batch`,
        { deliverables: jsonData }
      )) as any;

      toast.success(`Successfully created ${result.count} deliverables`);

      // Refresh the deliverables list
      fetchDeliverables();
    } catch (error) {
      console.error("Error creating deliverables from JSON:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create deliverables"
      );
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setIsSubmittingJson(false);
    }
  };

  // Actions for child components
  const actions = {
    onEdit: (deliverable: Deliverable) => {
      // Edit functionality is handled by EditDeliverableForm component
    },
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onStatusChange: handleStatusChange,
    onRefresh: fetchDeliverables,
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header with actions */}
      <DeliverablesHeader
        carId={actualCarId}
        batchMode={batchMode}
        onRefresh={fetchDeliverables}
        onShowJsonUpload={() => setShowJsonUpload(true)}
      />

      {/* Mobile View - Cards */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Loading deliverables...
              </p>
            </div>
          </div>
        ) : deliverables.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No deliverables found. Create your first one!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliverables.map((deliverable) => (
              <DeliverableCard
                key={deliverable._id?.toString()}
                deliverable={deliverable}
                actions={actions}
                onOpenModal={handleOpenModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop View - Table */}
      <DeliverablesTable
        deliverables={deliverables}
        isLoading={isLoading}
        actions={actions}
        batchMode={batchMode}
      />

      {/* Detail Modal */}
      <DeliverableModal
        deliverable={selectedDeliverable}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        actions={actions}
      />

      {/* JSON Upload Modal */}
      <JsonUploadPasteModal
        isOpen={showJsonUpload}
        onClose={() => setShowJsonUpload(false)}
        onSubmit={handleJsonSubmit}
        title="Batch Create Deliverables from JSON"
        description="Upload a JSON file or paste JSON data to create multiple deliverables at once. The JSON should be an array of deliverable objects."
        expectedType="deliverables"
        isSubmitting={isSubmittingJson}
      />
    </div>
  );
}
