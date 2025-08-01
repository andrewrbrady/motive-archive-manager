import React, { useState, useEffect, useRef } from "react";
import { HardDriveData } from "@/models/hard-drive";
import { FolderIcon, ScanIcon, MapPin, InfoIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationResponse } from "@/models/location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UrlModal } from "@/components/ui/url-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAPI } from "@/hooks/useAPI";

interface HardDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (drive: Partial<HardDriveData>) => Promise<void>;
  drive?: HardDriveData;
}

interface ExtendedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  webkitdirectory?: string | boolean;
  directory?: string;
}

export default function HardDriveModal({
  isOpen,
  onClose,
  onSave,
  drive,
}: HardDriveModalProps) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("HardDriveModal rendering with isOpen:", isOpen, "drive:", drive);

  const api = useAPI();

  // Add a local state to track if we should render directly without relying on URL params
  const [forceRender, setForceRender] = useState(false);

  // If the parent says the modal should be open, but we don't see it, force render
  useEffect(() => {
    if (isOpen && !forceRender) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Setting forceRender to true because isOpen is true");
      setForceRender(true);
    } else if (!isOpen && forceRender) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Setting forceRender to false because isOpen is false");
      setForceRender(false);
    }
  }, [isOpen, forceRender]);

  const [formData, setFormData] = useState<Partial<HardDriveData>>({
    label: "",
    systemName: "",
    capacity: {
      total: 0,
      used: 0,
      available: 0,
    },
    type: "HDD",
    interface: "USB",
    status: "Available",
    locationId: "",
    notes: "",
    rawAssets: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    matchedAssets: number;
    scannedFolders: number;
  } | null>(null);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log(
      "HardDriveModal useEffect with drive:",
      drive,
      "isOpen:",
      isOpen
    );
    if (drive) {
      setFormData({
        ...drive,
        _id: undefined, // Don't include _id in form data
        label: drive.label || "",
        systemName: drive.systemName || "",
        type: drive.type || "HDD",
        interface: drive.interface || "USB",
        status: drive.status || "Available",
        locationId: drive.locationId || "",
        notes: drive.notes || "",
        capacity: drive.capacity || { total: 0, used: 0, available: 0 },
        rawAssets: drive.rawAssets || [],
      });
    } else {
      // Reset form when adding new drive
      setFormData({
        label: "",
        systemName: "",
        capacity: {
          total: 0,
          used: 0,
          available: 0,
        },
        type: "HDD",
        interface: "USB",
        status: "Available",
        locationId: "",
        notes: "",
        rawAssets: [],
      });
      setScanResult(null);
      setError(null);
    }
  }, [drive, isOpen]);

  // Fetch locations when the modal opens
  useEffect(() => {
    if (isOpen && api) {
      fetchLocations();
    }
  }, [isOpen, api]);

  const fetchLocations = async () => {
    if (!api) {
      console.error("API client not available");
      return;
    }

    try {
      setIsLoadingLocations(true);
      const data = (await api.get("locations")) as LocationResponse[];
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Create a cleaned version of the form data without modifying nested objects
      const cleanedFormData = {
        ...formData,
        // Ensure these fields are always included
        label: formData.label,
        capacity: formData.capacity,
        type: formData.type,
        interface: formData.interface,
        status: formData.status || "Available",
        locationId: formData.locationId === "none" ? "" : formData.locationId,
        rawAssets: formData.rawAssets || [],
        // Add description field that API expects
        description:
          formData.notes || `${formData.type} ${formData.interface} Drive`,
      };

      await onSave(cleanedFormData);
      onClose();
    } catch (error) {
      console.error("Error saving hard drive:", error);
      setError(
        error instanceof Error ? error.message : "Failed to save hard drive"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCapacity = (
    field: "total" | "used" | "available",
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      capacity: {
        total: field === "total" ? value : prev.capacity?.total || 0,
        used: field === "used" ? value : prev.capacity?.used || 0,
        available:
          field === "available" ? value : prev.capacity?.available || 0,
      },
    }));
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

        if (!api) {
          throw new Error("API client not available");
        }

        // Fetch drive information from our API
        const driveInfo = (await api.get(
          `system/drives?path=/Volumes/${encodeURIComponent(path)}`
        )) as any;

        // Update form with drive information
        setFormData((prev) => ({
          ...prev,
          systemName: driveInfo.systemName,
          label: prev.label || driveInfo.systemName,
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
          locationId: driveInfo.driveType.location || prev.locationId,
          notes:
            prev.notes ||
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
        setFormData((prev) => ({
          ...prev,
          systemName: path,
          label: prev.label || path,
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
    if (!api) {
      setError("API client not available");
      return;
    }

    try {
      setIsLoading(true);
      const driveInfo = (await api.get("system/drives?path=/")) as any;

      // Generate a unique label with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, "")
        .substring(0, 12);
      const uniqueLabel = `${driveInfo.systemName} (${timestamp})`;

      setFormData((prev) => ({
        ...prev,
        systemName: driveInfo.systemName,
        label: uniqueLabel,
        capacity: {
          total: Math.round(driveInfo.capacity.total),
          used: Math.round(driveInfo.capacity.used),
          available: Math.round(driveInfo.capacity.available),
        },
        type: "SSD",
        interface: "Internal",
        locationId: prev.locationId, // Keep existing locationId
        notes:
          prev.notes ||
          `System Drive (${driveInfo.systemName})\nFile System: ${
            driveInfo.fileSystem.type || "APFS"
          }\n${
            driveInfo.security.hasHardwareAES
              ? "Hardware encryption supported"
              : ""
          }`,
      }));
    } catch (error) {
      console.error("Error fetching system drive info:", error);
      setError("Failed to fetch system drive info");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    if (!api) {
      setError("API client not available");
      return;
    }

    try {
      if (!formData.systemName) {
        setError("Please select or enter a system path first");
        return;
      }

      setIsScanning(true);
      setError(null);
      setScanResult(null);

      // Fetch directory listing from the drive
      const { directories } = (await api.get(
        `system/directory?path=${encodeURIComponent(formData.systemName)}`
      )) as { directories: { name: string }[] };

      // Filter for directories that match YYMMDD format
      const dateRegex = /^(\d{6})$/; // Match YYMMDD format
      const dateDirectories = directories.filter((dir: { name: string }) =>
        dateRegex.test(dir.name)
      );

      if (dateDirectories.length === 0) {
        setScanResult({
          matchedAssets: 0,
          scannedFolders: directories.length,
        });
        setFormData((prev) => ({
          ...prev,
          notes:
            prev.notes ||
            `Scan completed on ${new Date().toLocaleString()}. No date-formatted directories found.`,
        }));
        return;
      }

      // Extract dates from directory names to search for matching raw assets
      const datesToSearch = dateDirectories.map(
        (dir: { name: string }) => dir.name
      );

      // Search for raw assets with matching dates
      const { matchedAssets, associatedAssets, newlyAssociated } =
        (await api.post("raw/search-by-dates", {
          dates: datesToSearch,
          driveId: formData._id,
        })) as {
          matchedAssets: any[];
          associatedAssets: any[];
          newlyAssociated: number;
        };

      // Update the form with scan results
      setFormData((prev) => ({
        ...prev,
        rawAssets: [
          ...(prev.rawAssets || []),
          ...matchedAssets.map((asset: any) => asset._id),
        ],
        notes:
          prev.notes ||
          `Scan completed on ${new Date().toLocaleString()}.\nFound ${
            matchedAssets.length
          } matching assets in ${dateDirectories.length} date directories.\n${
            newlyAssociated > 0
              ? `${newlyAssociated} new associations created.`
              : "All assets were already associated."
          }`,
      }));

      setScanResult({
        matchedAssets: matchedAssets.length,
        scannedFolders: dateDirectories.length,
      });
    } catch (error) {
      console.error("Error scanning drive:", error);
      setError(error instanceof Error ? error.message : "Failed to scan drive");
    } finally {
      setIsScanning(false);
    }
  };

  console.log(
    "HardDriveModal will render with drive:",
    drive,
    "isOpen:",
    isOpen,
    "forceRender:",
    forceRender
  );

  // If we're using forced rendering, render directly without the UrlModal wrapper
  if (forceRender) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("HardDriveModal using direct rendering due to forceRender");
    return (
      <div className="fixed inset-0 bg-[hsl(var(--background))]/95 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
        <div className="bg-[hsl(var(--background))] p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 border border-[hsl(var(--border))] relative">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
              {drive ? "Edit Hard Drive" : "Add New Hard Drive"}
            </h2>
            <button
              onClick={() => {
                // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Direct modal close button clicked");
                onClose();
              }}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] ml-auto"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[hsl(var(--destructive))/10] border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Label*</label>
              <input
                type="text"
                value={formData.label || ""}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                required
                className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                System Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.systemName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, systemName: e.target.value })
                  }
                  className="flex-1 px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleFolderSelect}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <FolderIcon className="w-4 h-4" />
                  {isLoading ? "Loading..." : "Select Drive"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSystemDriveInfo}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? "Loading..." : "Get System Drive"}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleScan}
                        disabled={isScanning || !formData.systemName}
                        className="flex items-center gap-2"
                      >
                        <ScanIcon className="w-4 h-4" />
                        {isScanning ? "Scanning..." : "Scan YYMMDD Dirs"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Scans for directories in YYMMDD format and associates
                        matching raw assets with this drive.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type*</label>
                <select
                  value={formData.type || "HDD"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "HDD" | "SSD" | "NVMe",
                    })
                  }
                  required
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                >
                  <option value="HDD">HDD</option>
                  <option value="SSD">SSD</option>
                  <option value="NVMe">NVMe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Interface*
                </label>
                <select
                  value={formData.interface || "USB"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interface: e.target.value as
                        | "USB"
                        | "Thunderbolt"
                        | "USB-C"
                        | "Internal",
                    })
                  }
                  required
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                >
                  <option value="USB">USB</option>
                  <option value="USB-C">USB-C</option>
                  <option value="Thunderbolt">Thunderbolt</option>
                  <option value="Internal">Internal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Status*
                </label>
                <select
                  value={formData.status || "Available"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as
                        | "Available"
                        | "In Use"
                        | "Archived"
                        | "Offline",
                    })
                  }
                  required
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                >
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Archived">Archived</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Location
                </label>
                <div className="flex gap-2 items-center">
                  <Select
                    value={formData.locationId || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        locationId: value === "none" ? "" : value,
                      })
                    }
                    disabled={isLoadingLocations}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Total Capacity (GB)*
                </label>
                <input
                  type="number"
                  value={formData.capacity?.total || 0}
                  onChange={(e) =>
                    updateCapacity("total", Number(e.target.value))
                  }
                  required
                  min="0"
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Used Space (GB)
                </label>
                <input
                  type="number"
                  value={formData.capacity?.used || 0}
                  onChange={(e) =>
                    updateCapacity("used", Number(e.target.value))
                  }
                  min="0"
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Available Space (GB)
                </label>
                <input
                  type="number"
                  value={formData.capacity?.available || 0}
                  onChange={(e) =>
                    updateCapacity("available", Number(e.target.value))
                  }
                  min="0"
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
              ></textarea>
            </div>

            {scanResult && (
              <div className="p-3 bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))] rounded">
                <h3 className="font-medium mb-1">Scan Results</h3>
                <p className="text-sm mb-2">
                  Scanned {scanResult.scannedFolders} folders and found{" "}
                  {scanResult.matchedAssets} matching raw assets.
                </p>
                {scanResult.matchedAssets > 0 ? (
                  <div className="text-sm text-[hsl(var(--success))]">
                    Successfully matched and associated raw assets with this
                    drive.
                  </div>
                ) : scanResult.scannedFolders > 0 ? (
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    Found directories but no matching assets in the database.
                  </div>
                ) : (
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    No date-formatted directories (YYMMDD) found.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? drive
                    ? "Saving..."
                    : "Adding..."
                  : drive
                    ? "Save Changes"
                    : "Add Hard Drive"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Default to using UrlModal
  return (
    <UrlModal
      paramName={drive ? "editDrive" : "createDrive"}
      paramValue={drive ? drive._id?.toString() : "true"}
      onClose={() => {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("UrlModal onClose triggered");
        onClose();
      }}
      title={drive ? "Edit Hard Drive" : "Add New Hard Drive"}
      preserveParams={["tab", "page", "limit", "search", "location", "view"]}
    >
      {error && (
        <div className="mb-4 p-3 bg-[hsl(var(--destructive))/10] border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Label*</label>
          <input
            type="text"
            value={formData.label || ""}
            onChange={(e) =>
              setFormData({ ...formData, label: e.target.value })
            }
            required
            className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">System Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.systemName || ""}
              onChange={(e) =>
                setFormData({ ...formData, systemName: e.target.value })
              }
              className="flex-1 px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleFolderSelect}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <FolderIcon className="w-4 h-4" />
              {isLoading ? "Loading..." : "Select Drive"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSystemDriveInfo}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? "Loading..." : "Get System Drive"}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleScan}
                    disabled={isScanning || !formData.systemName}
                    className="flex items-center gap-2"
                  >
                    <ScanIcon className="w-4 h-4" />
                    {isScanning ? "Scanning..." : "Scan YYMMDD Dirs"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Scans for directories in YYMMDD format and associates
                    matching raw assets with this drive.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type*</label>
            <select
              value={formData.type || "HDD"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as "HDD" | "SSD" | "NVMe",
                })
              }
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            >
              <option value="HDD">HDD</option>
              <option value="SSD">SSD</option>
              <option value="NVMe">NVMe</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Interface*</label>
            <select
              value={formData.interface || "USB"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  interface: e.target.value as
                    | "USB"
                    | "Thunderbolt"
                    | "USB-C"
                    | "Internal",
                })
              }
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            >
              <option value="USB">USB</option>
              <option value="USB-C">USB-C</option>
              <option value="Thunderbolt">Thunderbolt</option>
              <option value="Internal">Internal</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status*</label>
            <select
              value={formData.status || "Available"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as
                    | "Available"
                    | "In Use"
                    | "Archived"
                    | "Offline",
                })
              }
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            >
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Archived">Archived</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <div className="flex gap-2 items-center">
              <Select
                value={formData.locationId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    locationId: value === "none" ? "" : value,
                  })
                }
                disabled={isLoadingLocations}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Total Capacity (GB)*
            </label>
            <input
              type="number"
              value={formData.capacity?.total || 0}
              onChange={(e) => updateCapacity("total", Number(e.target.value))}
              required
              min="0"
              className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Used Space (GB)
            </label>
            <input
              type="number"
              value={formData.capacity?.used || 0}
              onChange={(e) => updateCapacity("used", Number(e.target.value))}
              min="0"
              className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Available Space (GB)
            </label>
            <input
              type="number"
              value={formData.capacity?.available || 0}
              onChange={(e) =>
                updateCapacity("available", Number(e.target.value))
              }
              min="0"
              className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes || ""}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={4}
            className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
          ></textarea>
        </div>

        {scanResult && (
          <div className="p-3 bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))] rounded">
            <h3 className="font-medium mb-1">Scan Results</h3>
            <p className="text-sm mb-2">
              Scanned {scanResult.scannedFolders} folders and found{" "}
              {scanResult.matchedAssets} matching raw assets.
            </p>
            {scanResult.matchedAssets > 0 ? (
              <div className="text-sm text-[hsl(var(--success))]">
                Successfully matched and associated raw assets with this drive.
              </div>
            ) : scanResult.scannedFolders > 0 ? (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Found directories but no matching assets in the database.
              </div>
            ) : (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                No date-formatted directories (YYMMDD) found.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? drive
                ? "Saving..."
                : "Adding..."
              : drive
                ? "Save Changes"
                : "Add Hard Drive"}
          </Button>
        </div>
      </form>
    </UrlModal>
  );
}
