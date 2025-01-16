import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { ImageGalleryEnhanced } from "@/components/cars/ImageGalleryEnhanced";
import Navbar from "@/components/layout/navbar";
import DocumentsClient from "@/app/documents/DocumentsClient";

async function getCar(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    const car = await db.collection("cars").findOne({ _id: new ObjectId(id) });
    if (!car) throw new Error("Car not found");

    return car;
  } catch (error) {
    console.error("Error fetching car:", error);
    throw error;
  }
}

async function getCarDocuments(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    const car = await db.collection("cars").findOne({ _id: new ObjectId(id) });
    if (!car?.documents?.length) return [];

    const documents = await db
      .collection("documents")
      .find({
        _id: { $in: car.documents.map((id) => new ObjectId(id.toString())) },
      })
      .toArray();

    return documents.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
      created_at: doc.created_at?.toISOString(),
      transaction: {
        ...doc.transaction,
        date: new Date(doc.transaction.date).toISOString(),
      },
    }));
  } catch (error) {
    console.error("Error fetching car documents:", error);
    return [];
  }
}

export default async function CarPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;

  const [car, documents] = await Promise.all([
    getCar(resolvedParams.id),
    getCarDocuments(resolvedParams.id),
  ]);

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="md:col-span-2">
            <ImageGalleryEnhanced
              images={(car.images || []).map((img) => `${img}/public`)}
            />
          </div>

          {/* Car Details */}
          <div className="space-y-6">
            <section>
              <h1 className="text-3xl font-bold">
                {car.brand} {car.model} {car.year}
              </h1>
              <p className="text-2xl font-semibold mt-2">{car.price}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Vehicle Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="font-medium">Brand:</div>
                <div>{car.brand}</div>
                <div className="font-medium">Model:</div>
                <div>{car.model}</div>
                <div className="font-medium">Year:</div>
                <div>{car.year}</div>
                <div className="font-medium">Mileage:</div>
                <div>{car.mileage || "N/A"}</div>
                <div className="font-medium">Color:</div>
                <div>{car.color || "N/A"}</div>
                <div className="font-medium">Location:</div>
                <div>{car.location || "N/A"}</div>
              </div>
            </section>

            {car.engine && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Engine Specifications</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="font-medium">Type:</div>
                  <div>{car.engine.type}</div>
                  <div className="font-medium">Displacement:</div>
                  <div>{car.engine.displacement}</div>
                  <div className="font-medium">Power Output:</div>
                  <div>{car.engine.power_output}</div>
                  <div className="font-medium">Torque:</div>
                  <div>{car.engine.torque}</div>
                  {car.engine.features?.length > 0 && (
                    <>
                      <div className="font-medium">Features:</div>
                      <div>{car.engine.features.join(", ")}</div>
                    </>
                  )}
                </div>
              </section>
            )}

            {car.description && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Description</h2>
                <p className="whitespace-pre-wrap">{car.description}</p>
              </section>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-6">
            {car.history_report && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Vehicle History</h2>
                <p className="whitespace-pre-wrap">{car.history_report}</p>
              </section>
            )}

            <section className="space-y-4">
              <DocumentsClient
                carId={resolvedParams.id}
                initialDocuments={documents}
              />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
