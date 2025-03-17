import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    console.log("Processing password reset request...");
    const { email } = await req.json();

    console.log(`Reset request for email: ${email}`);

    if (!email) {
      console.log("Email is required but was not provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("Connecting to database...");
    await dbConnect();
    console.log("Database connection established");

    // Find the user with the given email
    console.log(`Finding user with email: ${email.toLowerCase()}`);
    const user = await User.findOne({ email: email.toLowerCase() });

    // Even if no user is found, return a success response to prevent email enumeration attacks
    if (!user) {
      console.log("No user found with email:", email);
      return NextResponse.json(
        {
          message:
            "If a user with that email exists, a password reset link has been sent",
        },
        { status: 200 }
      );
    }

    console.log("User found, generating reset token...");
    // Generate a reset token and its expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    console.log("Updating user with reset token...");
    // Update the user with the reset token and expiry
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken,
          resetTokenExpiry,
        },
      },
      { writeConcern: { w: "majority" } }
    );
    console.log("User updated successfully");

    console.log("Sending password reset email...");
    // Send the password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken);
    console.log("Email sending complete");

    // Log email sending result
    console.log("Email sending result:", JSON.stringify(emailResult, null, 2));

    if (!emailResult.success) {
      console.error("Email sending error details:", emailResult.error);
    }

    // Return a success response
    return NextResponse.json(
      {
        message:
          "If a user with that email exists, a password reset link has been sent",
        ...(process.env.NODE_ENV !== "production" && {
          debug: { emailResult },
        }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in password reset request:", error);
    return NextResponse.json(
      { error: "Error processing password reset request" },
      { status: 500 }
    );
  }
}
