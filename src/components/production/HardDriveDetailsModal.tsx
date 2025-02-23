import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { HardDriveIcon } from "lucide-react";
import RawAssetDetailsModal from "./RawAssetDetailsModal";
import { RawAssetData } from "@/models/raw";
import Link from "next/link";

interface HardDriveDetailsModalProps {
  driveId: string | null;
  onClose: () => void;
}

interface RawAsset {
  _id: string;
  date: string;
  description: string;
  locations: string[];
  cars: Array<{
    _id: string;
    make: string;
    model: string;
    year: number;
  }>;
}

interface HardDrive {
  _id: string;
  label: string;
  systemName?: string;
  capacity: {
    total: number;
    used?: number;
    available?: number;
  };
  type: "HDD" | "SSD" | "NVMe";
  interface: "USB" | "Thunderbolt" | "USB-C" | "Internal";
  status: "Available" | "In Use" | "Archived" | "Offline";
  location?: string;
  notes?: string;
  rawAssetDetails: RawAsset[];
}

export default function HardDriveDetailsModal({
  driveId,
  onClose,
}: HardDriveDetailsModalProps) {
  const [drive, setDrive] = useState<HardDrive | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<RawAssetData | null>(null);
  const [driveLabels, setDriveLabels] = useState<Record<string, string>>({});
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Handle opening raw asset details
  const handleAssetClick = (asset: RawAsset) => {
    // Get current URL parameters
    const params = new URLSearchParams(searchParams.toString());

    // Update the parameters we want to change
    params.set("tab", "raw-assets");
    params.set("asset", asset._id);

    // Remove the drive parameter since we're leaving the drive view
    params.delete("drive");

    // Force a hard navigation to the new URL
    window.location.href = `${pathname}?${params.toString()}`;
  };

  // Handle closing raw asset details
  const handleAssetClose = () => {
    setSelectedAsset(null);
    // Remove asset ID from URL but keep other parameters
    const params = new URLSearchParams(searchParams.toString());
    params.delete("asset");
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Handle URL updates for drive modal
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Only update URL if we're not navigating to a raw asset
      // and if we're actually closing the modal (open === false)
      const params = new URLSearchParams(searchParams.toString());
      params.delete("drive");
      // Preserve the template parameter
      const template = params.get("template");
      // Create new params with only what we need
      const newParams = new URLSearchParams();
      if (template) newParams.set("template", template);
      newParams.set("tab", "hard-drives");
      router.replace(`${pathname}?${newParams.toString()}`);
      onClose();
    }
  };

  // Fetch drive labels for the selected asset
  const fetchDriveLabels = async (locations: string[]) => {
    const labels: Record<string, string> = {};
    for (const id of locations) {
      try {
        const response = await fetch(`/api/hard-drives?id=${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.drives?.[0]?.label) {
            labels[id] = data.drives[0].label;
          }
        }
      } catch (error) {
        console.warn(`Error fetching drive label for ${id}:`, error);
      }
    }
    return labels;
  };

  useEffect(() => {
    async function fetchDriveDetails() {
      if (!driveId) return;

      try {
        const response = await fetch(`/api/hard-drives/${driveId}`);
        if (!response.ok) throw new Error("Failed to fetch drive details");
        const data = await response.json();
        setDrive(data);
      } catch (error) {
        console.error("Error fetching drive details:", error);
      }
    }

    fetchDriveDetails();
  }, [driveId]);

  if (!drive) return null;

  const formatCapacity = (capacity: HardDrive["capacity"]) => {
    const total = `${capacity.total} GB`;
    if (capacity.used !== undefined && capacity.available !== undefined) {
      return `${total} (${capacity.used} GB used, ${capacity.available} GB available)`;
    }
    return total;
  };

  const getStatusColor = (status: HardDrive["status"]) => {
    switch (status) {
      case "Available":
        return "bg-green-500";
      case "In Use":
        return "bg-blue-500";
      case "Archived":
        return "bg-yellow-500";
      case "Offline":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <>
      <Dialog open={!!driveId} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Drive Stats */}
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center">
                  <HardDriveIcon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{drive.label}</h2>
                  {drive.systemName && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      System Name: {drive.systemName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(drive.status)} text-white`}
                  >
                    {drive.status}
                  </Badge>
                  <Badge variant="secondary">{drive.type}</Badge>
                  <Badge variant="secondary">{drive.interface}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="bg-[hsl(var(--secondary))] p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Storage</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {formatCapacity(drive.capacity)}
                    </p>
                  </div>

                  {drive.location && (
                    <div className="bg-[hsl(var(--secondary))] p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Location</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {drive.location}
                      </p>
                    </div>
                  )}

                  {drive.notes && (
                    <div className="bg-[hsl(var(--secondary))] p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Notes</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-line">
                        {drive.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Raw Assets */}
            <div className="flex flex-col">
              <h3 className="text-lg font-medium mb-4">Raw Assets</h3>
              <ScrollArea className="flex-1 h-[600px] pr-4">
                <div className="space-y-4">
                  {drive?.rawAssetDetails.map((asset) => (
                    <button
                      key={asset._id}
                      onClick={() => handleAssetClick(asset)}
                      className="block w-full text-left border border-[hsl(var(--border))] rounded-lg p-3 hover:bg-[hsl(var(--accent))] transition-colors"
                    >
                      <div className="flex items-center">
                        <p className="font-medium min-w-[120px] text-sm">
                          {asset.date}
                        </p>
                        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                          {asset.cars.map((car) => (
                            <Badge
                              key={car._id}
                              variant="outline"
                              className="whitespace-nowrap"
                            >
                              {car.year} {car.make} {car.model}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RawAssetDetailsModal
        isOpen={!!selectedAsset}
        onClose={handleAssetClose}
        asset={selectedAsset || undefined}
        driveLabels={driveLabels}
      />
    </>
  );
}
