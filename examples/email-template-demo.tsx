import React from "react";
import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  FrontmatterBlock,
} from "../src/components/content-studio/types";
import { generateEmailHTML } from "../src/components/content-studio/renderers/EmailRenderer";

/**
 * Demo: BlockComposer Email Template Generation
 *
 * This demo shows how content blocks from the BlockComposer
 * can be converted into HTML email templates.
 */

// Sample content blocks that would come from BlockComposer
const sampleBlocks: ContentBlock[] = [
  // Frontmatter block with email metadata
  {
    id: "frontmatter-1",
    type: "frontmatter",
    order: 0,
    data: {
      title: "Welcome to Motive Archive",
      subtitle: "Your automotive collection management platform",
      author: "Motive Archive Team",
      date: "2024-01-15",
      callToAction: "READY TO START YOUR ARCHIVE?",
      callToActionUrl:
        "https://app.motivearchive.com/auth/sign-up?utm_source=email&utm_campaign=welcome",
      tags: ["welcome", "onboarding", "collection-management"],
    },
  } as FrontmatterBlock,

  // Welcome text block
  {
    id: "text-1",
    type: "text",
    order: 1,
    element: "h1",
    content:
      "Thank you for joining the Motive Archive community. We're happy to have you on board!",
  } as TextBlock,

  // Quote block
  {
    id: "text-2",
    type: "text",
    order: 2,
    element: "p",
    content:
      '"Just as any museum has a curatorial team to photograph, document, archive and catalogue the works they have—it is vital for the modern collector to do the same."',
    cssClassName: "quote-style",
  } as TextBlock,

  // Service intro image
  {
    id: "image-1",
    type: "image",
    order: 3,
    imageUrl:
      "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/cb3b698f-5023-4667-d905-0d1a44916a00/public",
    altText: "Motive Archive services overview",
    caption: "The ideal platform to manage your collection",
  } as ImageBlock,

  // Service description
  {
    id: "text-3",
    type: "text",
    order: 4,
    element: "p",
    content:
      "Discover a comprehensive platform designed specifically for automotive enthusiasts, collectors, and professionals. Motive Archive combines powerful collection management tools with elegant presentation capabilities.",
  } as TextBlock,

  // Services section header
  {
    id: "text-4",
    type: "text",
    order: 5,
    element: "h2",
    content: "ARCHIVE WITH US",
  } as TextBlock,

  // Service 1
  {
    id: "image-2",
    type: "image",
    order: 6,
    imageUrl:
      "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/d038c987-7db2-4108-280a-737beda98c00/public",
    altText: "Showcase Your Collection",
    caption: "Professional photography tools and templates",
  } as ImageBlock,

  {
    id: "text-5",
    type: "text",
    order: 7,
    element: "h3",
    content: "SHOWCASE YOUR COLLECTION",
  } as TextBlock,

  {
    id: "text-6",
    type: "text",
    order: 8,
    element: "p",
    content:
      "Curate and showcase your car fleet with professional photography tools, customizable gallery layouts, and flexible sharing options.",
  } as TextBlock,

  // Service 2
  {
    id: "image-3",
    type: "image",
    order: 9,
    imageUrl:
      "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/06ba165b-3ac4-4e38-5a5f-9a89a9653700/public",
    altText: "Schedules To Suit Your Needs",
    caption: "Automotive agenda made easy",
  } as ImageBlock,

  {
    id: "text-7",
    type: "text",
    order: 10,
    element: "h3",
    content: "SCHEDULES TO SUIT YOUR NEEDS",
  } as TextBlock,

  {
    id: "text-8",
    type: "text",
    order: 11,
    element: "p",
    content:
      "Track maintenance schedules, never miss car shows, and get timely notifications for all your automotive activities.",
  } as TextBlock,

  // Service 3
  {
    id: "image-4",
    type: "image",
    order: 12,
    imageUrl:
      "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6c11d26f-6185-4b6b-51dd-5fa68251c100/public",
    altText: "Manage Your Own Collection",
    caption: "From hobby to heritage",
  } as ImageBlock,

  {
    id: "text-9",
    type: "text",
    order: 13,
    element: "h3",
    content: "MANAGE YOUR OWN COLLECTION",
  } as TextBlock,

  {
    id: "text-10",
    type: "text",
    order: 14,
    element: "p",
    content:
      "Detailed vehicle records, market value tracking, and comprehensive insurance documentation for your entire collection.",
  } as TextBlock,
];

