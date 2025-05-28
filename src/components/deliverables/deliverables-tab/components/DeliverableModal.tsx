import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Trash2,
  User,
  Tag,
  Monitor,
  FileText,
  Link,
  Share2,
  Cloud,
} from "lucide-react";
import { Deliverable } from "@/types/deliverable";
import { DeliverableActions } from "../types";
import {
  safeFormat,
  formatDeliverableDuration,
  getStatusColor,
  getStatusText,
  getPillColor,
} from "../utils";
import { StatusSelector } from "../../StatusSelector";
import YouTubeUploadHelper from "../../YouTubeUploadHelper";
import EditDeliverableForm from "../../EditDeliverableForm";

interface DeliverableModalProps {
  deliverable: Deliverable | null;
  isOpen: boolean;
  onClose: () => void;
  actions: DeliverableActions;
  showCarInfo?: boolean;
  carInfo?: {
    make: string;
    model: string;
    year: number;
  };
}

export default function DeliverableModal({
  deliverable,
  isOpen,
  onClose,
  actions,
  showCarInfo = false,
  carInfo,
}: DeliverableModalProps) {
  if (!deliverable) return null;

  const InfoRow = ({
    icon: Icon,
    label,
    value,
    href,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | React.ReactNode;
    href?: string;
  }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 break-all"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground break-words">{value}</p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-8">
            {deliverable.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Quick Actions */}
          <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(deliverable.status)}>
                {getStatusText(deliverable.status)}
              </Badge>
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
            <div className="flex items-center gap-2">
              <YouTubeUploadHelper deliverable={deliverable} />
              <EditDeliverableForm
                deliverable={deliverable}
                onDeliverableUpdated={() => {}}
                onClose={() => {}}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => actions.onDuplicate(deliverable)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  actions.onDelete(deliverable._id?.toString() || "");
                  onClose();
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>

          {/* Car Information */}
          {showCarInfo && carInfo && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium text-foreground mb-2">Vehicle</h3>
              <p className="text-sm text-muted-foreground">
                {carInfo.year} {carInfo.make} {carInfo.model}
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-1">
            <h3 className="font-medium text-foreground mb-3">Details</h3>

            <InfoRow
              icon={Monitor}
              label="Platform"
              value={
                <Badge
                  className={getPillColor("platform", deliverable.platform)}
                >
                  {deliverable.platform}
                </Badge>
              }
            />

            <InfoRow icon={Tag} label="Type" value={deliverable.type} />

            {deliverable.duration > 0 &&
              deliverable.type !== "Photo Gallery" && (
                <InfoRow
                  icon={Clock}
                  label="Duration"
                  value={formatDeliverableDuration(deliverable)}
                />
              )}

            {deliverable.editor && (
              <InfoRow icon={User} label="Editor" value={deliverable.editor} />
            )}
          </div>

          {/* Dates */}
          <div className="space-y-1">
            <h3 className="font-medium text-foreground mb-3">Timeline</h3>

            <InfoRow
              icon={Calendar}
              label="Edit Deadline"
              value={
                deliverable.edit_deadline
                  ? safeFormat(deliverable.edit_deadline, "MMMM d, yyyy")
                  : "Not set"
              }
            />

            <InfoRow
              icon={Calendar}
              label="Release Date"
              value={
                deliverable.release_date
                  ? safeFormat(deliverable.release_date, "MMMM d, yyyy")
                  : "Not set"
              }
            />
          </div>

          {/* Links */}
          {(deliverable.dropbox_link ||
            deliverable.social_media_link ||
            deliverable.publishing_url) && (
            <div className="space-y-1">
              <h3 className="font-medium text-foreground mb-3">Links</h3>

              {deliverable.dropbox_link && (
                <InfoRow
                  icon={Cloud}
                  label="Dropbox"
                  value="View in Dropbox"
                  href={deliverable.dropbox_link}
                />
              )}

              {deliverable.social_media_link && (
                <InfoRow
                  icon={Share2}
                  label="Social Media"
                  value="View Post"
                  href={deliverable.social_media_link}
                />
              )}

              {deliverable.publishing_url && (
                <InfoRow
                  icon={Link}
                  label="Publishing URL"
                  value="View Published Content"
                  href={deliverable.publishing_url}
                />
              )}
            </div>
          )}

          {/* Description */}
          {deliverable.description && (
            <div className="space-y-1">
              <h3 className="font-medium text-foreground mb-3">Description</h3>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {deliverable.description}
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-1 pt-4 border-t">
            <h3 className="font-medium text-foreground mb-3">Metadata</h3>

            <InfoRow
              icon={Calendar}
              label="Created"
              value={
                deliverable.created_at
                  ? safeFormat(
                      deliverable.created_at,
                      "MMMM d, yyyy 'at' h:mm a"
                    )
                  : "Unknown"
              }
            />

            <InfoRow
              icon={Calendar}
              label="Last Updated"
              value={
                deliverable.updated_at
                  ? safeFormat(
                      deliverable.updated_at,
                      "MMMM d, yyyy 'at' h:mm a"
                    )
                  : "Unknown"
              }
            />

            {deliverable._id && (
              <InfoRow
                icon={FileText}
                label="ID"
                value={
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {deliverable._id.toString()}
                  </code>
                }
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
