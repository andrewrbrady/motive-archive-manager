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
    engineFeatures?: string;
    minPrice?: string;
    maxPrice?: string;
    status?: string;
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
              <Link
                href="/cars/new"
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Car
              </Link>
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
              <EditModeToggle isEditMode={isEditMode} />
              <ViewModeSelector currentView={view} />
            </div>
          </PageTitle>

          <CarFiltersSection
            currentFilters={{
              make: filters.make || "",
              minYear: filters.minYear || "",
              maxYear: filters.maxYear || "",
              clientId: filters.clientId || "",
              engineFeatures: filters.engineFeatures || "",
              minPrice: filters.minPrice || "",
              maxPrice: filters.maxPrice || "",
              status: filters.status || "",
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
