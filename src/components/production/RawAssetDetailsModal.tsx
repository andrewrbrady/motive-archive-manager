import React from "react";
import { RawAssetData } from "@/models/raw_assets";
import {
  FolderIcon,
  CarIcon,
  HardDriveIcon,
  ExternalLinkIcon,
  CalendarIcon,
  ClockIcon,
  InfoIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { UrlModal } from "@/components/ui/url-modal";
import { useUrlParams } from "@/hooks/useUrlParams";

interface RawAssetDetailsModalProps {
  asset: RawAssetData | undefined;
  driveLabels: Record<string, string>;
  onClose: () => void;
  isOpen?: boolean;
}

export default function RawAssetDetailsModal({
  asset,
  driveLabels,
  onClose,
  isOpen,
}: RawAssetDetailsModalProps) {
  const router = useRouter();
  const { updateParams, getParam } = useUrlParams();

  if (!asset) return null;

  const handleDriveClick = (driveId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Navigating to hard drive:", driveId);

    // First close the current modal to prevent any state conflicts
    onClose();

    // Then update the URL directly for immediate effect
    const url = new URL(window.location.href);

    // Set only the parameters we want - keep the tab and drive ID
    url.searchParams.set("tab", "hard-drives");
    url.searchParams.set("drive", driveId);

    // Preserve template if it exists
    const template = getParam("template");
    if (template) {
      url.searchParams.set("template", template);
    }

    // Preserve other important parameters except asset
    ["page", "limit", "search", "location", "view"].forEach((param) => {
      const value = getParam(param);
      if (value && param !== "asset") {
        url.searchParams.set(param, value);
      }
    });

    console.log("Setting URL directly to:", url.toString());
    window.history.pushState({}, "", url.toString());

    // Finally update the Next.js router state to keep it in sync
    setTimeout(() => {
      console.log("Updating Next.js router for hard drive:", driveId);
      updateParams(
        {
          tab: "hard-drives",
          drive: driveId,
          asset: null, // Explicitly remove the asset parameter
        },
        {
          // Preserve other important parameters
          preserveParams: [
            "template",
            "page",
            "limit",
            "search",
            "location",
            "view",
          ],
          clearOthers: false, // Important: Keep existing parameters to maintain context
        }
      );
      console.log("Next.js router update completed for hard drive");
    }, 200); // Increased timeout for better reliability
  };

  const handleCarClick = (carId: string | any, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();

    // Ensure we have a string ID
    const carIdStr =
      typeof carId === "object" && carId.toString ? carId.toString() : carId;

    // Navigate to the car detail page
    router.push(`/cars/${carIdStr}`);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (date: Date | undefined) => {
    if (!date) return "";
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <UrlModal
      paramName="asset"
      paramValue={asset._id?.toString()}
      onClose={onClose}
      preserveParams={[
        "tab",
        "page",
        "limit",
        "search",
        "location",
        "view",
        "template",
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <FolderIcon className="w-5 h-5 mr-2" />
              Asset Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[hsl(var(--muted-foreground))] text-sm mb-1">
                  Description
                </p>
                <p className="text-[hsl(var(--foreground))]">
                  {asset.description}
                </p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))] text-sm mb-1">
                  Date
                </p>
                <p className="text-[hsl(var(--foreground))]">{asset.date}</p>
              </div>
              {asset.createdAt && (
                <div>
                  <p className="text-[hsl(var(--muted-foreground))] text-sm mb-1">
                    Created
                  </p>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <span>
                      {formatDate(asset.createdAt)}{" "}
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {formatTime(asset.createdAt)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[hsl(var(--muted-foreground))] text-sm">
                    <ClockIcon className="w-3 h-3" />
                    <span>{getTimeAgo(asset.createdAt)}</span>
                  </div>
                </div>
              )}
              {asset.updatedAt && asset.updatedAt !== asset.createdAt && (
                <div>
                  <p className="text-[hsl(var(--muted-foreground))] text-sm mb-1">
                    Last Updated
                  </p>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <span>
                      {formatDate(asset.updatedAt)}{" "}
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {formatTime(asset.updatedAt)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[hsl(var(--muted-foreground))] text-sm">
                    <ClockIcon className="w-3 h-3" />
                    <span>{getTimeAgo(asset.updatedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <HardDriveIcon className="w-5 h-5 mr-2" />
              Storage Locations
            </h3>
            <div className="space-y-2">
              {asset.hardDriveIds && asset.hardDriveIds.length > 0 ? (
                asset.hardDriveIds.map((driveId) => (
                  <div
                    key={driveId.toString()}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--background-secondary))] rounded-md hover:bg-[hsl(var(--background-secondary))]/80 cursor-pointer transition-colors"
                    onClick={(e) => handleDriveClick(driveId.toString(), e)}
                  >
                    <div className="flex items-center">
                      <HardDriveIcon className="w-4 h-4 mr-2 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm">
                        {driveLabels[driveId.toString()] ||
                          `Drive ${driveId.toString().slice(0, 8)}...`}
                      </span>
                    </div>
                    <ExternalLinkIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  </div>
                ))
              ) : (
                <p className="text-[hsl(var(--muted-foreground))]">
                  No storage locations assigned
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <CarIcon className="w-5 h-5 mr-2" />
              Associated Cars
            </h3>
            <div className="space-y-2">
              {asset.cars && asset.cars.length > 0 ? (
                asset.cars.map((car) => (
                  <div
                    key={car._id.toString()}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--background-secondary))] rounded-md hover:bg-[hsl(var(--background-secondary))]/80 cursor-pointer transition-colors"
                    onClick={(e) => handleCarClick(car._id, e)}
                  >
                    <div className="flex items-center">
                      <CarIcon className="w-4 h-4 mr-2 text-[hsl(var(--muted-foreground))]" />
                      <span>
                        {car.year} {car.make} {car.model}
                      </span>
                    </div>
                    <ExternalLinkIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  </div>
                ))
              ) : (
                <p className="text-[hsl(var(--muted-foreground))]">
                  No cars associated with this asset
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <InfoIcon className="w-5 h-5 mr-2" />
              Actions
            </h3>
            <button
              onClick={() => {
                console.log("Editing asset:", asset._id);

                // First update the URL directly for immediate effect
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "raw-assets");
                url.searchParams.set(
                  "asset",
                  asset._id ? asset._id.toString() : ""
                );
                url.searchParams.set("edit", "true");

                // Preserve other important parameters
                [
                  "page",
                  "limit",
                  "search",
                  "location",
                  "view",
                  "template",
                ].forEach((param) => {
                  const value = getParam(param);
                  if (value) {
                    url.searchParams.set(param, value);
                  }
                });

                console.log("Setting URL directly to:", url.toString());
                window.history.pushState({}, "", url.toString());

                // Then close the current modal
                onClose();

                // Finally update the Next.js router state to keep it in sync
                // Use setTimeout to ensure the direct URL update has time to take effect
                setTimeout(() => {
                  console.log(
                    "Updating Next.js router for editing asset:",
                    asset._id
                  );
                  updateParams(
                    {
                      tab: "raw-assets",
                      asset: asset._id ? asset._id.toString() : "",
                      edit: "true",
                    },
                    {
                      // Preserve other important parameters
                      preserveParams: [
                        "page",
                        "limit",
                        "search",
                        "location",
                        "view",
                        "template",
                      ],
                      context: "tab:raw-assets",
                    }
                  );
                  console.log(
                    "Next.js router update completed for editing asset"
                  );
                }, 100);
              }}
              className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded hover:bg-[hsl(var(--primary))/90] transition-colors"
            >
              Edit Asset
            </button>
          </div>
        </div>
      </div>
    </UrlModal>
  );
}
