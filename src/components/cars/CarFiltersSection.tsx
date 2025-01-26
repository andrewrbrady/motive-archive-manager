// components/cars/CarFiltersSection.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client } from "@/types/car";
import {
  FilterSection,
  FilterItem,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from "@/components/ui/FilterSection";

interface CarFiltersSectionProps {
  currentFilters: {
    make: string;
    minYear: string;
    maxYear: string;
    clientId: string;
    engineFeatures: string;
    minPrice: string;
    maxPrice: string;
    status: string;
  };
  makes: string[];
  clients: Client[];
}

export default function CarFiltersSection({
  currentFilters,
  makes,
  clients,
}: CarFiltersSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = React.useState(currentFilters);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    const newFilters = {
      ...filters,
      [field]: value,
    };

    setFilters(newFilters);

    const params = new URLSearchParams(searchParams.toString());

    // Update the URL parameters
    Object.entries(newFilters).forEach(([key, val]) => {
      if (key.includes("Year")) {
        // For year fields, only update when it's a 4-digit number
        if (val && /^\d{4}$/.test(val)) {
          params.set(key, val);
        } else if (!val) {
          params.delete(key);
        }
      } else if (key.includes("Price")) {
        // For price fields, update even if empty to preserve partial values
        params.set(key, val);
        if (!val) {
          params.delete(key);
        }
      } else {
        // For other fields, only set if non-empty
        if (val && val.trim() !== "") {
          params.set(key, val);
        } else {
          params.delete(key);
        }
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

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return (
    <FilterSection
      hasActiveFilters={hasActiveFilters}
      onClearFilters={clearFilters}
    >
      <FilterItem>
        <FilterLabel>Make</FilterLabel>
        <FilterSelect
          name="make"
          value={filters.make}
          onChange={(e) => handleFilterChange("make", e.target.value)}
        >
          <option value="">Any Make</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </FilterSelect>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Year Range</FilterLabel>
        <div className="grid grid-cols-2 gap-2">
          <FilterInput
            type="number"
            name="minYear"
            placeholder="Min"
            value={filters.minYear}
            onChange={(e) => handleFilterChange("minYear", e.target.value)}
          />
          <FilterInput
            type="number"
            name="maxYear"
            placeholder="Max"
            value={filters.maxYear}
            onChange={(e) => handleFilterChange("maxYear", e.target.value)}
          />
        </div>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Price Range</FilterLabel>
        <div className="grid grid-cols-2 gap-2">
          <FilterInput
            type="number"
            name="minPrice"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange("minPrice", e.target.value)}
          />
          <FilterInput
            type="number"
            name="maxPrice"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
          />
        </div>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Client</FilterLabel>
        <FilterSelect
          name="clientId"
          value={filters.clientId}
          onChange={(e) => handleFilterChange("clientId", e.target.value)}
        >
          <option value="">Any Client</option>
          {clients.map((client) => (
            <option key={client._id} value={client._id}>
              {client.name}
            </option>
          ))}
        </FilterSelect>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Engine Features</FilterLabel>
        <FilterSelect
          name="engineFeatures"
          value={filters.engineFeatures}
          onChange={(e) => handleFilterChange("engineFeatures", e.target.value)}
        >
          <option value="">Any Type</option>
          <option value="turbo">Turbo</option>
          <option value="supercharged">Supercharged</option>
          <option value="hybrid">Hybrid</option>
          <option value="electric">Electric</option>
        </FilterSelect>
      </FilterItem>

      <FilterItem>
        <FilterLabel>Status</FilterLabel>
        <FilterSelect
          name="status"
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          <option value="">Any Status</option>
          <option value="available">Available</option>
          <option value="sold">Sold</option>
          <option value="pending">Pending</option>
        </FilterSelect>
      </FilterItem>
    </FilterSection>
  );
}
