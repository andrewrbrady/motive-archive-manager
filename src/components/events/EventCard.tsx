"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Event, EventType } from "@/types/event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Video,
  Search,
  Wrench,
  Sparkles,
  Package,
  Truck,
  MoreHorizontal,
  CircleDot,
  Play,
  CheckCircle,
  Calendar,
  Clock,
  Edit,
  Trash2,
  MapPin,
  Car,
} from "lucide-react";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import { LoadingSpinner } from "@/components/ui/loading";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LocationResponse } from "@/models/location";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

// TypeScript interfaces for API responses
interface ImageResponse {
  _id: string;
  url: string;
}

interface EventCardProps {
  event: Event & {
    car?: {
      _id: string;
      make: string;
      model: string;
      year: number;
      primaryImageId?: string;
    };
  };
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
}

// Icon mapping for event types
const getEventTypeIcon = (type: EventType) => {
  switch (type) {
    case EventType.PRODUCTION:
      return <Camera className="w-4 h-4 flex-shrink-0" />;
    case EventType.POST_PRODUCTION:
      return <Video className="w-4 h-4 flex-shrink-0" />;
    case EventType.MARKETING:
      return <Sparkles className="w-4 h-4 flex-shrink-0" />;
    case EventType.INSPECTION:
      return <Search className="w-4 h-4 flex-shrink-0" />;
    case EventType.DETAIL:
      return <Wrench className="w-4 h-4 flex-shrink-0" />;
    case EventType.PICKUP:
      return <Package className="w-4 h-4 flex-shrink-0" />;
    case EventType.DELIVERY:
      return <Truck className="w-4 h-4 flex-shrink-0" />;
    default:
      return <MoreHorizontal className="w-4 h-4 flex-shrink-0" />;
  }
};

