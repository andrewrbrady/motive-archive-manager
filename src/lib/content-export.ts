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

export interface ExportOptions {
  format: "web" | "email";
  emailPlatform?: "mailchimp" | "sendgrid" | "generic";
  action: "download" | "copy";
  includeCSS: boolean;
  fileName?: string;
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
    includeCSS: boolean = true
  ): Promise<string> {
    const metadata: ExportMetadata = {
      name: compositionName,
      exportedAt: new Date().toISOString(),
      projectId,
      carId,
      previewText: "", // Can be extracted from blocks if needed
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
      options.includeCSS
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
   * Export content to MDX format
   */
  static async exportToMDX(
    blocks: ContentBlock[],
    compositionName: string
  ): Promise<string> {
    const frontmatterBlocks = blocks.filter(
      (block) => block.type === "frontmatter"
    ) as FrontmatterBlock[];
    const contentBlocks = blocks.filter(
      (block) => block.type !== "frontmatter"
    );

    // Generate frontmatter
    let frontmatter = "";
    if (frontmatterBlocks.length > 0) {
      frontmatter = "---\n";
      frontmatterBlocks.forEach((block) => {
        // Use the data property from FrontmatterBlock
        if (block.data) {
          Object.entries(block.data).forEach(([key, value]) => {
            frontmatter += `${key}: ${JSON.stringify(value)}\n`;
          });
        }
      });
      frontmatter += "---\n\n";
    }

    // Generate content
    const content = contentBlocks
      .sort((a, b) => a.order - b.order)
      .map((block) => {
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
            return `![${imageBlock.altText || ""}](${imageBlock.imageUrl})`;
          case "divider":
            return "---";
          case "video":
            const videoBlock = block as any;
            return `[${videoBlock.title || "Video"}](${videoBlock.videoUrl})`;
          default:
            return "";
        }
      })
      .join("\n\n");

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
