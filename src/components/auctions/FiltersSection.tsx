"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

const END_DATE_OPTIONS = [
  { value: "", label: "Any Time" },
  { value: "24h", label: "Next 24 Hours" },
  { value: "48h", label: "Next 48 Hours" },
  { value: "72h", label: "Next 72 Hours" },
  { value: "1w", label: "Next Week" },
  { value: "2w", label: "Next 2 Weeks" },
  { value: "1m", label: "Next Month" },
];

interface Make {
  _id: string;
  name: string;
}

interface Platform {
  _id: string;
  name: string;
  color: string;
}

interface FiltersSectionProps {
  currentFilters: {
    make: string;
    model: string;
    platformId: string;
    minPrice: string;
    maxPrice: string;
    minYear: string;
    maxYear: string;
    noReserve: boolean;
    endDate: string;
  };
  makes: Make[];
  platforms: Platform[];
}

export function FiltersSection({
  currentFilters,
  makes,
  platforms,
}: FiltersSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = React.useState<
    FiltersSectionProps["currentFilters"]
  >({
    ...currentFilters,
    platformId: currentFilters.platformId,
    noReserveOnly: currentFilters.noReserve,
    endDate: currentFilters.endDate || "",
  });

  const currentYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) =>
    (currentYear - i).toString()
  );

  const handleFilterChange = (key: string, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };

    // Special handling for make filter
    if (key === "make" && value === "All Makes") {
      delete newFilters.make;
    }

    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (newFilters: typeof filters) => {
    const params = new URLSearchParams(searchParams.toString());

    const setOrDeleteParam = (
      key: string,
      value: string | boolean,
      defaultValue?: string
    ) => {
      if (value && value !== defaultValue) {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    };

    // Only pass the endDate value, not an object
    setOrDeleteParam("endDate", newFilters.endDate);
    setOrDeleteParam("make", newFilters.make, "All Makes");
    setOrDeleteParam("platformId", newFilters.platformId);
    setOrDeleteParam("minYear", newFilters.minYear);
    setOrDeleteParam("maxYear", newFilters.maxYear);
    setOrDeleteParam("noReserve", newFilters.noReserveOnly);

    // Preserve the search parameter if it exists
    const search = searchParams.get("search");
    if (search) {
      params.set("search", search);
    }

    // Reset to first page when filters change
    params.set("page", "1");

    router.push(`/auctions?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    [
      "make",
      "minYear",
      "maxYear",
      "noReserve",
      "platformId",
      "endDate",
    ].forEach((key) => params.delete(key));

    const search = searchParams.get("search");
    if (search) {
      params.set("search", search);
    }

    router.push(`/auctions?${params.toString()}`);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            value={currentFilters.platformId || ""}
            onChange={(e) => handleFilterChange("platformId", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">All Sources</option>
            {platforms.map((platform) => (
              <option key={platform._id} value={platform._id}>
                {platform.name}
              </option>
            ))}
          </select>
        </div>

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
              <option key={`make-${make._id}`} value={make.name}>
                {make.name}
              </option>
            ))}
          </select>
        </div>

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
              <option key={`min-year-${year}`} value={year}>
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
              <option key={`max-year-${year}`} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ending
          </label>
          <select
            value={filters.endDate || ""}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            {END_DATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="noReserve"
            checked={filters.noReserveOnly}
            onChange={(e) =>
              handleFilterChange("noReserveOnly", e.target.checked)
            }
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label
            htmlFor="noReserve"
            className="ml-2 block text-sm text-gray-700"
          >
            No Reserve Only
          </label>
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
