"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Dealer } from "@/lib/fetchDealers";
import { Make } from "@/lib/fetchMakes";
import {
  FilterSection,
  FilterItem,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from "@/components/ui/FilterSection";

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
  _dealers: Dealer[];
  makes: Make[];
}

interface Filters {
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
  [key: string]: string; // Add index signature
}

export default function FiltersSection({
  currentFilters,
  _dealers,
  makes,
}: FiltersSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [filters, setFilters] = useState<Filters>({
    make: "",
    model: "",
    dealer: "",
    minPrice: "",
    maxPrice: "",
    minMileage: "",
    maxMileage: "",
    minYear: "",
    maxYear: "",
    transmission: "",
    color: "",
    interior_color: "",
  });

  const transmissions = ["All Types", "Automatic", "Manual", "DCT"];

  // Generate year options (from 1960 to current year + 1)
  const currentYear = new Date().getFullYear() + 1;
  const _years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) =>
    (currentYear - i).toString()
  );

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const newFilters = { ...filters };
    newFilters[key] = value;
    setFilters(newFilters);

    const params = new URLSearchParams(searchParams.toString());

    // Helper function to handle filter parameters
    const setOrDeleteParam = (
      key: string,
      value: string,
      defaultValue?: string
    ) => {
      if (key.includes("Year")) {
        // For year fields, only update when it's a 4-digit number
        if (value && /^\d{4}$/.test(value)) {
          params.set(key, value);
        } else if (!value) {
          params.delete(key);
        }
      } else if (key.includes("Price") || key.includes("Mileage")) {
        // For price and mileage fields, update even if empty to preserve partial values
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

  const _applyFilters = (newFilters: typeof filters) => {
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
    <FilterSection onClearFilters={clearFilters}>
      <FilterItem>
        <FilterLabel>Make</FilterLabel>
        <FilterSelect
          value={filters.make || "All Makes"}
          onChange={(e) => handleFilterChange("make", e.target.value)}
        >
          <option value="All Makes">All Makes</option>
          {makes.map((make) => (
            <option key={make._id} value={make.name}>
              {make.name}
            </option>
          ))}
        </FilterSelect>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Model</FilterLabel>
        <FilterInput
          type="text"
          value={filters.model || ""}
          onChange={(e) => handleFilterChange("model", e.target.value)}
          placeholder="Enter model"
        />
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
        <FilterLabel>Price Range</FilterLabel>
        <div className="grid grid-cols-2 gap-2">
          <FilterInput
            type="number"
            value={filters.minPrice || ""}
            onChange={(e) => handleFilterChange("minPrice", e.target.value)}
            placeholder="Min"
          />
          <FilterInput
            type="number"
            value={filters.maxPrice || ""}
            onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
            placeholder="Max"
          />
        </div>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Mileage Range</FilterLabel>
        <div className="grid grid-cols-2 gap-2">
          <FilterInput
            type="number"
            value={filters.minMileage || ""}
            onChange={(e) => handleFilterChange("minMileage", e.target.value)}
            placeholder="Min"
          />
          <FilterInput
            type="number"
            value={filters.maxMileage || ""}
            onChange={(e) => handleFilterChange("maxMileage", e.target.value)}
            placeholder="Max"
          />
        </div>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Dealer</FilterLabel>
        <FilterSelect
          value={filters.dealer || "All Dealers"}
          onChange={(e) => handleFilterChange("dealer", e.target.value)}
        >
          <option value="All Dealers">All Dealers</option>
          {_dealers.map((dealer) => (
            <option key={dealer._id} value={dealer.name}>
              {dealer.name}
            </option>
          ))}
        </FilterSelect>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Transmission</FilterLabel>
        <FilterSelect
          value={filters.transmission || "All Types"}
          onChange={(e) => handleFilterChange("transmission", e.target.value)}
        >
          {transmissions.map((transmission) => (
            <option key={transmission} value={transmission}>
              {transmission}
            </option>
          ))}
        </FilterSelect>
      </FilterItem>
    </FilterSection>
  );
}
