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
  condition: string;
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

  const currentYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) =>
    (currentYear - i).toString()
  );

  const handleFilterChange = (field: keyof FilterProps, value: string) => {
    if (onFilterChange) {
      onFilterChange({
        ...currentFilters,
        [field]: value,
      });
    }
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    Object.keys(filters).forEach((key) => params.delete(key));
    router.push(`/cars?${params.toString()}`);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Make filter */}
        <div>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Year
          </label>
          <select
            value={filters.minYear}
            onChange={(e) => handleFilterChange("minYear", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Any Year</option>
            {years.map((year) => (
              <option key={`min-${year}`} value={year}>
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
            value={filters.maxYear}
            onChange={(e) => handleFilterChange("maxYear", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Any Year</option>
            {years.map((year) => (
              <option key={`max-${year}`} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition
          </label>
          <select
            value={filters.condition}
            onChange={(e) => handleFilterChange("condition", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Any Condition</option>
            <option value="New">New</option>
            <option value="Used">Used</option>
          </select>
        </div>

        {/* Engine Features */}
        <div>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dealer
          </label>
          <select
            value={filters.clientId}
            onChange={(e) => handleFilterChange("clientId", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">All Dealers</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters */}
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
