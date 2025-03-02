// app/inventory/page.tsx
import React from "react";
import { fetchInventory } from "@/lib/fetchInventory";
import { fetchDealers } from "@/lib/fetchDealers";
import { fetchMakes } from "@/lib/fetchMakes";
import Pagination from "@/components/Pagination";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import {
  VehicleInventoryItem,
  InventoryPageProps,
  transformInventoryItem,
  InventoryItemRaw,
} from "@/components/inventory/types";
import Footer from "@/components/layout/footer";
import FiltersSection from "@/components/inventory/FiltersSection";
import { PageTitle } from "@/components/ui/PageTitle";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";

// Update the InventoryPageProps interface to include tab
interface ExtendedInventoryPageProps extends InventoryPageProps {
  searchParams: InventoryPageProps["searchParams"] & {
    tab?: string;
  };
}

export default async function InventoryPage({
  searchParams,
}: ExtendedInventoryPageProps) {
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

  // Check if we're on the market page or inventory page
  const isMarketPage = searchParams.tab !== undefined;

  return (
    <div className="flex flex-col space-y-6">
      {!isMarketPage && (
        <PageTitle title="Vehicle Inventory" count={total}>
          <ViewModeSelector currentView={view} />
        </PageTitle>
      )}

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
        <div className="space-y-8">
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "flex flex-col space-y-6"
            }
          >
            {results.map((item) => (
              <InventoryCard key={item.id} item={item} view={view} />
            ))}
          </div>

          {total > 12 && (
            <div className="flex justify-center mt-8">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(total / 12)}
                pageSize={12}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <h3 className="text-xl font-medium mb-2">No vehicles found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or check back later for new inventory.
          </p>
        </div>
      )}
    </div>
  );
}
