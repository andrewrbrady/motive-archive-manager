// components/cars/CarFiltersSection.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client } from "@/types/contact";
import { ClientWithStringId } from "@/app/cars/CarsPageClient";
import {
  FilterSection,
  FilterItem,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from "@/components/ui/FilterSection";
import { Search } from "lucide-react";

interface CarFiltersSectionProps {
  currentFilters: {
    make: string;
    minYear: string;
    maxYear: string;
    clientId: string;
    search?: string;
  };
  makes: string[];
  clients: Client[] | ClientWithStringId[];
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

    const params = new URLSearchParams(searchParams?.toString() || "");

    // Update the URL parameters
    Object.entries(newFilters).forEach(([key, val]) => {
      if (key.includes("Year")) {
        // For year fields, update if there's a value or remove if empty
        if (val) {
          params.set(key, val);
        } else {
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
    const view = searchParams?.get("view");
    const pageSize = searchParams?.get("pageSize");
    const isEditMode = searchParams?.get("edit");

    if (view) params.set("view", view);
    if (pageSize) params.set("pageSize", pageSize);
    if (isEditMode) params.set("edit", isEditMode);
    params.set("page", "1"); // Reset to first page

    router.push(`/cars?${params.toString()}`);
  };

  const clearFilters = () => {
    const emptyFilters = {
      make: "",
      minYear: "",
      maxYear: "",
      clientId: "",
      search: "",
    };
    setFilters(emptyFilters);

    const params = new URLSearchParams();
    const view = searchParams?.get("view");
    const pageSize = searchParams?.get("pageSize");
    const isEditMode = searchParams?.get("edit");

    if (view) params.set("view", view);
    if (pageSize) params.set("pageSize", pageSize);
    if (isEditMode) params.set("edit", isEditMode);
    params.set("page", "1");

    router.push(`/cars?${params.toString()}`);
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return (
    <FilterSection
      hasActiveFilters={hasActiveFilters}
      onClearFilters={clearFilters}
    >
      <div className="flex flex-col gap-6">
        <FilterItem className="w-full">
          <FilterLabel>
            <Search className="h-4 w-4 inline mr-1" />
            Search
          </FilterLabel>
          <FilterInput
            type="text"
            name="search"
            placeholder="Search by make, model, year, VIN, color, etc."
            value={filters.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </FilterItem>

        <div className="flex flex-row gap-6 items-end">
          <FilterItem className="w-72">
            <FilterLabel>Client</FilterLabel>
            <FilterSelect
              name="clientId"
              value={filters.clientId}
              onChange={(e) => handleFilterChange("clientId", e.target.value)}
            >
              <option value="">Any Client</option>
              {clients.map((client) => (
                <option
                  key={client._id.toString()}
                  value={client._id.toString()}
                >
                  {client.name}
                </option>
              ))}
            </FilterSelect>
          </FilterItem>

          <FilterItem className="w-56">
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

          <FilterItem className="w-80">
            <FilterLabel>Year Range</FilterLabel>
            <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>
    </FilterSection>
  );
}
