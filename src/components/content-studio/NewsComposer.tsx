"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileText,
  Plus,
  Image as ImageIcon,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
// Select removed in favor of searchable combobox
import { useGalleries } from "@/hooks/use-galleries";

import {
  BaseComposer,
  BaseComposerProps,
  PreviewRenderProps,
  ExportButtonsProps,
  SpecializedControlsProps,
} from "./BaseComposer";
import { SelectedCopy, LoadedComposition } from "./types";
import { RendererFactory } from "./renderers/RendererFactory";
import { useContentExport } from "@/hooks/useContentExport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandList,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Command as CommandPrimitive } from "cmdk";

// Remove the composer type and render props from the base props
interface NewsComposerProps
  extends Omit<
    BaseComposerProps,
    | "composerType"
    | "renderPreview"
    | "renderExportButtons"
    | "renderSpecializedControls"
    | "onLoadCopy"
    | "onLoadComposition"
    | "onCompositionSaved"
  > {
  // Load functionality
  onLoadCopy?: (copies: SelectedCopy[]) => void;
  onLoadComposition?: (composition: LoadedComposition) => void;
  onCreateNewWithCopy?: (copies: SelectedCopy[]) => void;
  onCompositionSaved?: (composition: LoadedComposition) => void;
  onCreateNew?: () => void;
  // Composer switch
  onSwitchComposer?: (mode: "email" | "news") => void;
  currentComposer?: "email" | "news";
}

/**
 * NewsComposer - Specialized composer for news article content
 *
 * This component extends BaseComposer with news-specific functionality:
 * - News article preview mode with frontmatter display
 * - MDX export with frontmatter preservation
 * - Frontmatter block management and editing
 * - Article structure tools (title, subtitle, meta info)
 * - CSS editor support for article styling
 */
