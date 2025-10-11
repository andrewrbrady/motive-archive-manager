"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Copy,
  Mail,
  Globe,
  Palette,
  Settings,
  Info,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ContentBlock } from "./types";
import type { ExportOptions } from "@/lib/content-export";

export type ExportFormat = "web" | "email";
export type EmailPlatform = "mailchimp" | "sendgrid" | "generic";
export type ExportAction = "download" | "copy";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ContentBlock[];
  compositionName: string;
  selectedStylesheetId: string | null;
  template?: string | null;
  projectId?: string;
  carId?: string;
  onExport: (options: ExportOptions) => Promise<void>;
  hasEmailFeatures: boolean;
  minimalHtml: boolean;
  onMinimalHtmlChange: (value: boolean) => void;
}

const EMAIL_PLATFORMS = {
  mailchimp: {
    name: "Mailchimp",
    description: "Optimized for Mailchimp campaigns with table-based layout",
    features: ["Merge tags", "Custom HTML", "Responsive design"],
    limitations: ["Limited CSS support", "Table-based layout required"],
  },
  sendgrid: {
    name: "SendGrid",
    description:
      "Ultra-basic HTML optimized for SendGrid's strict design editor",
    features: [
      "Design editor compatible",
      "Table-based structure",
      "Minimal CSS only",
    ],
    limitations: [
      "Extremely strict HTML validation",
      "Very limited CSS support",
      "No div layouts or custom fonts",
      "Basic formatting only",
    ],
  },
  generic: {
    name: "Generic Email",
    description: "Universal email HTML compatible with most platforms",
    features: ["Wide compatibility", "Standard HTML", "Basic styling"],
    limitations: ["Minimal features", "Basic styling only"],
  },
};

