import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import crypto from "crypto";

/**
 * This script tests the password reset functionality by:
 * 1. Finding a test user (or creating one)
 * 2. Generating a reset token and expiry
 * 3. Updating the user with the token
 * 4. Displaying information needed to test the reset flow
 */
async function testResetPasswordFlow() {
  console.log("Testing password reset flow...");

  try {
    // Connect to the database
    await dbConnect();
    console.log("Connected to database");

    // Define a test email
    const testEmail = "test@example.com";

    // Find the test user or create one if it doesn't exist
    let user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log(
        `No user found with email ${testEmail}, creating a test user`
      );

      // Create a test user
      user = await User.create({
        email: testEmail,
        password: "password123", // This would normally be hashed
        name: "Test User",
        roles: ["user"],
      });

      console.log("Created test user:", user);
    } else {
      console.log("Found existing test user");
    }

    // Generate a reset token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update the user with the reset token
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken: resetToken,
          resetTokenExpiry: resetTokenExpiry,
        },
      },
      { writeConcern: { w: "majority" } }
    );

    console.log("Updated user with reset token");

    // Display test information
    console.log("\n--- Test Information ---");
    console.log(`User email: ${testEmail}`);
    console.log(`Reset token: ${resetToken}`);
    console.log(`Reset token expiry: ${resetTokenExpiry}`);

    // Construct the reset URL
    const baseUrl = "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    console.log("\n--- Reset URL ---");
    console.log(resetUrl);
    console.log("\nVisit this URL to test the password reset flow");
  } catch (error) {
    console.error("Error in test script:", error);
  } finally {
    // Disconnect from the database
    // await mongoose.disconnect();
    console.log("\nTest script completed");
  }
}

// Run the test script
testResetPasswordFlow();
