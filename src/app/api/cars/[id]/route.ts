import { ObjectId, Collection } from "mongodb";
import { NextResponse } from "next/server";
import { ImageMetadata } from "@/lib/cloudflare";
import { connectToDatabase } from "@/lib/mongodb";

interface Car {
  _id: ObjectId;
  documents: string[];
  imageIds: ObjectId[];
  client?: string;
  clientInfo?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collections
    const carsCollection: Collection<Car> = db.collection("cars");
    const imagesCollection: Collection<Image> = db.collection("images");
    const clientsCollection: Collection<Client> = db.collection("clients");

    console.log(`Fetching car with ID: ${id}`);
    const car = await carsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!car) {
      console.log(`Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Fetch associated images if car has imageIds
    let images: Image[] = [];
    if (car.imageIds && car.imageIds.length > 0) {
      images = await imagesCollection
        .find({
          _id: { $in: car.imageIds },
        })
        .toArray();
    }

    // If car has a client reference, fetch client info
    let clientInfo = null;
    if (car.client && ObjectId.isValid(car.client)) {
      clientInfo = await clientsCollection.findOne(
        { _id: new ObjectId(car.client) },
        {
          projection: {
            name: 1,
            email: 1,
            phone: 1,
            address: 1,
          },
        }
      );
    }

    // Return car data with associated images and client info
    return NextResponse.json({
      ...car,
      images,
      clientInfo,
    });
  } catch (error) {
    console.error("Error fetching car:", error);
    return NextResponse.json({ error: "Failed to fetch car" }, { status: 500 });
  }
}

// PUT/PATCH to update car information
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const updates = await request.json();
    // Remove _id from updates if present to prevent MongoDB errors
    delete updates._id;

    dbConnection = await connectToDatabase();
    const db = dbConnection.db;
    const carsCollection: Collection<Car> = db.collection("cars");

    const result = await carsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Fetch and return the updated car
    const updatedCar = await carsCollection.findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error("Error updating car:", error);
    return NextResponse.json(
      { error: "Failed to update car" },
      { status: 500 }
    );
  }
}

// DELETE car
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    dbConnection = await connectToDatabase();
    const db = dbConnection.db;
    const carsCollection: Collection<Car> = db.collection("cars");

    console.log(`Deleting car with ID: ${id}`);
    const result = await carsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      console.log(`Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting car:", error);
    return NextResponse.json(
      { error: "Failed to delete car" },
      { status: 500 }
    );
  }
}

// PATCH to remove a specific document from a car or update images
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { documentId, images, ...updates } = body;

    dbConnection = await connectToDatabase();
    const db = dbConnection.db;
    const carsCollection: Collection<Car> = db.collection("cars");
    const receiptsCollection: Collection<any> = db.collection("receipts");

    // Handle document removal
    if (documentId) {
      if (!ObjectId.isValid(documentId)) {
        return NextResponse.json(
          { error: "Invalid document ID format" },
          { status: 400 }
        );
      }

      // Remove document reference from car
      const updateResult = await carsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $pull: { documents: documentId } }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      // Delete the document from receipts collection
      await receiptsCollection.deleteOne({
        _id: new ObjectId(documentId),
      });

      return NextResponse.json({ message: "Document removed successfully" });
    }

    // Handle image updates
    if (images) {
      if (!Array.isArray(images)) {
        return NextResponse.json(
          { error: "Invalid images array provided" },
          { status: 400 }
        );
      }

      const updateResult = await carsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { images } }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      return NextResponse.json({ message: "Images updated successfully" });
    }

    return NextResponse.json(
      { error: "No valid update operation specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating car:", error);
    return NextResponse.json(
      { error: "Failed to update car" },
      { status: 500 }
    );
  }
}