export function ExportModal({
  isOpen,
  onClose,
  blocks,
  compositionName,
  selectedStylesheetId,
  template,
  projectId,
  carId,
  onExport,
  hasEmailFeatures,
  minimalHtml,
  onMinimalHtmlChange,
}: ExportModalProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>("email");
  const [emailPlatform, setEmailPlatform] =
    useState<EmailPlatform>("mailchimp");
  const [action, setAction] = useState<ExportAction>("copy");
  const [includeCSS, setIncludeCSS] = useState(!!selectedStylesheetId);
  const [fileName, setFileName] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormat(minimalHtml ? "web" : "email");
      setEmailPlatform("sendgrid"); // Default to SendGrid for user's needs
      setAction("copy");
      setIncludeCSS(!!selectedStylesheetId && !minimalHtml); // Allow CSS if stylesheet is available and minimal HTML is not forced
      setFileName("");
    }
  }, [isOpen, selectedStylesheetId, minimalHtml]);

  React.useEffect(() => {
    if (minimalHtml && includeCSS) {
      setIncludeCSS(false);
    }
  }, [minimalHtml, includeCSS]);

  // Note: Removed auto-disable CSS for SendGrid - let users choose

  const handleFormatChange = (value: ExportFormat) => {
    setFormat(value);
    if (value !== "web" && minimalHtml) {
      onMinimalHtmlChange(false);
    }
    if (value === "email") {
      setIncludeCSS(!!selectedStylesheetId);
    } else if (!minimalHtml) {
      setIncludeCSS(!!selectedStylesheetId);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const shouldUseMinimalHtml = format === "web" ? minimalHtml : false;
      const shouldIncludeCSS =
        includeCSS && !!selectedStylesheetId && !shouldUseMinimalHtml;

      const exportOptions: ExportOptions = {
        format,
        emailPlatform: format === "email" ? emailPlatform : undefined,
        action,
        includeCSS: shouldIncludeCSS,
        minimalHtml: shouldUseMinimalHtml,
        fileName:
          action === "download" ? fileName || compositionName : undefined,
      };

      await onExport(exportOptions);
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const platformInfo =
    format === "email" ? EMAIL_PLATFORMS[emailPlatform] : null;
  const cssOptionsDisabled = minimalHtml && format === "web";
  const cssIncluded =
    includeCSS && !!selectedStylesheetId && !cssOptionsDisabled;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Content
          </DialogTitle>
          <DialogDescription>
            Choose your export format and platform-specific optimizations
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExport();
          }}
        >
          <div className="space-y-6">
            {/* Export Format */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Export Format
              </Label>
              <Select
                value={format}
                onValueChange={(value: ExportFormat) => handleFormatChange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Web HTML
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email HTML
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimal HTML option for web exports */}
            {format === "web" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  HTML Output
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="minimal-html"
                    checked={minimalHtml}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        if (format !== "web") {
                          setFormat("web");
                        }
                        onMinimalHtmlChange(true);
                      } else {
                        onMinimalHtmlChange(false);
                      }
                    }}
                  />
                  <Label
                    htmlFor="minimal-html"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Generate minimal HTML (no classes)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Produces simplified markup using only basic tags. Images retain their alt text.
                </p>
              </div>
            )}

            {/* Email Platform Selection (only for email format) */}
            {format === "email" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Platform
                </Label>
                <Select
                  value={emailPlatform}
                  onValueChange={(value: EmailPlatform) =>
                    setEmailPlatform(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mailchimp">Mailchimp</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="generic">Generic Email</SelectItem>
                  </SelectContent>
                </Select>

                {/* Platform Information */}
                {platformInfo && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {platformInfo.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {platformInfo.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">
                          Features:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {platformInfo.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-orange-700 mb-1">
                          Limitations:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {platformInfo.limitations.map((limitation, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <Info className="h-3 w-3 text-orange-500" />
                              {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* SendGrid specific warning */}
                    {emailPlatform === "sendgrid" && (
                      <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 mt-0.5 text-orange-600" />
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                              SendGrid Compatibility Note
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-300">
                              SendGrid's design editor is very strict. If you
                              get "Your design could not be saved" errors, try:
                            </p>
                            <ul className="text-xs text-orange-700 dark:text-orange-300 ml-4 list-disc space-y-0.5">
                              <li>Disabling custom CSS (most common fix)</li>
                              <li>Using basic content blocks only</li>
                              <li>Simplifying layouts and styling</li>
                              <li>Testing with minimal content first</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CSS Options */}
            {selectedStylesheetId && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Styling Options
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-css"
                    checked={includeCSS}
                    onCheckedChange={(checked) => {
                      if (cssOptionsDisabled) return;
                      setIncludeCSS(checked === true);
                    }}
                    disabled={cssOptionsDisabled}
                  />
                  <Label
                    htmlFor="include-css"
                    className={`text-sm font-normal ${
                      cssOptionsDisabled ? "text-muted-foreground" : "cursor-pointer"
                    }`}
                  >
                    Include custom CSS stylesheet
                  </Label>
                  <Badge variant="secondary" className="ml-2">
                    {cssOptionsDisabled
                      ? "Unavailable"
                      : format === "email"
                      ? "Email-optimized"
                      : "Full CSS"}
                  </Badge>
                </div>
                {cssOptionsDisabled && (
                  <p className="text-xs text-muted-foreground ml-6">
                    Custom CSS is not included when minimal HTML is enabled.
                  </p>
                )}
                {emailPlatform === "sendgrid" && cssIncluded && (
                  <p className="text-xs text-orange-600 ml-6">
                    ⚠️ Warning: Custom CSS may cause "Your design could not be
                    saved" errors in SendGrid. Try without CSS first if you
                    encounter issues.
                  </p>
                )}
                {cssIncluded && emailPlatform !== "sendgrid" && (
                  <p className="text-xs text-muted-foreground ml-6">
                    {format === "email"
                      ? "CSS will be processed for email client compatibility"
                      : "Full CSS will be included for web display"}
                  </p>
                )}
              </div>
            )}

            {/* Global Block Spacing - removed; controlled from toolbar */}

            {/* Action Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Action</Label>
              <Select
                value={action}
                onValueChange={(value: ExportAction) => setAction(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copy">
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Copy to Clipboard
                    </div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download File
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Name (only for download action) */}
            {action === "download" && (
              <div className="space-y-2">
                <Label htmlFor="file-name" className="text-sm font-medium">
                  File Name
                </Label>
                <input
                  id="file-name"
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleExport();
                    }
                  }}
                  placeholder={compositionName || "composition"}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  File extension will be added automatically (.html)
                </p>
              </div>
            )}

            {/* Email Features Badge */}
            {format === "email" && hasEmailFeatures && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    Fluid-Hybrid Features Detected
                  </Badge>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  Your composition includes advanced email features like
                  full-width images that will be optimized for the selected
                  platform.
                </p>
              </div>
            )}

            {/* Summary */}
            <Separator />
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Export Summary</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• Format: {format === "web" ? "Web HTML" : "Email HTML"}</p>
                {format === "email" && (
                  <p>• Platform: {EMAIL_PLATFORMS[emailPlatform].name}</p>
                )}
                <p>
                  • Action:{" "}
                  {action === "copy" ? "Copy to Clipboard" : "Download File"}
                </p>
                {format === "web" && (
                  <p>
                    • Minimal HTML: {minimalHtml ? "Enabled" : "Disabled"}
                  </p>
                )}
                <p>• CSS: {cssIncluded ? "Included" : "Not included"}</p>
                <p>
                  • Blocks: {blocks.length} content block
                  {blocks.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  {action === "copy" ? (
                    <Copy className="h-4 w-4 mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {action === "copy" ? "Copy HTML" : "Download HTML"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
