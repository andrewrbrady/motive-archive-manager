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
import clientPromise from "@/lib/mongodb"; // Import MongoDB client

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

// Enhanced server-side logging
function serverLog(
  message: string,
  data: any = {},
  level: "info" | "warn" | "error" = "info"
) {
  const prefix = `[Server] 🚗 Cars Page: ${message}`;

  if (level === "error") {
    console.error(prefix, data);
  } else if (level === "warn") {
    console.warn(prefix, data);
  } else {
    console.log(prefix, data);
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCars(page = 1, pageSize = 48, filters: FilterParams = {}) {
  serverLog("getCars called with params", { page, pageSize, filters });

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
    serverLog("Fetching cars from URL", { url });

    // Fetch from the API route with safety timeouts and cache settings
    const response = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    serverLog("API response status", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
    });

    if (!response.ok) {
      serverLog(
        `Failed to fetch cars: ${response.status} ${response.statusText}`,
        {},
        "error"
      );
      // Return empty data rather than throwing
      return {
        cars: [],
        totalPages: 0,
        currentPage: page,
        totalCount: 0,
      };
    }

    // Try to get the raw response body for debugging
    const responseBody = await response.text();

    let data;
    try {
      data = JSON.parse(responseBody);
      serverLog("Successfully parsed JSON response", {
        carsCount: data.cars?.length || 0,
        totalPages: data.totalPages,
        totalCount: data.totalCount,
      });
    } catch (parseError) {
      serverLog(
        "Failed to parse JSON response",
        {
          responseBody:
            responseBody.substring(0, 500) +
            (responseBody.length > 500 ? "..." : ""),
          parseError,
        },
        "error"
      );

      // Return empty data for parse failure
      return {
        cars: [],
        totalPages: 0,
        currentPage: page,
        totalCount: 0,
      };
    }

    const result = {
      cars: (data.cars as Car[]) || [],
      totalPages: data.totalPages || 0,
      currentPage: page,
      totalCount: data.totalCount || 0,
    };

    serverLog("getCars returning data", {
      carsCount: result.cars.length,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
      firstCar:
        result.cars.length > 0
          ? JSON.stringify(result.cars[0]).substring(0, 200) + "..."
          : "none",
    });

    return result;
  } catch (error) {
    serverLog("Error fetching cars", { error }, "error");
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
  serverLog("CarsPage rendering with searchParams", { searchParams });

  try {
    // Check MongoDB connection directly
    try {
      serverLog("Testing direct MongoDB connection");
      const client = await clientPromise;
      const db = client.db();

      // Check if cars collection exists
      const collections = await db.listCollections().toArray();
      const hasCarCollection = collections.some((c) => c.name === "cars");

      serverLog("MongoDB connection test results", {
        connected: !!client,
        collections: collections.map((c) => c.name),
        hasCarCollection,
      });

      if (hasCarCollection) {
        // Check if there are any cars in the collection
        const carCount = await db.collection("cars").countDocuments();
        serverLog("Cars collection count", { carCount });

        if (carCount === 0) {
          serverLog("Cars collection is empty", {}, "warn");
        } else {
          // Sample a car to check schema
          const sampleCar = await db.collection("cars").findOne({});
          serverLog("Sample car from MongoDB", {
            id: sampleCar?._id?.toString(),
            hasFields: sampleCar ? Object.keys(sampleCar).join(", ") : "none",
          });
        }
      }
    } catch (dbError) {
      serverLog(
        "Error directly testing MongoDB connection",
        { error: dbError },
        "error"
      );
    }

    const resolvedParams = await Promise.resolve(searchParams);
    serverLog("Resolved search params", { resolvedParams });

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

    serverLog("Processed filters", {
      filters,
      page,
      pageSize,
      view,
      isEditMode,
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
      serverLog("Fetching cars data");
      const carsData = await getCars(page, pageSize, filters);
      cars = carsData.cars;
      totalPages = carsData.totalPages;
      currentPage = carsData.currentPage;
      totalCount = carsData.totalCount;

      serverLog("Cars data fetched", {
        carsCount: cars.length,
        totalPages,
        totalCount,
      });

      try {
        serverLog("Fetching makes");
        makes = await fetchMakes();
        serverLog("Makes fetched", { makesCount: makes.length });
      } catch (makeError) {
        serverLog("Failed to fetch makes", { makeError }, "error");
        makes = [];
      }

      try {
        serverLog("Fetching clients");
        const rawClients = await fetchClients();
        serverLog("Clients fetched", { clientsCount: rawClients.length });

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
        serverLog("Clients transformed", { transformedCount: clients.length });
      } catch (clientError) {
        serverLog("Failed to fetch clients", { clientError }, "error");
      }
    } catch (err) {
      serverLog("Error fetching initial data", { err }, "error");
      // Continue with empty data
    }

    // Debug log before rendering client component
    serverLog("Rendering client component with data", {
      carsCount: cars.length,
      makesCount: makes.length,
      clientsCount: clients.length,
      carsSample:
        cars.length > 0
          ? JSON.stringify(
              cars.slice(0, 1).map((car) => ({
                _id: car._id,
                make: car.make,
                model: car.model,
                year: car.year,
              }))
            )
          : "No cars",
    });

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
    serverLog("Critical error in CarsPage", { error }, "error");
    // Don't throw, provide a minimal fallback UI
    return (
      <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] dark:bg-[var(--background-primary)]">
        <div className="flex-grow container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Cars Collection</h1>
          <p className="text-red-500">
            Unable to load cars at this time. Please try again later.
          </p>
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="text-sm text-gray-700">
              Error details (for debugging):
            </p>
            <pre className="mt-2 p-2 text-xs bg-gray-200 rounded overflow-auto max-h-40">
              {error instanceof Error
                ? error.stack || error.message
                : String(error)}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}
