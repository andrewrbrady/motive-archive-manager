"use client";

import React, { useState, useEffect } from "react";
import { XIcon, HardDriveIcon, Search } from "lucide-react";
import { RawAssetData } from "@/models/raw";
import { HardDriveData } from "@/models/hard-drive";
import CarSelector from "@/components/CarSelector";
import { ObjectId } from "@/lib/types";

interface EditRawAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Partial<RawAssetData>) => Promise<void>;
  asset?: RawAssetData;
}

// Ensure HardDriveData has required _id as string for UI
interface HardDriveWithId extends Omit<HardDriveData, "_id"> {
  _id: string;
}

export default function EditRawAssetModal({
  isOpen,
  onClose,
  onSave,
  asset,
}: EditRawAssetModalProps) {
  const [formData, setFormData] = useState<Partial<RawAssetData>>({
    date: "",
    description: "",
    locations: [],
    cars: [],
  });
  const [selectedCars, setSelectedCars] = useState<any[]>([]);
  const [selectedDrives, setSelectedDrives] = useState<HardDriveWithId[]>([]);
  const [availableDrives, setAvailableDrives] = useState<HardDriveWithId[]>([]);
  const [driveSearchTerm, setDriveSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDrives, setIsLoadingDrives] = useState(false);

  // Fetch hard drives
  useEffect(() => {
    const fetchDrives = async () => {
      setIsLoadingDrives(true);
      try {
        const response = await fetch(
          `/api/hard-drives?search=${encodeURIComponent(driveSearchTerm)}`
        );
        if (!response.ok) throw new Error("Failed to fetch hard drives");
        const data = await response.json();
        // Ensure _id is string
        setAvailableDrives(
          data.drives.map((drive: HardDriveData & { _id: ObjectId }) => ({
            ...drive,
            _id: drive._id.toString(),
          }))
        );
      } catch (error) {
        console.error("Error fetching hard drives:", error);
      } finally {
        setIsLoadingDrives(false);
      }
    };

    fetchDrives();
  }, [driveSearchTerm]);

  // Initialize form data when asset changes
  useEffect(() => {
    if (asset) {
      setFormData({
        ...asset,
        _id: undefined,
      });
      setSelectedCars(asset.cars || []);

      // Fetch selected drives
      const fetchSelectedDrives = async () => {
        try {
          // Ensure location IDs are strings
          const locationIds = (asset.locations || []).map((id) =>
            typeof id === "string" ? id : (id as any).toString()
          );

          const promises = locationIds.map(async (locationId) => {
            const response = await fetch(`/api/hard-drives/${locationId}`);
            if (!response.ok) {
              console.error(`Failed to fetch drive ${locationId}`);
              return null;
            }
            const data = await response.json();
            return {
              ...data,
              _id: data._id.toString(),
            };
          });

          const drives = (await Promise.all(promises)).filter(
            (drive): drive is HardDriveWithId => drive !== null
          );
          setSelectedDrives(drives);
        } catch (error) {
          console.error("Error fetching selected drives:", error);
          setError("Failed to fetch drive information");
        }
      };

      if (asset.locations?.length) {
        fetchSelectedDrives();
      }
    } else {
      setFormData({
        date: "",
        description: "",
        locations: [],
        cars: [],
      });
      setSelectedCars([]);
      setSelectedDrives([]);
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        ...formData,
        carIds: selectedCars.map((car) => car._id),
        cars: selectedCars,
        locations: selectedDrives.map((drive) => drive._id),
      });
      onClose();
    } catch (error) {
      console.error("Error saving raw asset:", error);
      setError("Failed to save raw asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDrive = (drive: HardDriveWithId) => {
    if (!selectedDrives.find((d) => d._id === drive._id)) {
      setSelectedDrives([...selectedDrives, drive]);
    }
    setDriveSearchTerm("");
  };

  const handleRemoveDrive = (driveId: string) => {
    setSelectedDrives(selectedDrives.filter((drive) => drive._id !== driveId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--background))/95] backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-[hsl(var(--background))] p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-[hsl(var(--border))]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
            {asset ? "Edit Raw Asset" : "Add New Raw Asset"}
          </h2>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[hsl(var(--destructive))/10] border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Date*
            </label>
            <input
              type="text"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              placeholder="YYMMDD"
              pattern="\d{6}"
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Description*
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Storage Locations*
            </label>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={driveSearchTerm}
                  onChange={(e) => setDriveSearchTerm(e.target.value)}
                  placeholder="Search hard drives..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground-muted))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--foreground-muted))]" />
              </div>

              {driveSearchTerm && (
                <div className="border border-[hsl(var(--border))] rounded-lg max-h-48 overflow-y-auto">
                  {isLoadingDrives ? (
                    <div className="p-2 text-[hsl(var(--muted-foreground))]">
                      Loading...
                    </div>
                  ) : availableDrives.length > 0 ? (
                    availableDrives.map((drive) => (
                      <div
                        key={drive._id}
                        onClick={() => handleSelectDrive(drive)}
                        className="p-2 hover:bg-[hsl(var(--accent))] cursor-pointer flex items-center gap-2"
                      >
                        <HardDriveIcon className="w-4 h-4" />
                        <span>{drive.label}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-[hsl(var(--muted-foreground))]">
                      No drives found
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedDrives.map((drive) => (
                  <div
                    key={drive._id}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-full text-sm"
                  >
                    <HardDriveIcon className="w-3 h-3" />
                    {drive.label}
                    <button
                      type="button"
                      onClick={() => handleRemoveDrive(drive._id)}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Associated Cars
            </label>
            <CarSelector
              selectedCars={selectedCars}
              onSelect={setSelectedCars}
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
                ? asset
                  ? "Saving..."
                  : "Adding..."
                : asset
                ? "Save Changes"
                : "Add Raw Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
