"use client";

import React from "react";
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
}

export default function CarsPageClient({
  cars,
  totalPages,
  currentPage,
  pageSize,
  totalCount,
  view,
  isEditMode,
  filters,
  makes,
  clients,
}: CarsPageClientProps) {
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div className="space-y-6 sm:space-y-8">
          <PageTitle title="Cars Collection" count={totalCount}>
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1 min-w-0">
                  <SortSelector
                    currentSort={filters.sort || "createdAt_desc"}
                  />
                </div>
                <PageSizeSelector
                  currentPageSize={pageSize}
                  options={[12, 24, 48, 96]}
                />
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {totalPages > 1 && !useNewGridSelector && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                  />
                )}

                <div className="hidden sm:flex">
                  <ViewModeSelector currentView={view} />
                </div>

                <Link
                  href="/cars/new"
                  className="inline-flex items-center justify-center w-8 h-8 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:hover:text-[hsl(var(--foreground-subtle))] transition-colors rounded-full hover:bg-[hsl(var(--background-secondary))] dark:hover:bg-[hsl(var(--background-secondary))] border border-[hsl(var(--border))] dark:border-[hsl(var(--border))] flex-shrink-0"
                  title="Add New Car"
                >
                  <Plus className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </PageTitle>

          {/* Use new grid selector for grid view, old filters for list view */}
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
