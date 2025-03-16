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
  carIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const fetchWithTimeout = async (url: string, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const { signal } = controller;

  console.log(`Starting fetch with ${timeout}ms timeout: ${url}`);
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
    throw error;
  }
};

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
  const [carLabels, setCarLabels] = useState<Record<string, string>>({});
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

    // Skip processing if no asset ID is specified or if we're explicitly
    // closing the modal (when both asset and isEdit are missing/false)
    if (!selectedAssetId) {
      // If no asset selected in URL and modal is open, close it
      if (isEditModalOpen && !isEdit) {
        console.log("Closing edit modal due to URL parameter changes");
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
            console.log("Opening edit modal for asset:", asset._id);
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
          console.log("Opening details modal for asset:", asset._id);
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
  }, [assets, getParam, isEditModalOpen, isDetailsModalOpen]);

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

  const fetchCarLabels = useCallback(async (carIds: string[]) => {
    if (!carIds.length) return {};

    try {
      console.log("Fetching car labels for IDs:", carIds);
      const response = await fetch(`/api/cars?ids=${carIds.join(",")}`);
      if (!response.ok) {
        console.warn(`Failed to fetch car labels: ${response.statusText}`);
        return {};
      }
      const data = await response.json();
      console.log("Received car data:", data);

      const labels: Record<string, string> = {};
      data.cars.forEach((car: any) => {
        // Create human-readable label from car properties
        const year = car.year || "";
        const make = car.make || "";
        const model = car.model || "";
        const color = car.exteriorColor || car.color || "";

        // Format: "2020 Tesla Model 3 (Red)"
        let label = [year, make, model].filter(Boolean).join(" ");
        if (color) label += ` (${color})`;

        // Important: Ensure the key is a string to avoid type mismatches
        const carIdStr = car._id.toString();

        // If no car details available, use ID or placeholder
        labels[carIdStr] = label || `Car ${carIdStr}`;
        console.log(`Set label for car ${carIdStr}: ${labels[carIdStr]}`);
      });

      return labels;
    } catch (error) {
      console.warn(`Error fetching car labels:`, error);
      return {};
    }
  }, []);

  // Modified fetch assets function with better error handling and retries
  const fetchAssets = useCallback(
    async (isRetry = false) => {
      if (!isRetry) {
        setLoading(true);
        setError(null);
        setTimeoutOccurred(false);
      }

      try {
        console.time("fetch-raw-assets");
        console.log(
          `Fetching raw assets (attempt ${
            fetchAttempts + 1
          }): page=${currentPage}, limit=${itemsPerPage}, search=${searchTerm}`
        );

        // Use an increasing timeout based on retry attempts
        const timeout = 20000 + fetchAttempts * 10000; // 20s, 30s, 40s...
        console.log(`Using timeout of ${timeout}ms for this request`);

        // Use the fetchWithTimeout function
        const response = await fetchWithTimeout(
          `/api/raw?page=${currentPage}&limit=${itemsPerPage}${
            searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""
          }`,
          {},
          timeout
        );

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.timeEnd("fetch-raw-assets");

        // Log debug info if available
        if (data.debug) {
          console.log("Raw assets API debug info:", data.debug);
        }

        // Add better data validation before setting state
        const assetsList = Array.isArray(data.data) ? data.data : [];
        console.log(`Received ${assetsList.length} raw assets`);

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
        }));

        setAssets(sanitizedAssets);
        setTotalPages(data.meta?.totalPages || 1);
        setFetchAttempts(0); // Reset attempts on success
        setTimeoutOccurred(false);
        setLoading(false);

        // Fetch labels for all cars and hard drives after assets are loaded
        const allCarIds = new Set<string>();
        const allDriveIds = new Set<string>();

        // Collect all unique car and drive IDs
        sanitizedAssets.forEach((asset: RawAsset) => {
          if (asset.carIds && asset.carIds.length) {
            asset.carIds.forEach((id: string) => allCarIds.add(id.toString()));
          }
          if (asset.hardDriveIds && asset.hardDriveIds.length) {
            asset.hardDriveIds.forEach((id: string) =>
              allDriveIds.add(id.toString())
            );
          }
        });

        console.log("Fetching labels for all assets");
        // Fetch labels for all cars and drives in the list
        if (allCarIds.size > 0) {
          const carIds = Array.from(allCarIds);
          console.log(`Fetching labels for ${carIds.length} cars`);
          fetchCarLabels(carIds).then((newLabels) => {
            setCarLabels((prevLabels) => ({ ...prevLabels, ...newLabels }));
          });
        }

        if (allDriveIds.size > 0) {
          const driveIds = Array.from(allDriveIds);
          console.log(`Fetching labels for ${driveIds.length} drives`);
          fetchDriveLabelsForAsset(driveIds);
        }
      } catch (error) {
        // Make sure we end the timer even if there's an error
        try {
          console.timeEnd("fetch-raw-assets");
        } catch (timerError) {
          // Timer might not exist if this is a retry attempt, ignore the error
        }

        console.error("Error fetching raw assets:", error);

        // Check if this was an abort error (timeout)
        const isTimeout =
          error instanceof Error &&
          (error.name === "AbortError" || error.message.includes("timed out"));

        // Check if the error is a connection issue
        const isConnectionError =
          error instanceof Error &&
          (error.message.includes("connection") ||
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("network") ||
            error.message.includes("MongoDB"));

        if (isTimeout) {
          setTimeoutOccurred(true);
          console.warn("Request timed out while fetching raw assets");
        } else if (isConnectionError) {
          console.warn("Database connection error detected");
        }

        // Try to extract any debug info from the response
        let debugInfo = {};
        try {
          if (error instanceof Error && "response" in error) {
            const responseData = await (error as any).response?.json();
            if (responseData?.debug) {
              debugInfo = responseData.debug;
              console.log(
                "Extracted debug info from error response:",
                debugInfo
              );
            }
          }
        } catch (e) {
          console.log("Could not extract debug info from error");
        }

        // If we haven't exceeded max retries, try again
        if (fetchAttempts < maxRetries) {
          const nextAttempt = fetchAttempts + 1;
          console.log(
            `Retrying fetch (attempt ${nextAttempt} of ${maxRetries})...`
          );
          setFetchAttempts(nextAttempt);

          // Wait longer between retries with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, fetchAttempts), 10000);
          console.log(`Waiting ${delay}ms before retry...`);

          setTimeout(() => {
            fetchAssets(true); // Pass true to indicate this is a retry
          }, delay);

          // Update error message to be more user-friendly
          if (fetchAttempts === 0) {
            setError(
              isTimeout
                ? "Loading is taking longer than expected. Retrying..."
                : isConnectionError
                ? `Database connection issue. Retrying... (${
                    error instanceof Error ? error.message : "Unknown error"
                  })`
                : `Loading error: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }. Retrying...`
            );
          } else {
            setError(
              `Still trying to load (attempt ${nextAttempt} of ${maxRetries})...${
                isTimeout
                  ? " The server is taking longer than expected to respond."
                  : isConnectionError
                  ? " Database connection issues persist."
                  : ""
              }`
            );
          }
        } else {
          // Max retries exceeded, show final error
          const errorMessage = isTimeout
            ? "Request timed out. The server might be under heavy load or the database connection may be having issues."
            : isConnectionError
            ? `Database connection failed: ${
                error instanceof Error ? error.message : "Unknown error"
              }. Please check your database settings or network connection.`
            : `Failed to load raw assets: ${
                error instanceof Error ? error.message : "Unknown error"
              }`;

          console.error("All retries failed. Final error:", errorMessage);
          setError(errorMessage);
          setLoading(false);
        }
      }
    },
    [currentPage, itemsPerPage, searchTerm, fetchAttempts, maxRetries]
  );

  // Replace the existing useEffect for fetching assets with this improved version
  useEffect(() => {
    setFetchAttempts(0); // Reset attempts when parameters change
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
      };
      setSelectedAssetId(asset._id);
      setSelectedAssetForDetails(rawAssetData);
      setIsEditModalOpen(true);
      updateParams({ asset: asset._id?.toString() || null, edit: "true" });
    }, 50);
  };

  const handleCloseModal = () => {
    console.log("Closing edit modal");

    // First close the modal in the state
    setIsEditModalOpen(false);
    setSelectedAssetId(null);
    setSelectedAssetForDetails(undefined);

    // Then clear both the asset and edit parameters from the URL
    // This is crucial to prevent the modal from reopening due to URL parameters
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

  const handleSave = async (assetData: Partial<RawAssetData>) => {
    try {
      const method = selectedAssetId ? "PUT" : "POST";
      const url = selectedAssetId ? `/api/raw/${selectedAssetId}` : "/api/raw";

      // Create a clean data object without any extra fields
      const cleanData = {
        ...assetData,
        carIds: assetData.carIds || [],
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanData),
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
        fetchDriveLabelsForAsset(asset);
      }

      // Also fetch car labels for this asset
      if (asset.carIds && asset.carIds.length > 0) {
        const carLabelsResult = await fetchCarLabels(asset.carIds as string[]);
        setCarLabels((prevLabels) => ({ ...prevLabels, ...carLabelsResult }));
      }
    } catch (err) {
      console.error("Error fetching asset:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch asset");
    } finally {
      setLoading(false);
    }
  };

  // Add individual drive fetching as a last resort
  const fetchIndividualDrive = useCallback(async (driveId: string) => {
    try {
      console.log(`Fetching individual drive: ${driveId}`);
      const response = await fetch(`/api/hard-drives/${driveId}`);

      if (!response.ok) {
        console.warn(
          `Failed to fetch individual drive ${driveId}: ${response.statusText}`
        );
        return;
      }

      const data = await response.json();
      console.log(`Received individual drive data:`, data);

      let drive = data;

      // Handle different response formats
      if (data.data && typeof data.data === "object") {
        drive = data.data;
      } else if (data.drive && typeof data.drive === "object") {
        drive = data.drive;
      }

      if (drive && drive._id) {
        const driveIdStr = drive._id.toString();

        // Try to extract a meaningful label using all possible fields
        const label =
          drive.label ||
          drive.name ||
          drive.systemName ||
          `Drive ${driveIdStr.substring(0, 8)}`;

        console.log(
          `Individual fetch for drive ${driveIdStr} got label: ${label}`
        );

        // Update just this one drive label
        setDriveLabels((prevLabels) => ({
          ...prevLabels,
          [driveIdStr]: label,
        }));
      } else {
        console.warn(`No valid drive data found for ID ${driveId}`, drive);
      }
    } catch (error) {
      console.error(`Error fetching individual drive ${driveId}:`, error);
    }
  }, []);

  // Utility function to get drive label, with fallback
  const getDriveLabel = useCallback(
    (driveId: string): string => {
      if (!driveId) return "Unknown Drive";

      const label = driveLabels[driveId];
      if (label) return label;

      // If we don't have a label yet, trigger individual fetch and return fallback
      fetchIndividualDrive(driveId).catch(console.error);
      return `Drive ${driveId.substring(0, 8)}...`;
    },
    [driveLabels, fetchIndividualDrive]
  );

  // Function to fetch drive labels for a specific asset
  const fetchDriveLabelsForAsset = useCallback(
    async (asset: any) => {
      if (!asset) return;

      const driveIds = asset.hardDriveIds || [];
      if (!Array.isArray(driveIds) || driveIds.length === 0) {
        console.log("Asset has no drive IDs", asset);
        return;
      }

      console.log(`Fetching labels for ${driveIds.length} drives`);

      // Format IDs to strings
      const formattedDriveIds = driveIds
        .map((id) => (typeof id === "string" ? id : id?.toString()))
        .filter(Boolean); // Remove any null/undefined values

      try {
        // First check if we already have the labels
        const missingLabels = formattedDriveIds.filter(
          (id) => !driveLabels[id]
        );

        if (missingLabels.length === 0) {
          console.log("All drive labels already cached");
          return;
        }

        console.log(`Fetching ${missingLabels.length} missing drive labels`);

        // Try batch fetch first
        const response = await fetch(
          `/api/hard-drives?ids=${missingLabels.join(",")}`
        );

        if (!response.ok) {
          console.warn(
            "Batch fetch failed, falling back to individual fetches"
          );
          // Fall back to individual fetches
          await Promise.all(missingLabels.map(fetchIndividualDrive));
          return;
        }

        const data = await response.json();

        // Process different response formats
        let drivesList = [];
        if (data.data && Array.isArray(data.data)) {
          drivesList = data.data;
        } else if (data.drives && Array.isArray(data.drives)) {
          drivesList = data.drives;
        } else if (Array.isArray(data)) {
          drivesList = data;
        }

        if (!Array.isArray(drivesList) || drivesList.length === 0) {
          console.warn("No drives found in response");
          return;
        }

        // Update labels
        const newLabels = { ...driveLabels };
        drivesList.forEach((drive) => {
          if (drive && drive._id) {
            const driveIdStr =
              typeof drive._id === "string" ? drive._id : drive._id.toString();
            const label =
              drive.label ||
              drive.name ||
              drive.systemName ||
              `Drive ${driveIdStr.substring(0, 8)}`;
            newLabels[driveIdStr] = label;
          }
        });

        setDriveLabels(newLabels);
      } catch (error) {
        console.error("Error fetching drive labels:", error);
      }
    },
    [driveLabels, fetchIndividualDrive]
  );

  // Add effect to prefetch all drive labels when component mounts
  useEffect(() => {
    const prefetchAllDrives = async () => {
      try {
        console.log("Prefetching all drive labels on component mount");
        // Try to get all drives without pagination limits
        const response = await fetch(`/api/hard-drives?limit=500`);

        if (!response.ok) {
          console.warn("Failed to prefetch drive labels");
          return;
        }

        const data = await response.json();
        console.log("Drive prefetch response structure:", Object.keys(data));

        // Find the drives data in the response
        let drivesList = [];
        if (data.data && Array.isArray(data.data)) {
          console.log(`Found ${data.data.length} drives in data.data`);
          drivesList = data.data;
        } else if (data.drives && Array.isArray(data.drives)) {
          console.log(`Found ${data.drives.length} drives in data.drives`);
          drivesList = data.drives;
        } else if (Array.isArray(data)) {
          console.log(`Found ${data.length} drives in direct array`);
          drivesList = data;
        } else {
          console.warn(
            "Unexpected API response format, no drives found:",
            data
          );
          return;
        }

        // Safely transform the drivesList
        const labels: Record<string, string> = {};

        if (!Array.isArray(drivesList)) {
          console.warn("drivesList is not an array:", drivesList);
          setDriveLabels({});
          return;
        }

        drivesList.forEach((drive) => {
          if (drive && drive._id) {
            const driveIdStr =
              typeof drive._id === "string" ? drive._id : drive._id.toString();

            // Try multiple possible label fields
            const driveLabel =
              drive.label ||
              drive.name ||
              drive.systemName ||
              `Drive ${driveIdStr.substring(0, 8)}`;

            if (driveLabel) {
              labels[driveIdStr] = driveLabel;
              console.log(
                `Set label for drive ${driveIdStr}: ${labels[driveIdStr]}`
              );
            }
          }
        });

        console.log(`Prefetched ${Object.keys(labels).length} drive labels`);
        setDriveLabels(labels);
      } catch (error) {
        console.error("Error prefetching drive labels:", error);
        // Don't set an empty object here, keep any previous labels we might have
      }
    };

    prefetchAllDrives();
  }, []);

  // Modify the render function to handle the timeout state
  // Add this JSX before the main content rendering (after the loading check)

  if (loading) {
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

        <div className="mt-8">
          {fetchAttempts > 0 && (
            <p className="text-center mb-4 text-gray-500 dark:text-gray-400">
              Loading... (attempt {fetchAttempts} of {maxRetries})
            </p>
          )}
          <LoadingContainer fullHeight />
        </div>
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
                <li>Try again in a few minutes</li>
                {timeoutOccurred && (
                  <li>Check if the database connection needs attention</li>
                )}
              </ul>
            </>
          )}
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
        </div>
      </div>
    );
  }

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
                  <LoadingContainer />
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
                  key={asset._id?.toString() || Math.random().toString()}
                  className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  onClick={() => handleAssetClick(asset._id)}
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
                      {Array.isArray(asset.carIds) &&
                        asset.carIds.map((carId, index) => {
                          const carIdStr = carId.toString();
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
                            >
                              <CarIcon className="w-3 h-3" />
                              {carLabels[carIdStr] || "Unknown Car"}
                            </span>
                          );
                        })}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(asset.hardDriveIds) &&
                        asset.hardDriveIds.map((hardDriveId, index) => {
                          const hardDriveIdStr = hardDriveId
                            ? hardDriveId.toString()
                            : "";

                          // Get the actual drive label from our state
                          let driveLabel = getDriveLabel(hardDriveIdStr);

                          // Special handling for ARB_SHARED drives
                          if (!driveLabel && hardDriveIdStr.includes("ARB")) {
                            driveLabel = "ARB_SHARED";
                          }

                          // Format the full drive ID for display if needed
                          let formattedId = "";
                          if (hardDriveIdStr && hardDriveIdStr.length > 6) {
                            formattedId =
                              hardDriveIdStr.substring(0, 8) + "...";
                          }

                          // Show a descriptive label instead of just the ID
                          const displayLabel =
                            driveLabel ||
                            (formattedId ? `${formattedId}` : "Unknown Drive");

                          return (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
                            >
                              <HardDriveIcon className="w-3 h-3" />
                              {displayLabel}
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
