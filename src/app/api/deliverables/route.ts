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
    const editor = searchParams.get("editor") || "";
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

    if (editor && editor !== "all") {
      searchQuery.editor = editor;
    }

    if (carId) {
      searchQuery.car_id = new ObjectId(carId);
    }

    if (creativeRole && creativeRole !== "all") {
      // Get all users with the specified creative role
      const users = await db
        .collection("users")
        .find({ creativeRoles: creativeRole, status: "active" })
        .toArray();

      // Get their names for the editor field
      const editorNames = users.map((user) => user.name);

      // Add editor names to the search query
      if (editorNames.length > 0) {
        // If an editor is already specified, we need to make sure it's in the list of valid editors
        if (editor && editor !== "all") {
          if (!editorNames.includes(editor)) {
            // If the specified editor doesn't have the role, return no results
            searchQuery.editor = null;
          }
          // Otherwise, keep the existing editor filter
        } else {
          // If no specific editor is selected, show deliverables from all editors with the role
          searchQuery.editor = { $in: editorNames };
        }
      } else {
        // If no users found with this role, return no results
        searchQuery.editor = null;
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

    // Get paginated, filtered, and sorted deliverables
    const deliverables = await db
      .collection<IDeliverable>("deliverables")
      .find(searchQuery)
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get car details for each deliverable
    const validCarIds = deliverables
      .map((d) => d.car_id)
      .filter((id): id is ObjectId => id instanceof ObjectId);

    const cars =
      validCarIds.length > 0
        ? await db
            .collection("cars")
            .find({ _id: { $in: validCarIds } })
            .project({ _id: 1, make: 1, model: 1, year: 1 })
            .toArray()
        : [];

    const carsMap = new Map(cars.map((car) => [car._id.toString(), car]));

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

    // Create new deliverable
    const deliverable = new Deliverable(data);
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
