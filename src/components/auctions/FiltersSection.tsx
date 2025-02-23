"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FilterSection,
  FilterItem,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from "@/components/ui/FilterSection";

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
    platformId: string;
    minYear: string;
    maxYear: string;
    noReserve: boolean;
    endDate: string;
  };
  makes: Make[];
  platforms: Platform[];
}

type FilterKey = keyof FiltersSectionProps["currentFilters"];
type FilterValue<K extends FilterKey> =
  FiltersSectionProps["currentFilters"][K];

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
    noReserve: currentFilters.noReserve,
    endDate: currentFilters.endDate || "",
  });

  const handleFilterChange = <K extends FilterKey>(
    key: K,
    value: FilterValue<K>
  ) => {
    const newFilters = { ...filters };
    newFilters[key] = value;
    setFilters(newFilters);

    const params = new URLSearchParams(searchParams.toString());

    const setOrDeleteParam = (
      key: string,
      value: string | boolean,
      defaultValue?: string
    ) => {
      if (typeof value === "string") {
        if (key.includes("Year")) {
          // For year fields, only update when it's a 4-digit number
          if (value && /^\d{4}$/.test(value)) {
            params.set(key, value);
          } else if (!value) {
            params.delete(key);
          }
        } else if (key.includes("Price")) {
          // For price fields, update even if empty to preserve partial values
          if (value && value !== defaultValue) {
            params.set(key, value);
          } else {
            params.delete(key);
          }
        } else {
          // For other fields, only set if non-empty and not default
          if (value && value !== defaultValue) {
            params.set(key, value);
          } else {
            params.delete(key);
          }
        }
      } else {
        // Handle boolean values (like noReserve)
        if (value) {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      }
    };

    // Only pass the endDate value, not an object
    setOrDeleteParam("endDate", newFilters.endDate);
    setOrDeleteParam("make", newFilters.make, "All Makes");
    setOrDeleteParam("platformId", newFilters.platformId);
    setOrDeleteParam("minYear", newFilters.minYear);
    setOrDeleteParam("maxYear", newFilters.maxYear);
    setOrDeleteParam("noReserve", newFilters.noReserve);

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
    <FilterSection onClearFilters={clearFilters}>
      <FilterItem>
        <FilterLabel>Source</FilterLabel>
        <FilterSelect
          value={currentFilters.platformId || ""}
          onChange={(e) => handleFilterChange("platformId", e.target.value)}
        >
          <option value="">All Sources</option>
          {platforms.map((platform) => (
            <option key={platform._id} value={platform._id}>
              {platform.name}
            </option>
          ))}
        </FilterSelect>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Make</FilterLabel>
        <FilterSelect
          value={filters.make || "All Makes"}
          onChange={(e) => handleFilterChange("make", e.target.value)}
        >
          <option value="All Makes">All Makes</option>
          {makes.map((make) => (
            <option key={`make-${make._id}`} value={make.name}>
              {make.name}
            </option>
          ))}
        </FilterSelect>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Year Range</FilterLabel>
        <div className="grid grid-cols-2 gap-2">
          <FilterInput
            type="number"
            value={filters.minYear || ""}
            onChange={(e) => handleFilterChange("minYear", e.target.value)}
            placeholder="Min"
          />
          <FilterInput
            type="number"
            value={filters.maxYear || ""}
            onChange={(e) => handleFilterChange("maxYear", e.target.value)}
            placeholder="Max"
          />
        </div>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Ending</FilterLabel>
        <FilterSelect
          value={filters.endDate || ""}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
        >
          {END_DATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
      </FilterItem>

      <FilterItem>
        <div className="flex items-center space-y-0">
          <input
            type="checkbox"
            id="noReserve"
            checked={filters.noReserve}
            onChange={(e) => handleFilterChange("noReserve", e.target.checked)}
            className="h-4 w-4 text-info-600 dark:text-info-400 border-[hsl(var(--border-primary))] dark:border-[hsl(var(--border-subtle))] rounded focus:ring-info-500 dark:focus:ring-info-400"
          />
          <label
            htmlFor="noReserve"
            className="ml-2 block text-sm text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
          >
            No Reserve Only
          </label>
        </div>
      </FilterItem>
    </FilterSection>
  );
}
