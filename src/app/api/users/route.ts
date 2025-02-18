import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

interface IUser {
  name: string;
  email: string;
  roles: string[];
  status: string;
  creativeRoles: string[];
  created_at: Date;
  updated_at: Date;
  active: boolean;
  permissions: string[];
  last_login?: Date;
  profile?: {
    avatar_url?: string;
    title?: string;
    bio?: string;
    specialties?: string[];
    portfolio_url?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const users = await db.collection("users").find().toArray();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Set default values and timestamps
    const now = new Date();
    const userData = {
      ...data,
      roles: data.roles || ["viewer"],
      status: data.status || "active",
      creativeRoles: data.creativeRoles || [],
      active: true,
      permissions: data.permissions || ["read"],
      profile: {
        ...data.profile,
        specialties: data.profile?.specialties || [],
      },
      created_at: now,
      updated_at: now,
      createdAt: now,
      updatedAt: now,
    };

    console.log("Creating user with data:", userData);
    const result = await db.collection("users").insertOne(userData);

    const user = await db
      .collection("users")
      .findOne({ _id: result.insertedId });
    console.log("User created successfully:", user);

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: validationErrors.join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
