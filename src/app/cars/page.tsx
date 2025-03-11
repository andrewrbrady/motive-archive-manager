import React from "react";
import { Metadata } from "next";
import { fetchMakes } from "@/lib/fetchMakes";
import { fetchClients } from "@/lib/fetchClients";
import { Car, Client } from "@/types/car";
import CarsPageClient from "./CarsPageClient";
import { headers } from "next/headers";
import { Make } from "@/lib/fetchMakes";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Cars Collection | Premium Vehicles",
  description: "Browse our exclusive collection of premium and luxury vehicles",
};

interface FilterParams {
  make?: string;
  minYear?: string;
  maxYear?: string;
  clientId?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCars(page = 1, pageSize = 48, filters: FilterParams = {}) {
  try {
    // Add artificial delay
    await delay(500);

    // Build the query string from filters
    const queryParams = new URLSearchParams();

    // Add pagination parameters
    queryParams.set("page", page.toString());
    queryParams.set("pageSize", pageSize.toString());

    // Add filter parameters if they exist
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        queryParams.set(key, value);
      }
    });

    // Simplify approach - just use a relative URL with Next.js fetch
    const url = `/api/cars?${queryParams.toString()}`;

    // Fetch from the API route with safety timeouts and cache settings
    const response = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch cars: ${response.status} ${response.statusText}`
      );
      // Return empty data rather than throwing
      return {
        cars: [],
        totalPages: 0,
        currentPage: page,
        totalCount: 0,
      };
    }

    const data = await response.json();
    return {
      cars: (data.cars as Car[]) || [],
      totalPages: data.totalPages || 0,
      currentPage: page,
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error("Error fetching cars:", error);
    // Return empty data rather than throwing
    return {
      cars: [],
      totalPages: 0,
      currentPage: page,
      totalCount: 0,
    };
  }
}

export default async function CarsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  try {
    const resolvedParams = await Promise.resolve(searchParams);

    const page = Number(resolvedParams.page) || 1;
    const pageSize = Number(resolvedParams.pageSize) || 48;
    const view = (resolvedParams.view?.toString() || "grid") as "grid" | "list";
    const isEditMode = resolvedParams.edit === "true";

    const filters = {
      make: resolvedParams.make?.toString(),
      minYear: resolvedParams.minYear?.toString(),
      maxYear: resolvedParams.maxYear?.toString(),
      clientId: resolvedParams.clientId?.toString(),
      minPrice: resolvedParams.minPrice?.toString(),
      maxPrice: resolvedParams.maxPrice?.toString(),
      sort: resolvedParams.sort?.toString(),
    };

    // Clean up undefined values
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });

    // Default values
    let cars: Car[] = [];
    let totalPages = 0;
    let currentPage = page;
    let totalCount = 0;
    let makes: Make[] = [];
    let clients: Client[] = [];

    try {
      // Separate operations to handle individual failures
      const carsData = await getCars(page, pageSize, filters);
      cars = carsData.cars;
      totalPages = carsData.totalPages;
      currentPage = carsData.currentPage;
      totalCount = carsData.totalCount;

      try {
        makes = await fetchMakes();
      } catch (makeError) {
        console.error("Failed to fetch makes:", makeError);
        makes = [];
      }

      try {
        const rawClients = await fetchClients();

        // Transform to expected Client type
        clients = rawClients.map((client) => {
          // Create minimal client objects with required structure
          return {
            _id: client._id.toString(),
            name: client.name || "",
            email: client.email || "",
            phone: client.phone || "",
            address: client.address || {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: "",
            },
            businessType: client.businessType || "",
            status: client.status || "active",
            socialMedia: { instagram: "" },
            documents: [],
            cars: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Client;
        });
      } catch (clientError) {
        console.error("Failed to fetch clients:", clientError);
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);
      // Continue with empty data
    }

    return (
      <CarsPageClient
        cars={cars}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        view={view}
        isEditMode={isEditMode}
        filters={filters}
        makes={makes}
        clients={clients}
      />
    );
  } catch (error) {
    console.error("Critical error in CarsPage:", error);
    // Don't throw, provide a minimal fallback UI
    return (
      <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] dark:bg-[var(--background-primary)]">
        <div className="flex-grow container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Cars Collection</h1>
          <p className="text-red-500">
            Unable to load cars at this time. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
