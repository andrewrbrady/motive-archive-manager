import React, { useState } from "react";
import { Deliverable } from "@/types/deliverable";
import { DeliverablesTabProps } from "./deliverables-tab/types";
import { useDeliverables } from "./deliverables-tab/hooks/useDeliverables";
import { useBatchMode } from "./deliverables-tab/hooks/useBatchMode";
import DeliverablesHeader from "./deliverables-tab/components/DeliverablesHeader";
import DeliverableCard from "./deliverables-tab/components/DeliverableCard";
import DeliverablesTable from "./deliverables-tab/components/DeliverablesTable";
import DeliverableModal from "./deliverables-tab/components/DeliverableModal";

export default function DeliverablesTab({ carId }: DeliverablesTabProps) {
  const [selectedDeliverable, setSelectedDeliverable] =
    useState<Deliverable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get the actual carId string
  const actualCarId = Array.isArray(carId) ? carId[0] : carId;

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

  // Actions object for components
  const actions = {
    onEdit: (deliverable: Deliverable) => {
      // Edit functionality is handled by EditDeliverableForm component
    },
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onStatusChange: handleStatusChange,
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header with actions */}
      <DeliverablesHeader
        carId={actualCarId}
        batchMode={batchMode}
        onRefresh={fetchDeliverables}
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
    </div>
  );
}
