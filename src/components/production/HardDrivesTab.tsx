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
    return getParam("location") || "";
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

  // Modify the fetchDrives function to handle retries and timeouts
  const fetchDrives = async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
      setError(null);
      setTimeoutOccurred(false);
    }

    try {
      console.log(`Fetching hard drives (attempt ${fetchAttempts + 1})...`);

      let url = `/api/hard-drives?page=${currentPage}&search=${encodeURIComponent(
        searchTerm
      )}&limit=${itemsPerPage}&include_assets=true`;

      if (selectedLocation) {
        url += `&location=${selectedLocation}`;
      }

      // Increase timeout for subsequent retries
      const timeout = 20000 + fetchAttempts * 10000; // 20s, 30s, 40s...
      console.log(`Using timeout of ${timeout}ms for hard drives request`);

      const response = await fetchWithTimeout(url, {}, timeout);

      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Log debug information if available
      if (data.debug) {
        console.log("Hard drives API debug info:", data.debug);
      }

      console.log(
        `Received ${data.drives.length} hard drives out of ${data.total} total`
      );

      setDrives(data.drives);
      setTotalPages(data.totalPages);
      setFetchAttempts(0); // Reset attempts on success
      setTimeoutOccurred(false);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching hard drives:", err);

      // Check if this was a timeout
      const isTimeout =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.includes("timed out"));

      if (isTimeout) {
        setTimeoutOccurred(true);
        console.warn("Request timed out while fetching hard drives");
      }

      // If we haven't exceeded max retries, try again
      if (fetchAttempts < maxRetries) {
        const nextAttempt = fetchAttempts + 1;
        console.log(
          `Retrying hard drives fetch (attempt ${nextAttempt} of ${maxRetries})...`
        );
        setFetchAttempts(nextAttempt);

        // Wait longer between retries with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, fetchAttempts), 10000);
        console.log(`Waiting ${delay}ms before retry...`);

        setTimeout(() => {
          fetchDrives(true); // Pass true to indicate this is a retry
        }, delay);

        // Update error message to be more user-friendly
        if (fetchAttempts === 0) {
          setError(
            isTimeout
              ? "Loading is taking longer than expected. Retrying..."
              : `Loading error: ${
                  err instanceof Error ? err.message : "Unknown error"
                }. Retrying...`
          );
        } else {
          setError(
            `Still trying to load (attempt ${nextAttempt} of ${maxRetries})...${
              isTimeout
                ? " The server is taking longer than expected to respond."
                : ""
            }`
          );
        }
      } else {
        // Max retries exceeded, show final error
        const errorMessage = isTimeout
          ? "Request timed out. The server might be under heavy load or the database connection may be having issues."
          : `Failed to load hard drives: ${
              err instanceof Error ? err.message : "Unknown error"
            }`;

        setError(errorMessage);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [currentPage, itemsPerPage, searchTerm, selectedLocation]);

  // Handle selected drive from URL
  useEffect(() => {
    const selectedDriveId = getParam("drive");
    const template = getParam("template");

    if (selectedDriveId && drives.length > 0) {
      const drive = drives.find((d) => d._id?.toString() === selectedDriveId);

      if (drive) {
        // Only set the details if the details modal is not already open
        if (!isDetailsModalOpen) {
          setSelectedDriveForDetails(drive);
          setIsDetailsModalOpen(true);
        }
      }
    }
  }, [drives, getParam, isDetailsModalOpen]);

  useEffect(() => {
    const driveId = getParam("drive");
    if (driveId) {
      setSelectedDriveId(driveId);
    } else {
      setSelectedDriveId(null);
      handleCloseDetails();
    }
  }, [getParam]);

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
    setSelectedLocation(locationValue);
    setCurrentPage(1);
    updateParams({
      location: locationValue || null,
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

  // Function to fetch drive details by ID
  const fetchDriveDetailsById = async (driveId: string) => {
    try {
      console.log("Fetching drive details for ID:", driveId);
      setLoading(true);
      const response = await fetch(`/api/hard-drives/${driveId}`);
      if (!response.ok) {
        throw new Error(`Error fetching drive details: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Fetched drive details:", data);
      setSelectedDriveForDetails(data);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error("Error fetching drive details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch drive details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDetails = () => {
    // Don't do anything if the modal is already closed
    if (!isDetailsModalOpen && !selectedDriveForDetails) {
      console.log("handleCloseDetails: Modal already closed, skipping");
      return;
    }

    console.log("handleCloseDetails called");

    // First update the component state
    setIsDetailsModalOpen(false);
    setSelectedDriveForDetails(undefined);
    setSelectedDriveId(null);

    console.log("Component state updated: selectedDriveId set to null");

    // Get the current template parameter and other preserved parameters
    const template = getParam("template");
    const tab = getParam("tab");
    const page = getParam("page");
    const limit = getParam("limit");
    const search = getParam("search");
    const location = getParam("location");
    const view = getParam("view");

    // Use only the router-based update for consistency
    console.log("Updating URL to remove drive parameter");

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

    console.log("handleCloseDetails completed");
  };

  const handleCloseModal = () => {
    // Get the current template parameter
    const template = getParam("template");

    setIsModalOpen(false);
    setSelectedDrive(undefined);
    setIsAddingDrive(false);

    // Update URL parameters, preserving the template parameter if it exists
    updateParams(
      {
        createDrive: null,
        template: template || null,
      },
      {
        preserveParams: ["tab", "page", "limit", "search", "location", "view"],
        context: "tab:hard-drives",
      }
    );
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

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(driveData),
      });

      if (!response.ok) throw new Error("Failed to save hard drive");

      fetchDrives();
      setIsModalOpen(false);
      setSelectedDrive(undefined);
    } catch (err) {
      console.error("Error saving hard drive:", err);
      setError("Failed to save hard drive");
    }
  };

  const handleEdit = (drive: HardDriveWithDetails) => {
    setSelectedDrive(drive);
    setIsModalOpen(true);
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

  // Ensure tab parameter is set when component mounts
  useEffect(() => {
    // Make sure the tab parameter is set to hard-drives
    const tab = getParam("tab");
    if (tab !== "hard-drives") {
      updateParams(
        { tab: "hard-drives" },
        {
          preserveParams: ["page", "limit", "search", "location", "view"],
          clearOthers: false,
        }
      );
    }
  }, []);

  // Add a useEffect to log when selectedDriveId changes
  useEffect(() => {
    console.log("selectedDriveId changed:", selectedDriveId);
  }, [selectedDriveId]);

  // Log before rendering
  useEffect(() => {
    console.log(
      "Before rendering HardDriveDetailsModal - selectedDriveId:",
      selectedDriveId
    );
  }, [selectedDriveId]);

  // Synchronize component state with URL parameters
  useEffect(() => {
    const driveParam = getParam("drive");
    console.log("URL drive parameter changed:", driveParam);

    if (driveParam) {
      console.log("Setting selectedDriveId from URL parameter:", driveParam);

      // Always update the selectedDriveId when the URL parameter changes
      setSelectedDriveId(driveParam);
      setIsDetailsModalOpen(true);

      // Always fetch drive details when navigating to this tab with a drive parameter
      console.log("Fetching drive details for:", driveParam);
      fetchDriveDetailsById(driveParam);
    } else if (!driveParam && selectedDriveId) {
      // Only clear the state if this wasn't triggered by our own handleViewDetails function
      // This prevents the immediate closing of the modal after setting the URL parameter
      console.log("Checking if we should clear selectedDriveId");

      // Add a small delay to avoid race conditions with URL updates
      const timeoutId = setTimeout(() => {
        // Check again if the parameter is still not present
        const currentDriveParam = getParam("drive");
        if (!currentDriveParam) {
          console.log("Clearing selectedDriveId as URL parameter is empty");
          setSelectedDriveId(null);
          setIsDetailsModalOpen(false);
          setSelectedDriveForDetails(undefined);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, selectedDriveId, getParam, fetchDriveDetailsById]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={handleAddDrive}>
          <Plus className="w-4 h-4 mr-2" />
          Add Drive
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <ViewModeSelector currentView={currentView} />
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by label, system name, or location..."
            className="w-full px-4 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>

        <div className="w-64">
          <Select
            value={selectedLocation || "all"}
            onValueChange={handleLocationChange}
          >
            <SelectTrigger className="bg-[hsl(var(--background))]">
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {location.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {drives.map((drive) => (
            <div
              key={drive._id?.toString()}
              className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-4 cursor-pointer hover:bg-[hsl(var(--accent))/10] shadow-sm transition-colors"
              onClick={(e) => {
                console.log("Grid item clicked for drive:", drive);
                handleViewDetails(drive);
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
                    {drive.status}
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
                  key={drive._id?.toString()}
                  className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  onClick={(e) => {
                    console.log("Table row clicked for drive:", drive);
                    handleViewDetails(drive);
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
                      {drive.status}
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
                      {drive.rawAssetDetails?.length || 0} assets
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
    </div>
  );
}
