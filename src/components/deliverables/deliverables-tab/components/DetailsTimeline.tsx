import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  User,
  Tag,
  Monitor,
  FileText,
  Database,
  Edit,
  Check,
  X,
} from "lucide-react";
import { Deliverable, DeliverableType } from "@/types/deliverable";
import { safeFormat, formatDeliverableDuration } from "../utils";
import PlatformDisplay from "./PlatformDisplay";
import { useMediaTypes } from "@/hooks/useMediaTypes";

interface DetailsTimelineProps {
  deliverable: Deliverable;
  onUpdate: (updates: Partial<Deliverable>) => Promise<void>;
}

export default function DetailsTimeline({
  deliverable,
  onUpdate,
}: DetailsTimelineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editData, setEditData] = useState({
    type: deliverable.type || "",
    mediaTypeId: deliverable.mediaTypeId?.toString() || "",
    aspect_ratio: deliverable.aspect_ratio || "",
    editor: deliverable.editor || "",
    target_audience: deliverable.target_audience || "",
    music_track: deliverable.music_track || "",
    edit_deadline: deliverable.edit_deadline
      ? new Date(deliverable.edit_deadline).toISOString().split("T")[0]
      : "",
    release_date: deliverable.release_date
      ? new Date(deliverable.release_date).toISOString().split("T")[0]
      : "",
  });

  // Fetch MediaTypes
  const { mediaTypes, isLoading: mediaTypesLoading } = useMediaTypes();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates: Partial<Deliverable> = {};

      // Handle MediaType updates
      if (
        editData.mediaTypeId !== (deliverable.mediaTypeId?.toString() || "")
      ) {
        if (editData.mediaTypeId) {
          updates.mediaTypeId = editData.mediaTypeId as any; // Will be converted to ObjectId on backend
          // Also update legacy type field for backward compatibility
          const selectedMediaType = mediaTypes.find(
            (mt) => mt._id.toString() === editData.mediaTypeId
          );
          if (selectedMediaType) {
            const legacyTypeMapping: Record<string, DeliverableType> = {
              Video: "Video",
              "Photo Gallery": "Photo Gallery",
              "Mixed Gallery": "Mixed Gallery",
              "Video Gallery": "Video Gallery",
            };
            updates.type = legacyTypeMapping[selectedMediaType.name] || "other";
          }
        } else {
          // No MediaType selected, use legacy type
          updates.mediaTypeId = undefined;
          updates.type = editData.type as DeliverableType;
        }
      } else if (!editData.mediaTypeId && editData.type !== deliverable.type) {
        // No MediaType selected, but legacy type changed
        updates.type = editData.type as DeliverableType;
      }

      if (editData.aspect_ratio !== deliverable.aspect_ratio)
        updates.aspect_ratio = editData.aspect_ratio;
      if (editData.editor !== deliverable.editor)
        updates.editor = editData.editor;
      if (editData.target_audience !== deliverable.target_audience)
        updates.target_audience = editData.target_audience;
      if (editData.music_track !== deliverable.music_track)
        updates.music_track = editData.music_track;

      if (
        editData.edit_deadline !==
        (deliverable.edit_deadline
          ? new Date(deliverable.edit_deadline).toISOString().split("T")[0]
          : "")
      ) {
        updates.edit_deadline = editData.edit_deadline
          ? new Date(editData.edit_deadline)
          : undefined;
      }

      if (
        editData.release_date !==
        (deliverable.release_date
          ? new Date(deliverable.release_date).toISOString().split("T")[0]
          : "")
      ) {
        updates.release_date = editData.release_date
          ? new Date(editData.release_date)
          : undefined;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdate(updates);
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update deliverable:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      type: deliverable.type || "",
      mediaTypeId: deliverable.mediaTypeId?.toString() || "",
      aspect_ratio: deliverable.aspect_ratio || "",
      editor: deliverable.editor || "",
      target_audience: deliverable.target_audience || "",
      music_track: deliverable.music_track || "",
      edit_deadline: deliverable.edit_deadline
        ? new Date(deliverable.edit_deadline).toISOString().split("T")[0]
        : "",
      release_date: deliverable.release_date
        ? new Date(deliverable.release_date).toISOString().split("T")[0]
        : "",
    });
    setIsEditing(false);
  };

  // InfoRow component for consistent display
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
    <div className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 w-6" />
      <div className="text-sm font-medium text-foreground min-w-[120px] flex-shrink-0">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:text-primary/80 break-all flex-1"
        >
          {value}
        </a>
      ) : (
        <div className="text-sm text-muted-foreground break-words flex-1">
          {value}
        </div>
      )}
    </div>
  );

  const EditRow = ({
    icon: Icon,
    label,
    children,
  }: {
    icon: React.ElementType;
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 w-6" />
      <div className="text-sm font-medium text-foreground min-w-[120px] flex-shrink-0">
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );

  // Get display value for Type field
  const getTypeDisplayValue = () => {
    if (deliverable.mediaTypeId) {
      const mediaType = mediaTypes.find(
        (mt) => mt._id.toString() === deliverable.mediaTypeId?.toString()
      );
      return mediaType ? mediaType.name : deliverable.type;
    }
    return deliverable.type;
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Details
          </h3>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-0">
          <InfoRow
            icon={Monitor}
            label="Platform"
            value={
              <PlatformDisplay
                platform={deliverable.platform}
                platforms={deliverable.platforms}
              />
            }
          />

          {!isEditing ? (
            <InfoRow icon={Tag} label="Type" value={getTypeDisplayValue()} />
          ) : (
            <EditRow icon={Tag} label="Type">
              <div className="space-y-2">
                <Select
                  value={editData.mediaTypeId || "legacy"}
                  onValueChange={(value) => {
                    if (value === "legacy") {
                      // No MediaType selected, keep legacy type
                      setEditData({
                        ...editData,
                        mediaTypeId: "",
                      });
                    } else {
                      // MediaType selected, sync legacy type field
                      const selectedMediaType = mediaTypes.find(
                        (mt) => mt._id.toString() === value
                      );
                      if (selectedMediaType) {
                        const legacyTypeMapping: Record<
                          string,
                          DeliverableType
                        > = {
                          Video: "Video",
                          "Photo Gallery": "Photo Gallery",
                          "Mixed Gallery": "Mixed Gallery",
                          "Video Gallery": "Video Gallery",
                        };
                        setEditData({
                          ...editData,
                          mediaTypeId: value,
                          type:
                            legacyTypeMapping[selectedMediaType.name] ||
                            "other",
                        });
                      } else {
                        setEditData({
                          ...editData,
                          mediaTypeId: value,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select media type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaTypesLoading && (
                      <SelectItem value="loading" disabled>
                        Loading media types...
                      </SelectItem>
                    )}
                    {!mediaTypesLoading && mediaTypes.length === 0 && (
                      <SelectItem value="empty" disabled>
                        No media types available
                      </SelectItem>
                    )}
                    {!mediaTypesLoading &&
                      mediaTypes.map((mediaType) => (
                        <SelectItem
                          key={mediaType._id.toString()}
                          value={mediaType._id.toString()}
                        >
                          {mediaType.name}
                          {mediaType.description && (
                            <span className="text-xs text-muted-foreground ml-2">
                              - {mediaType.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    {/* Fallback option for legacy compatibility */}
                    <SelectItem value="legacy">
                      <span className="text-muted-foreground">
                        Other (Legacy Type)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Show legacy type dropdown when no MediaType is selected */}
                {!editData.mediaTypeId && (
                  <Select
                    value={editData.type}
                    onValueChange={(value) =>
                      setEditData({
                        ...editData,
                        type: value as DeliverableType,
                      })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select legacy type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Photo Gallery">
                        Photo Gallery
                      </SelectItem>
                      <SelectItem value="Video">Video</SelectItem>
                      <SelectItem value="Mixed Gallery">
                        Mixed Gallery
                      </SelectItem>
                      <SelectItem value="Video Gallery">
                        Video Gallery
                      </SelectItem>
                      <SelectItem value="Still">Still</SelectItem>
                      <SelectItem value="Graphic">Graphic</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="promo">Promo</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="walkthrough">Walkthrough</SelectItem>
                      <SelectItem value="highlights">Highlights</SelectItem>
                      <SelectItem value="Marketing Email">
                        Marketing Email
                      </SelectItem>
                      <SelectItem value="Blog">Blog</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </EditRow>
          )}

          {deliverable.duration > 0 &&
            (deliverable.type as string) !== "Photo Gallery" && (
              <InfoRow
                icon={Clock}
                label="Duration"
                value={formatDeliverableDuration(deliverable)}
              />
            )}

          {!isEditing ? (
            <InfoRow
              icon={Monitor}
              label="Aspect Ratio"
              value={deliverable.aspect_ratio || "Not specified"}
            />
          ) : (
            <EditRow icon={Monitor} label="Aspect Ratio">
              <Select
                value={editData.aspect_ratio}
                onValueChange={(value) =>
                  setEditData({ ...editData, aspect_ratio: value })
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait/Shorts)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                  <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                </SelectContent>
              </Select>
            </EditRow>
          )}

          {(deliverable.editor || isEditing) &&
            (!isEditing ? (
              <InfoRow icon={User} label="Editor" value={deliverable.editor} />
            ) : (
              <EditRow icon={User} label="Editor">
                <Input
                  value={editData.editor}
                  onChange={(e) =>
                    setEditData({ ...editData, editor: e.target.value })
                  }
                  className="text-sm"
                  placeholder="Enter editor name"
                />
              </EditRow>
            ))}

          {(deliverable.target_audience || isEditing) &&
            (!isEditing ? (
              <InfoRow
                icon={User}
                label="Target Audience"
                value={deliverable.target_audience}
              />
            ) : (
              <EditRow icon={User} label="Target Audience">
                <Input
                  value={editData.target_audience}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      target_audience: e.target.value,
                    })
                  }
                  className="text-sm"
                  placeholder="Enter target audience"
                />
              </EditRow>
            ))}

          {(deliverable.music_track || isEditing) &&
            (!isEditing ? (
              <InfoRow
                icon={Tag}
                label="Music Track"
                value={deliverable.music_track}
              />
            ) : (
              <EditRow icon={Tag} label="Music Track">
                <Input
                  value={editData.music_track}
                  onChange={(e) =>
                    setEditData({ ...editData, music_track: e.target.value })
                  }
                  className="text-sm"
                  placeholder="Enter music track"
                />
              </EditRow>
            ))}

          {/* Metadata */}
          {deliverable._id && (
            <InfoRow
              icon={Database}
              label="ID"
              value={
                <code className="text-xs bg-transparent border border-border/20 px-2 py-1 rounded">
                  {deliverable._id.toString()}
                </code>
              }
            />
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
        <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Timeline
        </h3>

        <div className="space-y-0">
          {!isEditing ? (
            <InfoRow
              icon={Clock}
              label="Edit Deadline"
              value={
                deliverable.edit_deadline
                  ? safeFormat(deliverable.edit_deadline, "MMMM d, yyyy")
                  : "Not set"
              }
            />
          ) : (
            <EditRow icon={Clock} label="Edit Deadline">
              <Input
                type="date"
                value={editData.edit_deadline}
                onChange={(e) =>
                  setEditData({ ...editData, edit_deadline: e.target.value })
                }
                className="text-sm"
              />
            </EditRow>
          )}

          {!isEditing ? (
            <InfoRow
              icon={Calendar}
              label="Release Date"
              value={
                deliverable.release_date
                  ? safeFormat(deliverable.release_date, "MMMM d, yyyy")
                  : "Not set"
              }
            />
          ) : (
            <EditRow icon={Calendar} label="Release Date">
              <Input
                type="date"
                value={editData.release_date}
                onChange={(e) =>
                  setEditData({ ...editData, release_date: e.target.value })
                }
                className="text-sm"
              />
            </EditRow>
          )}

          <InfoRow
            icon={Calendar}
            label="Created"
            value={
              deliverable.created_at
                ? safeFormat(deliverable.created_at, "MMMM d, yyyy 'at' h:mm a")
                : "Unknown"
            }
          />

          <InfoRow
            icon={Calendar}
            label="Last Updated"
            value={
              deliverable.updated_at
                ? safeFormat(deliverable.updated_at, "MMMM d, yyyy 'at' h:mm a")
                : "Unknown"
            }
          />
        </div>
      </div>
    </div>
  );
}
