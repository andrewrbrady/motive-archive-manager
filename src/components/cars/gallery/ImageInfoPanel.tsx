import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Copy, Download, RefreshCw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ExtendedImageType, getUrlVariations } from "@/types/gallery";

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
  const [selectedUrlOption, setSelectedUrlOption] =
    useState<string>("Original");
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);

  const urlVariations = getUrlVariations(currentImage.url);
  const urlOptions = [
    { label: "Original", url: urlVariations.original },
    { label: "1500px", url: urlVariations.w1500 },
    { label: "2000px", url: urlVariations.w2000 },
    { label: "2000px Q80", url: urlVariations.w2000q80 },
    { label: "3000px", url: urlVariations.w3000 },
    { label: "3000px Q90", url: urlVariations.w3000q90 },
    { label: "Full Quality", url: urlVariations.fullQuality },
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
    try {
      const response = await fetch(url);
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
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      await onReanalyze(currentImage.id || currentImage._id);
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
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className={cn(
                "p-1 rounded transition-colors",
                isReanalyzing
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
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
