import { useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ContentBlock } from "@/components/content-studio/types";
import { ContentExporter, ExportOptions } from "@/lib/content-export";

/**
 * Custom hook for handling content export operations in BlockComposer
 * Updated to support the new export modal system with platform-specific options
 */
export function useContentExport() {
  const { toast } = useToast();

  // Export using the new options interface
  const exportWithOptions = useCallback(
    async (
      blocks: ContentBlock[],
      template: string | null,
      compositionName: string,
      options: ExportOptions,
      projectId?: string,
      carId?: string,
      selectedStylesheetId?: string | null
    ) => {
      try {
        await ContentExporter.exportWithOptions(
          blocks,
          template,
          compositionName,
          options,
          projectId,
          carId,
          selectedStylesheetId
        );

        // Show success toast
        const platformText = options.emailPlatform
          ? ` (${options.emailPlatform.charAt(0).toUpperCase() + options.emailPlatform.slice(1)})`
          : "";

        // For copy operations, we need to provide appropriate feedback
        // since clipboard operations might fall back to download
        if (options.action === "copy") {
          toast({
            title: "Content Exported",
            description: `${options.format.charAt(0).toUpperCase() + options.format.slice(1)} content copied to clipboard or downloaded${platformText}`,
          });
        } else {
          toast({
            title: "Export Successful",
            description: `${options.format.charAt(0).toUpperCase() + options.format.slice(1)} content downloaded${platformText}`,
          });
        }
      } catch (error) {
        console.error("Export failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred while exporting. Please try again.";
        toast({
          title: "Export Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Legacy export functions for backward compatibility
  const exportToHTML = useCallback(
    async (
      blocks: ContentBlock[],
      template: string | null,
      compositionName: string,
      format: "web" | "email" = "web",
      projectId?: string,
      carId?: string,
      selectedStylesheetId?: string | null
    ) => {
      try {
        const html = await ContentExporter.exportToHTML(
          blocks,
          template,
          compositionName,
          format,
          projectId,
          carId,
          selectedStylesheetId
        );

        ContentExporter.downloadHTMLFile(html, `${compositionName}-${format}`);

        toast({
          title: "Export Complete",
          description: `${format.charAt(0).toUpperCase() + format.slice(1)} HTML file downloaded successfully.`,
        });
      } catch (error) {
        console.error("Export failed:", error);
        toast({
          title: "Export Failed",
          description: "An error occurred while exporting. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const copyHTMLToClipboard = useCallback(
    async (
      blocks: ContentBlock[],
      template: string | null,
      compositionName: string,
      format: "web" | "email" = "web",
      projectId?: string,
      carId?: string,
      selectedStylesheetId?: string | null
    ) => {
      try {
        const html = await ContentExporter.exportToHTML(
          blocks,
          template,
          compositionName,
          format,
          projectId,
          carId,
          selectedStylesheetId
        );

        await ContentExporter.copyToClipboard(html);

        toast({
          title: "Content Exported",
          description: `${format.charAt(0).toUpperCase() + format.slice(1)} HTML copied to clipboard or downloaded.`,
        });
      } catch (error) {
        console.error("Copy failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred while copying. Please try again.";
        toast({
          title: "Copy Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const exportToMDX = useCallback(
    async (
      blocks: ContentBlock[],
      compositionName: string,
      galleryIds?: string[],
      carouselIds?: string[]
    ) => {
      try {
        await ContentExporter.exportToMDX(
          blocks,
          compositionName,
          galleryIds,
          carouselIds
        );
        toast({
          title: "MDX Export Complete",
          description: "MDX file downloaded successfully.",
        });
      } catch (error) {
        console.error("MDX export failed:", error);
        toast({
          title: "MDX Export Failed",
          description:
            "An error occurred while exporting MDX. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const hasEmailFeatures = useCallback((blocks: ContentBlock[]): boolean => {
    return ContentExporter.hasEmailFeatures(blocks);
  }, []);

  return {
    exportWithOptions,
    exportToHTML,
    copyHTMLToClipboard,
    exportToMDX,
    hasEmailFeatures,
  };
}
