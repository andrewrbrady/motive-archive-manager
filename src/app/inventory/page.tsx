// app/inventory/page.tsx
import React from "react";
import Navbar from "@/components/layout/navbar";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { InventoryPageProps } from "@/components/inventory/types";
import { InventoryItem } from "@/types/inventory";
import Footer from "@/components/layout/footer";
import FiltersSection from "@/components/inventory/FiltersSection";
import { GridView } from "@/components/inventory/GridView";

export default async function Page({ searchParams }: InventoryPageProps) {
  const page = parseInt(searchParams.page || "1");
  const view = searchParams.view || "grid";
  const search = searchParams.search || "";
  const make = searchParams.make || "";
  const model = searchParams.model || "";
  const dealer = searchParams.dealer || "";
  const minPrice = searchParams.minPrice || "";
  const maxPrice = searchParams.maxPrice || "";
  const minMileage = searchParams.minMileage || "";
  const maxMileage = searchParams.maxMileage || "";
  const minYear = searchParams.minYear || "";
  const maxYear = searchParams.maxYear || "";
  const transmission = searchParams.transmission || "";

  const params = new URLSearchParams({
    page: page.toString(),
    search,
    make,
    model,
    dealer,
    minPrice,
    maxPrice,
    minMileage,
    maxMileage,
    minYear,
    maxYear,
    transmission,
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/inventory?${params.toString()}`
  );
  const data = await response.json();
  const { results, total, totalPages } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Inventory
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <FiltersSection
              searchParams={searchParams}
              total={total}
              view={view}
            />

            <div className="lg:col-span-3">
              <GridView cars={results} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
