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
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drives, setDrives] = useState<HardDriveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get("page");
    return page ? parseInt(page) : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const limit = searchParams.get("limit");
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
  const currentView = (searchParams.get("view") as "grid" | "list") || "list";
  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(null);
  const [isAddingDrive, setIsAddingDrive] = useState(false);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [hardDriveIds, setHardDriveIds] = useState<
    { _id: string; label: string }[]
  >([]);
  const [driveToDelete, setDriveToDelete] =
    useState<HardDriveWithDetails | null>(null);

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

  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "hard-drives");
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.replace(`${pathname}?${params.toString()}`);
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

  useEffect(() => {
    const selectedDriveId = searchParams.get("drive");
    if (selectedDriveId && drives.length > 0) {
      const drive = drives.find((d) => d._id?.toString() === selectedDriveId);
      if (drive) {
        setSelectedDriveForDetails(drive);
        setIsDetailsModalOpen(true);
      }
    }
  }, [searchParams, drives]);

  useEffect(() => {
    const driveId = searchParams.get("drive");
    if (driveId) {
      setSelectedDriveId(driveId);
    } else {
      setSelectedDriveId(null);
      handleCloseDetails();
    }
  }, [searchParams]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    updateUrlParams({ search: value || null, page: "1" });
  };

  const handleLocationChange = (value: string) => {
    const locationValue = value === "all" ? "" : value;
    setSelectedLocation(locationValue);
    setCurrentPage(1);
    updateUrlParams({ location: locationValue || null, page: "1" });
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

  const handleViewDetails = (drive: HardDriveWithDetails) => {
    setSelectedDriveForDetails(drive);
    setIsDetailsModalOpen(true);
    updateUrlParams({ drive: drive._id?.toString() || null });
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedDriveForDetails(undefined);
    updateUrlParams({ drive: null });
    fetchDrives();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDrive(undefined);
    setIsAddingDrive(false);
  };

  const handleAddDrive = () => {
    setSelectedDrive(undefined);
    setIsModalOpen(true);
    setIsAddingDrive(true);
  };

  const handleDriveClick = (driveId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("drive", driveId);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Hard Drives</h2>
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
        <div className="text-center py-4">Loading...</div>
      ) : drives.length === 0 ? (
        <div className="text-center py-4">No hard drives found</div>
      ) : currentView === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {drives.map((drive) => (
            <div
              key={drive._id?.toString()}
              className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-4 cursor-pointer hover:bg-[hsl(var(--accent))] transition-colors"
              onClick={() => handleViewDetails(drive)}
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[hsl(var(--muted-foreground))] text-xs uppercase">
                <th className="py-3">Label</th>
                <th className="py-3">Type</th>
                <th className="py-3">Interface</th>
                <th className="py-3">Capacity</th>
                <th className="py-3">Status</th>
                <th className="py-3">Location</th>
                <th className="py-3">Raw Assets</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[hsl(var(--foreground))]">
              {drives.map((drive) => (
                <tr
                  key={drive._id?.toString()}
                  className="border-t border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--accent))]"
                  onClick={() => handleViewDetails(drive)}
                >
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <HardDriveIcon className="w-4 h-4" />
                      <span>{drive.label}</span>
                      {drive.systemName && (
                        <span className="text-[hsl(var(--muted-foreground))] text-sm">
                          ({drive.systemName})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4">{drive.type}</td>
                  <td className="py-4">{drive.interface}</td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
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
                        <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (drive.capacity.used / drive.capacity.total) *
                                100 >
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
                                (drive.capacity.used / drive.capacity.total) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        drive.status === "Available"
                          ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                          : drive.status === "In Use"
                          ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      {drive.status}
                    </span>
                  </td>
                  <td className="py-4">
                    {drive.locationDetails
                      ? drive.locationDetails.name
                      : "No location"}
                  </td>
                  <td className="py-4">{drive.rawAssetDetails?.length || 0}</td>
                  <td className="py-4 text-right space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(drive._id!.toString());
                      }}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] p-1"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && drives.length > 0 && (
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

      <HardDriveModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        drive={selectedDrive}
      />

      {selectedDriveId && (
        <HardDriveDetailsModal
          driveId={selectedDriveId}
          onClose={handleCloseDetails}
          onDriveUpdate={fetchDrives}
        />
      )}
    </div>
  );
}
