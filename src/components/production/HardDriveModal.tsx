import React, { useState, useEffect, useRef } from "react";
import { HardDriveData } from "@/models/hard-drive";
import { FolderIcon, ScanIcon, MapPin } from "lucide-react";
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
    if (drive) {
      setFormData({
        ...drive,
        _id: undefined, // Don't include _id in form data
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
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

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
        rawAssets: formData.rawAssets || [],
      };

      await onSave(cleanedFormData);
      onClose();
    } catch (error) {
      console.error("Error saving hard drive:", error);
      setError("Failed to save hard drive");
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
    try {
      setIsLoading(true);
      const response = await fetch("/api/system/drives?path=/");
      if (!response.ok) {
        throw new Error("Failed to fetch system drive info");
      }
      const driveInfo = await response.json();

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
    try {
      setIsScanning(true);
      setError(null);

      // Simulate scanning for demo purposes
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update form data with scan results
      setFormData((prev) => ({
        ...prev,
        type: "SSD",
        interface: "Internal",
        locationId: prev.locationId, // Keep existing locationId
        notes:
          prev.notes ||
          `Scan completed on ${new Date().toLocaleString()}. Found 3 matching assets.`,
      }));

      setScanResult({
        matchedAssets: 3,
        scannedFolders: 12,
      });
    } catch (error) {
      console.error("Error scanning drive:", error);
      setError("Failed to scan drive");
    } finally {
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <UrlModal
      paramName="createDrive"
      paramValue="true"
      onClose={onClose}
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
            value={formData.label}
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
              value={formData.systemName}
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleScan}
              disabled={isScanning || !formData.systemName}
              className="flex items-center gap-2"
            >
              <ScanIcon className="w-4 h-4" />
              {isScanning ? "Scanning..." : "Scan"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type*</label>
            <select
              value={formData.type}
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
              value={formData.interface}
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
              value={formData.status}
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
                value={formData.locationId || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, locationId: value })
                }
                disabled={isLoadingLocations}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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
            <p className="text-sm">
              Scanned {scanResult.scannedFolders} folders and found{" "}
              {scanResult.matchedAssets} potential raw assets.
            </p>
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
