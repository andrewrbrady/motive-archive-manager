"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dealer } from "@/lib/fetchDealers";
import { Make } from "@/lib/fetchMakes";

// components/inventory/FiltersSection.tsx
interface FiltersSectionProps {
  currentFilters: {
    make: string;
    model: string;
    dealer: string;
    minPrice: string;
    maxPrice: string;
    minMileage: string;
    maxMileage: string;
    minYear: string;
    maxYear: string;
    transmission: string;
    color: string;
    interior_color: string;
  };
  dealers: Dealer[];
  makes: Make[];
}

export default function FiltersSection({
  currentFilters,
  dealers,
  makes,
}: FiltersSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = React.useState(currentFilters);

  const transmissions = ["All Types", "Automatic", "Manual", "DCT"];

  // Generate year options (from 1960 to current year + 1)
  const currentYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) =>
    (currentYear - i).toString()
  );

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (newFilters: typeof filters) => {
    const params = new URLSearchParams(searchParams.toString());

    // Helper function to handle filter parameters
    const setOrDeleteParam = (
      key: string,
      value: string,
      defaultValue?: string
    ) => {
      if (value && value !== defaultValue) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    };

    setOrDeleteParam("make", newFilters.make, "All Makes");
    setOrDeleteParam("model", newFilters.model);
    setOrDeleteParam("dealer", newFilters.dealer, "All Dealers");
    setOrDeleteParam("transmission", newFilters.transmission, "All Types");
    setOrDeleteParam("minPrice", newFilters.minPrice, "0");
    setOrDeleteParam("maxPrice", newFilters.maxPrice);
    setOrDeleteParam("minMileage", newFilters.minMileage, "0");
    setOrDeleteParam("maxMileage", newFilters.maxMileage);
    setOrDeleteParam("minYear", newFilters.minYear);
    setOrDeleteParam("maxYear", newFilters.maxYear);

    // Preserve the search parameter if it exists
    const search = searchParams.get("search");
    if (search) {
      params.set("search", search);
    }

    // Reset to first page when filters change
    params.set("page", "1");

    router.push(`/inventory?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    [
      "make",
      "model",
      "dealer",
      "minPrice",
      "maxPrice",
      "minMileage",
      "maxMileage",
      "minYear",
      "maxYear",
      "transmission",
    ].forEach((key) => params.delete(key));

    // Preserve the search parameter if it exists
    const search = searchParams.get("search");
    if (search) {
      params.set("search", search);
    }

    router.push(`/inventory?${params.toString()}`);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Make Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Make
          </label>
          <select
            value={filters.make || "All Makes"}
            onChange={(e) => handleFilterChange("make", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="All Makes">All Makes</option>
            {makes.map((make) => (
              <option key={make._id} value={make.name}>
                {make.name}
              </option>
            ))}
          </select>
        </div>

        {/* Model Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <input
            type="text"
            value={filters.model || ""}
            onChange={(e) => handleFilterChange("model", e.target.value)}
            placeholder="Enter model"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        {/* Dealer Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dealer
          </label>
          <select
            value={filters.dealer || "All Dealers"}
            onChange={(e) => handleFilterChange("dealer", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="All Dealers">All Dealers</option>
            {dealers.map((dealer) => (
              <option key={dealer._id} value={dealer.name}>
                {dealer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Transmission Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transmission
          </label>
          <select
            value={filters.transmission || "All Types"}
            onChange={(e) => handleFilterChange("transmission", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            {transmissions.map((transmission) => (
              <option key={transmission} value={transmission}>
                {transmission}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Price
          </label>
          <input
            type="number"
            value={filters.minPrice || ""}
            onChange={(e) => handleFilterChange("minPrice", e.target.value)}
            placeholder="Min Price"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Price
          </label>
          <input
            type="number"
            value={filters.maxPrice || ""}
            onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
            placeholder="Max Price"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        {/* Mileage Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Mileage
          </label>
          <input
            type="number"
            value={filters.minMileage || ""}
            onChange={(e) => handleFilterChange("minMileage", e.target.value)}
            placeholder="Min Mileage"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Mileage
          </label>
          <input
            type="number"
            value={filters.maxMileage || ""}
            onChange={(e) => handleFilterChange("maxMileage", e.target.value)}
            placeholder="Max Mileage"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        {/* Year Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Year
          </label>
          <select
            value={filters.minYear || ""}
            onChange={(e) => handleFilterChange("minYear", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Select Year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Year
          </label>
          <select
            value={filters.maxYear || ""}
            onChange={(e) => handleFilterChange("maxYear", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Select Year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
