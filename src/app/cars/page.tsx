import React from "react";
import { Metadata } from "next";
import CarsPageClient from "./CarsPageClient";

// Make this page dynamic to avoid database connection issues during build
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // Return the client component without server-side data fetching
    // All data will be fetched on the client side to avoid build-time database connections
    return (
      <CarsPageClient
        cars={[]} // Empty initial state
        totalPages={1}
        currentPage={page}
        pageSize={pageSize}
        totalCount={0}
        view={view}
        isEditMode={isEditMode}
        filters={filters}
        makes={[]} // Empty initial state
        clients={[]} // Empty initial state
        shouldFetchData={true} // Flag to indicate client should fetch data
      />
    );
  } catch (error) {
    console.error("Error in CarsPage:", error);
    // Return a fallback page instead of throwing
    return (
      <CarsPageClient
        cars={[]}
        totalPages={1}
        currentPage={1}
        pageSize={48}
        totalCount={0}
        view="grid"
        isEditMode={false}
        filters={{}}
        makes={[]}
        clients={[]}
        shouldFetchData={true}
      />
    );
  }
}
