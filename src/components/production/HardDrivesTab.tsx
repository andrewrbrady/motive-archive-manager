import React, { useState, useEffect, useCallback } from "react";
import {
  HardDriveIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  MapPin,
  Search,
  Filter,
  Info,
  Edit,
  Trash2,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { HardDriveData } from "@/models/hard-drive";
import HardDriveModal from "./HardDriveModal";
import HardDriveDetailsModal from "./HardDriveDetailsModal";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LocationResponse } from "@/models/location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import { useUrlParams } from "@/hooks/useUrlParams";
import { PaginationWithUrl } from "@/components/ui/pagination-with-url";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LoadingContainer } from "@/components/ui/loading-container";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RawAssetDetail {
  _id: string;
  date: string;
  description: string;
}

interface HardDriveWithDetails extends HardDriveData {
  rawAssetDetails?: RawAssetDetail[];
  locationDetails?: {
    _id: string;
    name: string;
    type: string;
  };
}

const LIMIT_OPTIONS = [10, 25, 50, 100];

export default function HardDrivesTab() {
  const pathname = usePathname();
  const { getParam, updateParams } = useUrlParams();
  const searchParams = useSearchParams();
  const [drives, setDrives] = useState<HardDriveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
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
    return limit ? parseInt(limit) : 25;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<
    HardDriveWithDetails | undefined
  >();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDriveForDetails, setSelectedDriveForDetails] = useState<
    HardDriveWithDetails | undefined
  >();

  const currentView = (getParam("view") as "grid" | "list") || "list";
  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(null);
  const [isAddingDrive, setIsAddingDrive] = useState(false);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    const locationParam = getParam("location");
    return locationParam || "all";
  });

  const [hardDriveIds, setHardDriveIds] = useState<
    { _id: string; label: string }[]
  >([]);
  const [driveToDelete, setDriveToDelete] =
    useState<HardDriveWithDetails | null>(null);

  const router = useRouter();

  // First add fetchWithTimeout function at the top of the component but inside it
  const fetchWithTimeout = async (
    url: string,
    options = {},
    timeout = 30000
  ) => {
    const controller = new AbortController();
    const { signal } = controller;

    // [REMOVED] // [REMOVED] console.log(`Starting fetch with ${timeout}ms timeout: ${url}`);
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

  // Add retry state variables
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const maxRetries = 3;
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);

  // Handle Escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isDetailsModalOpen) {
          handleCloseDetails();
        }
        if (isModalOpen) {
          handleCloseModal();
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isDetailsModalOpen, isModalOpen]);

  // Fetch locations when component mounts
  useEffect(() => {
    fetchLocations();
  }, []);

  // Validate current page when total pages changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      handlePageChange(1);
    }
  }, [totalPages]);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchDriveDetailsById = async (driveId: string) => {
    try {
      setLoading(true);
      // [REMOVED] // [REMOVED] console.log(`Fetching details for drive ID: ${driveId}`);
      const response = await fetch(`/api/hard-drives/${driveId}`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch drive details (status ${response.status})`
        );
      }
      const driveData = await response.json();
      setSelectedDriveForDetails(driveData);
      // [REMOVED] // [REMOVED] console.log("Drive details loaded:", driveData);
    } catch (error) {
      console.error("Error fetching drive details:", error);
      toast({
        title: "Error",
        description: "Failed to load drive details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Modify the fetchDrives function to handle retries and timeouts
  const fetchDrives = async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
      setError(null);
      setTimeoutOccurred(false);
    }

    try {
      // [REMOVED] // [REMOVED] console.log(`Fetching hard drives (attempt ${fetchAttempts + 1})...`);

      let url = `/api/hard-drives?page=${currentPage}&search=${encodeURIComponent(
        searchTerm
      )}&limit=${itemsPerPage}&include_assets=true`;

      if (selectedLocation && selectedLocation !== "all") {
        url += `&location=${selectedLocation}`;
      }

      // Increase timeout for subsequent retries
      const timeout = 20000 + fetchAttempts * 10000; // 20s, 30s, 40s...
      // [REMOVED] // [REMOVED] console.log(`Using timeout of ${timeout}ms for hard drives request`);

      // Add explicit retry mechanism
      const maxRetries = 3;
      let currentAttempt = 0;
      let lastError = null;

      while (currentAttempt < maxRetries) {
        try {
          // Use standard fetch with timeout handled separately
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(
              `Server responded with ${response.status}: ${response.statusText}`
            );
          }

          const data = await response.json();

          // Debug info to console
          // [REMOVED] // [REMOVED] console.log("API Response data structure:", Object.keys(data));

          // Log debug information if available
          if (data.debug) {
            // [REMOVED] // [REMOVED] console.log("Hard drives API debug info:", data.debug);
          }

          // Try different possible response formats
          // First check standard format (data.data)
          let drivesList = [];

          if (data.data && Array.isArray(data.data)) {
            // [REMOVED] // [REMOVED] console.log(`Using data.data array with ${data.data.length} items`);
            drivesList = data.data;
          } else if (data.drives && Array.isArray(data.drives)) {
            console.log(
              `Using data.drives array with ${data.drives.length} items`
            );
            drivesList = data.drives;
          } else if (Array.isArray(data)) {
            console.log(
              `Using direct array response with ${data.length} items`
            );
            drivesList = data;
          } else {
            console.warn("Unexpected API response format:", data);
            drivesList = []; // Default to empty array
          }

          // Double-check that drivesList is actually an array
          if (!Array.isArray(drivesList)) {
            console.error(
              "drivesList is not an array after processing:",
              drivesList
            );
            drivesList = [];
          }

          console.log(
            `Received ${drivesList.length} hard drives out of ${
              data.meta?.total || 0
            } total`
          );

          // Add defensive check to ensure each drive has required properties
          const sanitizedDrives = drivesList.map((drive: any) => ({
            ...drive,
            _id: drive?._id?.toString() || Math.random().toString(), // Ensure we always have an ID
            label: drive?.label || drive?.name || "Unnamed Drive",
            type: drive?.type || "Unknown",
            interface: drive?.interface || "Unknown",
            capacity: drive?.capacity || { total: 0, used: 0 },
            status: drive?.status || "Unknown",
            locationDetails: drive?.locationDetails || null,
            rawAssetDetails: Array.isArray(drive?.rawAssetDetails)
              ? drive.rawAssetDetails
              : [],
          }));

          setDrives(sanitizedDrives);
          setTotalPages(data.meta?.totalPages || 1);
          setFetchAttempts(0); // Reset attempts on success
          setTimeoutOccurred(false);
          setLoading(false);

          // Successfully got data, break out of retry loop
          break;
        } catch (err) {
          currentAttempt++;
          lastError = err;
          console.warn(`Attempt ${currentAttempt}/${maxRetries} failed:`, err);

          if (currentAttempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            const retryDelay = 1000 * Math.pow(2, currentAttempt);
            // [REMOVED] // [REMOVED] console.log(`Retrying in ${retryDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      // If we exhausted all retries and still have an error, throw it
      if (currentAttempt === maxRetries && lastError) {
        throw lastError;
      }
    } catch (err) {
      console.error("Error fetching hard drives:", err);

      // Check if this was a timeout
      const isTimeout =
        err instanceof Error &&
        (err.name === "AbortError" ||
          err.message.includes("timed out") ||
          err.message.includes("abort"));

      // Check if the error is a connection issue
      const isConnectionError =
        err instanceof Error &&
        (err.message.includes("connection") ||
          err.message.includes("ECONNREFUSED") ||
          err.message.includes("network") ||
          err.message.includes("MongoDB"));

      if (isTimeout) {
        setTimeoutOccurred(true);
        console.warn("Request timed out while fetching hard drives");
      } else if (isConnectionError) {
        console.warn("Database connection error detected:", err.message);
      }

      // Provide a fallback empty array for drives to prevent mapping errors
      setDrives([]);
      setLoading(false);
      setError("Failed to load hard drives. Please try again.");

      // Try to extract any debug info from the response
      let debugInfo = {};
      try {
        if (err instanceof Error && "response" in err) {
          const responseData = await (err as any).response?.json();
          if (responseData?.debug) {
            debugInfo = responseData.debug;
            // [REMOVED] // [REMOVED] console.log("Extracted debug info from error response:", debugInfo);
          }
        }
      } catch (e) {
        // [REMOVED] // [REMOVED] console.log("Could not extract debug info from error");
      }
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [currentPage, itemsPerPage, searchTerm, selectedLocation]);

  // Synchronize component state with URL parameters
  useEffect(() => {
    const driveParam = getParam("drive");
    const templateParam = getParam("template");
    // [REMOVED] // [REMOVED] console.log("URL drive parameter changed:", driveParam);

    // If template parameter exists, remove it immediately as it shouldn't be in this tab
    if (templateParam) {
      // [REMOVED] // [REMOVED] console.log("HardDrivesTab: Removing unexpected template parameter");
      // Create an updates object that preserves all necessary parameters except template
      updateParams(
        { template: null },
        {
          preserveParams: [
            "tab",
            "drive",
            "page",
            "limit",
            "search",
            "location",
            "view",
          ],
          clearOthers: false,
        }
      );
    }

    if (driveParam) {
      // [REMOVED] // [REMOVED] console.log("Setting selectedDriveId from URL parameter:", driveParam);

      // Always update the selectedDriveId when the URL parameter changes
      setSelectedDriveId(driveParam);
      setIsDetailsModalOpen(true);

      // Always fetch drive details when navigating to this tab with a drive parameter
      // [REMOVED] // [REMOVED] console.log("Fetching drive details for:", driveParam);
      fetchDriveDetailsById(driveParam);
    } else if (!driveParam && selectedDriveId) {
      // Only clear the state if this wasn't triggered by our own handleViewDetails function
      // This prevents the immediate closing of the modal after setting the URL parameter
      // [REMOVED] // [REMOVED] console.log("Checking if we should clear selectedDriveId");

      // Add a small delay to avoid race conditions with URL updates
      const timeoutId = setTimeout(() => {
        // Check again if the parameter is still not present
        const currentDriveParam = getParam("drive");
        if (!currentDriveParam) {
          // [REMOVED] // [REMOVED] console.log("Clearing selectedDriveId as URL parameter is empty");
          setSelectedDriveId(null);
          setIsDetailsModalOpen(false);
          setSelectedDriveForDetails(undefined);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, selectedDriveId, getParam, fetchDriveDetailsById]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    updateParams({
      search: value || null,
      page: "1",
    });
  };

  const handleLocationChange = (value: string) => {
    const locationValue = value === "all" ? "" : value;
    setSelectedLocation(value);
    setCurrentPage(1);
    updateParams({
      location: value === "all" ? null : value,
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

  const handleViewChange = (view: "grid" | "list") => {
    updateParams({
      view,
    });
  };

  const handleViewDetails = (drive: HardDriveWithDetails) => {
    // Instead of showing a modal, navigate to the hard drive details page
    router.push(`/hard-drives/${drive._id?.toString()}`);
  };

  const handleCloseDetails = () => {
    // Don't do anything if the modal is already closed
    if (!isDetailsModalOpen && !selectedDriveForDetails) {
      // [REMOVED] // [REMOVED] console.log("handleCloseDetails: Modal already closed, skipping");
      return;
    }

    // [REMOVED] // [REMOVED] console.log("handleCloseDetails called");

    // First update the component state
    setIsDetailsModalOpen(false);
    setSelectedDriveForDetails(undefined);
    setSelectedDriveId(null);

    // [REMOVED] // [REMOVED] console.log("Component state updated: selectedDriveId set to null");

    // Get the current template parameter and other preserved parameters
    const template = getParam("template");
    const tab = getParam("tab");
    const page = getParam("page");
    const limit = getParam("limit");
    const search = getParam("search");
    const location = getParam("location");
    const view = getParam("view");

    // Use only the router-based update for consistency
    // [REMOVED] // [REMOVED] console.log("Updating URL to remove drive parameter");

    // Create an updates object with parameters to preserve
    const updates: Record<string, string | null> = {
      drive: null,
    };

    // Only include parameters that exist
    if (template) updates.template = template;

    updateParams(updates, {
      preserveParams: ["tab", "page", "limit", "search", "location", "view"],
      context: "tab:hard-drives",
    });

    // [REMOVED] // [REMOVED] console.log("handleCloseDetails completed");
  };

  const handleCloseModal = () => {
    // [REMOVED] // [REMOVED] console.log("Closing modal - clearing URL parameters");

    // Need to clear both parameters regardless of which one was set
    updateParams(
      {
        createDrive: null,
        editDrive: null,
      },
      {
        preserveParams: ["tab", "page", "limit", "search", "location", "view"],
        context: "tab:hard-drives",
      }
    );

    setIsModalOpen(false);
    setSelectedDrive(undefined);
    setIsAddingDrive(false);

    // Check URL after closing
    setTimeout(() => {
      // [REMOVED] // [REMOVED] console.log("URL after closing modal:", window.location.href);
    }, 100);
  };

  const handleAddDrive = () => {
    // Get the current template parameter
    const template = getParam("template");

    setSelectedDrive(undefined);
    setIsModalOpen(true);
    setIsAddingDrive(true);

    // Update URL parameters, preserving the template parameter if it exists
    updateParams(
      {
        createDrive: "true",
        template: template || null,
      },
      {
        preserveParams: ["tab", "page", "limit", "search", "location", "view"],
        context: "modal:create-drive",
      }
    );
  };

  const handleDelete = async (driveId: string) => {
    if (!confirm("Are you sure you want to delete this hard drive?")) {
      return;
    }

    try {
      const response = await fetch(`/api/hard-drives/${driveId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete hard drive");
      fetchDrives();
    } catch (err) {
      console.error("Error deleting hard drive:", err);
      setError("Failed to delete hard drive");
    }
  };

  const handleSave = async (driveData: Partial<HardDriveData>) => {
    try {
      const method = selectedDrive ? "PUT" : "POST";
      const url = selectedDrive
        ? `/api/hard-drives/${selectedDrive._id}`
        : "/api/hard-drives";

      // Map the form data fields to what the API expects for both POST and PUT
      const apiData = {
        name: driveData.label,
        description:
          driveData.notes || `${driveData.type} ${driveData.interface} Drive`,
        capacity: driveData.capacity,
        rawAssetIds: driveData.rawAssets || [],

        // Include additional fields that might be needed for the database model
        // but won't affect the API validation
        type: driveData.type,
        interface: driveData.interface,
        status: driveData.status,
        locationId: driveData.locationId,
        systemName: driveData.systemName,
        label: driveData.label,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        throw new Error(errorData.error || "Failed to save hard drive");
      }

      fetchDrives();
      setIsModalOpen(false);
      setSelectedDrive(undefined);
    } catch (err) {
      console.error("Error saving hard drive:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save hard drive"
      );
    }
  };

  const handleEdit = (drive: HardDriveWithDetails) => {
    // [REMOVED] // [REMOVED] console.log("Edit button clicked for drive:", drive);
    // [REMOVED] // [REMOVED] console.log("Drive ID to be edited:", drive._id?.toString());

    setSelectedDrive(drive);
    setIsModalOpen(true);

    // Add URL parameter to make the edit mode shareable and bookmarkable
    // [REMOVED] // [REMOVED] console.log("Setting editDrive URL parameter to:", drive._id?.toString());
    updateParams(
      {
        editDrive: drive._id?.toString() || "",
      },
      {
        preserveParams: ["tab", "page", "limit", "search", "location", "view"],
        context: "modal:edit-drive",
      }
    );

    // Check URL after a short delay
    setTimeout(() => {
      // [REMOVED] // [REMOVED] console.log("URL after update:", window.location.href);
      // [REMOVED] // [REMOVED] console.log("URL parameters after update:", window.location.search);
    }, 100);

    // Force a delay to ensure state updates before checking
    setTimeout(() => {
      console.log(
        "After state update - isModalOpen:",
        isModalOpen,
        "selectedDrive:",
        selectedDrive
      );
    }, 100);
  };

  // Handle createDrive parameter from URL
  useEffect(() => {
    const createDrive = getParam("createDrive");
    if (createDrive === "true" && !isModalOpen) {
      setSelectedDrive(undefined);
      setIsModalOpen(true);
      setIsAddingDrive(true);
    }
  }, [getParam, isModalOpen]);

  // Handle editDrive parameter from URL
  useEffect(() => {
    const editDriveId = getParam("editDrive");
    // [REMOVED] // [REMOVED] console.log("Checking editDrive URL parameter:", editDriveId);
    // [REMOVED] // [REMOVED] console.log("Current URL:", window.location.href);
    // [REMOVED] // [REMOVED] console.log("All URL params:", window.location.search);
    // [REMOVED] // [REMOVED] console.log("Current drives array length:", drives.length);
    // [REMOVED] // [REMOVED] console.log("isModalOpen state:", isModalOpen);

    if (editDriveId && !isModalOpen) {
      // [REMOVED] // [REMOVED] console.log("Found editDrive parameter, looking for matching drive");

      // Find the drive by ID
      const driveToEdit = drives.find(
        (drive) => drive._id?.toString() === editDriveId
      );

      if (driveToEdit) {
        // [REMOVED] // [REMOVED] console.log("Found drive to edit:", driveToEdit);
        setSelectedDrive(driveToEdit);
        setIsModalOpen(true);
        setIsAddingDrive(false);
      } else {
        console.warn("Could not find drive with ID:", editDriveId);
        // Clear the parameter if we can't find the drive
        updateParams({ editDrive: null });
      }
    }
  }, [getParam, isModalOpen, drives]);

  // Ensure tab parameter is set when component mounts and no template param exists
  useEffect(() => {
    // Check for and immediately remove any template parameter as soon as component mounts
    const templateParam = getParam("template");
    const tabParam = getParam("tab");

    if (templateParam) {
      console.log(
        "HardDrivesTab: Initial mount - removing template parameter immediately"
      );
      // Force cleanup through the URL utility
      const params = new URLSearchParams(window.location.search);
      params.delete("template");

      updateParams(
        { template: null },
        {
          preserveParams: [
            "tab",
            "drive",
            "page",
            "limit",
            "search",
            "location",
            "view",
          ],
          context: "tab:hard-drives",
          clearOthers: false,
        }
      );
    }

    // Make sure the tab parameter is set to hard-drives
    if (tabParam !== "hard-drives") {
      updateParams(
        { tab: "hard-drives" },
        {
          preserveParams: [
            "page",
            "limit",
            "search",
            "location",
            "view",
            "drive",
          ],
          clearOthers: false,
          context: "tab:hard-drives",
        }
      );
    }
  }, []);

  // Add a useEffect to log when selectedDriveId changes
  useEffect(() => {
    // [REMOVED] // [REMOVED] console.log("selectedDriveId changed:", selectedDriveId);
  }, [selectedDriveId]);

  // Log before rendering
  useEffect(() => {
    console.log(
      "Before rendering HardDriveDetailsModal - selectedDriveId:",
      selectedDriveId
    );
  }, [selectedDriveId]);

  // Add this line anywhere before the function is used in the useEffect
  // This ensures we check for template parameters in each render
  useEffect(() => {
    // Check for and remove any template parameter on the hard-drives tab
    const templateParam = getParam("template");
    if (templateParam) {
      // [REMOVED] // [REMOVED] console.log("HardDrivesTab: Initial check removing template parameter");
      updateParams(
        { template: null },
        {
          preserveParams: [
            "tab",
            "drive",
            "page",
            "limit",
            "search",
            "location",
            "view",
          ],
          clearOthers: false,
        }
      );
    }
  }, [getParam, updateParams]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by drive label, type, capacity, interface, status..."
            className="w-full px-4 py-2 pl-10 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </div>

        <Select value={selectedLocation} onValueChange={handleLocationChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <select
          value={itemsPerPage}
          onChange={(e) => handleLimitChange(Number(e.target.value))}
          className="px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
        >
          {[10, 25, 50, 100].map((option) => (
            <option key={option} value={option}>
              {option} per page
            </option>
          ))}
        </select>

        <ViewModeSelector currentView={currentView} />

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleAddDrive}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Drive</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {loading ? (
        <div>
          {fetchAttempts > 0 && (
            <div className="text-center mb-4 text-muted-foreground">
              Loading... (attempt {fetchAttempts} of {maxRetries})
            </div>
          )}
          <LoadingContainer fullHeight />
        </div>
      ) : error ? (
        <div className="p-6 mt-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Error Loading Hard Drives
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
              fetchDrives();
            }}
          >
            Try Again
          </Button>
        </div>
      ) : drives.length === 0 ? (
        <div className="text-center py-4">No hard drives found</div>
      ) : currentView === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {drives.map((drive) => (
            <div
              key={drive._id?.toString() || Math.random().toString()}
              className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-4 cursor-pointer hover:bg-[hsl(var(--accent))/10] shadow-sm transition-colors relative"
              onClick={(e) => {
                // Only handle click if not on a button
                if (!(e.target as HTMLElement).closest("button")) {
                  // [REMOVED] // [REMOVED] console.log("Grid item clicked for drive:", drive);
                  handleViewDetails(drive);
                }
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <HardDriveIcon className="w-5 h-5" />
                <div>
                  <div className="font-medium">{drive.label}</div>
                  {drive.systemName && (
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      {drive.systemName}
                    </div>
                  )}
                </div>
                <div className="flex ml-auto gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(drive);
                    }}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                    title="Edit drive"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (drive._id) {
                        setDriveToDelete(drive);
                      }
                    }}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                    title="Delete drive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Type:
                  </span>
                  <span>{drive.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Interface:
                  </span>
                  <span>{drive.interface}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Capacity:
                  </span>
                  <span>{drive.capacity.total}GB</span>
                </div>
                {drive.capacity.used !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        Used:
                      </span>
                      <span>
                        {Math.round(
                          (drive.capacity.used / drive.capacity.total) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (drive.capacity.used / drive.capacity.total) * 100 >
                          90
                            ? "bg-[hsl(var(--destructive))]"
                            : (drive.capacity.used / drive.capacity.total) *
                                100 >
                              75
                            ? "bg-[hsl(var(--warning))]"
                            : "bg-[hsl(var(--primary))]"
                        }`}
                        style={{
                          width: `${Math.min(
                            (drive.capacity.used / drive.capacity.total) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Status:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      drive.status === "Available"
                        ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                        : drive.status === "In Use"
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {drive.status || "Unknown"}
                  </span>
                </div>
                {drive.locationDetails && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">
                      Location:
                    </span>
                    <span>{drive.locationDetails.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Raw Assets:
                  </span>
                  <span>{drive.rawAssetDetails?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg border border-[hsl(var(--border))]">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[hsl(var(--muted-foreground))] text-xs uppercase">
                <th className="py-3 px-2">Label</th>
                <th className="py-3 px-2">Type</th>
                <th className="py-3 px-2">Interface</th>
                <th className="py-3 px-2">Capacity</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Location</th>
                <th className="py-3 px-2">Raw Assets</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[hsl(var(--foreground))]">
              {drives.map((drive) => (
                <tr
                  key={drive._id?.toString() || Math.random().toString()}
                  className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  onClick={(e) => {
                    // Only handle click if it's directly on the row or a cell, not on buttons
                    if (
                      e.target === e.currentTarget ||
                      (e.target as HTMLElement).tagName === "TD" ||
                      (e.target as HTMLElement).closest("td:not(:last-child)")
                    ) {
                      // [REMOVED] // [REMOVED] console.log("Table row clicked for drive:", drive);
                      handleViewDetails(drive);
                    }
                  }}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <HardDriveIcon className="w-4 h-4" />
                      <span className="text-sm">{drive.label}</span>
                      {drive.systemName && (
                        <span className="text-[hsl(var(--muted-foreground))] text-xs">
                          ({drive.systemName})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm">{drive.type}</td>
                  <td className="py-3 px-2 text-sm">{drive.interface}</td>
                  <td className="py-3 px-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{drive.capacity.total}GB</span>
                        {drive.capacity.used !== undefined && (
                          <span className="text-[hsl(var(--muted-foreground))]">
                            {Math.round(
                              (drive.capacity.used / drive.capacity.total) * 100
                            )}
                            % used
                          </span>
                        )}
                      </div>
                      {drive.capacity.used !== undefined && (
                        <div className="w-full bg-[hsl(var(--secondary))] rounded-full h-1">
                          <div
                            className="bg-[hsl(var(--primary))] h-1 rounded-full"
                            style={{
                              width: `${Math.min(
                                Math.round(
                                  (drive.capacity.used / drive.capacity.total) *
                                    100
                                ),
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-md text-xs",
                        drive.status === "Available"
                          ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                          : drive.status === "In Use"
                          ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"
                          : drive.status === "Archived"
                          ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                          : "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                      )}
                    >
                      {drive.status || "Unknown"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm">
                    {drive.locationDetails ? (
                      <span className="inline-flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {drive.locationDetails.name}
                      </span>
                    ) : (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        -
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs">
                      {Array.isArray(drive.rawAssetDetails)
                        ? drive.rawAssetDetails.length
                        : 0}{" "}
                      assets
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(drive);
                        }}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                        title="Edit drive"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (drive._id) {
                            setDriveToDelete(drive);
                          }
                        }}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                        title="Delete drive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && drives.length > 0 && (
        <PaginationWithUrl
          totalPages={totalPages}
          defaultPage={currentPage}
          defaultPageSize={itemsPerPage}
          onPageChange={handlePageChange}
          context="tab:hard-drives"
          preserveParams={["tab", "search", "location", "view"]}
          pageSizeOptions={LIMIT_OPTIONS}
        />
      )}

      <HardDriveModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        drive={selectedDrive}
      />

      <DeleteConfirmationModal
        isOpen={!!driveToDelete}
        onClose={() => setDriveToDelete(null)}
        onConfirm={() => {
          if (driveToDelete?._id) {
            handleDelete(driveToDelete._id.toString());
            setDriveToDelete(null);
          }
        }}
        title="Delete Hard Drive"
        message={`Are you sure you want to delete the hard drive "${driveToDelete?.label}"? This action cannot be undone.`}
      />
    </div>
  );
}
