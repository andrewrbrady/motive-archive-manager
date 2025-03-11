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

  const fetchDrives = async () => {
    setLoading(true);
    try {
      let url = `/api/hard-drives?page=${currentPage}&search=${encodeURIComponent(
        searchTerm
      )}&limit=${itemsPerPage}&include_assets=true`;

      if (selectedLocation) {
        url += `&location=${selectedLocation}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch hard drives");
      const data = await response.json();
      setDrives(data.drives);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Error fetching hard drives:", err);
      setError("Failed to fetch hard drives");
    } finally {
      setLoading(false);
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
    // Get the current template parameter
    const template = getParam("template");

    console.log("handleCloseDetails called");

    // First update the component state
    setIsDetailsModalOpen(false);
    setSelectedDriveForDetails(undefined);
    setSelectedDriveId(null);

    console.log("Component state updated: selectedDriveId set to null");

    // Then update the URL directly for immediate effect
    const url = new URL(window.location.href);
    url.searchParams.delete("drive");
    console.log("Removed drive parameter from URL");

    if (template) {
      url.searchParams.set("template", template);
    }

    // Preserve other parameters
    ["tab", "page", "limit", "search", "location", "view"].forEach((param) => {
      const value = getParam(param);
      if (value && param !== "drive") {
        url.searchParams.set(param, value);
      }
    });

    console.log("Setting URL directly to:", url.toString());
    window.history.pushState({}, "", url.toString());

    // Also update the Next.js router state to keep it in sync
    console.log("Updating Next.js router to remove drive parameter");
    updateParams(
      {
        drive: null,
        template: template || null,
      },
      {
        preserveParams: ["tab", "page", "limit", "search", "location", "view"],
        context: "tab:hard-drives",
      }
    );

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
        <LoadingContainer />
      ) : error ? (
        <div className="text-center py-4 text-destructive">{error}</div>
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
