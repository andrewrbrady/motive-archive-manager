import React from "react";
import { notFound } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { CarImageGallery } from "@/components/cars/CarImageGallery";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId, MongoClient } from "mongodb";
import { CarHeader } from "@/components/cars/CarHeader";

interface CarPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getCar(id: string) {
  let mongoClient: MongoClient | null = null;
  try {
    mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB || "motive_archive");
    const carsCollection = db.collection("cars");

    const car = await carsCollection.findOne({ _id: new ObjectId(id) });

    if (!car) {
      return null;
    }

    // Properly serialize all MongoDB objects to plain objects
    const serializedCar = {
      _id: car._id.toString(),
      make: car.make || "",
      model: car.model || "",
      year: car.year || null,
      price: car.price || null,
      mileage: car.mileage || null,
      color: car.color || null,
      interior_color: car.interior_color || null,
      vin: car.vin || null,
      status: car.status || "available",
      condition: car.condition || null,
      location: car.location || null,
      description: car.description || null,
      type: car.type || null,
      engine: car.engine || null,
      transmission: car.transmission || null,
      dimensions: car.dimensions || null,
      manufacturing: car.manufacturing || null,
      safety: car.safety || null,
      doors: car.doors || null,
      interior_features: car.interior_features || null,
      performance: car.performance || null,
      hasArticle: car.hasArticle || false,
      lastArticleUpdate: car.lastArticleUpdate || null,
      listing_page: car.listing_page || null,
      has_reserve: car.has_reserve || false,
      documents: car.documents || [],
      research_entries: car.research_entries || [],
      // Convert ObjectId arrays to string arrays
      imageIds: (car.imageIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),
      primaryImageId: car.primaryImageId ? car.primaryImageId.toString() : null,
      captionIds: (car.captionIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),
      eventIds: (car.eventIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),
      deliverableIds: (car.deliverableIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),
      documentationIds: (car.documentationIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),
      // Convert client ObjectId to string if present
      client: car.client ? car.client.toString() : null,
      // Serialize clientInfo if present
      clientInfo: car.clientInfo
        ? {
            ...car.clientInfo,
            _id: car.clientInfo._id ? car.clientInfo._id.toString() : null,
          }
        : null,
      // Convert dates to ISO strings - handle both Date objects and existing strings
      createdAt: car.createdAt
        ? car.createdAt instanceof Date
          ? car.createdAt.toISOString()
          : typeof car.createdAt === "string"
            ? car.createdAt
            : new Date(car.createdAt).toISOString()
        : null,
      updatedAt: car.updatedAt
        ? car.updatedAt instanceof Date
          ? car.updatedAt.toISOString()
          : typeof car.updatedAt === "string"
            ? car.updatedAt
            : new Date(car.updatedAt).toISOString()
        : null,
    };

    return serializedCar;
  } catch (error) {
    console.error("Error fetching car:", error);
    return null;
  } finally {
    // Ensure connection is always closed
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch (closeError) {
        console.error("Error closing MongoDB connection:", closeError);
      }
    }
  }
}

export default async function CarPage({ params }: CarPageProps) {
  const { id } = await params;
  const car = await getCar(id);

  if (!car) {
    notFound();
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="container-wide px-6 py-8">
          <CarHeader car={car} />

          <div className="mt-8">
            <CarImageGallery carId={id} showFilters={true} vehicleInfo={car} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
