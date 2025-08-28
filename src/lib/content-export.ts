import {
  ContentBlock,
  FrontmatterBlock,
} from "@/components/content-studio/types";
import { api } from "@/lib/api-client";

// Utility to get base URL without any variant for frontmatter
function getBaseImageUrl(url: string): string {
  if (!url || !url.includes("imagedelivery.net")) {
    return url;
  }

  // Remove any existing variant to get base URL
  const urlParts = url.split("/");
  const lastPart = urlParts[urlParts.length - 1];

  // If the last part is a variant, remove it
  if (lastPart.match(/^[a-zA-Z]+$/) || lastPart.includes("=")) {
    urlParts.pop();
  }

  return urlParts.join("/");
}

export interface ExportMetadata {
  name: string;
  exportedAt: string;
  projectId?: string;
  carId?: string;
  previewText?: string;
}

export interface ExportOptions {
  format: "web" | "email";
  emailPlatform?: "mailchimp" | "sendgrid" | "generic";
  action: "download" | "copy";
  includeCSS: boolean;
  fileName?: string;
  // Global spacing applied across blocks in email export
  blockSpacing?: string;
}

/**
 * Enhanced content export utilities
 * Extracted from BlockComposer.tsx to reduce file size and improve maintainability
 */
export class ContentExporter {
  /**
   * Export content to HTML format (web or email)
   */
  static async exportToHTML(
    blocks: ContentBlock[],
    template: string | null,
    compositionName: string,
    format: "web" | "email" = "web",
    projectId?: string,
    carId?: string,
    selectedStylesheetId?: string | null,
    emailPlatform: "mailchimp" | "sendgrid" | "generic" = "generic",
    includeCSS: boolean = true,
    blockSpacing?: string
  ): Promise<string> {
    const metadata: ExportMetadata = {
      name: compositionName,
      exportedAt: new Date().toISOString(),
      projectId,
      carId,
      previewText: "", // Can be extracted from blocks if needed
      // Pass global block spacing through metadata to the export route
      // so the generator can honor it across all table wrappers
      ...(blockSpacing ? ({ blockSpacing } as any) : {}),
    };

    const requestBody = {
      blocks,
      template,
      metadata,
      format,
      selectedStylesheetId,
      emailPlatform,
      includeCSS,
    };

    const response = (await api.post(
      "/api/content-studio/export-html",
      requestBody
    )) as { success: boolean; html: string };

    if (!response.success) {
      throw new Error("Failed to export HTML");
    }

    return response.html;
  }

  /**
   * Export content using the new options interface
   */
  static async exportWithOptions(
    blocks: ContentBlock[],
    template: string | null,
    compositionName: string,
    options: ExportOptions,
    projectId?: string,
    carId?: string,
    selectedStylesheetId?: string | null
  ): Promise<string> {
    const html = await this.exportToHTML(
      blocks,
      template,
      compositionName,
      options.format,
      projectId,
      carId,
      selectedStylesheetId,
      options.emailPlatform || "generic",
      options.includeCSS,
      options.blockSpacing
    );

    if (options.action === "download") {
      this.downloadHTMLFile(html, options.fileName || compositionName);
    } else {
      await this.copyToClipboard(html);
    }

    return html;
  }

  /**
   * Copy HTML to clipboard with robust error handling
   */
  static async copyToClipboard(html: string): Promise<void> {
    // First try to ensure document has focus
    try {
      // Try to focus the window first
      if (typeof window !== "undefined" && window.focus) {
        window.focus();
      }

      // Small delay to ensure focus takes effect
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(html);
        console.log("✅ Content copied to clipboard successfully");
        return;
      }
    } catch (error) {
      console.warn("Modern clipboard API failed:", error);
      // Fall through to alternative method
    }

    // Fallback method for older browsers or when clipboard API fails
    try {
      const textArea = document.createElement("textarea");
      textArea.value = html;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      document.body.appendChild(textArea);

      // Focus and select the text
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, html.length);

      // Try to copy using execCommand
      const successful = document.execCommand("copy");
      textArea.remove();

