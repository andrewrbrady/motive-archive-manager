import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Copy,
  Download,
  Star,
  StarOff,
  RefreshCw,
  Keyboard,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ExtendedImageType } from "@/types/gallery";
import { useAPI } from "@/hooks/useAPI";
import { IMAGE_ANALYSIS_CONFIG } from "@/constants/image-analysis";
import { cn } from "@/lib/utils";

// Define the ImageAnalysisPrompt type since it's referenced in the code
interface ImageAnalysisPrompt {
  _id: string;
  name: string;
  prompt: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

// URL transformation function - copied from ImageThumbnails.tsx lines 84-110
const getEnhancedImageUrl = (
  baseUrl: string,
  width?: string,
  quality?: string
) => {
  let params = [];
  // Always check for truthy values and non-empty strings
  if (width && width.trim() !== "") params.push(`w=${width}`);
  if (quality && quality.trim() !== "") params.push(`q=${quality}`);

  if (params.length === 0) return baseUrl;

  // Handle different Cloudflare URL formats
  // Format: https://imagedelivery.net/account/image-id/public
  // Should become: https://imagedelivery.net/account/image-id/w=400,q=85
  if (baseUrl.includes("imagedelivery.net")) {
    // Check if URL already has transformations (contains variant like 'public')
    if (baseUrl.endsWith("/public") || baseUrl.match(/\/[a-zA-Z]+$/)) {
      // Replace the last segment (usually 'public') with our parameters
      const urlParts = baseUrl.split("/");
      urlParts[urlParts.length - 1] = params.join(",");
      const transformedUrl = urlParts.join("/");
      console.log("ImageInfoPanel URL transformation:", {
        baseUrl,
        transformedUrl,
        params,
      });
      return transformedUrl;
    } else {
      // URL doesn't have a variant, append transformations
      const transformedUrl = `${baseUrl}/${params.join(",")}`;
      console.log("ImageInfoPanel URL transformation:", {
        baseUrl,
        transformedUrl,
        params,
      });
      return transformedUrl;
    }
  }

  // Fallback for other URL formats - try to replace /public if it exists
  const transformedUrl = baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  return transformedUrl;
};

// Keyboard Shortcuts Component
function KeyboardShortcuts() {
  return (
    <div className="space-y-3 p-3 bg-muted/50 rounded-lg text-xs">
      <h4 className="text-sm font-medium">Keyboard Shortcuts</h4>
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border rounded">
              ←/→
            </kbd>
            <span>Navigate images</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border rounded">
              Shift+←/→
            </kbd>
            <span>Navigate pages</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border rounded">
              Shift+F
            </kbd>
            <span>Toggle fullscreen</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border rounded">
              Shift+I
            </kbd>
            <span>Toggle info panel</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border rounded">
              Shift+C
            </kbd>
            <span>Copy URL (twice for HQ)</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border rounded">
              Esc
            </kbd>
            <span>Close fullscreen</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ImageInfoPanelProps {
  currentImage: ExtendedImageType;
  onClose: () => void;
  onReanalyze: (imageId: string) => void;
  onSetPrimary?: (imageId: string) => void;
}

export function ImageInfoPanel({
  currentImage,
  onClose,
  onReanalyze,
  onSetPrimary,
}: ImageInfoPanelProps) {
  const { toast } = useToast();
  const api = useAPI();
  const [selectedUrlOption, setSelectedUrlOption] =
    useState<string>("Original");
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [showReanalysisOptions, setShowReanalysisOptions] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    IMAGE_ANALYSIS_CONFIG.availableModels.find((m) => m.isDefault)?.id ||
      "gpt-4o-mini"
  );
  const [availablePrompts, setAvailablePrompts] = useState<
    ImageAnalysisPrompt[]
  >([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Load available prompts when reanalysis options are shown
  useEffect(() => {
    const loadPrompts = async () => {
      if (!showReanalysisOptions || !api) return;

      console.time("ImageInfoPanel-loadPrompts");
      setIsLoadingPrompts(true);
      try {
        const data = (await api.get(
          "admin/image-analysis-prompts/active"
        )) as ImageAnalysisPrompt[];
        setAvailablePrompts(data || []);

        // Set default prompt if available
        const defaultPrompt = data?.find(
          (p: ImageAnalysisPrompt) => p.isDefault
        );
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt._id);
        }
      } catch (error) {
        console.error("Failed to load prompts:", error);
      } finally {
        setIsLoadingPrompts(false);
        console.timeEnd("ImageInfoPanel-loadPrompts");
      }
    };

    loadPrompts();
  }, [showReanalysisOptions, api]);

  // Create URL options for different transformations using proper URL transformation
  const urlOptions = [
    { label: "Original", url: currentImage.url },
    {
      label: "Small (400px)",
      url: getEnhancedImageUrl(currentImage.url, "400"),
    },
    {
      label: "Medium (800px)",
      url: getEnhancedImageUrl(currentImage.url, "800"),
    },
    {
      label: "Large (1200px)",
      url: getEnhancedImageUrl(currentImage.url, "1200"),
    },
    {
      label: "Extra Large (1600px)",
      url: getEnhancedImageUrl(currentImage.url, "1600"),
    },
    {
      label: "High Quality",
      url: getEnhancedImageUrl(currentImage.url, undefined, "100"),
    },
  ];

  const selectedOption =
    urlOptions.find((opt) => opt.label === selectedUrlOption) || urlOptions[0];

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    if (!api) {
      toast({
        title: "Error",
        description: "Authentication not ready",
        variant: "destructive",
      });
      return;
    }

    console.time("ImageInfoPanel-downloadImage");
    try {
      // For image downloads, we can use direct fetch since Cloudflare Images are publicly accessible
      // The API verification ensures user has access to view the image
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to download image: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      console.error("[ImageInfoPanel] Image download error:", error);
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    } finally {
      console.timeEnd("ImageInfoPanel-downloadImage");
    }
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      await onReanalyze(currentImage.id || currentImage._id);
      setShowReanalysisOptions(false);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleSetPrimary = async () => {
    if (!onSetPrimary) return;

    setIsSettingPrimary(true);
    try {
      await onSetPrimary(currentImage.id || currentImage._id);
      toast({
        title: "Success",
        description: "Primary image updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set primary image",
        variant: "destructive",
      });
    } finally {
      setIsSettingPrimary(false);
    }
  };

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg mb-4 animate-in slide-in-from-top-2 duration-300">
      <div className="p-4 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Image Information</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
              className={cn(
                "p-1 rounded transition-colors",
                showKeyboardShortcuts
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-muted"
              )}
              title="Show keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowReanalysisOptions(!showReanalysisOptions)}
              disabled={isReanalyzing}
              className={cn(
                "p-1 rounded transition-colors",
                isReanalyzing
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : showReanalysisOptions
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-muted"
              )}
              title="Re-analyze image metadata with enhanced validation"
            >
              <RefreshCw
                className={cn("w-4 h-4", isReanalyzing && "animate-spin")}
              />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded"
              title="Close info"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        {showKeyboardShortcuts && (
          <div className="mb-4">
            <KeyboardShortcuts />
          </div>
        )}

        {/* Reanalysis Options */}
        {showReanalysisOptions && (
          <div className="space-y-3 mb-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium">Reanalysis Options</h4>

            {/* Prompt Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Analysis Prompt</label>
              <Select
                value={selectedPromptId}
                onValueChange={setSelectedPromptId}
                disabled={isLoadingPrompts}
              >
                <SelectTrigger className="h-8">
                  <SelectValue
                    placeholder={
                      isLoadingPrompts
                        ? "Loading prompts..."
                        : "Select analysis prompt"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availablePrompts.map((prompt) => (
                    <SelectItem key={prompt._id} value={prompt._id}>
                      <div className="flex flex-col">
                        <span className="text-sm">{prompt.name}</span>
                        {prompt.description && (
                          <span className="text-xs text-muted-foreground">
                            {prompt.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium">AI Model</label>
              <Select
                value={selectedModelId}
                onValueChange={setSelectedModelId}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_ANALYSIS_CONFIG.availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span className="text-sm">{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reanalyze Button */}
            <Button
              onClick={handleReanalyze}
              disabled={isReanalyzing || isLoadingPrompts}
              size="sm"
              className="w-full"
            >
              {isReanalyzing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Reanalyze Image
                </>
              )}
            </Button>
          </div>
        )}

        <div className="space-y-3 text-sm">
          {/* Primary Image Button */}
          {onSetPrimary && (
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-medium text-muted-foreground">
                Primary Image:
              </span>
              <div className="flex items-center gap-2">
                {currentImage.metadata?.isPrimary ? (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-xs font-medium">Current Primary</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleSetPrimary}
                    disabled={isSettingPrimary}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    {isSettingPrimary ? (
                      <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Star className="w-3 h-3 mr-1" />
                    )}
                    Set as Primary
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">Filename:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {currentImage.filename}
              </span>
              <button
                onClick={() =>
                  copyToClipboard(currentImage.filename, "Filename")
                }
                className="p-1 hover:bg-muted rounded"
                title="Copy filename"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* URL Variations */}
          <div className="space-y-2">
            <span className="font-medium text-muted-foreground">URLs:</span>
            <div className="space-y-2">
              {/* Dropdown and buttons row */}
              <div className="flex items-center gap-2">
                <Select
                  value={selectedUrlOption}
                  onValueChange={setSelectedUrlOption}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {urlOptions.map(({ label }) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() =>
                    copyToClipboard(
                      selectedOption.url,
                      `${selectedOption.label} URL`
                    )
                  }
                  className="p-2 hover:bg-muted rounded flex-shrink-0"
                  title={`Copy ${selectedOption.label} URL`}
                >
                  <Copy className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    downloadImage(
                      selectedOption.url,
                      `${currentImage.filename.split(".")[0]}_${selectedOption.label.toLowerCase().replace(/\s+/g, "_")}.jpg`
                    )
                  }
                  className="p-2 hover:bg-muted rounded flex-shrink-0"
                  title={`Download ${selectedOption.label}`}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Show selected URL */}
              <div className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">
                {selectedOption.url}
              </div>
            </div>
          </div>

          {currentImage.metadata?.description && (
            <div className="pt-2 border-t border-border">
              <span className="font-medium text-muted-foreground">
                Description:
              </span>
              <p className="mt-1 text-sm">
                {currentImage.metadata.description}
              </p>
            </div>
          )}

          {/* Metadata */}
          {(currentImage.metadata?.angle ||
            currentImage.metadata?.view ||
            currentImage.metadata?.movement ||
            currentImage.metadata?.tod ||
            currentImage.metadata?.side) && (
            <div className="pt-2 border-t border-border">
              <span className="font-medium text-muted-foreground">
                Metadata:
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                {/* Image Type indicator */}
                <div className="col-span-2 mb-2">
                  <span className="text-muted-foreground">Type:</span>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      currentImage.metadata?.originalImage
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}
                  >
                    {currentImage.metadata?.originalImage
                      ? "Processed Image"
                      : "Original Image"}
                  </span>
                </div>

                {currentImage.metadata?.angle && (
                  <div>
                    <span className="text-muted-foreground">Angle:</span>
                    <span className="ml-1">{currentImage.metadata.angle}</span>
                  </div>
                )}
                {currentImage.metadata?.view && (
                  <div>
                    <span className="text-muted-foreground">View:</span>
                    <span className="ml-1">{currentImage.metadata.view}</span>
                  </div>
                )}
                {currentImage.metadata?.movement && (
                  <div>
                    <span className="text-muted-foreground">Movement:</span>
                    <span className="ml-1">
                      {currentImage.metadata.movement}
                    </span>
                  </div>
                )}
                {currentImage.metadata?.tod && (
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <span className="ml-1">{currentImage.metadata.tod}</span>
                  </div>
                )}
                {currentImage.metadata?.side && (
                  <div>
                    <span className="text-muted-foreground">Side:</span>
                    <span className="ml-1">{currentImage.metadata.side}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