export function NewsComposer(props: NewsComposerProps) {
  const { toast } = useToast();

  // Gallery selection state
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>("none");
  // Carousel selection state
  const [selectedCarouselId, setSelectedCarouselId] = useState<string>("none");
  // Combobox open/search state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [gallerySearch, setGallerySearch] = useState("");
  const [carouselSearch, setCarouselSearch] = useState("");

  // Fetch available galleries
  const { data: galleriesData } = useGalleries({ limit: 100 });
  const galleries = galleriesData?.galleries || [];

  // Export functionality
  const { exportToMDX } = useContentExport();

  // Initialize selection state from loaded composition metadata
  useEffect(() => {
    const meta = props.loadedComposition?.metadata;
    if (meta) {
      // Normalize possible formats: strings, ObjectIds, or single value fallbacks
      const rawGalleryIds = (meta.galleryIds || meta.selectedGalleryId || []) as any;
      const rawCarouselIds = (meta.carouselIds || meta.selectedCarouselId || []) as any;

      const galleryArray: string[] = Array.isArray(rawGalleryIds)
        ? rawGalleryIds.map((v: any) => (v ? String((v as any)._id || v) : "")).filter(Boolean)
        : rawGalleryIds
        ? [String((rawGalleryIds as any)._id || rawGalleryIds)]
        : [];

      const carouselArray: string[] = Array.isArray(rawCarouselIds)
        ? rawCarouselIds.map((v: any) => (v ? String((v as any)._id || v) : "")).filter(Boolean)
        : rawCarouselIds
        ? [String((rawCarouselIds as any)._id || rawCarouselIds)]
        : [];

      setSelectedGalleryId(galleryArray[0] || "none");
      setSelectedCarouselId(carouselArray[0] || "none");
    } else {
      setSelectedGalleryId("none");
      setSelectedCarouselId("none");
    }
  }, [props.loadedComposition?._id, props.loadedComposition?.metadata?.galleryIds, props.loadedComposition?.metadata?.carouselIds]);

  const galleryOptions = useMemo(() => {
    const q = gallerySearch.trim().toLowerCase();
    return q
      ? galleries.filter((g: any) => g.name?.toLowerCase().includes(q))
      : galleries;
  }, [galleries, gallerySearch]);

  const carouselOptions = useMemo(() => {
    const q = carouselSearch.trim().toLowerCase();
    return q
      ? galleries.filter((g: any) => g.name?.toLowerCase().includes(q))
      : galleries;
  }, [galleries, carouselSearch]);

  const selectedGalleryLabel = useMemo(() => {
    if (!selectedGalleryId || selectedGalleryId === "none") return "No Gallery";
    return (
      galleries.find((g: any) => g._id === selectedGalleryId)?.name ||
      "Select gallery..."
    );
  }, [galleries, selectedGalleryId]);

  const selectedCarouselLabel = useMemo(() => {
    if (!selectedCarouselId || selectedCarouselId === "none") return "No Carousel";
    return (
      galleries.find((g: any) => g._id === selectedCarouselId)?.name ||
      "Select carousel..."
    );
  }, [galleries, selectedCarouselId]);

  // News preview modes
  const supportedPreviewModes = [
    { value: "clean", label: "Clean" },
    { value: "news-article", label: "News Article" },
  ];

  // News preview renderer
  const renderPreview = useCallback((previewProps: PreviewRenderProps) => {
    return (
      <RendererFactory
        mode={previewProps.previewMode as any}
        blocks={previewProps.blocks}
        compositionName={previewProps.compositionName}
        frontmatter={previewProps.frontmatter}
        selectedStylesheetId={previewProps.selectedStylesheetId}
        stylesheetData={previewProps.stylesheetData}
      />
    );
  }, []);

  // News export buttons
  const renderExportButtons = useCallback(
    (exportProps: ExportButtonsProps) => {
      const handleExportMDX = () => {
        const galleryIds =
          selectedGalleryId && selectedGalleryId !== "none"
            ? [selectedGalleryId]
            : [];
        const carouselIds =
          selectedCarouselId && selectedCarouselId !== "none"
            ? [selectedCarouselId]
            : [];
        exportToMDX(
          exportProps.blocks,
          exportProps.compositionName,
          galleryIds,
          carouselIds
        );
      };

      return (
        <div className="flex items-center gap-2">
          {/* Gallery Selection (searchable combobox) */}
          <Popover
            open={galleryOpen}
            onOpenChange={(open) => {
              setGalleryOpen(open);
              if (open) setCarouselOpen(false);
              if (!open) setGallerySearch("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={galleryOpen}
                className="w-[260px] justify-between bg-background border-border/40"
                type="button"
              >
                <span className="truncate text-left">{selectedGalleryLabel}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search galleries..."
                  value={gallerySearch}
                  onValueChange={setGallerySearch}
                  autoFocus
                />
                <CommandEmpty>No galleries found.</CommandEmpty>
                <CommandList>
                  <CommandGroup className="max-h-64 overflow-auto">
                  <CommandPrimitive.Item
                    value="none"
                    onSelect={() => {
                      setSelectedGalleryId("none");
                      setGalleryOpen(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGalleryId("none");
                      setGalleryOpen(false);
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedGalleryId === "none" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    No Gallery
                  </CommandPrimitive.Item>
                  {galleryOptions.map((gallery: any) => (
                    <CommandPrimitive.Item
                      key={gallery._id}
                      value={gallery.name}
                      onSelect={() => {
                        setSelectedGalleryId(gallery._id);
                        setGalleryOpen(false);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGalleryId(gallery._id);
                        setGalleryOpen(false);
                      }}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedGalleryId === gallery._id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate">{gallery.name}</span>
                    </CommandPrimitive.Item>
                  ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Carousel Selection (searchable combobox) */}
          <Popover
            open={carouselOpen}
            onOpenChange={(open) => {
              setCarouselOpen(open);
              if (open) setGalleryOpen(false);
              if (!open) setCarouselSearch("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={carouselOpen}
                className="w-[260px] justify-between bg-background border-border/40"
                type="button"
              >
                <span className="truncate text-left">{selectedCarouselLabel}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search carousels..."
                  value={carouselSearch}
                  onValueChange={setCarouselSearch}
                  autoFocus
                />
                <CommandEmpty>No carousels found.</CommandEmpty>
                <CommandList>
                  <CommandGroup className="max-h-64 overflow-auto">
                  <CommandPrimitive.Item
                    value="none"
                    onSelect={() => {
                      setSelectedCarouselId("none");
                      setCarouselOpen(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCarouselId("none");
                      setCarouselOpen(false);
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCarouselId === "none"
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    No Carousel
                  </CommandPrimitive.Item>
                  {carouselOptions.map((gallery: any) => (
                    <CommandPrimitive.Item
                      key={gallery._id}
                      value={gallery.name}
                      onSelect={() => {
                        setSelectedCarouselId(gallery._id);
                        setCarouselOpen(false);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCarouselId(gallery._id);
                        setCarouselOpen(false);
                      }}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCarouselId === gallery._id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate">{gallery.name}</span>
                    </CommandPrimitive.Item>
                  ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Export MDX Button */}
          <Button
            onClick={handleExportMDX}
            variant="outline"
            className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export MDX
          </Button>
        </div>
      );
    },
    [
      exportToMDX,
      selectedGalleryId,
      selectedCarouselId,
      galleries,
      // Include combobox state to avoid stale closures
      galleryOpen,
      carouselOpen,
      gallerySearch,
      carouselSearch,
      selectedGalleryLabel,
      selectedCarouselLabel,
      galleryOptions,
      carouselOptions,
    ]
  );

  // News-specific controls
  const renderSpecializedControls = useCallback(
    (controlsProps: SpecializedControlsProps) => {
      return (
        <>
          {/* News Article Tools - Show only in news-article preview mode */}
          {controlsProps.previewMode === "news-article" && (
            <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50/30">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                News Article Tools
              </h4>
              <div className="flex gap-2 items-start">
                <Button
                  onClick={() => {
                    // Add frontmatter blocks functionality
                    // This would be handled by the frontmatter operations hook
                    toast({
                      title: "Article Structure",
                      description: "Adding article structure blocks...",
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-background border-border/40 hover:bg-muted/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Article Structure
                </Button>
                <div className="text-xs text-blue-700 flex items-center max-w-md">
                  Adds editable title, subtitle, meta info, and content sections
                  to your article. Each section becomes an editable block.
                </div>
              </div>
            </div>
          )}

          {/* Frontmatter Preview - Show current frontmatter data */}
          {controlsProps.frontmatter &&
            Object.keys(controlsProps.frontmatter).length > 0 && (
              <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50/30">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Article Frontmatter
                </h4>
                <div className="text-xs text-gray-700 space-y-1">
                  {Object.entries(controlsProps.frontmatter).map(
                    ([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium">{key}:</span>
                        <span className="text-gray-600">
                          {typeof value === "string"
                            ? value
                            : JSON.stringify(value)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </>
      );
    },
    [toast]
  );

  // Toolbar extras (composer switcher on the right)
  const toolbarExtras = (
    <>
      {props.onSwitchComposer && (
        <div className="order-10">
        <Select
          value={props.currentComposer || "news"}
          onValueChange={(v: "email" | "news") => props.onSwitchComposer?.(v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select composer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email Composer</SelectItem>
            <SelectItem value="news">News Composer</SelectItem>
          </SelectContent>
        </Select>
        </div>
      )}
    </>
  );

  return (
    <BaseComposer
      {...props}
      composerType="news"
      // Persist selected gallery/carousel with compositions
      selectedGalleryIds={
        selectedGalleryId && selectedGalleryId !== "none"
          ? [selectedGalleryId]
          : []
      }
      selectedCarouselIds={
        selectedCarouselId && selectedCarouselId !== "none"
          ? [selectedCarouselId]
          : []
      }
      renderPreview={renderPreview}
      renderExportButtons={renderExportButtons}
      renderSpecializedControls={renderSpecializedControls}
      toolbarExtras={toolbarExtras}
      onLoadCopy={props.onLoadCopy}
      onLoadComposition={props.onLoadComposition}
      onCreateNewWithCopy={props.onCreateNewWithCopy}
      onCreateNew={props.onCreateNew}
      onCompositionSaved={props.onCompositionSaved}
      defaultPreviewMode="clean"
      supportedPreviewModes={supportedPreviewModes}
      supportsCSSEditor={true}
      supportsEmailContainer={false}
      supportsFrontmatter={true}
      showHeaderInfoBadges={false}
      hideHeaderToggle={true}
    />
  );
}