      if (successful) {
        console.log(
          "✅ Content copied to clipboard successfully (fallback method)"
        );
        return;
      }
    } catch (fallbackError) {
      console.error("Fallback clipboard method failed:", fallbackError);
    }

    // If all methods fail, trigger download as last resort
    console.warn("⚠️ Clipboard copy failed, downloading file instead");
    this.downloadHTMLFile(html, "exported-content");
  }

  /**
   * Download HTML as file
   */
  static downloadHTMLFile(html: string, fileName: string): void {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get the current URL for an image, checking gallery data for updates
   */
  private static async getCurrentImageUrl(
    imageBlock: any,
    galleryIds?: string[]
  ): Promise<string> {
    const originalUrl = imageBlock.imageUrl;

    // If no galleries are selected or no metadata, return original URL
    const imageId = imageBlock.metadata?.id || imageBlock.metadata?.imageId;
    if (!galleryIds || galleryIds.length === 0 || !imageId) {
      return originalUrl;
    }

    try {
      // Check all selected galleries for this image
      for (const galleryId of galleryIds) {
        const response = (await api.get(`/api/galleries/${galleryId}`)) as any;
        const gallery = response.gallery;

        if (gallery && gallery.images) {
          // Find the image in this gallery by ID
          const currentImage = gallery.images.find(
            (img: any) => img._id === imageId
          );

          if (currentImage && currentImage.url !== originalUrl) {
            console.log(`📸 Using updated URL for image ${imageId}:`, {
              original: originalUrl,
              current: currentImage.url,
            });
            return currentImage.url;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to fetch current image URL from galleries:", error);
    }

    // Fallback to original URL
    return originalUrl;
  }

  /**
   * Export content to MDX format
   */
  static async exportToMDX(
    blocks: ContentBlock[],
    compositionName: string,
    galleryIds?: string[],
    carouselIds?: string[]
  ): Promise<string> {
    const frontmatterBlocks = blocks.filter(
      (block) => block.type === "frontmatter"
    ) as FrontmatterBlock[];
    const contentBlocks = blocks.filter(
      (block) => block.type !== "frontmatter"
    );

    // Generate frontmatter
    let frontmatter = "";
    let hasFrontmatterContent =
      frontmatterBlocks.length > 0 ||
      (galleryIds && galleryIds.length > 0) ||
      (carouselIds && carouselIds.length > 0);

    if (hasFrontmatterContent) {
      frontmatter = "---\n";

      // Add existing frontmatter blocks
      frontmatterBlocks.forEach((block) => {
        // Use the data property from FrontmatterBlock
        if (block.data) {
          Object.entries(block.data).forEach(([key, value]) => {
            frontmatter += `${key}: ${JSON.stringify(value)}\n`;
          });
        }
      });

      // Add gallery data if galleries are selected
      if (galleryIds && galleryIds.length > 0) {
        try {
          // Fetch gallery data for each selected gallery
          const galleryPromises = galleryIds.map(async (galleryId) => {
            const gallery = (await api.get(
              `/api/galleries/${galleryId}`
            )) as any;
            return gallery;
          });

          const galleries = await Promise.all(galleryPromises);

          // Combine all images from all selected galleries into one flat array
          const allImages: any[] = [];
          let imageCounter = 1;

          for (const gallery of galleries) {
            if (gallery && gallery.images) {
              // Get ordered images array, falling back to default order if not available
              const orderedImageIds = gallery.orderedImages?.length
                ? gallery.orderedImages
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((item: any) => item.id)
                : gallery.imageIds;

              // Create a map of images by their ID for quick lookup
              const imageMap = new Map(
                gallery.images?.map((image: any) => [image._id, image]) || []
              );

              // Map the ordered IDs to their corresponding images
              orderedImageIds.forEach((id: string) => {
                const image = imageMap.get(id) as any;
                if (image) {
                  allImages.push({
                    id: `img${imageCounter}`,
                    src: getBaseImageUrl(image.url), // Use base URL without variant
                    alt:
                      image.alt ||
                      image.filename ||
                      `Gallery Image ${imageCounter}`,
                  });
                  imageCounter++;
                }
              });
            }
          }

          // Add gallery to frontmatter in the requested format
          if (allImages.length > 0) {
            frontmatter += "gallery:\n";
            allImages.forEach((image) => {
              frontmatter += `  - id: "${image.id}"\n`;
              frontmatter += `    src: "${image.src}"\n`;
              frontmatter += `    alt: "${image.alt}"\n`;
            });
          }
        } catch (error) {
          console.error("Failed to fetch gallery data for MDX export:", error);
          // Continue without gallery data if fetch fails
        }
      }

      // Add carousel data if carousel galleries are selected
      if (carouselIds && carouselIds.length > 0) {
        try {
          // Fetch carousel gallery data for each selected carousel gallery
          const carouselPromises = carouselIds.map(async (carouselId) => {
            const gallery = (await api.get(
              `/api/galleries/${carouselId}`
            )) as any;
            return gallery;
          });

          const carouselGalleries = await Promise.all(carouselPromises);

          // Combine all images from all selected carousel galleries into one flat array
          const allCarouselImages: any[] = [];
          let carouselImageCounter = 1;

          for (const gallery of carouselGalleries) {
            if (gallery && gallery.images) {
              // Get ordered images array, falling back to default order if not available
              const orderedImageIds = gallery.orderedImages?.length
                ? gallery.orderedImages
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((item: any) => item.id)
                : gallery.imageIds;

              // Create a map of images by their ID for quick lookup
              const imageMap = new Map(
                gallery.images?.map((image: any) => [image._id, image]) || []
              );

              // Map the ordered IDs to their corresponding images
              orderedImageIds.forEach((id: string) => {
                const image = imageMap.get(id) as any;
                if (image) {
                  allCarouselImages.push({
                    id: `img${carouselImageCounter}`,
                    src: getBaseImageUrl(image.url), // Use base URL without variant
                    alt:
                      image.alt ||
                      image.filename ||
                      `Carousel Image ${carouselImageCounter}`,
                  });
                  carouselImageCounter++;
                }
              });
            }
          }

          // Add carousel to frontmatter in the requested format (above gallery)
          if (allCarouselImages.length > 0) {
            frontmatter += "carousel:\n";
            allCarouselImages.forEach((image) => {
              frontmatter += `  - id: "${image.id}"\n`;
              frontmatter += `    src: "${image.src}"\n`;
              frontmatter += `    alt: "${image.alt}"\n`;
            });
          }
        } catch (error) {
          console.error("Failed to fetch carousel data for MDX export:", error);
          // Continue without carousel data if fetch fails
        }
      }

      frontmatter += "---\n\n";
    }

    // Generate content - handle async image URL processing
    const sortedBlocks = contentBlocks.sort((a, b) => a.order - b.order);
    const contentPromises = sortedBlocks.map(async (block) => {
      switch (block.type) {
        case "html":
          const htmlBlock = block as any;
          // For MDX, we can include HTML directly since MDX supports HTML
          return htmlBlock.content || "";
        case "text":
          const textBlock = block as any;
          const element = textBlock.element || "p";
          if (element === "h1") return `# ${textBlock.content}`;
          if (element === "h2") return `## ${textBlock.content}`;
          if (element === "h3") return `### ${textBlock.content}`;
          return textBlock.content;
        case "list":
          const listBlock = block as any;
          const items = listBlock.items || [];
          if (items.length === 0) return "";
          return items.map((item: string) => `- ${item}`).join("\n");
        case "image":
          const imageBlock = block as any;
          // Get the current URL (checking galleries for updates)
          const currentImageUrl = await this.getCurrentImageUrl(
            imageBlock,
            galleryIds
          );
          let imageMarkdown = `![${imageBlock.altText || ""}](${currentImageUrl})`;
          // Include caption if it exists
          if (imageBlock.caption) {
            imageMarkdown += `\n\n*${imageBlock.caption}*`;
          }
          return imageMarkdown;
        case "divider":
          return "---";
        case "video":
          const videoBlock = block as any;
          return `[${videoBlock.title || "Video"}](${videoBlock.videoUrl})`;
        default:
          return "";
      }
    });

    const contentArray = await Promise.all(contentPromises);
    const content = contentArray.join("\n\n");

    const mdxContent = frontmatter + content;

    // Download MDX file
    const blob = new Blob([mdxContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${compositionName}.mdx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return mdxContent;
  }

  /**
   * Check if blocks have email-specific features
   */
  static hasEmailFeatures(blocks: ContentBlock[]): boolean {
    return blocks.some((block) => {
      if (block.type === "image") {
        const imageBlock = block as any;
        return imageBlock.email?.isFullWidth || false;
      }
      return false;
    });
  }
}
