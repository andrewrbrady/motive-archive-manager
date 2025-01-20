// components/cars/CarFiltersSection.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client } from "@/types/car";

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Make
        </label>
        <select
          name="make"
          defaultValue={currentFilters.make}
          onChange={(e) => handleFilterChange("make", e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Any Make</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Year Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            name="minYear"
            placeholder="Min"
            defaultValue={currentFilters.minYear}
            onChange={(e) => handleFilterChange("minYear", e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <input
            type="number"
            name="maxYear"
            placeholder="Max"
            defaultValue={currentFilters.maxYear}
            onChange={(e) => handleFilterChange("maxYear", e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            name="minPrice"
            placeholder="Min"
            defaultValue={currentFilters.minPrice}
            onChange={(e) => handleFilterChange("minPrice", e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <input
            type="number"
            name="maxPrice"
            placeholder="Max"
            defaultValue={currentFilters.maxPrice}
            onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client
        </label>
        <select
          name="clientId"
          defaultValue={currentFilters.clientId}
          onChange={(e) => handleFilterChange("clientId", e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Any Client</option>
          {clients.map((client) => (
            <option key={client._id} value={client._id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Engine Features
        </label>
        <select
          name="engineFeatures"
          defaultValue={currentFilters.engineFeatures}
          onChange={(e) => handleFilterChange("engineFeatures", e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Any Type</option>
          <option value="turbo">Turbo</option>
          <option value="supercharged">Supercharged</option>
          <option value="hybrid">Hybrid</option>
          <option value="electric">Electric</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          name="status"
          defaultValue={currentFilters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Any Status</option>
          <option value="available">Available</option>
          <option value="sold">Sold</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div>
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
