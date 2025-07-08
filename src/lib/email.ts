import sgMail from "@sendgrid/mail";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Initialize SendGrid with API key
const sendgridApiKey = process.env.SENDGRID_API_KEY;
console.log("SendGrid API Key check:", {
  exists: !!sendgridApiKey,
  length: sendgridApiKey?.length || 0,
  startsWithSG: sendgridApiKey?.startsWith("SG.") || false,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
});

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("SendGrid API key initialized successfully");
} else {
  console.error("SendGrid API key not found in environment variables");
  console.log(
    "Available env variables:",
    Object.keys(process.env).filter((key) => key.includes("SENDGRID"))
  );
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: EmailOptions) {
  try {
    // Check if SendGrid is properly initialized
    if (!sendgridApiKey) {
      console.error("Cannot send email: SendGrid API key not available");
      return { success: false, error: "SendGrid not configured" };
    }

    // Prepare email data
    const msg = {
      to: options.to,
      from: process.env.EMAIL_FROM || "no-reply@yourdomain.com",
      subject: options.subject,
      html: options.html,
    };

    console.log("Attempting to send email with config:", {
      to: msg.to,
      from: msg.from,
      subject: msg.subject,
      htmlLength: msg.html.length,
      NODE_ENV: process.env.NODE_ENV,
      EMAIL_FROM_SET: !!process.env.EMAIL_FROM,
    });

    // Send email
    const result = await sgMail.send(msg);

    console.log("Email sent successfully", {
      messageId: result[0]?.headers?.["x-message-id"],
      statusCode: result[0]?.statusCode,
    });

    return {
      success: true,
      messageId: `sg_${Date.now()}`,
      response: result[0],
    };
  } catch (error: any) {
    console.error("Failed to send email:", error);

    // Log detailed SendGrid error information
    if (error.response?.body) {
      console.error("SendGrid error details:", {
        statusCode: error.code,
        errorBody: error.response.body,
        headers: error.response.headers,
      });
    }

    return { success: false, error };
  }
}

/**
 * Send a password reset email with the reset link
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
) {
  // Determine the base URL based on environment
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_BASE_URL || "https://yourdomain.com"
      : "http://localhost:3001";

  // Create the reset link
  const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

  // Email content
  const subject = "Reset Your Password";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p>
        <a 
          href="${resetLink}" 
          style="display: inline-block; padding: 10px 20px; background-color: #4A5568; color: white; text-decoration: none; border-radius: 5px;"
        >
          Reset Password
        </a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    </div>
  `;

  // Send the email
  return await sendEmail({ to: email, subject, html });
}