const getTypeColor = (type: EventType) => {
  switch (type) {
    case EventType.PRODUCTION:
      return "bg-purple-100 text-purple-800";
    case EventType.POST_PRODUCTION:
      return "bg-indigo-100 text-indigo-800";
    case EventType.MARKETING:
      return "bg-pink-100 text-pink-800";
    case EventType.INSPECTION:
      return "bg-yellow-100 text-yellow-800";
    case EventType.DETAIL:
      return "bg-orange-100 text-orange-800";
    case EventType.PICKUP:
      return "bg-green-100 text-green-800";
    case EventType.DELIVERY:
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const [primaryImage, setPrimaryImage] = useState<{
    id?: string;
    url: string;
  } | null>(null);
  const [location, setLocation] = useState<LocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingCarImage, setUsingCarImage] = useState(false);

  const api = useAPI();

  useEffect(() => {
    if (!api) return;

    const fetchEventData = async () => {
      setLoading(true);

      // Fetch location if locationId exists
      if (event.locationId) {
        try {
          const locationData = await api!.get<LocationResponse>(
            `locations/${event.locationId}`
          );
          setLocation(locationData);
        } catch (error) {
          console.error("Error fetching location:", error);
          toast.error("Failed to load location information");
        }
      }

      // Fetch primary image logic with car fallback
      if (event.primaryImageId) {
        try {
          const imageData = await api!.get<ImageResponse>(
            `images/${event.primaryImageId}`
          );
          setPrimaryImage({
            id: imageData._id,
            url: fixCloudflareImageUrl(imageData.url),
          });
          setUsingCarImage(false);
        } catch (error) {
          console.error("Error fetching event primary image:", error);
          // If primary image fetch fails, try the first image
          if (
            event.imageIds &&
            event.imageIds.length > 0 &&
            event.imageIds[0] !== event.primaryImageId
          ) {
            try {
              const fallbackImageData = await api!.get<ImageResponse>(
                `images/${event.imageIds[0]}`
              );
              setPrimaryImage({
                id: fallbackImageData._id,
                url: fixCloudflareImageUrl(fallbackImageData.url),
              });
              setUsingCarImage(false);
            } catch (fallbackError) {
              console.error(
                "Error fetching fallback event image:",
                fallbackError
              );
              // Try car's primary image as final fallback
              await tryCarPrimaryImage();
            }
          } else {
            // Try car's primary image as final fallback
            await tryCarPrimaryImage();
          }
        }
      } else if (event.imageIds && event.imageIds.length > 0) {
        // If no primary image but we have image IDs, use the first one
        try {
          const imageData = await api!.get<ImageResponse>(
            `images/${event.imageIds[0]}`
          );
          setPrimaryImage({
            id: imageData._id,
            url: fixCloudflareImageUrl(imageData.url),
          });
          setUsingCarImage(false);
        } catch (error) {
          console.error("Error fetching first event image:", error);
          // Try car's primary image as final fallback
          await tryCarPrimaryImage();
        }
      } else {
        // No event images, try car's primary image
        await tryCarPrimaryImage();
      }

      async function tryCarPrimaryImage() {
        if (event.car?.primaryImageId) {
          try {
            const carImageData = await api!.get<ImageResponse>(
              `images/${event.car.primaryImageId}`
            );
            setPrimaryImage({
              id: carImageData._id,
              url: fixCloudflareImageUrl(carImageData.url),
            });
            setUsingCarImage(true);
          } catch (carImageError) {
            console.error("Error fetching car primary image:", carImageError);
            setPrimaryImage(null);
            setUsingCarImage(false);
          }
        } else {
          setPrimaryImage(null);
          setUsingCarImage(false);
        }
      }

      setLoading(false);
    };

    fetchEventData();
  }, [
    event.primaryImageId,
    event.imageIds,
    event.locationId,
    event.car?.primaryImageId,
    api,
  ]);

  // Authentication guard
  if (!api) {
    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-[16/9]">
          <div className="w-full h-full bg-muted/50 flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="lg" />
          </div>
        </div>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="h-6 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatEventDate = () => {
    const startDate = new Date(event.start);
    const endDate = event.end ? new Date(event.end) : null;

    if (event.isAllDay) {
      if (endDate && endDate.getTime() !== startDate.getTime()) {
        return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
      }
      return format(startDate, "MMM d, yyyy");
    } else {
      if (endDate) {
        if (startDate.toDateString() === endDate.toDateString()) {
          return `${format(startDate, "MMM d, yyyy")} • ${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;
        } else {
          return `${format(startDate, "MMM d, h:mm a")} - ${format(endDate, "MMM d, h:mm a")}`;
        }
      }
      return format(startDate, "MMM d, yyyy • h:mm a");
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative aspect-[16/9]">
        {loading ? (
          <div className="w-full h-full bg-muted/50 flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="lg" />
          </div>
        ) : primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            onError={(e) => {
              console.error("EventCard: Image failed to load:", {
                url: primaryImage.url,
                eventId: event.id,
              });
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="flex items-center gap-4 px-6">
              <MotiveLogo className="w-12 h-12 text-muted-foreground fill-current" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                No Image
              </span>
            </div>
          </div>
        )}

        {/* Car image indicator */}
        {usingCarImage && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              <Car className="w-3 h-3 mr-1" />
              Car Image
            </Badge>
          </div>
        )}

        {/* Action buttons overlay */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(event);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (
                  window.confirm("Are you sure you want to delete this event?")
                ) {
                  onDelete(event.id);
                }
              }}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Title and badges */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {event.title}
            </h3>

            {/* Description if different from title */}
            {event.description && event.description !== event.title && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge
                className={cn(
                  "flex items-center gap-1",
                  getTypeColor(event.type)
                )}
              >
                {getEventTypeIcon(event.type)}
                {event.type.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {/* Date and time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {event.isAllDay ? (
              <Calendar className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Clock className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{formatEventDate()}</span>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{location.name}</span>
            </div>
          )}

          {/* Team members count */}
          {event.teamMemberIds && event.teamMemberIds.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {event.teamMemberIds.length} team member
              {event.teamMemberIds.length !== 1 ? "s" : ""} assigned
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
