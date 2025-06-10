import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { BatchModeState } from "../types";
import NewDeliverableForm from "../../NewDeliverableForm";

import BatchSelectorModal from "../../BatchSelectorModal";
import { FileJson, Package } from "lucide-react";

interface DeliverablesHeaderProps {
  title?: string;
  carId?: string;
  batchMode: BatchModeState;
  showNewDeliverable?: boolean;

  onRefresh?: () => void;
  onShowJsonUpload?: () => void;
  children?: React.ReactNode;
}

export default function DeliverablesHeader({
  title = "Deliverables",
  carId,
  batchMode,
  showNewDeliverable = true,

  onRefresh,
  onShowJsonUpload,
  children,
}: DeliverablesHeaderProps) {
  const [showBatchSelector, setShowBatchSelector] = useState(false);

  const {
    isBatchMode,
    selectedDeliverables,
    toggleBatchMode,
    handleBatchDelete,
  } = batchMode;

  return (
    <>
      {/* Desktop Header - Title and buttons side by side */}
      <div className="hidden md:flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-white uppercase">
          {title}
        </h2>
        <div className="flex gap-2 items-center">
          {children}
          {isBatchMode ? (
            <>
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={selectedDeliverables.length === 0}
              >
                Delete Selected ({selectedDeliverables.length})
              </Button>
              <Button variant="outline" onClick={toggleBatchMode}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={toggleBatchMode}>
                Batch Delete
              </Button>
              {carId && (
                <Button
                  variant="outline"
                  onClick={() => setShowBatchSelector(true)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Add Batch
                </Button>
              )}
              {onShowJsonUpload && (
                <Button variant="outline" onClick={onShowJsonUpload}>
                  <FileJson className="w-4 h-4 mr-2" />
                  Batch JSON
                </Button>
              )}
              {showNewDeliverable && carId && (
                <NewDeliverableForm
                  carId={carId}
                  onDeliverableCreated={onRefresh || (() => {})}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Header - Title on top, buttons below */}
      <div className="block md:hidden space-y-3">
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-white uppercase">
          {title}
        </h2>
        <div className="flex gap-2 flex-wrap items-center">
          {children}
          {isBatchMode ? (
            <>
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={selectedDeliverables.length === 0}
                size="sm"
              >
                Delete Selected ({selectedDeliverables.length})
              </Button>
              <Button variant="outline" onClick={toggleBatchMode} size="sm">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={toggleBatchMode} size="sm">
                Batch Delete
              </Button>
              {carId && (
                <Button
                  variant="outline"
                  onClick={() => setShowBatchSelector(true)}
                  size="sm"
                >
                  <Package className="w-4 h-4 mr-1" />
                  Add Batch
                </Button>
              )}
              {onShowJsonUpload && (
                <Button variant="outline" onClick={onShowJsonUpload} size="sm">
                  <FileJson className="w-4 h-4 mr-1" />
                  JSON
                </Button>
              )}
              {showNewDeliverable && carId && (
                <NewDeliverableForm
                  carId={carId}
                  onDeliverableCreated={onRefresh || (() => {})}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Batch Selector Modal */}
      {carId && (
        <BatchSelectorModal
          isOpen={showBatchSelector}
          onClose={() => setShowBatchSelector(false)}
          carId={carId}
          onBatchApplied={() => {
            setShowBatchSelector(false);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
