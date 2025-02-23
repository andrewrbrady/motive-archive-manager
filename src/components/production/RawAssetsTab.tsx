"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { RawAssetData } from "@/models/raw";
import {
  PencilIcon,
  FolderIcon,
  CarIcon,
  Trash2Icon,
  HardDriveIcon,
} from "lucide-react";
import CarSelector from "@/components/CarSelector";
import AddAssetModal from "./AddAssetModal";

const LIMIT_OPTIONS = [10, 25, 50, 100];

export default function RawAssetsTab() {
  const [assets, setAssets] = React.useState<RawAssetData[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [editingAsset, setEditingAsset] = useState<RawAssetData | null>(null);
  const [selectedCars, setSelectedCars] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/raw?page=${currentPage}&search=${encodeURIComponent(
          searchTerm
        )}&limit=${itemsPerPage}`
      );
      if (!response.ok) throw new Error("Failed to fetch assets");
      const data = await response.json();
      setAssets(data.assets);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Error fetching assets:", err);
      setError("Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all assets? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/raw", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete assets");
      fetchAssets();
    } catch (err) {
      console.error("Error deleting assets:", err);
      setError("Failed to delete assets");
    }
  };

  const handleEditCars = async (asset: RawAssetData) => {
    setEditingAsset(asset);
    setSelectedCars(asset.cars || []);
  };

  const handleSaveCars = async () => {
    if (!editingAsset) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/raw/${editingAsset._id?.toString()}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editingAsset,
          carIds: selectedCars.map((car) => car._id),
        }),
      });

      if (!response.ok) throw new Error("Failed to update asset");

      // Update just the edited asset in the state
      setAssets((prevAssets) =>
        prevAssets.map((asset) =>
          asset._id?.toString() === editingAsset._id?.toString()
            ? {
                ...asset,
                cars: selectedCars,
                carIds: selectedCars.map((car) => car._id),
              }
            : asset
        )
      );

      setEditingAsset(null);
      setSelectedCars([]);
    } catch (err) {
      console.error("Error updating asset:", err);
      setError("Failed to update asset");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this asset? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/raw/${assetId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete asset");

      // Update the state to remove the deleted asset
      setAssets((prevAssets) =>
        prevAssets.filter((asset) => asset._id?.toString() !== assetId)
      );

      // If this was the last item on the page and we're not on the first page,
      // go to the previous page
      if (assets.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
    } catch (err) {
      console.error("Error deleting asset:", err);
      setError("Failed to delete asset");
    }
  };

  const handleAddAsset = async (asset: {
    date: string;
    description: string;
    locations: string[];
  }) => {
    try {
      const response = await fetch("/api/raw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(asset),
      });

      if (!response.ok) throw new Error("Failed to add asset");

      // Refresh the assets list
      fetchAssets();
    } catch (error) {
      console.error("Error adding asset:", error);
      setError("Failed to add asset");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] rounded hover:bg-[hsl(var(--destructive))/90]"
          >
            <Trash2Icon className="w-4 h-4" />
            Delete All
          </button>
          <Link
            href="/raw/import"
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded hover:bg-[hsl(var(--secondary))/90]"
          >
            <FolderIcon className="w-4 h-4" />
            Import CSV
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded hover:bg-[hsl(var(--primary))/90]"
          >
            <PencilIcon className="w-4 h-4" />
            Add Asset
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by date, description, car year, make, model, or color..."
            className="w-full px-4 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
        >
          {LIMIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} per page
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[hsl(var(--muted-foreground))] text-xs uppercase">
              <th className="py-3">Date</th>
              <th className="py-3">Description</th>
              <th className="py-3">Cars</th>
              <th className="py-3">Storage Locations</th>
              <th className="py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[hsl(var(--foreground))]">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No assets found
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset._id?.toString()}
                  className="border-t border-[hsl(var(--border))]"
                >
                  <td className="py-4">
                    <Link
                      href={`/raw/${asset._id?.toString()}`}
                      className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))/90]"
                    >
                      {asset.date}
                    </Link>
                  </td>
                  <td className="py-4">{asset.description}</td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      {asset.cars?.map((car: any) => (
                        <span
                          key={car._id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded text-sm border border-[hsl(var(--border))] shadow-sm"
                        >
                          <CarIcon className="w-3 h-3" />
                          {car.year} {car.make} {car.model}
                          {car.series && ` ${car.series}`}
                          {car.trim && ` (${car.trim})`}
                          {car.color && ` - ${car.color}`}
                        </span>
                      ))}
                      {!asset.cars?.length && "-"}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      {asset.locations.map((location, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded text-sm border border-[hsl(var(--border))] shadow-sm"
                        >
                          <HardDriveIcon className="w-3 h-3" />
                          {location}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditCars(asset)}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                        title="Associate cars"
                      >
                        <CarIcon className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/raw/${asset._id?.toString()}`}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                        title="Edit asset"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() =>
                          asset._id
                            ? handleDeleteAsset(asset._id.toString())
                            : undefined
                        }
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                        title="Delete asset"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && assets.length > 0 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded disabled:opacity-50 hover:bg-[hsl(var(--secondary))/90]"
          >
            Previous
          </button>
          <span className="text-[hsl(var(--muted-foreground))]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded disabled:opacity-50 hover:bg-[hsl(var(--secondary))/90]"
          >
            Next
          </button>
        </div>
      )}

      {/* Car Selection Dialog */}
      {editingAsset && (
        <div className="fixed inset-0 bg-[hsl(var(--background))/80] flex items-center justify-center z-50">
          <div className="bg-[hsl(var(--background))] p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-[hsl(var(--border))]">
            <h2 className="text-xl font-semibold mb-4 text-[hsl(var(--foreground))]">
              Associate Cars with Asset
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {editingAsset.date} - {editingAsset.description}
            </p>
            <div className="mb-6">
              <CarSelector
                selectedCars={selectedCars}
                onSelect={setSelectedCars}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingAsset(null);
                  setSelectedCars([]);
                }}
                className="px-4 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded hover:bg-[hsl(var(--secondary))/90]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCars}
                disabled={isSaving}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded hover:bg-[hsl(var(--primary))/90] disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddAsset}
      />
    </div>
  );
}
