import { sendPasswordResetEmail } from "../lib/email";

/**
 * Test email functionality
 * Run with: npx tsx src/scripts/test-email.ts
 */
async function testEmailFunctionality() {
  console.log("Testing password reset email functionality...");

  try {
    // Test email address - replace with your own for testing
    const testEmail = "test@example.com";

    // Generate a fake reset token
    const resetToken = "test-reset-token-" + Date.now().toString();

    console.log(`Sending test password reset email to: ${testEmail}`);
    console.log(`Using test reset token: ${resetToken}`);

    // Attempt to send the email
    const result = await sendPasswordResetEmail(testEmail, resetToken);

    console.log("Email send result:", result);
    console.log(
      "✅ Email test completed - check the console for the preview URL"
    );
  } catch (error) {
    console.error("❌ Error testing email functionality:", error);
  }
}

// Run the test function
testEmailFunctionality();
