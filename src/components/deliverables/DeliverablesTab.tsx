import React, { useState } from "react";
import { Deliverable } from "@/types/deliverable";
import { DeliverablesTabProps } from "./deliverables-tab/types";
import { useDeliverables } from "./deliverables-tab/hooks/useDeliverables";
import { useBatchMode } from "./deliverables-tab/hooks/useBatchMode";
import { useAPI } from "@/hooks/useAPI";
import DeliverablesHeader from "./deliverables-tab/components/DeliverablesHeader";
import DeliverableCard from "./deliverables-tab/components/DeliverableCard";
import DeliverablesTable from "./deliverables-tab/components/DeliverablesTable";
import ResizableDeliverablesTable from "./deliverables-tab/components/ResizableDeliverablesTable";
import DeliverableModal from "./deliverables-tab/components/DeliverableModal";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * DeliverablesTab - Phase 2 optimized deliverables component
 * Implements non-blocking loading states and error handling following Phase 1 patterns
 */
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

  // Use our optimized custom hooks - now non-blocking
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
        `/api/cars/${actualCarId}/deliverables/batch-relaxed`,
        { deliverables: jsonData }
      )) as any;

      toast.success(
        `Successfully created ${result.count} deliverables with relaxed validation`
      );

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

      {/* Phase 2 improvement: Non-blocking loading state with tab switching message */}
      {isLoading && (
        <div className="bg-muted/30 border border-muted rounded-md p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading deliverables...
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You can switch tabs while this loads
          </p>
        </div>
      )}

      {/* Mobile View - Cards */}
      <div className="block md:hidden space-y-3">
        {!isLoading && deliverables.length === 0 ? (
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

      {/* Desktop View - Table with Resizable Columns */}
      <ResizableDeliverablesTable
        deliverables={deliverables}
        isLoading={isLoading}
        actions={actions}
        batchMode={batchMode}
        onOpenModal={handleOpenModal}
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
        title="Batch Create Deliverables from JSON (Relaxed)"
        description="Upload a JSON file or paste JSON data to create multiple deliverables at once. The JSON should be an array of deliverable objects with minimal validation - only title is required. Platform and editor assignments can be done later."
        expectedType="deliverables-relaxed"
        isSubmitting={isSubmittingJson}
      />
    </div>
  );
}
