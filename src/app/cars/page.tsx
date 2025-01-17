import React from "react";
import { Metadata } from "next";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import Pagination from "@/components/Pagination";
import Navbar from "@/components/layout/navbar";
import { fetchMakes } from "@/lib/fetchMakes";
import { fetchClients } from "@/lib/fetchClients";
import CarFiltersSection from "@/components/cars/CarFiltersSection";
import Footer from "@/components/layout/footer";
import CarsViewWrapper from "@/components/cars/CarsViewWrapper";
import ViewModeSelector from "@/components/cars/ViewModeSelector";
import CarImageEditor from "@/components/cars/CarImageEditor";
import EditModeToggle from "@/components/cars/EditModeToggle";
import PageSizeSelector from "@/components/PageSizeSelector";

export const metadata: Metadata = {
  title: "Cars Collection | Premium Vehicles",
  description: "Browse our exclusive collection of premium and luxury vehicles",
};

interface Engine {
  type: string;
  displacement?: number;
  features?: string[];
  transmission?: string;
  fuelType?: string;
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  horsepower: number;
  condition: string;
  location: string;
  description: string;
  images: string[];
  owner_id?: string;
  engine?: Engine;
  clientInfo?: {
    _id: string;
    name: string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
  status?: "available" | "sold" | "pending";
}

interface FilterParams {
  make?: string;
  minYear?: string;
  maxYear?: string;
  clientId?: string;
  engineFeatures?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: string;
}

function serializeMongoData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(serializeMongoData);
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle Buffer objects
  if (Buffer.isBuffer(data)) {
    return data.toString("hex");
  }

  // Handle ObjectId instances
  if (data._bsontype === "ObjectID" || data._bsontype === "ObjectId") {
    return data.toString();
  }

  // Handle plain objects
  if (typeof data === "object") {
    const serialized: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeMongoData(value);
    }
    return serialized;
  }

  return data;
}

async function getCars(page = 1, pageSize = 48, filters: FilterParams = {}) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const collection = db.collection("cars");

    const skip = (page - 1) * pageSize;
    const query: any = {};

    if (filters.make) {
      query.make = { $regex: filters.make, $options: "i" };
    }

    // Handle year filter
    if (filters.minYear || filters.maxYear) {
      query.year = {};
      if (filters.minYear) {
        query.year.$gte = Number(filters.minYear);
      }
      if (filters.maxYear) {
        query.year.$lte = Number(filters.maxYear);
      }
    }

    // Handle price filter
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) {
        query.price.$gte = Number(filters.minPrice);
      }
      if (filters.maxPrice) {
        query.price.$lte = Number(filters.maxPrice);
      }
    }

    if (filters.clientId) {
      query.client = new ObjectId(filters.clientId);
    }

    if (filters.engineFeatures) {
      query["engine.features"] = filters.engineFeatures;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    console.log("Filters:", filters);
    console.log("MongoDB query:", JSON.stringify(query, null, 2));

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "clientInfo",
        },
      },
      { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
    ];

    const cars = await collection.aggregate(pipeline).toArray();
    const total = await collection.countDocuments(query);

    return {
      cars: serializeMongoData(cars),
      total,
    };
  } catch (error) {
    console.error("Database error:", error);
    throw new Error("Failed to fetch cars");
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
    const viewMode = (resolvedParams.view?.toString() || "grid") as
      | "grid"
      | "list";
    const isEditMode = resolvedParams.edit === "true";

    const filters: FilterParams = {
      make: resolvedParams.make?.toString(),
      minYear: resolvedParams.minYear?.toString(),
      maxYear: resolvedParams.maxYear?.toString(),
      clientId: resolvedParams.clientId?.toString(),
      engineFeatures: resolvedParams.engineFeatures?.toString(),
      minPrice: resolvedParams.minPrice?.toString(),
      maxPrice: resolvedParams.maxPrice?.toString(),
      status: resolvedParams.status?.toString(),
    };

    // Clean up undefined values
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof FilterParams] === undefined) {
        delete filters[key as keyof FilterParams];
      }
    });

    const [{ cars, total }, makes, clients] = await Promise.all([
      getCars(page, pageSize, filters),
      fetchMakes(),
      fetchClients(),
    ]);

    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />

        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold">
                Our Collection ({total.toLocaleString()} vehicles)
              </h1>
              <div className="flex items-center gap-4">
                <ViewModeSelector viewMode={viewMode} />
                <EditModeToggle isEditMode={isEditMode} />
              </div>
            </div>

            <CarFiltersSection
              currentFilters={{
                make: filters.make || "",
                minYear: filters.minYear || "",
                maxYear: filters.maxYear || "",
                clientId: filters.clientId || "",
                engineFeatures: filters.engineFeatures || "",
                minPrice: filters.minPrice || "",
                maxPrice: filters.maxPrice || "",
                status: filters.status || "",
              }}
              makes={makes.map((make) => make.name)}
              clients={clients}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 my-6">
              <PageSizeSelector
                currentPageSize={pageSize}
                options={[12, 24, 36, 48]}
              />
              {total > pageSize && (
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(total / pageSize)}
                />
              )}
            </div>

            {isEditMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cars.map((car: Car) => (
                  <div
                    key={car._id}
                    className="bg-white rounded-lg shadow-md p-4"
                  >
                    <h3 className="text-lg font-semibold mb-4">
                      {car.year} {car.make} {car.model}
                    </h3>
                    <CarImageEditor
                      carId={car._id}
                      currentImages={car.images}
                      onImagesUpdate={() => window.location.reload()}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <CarsViewWrapper
                cars={cars}
                viewMode={viewMode}
                currentSearchParams={new URLSearchParams(
                  resolvedParams as Record<string, string>
                ).toString()}
              />
            )}

            {total > pageSize && (
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(total / pageSize)}
                />
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    );
  } catch (error) {
    console.error("Page error:", error);
    throw error;
  }
}
