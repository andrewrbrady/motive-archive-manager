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
import SortSelector from "../../components/ui/SortSelector";
import { Car, Client } from "@/types/car";
import { PageTitle } from "@/components/ui/PageTitle";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Make } from "@/lib/fetchMakes";

interface CarsPageClientProps {
  cars: Car[];
  totalPages: number;
  currentPage: number;
  pageSize: number;
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
  };
  makes: Make[];
  clients: Client[];
}

export default function CarsPageClient({
  cars,
  totalPages,
  currentPage,
  pageSize,
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#111111]">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle title="Cars Collection" count={totalPages * pageSize}>
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
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
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
