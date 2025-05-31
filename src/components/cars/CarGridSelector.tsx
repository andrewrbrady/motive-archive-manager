"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Car } from "@/types/car";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading";
import CarCard from "./CarCard";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter, useSearchParams } from "next/navigation";
import { useAPI } from "@/hooks/useAPI";

interface CarGridSelectorProps {
  // Selection mode
  selectionMode?: "none" | "single" | "multiple";
  selectedCarIds?: string[];
  onCarSelect?: (carId: string) => void;
  onCarsSelect?: (carIds: string[]) => void;

  // Filtering
  excludeCarIds?: string[]; // Cars to exclude from the grid

  // Display options
  showFilters?: boolean;
  showPagination?: boolean;
  pageSize?: number;

  // Custom styling
  className?: string;
  gridClassName?: string;

  // Data source - if not provided, will fetch from API
  cars?: Car[];
  loading?: boolean;

  // URL integration - if true, will use URL params for filtering
  useUrlFilters?: boolean;

  // Callbacks
  onLoadMore?: () => void;
  hasMore?: boolean;
}

interface CarFilters {
  search: string;
  make: string;
  minYear: string;
  maxYear: string;
  status: string;
}

export function CarGridSelector({
  selectionMode = "none",
  selectedCarIds = [],
  onCarSelect,
  onCarsSelect,
  excludeCarIds = [],
  showFilters = true,
  showPagination = true,
  pageSize = 20,
  className,
  gridClassName,
  cars: providedCars,
  loading: providedLoading,
  useUrlFilters = false,
  onLoadMore,
  hasMore,
}: CarGridSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useAPI();

  // Initialize filters from URL params if using URL filters
  const initialFilters: CarFilters = useMemo(() => {
    if (useUrlFilters && searchParams) {
      return {
        search: searchParams.get("search") || "",
        make: searchParams.get("make") || "",
        minYear: searchParams.get("minYear") || "",
        maxYear: searchParams.get("maxYear") || "",
        status: searchParams.get("status") || "",
      };
    }
    return {
      search: "",
      make: "",
      minYear: "",
      maxYear: "",
      status: "",
    };
  }, [useUrlFilters, searchParams]);

  const [filters, setFilters] = useState<CarFilters>(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initialFilters.search);
  const [cars, setCars] = useState<Car[]>(providedCars || []);
  const [loading, setLoading] = useState(
    providedCars ? providedLoading || false : true
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [makes, setMakes] = useState<string[]>([]);

  // Debounce search query with 300ms delay
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Update filters when debounced search query changes
  useEffect(() => {
    if (debouncedSearchQuery !== filters.search) {
      handleFilterChange("search", debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]);

  // Initialize filters from URL if using URL filters
  useEffect(() => {
    if (useUrlFilters && searchParams) {
      setFilters({
        search: searchParams.get("search") || "",
        make: searchParams.get("make") || "",
        minYear: searchParams.get("minYear") || "",
        maxYear: searchParams.get("maxYear") || "",
        status: searchParams.get("status") || "",
      });
      setCurrentPage(parseInt(searchParams.get("page") || "1"));
    }
  }, [useUrlFilters, searchParams]);

  // Update cars and loading state when provided props change, or fetch cars if not provided
  useEffect(() => {
    if (providedCars !== undefined) {
      setCars(providedCars);
      setLoading(providedLoading || false);
      return;
    }

    const fetchData = async () => {
      if (!api) return;

      setLoading(true);
      try {
        // Build query params for cars
        const queryParams = new URLSearchParams();
        queryParams.set("page", currentPage.toString());
        queryParams.set("pageSize", pageSize.toString());

        if (debouncedSearchQuery)
          queryParams.set("search", debouncedSearchQuery);
        if (filters.make) queryParams.set("make", filters.make);
        if (filters.minYear) queryParams.set("minYear", filters.minYear);
        if (filters.maxYear) queryParams.set("maxYear", filters.maxYear);
        if (filters.status) queryParams.set("status", filters.status);

        // Fetch cars
        const carsData = (await api.get(
          `cars/simple?${queryParams.toString()}`
        )) as {
          cars: Car[];
          pagination?: { totalCount: number };
        };
        setCars(carsData.cars || []);
        setTotalCount(carsData.pagination?.totalCount || 0);

        // Fetch makes if filters are shown and we don't have them yet
        if (showFilters && makes.length === 0) {
          try {
            const makesData = (await api.get("cars/makes")) as {
              makes: string[];
            };
            setMakes(makesData.makes || []);
          } catch (makesError) {
            console.error("Error fetching makes:", makesError);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setCars([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    api,
    providedCars,
    providedLoading,
    currentPage,
    pageSize,
    debouncedSearchQuery,
    filters.make,
    filters.minYear,
    filters.maxYear,
    filters.status,
    showFilters,
    makes.length,
  ]);

  // Fetch makes when using provided cars and filters are shown
  useEffect(() => {
    if (!showFilters || makes.length > 0 || !providedCars || !api) return;

    const fetchMakes = async () => {
      try {
        const data = (await api.get("cars/makes")) as { makes: string[] };
        setMakes(data.makes || []);
      } catch (error) {
        console.error("Error fetching makes:", error);
      }
    };

    fetchMakes();
  }, [api, showFilters, makes.length, providedCars]);

  // Filter out excluded cars
  const filteredCars = useMemo(() => {
    return cars.filter((car) => !excludeCarIds.includes(car._id));
  }, [cars, excludeCarIds]);

  const handleFilterChange = (key: keyof CarFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filtering

    // Update URL if using URL filters
    if (useUrlFilters) {
      const params = new URLSearchParams(searchParams?.toString() || "");

      // Update filter params
      Object.entries(newFilters).forEach(([filterKey, filterValue]) => {
        if (filterValue && filterValue.trim() !== "") {
          params.set(filterKey, filterValue);
        } else {
          params.delete(filterKey);
        }
      });

      // Preserve other params
      const view = searchParams?.get("view");
      const pageSize = searchParams?.get("pageSize");
      const isEditMode = searchParams?.get("edit");
      const sort = searchParams?.get("sort");

      if (view) params.set("view", view);
      if (pageSize) params.set("pageSize", pageSize);
      if (isEditMode) params.set("edit", isEditMode);
      if (sort) params.set("sort", sort);
      params.set("page", "1"); // Reset to first page

      router.push(`/cars?${params.toString()}`);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Update local filters state immediately for UI responsiveness
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: "",
      make: "",
      minYear: "",
      maxYear: "",
      status: "",
    };
    setFilters(emptyFilters);
    setSearchQuery("");
    setCurrentPage(1);

    // Update URL if using URL filters
    if (useUrlFilters) {
      const params = new URLSearchParams();
      const view = searchParams?.get("view");
      const pageSize = searchParams?.get("pageSize");
      const isEditMode = searchParams?.get("edit");
      const sort = searchParams?.get("sort");

      if (view) params.set("view", view);
      if (pageSize) params.set("pageSize", pageSize);
      if (isEditMode) params.set("edit", isEditMode);
      if (sort) params.set("sort", sort);
      params.set("page", "1");

      router.push(`/cars?${params.toString()}`);
    }
  };

  const handleCarClick = (car: Car) => {
    if (selectionMode === "none") return;

    if (selectionMode === "single") {
      onCarSelect?.(car._id);
    } else if (selectionMode === "multiple") {
      const newSelection = selectedCarIds.includes(car._id)
        ? selectedCarIds.filter((id) => id !== car._id)
        : [...selectedCarIds, car._id];
      onCarsSelect?.(newSelection);
    }
  };

  const selectAllVisible = () => {
    if (selectionMode !== "multiple") return;
    const visibleCarIds = filteredCars.map((car) => car._id);
    const newSelection = [...new Set([...selectedCarIds, ...visibleCarIds])];
    onCarsSelect?.(newSelection);
  };

  const deselectAllVisible = () => {
    if (selectionMode !== "multiple") return;
    const visibleCarIds = new Set(filteredCars.map((car) => car._id));
    const newSelection = selectedCarIds.filter((id) => !visibleCarIds.has(id));
    onCarsSelect?.(newSelection);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);

    // Update URL if using URL filters
    if (useUrlFilters) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("page", newPage.toString());
      router.push(`/cars?${params.toString()}`);
    }
  };

  // Memoized computed values to maintain consistent hook order
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pageSize);
  }, [totalCount, pageSize]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((value) => value !== "");
  }, [filters]);

  const isCarSelected = useCallback(
    (carId: string) => {
      return selectedCarIds.includes(carId);
    },
    [selectedCarIds]
  );

  const allVisibleSelected = useMemo(() => {
    return (
      filteredCars.length > 0 &&
      filteredCars.every((car) => isCarSelected(car._id))
    );
  }, [filteredCars, isCarSelected]);

  // Handle loading state when API is not available
  if (!api) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filters */}
      {showFilters && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filters</h3>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cars..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Make */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Make</label>
              <Select
                value={filters.make || "all"}
                onValueChange={(value) =>
                  handleFilterChange("make", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Make" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Make</SelectItem>
                  {makes.map((make) => (
                    <SelectItem key={make} value={make}>
                      {make}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Year</label>
              <Input
                type="number"
                placeholder="Min Year"
                value={filters.minYear}
                onChange={(e) => handleFilterChange("minYear", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Year</label>
              <Input
                type="number"
                placeholder="Max Year"
                value={filters.maxYear}
                onChange={(e) => handleFilterChange("maxYear", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      {selectionMode === "multiple" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedCarIds.length} car
              {selectedCarIds.length !== 1 ? "s" : ""} selected
            </span>
            {filteredCars.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={
                  allVisibleSelected ? deselectAllVisible : selectAllVisible
                }
              >
                {allVisibleSelected ? "Deselect All" : "Select All"} Visible
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {providedCars !== undefined
        ? providedLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )
        : loading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

      {/* Cars Grid */}
      {providedCars !== undefined
        ? !providedLoading && (
            <>
              {filteredCars.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {hasActiveFilters
                      ? "No cars found matching your criteria."
                      : "No cars available."}
                  </p>
                </div>
              ) : (
                <div
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
                    gridClassName
                  )}
                >
                  {filteredCars.map((car) => (
                    <div
                      key={car._id}
                      className={cn(
                        "relative",
                        selectionMode !== "none" && "cursor-pointer",
                        isCarSelected(car._id) &&
                          "ring-2 ring-blue-500 ring-offset-2 rounded-lg"
                      )}
                      onClick={() => handleCarClick(car)}
                    >
                      {/* Selection Indicator */}
                      {selectionMode !== "none" && (
                        <div className="absolute top-2 left-2 z-10">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                              isCarSelected(car._id)
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "bg-white border-gray-300"
                            )}
                          >
                            {isCarSelected(car._id) && (
                              <Check className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      )}

                      <CarCard car={car} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        : !loading && (
            <>
              {filteredCars.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {hasActiveFilters
                      ? "No cars found matching your criteria."
                      : "No cars available."}
                  </p>
                </div>
              ) : (
                <div
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
                    gridClassName
                  )}
                >
                  {filteredCars.map((car) => (
                    <div
                      key={car._id}
                      className={cn(
                        "relative",
                        selectionMode !== "none" && "cursor-pointer",
                        isCarSelected(car._id) &&
                          "ring-2 ring-blue-500 ring-offset-2 rounded-lg"
                      )}
                      onClick={() => handleCarClick(car)}
                    >
                      {/* Selection Indicator */}
                      {selectionMode !== "none" && (
                        <div className="absolute top-2 left-2 z-10">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                              isCarSelected(car._id)
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "bg-white border-gray-300"
                            )}
                          >
                            {isCarSelected(car._id) && (
                              <Check className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      )}

                      <CarCard car={car} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

      {/* Pagination */}
      {showPagination && !providedCars && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handlePageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Load More Button (for infinite scroll scenarios) */}
      {onLoadMore && hasMore && (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} disabled={loading}>
            {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
