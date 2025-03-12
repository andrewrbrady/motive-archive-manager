import React from "react";
import { Metadata } from "next";
import { fetchMakes } from "@/lib/fetchMakes";
import { fetchClients } from "@/lib/fetchClients";
import { Car } from "@/types/car";
import { Client } from "@/types/contact";
import CarsPageClient from "./CarsPageClient";
import { headers } from "next/headers";
import { Make } from "@/lib/fetchMakes";

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

    // Use a properly formed URL that works in both development and production
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "";

    const url = `${baseUrl}/api/cars?${queryParams.toString()}`;
    console.log("Fetching cars from:", url);

    // Fetch from the API route
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch cars: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      cars: data.cars as Car[],
      totalPages: data.totalPages,
      currentPage: page,
      totalCount: data.totalCount,
    };
  } catch (error) {
    console.error("Error fetching cars:", error);
    throw error;
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
      if (filters[key as keyof FilterParams] === undefined) {
        delete filters[key as keyof FilterParams];
      }
    });

    const [{ cars, totalPages, currentPage, totalCount }, makes, clients] =
      await Promise.all([
        getCars(page, pageSize, filters),
        fetchMakes(),
        fetchClients(),
      ]);

    // Convert MongoDB ObjectId to string for client-side rendering
    const formattedClients = clients.map((client) => ({
      ...client,
      _id: client._id.toString(),
      primaryContactId: client.primaryContactId?.toString(),
      documents: (client.documents || []).map((doc) => ({
        ...doc,
        _id: doc._id.toString(),
      })),
      cars: (client.cars || []).map((car) => ({
        ...car,
        _id: car._id.toString(),
      })),
    }));

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
        clients={formattedClients}
      />
    );
  } catch (error) {
    console.error("Error in CarsPage:", error);
    throw error;
  }
}
