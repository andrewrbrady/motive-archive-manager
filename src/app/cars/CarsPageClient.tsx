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
import { Plus } from "lucide-react";
import { Make } from "@/lib/fetchMakes";
import { CarGridSelector } from "@/components/cars/CarGridSelector";

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

  // Fetch data on client side if needed
  useEffect(() => {
    if (!shouldFetchData) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Build query params
        const queryParams = new URLSearchParams();
        queryParams.set("page", currentPage.toString());
        queryParams.set("pageSize", pageSize.toString());

        // Add filter parameters if they exist
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== "") {
            queryParams.set(key, value);
          }
        });

        // Fetch cars, makes, and clients in parallel
        const [carsResponse, makesResponse, clientsResponse] =
          await Promise.all([
            fetch(`/api/cars/simple?${queryParams.toString()}`),
            fetch("/api/cars/makes"),
            fetch("/api/clients"),
          ]);

        if (carsResponse.ok) {
          const carsData = await carsResponse.json();
          setCars(carsData.cars || []);
          setTotalPages(carsData.pagination?.totalPages || 1);
          setTotalCount(carsData.pagination?.totalCount || 0);
        }

        if (makesResponse.ok) {
          const makesData = await makesResponse.json();
          setMakes(makesData.makes || []);
        }

        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
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
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [shouldFetchData, currentPage, pageSize, filters]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading cars...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
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

          {/* Controls Section */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <ViewModeSelector currentView={view} />
              <PageSizeSelector
                currentPageSize={pageSize}
                options={[12, 24, 48, 96]}
              />
              <SortSelector currentSort={filters.sort || "createdAt_desc"} />
            </div>
          </div>

          {useNewGridSelector ? (
            <CarGridSelector
              selectionMode="none"
              cars={cars}
              loading={false}
              showFilters={true}
              showPagination={false} // We'll handle pagination separately for now
              useUrlFilters={true} // Enable URL-based filtering
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

          {/* Bottom Pagination */}
          {totalPages > 1 && (
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
  );
}
