// components/cars/CarFiltersSection.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface FilterProps {
  make: string;
  minYear: string;
  maxYear: string;
  minPrice: string;
  maxPrice: string;
  status: string;
  engineFeatures: string;
  clientId: string;
}

interface CarFiltersSectionProps {
  currentFilters: FilterProps;
  makes: string[];
  clients?: any[];
  onFilterChange?: (filters: FilterProps) => void;
}

export default function CarFiltersSection({
  currentFilters,
  makes,
  clients,
  onFilterChange,
}: CarFiltersSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = React.useState(currentFilters);

  const handleFilterChange = (field: keyof FilterProps, value: string) => {
    const newFilters = {
      ...filters,
      [field]: value,
    };
    setFilters(newFilters);

    const params = new URLSearchParams(searchParams.toString());

    // Update the URL parameters
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val && val.trim() !== "") {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });

    // Preserve view mode and page size
    const view = searchParams.get("view");
    const pageSize = searchParams.get("pageSize");
    if (view) params.set("view", view);
    if (pageSize) params.set("pageSize", pageSize);
    params.set("page", "1"); // Reset to first page

    router.push(`/cars?${params.toString()}`);
  };

  const clearFilters = () => {
    const emptyFilters = {
      make: "",
      minYear: "",
      maxYear: "",
      minPrice: "",
      maxPrice: "",
      status: "",
      engineFeatures: "",
      clientId: "",
    };
    setFilters(emptyFilters);

    const params = new URLSearchParams();
    const view = searchParams.get("view");
    const pageSize = searchParams.get("pageSize");
    if (view) params.set("view", view);
    if (pageSize) params.set("pageSize", pageSize);
    params.set("page", "1");

    router.push(`/cars?${params.toString()}`);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Make filter */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Make
          </label>
          <select
            value={filters.make}
            onChange={(e) => handleFilterChange("make", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">All Makes</option>
            {makes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </div>

        {/* Year range */}
        <div className="flex-1 min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year Range
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              placeholder="Min"
              value={filters.minYear}
              onChange={(e) => handleFilterChange("minYear", e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              placeholder="Max"
              value={filters.maxYear}
              onChange={(e) => handleFilterChange("maxYear", e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        {/* Price range */}
        <div className="flex-1 min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Range
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        {/* Engine Features */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Engine Type
          </label>
          <select
            value={filters.engineFeatures}
            onChange={(e) =>
              handleFilterChange("engineFeatures", e.target.value)
            }
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Any Type</option>
            <option value="naturally aspirated">Naturally Aspirated</option>
          </select>
        </div>

        {/* Client/Dealer */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dealer
          </label>
          <select
            value={filters.clientId}
            onChange={(e) => handleFilterChange("clientId", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">All Dealers</option>
            {clients?.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
