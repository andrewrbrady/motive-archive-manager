import {
  ContentBlock,
  FrontmatterBlock,
} from "@/components/content-studio/types";
import { api } from "@/lib/api-client";

export interface ExportMetadata {
  name: string;
  exportedAt: string;
  projectId?: string;
  carId?: string;
  previewText?: string;
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
    carId?: string
  ): Promise<string> {
    const metadata: ExportMetadata = {
      name: compositionName || "Untitled Composition",
      exportedAt: new Date().toISOString(),
      projectId,
      carId,
      previewText:
        format === "email"
          ? `${compositionName || "Newsletter"} - ${blocks.length} sections`
          : undefined,
    };

    const response = (await api.post("/api/content-studio/export-html", {
      blocks,
      template: template || null,
      format,
      metadata,
    })) as { html?: string };

    if (!response.html) {
      throw new Error("No HTML returned from server");
    }

    return response.html;
  }

  /**
   * Export content and download as HTML file
   */
  static async downloadHTML(
    blocks: ContentBlock[],
    template: string | null,
    compositionName: string,
    format: "web" | "email" = "web",
    projectId?: string,
    carId?: string
  ): Promise<void> {
    const html = await this.exportToHTML(
      blocks,
      template,
      compositionName,
      format,
      projectId,
      carId
    );

    // Create download
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${compositionName || "composition"}${
      format === "email" ? "-email" : ""
    }.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy HTML to clipboard with fallback support
   */
  static async copyHTMLToClipboard(
    blocks: ContentBlock[],
    template: string | null,
    compositionName: string,
    format: "web" | "email" = "web",
    projectId?: string,
    carId?: string
  ): Promise<void> {
    const html = await this.exportToHTML(
      blocks,
      template,
      compositionName,
      format,
      projectId,
      carId
    );

    // Copy to clipboard with proper focus handling
    try {
      // Try modern clipboard API first, but handle focus issues
      if (navigator.clipboard && window.isSecureContext) {
        // Ensure document is focused before clipboard operation
        window.focus();
        await navigator.clipboard.writeText(html);
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (clipboardError) {
      // Fallback method for any clipboard API issues
      const textArea = document.createElement("textarea");
      textArea.value = html;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (!successful) {
        throw new Error("Failed to copy using fallback method");
      }
    }
  }

  /**
   * Export content to MDX format with proper frontmatter handling
   */
  static exportToMDX(blocks: ContentBlock[], compositionName: string): string {
    // Extract frontmatter from frontmatter blocks
    const frontmatterBlock = blocks.find(
      (block) => block.type === "frontmatter"
    ) as FrontmatterBlock | undefined;

    const frontmatterData = frontmatterBlock?.data || {};

    // Generate enhanced YAML frontmatter
    let yamlFrontmatter = "---\n";

    // Core fields
    if (frontmatterData.title) {
      yamlFrontmatter += `title: "${this.escapeYAMLString(frontmatterData.title)}"\n`;
    }

    if (frontmatterData.subtitle) {
      yamlFrontmatter += `subtitle: "${this.escapeYAMLString(frontmatterData.subtitle)}"\n`;
    }

    if (frontmatterData.author) {
      yamlFrontmatter += `author: "${this.escapeYAMLString(frontmatterData.author)}"\n`;
    }

    if (frontmatterData.date) {
      yamlFrontmatter += `date: "${frontmatterData.date}"\n`;
    }

    if (frontmatterData.status) {
      yamlFrontmatter += `status: "${this.escapeYAMLString(frontmatterData.status)}"\n`;
    }

    if (frontmatterData.type) {
      yamlFrontmatter += `type: "${this.escapeYAMLString(frontmatterData.type)}"\n`;
    }

    if (frontmatterData.cover) {
      yamlFrontmatter += `cover: "${frontmatterData.cover}"\n`;
    }

    // Handle tags array properly
    if (
      frontmatterData.tags &&
      Array.isArray(frontmatterData.tags) &&
      frontmatterData.tags.length > 0
    ) {
      const validTags = frontmatterData.tags.filter(Boolean);
      if (validTags.length > 0) {
        yamlFrontmatter += `tags:\n`;
        validTags.forEach((tag) => {
          yamlFrontmatter += `  - "${this.escapeYAMLString(tag)}"\n`;
        });
      }
    }

    if (frontmatterData.callToAction) {
      yamlFrontmatter += `callToAction: "${this.escapeYAMLString(frontmatterData.callToAction)}"\n`;
    }

    if (frontmatterData.callToActionUrl) {
      yamlFrontmatter += `callToActionUrl: "${frontmatterData.callToActionUrl}"\n`;
    }

    // Add any additional custom fields
    Object.keys(frontmatterData).forEach((key) => {
      if (
        ![
          "title",
          "subtitle",
          "author",
          "date",
          "status",
          "type",
          "cover",
          "tags",
          "callToAction",
          "callToActionUrl",
        ].includes(key)
      ) {
        const value = frontmatterData[key];
        if (value && typeof value === "string") {
          yamlFrontmatter += `${key}: "${this.escapeYAMLString(value)}"\n`;
        } else if (typeof value === "boolean" || typeof value === "number") {
          yamlFrontmatter += `${key}: ${value}\n`;
        }
      }
    });

    yamlFrontmatter += "---\n\n";

    // Convert content blocks to MDX
    const contentBlocks = blocks
      .filter((block) => block.type !== "frontmatter")
      .sort((a, b) => a.order - b.order);

    let mdxContent = "";

    contentBlocks.forEach((block) => {
      switch (block.type) {
        case "text": {
          const textBlock = block as any; // TextBlock type
          const content = textBlock.content || "";

          if (textBlock.element && textBlock.element.startsWith("h")) {
            // Convert heading elements to markdown
            const level = parseInt(textBlock.element.replace("h", ""));
            const hashes = "#".repeat(Math.min(level, 6)); // Limit to h6
            mdxContent += `${hashes} ${content}\n\n`;
          } else {
            // Regular paragraph
            mdxContent += `${content}\n\n`;
          }
          break;
        }

        case "image": {
          const imageBlock = block as any; // ImageBlock type
          if (imageBlock.imageUrl) {
            const alt = imageBlock.altText || "Image";
            mdxContent += `![${alt}](${imageBlock.imageUrl})\n\n`;

            if (imageBlock.caption) {
              mdxContent += `*${imageBlock.caption}*\n\n`;
            }
          }
          break;
        }

        case "divider": {
          mdxContent += "---\n\n";
          break;
        }

        default:
          // Skip unsupported block types with a comment
          mdxContent += `<!-- Unsupported block type: ${block.type} -->\n\n`;
          break;
      }
    });

    // Combine frontmatter and content
    return yamlFrontmatter + mdxContent.trim();
  }

  /**
   * Export MDX and download as file
   */
  static downloadMDX(blocks: ContentBlock[], compositionName: string): void {
    const mdxContent = this.exportToMDX(blocks, compositionName);

    // Create download
    const blob = new Blob([mdxContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${compositionName || "article"}.mdx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Escape YAML string values properly
   */
  private static escapeYAMLString(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }

  /**
   * Validate blocks before export
   */
  static validateBlocksForExport(blocks: ContentBlock[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!blocks || blocks.length === 0) {
      errors.push("No content blocks to export");
    }

    // Check for missing required data
    blocks.forEach((block, index) => {
      if (!block.id) {
        errors.push(`Block ${index + 1} is missing an ID`);
      }

      if (!block.type) {
        errors.push(`Block ${index + 1} is missing a type`);
      }

      if (block.type === "image") {
        const imageBlock = block as any;
        if (!imageBlock.imageUrl) {
          errors.push(`Image block ${index + 1} is missing an image URL`);
        }
      }

      if (block.type === "text") {
        const textBlock = block as any;
        if (!textBlock.content || textBlock.content.trim() === "") {
          errors.push(`Text block ${index + 1} is empty`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
