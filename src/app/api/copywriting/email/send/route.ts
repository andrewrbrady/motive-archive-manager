import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export async function POST(request: NextRequest) {
  try {
    const {
      subject,
      fromName,
      fromEmail,
      toEmail,
      content,
      emailType,
      testMode,
    } = await request.json();

    // Validate required fields
    if (!subject || !fromName || !fromEmail || !toEmail || !content) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] console.log("Email Send Request:");
    // [REMOVED] // [REMOVED] console.log("Subject:", subject);
    // [REMOVED] // [REMOVED] console.log("From:", `${fromName} <${fromEmail}>`);
    // [REMOVED] // [REMOVED] console.log("To:", toEmail);
    // [REMOVED] // [REMOVED] console.log("Email Type:", emailType || "Not specified");
    // [REMOVED] // [REMOVED] console.log("Test Mode:", testMode ? "Yes" : "No");

    // Build the email message
    const msg = {
      to: toEmail,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: subject,
      html: content,
      // Optional tracking settings
      trackingSettings: {
        clickTracking: {
          enable: true,
          enableText: true,
        },
        openTracking: {
          enable: true,
        },
      },
    };

    // Send the email
    await sgMail.send(msg);

    return NextResponse.json({
      success: true,
      message: testMode
        ? "Test email sent successfully"
        : "Email campaign started successfully",
    });
  } catch (error: any) {
    console.error("Error sending email:", error);

    // Extract error message from SendGrid response if available
    const errorMessage =
      error.response?.body?.errors?.[0]?.message ||
      error.message ||
      "Failed to send email";

    return NextResponse.json(
      {
        error: "Failed to send email",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
