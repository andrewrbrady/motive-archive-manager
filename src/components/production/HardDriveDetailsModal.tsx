import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePathname, useSearchParams } from "next/navigation";
import {
  HardDriveIcon,
  PencilIcon,
  FolderIcon,
  ScanIcon,
  MapPin,
  RefreshCcw,
  Edit,
  X,
  Save,
  Trash2,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import RawAssetDetailsModal from "./RawAssetDetailsModal";
import { RawAssetData } from "@/models/raw_assets";
import Link from "next/link";
import { LocationResponse } from "@/models/location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UrlModal } from "@/components/ui/url-modal";
import { useUrlParams } from "@/hooks/useUrlParams";
import { LoadingSpinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

interface HardDriveDetailsModalProps {
  driveId: string | null;
  onClose: () => void;
  onDriveUpdate?: () => void;
}

interface RawAsset {
  _id: string;
  date: string;
  description: string;
  hardDriveIds: string[];
  cars?: Array<{
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
  locationId?: string;
  locationDetails?: {
    _id: string;
    name: string;
    type: string;
  };
  notes?: string;
  rawAssets?: string[];
  rawAssetDetails: RawAsset[];
}

export default function HardDriveDetailsModal({
  driveId,
  onClose,
  onDriveUpdate,
}: HardDriveDetailsModalProps) {
  // [REMOVED] // [REMOVED] console.log("HardDriveDetailsModal rendered with driveId:", driveId);

  const [drive, setDrive] = useState<HardDrive | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<RawAssetData | null>(null);
  const [driveLabels, setDriveLabels] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<HardDrive> | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const { getParam, updateParams } = useUrlParams();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    matchedAssets: number;
    scannedFolders: number;
    addedAssets: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(0);
  const [dataChanged, setDataChanged] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check URL parameters on mount and when they change
  useEffect(() => {
    const driveParam = getParam("drive");
    // [REMOVED] // [REMOVED] console.log("HardDriveDetailsModal - URL drive parameter:", driveParam);

    if (driveParam) {
      // [REMOVED] // [REMOVED] console.log("HardDriveDetailsModal - Setting isModalOpen to true");
      setIsModalOpen(true);
    } else {
      // [REMOVED] // [REMOVED] console.log("HardDriveDetailsModal - Setting isModalOpen to false");
      setIsModalOpen(false);
    }
  }, [getParam]);

  // Log when isModalOpen changes
  useEffect(() => {
    // [REMOVED] // [REMOVED] console.log("HardDriveDetailsModal - isModalOpen changed to:", isModalOpen);
  }, [isModalOpen]);

  // Handle opening raw asset details
  const handleAssetClick = (asset: RawAsset) => {
    // [REMOVED] // [REMOVED] console.log("Navigating to raw asset:", asset._id);

    // First close the current modal to prevent any state conflicts
    if (onClose) {
      onClose();
    }

    // Then update the URL directly for immediate effect
    const url = new URL(window.location.href);

    // Set only the parameters we want - keep the tab and asset ID
    url.searchParams.set("tab", "raw-assets");
    url.searchParams.set("asset", asset._id.toString());

    // Preserve template if it exists
    const template = getParam("template");
    if (template) {
      url.searchParams.set("template", template);
    }

    // Preserve other important parameters except drive
    ["page", "limit", "search", "location", "view"].forEach((param) => {
      const value = getParam(param);
      if (value && param !== "drive") {
        url.searchParams.set(param, value);
      }
    });

    // [REMOVED] // [REMOVED] console.log("Setting URL directly to:", url.toString());
    window.history.pushState({}, "", url.toString());

    // Finally update the Next.js router state to keep it in sync
    setTimeout(() => {
      // [REMOVED] // [REMOVED] console.log("Updating Next.js router for raw asset:", asset._id);
      updateParams(
        {
          tab: "raw-assets",
          asset: asset._id.toString(),
          drive: null, // Explicitly remove the drive parameter
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
          clearOthers: false, // Keep existing parameters to maintain context
        }
      );
      // [REMOVED] // [REMOVED] console.log("Next.js router update completed for raw asset");
    }, 100); // Reduced timeout for faster response
  };

  // Handle closing raw asset details
  const handleAssetClose = () => {
    setSelectedAsset(null);
    // Remove asset ID from URL but keep other parameters
    updateParams({ asset: null });
  };

  // Handle modal close with URL parameter management
  const handleModalClose = () => {
    // Update URL parameters to remove the drive parameter
    updateParams(
      { drive: null },
      { preserveParams: ["tab", "page", "limit", "search", "location", "view"] }
    );

    if (onClose) {
      onClose();
    }
  };

  // Fetch drive labels for the selected asset
  const fetchDriveLabels = async (hardDriveIds: string[]) => {
    try {
      setIsLoadingLabels(true);
      const response = await fetch(
        `/api/hard-drives?ids=${hardDriveIds.join(",")}`
      );
      if (!response.ok) throw new Error("Failed to fetch drive labels");
      const data = await response.json();

      const labels: Record<string, string> = {};
      (data.drives || data.data || []).forEach((drive: any) => {
        labels[drive._id] = drive.label;
      });

      setDriveLabels(labels);
    } catch (error) {
      console.error("Error fetching drive labels:", error);
    } finally {
      setIsLoadingLabels(false);
    }
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

      // Mark data as changed
      setDataChanged(true);

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

  // Handle starting edit mode
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditFormData({ ...drive });
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData(null);
  };

  // Handle saving edit changes
  const handleSaveEdit = async () => {
    // Implementation of save functionality
    // [REMOVED] // [REMOVED] console.log("Saving changes:", editFormData);
  };

  // Handle scanning for assets
  const handleScan = async () => {
    // Implementation of scan functionality
    // [REMOVED] // [REMOVED] console.log("Scanning for assets");
  };

  // Get status color based on drive status
  const getStatusColor = (status: HardDrive["status"]) => {
    switch (status) {
      case "Available":
        return "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]";
      case "In Use":
        return "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]";
      case "Archived":
        return "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]";
      case "Offline":
        return "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]";
      default:
        return "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]";
    }
  };

  // Add a function to fetch locations
  const fetchLocations = async () => {
    try {
      setIsLoadingLocations(true);
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Fetch locations when the component mounts or when editing starts
  useEffect(() => {
    fetchLocations();
  }, []);

  // Reset dataChanged when driveId changes
  useEffect(() => {
    setDataChanged(false);
  }, [driveId]);

  // Fetch drive details when driveId changes
  useEffect(() => {
    // [REMOVED] // [REMOVED] console.log("useEffect triggered with driveId:", driveId);

    // Get the current drive parameter from URL
    const urlDriveParam = getParam("drive");
    console.log(
      "URL drive parameter in fetchDriveDetails effect:",
      urlDriveParam
    );

    // Use either the driveId prop or the URL parameter
    const effectiveDriveId = driveId || urlDriveParam;

    if (effectiveDriveId) {
      console.log(
        "Calling fetchDriveDetails for effectiveDriveId:",
        effectiveDriveId
      );

      // Only fetch if we don't already have this drive's data
      if (!drive || drive._id !== effectiveDriveId) {
        fetchDriveDetails();
      } else {
        // [REMOVED] // [REMOVED] console.log("Already have data for drive:", effectiveDriveId);
      }
    } else {
      // [REMOVED] // [REMOVED] console.log("No drive ID available, resetting drive state");
      setDrive(null);
    }
  }, [driveId, shouldRefetch, getParam, drive]);

  // Add a useEffect to log when the component renders
  useEffect(() => {
    console.log(
      "Inside UrlModal render - driveId:",
      driveId,
      "isOpen determined by UrlModal"
    );
  }, [driveId]);

  const formatCapacity = (capacity: HardDrive["capacity"]) => {
    const total = `${capacity.total} GB`;
    if (capacity.used !== undefined && capacity.available !== undefined) {
      return `${total} (${capacity.used} GB used, ${capacity.available} GB available)`;
    }
    return total;
  };

  // Fetch drive details
  const fetchDriveDetails = async () => {
    // Get the current drive parameter from URL
    const urlDriveParam = getParam("drive");
    // Use either the driveId prop or the URL parameter
    const effectiveDriveId = driveId || urlDriveParam;

    if (!effectiveDriveId) {
      // Reset state when no drive ID is available
      setDrive(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      // [REMOVED] // [REMOVED] console.log("fetchDriveDetails started for driveId:", effectiveDriveId);
      setError(null);
      setIsLoading(true);

      const response = await fetch(`/api/hard-drives/${effectiveDriveId}`);
      // [REMOVED] // [REMOVED] console.log("API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch drive details");
      }

      const data = await response.json();
      // [REMOVED] // [REMOVED] console.log("Drive data received:", data);

      // Validate that the data has the expected structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid drive data received");
      }

      // Ensure rawAssetDetails is always an array, even if it's null or undefined
      if (!data.rawAssetDetails) {
        data.rawAssetDetails = [];
      }

      setDrive(data);
      // [REMOVED] // [REMOVED] console.log("Drive state set:", data);
    } catch (error) {
      console.error("Error fetching drive details:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch drive details"
      );
    } finally {
      setIsLoading(false);
      // [REMOVED] // [REMOVED] console.log("fetchDriveDetails completed, isLoading set to false");
    }
  };

  console.log(
    "HardDriveDetailsModal rendering with drive:",
    drive,
    "and isLoading:",
    isLoading,
    "isModalOpen:",
    isModalOpen
  );

  // Get the current drive parameter directly from the URL
  const currentDriveParam = getParam("drive");
  // [REMOVED] // [REMOVED] console.log("Current drive parameter from URL:", currentDriveParam);

  // Check if the modal should be visible based on the URL parameter or the driveId prop
  const shouldBeVisible = !!currentDriveParam || !!driveId;
  console.log(
    "Modal should be visible:",
    shouldBeVisible,
    "driveId:",
    driveId,
    "currentDriveParam:",
    currentDriveParam
  );

  // If neither the drive parameter is in the URL nor the driveId prop is provided, don't render the modal
  if (!shouldBeVisible) {
    console.log(
      "Not rendering modal because drive parameter is not in URL and driveId prop is not provided"
    );
    return null;
  }

  // Use the driveId prop if available, otherwise use the URL parameter
  const effectiveDriveId = driveId || currentDriveParam;
  // [REMOVED] // [REMOVED] console.log("Using effective driveId:", effectiveDriveId);

  return (
    <UrlModal
      paramName="drive"
      paramValue={effectiveDriveId || undefined}
      onClose={handleModalClose}
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
      <div className="space-y-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
            {drive?.label || "Hard Drive Details"}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 text-center">{error}</div>
        ) : drive ? (
          <div className="space-y-6">
            {/* Drive header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <HardDriveIcon className="w-6 h-6 text-[hsl(var(--foreground-muted))]" />
                <div>
                  <h2 className="text-xl font-semibold">{drive.label}</h2>
                  {drive.systemName && (
                    <p className="text-[hsl(var(--muted-foreground))]">
                      System: {drive.systemName}
                    </p>
                  )}
                </div>
                <Badge className={`ml-2 ${getStatusColor(drive.status)}`}>
                  {drive.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartEdit}
                      className="flex items-center gap-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleScan}
                      disabled={isScanning}
                      className="flex items-center gap-1"
                    >
                      <ScanIcon className="w-4 h-4" />
                      {isScanning ? "Scanning..." : "Scan for Assets"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Left Column - Drive Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-6">
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
                          onClick={handleScan}
                          disabled={isLoading}
                          className="h-8 px-2 flex items-center gap-1"
                        >
                          <FolderIcon className="w-4 h-4" />
                          Select Drive
                        </Button>
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
                                    status: e.target
                                      .value as HardDrive["status"],
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
                          className={`${getStatusColor(
                            drive.status
                          )} text-white`}
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
                        <Select
                          value={editFormData?.locationId || "none"}
                          onValueChange={(value) =>
                            setEditFormData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    locationId: value === "none" ? "" : value,
                                  }
                                : null
                            )
                          }
                          disabled={isLoadingLocations}
                        >
                          <SelectTrigger className="w-full bg-[hsl(var(--background))]">
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3" />
                                  {location.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {drive.locationDetails ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {drive.locationDetails.name}
                            </span>
                          ) : (
                            "No location specified"
                          )}
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
                <div className="p-3 border border-[hsl(var(--border))] rounded-md">
                  {drive.rawAssetDetails && drive.rawAssetDetails.length > 0 ? (
                    <ScrollArea className="max-h-40 pr-3">
                      <div className="space-y-2">
                        {drive.rawAssetDetails.map((asset) => (
                          <div
                            key={asset._id}
                            className="flex items-center justify-between p-2 bg-[hsl(var(--background-secondary))] rounded-md hover:bg-[hsl(var(--background-secondary))]/80 cursor-pointer transition-colors"
                            onClick={() => handleAssetClick(asset)}
                          >
                            <div className="flex items-center">
                              <FolderIcon className="w-4 h-4 mr-2 text-[hsl(var(--muted-foreground))]" />
                              <div>
                                <span className="text-sm">{asset.date}</span>
                                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                  {asset.description}
                                </p>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-[hsl(var(--muted-foreground))] text-sm">
                      No raw assets stored on this drive
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">No drive data found</div>
        )}
      </div>

      {selectedAsset && (
        <RawAssetDetailsModal
          asset={selectedAsset}
          driveLabels={driveLabels}
          onClose={handleAssetClose}
        />
      )}
    </UrlModal>
  );
}
