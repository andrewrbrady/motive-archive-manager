// app/inventory/page.tsx
import React from "react";
import { fetchInventory } from "@/lib/fetchInventory";
import { fetchDealers } from "@/lib/fetchDealers";
import { fetchMakes } from "@/lib/fetchMakes";
import Pagination from "@/components/Pagination";
import Navbar from "@/components/layout/navbar";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import {
  InventoryItem,
  InventoryPageProps,
  transformInventoryItem,
  InventoryItemRaw,
} from "@/components/inventory/types";
import Footer from "@/components/layout/footer";
import FiltersSection from "@/components/inventory/FiltersSection";
import { PageTitle } from "@/components/ui/PageTitle";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const page = Number(searchParams.page) || 1;
  const view = (searchParams.view || "grid") as "grid" | "list";
  const filters = {
    make: searchParams.make,
    model: searchParams.model,
    dealer: searchParams.dealer,
    minPrice: searchParams.minPrice,
    maxPrice: searchParams.maxPrice,
    minMileage: searchParams.minMileage,
    maxMileage: searchParams.maxMileage,
    minYear: searchParams.minYear,
    maxYear: searchParams.maxYear,
    transmission: searchParams.transmission,
  };

  // Clean up undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key as keyof typeof filters] === undefined) {
      delete filters[key as keyof typeof filters];
    }
  });

  const [{ results: rawResults, total }, dealers, makes] = await Promise.all([
    fetchInventory(page, 12, filters),
    fetchDealers(),
    fetchMakes(),
  ]);

  const results = rawResults.map((item: InventoryItemRaw) =>
    transformInventoryItem(item)
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#111111]">
      <nav className="fixed top-0 w-full z-50 bg-[#1a1f3c] shadow-md">
        <Navbar />
      </nav>

      <main className="flex-1 w-full pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col space-y-6">
            <PageTitle title="Vehicle Inventory" count={total}>
              <ViewModeSelector currentView={view} />
            </PageTitle>

            <FiltersSection
              currentFilters={{
                make: filters.make || "",
                model: filters.model || "",
                dealer: filters.dealer || "",
                minPrice: filters.minPrice || "",
                maxPrice: filters.maxPrice || "",
                minMileage: filters.minMileage || "",
                maxMileage: filters.maxMileage || "",
                minYear: filters.minYear || "",
                maxYear: filters.maxYear || "",
                transmission: filters.transmission || "",
                color: "",
                interior_color: "",
              }}
              _dealers={dealers}
              makes={makes}
            />

            {results.length > 0 ? (
              <div
                className={`${
                  view === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "flex flex-col space-y-4"
                }`}
              >
                {results.map((item: InventoryItem) => (
                  <InventoryCard key={item.id} item={item} view={view} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">
                  No vehicles found matching your criteria
                </p>
              </div>
            )}

            {total > 12 && (
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(total / 12)}
                  pageSize={12}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
