"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RawAssetData } from "@/models/raw";
import {
  PencilIcon,
  FolderIcon,
  CarIcon,
  Trash2Icon,
  HardDriveIcon,
  Plus,
} from "lucide-react";
import EditRawAssetModal from "./EditRawAssetModal";
import RawAssetDetailsModal from "./RawAssetDetailsModal";
import ImportRawAssetsModal from "./ImportRawAssetsModal";
import { Button } from "@/components/ui/button";
import AddAssetModal from "./AddAssetModal";
import { ObjectId } from "@/lib/types";

const LIMIT_OPTIONS = [10, 25, 50, 100];

interface RawAsset {
  _id: string;
  date: string;
  description: string;
  locations: string[];
  carIds?: string[];
  cars: Array<{
    _id: string;
    make: string;
    model: string;
    year: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function RawAssetsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<RawAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get("page");
    return page ? parseInt(page) : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const limit = searchParams.get("limit");
    return limit ? parseInt(limit) : 10;
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [driveLabels, setDriveLabels] = useState<Record<string, string>>({});
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<
    RawAssetData | undefined
  >();
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isEditingAsset, setIsEditingAsset] = useState(false);

  // Handle Escape key press for both modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isDetailsModalOpen) {
          handleCloseDetails();
        }
        if (isEditModalOpen) {
          handleCloseModal();
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isDetailsModalOpen, isEditModalOpen]);

  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Handle selected asset from URL for both edit and details
  useEffect(() => {
    const selectedAssetId = searchParams.get("asset");
    const isEdit = searchParams.get("edit") === "true";

    if (selectedAssetId) {
      // If we have assets loaded, find the asset and show modal
      if (assets.length > 0) {
        const asset = assets.find((a) => a._id?.toString() === selectedAssetId);
        if (asset) {
          if (isEdit) {
            setSelectedAssetId(asset._id);
            setIsEditModalOpen(true);
          } else {
            setSelectedAssetForDetails({
              _id: asset._id as unknown as ObjectId,
              date: asset.date,
              description: asset.description,
              locations: asset.locations.map((id) => id as unknown as ObjectId),
              carIds: asset.carIds,
              cars: asset.cars,
              createdAt: asset.createdAt,
              updatedAt: asset.updatedAt,
            });
            setIsDetailsModalOpen(true);
          }
        }
      } else {
        // If assets aren't loaded yet, fetch the specific asset
        const fetchAsset = async () => {
          try {
            const response = await fetch(`/api/raw/${selectedAssetId}`);
            if (!response.ok) throw new Error("Failed to fetch asset");
            const asset = await response.json();
            setSelectedAssetForDetails(asset);
            setIsDetailsModalOpen(true);
          } catch (error) {
            console.error("Error fetching asset:", error);
          }
        };
        fetchAsset();
      }
    }
  }, [searchParams, assets]);

  const fetchDriveLabels = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `/api/hard-drives?id=${encodeURIComponent(id)}`
      );
      if (!response.ok) {
        console.warn(
          `Failed to fetch drive label for ${id}: ${response.statusText}`
        );
        return id; // Return the original ID if we can't fetch the label
      }
      const data = await response.json();
      return data.drives?.[0]?.label || id;
    } catch (error) {
      console.warn(`Error fetching drive label for ${id}:`, error);
      return id; // Return the original ID if there's an error
    }
  }, []);

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

      // Fetch drive labels for all locations
      const allLocationIds = data.assets.flatMap((asset: RawAsset) =>
        asset.locations.map((loc: string) => loc)
      );
      const labels = await Promise.all(allLocationIds.map(fetchDriveLabels));
      const driveLabels = labels.reduce((acc, label, index) => {
        acc[allLocationIds[index]] = label;
        return acc;
      }, {} as Record<string, string>);
      setDriveLabels(driveLabels);
    } catch (err) {
      console.error("Error fetching assets:", err);
      setError("Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, fetchDriveLabels]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    updateUrlParams({ search: value || null, page: "1" });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateUrlParams({ page: page.toString() });
  };

  const handleLimitChange = (limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
    updateUrlParams({ limit: limit.toString(), page: "1" });
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

  const handleViewDetails = (asset: RawAsset) => {
    setSelectedAssetForDetails({
      _id: asset._id as unknown as ObjectId,
      date: asset.date,
      description: asset.description,
      locations: asset.locations.map((id) => id as unknown as ObjectId),
      carIds: asset.carIds,
      cars: asset.cars,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    });
    setIsDetailsModalOpen(true);
    updateUrlParams({ asset: asset._id?.toString() || null, edit: null });
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedAssetForDetails(undefined);
    updateUrlParams({ asset: null, edit: null });
  };

  const handleEdit = (asset: RawAsset) => {
    const rawAssetData: RawAssetData = {
      _id: asset._id as unknown as ObjectId,
      date: asset.date,
      description: asset.description,
      locations: asset.locations.map((id) => id as unknown as ObjectId),
      carIds: asset.carIds,
      cars: asset.cars,
    };
    setSelectedAssetId(asset._id);
    setSelectedAssetForDetails(rawAssetData);
    setIsEditModalOpen(true);
    updateUrlParams({ asset: asset._id?.toString() || null, edit: "true" });
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedAssetId(null);
    updateUrlParams({ asset: null });
  };

  const handleSave = async (assetData: Partial<RawAssetData>) => {
    try {
      const method = selectedAssetId ? "PUT" : "POST";
      const url = selectedAssetId ? `/api/raw/${selectedAssetId}` : "/api/raw";

      // Ensure we're sending both carIds and cars arrays
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...assetData,
          carIds: assetData.carIds || [],
          cars: assetData.cars || [],
        }),
      });

      if (!response.ok) throw new Error("Failed to save asset");

      // Refresh the assets list
      fetchAssets();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving asset:", error);
      throw error; // Let the modal handle the error
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
        handlePageChange(currentPage - 1);
      } else {
        fetchAssets();
      }
    } catch (err) {
      console.error("Error deleting asset:", err);
      setError("Failed to delete asset");
    }
  };

  const handleAssetClick = (assetId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("asset", assetId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleAddAsset = async (assetData: {
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
        body: JSON.stringify(assetData),
      });

      if (!response.ok) throw new Error("Failed to add asset");

      // Refresh the assets list
      fetchAssets();
      setIsAddingAsset(false);
    } catch (error) {
      console.error("Error adding asset:", error);
      throw error;
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
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded hover:bg-[hsl(var(--secondary))/90]"
          >
            <FolderIcon className="w-4 h-4" />
            Import CSV
          </button>
          <Button onClick={() => setIsAddingAsset(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by date, description, storage location, car year, make, model, or color..."
            className="w-full px-4 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>
        <select
          value={itemsPerPage}
          onChange={(e) => handleLimitChange(Number(e.target.value))}
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
                  key={asset._id}
                  className="border-t border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--accent))]"
                  onClick={() => handleAssetClick(asset._id)}
                >
                  <td className="py-4">
                    <Link
                      href={`/raw/${asset._id}`}
                      className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))/90]"
                    >
                      {asset.date}
                    </Link>
                  </td>
                  <td className="py-4">{asset.description}</td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      {asset.cars.map((car) => (
                        <span
                          key={car._id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded text-sm border border-[hsl(var(--border))] shadow-sm"
                        >
                          <CarIcon className="w-3 h-3" />
                          {car.year} {car.make} {car.model}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      {asset.locations.map((location, index) => {
                        const locationId = location.toString();
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded text-sm border border-[hsl(var(--border))] shadow-sm"
                          >
                            <HardDriveIcon className="w-3 h-3" />
                            {driveLabels[locationId] || "Unknown Drive"}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(asset);
                        }}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                        title="Edit asset"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (asset._id) {
                            handleDeleteAsset(asset._id);
                          }
                        }}
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
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded disabled:opacity-50 hover:bg-[hsl(var(--secondary))/90]"
          >
            Previous
          </button>
          <span className="text-[hsl(var(--muted-foreground))]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              handlePageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded disabled:opacity-50 hover:bg-[hsl(var(--secondary))/90]"
          >
            Next
          </button>
        </div>
      )}

      <RawAssetDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
        asset={selectedAssetForDetails}
        driveLabels={driveLabels}
      />

      {isAddingAsset && (
        <AddAssetModal
          isOpen={isAddingAsset}
          onClose={() => setIsAddingAsset(false)}
          onAdd={handleAddAsset}
        />
      )}

      <EditRawAssetModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        asset={selectedAssetForDetails}
      />

      <ImportRawAssetsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={fetchAssets}
      />
    </div>
  );
}
