import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("Processing password reset request...");
    }
    const { email } = await req.json();

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log(`Reset request for email: ${email?.substring(0, 3)}***`);
    }

    if (!email) {
      if (process.env.NODE_ENV !== "production") {
        // [REMOVED] // [REMOVED] console.log("Email is required but was not provided");
      }
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("Connecting to database...");
    }
    await dbConnect();
    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("Database connection established");
    }

    // Find the user with the given email
    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log(`Finding user with email`);
    }
    const user = await User.findOne({ email: email.toLowerCase() });

    // Even if no user is found, return a success response to prevent email enumeration attacks
    if (!user) {
      if (process.env.NODE_ENV !== "production") {
        // [REMOVED] // [REMOVED] console.log("No user found with provided email");
      }
      return NextResponse.json(
        {
          message:
            "If a user with that email exists, a password reset link has been sent",
        },
        { status: 200 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("User found, generating reset token...");
    }
    // Generate a reset token and its expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("Updating user with reset token...");
    }
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
    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("User updated successfully");
    }

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("Sending password reset email...");
    }
    // Send the password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken);
    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("Email sending complete");
    }

    // Log email sending result (masked)
    if (process.env.NODE_ENV !== "production") {
      console.log("Email sending result:", {
        success: emailResult.success,
        hasError: !!emailResult.error,
        messageId: emailResult.messageId ? "***" : undefined,
      });

      if (!emailResult.success) {
        console.error(
          "Email sending error:",
          (emailResult.error as any)?.message || "Unknown error"
        );
      }
    }

    // Return a success response
    return NextResponse.json(
      {
        message:
          "If a user with that email exists, a password reset link has been sent",
        ...(process.env.NODE_ENV !== "production" && {
          debug: {
            emailSent: emailResult.success,
            hasError: !!emailResult.error,
          },
        }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error in password reset request:",
      (error as Error).message || "Unknown error"
    );
    return NextResponse.json(
      { error: "Error processing password reset request" },
      { status: 500 }
    );
  }
}
