import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { dbConnect } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { Types } from "mongoose";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Create a new user
    const userData = {
      name,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook in User model
      roles: ["viewer"], // Default role
      status: "active",
      creativeRoles: [],
      active: true,
      permissions: ["read"], // Default permission
      emailVerified: false,
      profile: {
        specialties: [],
      },
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Save the user to the database
    const newUser = await User.create(userData);

    // Return success response (excluding sensitive info)
    return NextResponse.json(
      {
        id: (newUser._id as Types.ObjectId).toString(),
        name: newUser.name,
        email: newUser.email,
        roles: newUser.roles,
        message: "Registration successful",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);

    // Handle known error types
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: validationErrors.join(", ") },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
