import React from "react";
import { Metadata } from "next";
import CarsPageOptimized from "./CarsPageOptimized";

// ✅ PERFORMANCE OPTIMIZATION: Enable static generation with revalidation
// This allows Next.js to cache the page and revalidate every 5 minutes
export const revalidate = 300; // 5 minutes

export const metadata: Metadata = {
  title: "Cars Collection | Motive Archive Manager",
  description: "Browse and manage the car collection",
};

interface FilterParams {
  make?: string;
  minYear?: string;
  maxYear?: string;
  clientId?: string;
  sort?: string;
  search?: string;
}

export default async function CarsPage(props: any) {
  try {
    const searchParams = props.searchParams || {};
    const resolvedParams = await Promise.resolve(searchParams);

    const page = Number(resolvedParams.page) || 1;
    const pageSize = Number(resolvedParams.pageSize) || 48;
    const view = (resolvedParams.view?.toString() || "grid") as "grid" | "list";
    const isEditMode = resolvedParams.edit === "true";

    // Extract all filter parameters
    const filters: FilterParams = {
      make: resolvedParams.make?.toString(),
      minYear: resolvedParams.minYear?.toString(),
      maxYear: resolvedParams.maxYear?.toString(),
      clientId: resolvedParams.clientId?.toString(),
      sort: resolvedParams.sort?.toString(),
      search: resolvedParams.search?.toString(),
    };

    // Clean up undefined or empty values
    Object.keys(filters).forEach((key) => {
      const value = filters[key as keyof FilterParams];
      if (value === undefined || value === "") {
        delete filters[key as keyof FilterParams];
      }
    });

    // ✅ Use optimized component with progressive loading
    return (
      <CarsPageOptimized
        currentPage={page}
        pageSize={pageSize}
        view={view}
        isEditMode={isEditMode}
        filters={filters}
      />
    );
  } catch (error) {
    console.error("Error in CarsPage:", error);
    // Return a fallback page instead of throwing
    return (
      <CarsPageOptimized
        currentPage={1}
        pageSize={48}
        view="grid"
        isEditMode={false}
        filters={{}}
      />
    );
  }
}