// Generate the email HTML
const generatedHTML = generateEmailHTML(
  sampleBlocks,
  "Welcome Email Template",
  {
    title: "Welcome to Motive Archive",
    subtitle: "Your automotive collection management platform",
    date: "2024-01-15",
    author: "Motive Archive Team",
    cover: "",
    status: "",
    tags: ["welcome", "onboarding"],
    callToAction: "READY TO START YOUR ARCHIVE?",
    callToActionUrl:
      "https://app.motivearchive.com/auth/sign-up?utm_source=email&utm_campaign=welcome",
    gallery: [],
  }
);

// Demo component showing the process
export function EmailTemplateDemoComponent() {
  const [showHTML, setShowHTML] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(true);

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(generatedHTML);
    alert("Email HTML copied to clipboard!");
  };

  const handleDownloadHTML = () => {
    const blob = new Blob([generatedHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "motive-archive-welcome-email.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">
          📧 BlockComposer Email Template Demo
        </h1>
        <p className="text-blue-700">
          This demo shows how content blocks from the BlockComposer can be
          automatically converted into HTML email templates using the new
          EmailRenderer.
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>

        <button
          onClick={() => setShowHTML(!showHTML)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {showHTML ? "Hide HTML" : "Show HTML"}
        </button>

        <button
          onClick={handleCopyHTML}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          📋 Copy HTML
        </button>

        <button
          onClick={handleDownloadHTML}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          📥 Download HTML
        </button>
      </div>

      {/* Sample Blocks Display */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">📝 Sample Content Blocks</h2>
        <div className="space-y-3">
          {sampleBlocks.map((block, idx) => (
            <div
              key={block.id}
              className="border-l-4 border-blue-300 pl-4 py-2 bg-gray-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                  {block.type.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  Order: {block.order}
                </span>
              </div>
              <div className="text-sm">
                {block.type === "text" && (
                  <div>
                    <strong>
                      {(block as TextBlock).element?.toUpperCase()}:
                    </strong>{" "}
                    {(block as TextBlock).content?.substring(0, 100)}...
                  </div>
                )}
                {block.type === "image" && (
                  <div>
                    <strong>IMAGE:</strong> {(block as ImageBlock).altText}
                    {(block as ImageBlock).caption &&
                      ` - ${(block as ImageBlock).caption}`}
                  </div>
                )}
                {block.type === "frontmatter" && (
                  <div>
                    <strong>FRONTMATTER:</strong>{" "}
                    {(block as FrontmatterBlock).data.title} -{" "}
                    {(block as FrontmatterBlock).data.callToAction}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Preview */}
      {showPreview && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">👀 Email Preview</h2>
          <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50">
            <div
              className="bg-white max-w-2xl mx-auto shadow-lg rounded-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: generatedHTML }}
            />
          </div>
        </div>
      )}

      {/* HTML Source */}
      {showHTML && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Generated HTML</h2>
          <textarea
            readOnly
            value={generatedHTML}
            className="w-full h-96 text-xs font-mono bg-gray-900 text-green-400 p-4 rounded border"
          />
          <div className="mt-2 text-sm text-gray-600">
            <strong>Size:</strong> {(generatedHTML.length / 1024).toFixed(1)} KB
            |<strong> Lines:</strong> {generatedHTML.split("\n").length}
          </div>
        </div>
      )}

      {/* Technical Details */}
      <div className="bg-gray-50 border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">⚙️ Technical Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">✅ Email Features:</h3>
            <ul className="space-y-1 text-gray-700">
              <li>• Inline CSS for maximum compatibility</li>
              <li>• Mobile-responsive design</li>
              <li>• Dark mode support</li>
              <li>• Motive Archive branding</li>
              <li>• CTA button integration</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">📧 Email Clients Tested:</h3>
            <ul className="space-y-1 text-gray-700">
              <li>• Gmail (web/mobile)</li>
              <li>• Outlook (web/desktop)</li>
              <li>• Apple Mail</li>
              <li>• Thunderbird</li>
              <li>• Yahoo Mail</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export for use in development
export default EmailTemplateDemoComponent;
