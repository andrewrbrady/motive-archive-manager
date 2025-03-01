"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RawAssetData } from "@/models/raw_assets";
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
import { useUrlParams } from "@/hooks/useUrlParams";
import { PaginationWithUrl } from "@/components/ui/pagination-with-url";
import { LoadingSpinner } from "@/components/ui/loading";
import { LoadingContainer } from "@/components/ui/loading-container";

const LIMIT_OPTIONS = [10, 25, 50, 100];

interface RawAsset {
  _id: string;
  date: string;
  description: string;
  hardDriveIds: string[];
  carIds?: string[];
  cars?: Array<{
    _id: string;
    make: string;
    model: string;
    year: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function RawAssetsTab() {
  const pathname = usePathname();
  const router = useRouter();
  const { getParam, updateParams } = useUrlParams();
  const [assets, setAssets] = useState<RawAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(() => {
    return getParam("search") || "";
  });

  const [currentPage, setCurrentPage] = useState(() => {
    const page = getParam("page");
    return page ? parseInt(page) : 1;
  });

  const [totalPages, setTotalPages] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const limit = getParam("limit");
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
        // Only handle the edit modal here - the details modal handles its own escape key
        if (isEditModalOpen) {
          handleCloseModal();
        }
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isEditModalOpen]);

  // Validate current page when total pages changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      handlePageChange(1);
    }
  }, [totalPages]);

  // Enhanced effect to handle asset parameter from URL, especially when coming from other tabs
  useEffect(() => {
    const selectedAssetId = getParam("asset");
    const isEdit = getParam("edit") === "true";

    if (selectedAssetId) {
      console.log("RawAssetsTab - Found asset param in URL:", selectedAssetId);

      // If we have assets loaded, find the asset and show modal
      if (assets.length > 0) {
        const asset = assets.find((a) => a._id === selectedAssetId);

        if (asset) {
          if (isEdit) {
            setSelectedAssetId(asset._id);
            // Only set the asset data if the edit modal is not already open
            // This prevents overwriting the current edit with stale data
            if (!isEditModalOpen) {
              const rawAssetData: RawAssetData = {
                _id: asset._id as unknown as ObjectId,
                date: asset.date,
                description: asset.description,
                hardDriveIds: asset.hardDriveIds.map(
                  (id) => id as unknown as ObjectId
                ),
                carIds: asset.carIds,
                cars: asset.cars || [],
              };
              setSelectedAssetForDetails(rawAssetData);
              setIsEditModalOpen(true);
            }
          } else {
            // Only set the details if the details modal is not already open
            if (!isDetailsModalOpen) {
              setSelectedAssetForDetails({
                _id: asset._id as unknown as ObjectId,
                date: asset.date,
                description: asset.description,
                hardDriveIds: asset.hardDriveIds.map(
                  (id) => id as unknown as ObjectId
                ),
                carIds: asset.carIds,
                cars: asset.cars || [],
                createdAt: asset.createdAt,
                updatedAt: asset.updatedAt,
              });
              setIsDetailsModalOpen(true);
              console.log("Opening details modal for asset:", asset._id);
            }
          }
        } else {
          console.log("Asset not found in loaded assets, fetching from API");
          // Asset not found in currently loaded assets, fetch it directly
          fetchAssetById(selectedAssetId);
        }
      } else {
        // If assets aren't loaded yet, fetch the specific asset
        console.log("Assets not loaded yet, fetching specific asset");
        fetchAssetById(selectedAssetId);
      }
    }
  }, [assets, getParam]);

  // Handle addAsset parameter from URL
  useEffect(() => {
    const addAsset = getParam("addAsset");
    if (addAsset === "true" && !isAddingAsset) {
      setIsAddingAsset(true);
    }
  }, [getParam, isAddingAsset]);

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

      // Fetch drive labels for all hardDriveIds
      const allHardDriveIds = data.assets.flatMap((asset: RawAsset) =>
        asset.hardDriveIds.map((loc: string) => loc)
      );
      const labels = await Promise.all(allHardDriveIds.map(fetchDriveLabels));
      const driveLabels = labels.reduce((acc, label, index) => {
        acc[allHardDriveIds[index]] = label;
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
    updateParams({
      search: value || null,
      page: "1",
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateParams({
      page: page.toString(),
    });
  };

  const handleLimitChange = (limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
    updateParams({
      limit: limit.toString(),
      page: "1",
    });
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
    // Update URL parameters
    updateParams({
      asset: asset._id?.toString() || null,
      edit: null,
    });

    // Then set the asset data and open the modal
    setSelectedAssetForDetails({
      _id: asset._id as unknown as ObjectId,
      date: asset.date,
      description: asset.description,
      hardDriveIds: asset.hardDriveIds.map((id) => id as unknown as ObjectId),
      carIds: asset.carIds,
      cars: asset.cars || [],
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    });
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    console.log("Closing raw asset details modal");

    // Close the modal first
    setIsDetailsModalOpen(false);

    // Reset the state
    setSelectedAssetForDetails(undefined);

    // Update URL params - preserve the tab parameter to stay on the raw-assets tab
    updateParams(
      {
        asset: null,
        edit: null,
      },
      {
        preserveParams: ["tab", "page", "limit", "search", "location", "view"],
        clearOthers: false,
      }
    );
  };

  const handleEdit = (asset: RawAsset) => {
    // First, reset the previous asset data
    setSelectedAssetForDetails(undefined);

    // Then set the new asset data after a small delay to ensure the reset takes effect
    setTimeout(() => {
      const rawAssetData: RawAssetData = {
        _id: asset._id as unknown as ObjectId,
        date: asset.date,
        description: asset.description,
        hardDriveIds: asset.hardDriveIds.map((id) => id as unknown as ObjectId),
        carIds: asset.carIds,
        cars: asset.cars || [],
      };
      setSelectedAssetId(asset._id);
      setSelectedAssetForDetails(rawAssetData);
      setIsEditModalOpen(true);
      updateParams({ asset: asset._id?.toString() || null, edit: "true" });
    }, 50);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedAssetId(null);
    setSelectedAssetForDetails(undefined);
    updateParams({ asset: null });
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
    // Instead of showing a modal, navigate to the raw asset details page
    router.push(`/raw/${assetId}`);
  };

  const handleAddAsset = async (assetData: {
    date: string;
    description: string;
    hardDriveIds: string[];
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

  // Add a function to handle opening the add asset modal
  const handleAddAssetClick = () => {
    updateParams({
      addAsset: "true",
    });
    setIsAddingAsset(true);
  };

  // Handle closing the add asset modal
  const handleCloseAddAsset = () => {
    setIsAddingAsset(false);
    updateParams({
      addAsset: null,
    });
  };

  // Function to fetch a specific asset by ID
  const fetchAssetById = async (assetId: string) => {
    console.log("Fetching asset by ID:", assetId);
    try {
      setLoading(true);
      const response = await fetch(`/api/raw/${assetId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch asset");
      }

      const asset = await response.json();
      console.log("Fetched asset data:", asset);

      // Transform the asset data to the expected format
      const rawAssetData: RawAssetData = {
        _id: asset._id as unknown as ObjectId,
        date: asset.date,
        description: asset.description,
        hardDriveIds: asset.hardDriveIds.map(
          (id: string) => id as unknown as ObjectId
        ),
        carIds: asset.carIds,
        cars: asset.cars || [],
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      };

      // Check if edit mode or view mode
      const isEdit = getParam("edit") === "true";

      if (isEdit && !isEditModalOpen) {
        setSelectedAssetId(assetId);
        setSelectedAssetForDetails(rawAssetData);
        setIsEditModalOpen(true);
        console.log("Opening edit modal for asset:", assetId);
      } else if (!isEdit && !isDetailsModalOpen) {
        setSelectedAssetForDetails(rawAssetData);
        setIsDetailsModalOpen(true);
        console.log("Opening details modal for asset:", assetId);
      }

      // If we had to fetch a single asset, also fetch drive labels for it
      if (asset.hardDriveIds && asset.hardDriveIds.length > 0) {
        fetchDriveLabelsForAsset(asset.hardDriveIds);
      }
    } catch (err) {
      console.error("Error fetching asset:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch asset");
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch drive labels for a specific asset
  const fetchDriveLabelsForAsset = async (hardDriveIds: string[]) => {
    try {
      const response = await fetch(
        `/api/hard-drives?ids=${hardDriveIds.join(",")}`
      );
      if (!response.ok) throw new Error("Failed to fetch drive labels");
      const data = await response.json();

      const labels: Record<string, string> = {};
      data.drives.forEach((drive: any) => {
        labels[drive._id] = drive.label;
      });

      setDriveLabels(labels);
    } catch (error) {
      console.error("Error fetching drive labels:", error);
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
          <Button onClick={handleAddAssetClick}>
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

      <div className="overflow-x-auto shadow-md rounded-lg border border-[hsl(var(--border))]">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[hsl(var(--muted-foreground))] text-xs uppercase">
              <th className="py-3 px-2">Date</th>
              <th className="py-3 px-2">Description</th>
              <th className="py-3 px-2">Cars</th>
              <th className="py-3 px-2">Storage Locations</th>
              <th className="py-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[hsl(var(--foreground))]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8">
                  <LoadingContainer text="Loading assets..." />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  {error}
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
                  className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  onClick={() => handleAssetClick(asset._id)}
                >
                  <td className="py-3 px-2">
                    <Link
                      href={`/raw/${asset._id}`}
                      className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))/90]"
                    >
                      {asset.date}
                    </Link>
                  </td>
                  <td className="py-3 px-2 text-sm">{asset.description}</td>
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-2">
                      {asset.cars &&
                        asset.cars.map((car) => (
                          <span
                            key={car._id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
                          >
                            <CarIcon className="w-3 h-3" />
                            {car.year} {car.make} {car.model}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-2">
                      {asset.hardDriveIds.map((hardDriveId, index) => {
                        const hardDriveIdStr = hardDriveId.toString();
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
                          >
                            <HardDriveIcon className="w-3 h-3" />
                            {driveLabels[hardDriveIdStr] || "Unknown Drive"}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(asset);
                        }}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                        title="Edit asset"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset._id);
                        }}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                        title="Delete asset"
                      >
                        <Trash2Icon className="w-4 h-4" />
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
        <PaginationWithUrl
          totalPages={totalPages}
          defaultPage={currentPage}
          defaultPageSize={itemsPerPage}
          onPageChange={handlePageChange}
          context="tab:raw-assets"
          preserveParams={["tab", "search"]}
          pageSizeOptions={LIMIT_OPTIONS}
        />
      )}

      {isAddingAsset && (
        <AddAssetModal
          isOpen={isAddingAsset}
          onClose={handleCloseAddAsset}
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
