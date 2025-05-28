import React from "react";
import { Calendar, Clock, ExternalLink, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Deliverable } from "@/types/deliverable";
import { DeliverableActions } from "../types";
import { safeFormat, formatDeliverableDuration } from "../utils";
import { StatusSelector } from "../../StatusSelector";
import YouTubeUploadHelper from "../../YouTubeUploadHelper";
import EditDeliverableForm from "../../EditDeliverableForm";

interface DeliverableCardProps {
  deliverable: Deliverable;
  actions: DeliverableActions;
  onOpenModal: (deliverable: Deliverable) => void;
  showCarInfo?: boolean;
  carInfo?: {
    make: string;
    model: string;
    year: number;
  };
}

export default function DeliverableCard({
  deliverable,
  actions,
  onOpenModal,
  showCarInfo = false,
  carInfo,
}: DeliverableCardProps) {
  return (
    <div
      className="group relative p-3 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] dark:hover:border-[hsl(var(--border-subtle))] transition-colors cursor-pointer"
      onClick={() => onOpenModal(deliverable)}
    >
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] truncate mb-1">
            {deliverable.title}
          </p>
          <p className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
            {deliverable.platform} • {deliverable.type}
          </p>
          {showCarInfo && carInfo && (
            <p className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] mt-1">
              {carInfo.year} {carInfo.make} {carInfo.model}
            </p>
          )}
        </div>
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {deliverable.dropbox_link && (
            <a
              href={deliverable.dropbox_link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground))]"
              title="Dropbox"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {deliverable.social_media_link && (
            <a
              href={deliverable.social_media_link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground))]"
              title="Open Social Media"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <YouTubeUploadHelper deliverable={deliverable} />
          <StatusSelector
            deliverableId={deliverable._id?.toString() || ""}
            initialStatus={deliverable.status}
            size="sm"
            onStatusChange={(newStatus) =>
              actions.onStatusChange(
                deliverable._id?.toString() || "",
                newStatus
              )
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] mb-2">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {deliverable.edit_deadline
              ? safeFormat(deliverable.edit_deadline, "M/d/yy")
              : "No deadline"}
          </span>
        </div>
        {deliverable.duration > 0 && deliverable.type !== "Photo Gallery" && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatDeliverableDuration(deliverable)}</span>
          </div>
        )}
      </div>

      {deliverable.editor && (
        <div className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] truncate">
          Editor: {deliverable.editor}
        </div>
      )}

      {/* Action buttons for mobile - hidden by default, shown on tap/hover */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <EditDeliverableForm
          deliverable={deliverable}
          onDeliverableUpdated={() => {}}
          onClose={() => {}}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            actions.onDuplicate(deliverable);
          }}
          className="text-muted-foreground hover:text-foreground"
          title="Duplicate deliverable"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            actions.onDelete(deliverable._id?.toString() || "");
          }}
          className="text-destructive-500 hover:text-destructive-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
