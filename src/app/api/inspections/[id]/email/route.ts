import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sendEmail } from "@/lib/email";

interface EmailInspectionRequest {
  to: string;
  subject?: string;
  includeImages?: boolean;
  message?: string;
}

// POST /api/inspections/[id]/email - Send inspection report via email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params;

    if (!ObjectId.isValid(inspectionId)) {
      return NextResponse.json(
        { error: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const body: EmailInspectionRequest = await request.json();

    if (!body.to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get the inspection with car details
    const inspection = await db
      .collection("inspections")
      .findOne({ _id: new ObjectId(inspectionId) });

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    // Get car details
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(inspection.carId) });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Generate car title - filter out falsy values (including undefined year)
    const carTitleParts = [car.year, car.make, car.model].filter(Boolean);
    const carTitle = carTitleParts.join(" ");

    // Create email subject
    const subject = body.subject || `Inspection Report - ${carTitle}`;

    // Generate inspection report HTML
    const inspectionDate = new Date(inspection.inspectedAt).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    const statusColor = inspection.status === "pass" ? "#22c55e" : "#ef4444";
    const statusText =
      inspection.status === "pass" ? "PASS" : "NEEDS ATTENTION";

    // Build checklist HTML
    let checklistHtml = "";
    if (inspection.checklistItems && inspection.checklistItems.length > 0) {
      const failedItems = inspection.checklistItems.filter(
        (item: any) => !item.completed
      );
      const completedItems = inspection.checklistItems.filter(
        (item: any) => item.completed
      );

      if (failedItems.length > 0) {
        checklistHtml += `
          <h3 style="color: #ef4444; margin-top: 20px;">Items Needing Attention:</h3>
          <ul style="margin: 10px 0;">
            ${failedItems
              .map(
                (item: any) => `
              <li style="margin: 5px 0; color: #374151;">
                <span style="color: #ef4444;">✗</span> ${item.description}
              </li>
            `
              )
              .join("")}
          </ul>
        `;
      }

      if (completedItems.length > 0) {
        checklistHtml += `
          <h3 style="color: #22c55e; margin-top: 20px;">Completed Items:</h3>
          <ul style="margin: 10px 0;">
            ${completedItems
              .map(
                (item: any) => `
              <li style="margin: 5px 0; color: #374151;">
                <span style="color: #22c55e;">✓</span> ${item.description}
                ${
                  item.dateCompleted
                    ? `<span style="color: #6b7280; font-size: 0.875em;"> (${new Date(item.dateCompleted).toLocaleDateString()})</span>`
                    : ""
                }
              </li>
            `
              )
              .join("")}
          </ul>
        `;
      }
    }

    // Build images HTML - Show only first 3 images to keep email lightweight
    let imagesHtml = "";
    if (
      body.includeImages &&
      inspection.inspectionImageIds &&
      inspection.inspectionImageIds.length > 0
    ) {
      // Show only first 3 images to keep email size small
      const limitedImages = inspection.inspectionImageIds.slice(0, 3);

      imagesHtml = `
        <h3>Sample Inspection Images:</h3>
        <table width="100%" cellpadding="8" cellspacing="0" border="0" style="max-width: 600px;">
          <tr>
            ${limitedImages
              .map((imageId: string) => {
                const thumbnailUrl = `https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${imageId}/thumbnail`;
                const fullSizeUrl = `https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${imageId}/large`;
                return `
                  <td width="33%" align="center" valign="top">
                    <a href="${fullSizeUrl}" target="_blank">
                      <img src="${thumbnailUrl}" width="180" style="max-width: 180px; height: auto; border: 1px solid #ddd;" alt="Inspection image" />
                    </a>
                    <br>
                    <a href="${fullSizeUrl}" target="_blank" style="color: #0066cc; font-size: 12px;">View Full Size</a>
                  </td>
                `;
              })
              .join("")}
            ${
              limitedImages.length < 3
                ? Array(3 - limitedImages.length)
                    .fill("")
                    .map(() => '<td width="33%"></td>')
                    .join("")
                : ""
            }
          </tr>
        </table>
        ${
          inspection.inspectionImageIds.length > 3
            ? `<p style="color: #666; font-size: 14px; margin-top: 10px;"><strong>Showing 3 of ${inspection.inspectionImageIds.length} total images.</strong> See the Dropbox links below to view the complete image gallery.</p>`
            : ""
        }
      `;
    }

    // Build Dropbox links HTML
    let dropboxLinksHtml = "";
    if (inspection.dropboxImageFolderUrl || inspection.dropboxVideoFolderUrl) {
      dropboxLinksHtml = `
        <table width="100%" cellpadding="15" cellspacing="0" border="0" style="background-color: #f0f9ff; margin: 20px 0;">
          <tr>
            <td style="border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0;">Additional Resources:</h3>
              ${
                inspection.dropboxImageFolderUrl
                  ? `
                <p style="margin: 0 0 10px 0;">
                  <strong>📸 Image Gallery:</strong>
                  <a href="${inspection.dropboxImageFolderUrl}" target="_blank" style="color: #0066cc; margin-left: 10px;">View All Images in Dropbox</a>
                </p>
              `
                  : ""
              }
              ${
                inspection.dropboxVideoFolderUrl
                  ? `
                <p style="margin: 0;">
                  <strong>🎥 Video Gallery:</strong>
                  <a href="${inspection.dropboxVideoFolderUrl}" target="_blank" style="color: #0066cc; margin-left: 10px;">View All Videos in Dropbox</a>
                </p>
              `
                  : ""
              }
            </td>
          </tr>
        </table>
      `;
    }

    const html = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <tr>
          <td>
            <table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color: #f9fafb; margin-bottom: 20px;">
              <tr>
                <td>
                  <h1 style="color: #111827; margin: 0 0 10px 0;">Vehicle Inspection Report</h1>
                  <p style="color: #6b7280; margin: 0; font-size: 16px;">${carTitle}</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color: white; border: 1px solid #e5e7eb; margin-bottom: 20px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td>
                        <h2 style="color: #111827; margin: 0;">Inspection Details</h2>
                      </td>
                      <td align="right">
                        <span style="background-color: ${statusColor}; color: white; padding: 6px 12px; font-weight: bold; font-size: 14px;">
                          ${statusText}
                        </span>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top: 15px;">
                    <tr>
                      <td style="border-bottom: 1px solid #f3f4f6;"><strong>Title:</strong></td>
                      <td style="border-bottom: 1px solid #f3f4f6;">${inspection.title}</td>
                    </tr>
                    <tr>
                      <td style="border-bottom: 1px solid #f3f4f6;"><strong>Date:</strong></td>
                      <td style="border-bottom: 1px solid #f3f4f6;">${inspectionDate}</td>
                    </tr>
                    ${
                      inspection.inspectedBy
                        ? `
                      <tr>
                        <td style="border-bottom: 1px solid #f3f4f6;"><strong>Inspector:</strong></td>
                        <td style="border-bottom: 1px solid #f3f4f6;">${inspection.inspectedBy}</td>
                      </tr>
                    `
                        : ""
                    }
                    ${
                      car.vin
                        ? `
                      <tr>
                        <td style="border-bottom: 1px solid #f3f4f6;"><strong>VIN:</strong></td>
                        <td style="border-bottom: 1px solid #f3f4f6;">${car.vin}</td>
                      </tr>
                    `
                        : ""
                    }
                  </table>

                  ${
                    inspection.description
                      ? `
                    <div style="margin-top: 20px;">
                      <h3 style="color: #111827;">Notes:</h3>
                      <p style="color: #374151; line-height: 1.6;">${inspection.description}</p>
                    </div>
                  `
                      : ""
                  }

                  ${checklistHtml}
                  ${imagesHtml}
                  ${dropboxLinksHtml}
                </td>
              </tr>
            </table>

            ${
              body.message
                ? `
              <table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color: #f3f4f6; margin-bottom: 20px;">
                <tr>
                  <td>
                    <h3 style="color: #111827; margin-top: 0;">Additional Message:</h3>
                    <p style="color: #374151; line-height: 1.6; margin-bottom: 0;">${body.message}</p>
                  </td>
                </tr>
              </table>
            `
                : ""
            }

            <table width="100%" cellpadding="15" cellspacing="0" border="0" style="background-color: #f9fafb; text-align: center; border-top: 3px solid #3b82f6;">
              <tr>
                <td>
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    This inspection report was generated by Motive Archive Manager
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    // Send the email
    const emailResult = await sendEmail({
      to: body.to,
      subject,
      html,
    });

    if (!emailResult.success) {
      console.error("Failed to send inspection email:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Inspection report sent successfully",
      messageId: emailResult.messageId,
    });
  } catch (error) {
    console.error("Error sending inspection email:", error);
    return NextResponse.json(
      { error: "Failed to send inspection report" },
      { status: 500 }
    );
  }
}
