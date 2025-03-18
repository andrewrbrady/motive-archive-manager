"use client";

import React from "react";
import Pagination from "@/components/Pagination";
import Navbar from "@/components/layout/navbar";
import CarFiltersSection from "@/components/cars/CarFiltersSection";
import Footer from "@/components/layout/footer";
import CarsViewWrapper from "@/components/cars/CarsViewWrapper";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import EditModeToggle from "@/components/cars/EditModeToggle";
import PageSizeSelector from "@/components/PageSizeSelector";
import SortSelector from "@/components/ui/SortSelector";
import { Car } from "@/types/car";
import { Client } from "@/types/contact";
import { PageTitle } from "@/components/ui/PageTitle";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Make } from "@/lib/fetchMakes";

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
    minPrice?: string;
    maxPrice?: string;
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
    ...filters,
  }).toString();

  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] dark:bg-[var(--background-primary)]">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle title="Cars Collection" count={totalCount}>
            <div className="flex items-center gap-4 ml-auto">
              <SortSelector currentSort={filters.sort || "createdAt_desc"} />
              <PageSizeSelector
                currentPageSize={pageSize}
                options={[12, 24, 48, 96]}
              />
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                />
              )}
              <ViewModeSelector currentView={view} />
              <EditModeToggle isEditMode={isEditMode} />
              <Link
                href="/cars/new"
                className="p-2 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:hover:text-[hsl(var(--foreground-subtle))] transition-colors rounded-full hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] border border-[hsl(var(--border))] dark:border-[hsl(var(--border))]"
                title="Add New Car"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </PageTitle>

          <CarFiltersSection
            currentFilters={{
              make: filters.make || "",
              minYear: filters.minYear || "",
              maxYear: filters.maxYear || "",
              clientId: filters.clientId || "",
              minPrice: filters.minPrice || "",
              maxPrice: filters.maxPrice || "",
              search: filters.search || "",
            }}
            makes={makes.map((make) => make.name)}
            clients={clients}
          />

          <CarsViewWrapper
            cars={cars}
            viewMode={view}
            currentSearchParams={currentSearchParams}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
