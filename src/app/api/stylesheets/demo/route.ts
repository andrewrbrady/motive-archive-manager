import { NextRequest, NextResponse } from "next/server";
import { parseCSS } from "@/lib/css-parser";
import { ClientStylesheet } from "@/types/stylesheet";

/**
 * POST /api/stylesheets/demo
 * Create a demo stylesheet with sample CSS for testing
 */
export async function POST(request: NextRequest) {
  try {
    const sampleCSS = `
        body {
            font-family: Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
            padding: 0;
            background-color: #f8f9fa;
        }
        .container {
            background-color: #ffffff;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            background-color: #1A234E;
            padding: 40px 20px;
            border-radius: 8px 8px 0 0;
            margin: -40px -40px 40px -40px;
        }
        .logo {
            width: 60px;
            height: 60px;
            margin: 0 auto 20px;
            display: block;
        }
        .logo img {
            width: 100%;
            height: 100%;
            display: block;
        }
        h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            text-align: center;
            letter-spacing: -0.5px;
        }
        .intro-text {
            font-size: 22px;
            color: #1a1a1a;
            text-align: center;
            margin: 40px 0;
            line-height: 1.4;
            font-weight: 600;
            padding: 20px;
        }
        .curatorial-quote-container {
            border-top: 1px solid #ccc;
            border-bottom: 1px solid #ccc;
            padding: 40px;
            margin: 50px 0;
            text-align: center;
        }
        .curatorial-quote {
            font-size: 22px;
            color: #1a1a1a;
            text-align: center;
            margin: 0;
            font-style: italic;
            line-height: 1.5;
            font-weight: 500;
        }
        .curatorial-quote strong {
            font-weight: 900;
        }
        .app-promo-section {
            text-align: center;
            margin: 50px 0 60px 0;
            padding: 0 20px;
        }
        .app-promo-section p {
            font-size: 18px;
            color: #1a1a1a;
            font-weight: 400;
            line-height: 1.5;
            margin: 0 0 20px 0;
        }
        .app-promo-image {
            display: block;
            max-width: 100%;
            height: auto;
            margin: 0 auto 25px auto;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .app-promo-tagline {
            font-size: 24px;
            color: #1a1a1a;
            font-weight: 700;
            margin: 0;
            line-height: 1.3;
            letter-spacing: 0.5px;
        }
        .services-title {
            color: #1a1a1a;
            font-size: 42px;
            font-weight: 900;
            text-align: center;
            margin: 60px 0 50px 0;
            letter-spacing: 3px;
            text-transform: uppercase;
        }
        .services-grid {
            display: block;
            margin: 40px 0;
        }
        .service-item {
            text-align: left;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 1px solid #e0e0e0;
        }
        .service-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .service-item img {
            display: block;
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .service-item h3 {
            color: #666;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 10px 0;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }
        .service-item h4 {
            color: #1a1a1a;
            font-size: 26px;
            font-weight: 900;
            margin: 0 0 18px 0;
            letter-spacing: 0.5px;
            line-height: 1.2;
        }
        .service-item p {
            color: #1a1a1a;
            font-size: 18px;
            line-height: 1.5;
            margin: 0 0 20px 0;
            font-weight: 400;
        }
        .feature-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .feature-list li {
            color: #666;
            font-size: 16px;
            line-height: 1.5;
            margin: 10px 0;
            padding-left: 25px;
            position: relative;
            font-weight: 400;
        }
        .feature-list li:before {
            content: "•";
            color: #1a1a1a;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        .archive-cta-section {
            text-align: center;
            margin: 50px 0;
            padding: 40px 30px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .archive-cta-section h3 {
            color: #1a1a1a;
            font-size: 32px;
            font-weight: 900;
            margin: 0 0 20px 0;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        .archive-cta-section p {
            color: #1a1a1a;
            font-size: 20px;
            margin: 0 0 30px 0;
            line-height: 1.4;
            font-weight: 500;
        }
        .start-archiving-button {
            background-color: #1A234E !important;
            color: #fff !important;
            display: inline-block !important;
            text-decoration: none !important;
            padding: 20px 50px !important;
            border-radius: 30px !important;
            font-weight: 700 !important;
            font-size: 16px !important;
            text-align: center !important;
            vertical-align: middle !important;
        }
        .start-archiving-button:hover {
            background-color: #152040 !important;
        }
        .button-logo {
            width: 24px;
            height: 24px;
            vertical-align: middle;
            margin-right: 8px;
            margin-top: -2px;
        }
        .newsletter-section {
            margin: 50px 0;
            padding: 30px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .newsletter-title {
            color: #1a1a1a;
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 20px 0;
            text-align: center;
        }
        .newsletter-item {
            display: flex;
            align-items: flex-start;
            margin: 15px 0;
            padding: 10px 0;
        }
        .newsletter-item span {
            font-size: 16px;
            margin-right: 12px;
            flex-shrink: 0;
        }
        .newsletter-item-content {
            color: #666;
            font-size: 14px;
            line-height: 1.4;
        }
        .cta-section {
            text-align: center;
            margin: 50px 0;
        }
        .cta-text {
            font-size: 18px;
            color: #1a1a1a;
            font-weight: 600;
            margin-bottom: 25px;
        }
        .cta-button {
            display: inline-block;
            background-color: #000;
            color: #fff;
            text-decoration: none;
            padding: 18px 40px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            letter-spacing: 1px;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #333;
        }
        .social-links {
            text-align: center;
            margin: 40px 0;
            padding: 25px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .social-links h3 {
            margin: 0 0 15px 0;
            color: #1a1a1a;
            font-size: 18px;
            font-weight: 700;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 40px 0;
        }
        
        /* Mobile responsive */
        @media (max-width: 600px) {
            .intro-text {
                font-size: 20px;
            }
            .services-title {
                font-size: 32px;
                letter-spacing: 2px;
            }
            h1 {
                font-size: 24px;
            }
            .curatorial-quote-container {
                padding: 20px 15px;
            }
            .curatorial-quote {
                font-size: 20px;
            }
            .app-promo-tagline {
                font-size: 20px;
            }
            .service-item h4 {
                font-size: 22px;
            }
            .service-item p {
                font-size: 16px;
            }
            .archive-cta-section {
                padding: 30px 20px;
            }
            .archive-cta-section h3 {
                font-size: 26px;
                letter-spacing: 1px;
            }
            .archive-cta-section p {
                font-size: 18px;
            }
        }
    `;

    // Parse the CSS content with error handling
    let parsedCSS;
    try {
      const rawParsedCSS = parseCSS(sampleCSS);

      // Validate parsed CSS to ensure it won't cause Mongoose Map errors
      const validVariables: { [key: string]: string } = {};
      for (const [key, value] of Object.entries(rawParsedCSS.variables)) {
        // Only include variables with valid keys for Mongoose Maps
        if (
          key &&
          typeof key === "string" &&
          !key.includes(".") &&
          !key.includes("[") &&
          !key.includes("]") &&
          !key.includes("<") &&
          !key.includes(">") &&
          key.length < 100
        ) {
          validVariables[key] = value;
        }
      }

      parsedCSS = {
        ...rawParsedCSS,
        variables: validVariables,
      };
    } catch (parseError) {
      console.error(
        "CSS parsing failed for demo stylesheet, using minimal parsed structure:",
        parseError
      );
      // Fallback to a minimal parsed structure to prevent crashes
      parsedCSS = {
        classes: [],
        variables: {},
        globalStyles: {},
      };
    }

    // Create the demo stylesheet
    const stylesheet: ClientStylesheet = {
      id: "demo-stylesheet-1",
      name: "Demo Newsletter Styles",
      clientId: "demo-client",
      clientName: "Demo Client",
      cssContent: sampleCSS,
      parsedCSS,
      isDefault: true,
      isActive: true,
      uploadedAt: new Date(),
      updatedAt: new Date(),
      uploadedBy: "system",
      description: "Sample newsletter styles for demonstration",
      version: "1.0.0",
      tags: ["demo", "newsletter", "sample"],
    };

    return NextResponse.json({ stylesheet }, { status: 201 });
  } catch (error) {
    console.error("Error creating demo stylesheet:", error);
    return NextResponse.json(
      { error: "Failed to create demo stylesheet" },
      { status: 500 }
    );
  }
}
