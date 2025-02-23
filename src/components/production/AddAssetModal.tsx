"use client";

import React, { useState } from "react";
import { PencilIcon } from "lucide-react";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (asset: {
    date: string;
    description: string;
    locations: string[];
  }) => void;
}

export default function AddAssetModal({
  isOpen,
  onClose,
  onAdd,
}: AddAssetModalProps) {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [locations, setLocations] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const filteredLocations = locations.filter((loc) => loc.trim() !== "");
      await onAdd({
        date,
        description,
        locations: filteredLocations,
      });

      // Reset form
      setDate("");
      setDescription("");
      setLocations([""]);
      onClose();
    } catch (error) {
      console.error("Error adding asset:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLocationField = () => {
    setLocations([...locations, ""]);
  };

  const updateLocation = (index: number, value: string) => {
    const newLocations = [...locations];
    newLocations[index] = value;
    setLocations(newLocations);
  };

  const removeLocation = (index: number) => {
    if (locations.length > 1) {
      const newLocations = locations.filter((_, i) => i !== index);
      setLocations(newLocations);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--background))/80] flex items-center justify-center z-50">
      <div className="bg-[hsl(var(--background))] p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-[hsl(var(--border))]">
        <h2 className="text-xl font-semibold mb-4 text-[hsl(var(--foreground))]">
          Add New Asset
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Storage Locations
            </label>
            {locations.map((location, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => updateLocation(index, e.target.value)}
                  placeholder="Enter storage location"
                  className="flex-1 px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                />
                {locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLocation(index)}
                    className="px-3 py-2 bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] rounded hover:bg-[hsl(var(--destructive))/90]"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addLocationField}
              className="text-sm text-[hsl(var(--primary))]"
            >
              + Add Another Location
            </button>
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
              {isSubmitting ? "Adding..." : "Add Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
