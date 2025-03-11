"use client";

import React, { useEffect } from "react";
import Pagination from "@/components/Pagination";
import Navbar from "@/components/layout/navbar";
import CarFiltersSection from "@/components/cars/CarFiltersSection";
import Footer from "@/components/layout/footer";
import CarsViewWrapper from "@/components/cars/CarsViewWrapper";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import EditModeToggle from "@/components/cars/EditModeToggle";
import PageSizeSelector from "@/components/PageSizeSelector";
import SortSelector from "@/components/ui/SortSelector";
import { Car, Client } from "@/types/car";
import { PageTitle } from "@/components/ui/PageTitle";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Make } from "@/lib/fetchMakes";

// Debug utility function
function debugLog(
  message: string,
  data: any,
  level: "info" | "warn" | "error" = "info"
) {
  const styles = {
    label:
      "color: white; background-color: #4f46e5; padding: 2px 4px; border-radius: 2px; font-weight: bold;",
    info: "color: #4f46e5;",
    warn: "color: #f59e0b;",
    error: "color: #ef4444;",
  };

  if (typeof window !== "undefined") {
    console.groupCollapsed(
      `%c CARS DEBUG %c ${message}`,
      styles.label,
      styles[level]
    );
    console.log("Data:", data);

    if (level === "error") {
      console.error("Error details:", data);
    } else if (level === "warn") {
      console.warn("Warning details:", data);
    }

    console.trace("Component trace:");
    console.groupEnd();
  }
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
  };
  makes: Make[];
  clients: Client[];
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
  useEffect(() => {
    // Debug logging when component mounts
    debugLog("CarsPageClient mounted with props", {
      carsCount: cars.length,
      totalPages,
      currentPage,
      pageSize,
      totalCount,
      view,
      isEditMode,
      filters,
      makesCount: makes.length,
      clientsCount: clients.length,
    });

    // Log first car data if available for debugging
    if (cars && cars.length > 0) {
      debugLog("First car data sample", cars[0]);
    } else {
      debugLog("No cars available in props", {}, "warn");
    }

    // Check expected properties on Car objects
    if (cars && cars.length > 0) {
      const missingProperties = [];
      const carSample = cars[0];

      // Check required properties
      const requiredProps = ["_id", "make", "model", "year"];
      for (const prop of requiredProps) {
        if (carSample[prop as keyof Car] === undefined) {
          missingProperties.push(prop);
        }
      }

      if (missingProperties.length > 0) {
        debugLog(
          `Car objects missing required properties: ${missingProperties.join(
            ", "
          )}`,
          carSample,
          "error"
        );
      }
    }
  }, [
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
  ]);

  // Build the current search params string
  const currentSearchParams = new URLSearchParams({
    page: currentPage.toString(),
    pageSize: pageSize.toString(),
    view: view,
    edit: isEditMode.toString(),
    ...filters,
  }).toString();

  // Additional logging for render phase
  React.useEffect(() => {
    debugLog("CarsPageClient rendering", {
      carsLength: cars?.length || 0,
      filters,
    });

    // Log any network requests in the render phase
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = args[0];
      if (typeof url === "string" && url.includes("/api/cars")) {
        debugLog("Cars API fetch detected", { url, args }, "info");
      }
      return originalFetch.apply(this, args);
    };

    return () => {
      // Restore original fetch when component unmounts
      window.fetch = originalFetch;
    };
  }, []);

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
            }}
            makes={makes.map((make) => make.name)}
            clients={clients}
          />

          {/* Add car data debug info */}
          {process.env.NODE_ENV !== "production" && (
            <div className="my-2 p-2 border border-blue-500 rounded bg-blue-50 text-blue-800 text-xs">
              <div>
                Debug Info: {cars.length} cars loaded, {totalCount} total
              </div>
              <div>
                Current Page: {currentPage}, Total Pages: {totalPages}
              </div>
              <button
                onClick={() => console.log("Cars data:", cars)}
                className="bg-blue-200 p-1 rounded hover:bg-blue-300 mt-1"
              >
                Log Cars Data
              </button>
            </div>
          )}

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
