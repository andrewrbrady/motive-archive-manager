import React, { useState, useEffect, useRef } from "react";
import { HardDriveData } from "@/models/hard-drive";
import { FolderIcon } from "lucide-react";

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
    location: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        location: "",
        notes: "",
      });
    }
  }, [drive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(formData);
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
          location: driveInfo.driveType.location || prev.location,
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
      setFormData((prev) => ({
        ...prev,
        systemName: "Macintosh HD",
        label: prev.label || "Macintosh HD",
        capacity: {
          total: Math.round(driveInfo.capacity.total),
          used: Math.round(driveInfo.capacity.used),
          available: Math.round(driveInfo.capacity.available),
        },
        type: "SSD",
        interface: "Internal",
        location: "Internal",
        notes:
          prev.notes ||
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--background))/80] flex items-center justify-center z-50">
      <div className="bg-[hsl(var(--background))] p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-[hsl(var(--border))]">
        <h2 className="text-xl font-semibold mb-4 text-[hsl(var(--foreground))]">
          {drive ? "Edit Hard Drive" : "Add New Hard Drive"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-[hsl(var(--destructive))/10] border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Label*
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              System Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.systemName}
                onChange={(e) =>
                  setFormData({ ...formData, systemName: e.target.value })
                }
                className="flex-1 px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
              />
              <button
                type="button"
                onClick={handleFolderSelect}
                disabled={isLoading}
                className="px-3 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded hover:bg-[hsl(var(--secondary))/90] disabled:opacity-50 flex items-center gap-2"
              >
                <FolderIcon className="w-4 h-4" />
                {isLoading ? "Loading..." : "Select Drive"}
              </button>
              <button
                type="button"
                onClick={handleSystemDriveInfo}
                disabled={isLoading}
                className="px-3 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded hover:bg-[hsl(var(--secondary))/90] disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? "Loading..." : "Get System Drive"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Type*
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "HDD" | "SSD" | "NVMe",
                  })
                }
                required
                className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
              >
                <option value="HDD">HDD</option>
                <option value="SSD">SSD</option>
                <option value="NVMe">NVMe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Interface*
              </label>
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
                className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
              >
                <option value="USB">USB</option>
                <option value="Thunderbolt">Thunderbolt</option>
                <option value="USB-C">USB-C</option>
                <option value="Internal">Internal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
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
                className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Used Space (GB)
              </label>
              <input
                type="number"
                value={formData.capacity?.used || 0}
                onChange={(e) => updateCapacity("used", Number(e.target.value))}
                min="0"
                className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Available Space (GB)
              </label>
              <input
                type="number"
                value={formData.capacity?.available || 0}
                onChange={(e) =>
                  updateCapacity("available", Number(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Status*
            </label>
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
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            >
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Archived">Archived</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded hover:bg-[hsl(var(--secondary))/90]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded hover:bg-[hsl(var(--primary))/90] disabled:opacity-50"
            >
              {isSubmitting
                ? drive
                  ? "Saving..."
                  : "Adding..."
                : drive
                ? "Save Changes"
                : "Add Hard Drive"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
