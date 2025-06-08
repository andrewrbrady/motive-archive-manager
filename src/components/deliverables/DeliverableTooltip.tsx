"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CalendarIcon, Clock, MonitorPlay, User, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Deliverable } from "@/types/deliverable";
import { Button } from "@/components/ui/button";
import EditDeliverableForm from "./EditDeliverableForm";
import { useState, useRef } from "react";
import { getCarThumbnailUrl } from "@/lib/cloudflare";
import Image from "next/image";

interface DeliverableTooltipProps {
  children: React.ReactNode;
  deliverable: Deliverable & {
    car?: {
      year: number;
      make: string;
      model: string;
      primaryImageId?: string;
      images?: Array<{ _id: string; url: string }>;
    };
    isDeadline?: boolean;
    hideTitle?: boolean;
    hideDates?: boolean;
  };
  onDeliverableUpdated?: () => void;
}

export default function DeliverableTooltip({
  children,
  deliverable,
  onDeliverableUpdated,
}: DeliverableTooltipProps) {
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Helper function to safely format dates
  const safeFormat = (date: any): string => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "N/A";
      return format(d, "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  // Get car thumbnail URL if available
  const carThumbnailUrl = deliverable.car
    ? getCarThumbnailUrl(deliverable.car)
    : "";

  return (
    <>
      <HoverCard
        open={isHoverOpen}
        onOpenChange={setIsHoverOpen}
        openDelay={0}
        closeDelay={100}
      >
        <HoverCardTrigger asChild>{children}</HoverCardTrigger>
        <HoverCardContent
          className="w-96 p-4"
          side="right"
          align="start"
          sideOffset={10}
        >
          <div className="space-y-4">
            {/* Car thumbnail and title section */}
            {!deliverable.hideTitle && (
              <div className="space-y-3">
                {/* Car thumbnail */}
                {carThumbnailUrl && (
                  <div className="flex justify-center">
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                      <Image
                        src={carThumbnailUrl}
                        alt={`${deliverable.car?.make} ${deliverable.car?.model}`}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  </div>
                )}

                {/* Title section */}
                <div className="text-center">
                  <h4 className="text-sm font-semibold leading-tight">
                    {deliverable.car && (
                      <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] font-medium">
                        {deliverable.car.year ? `${deliverable.car.year} ` : ""}
                        {deliverable.car.make} {deliverable.car.model}
                      </span>
                    )}
                    {deliverable.car && <span className="mx-2">•</span>}
                    <span className="text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
                      {deliverable.title}
                    </span>
                  </h4>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                  <MonitorPlay className="mr-2 h-4 w-4 flex-shrink-0" />
                  {deliverable.platform}
                </div>
                <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                  <User className="mr-2 h-4 w-4 flex-shrink-0" />
                  {deliverable.editor}
                </div>
              </div>

              {!deliverable.hideDates && (
                <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  {deliverable.isDeadline ? (
                    <>
                      <span className="font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                        Deadline:
                      </span>
                      <span className="ml-2 whitespace-nowrap">
                        {safeFormat(deliverable.edit_deadline)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                        Release:
                      </span>
                      <span className="ml-2 whitespace-nowrap">
                        {safeFormat(deliverable.release_date)}
                      </span>
                    </>
                  )}
                </div>
              )}

              {deliverable.type !== "Photo Gallery" && (
                <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                  <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    {formatDuration(deliverable.duration)} min
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  deliverable.status === "not_started"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    : deliverable.status === "in_progress"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                }`}
              >
                {deliverable.status.replace("_", " ").toUpperCase()}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHoverOpen(false);
                  // Delay to ensure hover card closes first, then find and click the hidden edit button
                  setTimeout(() => {
                    const hiddenEditButton = document.querySelector(
                      '[data-deliverable-id="' + deliverable._id + '"] button'
                    ) as HTMLButtonElement;
                    hiddenEditButton?.click();
                  }, 100);
                }}
                className="h-6 px-2 text-xs"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* EditDeliverableForm outside hover card to prevent unmounting */}
      <div
        style={{ display: "none" }}
        data-deliverable-id={deliverable._id?.toString()}
      >
        <EditDeliverableForm
          deliverable={deliverable}
          onDeliverableUpdated={() => {
            onDeliverableUpdated?.();
          }}
          onClose={() => {}}
        />
      </div>
    </>
  );
}
