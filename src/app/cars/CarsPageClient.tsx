"use client";

import React, { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import CarFiltersSection from "@/components/cars/CarFiltersSection";
import CarsViewWrapper from "@/components/cars/CarsViewWrapper";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import PageSizeSelector from "@/components/PageSizeSelector";
import SortSelector from "@/components/ui/SortSelector";
import { Car } from "@/types/car";
import { Client } from "@/types/contact";
import { PageTitle } from "@/components/ui/PageTitle";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { Make } from "@/lib/fetchMakes";
import { CarGridSelector } from "@/components/cars/CarGridSelector";
import { CarsErrorBoundary } from "@/components/cars/CarsErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { useAPI } from "@/hooks/useAPI";

// Interface for client data with string IDs instead of ObjectIds
export interface ClientWithStringId {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  socialMedia?: {
    instagram?: string;
    website?: string;
  };
  businessType?: string;
  primaryContactId?: string | null;
  documents?: Array<{
    _id: string;
    type: string;
    title: string;
    fileName: string;
    uploadDate: Date;
  }>;
  cars?: Array<{
    _id: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    status: string;
  }>;
  status: "active" | "inactive";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CarsPageClientProps {
  cars: Car[];
  totalPages: number;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  view: "grid" | "list";
  isEditMode: boolean;
  filters: {
    make?: string;
    minYear?: string;
    maxYear?: string;
    clientId?: string;
    sort?: string;
    search?: string;
  };
  makes: Make[];
  clients: ClientWithStringId[];
  shouldFetchData?: boolean; // New optional prop for client-side data fetching
}

export default function CarsPageClient({
  cars: initialCars,
  totalPages: initialTotalPages,
  currentPage,
  pageSize,
  totalCount: initialTotalCount,
  view,
  isEditMode,
  filters,
  makes: initialMakes,
  clients: initialClients,
  shouldFetchData = false,
}: CarsPageClientProps) {
  // State for client-side data
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [makes, setMakes] = useState<Make[]>(initialMakes);
  const [clients, setClients] = useState<ClientWithStringId[]>(initialClients);
  const [isLoading, setIsLoading] = useState(shouldFetchData);
  const [isDataLoading, setIsDataLoading] = useState(false); // Separate loading state for data only

  // Authentication
  const api = useAPI();

  // State for inline filters
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [selectedMake, setSelectedMake] = useState(filters.make || "");
  const [minYear, setMinYear] = useState(filters.minYear || "");
  const [maxYear, setMaxYear] = useState(filters.maxYear || "");

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedMinYear = useDebounce(minYear, 500);
  const debouncedMaxYear = useDebounce(maxYear, 500);

  // Filter handlers
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Don't update URL immediately - let debounced value handle it
  };

  const handleMakeChange = (value: string) => {
    const newMake = value === "all" ? "" : value;
    setSelectedMake(newMake);
    const newParams = new URLSearchParams(window.location.search);
    if (newMake) {
      newParams.set("make", newMake);
    } else {
      newParams.delete("make");
    }
    newParams.set("page", "1");
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${newParams.toString()}`
    );
  };

  const handleYearChange = (type: "min" | "max", value: string) => {
    if (type === "min") {
      setMinYear(value);
    } else {
      setMaxYear(value);
    }
    // Don't update URL immediately - let debounced value handle it
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMake("");
    setMinYear("");
    setMaxYear("");
    const newParams = new URLSearchParams(window.location.search);
    newParams.delete("search");
    newParams.delete("make");
    newParams.delete("minYear");
    newParams.delete("maxYear");
    newParams.set("page", "1");
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${newParams.toString()}`
    );
  };

  // Update URL when debounced values change
  useEffect(() => {
    const newParams = new URLSearchParams(window.location.search);

    if (debouncedSearchQuery) {
      newParams.set("search", debouncedSearchQuery);
    } else {
      newParams.delete("search");
    }

    if (debouncedMinYear) {
      newParams.set("minYear", debouncedMinYear);
    } else {
      newParams.delete("minYear");
    }

    if (debouncedMaxYear) {
      newParams.set("maxYear", debouncedMaxYear);
    } else {
      newParams.delete("maxYear");
    }

    newParams.set("page", "1"); // Reset to first page
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${newParams.toString()}`
    );
  }, [debouncedSearchQuery, debouncedMinYear, debouncedMaxYear]);

  const hasActiveFilters =
    debouncedSearchQuery ||
    selectedMake ||
    debouncedMinYear ||
    debouncedMaxYear;

  // Fetch data on client side if needed
  useEffect(() => {
    if (!shouldFetchData || !api) return;

    const fetchData = async () => {
      // Only show full loading on initial load (when we have no cars)
      if (cars.length === 0) {
        setIsLoading(true);
      }
      setIsDataLoading(true);

      try {
        // Build query params
        const queryParams = new URLSearchParams();
        queryParams.set("page", currentPage.toString());
        queryParams.set("pageSize", pageSize.toString());
        queryParams.set("view", view);

        // Add filter parameters if they exist
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== "") {
            queryParams.set(key, value);
          }
        });

        // Add current inline filter values
        if (debouncedSearchQuery)
          queryParams.set("search", debouncedSearchQuery);
        if (selectedMake) queryParams.set("make", selectedMake);
        if (debouncedMinYear) queryParams.set("minYear", debouncedMinYear);
        if (debouncedMaxYear) queryParams.set("maxYear", debouncedMaxYear);

        // Fetch cars, makes, and clients in parallel using authenticated API
        console.log("🔍 Making API calls:", {
          carsURL: `cars?${queryParams.toString()}`,
          makesURL: "cars/makes",
          clientsURL: "clients",
        });

        const [carsResponse, makesResponse, clientsResponse] =
          await Promise.all([
            api.get(`cars?${queryParams.toString()}`),
            api.get("cars/makes"),
            api.get("clients"),
          ]);

        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ API calls completed successfully");

        // Process cars data
        const carsData = carsResponse as any;
        const carsArray = carsData.cars || [];

        // Ensure all cars have valid _id fields and filter out any duplicates
        const validCars = carsArray
          .filter((car: any) => car && car._id)
          .map((car: any, index: number) => ({
            ...car,
            _id: car._id.toString(),
            // Add fallback ID if _id is somehow invalid
            uniqueKey: car._id?.toString() || `car-${index}-${Date.now()}`,
          }));

        setCars(validCars);
        setTotalPages(carsData.pagination?.totalPages || 1);
        setTotalCount(carsData.pagination?.totalCount || 0);

        // Debug logging to help identify key issues
        if (process.env.NODE_ENV !== "production") {
          console.log("CarsPageClient: Cars loaded:", {
            count: validCars.length,
            hasValidIds: validCars.every((car: any) => car._id),
            uniqueIds:
              new Set(validCars.map((car: any) => car._id)).size ===
              validCars.length,
            sampleIds: validCars.slice(0, 3).map((car: any) => car._id),
          });
        }

        // Process makes data
        const makesData = makesResponse as any;
        const makesArray = makesData.makes || [];

        // Debug logging for makes
        if (process.env.NODE_ENV !== "production") {
          console.log("CarsPageClient: Makes loaded:", {
            count: makesArray.length,
            hasValidIds: makesArray.every((make: any) => make._id),
            hasValidNames: makesArray.every((make: any) => make.name),
            uniqueIds:
              new Set(makesArray.map((make: any) => make._id)).size ===
              makesArray.length,
            uniqueNames:
              new Set(makesArray.map((make: any) => make.name)).size ===
              makesArray.length,
            sampleMakes: makesArray
              .slice(0, 3)
              .map((make: any) => ({ id: make._id, name: make.name })),
          });
        }

        setMakes(makesArray);

        // Process clients data
        const clientsData = clientsResponse as any;
        // Format clients data
        const formattedClients = (clientsData.clients || []).map(
          (client: any) => ({
            ...client,
            _id: client._id.toString(),
            primaryContactId: client.primaryContactId?.toString(),
            documents: (client.documents || []).map((doc: any) => ({
              ...doc,
              _id: doc._id.toString(),
            })),
            cars: (client.cars || []).map((car: any) => ({
              ...car,
              _id: car._id.toString(),
            })),
          })
        );
        setClients(formattedClients);
      } catch (error) {
        console.error("Error fetching data:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : "No stack trace",
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          stringified: JSON.stringify(error),
          errorKeys: error ? Object.keys(error) : [],
        });
      } finally {
        setIsLoading(false);
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [
    shouldFetchData,
    api,
    currentPage,
    pageSize,
    filters,
    view,
    debouncedSearchQuery,
    selectedMake,
    debouncedMinYear,
    debouncedMaxYear,
  ]);

  // Show loading state if not authenticated yet
  if (shouldFetchData && !api) {
    return (
      <CarsErrorBoundary>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </CarsErrorBoundary>
    );
  }

  // Build the current search params string
  const currentSearchParams = new URLSearchParams({
    page: currentPage.toString(),
    pageSize: pageSize.toString(),
    view: view,
    edit: isEditMode.toString(),
    sort: filters.sort || "createdAt_desc",
    ...filters,
  }).toString();

  // For the new grid selector, we'll use it in grid mode and fall back to the old view wrapper for list mode
  const useNewGridSelector = view === "grid";

  if (isLoading && cars.length === 0) {
    return (
      <CarsErrorBoundary>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </CarsErrorBoundary>
    );
  }

  return (
    <CarsErrorBoundary>
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="space-y-6 sm:space-y-8">
            <PageTitle title="Cars Collection" count={totalCount}>
              <Link
                href="/cars/new"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Car
              </Link>
            </PageTitle>

            {/* Controls and Filters Section - Single Line */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* View Controls */}
              <div className="flex-shrink-0">
                <ViewModeSelector currentView={view} />
              </div>

              <div className="flex-shrink-0 w-16">
                <PageSizeSelector
                  currentPageSize={pageSize}
                  options={[12, 24, 48, 96]}
                />
              </div>

              <div className="flex-shrink-0 w-40">
                <SortSelector currentSort={filters.sort || "createdAt_desc"} />
              </div>

              {/* Search */}
              <div className="relative flex-shrink-0 w-56">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cars..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Make */}
              <div className="flex-shrink-0 w-32">
                <Select
                  value={selectedMake || "all"}
                  onValueChange={handleMakeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any Make" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Make</SelectItem>
                    {makes.map((make, index) => (
                      <SelectItem
                        key={make._id?.toString() || `make-${index}`}
                        value={make.name}
                      >
                        {make.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Range */}
              <div className="flex-shrink-0 w-24">
                <Input
                  type="number"
                  placeholder="Min Year"
                  value={minYear}
                  onChange={(e) => handleYearChange("min", e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex-shrink-0 w-24">
                <Input
                  type="number"
                  placeholder="Max Year"
                  value={maxYear}
                  onChange={(e) => handleYearChange("max", e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <div className="flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {useNewGridSelector ? (
              <CarGridSelector
                selectionMode="none"
                cars={cars}
                loading={isDataLoading}
                showFilters={false}
                showPagination={true}
                pageSize={pageSize}
                useUrlFilters={false}
                className="space-y-6"
                gridClassName="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              />
            ) : (
              <>
                <CarFiltersSection
                  currentFilters={{
                    make: filters.make || "",
                    minYear: filters.minYear || "",
                    maxYear: filters.maxYear || "",
                    clientId: filters.clientId || "",
                    search: filters.search || "",
                  }}
                  makes={makes.map((make) => make.name)}
                  clients={clients}
                />

                <CarsViewWrapper
                  cars={cars}
                  viewMode="grid" // Force grid view on mobile, original view on desktop
                  currentSearchParams={currentSearchParams}
                  forceGridOnMobile={true}
                  actualViewMode={view}
                />
              </>
            )}

            {/* Bottom Pagination - only show if not using CarGridSelector's pagination */}
            {!useNewGridSelector && totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </CarsErrorBoundary>
  );
}
