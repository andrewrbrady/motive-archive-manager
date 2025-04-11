import { useState } from "react";
import { DeliverableStatus } from "@/types/deliverable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusSelectorProps {
  deliverableId: string;
  initialStatus: DeliverableStatus;
  size?: "sm" | "md" | "lg";
  onStatusChange?: (newStatus: DeliverableStatus) => void;
}

export function StatusSelector({
  deliverableId,
  initialStatus,
  size = "sm",
  onStatusChange,
}: StatusSelectorProps) {
  const [status, setStatus] = useState<DeliverableStatus>(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (newStatus: DeliverableStatus) => {
    if (newStatus === status) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/deliverables/${deliverableId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      setStatus(newStatus);
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
      console.error("Error updating deliverable status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: DeliverableStatus): string => {
    switch (status) {
      case "not_started":
        return "bg-destructive/20 hover:bg-destructive/30 text-destructive";
      case "in_progress":
        return "bg-warning/20 hover:bg-warning/30 text-warning-foreground";
      case "done":
        return "bg-success/20 hover:bg-success/30 text-success-foreground";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: DeliverableStatus): string => {
    switch (status) {
      case "not_started":
        return "Not Started";
      case "in_progress":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return "Unknown";
    }
  };

  const sizingClasses = {
    sm: "h-6 px-2 text-xs",
    md: "h-8 px-2 text-sm",
    lg: "h-9 px-3 text-sm",
  };

  return (
    <div className="relative">
      <Select
        value={status}
        onValueChange={(value: DeliverableStatus) => updateStatus(value)}
        disabled={isUpdating}
      >
        <SelectTrigger
          className={cn(
            "w-[90px] min-w-[90px] border-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-offset-1",
            getStatusColor(status),
            sizingClasses[size]
          )}
        >
          <SelectValue>
            <span className="flex items-center whitespace-nowrap">
              {isUpdating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {getStatusLabel(status)}
            </span>
          </SelectValue>
        </SelectTrigger>

        <SelectContent align="end">
          <SelectItem
            value="not_started"
            className="text-destructive-foreground"
          >
            <span className="flex items-center">
              {status === "not_started" && <Check className="mr-1 h-3 w-3" />}
              Not Started
            </span>
          </SelectItem>

          <SelectItem value="in_progress" className="text-warning-foreground">
            <span className="flex items-center">
              {status === "in_progress" && <Check className="mr-1 h-3 w-3" />}
              In Progress
            </span>
          </SelectItem>

          <SelectItem value="done" className="text-success-foreground">
            <span className="flex items-center">
              {status === "done" && <Check className="mr-1 h-3 w-3" />}
              Done
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {error && <div className="text-destructive text-xs mt-1">{error}</div>}
    </div>
  );
}
