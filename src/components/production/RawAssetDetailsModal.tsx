import React from "react";
import { RawAssetData } from "@/models/raw_assets";
import {
  FolderIcon,
  XIcon,
  CarIcon,
  HardDriveIcon,
  ExternalLinkIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface RawAssetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: RawAssetData | undefined;
  driveLabels: Record<string, string>;
}

export default function RawAssetDetailsModal({
  isOpen,
  onClose,
  asset,
  driveLabels,
}: RawAssetDetailsModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!isOpen || !asset) return null;

  const handleDriveClick = (driveId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Close the current modal first
    onClose();

    // Get all current URL parameters
    const params = new URLSearchParams(searchParams.toString());

    // Preserve the template parameter if it exists
    const template = params.get("template");

    // Create new params with only what we need
    const newParams = new URLSearchParams();
    if (template) newParams.set("template", template);
    newParams.set("tab", "hard-drives");
    newParams.set("drive", driveId);

    // Navigate with the new parameters
    router.replace(`/production?${newParams.toString()}`);
  };

  return (
    <div className="fixed inset-0 bg-[hsl(var(--background))/95] backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-[hsl(var(--background))] p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 border border-[hsl(var(--border))] relative">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <FolderIcon className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
                {asset.date}
              </h2>
              <p className="text-[hsl(var(--muted-foreground))]">
                {asset.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Cars</h3>
              {asset.cars && asset.cars.length > 0 ? (
                <div className="space-y-2">
                  {asset.cars.map((car) => (
                    <div
                      key={car._id}
                      className="p-3 border border-[hsl(var(--border))] rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <CarIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="font-medium">
                          {car.year} {car.make} {car.model}
                        </span>
                      </div>
                      {(car.series || car.trim || car.color) && (
                        <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))] space-y-1">
                          {car.series && <div>Series: {car.series}</div>}
                          {car.trim && <div>Trim: {car.trim}</div>}
                          {car.color && <div>Color: {car.color}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[hsl(var(--muted-foreground))] text-center py-8 border border-dashed border-[hsl(var(--border))] rounded-lg">
                  <CarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No cars associated with this asset.</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Storage Locations</h3>
              {asset.hardDriveIds && asset.hardDriveIds.length > 0 ? (
                <div className="space-y-2">
                  {asset.hardDriveIds.map((hardDriveId, index) => {
                    const hardDriveIdStr = hardDriveId.toString();
                    return (
                      <button
                        key={index}
                        onClick={(e) => handleDriveClick(hardDriveIdStr, e)}
                        className="w-full p-3 border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--accent))] transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <HardDriveIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          <span className="font-medium">
                            {driveLabels[hardDriveIdStr] || hardDriveIdStr}
                          </span>
                          <ExternalLinkIcon className="w-4 h-4 ml-auto text-[hsl(var(--muted-foreground))]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[hsl(var(--muted-foreground))] text-center py-8 border border-dashed border-[hsl(var(--border))] rounded-lg">
                  <HardDriveIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No storage locations associated with this asset.</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Additional Information</h3>
            <div className="space-y-4">
              <div className="p-4 border border-[hsl(var(--border))] rounded-lg">
                <h4 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
                  Asset ID
                </h4>
                <p className="font-mono text-sm">{asset._id?.toString()}</p>
              </div>
              {/* Add more metadata sections here as needed */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
