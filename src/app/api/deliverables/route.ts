import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Deliverable, IDeliverable } from "@/models/Deliverable";
import { dbConnect } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const platform = searchParams.get("platform") || "";
    const type = searchParams.get("type") || "";
    const firebaseUid = searchParams.get("firebase_uid") || "";
    const carId = searchParams.get("car_id") || "";
    const creativeRole = searchParams.get("creative_role") || "";
    const sortField = searchParams.get("sortField") || "edit_deadline";
    const sortDirection = searchParams.get("sortDirection") || "asc";
    const skip = (page - 1) * limit;

    const db = await getDatabase();

    // Build search query
    const searchQuery: any = {};

    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      searchQuery.status = status;
    }

    if (platform) {
      searchQuery.platform = platform;
    }

    if (type) {
      searchQuery.type = type;
    }

    // Handle filtering by Firebase UID
    if (firebaseUid) {
      searchQuery.firebase_uid = firebaseUid;
      console.log("Filtering by firebase_uid:", firebaseUid);
    }

    if (carId) {
      try {
        searchQuery.car_id = new ObjectId(carId);
      } catch (error) {
        console.error("Invalid car_id:", carId);
        return NextResponse.json(
          { error: "Invalid car_id format" },
          { status: 400 }
        );
      }
    }

    if (creativeRole && creativeRole !== "all") {
      // Get all users with the specified creative role
      const users = await db
        .collection("users")
        .find({ creativeRoles: creativeRole, status: "active" })
        .toArray();

      // Get their Firebase UIDs
      const userIds = users.map((user) => user.firebase_uid).filter(Boolean);

      if (userIds.length > 0) {
        searchQuery.firebase_uid = { $in: userIds };
      } else {
        // If no users found with this role, return no results
        searchQuery.firebase_uid = null;
      }
    }

    // Get total count with search filter
    const total = await db
      .collection("deliverables")
      .countDocuments(searchQuery);

    // Build sort object
    const sortObject: { [key: string]: 1 | -1 } = {
      [sortField]: sortDirection === "desc" ? -1 : 1,
    };

    console.log("Search query:", searchQuery);
    console.log("Sort object:", sortObject);

    // Get paginated, filtered, and sorted deliverables
    const deliverables = await db
      .collection<IDeliverable>("deliverables")
      .find(searchQuery)
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log("Found deliverables:", deliverables.length);

    // Get car details for each deliverable
    const validCarIds = deliverables
      .map((d) => {
        try {
          return typeof d.car_id === "string"
            ? new ObjectId(d.car_id)
            : d.car_id;
        } catch (error) {
          console.error("Invalid car_id in deliverable:", d);
          return null;
        }
      })
      .filter((id): id is ObjectId => id instanceof ObjectId);

    console.log(
      "Valid car IDs:",
      validCarIds.map((id) => id.toString())
    );

    const cars =
      validCarIds.length > 0
        ? await db
            .collection("cars")
            .find({ _id: { $in: validCarIds } })
            .project({
              _id: 1,
              make: 1,
              model: 1,
              year: 1,
              primaryImageId: 1,
            })
            .toArray()
        : [];

    console.log("Cars found:", cars.length);

    // Convert ObjectId to string for primaryImageId to make comparison easier in frontend
    const carsWithStringIds = cars.map((car) => {
      if (car.primaryImageId && car.primaryImageId instanceof ObjectId) {
        return {
          ...car,
          primaryImageId: car.primaryImageId.toString(),
        };
      }
      return car;
    });

    const carsMap = new Map(
      carsWithStringIds.map((car) => [car._id.toString(), car])
    );

    // Combine deliverables with car details
    const deliverablesWithCars = deliverables.map((deliverable) => ({
      ...deliverable,
      car: deliverable.car_id
        ? carsMap.get(deliverable.car_id.toString())
        : undefined,
    }));

    return NextResponse.json({
      deliverables: deliverablesWithCars,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching deliverables:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliverables" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const data = await request.json();

    // Remove editor field if present
    const { editor, ...deliverableData } = data;

    // Create new deliverable
    const deliverable = new Deliverable(deliverableData);
    await deliverable.save();

    return NextResponse.json(deliverable.toPublicJSON(), { status: 201 });
  } catch (error) {
    console.error("Error creating deliverable:", error);
    return NextResponse.json(
      { error: "Failed to create deliverable" },
      { status: 500 }
    );
  }
}
