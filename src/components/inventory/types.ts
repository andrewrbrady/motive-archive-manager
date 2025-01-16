// app/inventory/page.tsx
import React from "react";
import { fetchInventory } from "@/lib/fetchInventory";
import { fetchDealers } from "@/lib/fetchDealers";
import { fetchMakes } from "@/lib/fetchMakes";
import Pagination from "@/components/Pagination";
import SearchBarWrapper from "./SearchBarWrapper";
import Navbar from "@/components/layout/navbar";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { InventoryItem, InventoryItemRaw } from "@/components/inventory/types";
import Footer from "@/components/layout/footer";
import FiltersSection from "@/components/inventory/FiltersSection";

interface InventoryPageProps {
  searchParams: {
    page?: string;
    search?: string;
    make?: string;
    model?: string;
    dealer?: string;
    minPrice?: string;
    maxPrice?: string;
    minMileage?: string;
    maxMileage?: string;
    minYear?: string;
    maxYear?: string;
    transmission?: string;
  };
}

function transformInventoryItem(item: InventoryItemRaw): InventoryItem {
  // Convert MongoDB timestamp (which might be in $date format) to ISO string
  let timestamp = undefined;
  if (item.timestamp) {
    if (typeof item.timestamp === "string") {
      timestamp = item.timestamp;
    } else if (
      typeof item.timestamp === "object" &&
      "$date" in item.timestamp
    ) {
      timestamp = new Date(item.timestamp.$date).toISOString();
    } else if (item.timestamp instanceof Date) {
      timestamp = item.timestamp.toISOString();
    }
  }

  return {
    id: item._id.toString(),
    url: item.url,
    category: item.category,
    color: item.color,
    condition: item.condition,
    dealer: item.dealer,
    fuel_type: item.fuel_type,
    images: item.images || [],
    primary_image: item.primary_image,
    location: item.location,
    make: item.make,
    model: item.model,
    mileage: item.mileage,
    mileage_raw: item.mileage_raw,
    odometer: item.odometer,
    price: item.price,
    price_raw: item.price_raw,
    stock_number: item.stock_number,
    vehicle_type: item.vehicle_type,
    vin: item.vin,
    year: item.year,
    transmission: item.trans,
    timestamp,
  };
}

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const make = searchParams.make || "";
  const model = searchParams.model || "";
  const dealer = searchParams.dealer || "";
  const minPrice = parseInt(searchParams.minPrice || "0", 10);
  const maxPrice = parseInt(searchParams.maxPrice || "999999999", 10);
  const minMileage = parseInt(searchParams.minMileage || "0", 10);
  const maxMileage = parseInt(searchParams.maxMileage || "999999999", 10);
  const minYear = parseInt(searchParams.minYear || "1900", 10);
  const maxYear = parseInt(
    searchParams.maxYear || new Date().getFullYear() + 1,
    10
  );
  const transmission = searchParams.transmission || "";

  // Fetch dealers and makes concurrently
  const [dealers, makes] = await Promise.all([fetchDealers(), fetchMakes()]);

  // Build filters object
  const filters: any = {};

  if (search) {
    filters.$or = [
      { make: { $regex: search, $options: "i" } },
      { model: { $regex: search, $options: "i" } },
      { dealer: { $regex: search, $options: "i" } },
    ];
  }

  // Add make filter
  if (make && make !== "All Makes") {
    filters.make = { $regex: make, $options: "i" };
  }

  // Add model filter
  if (model) {
    filters.model = { $regex: model, $options: "i" };
  }

  // Add dealer filter
  if (dealer && dealer !== "All Dealers") {
    filters.dealer = { $regex: dealer, $options: "i" };
  }

  // Add price filter
  if (minPrice > 0 || maxPrice < 999999999) {
    filters.price = {
      $gte: minPrice,
      $lte: maxPrice,
    };
  }

  // Add mileage filter
  if (minMileage > 0 || maxMileage < 999999999) {
    filters.mileage = {
      $gte: minMileage,
      $lte: maxMileage,
    };
  }

  // Add year filter
  if (minYear > 1900 || maxYear < new Date().getFullYear() + 1) {
    filters.year = {
      $gte: minYear,
      $lte: maxYear,
    };
  }

  // Add transmission filter
  if (transmission && transmission !== "All Types") {
    filters.trans = { $regex: transmission, $options: "i" };
  }

  // Get paginated results with filters
  const { results: rawResults, total } = await fetchInventory(
    page,
    12,
    filters
  );

  const results = rawResults.map(transformInventoryItem);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar className="fixed top-0 w-full z-50 bg-[#1a1f3c] shadow-md" />

      <main className="flex-1 w-full pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold">
                Vehicle Inventory ({total} vehicles)
              </h1>
              <SearchBarWrapper initialSearch={search} />
            </div>

            <FiltersSection
              currentFilters={{
                make,
                model,
                dealer,
                minPrice: minPrice.toString(),
                maxPrice: maxPrice === 999999999 ? "" : maxPrice.toString(),
                minMileage: minMileage.toString(),
                maxMileage:
                  maxMileage === 999999999 ? "" : maxMileage.toString(),
                minYear: minYear === 1900 ? "" : minYear.toString(),
                maxYear:
                  maxYear === new Date().getFullYear() + 1
                    ? ""
                    : maxYear.toString(),
                transmission,
              }}
              dealers={dealers}
              makes={makes}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}

              {results.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-600">
                    No vehicles found matching your criteria.
                  </p>
                </div>
              )}
            </div>

            {total > 12 && (
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(total / 12)}
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
