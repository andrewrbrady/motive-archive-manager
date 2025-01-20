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
import { Car } from "@/types/car";

export const metadata: Metadata = {
  title: "Cars Collection | Premium Vehicles",
  description: "Browse our exclusive collection of premium and luxury vehicles",
};

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

function serializeMongoData(data: unknown): unknown {
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
  if (data && typeof data === "object" && "_bsontype" in data) {
    return data.toString();
  }

  // Handle plain objects
  if (typeof data === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>
    )) {
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
    const query: Record<string, unknown> = {};

    if (filters.make) {
      query.make = { $regex: filters.make, $options: "i" };
    }

    // Handle year filter
    if (filters.minYear || filters.maxYear) {
      query.year = {
        $type: "number", // Only match numeric years
      };
      if (filters.minYear && filters.minYear.trim() !== "") {
        (query.year as Record<string, number>).$gte =
          Number(filters.minYear) || 1900;
      }
      if (filters.maxYear && filters.maxYear.trim() !== "") {
        (query.year as Record<string, number>).$lte =
          Number(filters.maxYear) || new Date().getFullYear() + 1;
      }
    }

    // Handle price filter
    if (filters.minPrice || filters.maxPrice) {
      query.price = {
        $type: "number", // Only match numeric prices
      };
      if (filters.minPrice && filters.minPrice.trim() !== "") {
        (query.price as Record<string, unknown>).$gte =
          Number(filters.minPrice) || 0;
      }
      if (filters.maxPrice && filters.maxPrice.trim() !== "") {
        (query.price as Record<string, unknown>).$lte =
          Number(filters.maxPrice) || Number.MAX_SAFE_INTEGER;
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
      {
        $addFields: {
          images: {
            $map: {
              input: {
                $cond: [
                  { $isArray: "$images" },
                  "$images",
                  { $ifNull: ["$images", []] },
                ],
              },
              as: "img",
              in: {
                $cond: [
                  { $eq: [{ $type: "$$img" }, "string"] },
                  {
                    id: "$$img",
                    url: "$$img",
                    filename: {
                      $arrayElemAt: [{ $split: ["$$img", "/"] }, -1],
                    },
                    metadata: {},
                    createdAt: "$createdAt",
                    updatedAt: "$updatedAt",
                  },
                  "$$img",
                ],
              },
            },
          },
        },
      },
      // Convert any remaining string numbers to actual numbers
      {
        $addFields: {
          year: {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: "$year" }, "string"] },
                  { $ne: ["$year", ""] },
                  { $regexMatch: { input: "$year", regex: /^\d+$/ } },
                ],
              },
              { $toInt: "$year" },
              {
                $cond: [{ $eq: [{ $type: "$year" }, "number"] }, "$year", null],
              },
            ],
          },
          price: {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: "$price" }, "string"] },
                  { $ne: ["$price", ""] },
                  { $regexMatch: { input: "$price", regex: /^\d+(\.\d+)?$/ } },
                ],
              },
              { $toDouble: "$price" },
              {
                $cond: [
                  { $eq: [{ $type: "$price" }, "number"] },
                  "$price",
                  null,
                ],
              },
            ],
          },
          mileage: {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: "$mileage" }, "string"] },
                  { $ne: ["$mileage", ""] },
                  {
                    $regexMatch: { input: "$mileage", regex: /^\d+(\.\d+)?$/ },
                  },
                ],
              },
              { $toDouble: "$mileage" },
              {
                $cond: [
                  { $eq: [{ $type: "$mileage" }, "number"] },
                  "$mileage",
                  null,
                ],
              },
            ],
          },
          horsepower: {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: "$horsepower" }, "string"] },
                  { $ne: ["$horsepower", ""] },
                  { $regexMatch: { input: "$horsepower", regex: /^\d+$/ } },
                ],
              },
              { $toInt: "$horsepower" },
              {
                $cond: [
                  { $eq: [{ $type: "$horsepower" }, "number"] },
                  "$horsepower",
                  null,
                ],
              },
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
    ];

    const cars = await collection.aggregate(pipeline).toArray();
    const total = await collection.countDocuments(query);

    const serializedCars = serializeMongoData(cars) as unknown as Car[];

    return {
      cars: serializedCars,
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
                  pageSize={pageSize}
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
                  pageSize={pageSize}
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
