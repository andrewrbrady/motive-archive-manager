"use client";

import React, { useState, useEffect } from "react";
import { XIcon, HardDriveIcon, Search, CarIcon } from "lucide-react";
import { HardDriveData } from "@/models/hard-drive";
import { ObjectId } from "@/lib/types";
import { Car } from "@/types/car";
import CarSelector from "@/components/CarSelector";
import { UrlModal } from "@/components/ui/url-modal";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface HardDriveWithId {
  _id: string;
  label: string;
  name: string;
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (asset: {
    date: string;
    description: string;
    hardDriveIds: string[];
    carIds: string[];
  }) => void;
}

export default function AddAssetModal({
  isOpen,
  onClose,
  onAdd,
}: AddAssetModalProps) {
  const api = useAPI();
  const [formData, setFormData] = useState<{
    date: string;
    description: string;
    hardDriveIds: string[];
    carIds: string[];
  }>({
    date: "",
    description: "",
    hardDriveIds: [],
    carIds: [],
  });
  const [selectedCars, setSelectedCars] = useState<Car[]>([]);
  const [selectedDrives, setSelectedDrives] = useState<HardDriveWithId[]>([]);
  const [availableDrives, setAvailableDrives] = useState<HardDriveWithId[]>([]);
  const [driveSearchTerm, setDriveSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDrives, setIsLoadingDrives] = useState(false);

  // Fetch hard drives
  useEffect(() => {
    const fetchDrives = async () => {
      if (!api) return;

      setIsLoadingDrives(true);
      try {
        const data = await api.get<{
          data: (HardDriveData & { _id: ObjectId })[];
        }>(`/hard-drives?search=${encodeURIComponent(driveSearchTerm)}`);
        // Ensure _id is string
        setAvailableDrives(
          (data.data || []).map((drive: HardDriveData & { _id: ObjectId }) => ({
            _id: drive._id.toString(),
            label: drive.label,
            name: drive.label, // Use label as name since HardDriveData doesn't have name
          }))
        );
      } catch (error) {
        console.error("Error fetching hard drives:", error);
        toast.error("Failed to fetch hard drives");
      } finally {
        setIsLoadingDrives(false);
      }
    };

    fetchDrives();
  }, [driveSearchTerm, api]);

  // Update formData when selectedCars changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      carIds: selectedCars.map((car) => car._id),
    }));
  }, [selectedCars]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onAdd({
        date: formData.date,
        description: formData.description,
        hardDriveIds: selectedDrives.map((drive) => drive._id),
        carIds: selectedCars.map((car) => car._id),
      });

      onClose();
    } catch (error) {
      console.error("Error adding raw asset:", error);
      setError(
        error instanceof Error ? error.message : "Failed to add raw asset"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDrive = (drive: HardDriveWithId) => {
    if (!selectedDrives.find((d) => d._id === drive._id)) {
      setSelectedDrives([...selectedDrives, drive]);
      setFormData((prev) => ({
        ...prev,
        hardDriveIds: [...prev.hardDriveIds, drive._id],
      }));
    }
    setDriveSearchTerm("");
  };

  const handleRemoveDrive = (driveId: string) => {
    setSelectedDrives(selectedDrives.filter((drive) => drive._id !== driveId));
    setFormData((prev) => ({
      ...prev,
      hardDriveIds: prev.hardDriveIds.filter((id) => id !== driveId),
    }));
  };

  const handleCarSelectionChange = (cars: Car[]) => {
    setSelectedCars(cars);
    setFormData((prev) => ({
      ...prev,
      carIds: cars.map((car) => car._id),
    }));
  };

  if (!isOpen) return null;

  return (
    <UrlModal
      paramName="addAsset"
      paramValue="true"
      onClose={onClose}
      title="Add New Raw Asset"
      preserveParams={["tab", "page", "limit", "search"]}
    >
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
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                  <div className="p-2 text-[hsl(var(--muted-foreground))] flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Loading...</span>
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
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedCars.map((car, index) => (
              <div
                key={`${car._id}-${index}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
              >
                <CarIcon className="w-3 h-3" />
                {car.year} {car.make} {car.model}
                {car.color && ` (${car.color})`}
                <button
                  type="button"
                  onClick={() => {
                    const newSelectedCars = selectedCars.filter(
                      (_, i) => i !== index
                    );
                    handleCarSelectionChange(newSelectedCars);
                  }}
                  className="ml-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <CarSelector
            selectedCars={selectedCars}
            onSelect={handleCarSelectionChange}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Raw Asset"}
          </Button>
        </div>
      </form>
    </UrlModal>
  );
}
