import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { HardDriveIcon, PencilIcon, FolderIcon, ScanIcon } from "lucide-react";
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
  rawAssets?: string[];
  rawAssetDetails: RawAsset[];
}

export default function HardDriveDetailsModal({
  driveId,
  onClose,
}: HardDriveDetailsModalProps) {
  const [drive, setDrive] = useState<HardDrive | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<RawAssetData | null>(null);
  const [driveLabels, setDriveLabels] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<HardDrive> | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    matchedAssets: number;
    scannedFolders: number;
    addedAssets: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleRemoveAsset = async (assetId: string) => {
    try {
      const response = await fetch(`/api/hard-drives/${driveId}/raw-assets`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawAssetIds: [assetId],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove asset from drive");
      }

      // Refresh drive data by refetching
      if (driveId) {
        const refreshResponse = await fetch(`/api/hard-drives/${driveId}`);
        if (!refreshResponse.ok)
          throw new Error("Failed to refresh drive details");
        const refreshedData = await refreshResponse.json();
        setDrive(refreshedData);
      }
    } catch (error) {
      console.error("Error removing asset:", error);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditFormData(drive);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData(null);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!driveId || !editFormData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create a new object without the _id field
      const { _id, rawAssetDetails, rawAssets, ...updateData } = editFormData;

      const response = await fetch(`/api/hard-drives/${driveId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update drive");
      }

      const updatedDrive = await response.json();
      setDrive(updatedDrive);
      setIsEditing(false);
      setEditFormData(null);
    } catch (error) {
      console.error("Error updating drive:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update drive"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFolderSelect = async () => {
    setError(null);
    try {
      // @ts-expect-error - The type definition for the form is incomplete
      const dirHandle = await window.showDirectoryPicker();
      const path = dirHandle.name;

      setIsLoading(true);
      try {
        // Check if this is a system path
        if (
          path === "/" ||
          path.startsWith("/System") ||
          path === "Macintosh HD"
        ) {
          throw new Error(
            "Cannot select system directories. Please choose a regular folder or external drive."
          );
        }

        // Fetch drive information from our API
        const response = await fetch(
          `/api/system/drives?path=/Volumes/${encodeURIComponent(path)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              "Failed to get drive information. Please ensure you select a valid drive or folder."
          );
        }

        const driveInfo = await response.json();

        // Update form with drive information
        setEditFormData((prev) => ({
          ...prev,
          systemName: driveInfo.systemName,
          label: prev?.label || driveInfo.systemName,
          capacity: {
            total: Math.round(driveInfo.capacity.total),
            used: Math.round(driveInfo.capacity.used),
            available: Math.round(driveInfo.capacity.available),
          },
          type: driveInfo.driveType.isSSD ? "SSD" : "HDD",
          interface: driveInfo.interface.includes("Thunderbolt")
            ? "Thunderbolt"
            : driveInfo.interface.includes("USB")
            ? "USB-C"
            : "USB",
          location: driveInfo.driveType.location || prev?.location,
          notes:
            prev?.notes ||
            `${driveInfo.driveType.mediaType || "External"} drive\n${
              driveInfo.driveType.isRemovable ? "Removable Media\n" : ""
            }File System: ${driveInfo.fileSystem.type || "Unknown"}\n${
              driveInfo.security.hasHardwareAES
                ? "Hardware encryption supported"
                : ""
            }`,
        }));
      } catch (error) {
        console.error("Error getting drive information:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to get drive information. Please select a valid drive or folder."
        );

        // Set basic information even if drive info fetch fails
        setEditFormData((prev) => ({
          ...prev,
          systemName: path,
          label: prev?.label || path,
        }));
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
      if (error instanceof Error && error.name === "SecurityError") {
        setError(
          "Cannot access system directories. Please select a regular folder or external drive."
        );
      } else {
        setError(
          "Failed to select folder. Please try again or enter information manually."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSystemDriveInfo = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Fetch system drive information directly using the API
      const response = await fetch(`/api/system/drives?path=/`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to get system drive information"
        );
      }

      const driveInfo = await response.json();

      // Update form with system drive information
      setEditFormData((prev) => ({
        ...prev,
        systemName: "Macintosh HD",
        label: prev?.label || "Macintosh HD",
        capacity: {
          total: Math.round(driveInfo.capacity.total),
          used: Math.round(driveInfo.capacity.used),
          available: Math.round(driveInfo.capacity.available),
        },
        type: "SSD",
        interface: "Internal",
        location: "Internal",
        notes:
          prev?.notes ||
          `System Drive (Macintosh HD)\nFile System: ${
            driveInfo.fileSystem.type || "APFS"
          }\n${
            driveInfo.security.hasHardwareAES
              ? "Hardware encryption supported"
              : ""
          }`,
      }));
    } catch (error) {
      console.error("Error getting system drive information:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to get system drive information"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    if (!drive?.systemName) return;

    setIsScanning(true);
    setScanResult(null);
    setError(null);

    try {
      const scanResponse = await fetch("/api/hard-drives/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          drivePath: `/Volumes/${drive.systemName}`,
          driveId: drive._id,
        }),
      });

      if (!scanResponse.ok) {
        const errorData = await scanResponse.json();
        throw new Error(errorData.error || "Failed to scan drive");
      }

      const result = await scanResponse.json();
      setScanResult(result);

      // Refresh drive details
      const refreshResponse = await fetch(`/api/hard-drives/${driveId}`);
      if (!refreshResponse.ok)
        throw new Error("Failed to refresh drive details");
      const refreshedData = await refreshResponse.json();
      setDrive(refreshedData);
    } catch (error) {
      console.error("Error scanning drive:", error);
      setError(error instanceof Error ? error.message : "Failed to scan drive");
    } finally {
      setIsScanning(false);
    }
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
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFormData?.label || ""}
                      onChange={(e) =>
                        setEditFormData((prev) =>
                          prev ? { ...prev, label: e.target.value } : null
                        )
                      }
                      className="text-2xl font-bold bg-transparent border-b border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))] w-full"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold">{drive?.label}</h2>
                  )}
                </div>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleStartEdit}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editFormData?.systemName || ""}
                        onChange={(e) =>
                          setEditFormData((prev) =>
                            prev
                              ? { ...prev, systemName: e.target.value }
                              : null
                          )
                        }
                        placeholder="System Name"
                        className="flex-1 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-2 py-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleFolderSelect}
                        disabled={isLoading}
                        className="h-8 px-2 flex items-center gap-1"
                      >
                        <FolderIcon className="w-4 h-4" />
                        Select Drive
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSystemDriveInfo}
                        disabled={isLoading}
                        className="h-8 px-2 flex items-center gap-1"
                      >
                        <HardDriveIcon className="w-4 h-4" />
                        Get System Drive
                      </Button>
                      {editFormData?.systemName && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleScan}
                          disabled={isScanning}
                          className="h-8 px-2 flex items-center gap-1"
                        >
                          <ScanIcon className="w-4 h-4" />
                          {isScanning ? "Scanning..." : "Scan"}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {drive?.systemName && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        System Name: {drive.systemName}
                      </p>
                    )}
                  </>
                )}
                {scanResult && !isEditing && (
                  <div className="mt-2 p-2 bg-[hsl(var(--secondary))] rounded text-sm">
                    <p>
                      Found {scanResult.matchedAssets} matching raw assets in{" "}
                      {scanResult.scannedFolders} folders
                    </p>
                    {scanResult.addedAssets > 0 && (
                      <p className="text-[hsl(var(--success))]">
                        Added {scanResult.addedAssets} new assets
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editFormData?.status || "Available"}
                        onChange={(e) =>
                          setEditFormData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  status: e.target.value as HardDrive["status"],
                                }
                              : null
                          )
                        }
                        className="px-2 py-1 rounded text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                      >
                        <option value="Available">Available</option>
                        <option value="In Use">In Use</option>
                        <option value="Archived">Archived</option>
                        <option value="Offline">Offline</option>
                      </select>
                      <select
                        value={editFormData?.type || "HDD"}
                        onChange={(e) =>
                          setEditFormData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  type: e.target.value as HardDrive["type"],
                                }
                              : null
                          )
                        }
                        className="px-2 py-1 rounded text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                      >
                        <option value="HDD">HDD</option>
                        <option value="SSD">SSD</option>
                        <option value="NVMe">NVMe</option>
                      </select>
                      <select
                        value={editFormData?.interface || "USB"}
                        onChange={(e) =>
                          setEditFormData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  interface: e.target
                                    .value as HardDrive["interface"],
                                }
                              : null
                          )
                        }
                        className="px-2 py-1 rounded text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                      >
                        <option value="USB">USB</option>
                        <option value="Thunderbolt">Thunderbolt</option>
                        <option value="USB-C">USB-C</option>
                        <option value="Internal">Internal</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(drive.status)} text-white`}
                      >
                        {drive.status}
                      </Badge>
                      <Badge variant="secondary">{drive.type}</Badge>
                      <Badge variant="secondary">{drive.interface}</Badge>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="bg-[hsl(var(--secondary))] p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Storage</h3>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-sm text-[hsl(var(--muted-foreground))]">
                            Total (GB)
                          </label>
                          <input
                            type="number"
                            value={editFormData?.capacity?.total || 0}
                            onChange={(e) =>
                              setEditFormData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      capacity: {
                                        total: Number(e.target.value),
                                        used: prev.capacity?.used || 0,
                                        available:
                                          prev.capacity?.available || 0,
                                      },
                                    }
                                  : null
                              )
                            }
                            className="w-full px-2 py-1 mt-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-[hsl(var(--muted-foreground))]">
                            Used (GB)
                          </label>
                          <input
                            type="number"
                            value={editFormData?.capacity?.used || 0}
                            onChange={(e) =>
                              setEditFormData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      capacity: {
                                        total: prev.capacity?.total || 0,
                                        used: Number(e.target.value),
                                        available:
                                          prev.capacity?.available || 0,
                                      },
                                    }
                                  : null
                              )
                            }
                            className="w-full px-2 py-1 mt-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-[hsl(var(--muted-foreground))]">
                            Available (GB)
                          </label>
                          <input
                            type="number"
                            value={editFormData?.capacity?.available || 0}
                            onChange={(e) =>
                              setEditFormData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      capacity: {
                                        total: prev.capacity?.total || 0,
                                        used: prev.capacity?.used || 0,
                                        available: Number(e.target.value),
                                      },
                                    }
                                  : null
                              )
                            }
                            className="w-full px-2 py-1 mt-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {formatCapacity(drive.capacity)}
                      </p>
                    )}
                  </div>

                  <div className="bg-[hsl(var(--secondary))] p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Location</h3>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData?.location || ""}
                        onChange={(e) =>
                          setEditFormData((prev) =>
                            prev ? { ...prev, location: e.target.value } : null
                          )
                        }
                        className="w-full px-2 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded"
                      />
                    ) : (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {drive.location || "No location specified"}
                      </p>
                    )}
                  </div>

                  <div className="bg-[hsl(var(--secondary))] p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Notes</h3>
                    {isEditing ? (
                      <textarea
                        value={editFormData?.notes || ""}
                        onChange={(e) =>
                          setEditFormData((prev) =>
                            prev ? { ...prev, notes: e.target.value } : null
                          )
                        }
                        rows={3}
                        className="w-full px-2 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded"
                      />
                    ) : (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-line">
                        {drive.notes || "No notes"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Raw Assets */}
            <div className="flex flex-col">
              <h3 className="text-lg font-medium mb-4">Raw Assets</h3>
              <ScrollArea className="flex-1 max-h-[calc(100vh-24rem)] pr-4">
                <div className="space-y-4">
                  {drive?.rawAssetDetails.map((asset) => (
                    <div
                      key={asset._id}
                      className="block w-full text-left border border-[hsl(var(--border))] rounded-lg p-3 hover:bg-[hsl(var(--accent))] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleAssetClick(asset)}
                          className="flex items-center flex-1"
                        >
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
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAsset(asset._id);
                          }}
                          className="ml-2 p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end mt-6 gap-2">
            {isEditing ? (
              <>
                {error && (
                  <p className="text-[hsl(var(--destructive))] text-sm mr-auto">
                    {error}
                  </p>
                )}
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            )}
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
