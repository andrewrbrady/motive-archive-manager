"use client";

import React, { useState, useCallback, useEffect, memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RawAssetData } from "@/models/raw_assets";
import { PencilIcon, FolderIcon, Trash2Icon, Plus, Search } from "lucide-react";
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
import { useLabels } from "@/contexts/LabelsContext";
import CarLabel from "./CarLabel";
import DriveLabel from "./DriveLabel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { debounce } from "lodash";
import { CarIcon, HardDriveIcon } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

const LIMIT_OPTIONS = [100, 10, 25, 50];

interface Car {
  _id: string;
  year: number | string;
  make: string;
  model: string;
  color?: string;
}

interface RawAsset {
  _id: string;
  date: string;
  description: string;
  hardDriveIds: string[];
  carIds: string[];
  cars?: Car[];
  hardDrives?: Array<{ _id: string; label: string; name: string }>;
  createdAt?: Date;
  updatedAt?: Date;
}

// Utility function for timeout-aware fetching
const fetchWithTimeout = async (url: string, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const { signal } = controller;

  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Starting fetch with ${timeout}ms timeout: ${url}`);
  const timeoutId = setTimeout(() => {
    console.warn(`Request to ${url} timed out after ${timeout}ms`);
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`Fetch aborted due to timeout: ${url}`);
      throw new Error(
        `Request timed out after ${timeout}ms. The server might be under heavy load.`
      );
    }

    // Check specifically for resource constraint errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("ERR_INSUFFICIENT_RESOURCES")) {
      console.error(`Resource constraint error: ${url}`);
      throw new Error(
        `The server or browser doesn't have enough resources to complete this request. Try again later.`
      );
    }

    throw error;
  }
};

// Memoized component for a single asset row to prevent unnecessary re-renders
const AssetRow = memo(
  ({
    asset,
    onEdit,
    onDelete,
    onClick,
  }: {
    asset: RawAsset;
    onEdit: (asset: RawAsset) => void;
    onDelete: (id: string) => void;
    onClick: (id: string) => void;
  }) => {
    const handleClick = useCallback(() => {
      onClick(asset._id);
    }, [asset._id, onClick]);

    const handleEditClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(asset);
      },
      [asset, onEdit]
    );

    const handleDeleteClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(asset._id);
      },
      [asset._id, onDelete]
    );

    return (
      <tr
        className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
        onClick={handleClick}
      >
        <td className="py-3 px-2">
          <Link
            href={`/raw/${asset._id}`}
            className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))/90]"
          >
            {asset.date || "Unknown Date"}
          </Link>
        </td>
        <td className="py-3 px-2 text-sm">
          {asset.description || "No description"}
        </td>
        <td className="py-3 px-2">
          <div className="flex flex-wrap gap-2">
            {Array.isArray(asset.cars) && asset.cars.length > 0 ? (
              asset.cars.map((car, index) => (
                <div
                  key={`${asset._id}-car-${index}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
                >
                  <CarIcon className="w-3 h-3" />
                  {car.year} {car.make} {car.model}
                  {car.color && ` (${car.color})`}
                </div>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">No cars</span>
            )}
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="flex flex-wrap gap-2">
            {Array.isArray(asset.hardDriveIds) &&
            asset.hardDriveIds.length > 0 ? (
              asset.hardDriveIds
                .filter((id) => id !== null && id !== undefined && id !== "")
                .map((driveId, index) => {
                  // Check if we have the hardDrive data in the asset
                  const hardDrive = asset.hardDrives?.find(
                    (drive) => drive._id === driveId
                  );
                  if (hardDrive && (hardDrive.label || hardDrive.name)) {
                    return (
                      <div
                        key={`${asset._id}-drive-${index}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
                      >
                        <HardDriveIcon className="w-3 h-3" />
                        {hardDrive.label || hardDrive.name}
                      </div>
                    );
                  }
                  // Fall back to the DriveLabel component if we don't have the data
                  return (
                    <DriveLabel
                      key={`${asset._id}-drive-${index}`}
                      driveId={driveId}
                    />
                  );
                })
            ) : (
              <span className="text-muted-foreground text-sm">
                No storage locations
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-2 text-right">
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleEditClick}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
              title="Edit asset"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteClick}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
              title="Delete asset"
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }
);

// Add display name for debugging
AssetRow.displayName = "AssetRow";

