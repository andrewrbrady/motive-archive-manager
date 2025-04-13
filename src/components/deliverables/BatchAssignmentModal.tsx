"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import DirectUserSelector from "@/components/users/DirectUserSelector";
import { batchAssignDeliverables } from "@/lib/deliverables/assignment";

interface BatchAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDeliverables: Array<{ _id: string; car_id: string; title: string }>;
  onSuccess: () => void;
}

export default function BatchAssignmentModal({
  isOpen,
  onClose,
  selectedDeliverables,
  onSuccess,
}: BatchAssignmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editorName, setEditorName] = useState<string>("");

  const handleAssign = async () => {
    if (selectedDeliverables.length === 0) {
      toast.error("No deliverables selected");
      return;
    }

    setIsLoading(true);
    try {
      // Create assignment array
      const assignments = selectedDeliverables.map((deliverable) => ({
        deliverableId: deliverable._id.toString(),
        carId: deliverable.car_id.toString(),
        userId: selectedUserId,
        editorName: selectedUserId ? editorName : null,
      }));

      // Submit batch assignment
      const results = await batchAssignDeliverables(assignments);

      // Check results
      const failed = results.filter((r) => !r.success);

      if (failed.length === 0) {
        toast.success(
          `Successfully ${selectedUserId ? "assigned" : "unassigned"} ${
            results.length
          } deliverable${results.length !== 1 ? "s" : ""}`
        );
        onSuccess();
        onClose();
      } else if (failed.length < results.length) {
        toast.success(
          `Partially successful: ${results.length - failed.length} of ${
            results.length
          } deliverables updated`
        );
        onSuccess();
        onClose();
      } else {
        toast.error("Failed to update assignments");
      }
    } catch (error) {
      console.error("Error in batch assignment:", error);
      toast.error("An error occurred during batch assignment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Selected Deliverables</h3>
            <p className="text-sm">
              {selectedDeliverables.length}{" "}
              {selectedDeliverables.length === 1
                ? "deliverable"
                : "deliverables"}{" "}
              selected
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Assign to</h3>
            <DirectUserSelector
              value={selectedUserId}
              onChange={setSelectedUserId}
              onUserInfoRetrieved={(username) => {
                if (username !== null) {
                  setEditorName(username);
                } else {
                  setEditorName("");
                }
              }}
              label={undefined}
              placeholder="Select editor"
              disabled={isLoading}
              allowUnassign={true}
              editorName={editorName}
            />
            <p className="text-xs text-muted-foreground">
              {selectedUserId
                ? `Assign all to: ${editorName}`
                : "Unassign all selected deliverables"}
            </p>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
            <h3 className="text-sm font-medium">Deliverables List</h3>
            <ul className="space-y-1 text-xs">
              {selectedDeliverables.map((deliverable) => (
                <li
                  key={deliverable._id.toString()}
                  className="py-1 border-b last:border-b-0 truncate"
                >
                  {deliverable.title}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedUserId ? `Assign to ${editorName}` : "Unassign all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
