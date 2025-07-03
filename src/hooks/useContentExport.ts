import { useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ContentBlock } from "@/components/content-studio/types";
import { ContentExporter } from "@/lib/content-export";

/**
 * Custom hook for handling content export operations in BlockComposer
 * Extracted from BlockComposer.tsx to reduce file size and improve maintainability
 */
export function useContentExport() {
  const { toast } = useToast();

  // Export to HTML and download
  const exportToHTML = useCallback(
    async (
      blocks: ContentBlock[],
      template: string | null,
      compositionName: string,
      format: "web" | "email" = "web",
      projectId?: string,
      carId?: string
    ) => {
      try {
        // Validate blocks before export
        const validation = ContentExporter.validateBlocksForExport(blocks);
        if (!validation.isValid) {
          toast({
            title: "Export Validation Failed",
            description: `Issues found: ${validation.errors.join(", ")}`,
            variant: "destructive",
          });
          return;
        }

        await ContentExporter.downloadHTML(
          blocks,
          template,
          compositionName,
          format,
          projectId,
          carId
        );

        toast({
          title: `${format === "email" ? "Email" : "Web"} HTML Exported`,
          description: `Your composition has been exported as ${
            format === "email" ? "Mailchimp-compatible email" : "web"
          } HTML.`,
        });
      } catch (error) {
        console.error("Failed to export HTML:", error);
        toast({
          title: "Export Failed",
          description: `Failed to export your composition as ${format} HTML.`,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Copy HTML to clipboard
  const copyHTMLToClipboard = useCallback(
    async (
      blocks: ContentBlock[],
      template: string | null,
      compositionName: string,
      format: "web" | "email" = "web",
      projectId?: string,
      carId?: string
    ) => {
      try {
        // Validate blocks before export
        const validation = ContentExporter.validateBlocksForExport(blocks);
        if (!validation.isValid) {
          toast({
            title: "Copy Validation Failed",
            description: `Issues found: ${validation.errors.join(", ")}`,
            variant: "destructive",
          });
          return;
        }

        await ContentExporter.copyHTMLToClipboard(
          blocks,
          template,
          compositionName,
          format,
          projectId,
          carId
        );

        toast({
          title: `${format === "email" ? "Email" : "Web"} HTML Copied`,
          description: `${
            format === "email" ? "Mailchimp-compatible email" : "Web"
          } HTML has been copied to your clipboard.`,
        });
      } catch (error) {
        console.error("Failed to copy HTML:", error);
        toast({
          title: "Copy Failed",
          description: `Failed to copy ${format} HTML to clipboard.`,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Export to MDX and download
  const exportToMDX = useCallback(
    (blocks: ContentBlock[], compositionName: string) => {
      try {
        // Validate blocks before export
        const validation = ContentExporter.validateBlocksForExport(blocks);
        if (!validation.isValid) {
          toast({
            title: "MDX Export Validation Failed",
            description: `Issues found: ${validation.errors.join(", ")}`,
            variant: "destructive",
          });
          return;
        }

        ContentExporter.downloadMDX(blocks, compositionName);

        toast({
          title: "MDX Exported",
          description: "Your composition has been exported as an MDX file.",
        });
      } catch (error) {
        console.error("Failed to export MDX:", error);
        toast({
          title: "Export Failed",
          description: "Failed to export your composition as MDX.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Get MDX content as string (for preview or other uses)
  const getMDXContent = useCallback(
    (blocks: ContentBlock[], compositionName: string): string | null => {
      try {
        const validation = ContentExporter.validateBlocksForExport(blocks);
        if (!validation.isValid) {
          console.warn("Validation issues:", validation.errors);
          return null;
        }

        return ContentExporter.exportToMDX(blocks, compositionName);
      } catch (error) {
        console.error("Failed to generate MDX content:", error);
        return null;
      }
    },
    []
  );

  // Get HTML content as string (for preview or other uses)
  const getHTMLContent = useCallback(
    async (
      blocks: ContentBlock[],
      template: string | null,
      compositionName: string,
      format: "web" | "email" = "web",
      projectId?: string,
      carId?: string
    ): Promise<string | null> => {
      try {
        const validation = ContentExporter.validateBlocksForExport(blocks);
        if (!validation.isValid) {
          console.warn("Validation issues:", validation.errors);
          return null;
        }

        return await ContentExporter.exportToHTML(
          blocks,
          template,
          compositionName,
          format,
          projectId,
          carId
        );
      } catch (error) {
        console.error("Failed to generate HTML content:", error);
        return null;
      }
    },
    []
  );

  // Check if blocks have email-specific features
  const hasEmailFeatures = useCallback((blocks: ContentBlock[]): boolean => {
    return blocks.some((block) => {
      if (block.type === "image") {
        const imageBlock = block as any;
        return imageBlock.email?.isFullWidth;
      }
      return false;
    });
  }, []);

  return {
    exportToHTML,
    copyHTMLToClipboard,
    exportToMDX,
    getMDXContent,
    getHTMLContent,
    hasEmailFeatures,
  };
}