export default function RawAssetsTab() {
  const pathname = usePathname();
  const router = useRouter();
  const { getParam, updateParams } = useUrlParams();
  const { fetchCarLabels, fetchDriveLabels } = useLabels();
  const api = useAPI();
  const [assets, setAssets] = useState<RawAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<RawAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    "timeout" | "connection" | "resource" | "other" | null
  >(null);
  const [searchTerm, setSearchTerm] = useState(() => {
    return getParam("search") || "";
  });

  // Separate state for the input field to prevent excessive API calls
  const [searchInput, setSearchInput] = useState(() => {
    return getParam("search") || "";
  });

  const [currentPage, setCurrentPage] = useState(() => {
    const page = getParam("page");
    return page ? parseInt(page) : 1;
  });

  const [totalPages, setTotalPages] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const limit = getParam("limit");
    return limit ? parseInt(limit) : 100;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<
    RawAssetData | undefined
  >();
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isEditingAsset, setIsEditingAsset] = useState(false);

  // Add a state for tracking retry attempts
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const maxRetries = 3;

  // Add a state for tracking if a timeout occurred
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);

  // Simplified prefetch function - batches car and drive IDs with minimal logging
  const prefetchLabels = useCallback(
    (assets: RawAsset[]) => {
      if (!assets?.length) return;

      // Single-pass collection of unique IDs
      const carIds = new Set<string>();
      const driveIds = new Set<string>();

      // Collect all unique IDs
      assets.forEach((asset) => {
        // Add car IDs to the set
        if (asset.carIds?.length) {
          asset.carIds.forEach((id) => {
            if (id) carIds.add(id.toString());
          });
        }

        // Add drive IDs to the set
        if (asset.hardDriveIds?.length) {
          asset.hardDriveIds.forEach((id) => {
            if (id) driveIds.add(id.toString());
          });
        }
      });

      // Queue batch fetches without causing immediate API calls
      if (carIds.size) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Prefetching ${carIds.size} car labels`);
        fetchCarLabels(Array.from(carIds));
      }

      if (driveIds.size) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Prefetching ${driveIds.size} hard drive labels`);
        fetchDriveLabels(Array.from(driveIds));
      }
    },
    [fetchCarLabels, fetchDriveLabels]
  );

  // Modified fetch assets function with better error handling and retries
  const fetchAssets = useCallback(
    async (isRetry = false) => {
      if (!isRetry) {
        setLoading(true);
        setError(null);
        setErrorType(null);
        setTimeoutOccurred(false);
      }

      // Use a unique timer name for each fetch attempt to avoid conflicts
      const timerName = `fetch-raw-assets-${Date.now()}`;

      try {
        console.time(timerName);
        console.log(
          `Fetching raw assets (attempt ${
            fetchAttempts + 1
          }): page=${currentPage}, limit=${itemsPerPage}, search=${searchTerm}`
        );

        // Use an increasing timeout based on retry attempts
        const timeout = 30000 + fetchAttempts * 15000; // Increased timeouts: 30s, 45s, 60s
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Using timeout of ${timeout}ms for this request`);

        // Get the current URL search parameters
        const hardDriveId = getParam("hardDriveId") || "";

        // Build the query URL with proper encoding
        let queryUrl = `/api/raw?page=${currentPage}&limit=${itemsPerPage}`;

        if (searchTerm) {
          queryUrl += `&search=${encodeURIComponent(searchTerm)}`;
        }

        if (hardDriveId) {
          queryUrl += `&hardDriveId=${encodeURIComponent(hardDriveId)}`;
        }

        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Fetching from URL:", queryUrl);

        // Use the fetchWithTimeout function
        const response = await fetchWithTimeout(queryUrl, {}, timeout);

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.timeEnd(timerName);

        // Log the API response structure to help debug
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Raw Assets API Response structure:", Object.keys(data));
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Raw Assets meta:", data.meta);

        // Log debug info if available
        if (data.debug) {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Raw assets API debug info:", data.debug);
        }

        // Add better data validation before setting state
        const assetsList = Array.isArray(data.data) ? data.data : [];
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Received ${assetsList.length} raw assets`);

        // Add defensive check to ensure each asset has required properties
        const sanitizedAssets = assetsList.map((asset: any) => ({
          ...asset,
          _id: asset._id || "",
          date: asset.date || "Unknown Date",
          description: asset.description || "",
          hardDriveIds: Array.isArray(asset.hardDriveIds)
            ? asset.hardDriveIds
            : [],
          carIds: Array.isArray(asset.carIds) ? asset.carIds : [],
          hardDrives: Array.isArray(asset.hardDrives) ? asset.hardDrives : [],
        }));

        setAssets(sanitizedAssets);
        setTotalPages(data.meta?.totalPages || 1);
        setFetchAttempts(0); // Reset attempts on success
        setTimeoutOccurred(false);
        setLoading(false);

        // Prefetch all labels after assets are loaded
        if (sanitizedAssets.length > 0) {
          console.log(
            `Successfully loaded ${sanitizedAssets.length} assets, prefetching labels`
          );
          prefetchLabels(sanitizedAssets);
        }
      } catch (error: any) {
        // Rest of error handling code remains unchanged...
        // Make sure we end the timer even if there's an error
        try {
          console.timeEnd(timerName);
        } catch (timerError) {
          // Timer might not exist if this is a retry attempt, ignore the error
        }

        console.error("Error fetching raw assets:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check if this was an abort error (timeout)
        const isTimeout =
          error instanceof Error &&
          (error.name === "AbortError" || errorMessage.includes("timed out"));

        // Check if the error is a connection issue
        const isConnectionError =
          errorMessage.includes("connection") ||
          errorMessage.includes("ECONNREFUSED") ||
          errorMessage.includes("network") ||
          errorMessage.includes("MongoDB");

        // Check if this is a resource constraint error
        const isResourceError = errorMessage.includes(
          "ERR_INSUFFICIENT_RESOURCES"
        );

        if (isTimeout) {
          setTimeoutOccurred(true);
          setErrorType("timeout");
          console.warn("Request timed out while fetching raw assets");
        } else if (isConnectionError) {
          setErrorType("connection");
          console.warn("Database connection error detected");
        } else if (isResourceError) {
          setErrorType("resource");
          console.warn(
            "Resource constraint error detected - server or browser may be overloaded"
          );
        } else {
          setErrorType("other");
        }

        // Increment retry attempts and retry if we haven't exceeded the limit
        if (fetchAttempts < maxRetries) {
          setLoading(true);
          const nextAttempt = fetchAttempts + 1;
          setFetchAttempts(nextAttempt);
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Retry attempt ${nextAttempt} of ${maxRetries}`);

          // Exponential backoff for retries with jitter for resource errors
          // Add extra backoff time for resource errors
          const baseDelay = Math.pow(2, nextAttempt - 1) * 1000;
          const jitter = Math.random() * 1000;
          const resourceMultiplier = isResourceError ? 2 : 1;
          const backoffDelay = baseDelay * resourceMultiplier + jitter;

          console.log(
            `Waiting ${backoffDelay}ms before retry (${
              isResourceError ? "with resource error penalty" : "normal backoff"
            })`
          );

          setTimeout(() => {
            fetchAssets(true); // Pass true to indicate this is a retry
          }, backoffDelay);
        } else {
          console.error(
            `Max retry attempts (${maxRetries}) reached. Giving up.`
          );

          // Set appropriate error message based on error type
          let userErrorMessage = `Failed to load assets after ${maxRetries} attempts. `;

          if (isResourceError) {
            userErrorMessage +=
              "The server or browser doesn't have enough resources. Try reducing the page size or try again later.";
          } else if (isTimeout) {
            userErrorMessage +=
              "Requests are timing out. The server may be under heavy load.";
          } else if (isConnectionError) {
            userErrorMessage +=
              "Cannot connect to the server. Please check your network connection.";
          } else {
            userErrorMessage += errorMessage;
          }

          setError(userErrorMessage);
          setLoading(false);
        }
      }
    },
    [
      fetchAttempts,
      itemsPerPage,
      currentPage,
      searchTerm,
      getParam,
      prefetchLabels,
      maxRetries,
    ]
  );

  // Function to fetch a specific asset by ID
  const fetchAssetById = useCallback(
    async (assetId: string) => {
      if (!api) return;

      try {
        const asset = await api.get<any>(`/raw/${assetId}`);

        if (!asset || !asset._id) {
          throw new Error(`Asset not found: ${assetId}`);
        }

        // Convert the asset to the format needed for the details modal
        const rawAssetData: RawAssetData = {
          _id: asset._id as unknown as ObjectId,
          date: asset.date || "Unknown Date",
          description: asset.description || "",
          hardDriveIds: Array.isArray(asset.hardDriveIds)
            ? asset.hardDriveIds.map((id: string) => id as unknown as ObjectId)
            : [],
          carIds: Array.isArray(asset.carIds) ? asset.carIds : [],
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt,
        };

        // If edit=true is in the URL, open the edit modal
        const isEdit = getParam("edit") === "true";
        if (isEdit) {
          setSelectedAssetForDetails(rawAssetData);
          setIsEditModalOpen(true);
        } else {
          setSelectedAssetForDetails(rawAssetData);
          setIsDetailsModalOpen(true);
        }

        // Let the useEffect handle label fetching instead of doing it here
      } catch (error) {
        console.error(`Error fetching asset ${assetId}:`, error);
        toast.error("Failed to fetch asset details");
      }
    },
    [getParam, api] // Added api to dependencies
  );

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
  }, [totalPages, currentPage]);

  // Enhanced effect to handle asset parameter from URL, especially when coming from other tabs
  useEffect(() => {
    const selectedAssetId = getParam("asset");
    const isEdit = getParam("edit") === "true";

    // Skip processing if no asset ID is specified or if we're explicitly
    // closing the modal (when both asset and isEdit are missing/false)
    if (!selectedAssetId) {
      // If no asset selected in URL and modal is open, close it
      if (isEditModalOpen && !isEdit) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Closing edit modal due to URL parameter changes");
        setIsEditModalOpen(false);
      }
      return;
    }

    console.log(
      "RawAssetsTab - Found asset param in URL:",
      selectedAssetId,
      "isEdit:",
      isEdit
    );

    // If we have assets loaded, find the asset and show modal
    if (assets.length > 0) {
      const asset = assets.find((a) => a._id === selectedAssetId);

      if (asset) {
        if (isEdit) {
          setSelectedAssetId(asset._id);
          // Only set the asset data if the edit modal is not already open
          // This prevents overwriting the current edit with stale data
          if (!isEditModalOpen) {
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Opening edit modal for asset:", asset._id);
            const rawAssetData: RawAssetData = {
              _id: asset._id as unknown as ObjectId,
              date: asset.date,
              description: asset.description,
              hardDriveIds: asset.hardDriveIds.map(
                (id) => id as unknown as ObjectId
              ),
              carIds: asset.carIds,
            };
            setSelectedAssetForDetails(rawAssetData);
            setIsEditModalOpen(true);
          }
        } else if (!isDetailsModalOpen) {
          // Only set the details if the details modal is not already open
          setSelectedAssetForDetails({
            _id: asset._id as unknown as ObjectId,
            date: asset.date,
            description: asset.description,
            hardDriveIds: asset.hardDriveIds.map(
              (id) => id as unknown as ObjectId
            ),
            carIds: asset.carIds,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          });
          setIsDetailsModalOpen(true);
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Opening details modal for asset:", asset._id);
        }
      } else {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Asset not found in loaded assets, fetching from API");
        // Asset not found in currently loaded assets, fetch it directly
        fetchAssetById(selectedAssetId);
      }
    } else {
      // If assets aren't loaded yet, fetch the specific asset
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Assets not loaded yet, fetching specific asset");
      fetchAssetById(selectedAssetId);
    }
  }, [assets, getParam, isEditModalOpen, isDetailsModalOpen]); // Removed fetchAssetById from dependencies

  // Handle addAsset parameter from URL
  useEffect(() => {
    const addAsset = getParam("addAsset");
    if (addAsset === "true" && !isAddingAsset) {
      setIsAddingAsset(true);
    }
  }, [getParam, isAddingAsset]);

  // Load assets when the component mounts or when search/pagination changes
  useEffect(() => {
    // Don't call fetchAssets when component mounts if we're already loading or have assets
    // Only fetch when currentPage or itemsPerPage changes
    fetchAssets();

    // This dependency array should NOT include fetchAssets itself to prevent infinite loops
  }, [currentPage, itemsPerPage]); // Removed fetchAssets from dependency array

  // Filter assets locally based on search term
  const filterAssets = useCallback((assets: RawAsset[], term: string) => {
    if (!term.trim()) {
      return assets;
    }

    const searchLower = term.toLowerCase();
    return assets.filter((asset) => {
      // Check date
      if (asset.date && asset.date.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Check description
      if (
        asset.description &&
        asset.description.toLowerCase().includes(searchLower)
      ) {
        return true;
      }

      // Check cars
      if (Array.isArray(asset.cars) && asset.cars.length > 0) {
        for (const car of asset.cars) {
          const carString = `${car.year} ${car.make} ${car.model} ${
            car.color || ""
          }`.toLowerCase();
          if (carString.includes(searchLower)) {
            return true;
          }
        }
      }

      // We don't check hard drive IDs here as they need to be fetched and resolved first

      return false;
    });
  }, []);

  // Update filtered assets whenever assets or search term changes
  useEffect(() => {
    setFilteredAssets(filterAssets(assets, searchTerm));
  }, [assets, searchTerm, filterAssets]);

  // Create a properly debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      // Update URL parameter and trigger search
      updateParams({ search: value || null, page: "1" });
      setSearchTerm(value);
      setCurrentPage(1);
    }, 500),
    [updateParams]
  );

  // Handle search input change
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      updateParams({ page: page.toString() });
    },
    [updateParams]
  );

  // Handle items per page change
  const handleLimitChange = useCallback(
    (limit: number) => {
      setItemsPerPage(limit);
      setCurrentPage(1);
      updateParams({ limit: limit.toString(), page: "1" });
    },
    [updateParams]
  );

  // Handle asset click to open details
  const handleAssetClick = useCallback(
    (assetId: string) => {
      updateParams({ asset: assetId, edit: null });
    },
    [updateParams]
  );

  // Handle edit button click
  const handleEdit = useCallback(
    (asset: RawAsset) => {
      updateParams({ asset: asset._id, edit: "true" });
    },
    [updateParams]
  );

  // Handle delete button click
  const handleDelete = useCallback(
    async (assetId: string) => {
      if (!api) return;
      if (!window.confirm("Are you sure you want to delete this asset?"))
        return;

      try {
        await api.delete(`/raw/${assetId}`);

        // Remove from local state
        setAssets((prev) => prev.filter((a) => a._id !== assetId));
        toast.success("Asset deleted successfully");
      } catch (error) {
        console.error(`Error deleting asset ${assetId}:`, error);
        toast.error("Failed to delete asset");
      }
    },
    [api]
  );

  // Handle bulk delete function
  const handleDeleteAll = useCallback(async () => {
    if (!api) return;
    if (
      !window.confirm(
        "Are you sure you want to delete ALL assets? This cannot be undone!"
      )
    )
      return;
    if (
      !window.confirm(
        "This is EXTREMELY destructive and will remove ALL raw assets. Please confirm again to proceed."
      )
    )
      return;

    try {
      setLoading(true);
      await api.delete("/raw/delete-all");

      // Clear local state
      setAssets([]);
      setTotalPages(1);
      setCurrentPage(1);
      toast.success("All assets have been deleted");
    } catch (error) {
      console.error("Error deleting all assets:", error);
      toast.error("Failed to delete all assets");
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Handle closing the edit modal
  const handleCloseModal = useCallback(() => {
    setIsEditModalOpen(false);
    updateParams({ asset: null, edit: null });
  }, [updateParams]);

  // Handle save from edit modal
  const handleSave = useCallback(
    async (updatedAsset: Partial<RawAssetData>) => {
      if (!api) return;

      try {
        if (!updatedAsset._id) {
          throw new Error("Missing asset ID");
        }

        const result = await api.put<any>(
          `/raw/${updatedAsset._id}`,
          updatedAsset
        );

        // Make sure we have a valid result before proceeding
        if (!result || typeof result !== "object") {
          console.error("Received invalid response format:", result);
          throw new Error("Received invalid response from server");
        }

        // Get the updated data from the response
        const updatedData = result;

        // Update the local state with the returned data from the server
        setAssets((prev) =>
          prev.map((asset) =>
            asset._id === updatedAsset._id?.toString()
              ? {
                  ...asset,
                  date: updatedData.date || asset.date,
                  description: updatedData.description || asset.description,
                  hardDriveIds: Array.isArray(updatedData.hardDriveIds)
                    ? updatedData.hardDriveIds.map((id: any) =>
                        typeof id === "string" ? id : id.toString()
                      )
                    : asset.hardDriveIds,
                  carIds: Array.isArray(updatedData.carIds)
                    ? updatedData.carIds.map((id: any) =>
                        typeof id === "string" ? id : id.toString()
                      )
                    : asset.carIds,
                  cars: asset.cars, // Preserve existing cars data
                }
              : asset
          )
        );

        // Refresh labels for any new IDs
        if (
          Array.isArray(updatedData.hardDriveIds) &&
          updatedData.hardDriveIds.length > 0
        ) {
          fetchDriveLabels(
            updatedData.hardDriveIds.map((id: any) =>
              typeof id === "string" ? id : id.toString()
            )
          );
        }

        if (
          Array.isArray(updatedData.carIds) &&
          updatedData.carIds.length > 0
        ) {
          fetchCarLabels(
            updatedData.carIds.map((id: any) =>
              typeof id === "string" ? id : id.toString()
            )
          );
        }

        // Close the modal
        handleCloseModal();

        toast.success("Asset updated successfully");
      } catch (error) {
        console.error("Error updating asset:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to update asset"
        );
      }
    },
    [handleCloseModal, fetchCarLabels, fetchDriveLabels, api]
  );

  // Handle adding a new asset
  const handleAddAssetClick = useCallback(() => {
    updateParams({ addAsset: "true" });
  }, [updateParams]);

  // Handle close add asset modal
  const handleCloseAddAsset = useCallback(() => {
    setIsAddingAsset(false);
    updateParams({ addAsset: null });
  }, [updateParams]);

  // Handle add asset
  const handleAddAsset = useCallback(
    async (newAsset: RawAssetData) => {
      if (!api) return;

      try {
        const result = await api.post<any>("/raw", newAsset);

        if (!result.ok) {
          throw new Error("Failed to add asset");
        }

        // Close the modal and refresh the list
        handleCloseAddAsset();
        fetchAssets();

        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Asset added successfully");
      } catch (error) {
        console.error("Error adding asset:", error);
        toast.error("Failed to add asset");
      }
    },
    [handleCloseAddAsset, fetchAssets, api]
  );

  // Add authentication check
  if (!api) {
    return <LoadingContainer />;
  }

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        {fetchAttempts > 0 && (
          <p className="mb-4 text-muted-foreground">
            Loading... (attempt {fetchAttempts} of {maxRetries})
          </p>
        )}
        <LoadingContainer fullHeight />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Raw Assets</h2>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={handleAddAssetClick}
              className="space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Asset</span>
            </Button>
            <Button
              onClick={() => setIsImportModalOpen(true)}
              className="space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Import Assets</span>
            </Button>
          </div>
        </div>

        <div className="p-6 mt-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Error Loading Assets
          </h3>
          <p className="text-destructive/80 mb-4">{error}</p>
          {fetchAttempts >= maxRetries && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                This could be due to connection issues with the database or high
                server load. You can try the following:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4">
                <li>Try refreshing the page</li>
                <li>Check your network connection</li>

                {errorType === "resource" && (
                  <>
                    <li>Try reducing the page size (items per page)</li>
                    <li>
                      Close other browser tabs that might be using resources
                    </li>
                    <li>Wait a few minutes for the server load to decrease</li>
                  </>
                )}

                {errorType === "timeout" && (
                  <li>The server might be under heavy load, try again later</li>
                )}

                {errorType === "connection" && (
                  <li>Check if your internet connection is stable</li>
                )}

                {timeoutOccurred && (
                  <li>Check if the database connection needs attention</li>
                )}
              </ul>

              {errorType === "resource" && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-md mb-4">
                  <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-1">
                    Resource Constraint Detected
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    The server or browser doesn't have enough resources to
                    process this request. Try selecting a smaller page size from
                    the dropdown above or try again later when the system is
                    under less load.
                  </p>
                </div>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setFetchAttempts(0);
                fetchAssets();
              }}
            >
              Try Again
            </Button>

            {errorType === "resource" && (
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => {
                  // Set a smaller page size and retry
                  const smallerPageSize = Math.max(
                    10,
                    Math.floor(itemsPerPage / 2)
                  );
                  handleLimitChange(smallerPageSize);
                }}
              >
                Try With Smaller Page Size
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchInput}
            onChange={handleSearch}
            placeholder="Search by date, description, storage location, car year, make, model, or color..."
            className="w-full px-4 py-2 pl-10 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
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

        <div className="flex gap-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddAssetClick}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Asset</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsImportModalOpen(true)}
                >
                  <FolderIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import CSV</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDeleteAll}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete All</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
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
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No assets found
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => (
                <AssetRow
                  key={asset._id?.toString() || Math.random().toString()}
                  asset={asset}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={handleAssetClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredAssets.length > 0 && (
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
