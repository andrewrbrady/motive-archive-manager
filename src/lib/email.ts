import sgMail from "@sendgrid/mail";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SendGrid API key not found in environment variables");
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: EmailOptions) {
  try {
    // Prepare email data
    const msg = {
      to: options.to,
      from: process.env.EMAIL_FROM || "no-reply@yourdomain.com",
      subject: options.subject,
      html: options.html,
    };

    // Send email
    const result = await sgMail.send(msg);

    console.log("Email sent successfully");

    return {
      success: true,
      messageId: `sg_${Date.now()}`,
      response: result[0],
    };
  } catch (error) {
    console.error("Failed to send email:", error);
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
