"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Copy, Settings, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import {
  BaseComposer,
  BaseComposerProps,
  PreviewRenderProps,
  ExportButtonsProps,
  SpecializedControlsProps,
} from "./BaseComposer";
import { SelectedCopy, LoadedComposition } from "./types";
import { RendererFactory } from "./renderers/RendererFactory";
import { ExportModal } from "./ExportModal";
import { ExportOptions } from "@/lib/content-export";
import {
  EmailContainerConfig as NewEmailContainerConfig,
  EmailSettingsModal,
  defaultEmailContainerConfig,
} from "./EmailSettingsModal";
import { EmailContainerConfig } from "./EmailContainerConfig";
import { useContentExport } from "@/hooks/useContentExport";

// Remove the composer type and render props from the base props
interface EmailComposerProps
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
}

/**
 * EmailComposer - Specialized composer for email content
 *
 * This component extends BaseComposer with email-specific functionality:
 * - Table-based email preview (SendGrid, Mailchimp, Generic platforms)
 * - HTML export with email-specific formatting
 * - Email container configuration
 * - Email platform-specific optimizations
 * - CSS editor support for email-safe styling
 */
export function EmailComposer(props: EmailComposerProps) {
  const { toast } = useToast();

  // Email-specific state
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailContainerConfig, setEmailContainerConfig] =
    useState<NewEmailContainerConfig>(defaultEmailContainerConfig);
  const [showEmailSettingsModal, setShowEmailSettingsModal] = useState(false);
  const [selectedEmailPlatform, setSelectedEmailPlatform] = useState<
    "sendgrid" | "mailchimp" | "generic"
  >("sendgrid");

  // Export functionality
  const { exportWithOptions, hasEmailFeatures } = useContentExport();

  // Convert new config to old format for RendererFactory compatibility
  const convertToOldConfig = useCallback(
    (newConfig: NewEmailContainerConfig): EmailContainerConfig => {
      return {
        ...newConfig,
        // Add missing properties with defaults
        backgroundImage: "",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        headerEnabled: false,
        headerBackgroundColor: "#ffffff",
        headerPadding: "30px 30px 20px 30px",
        logoUrl: "",
        logoAlt: "",
        logoHeight: "40px",
        footerEnabled: false,
        footerBackgroundColor: "#f8f9fa",
        footerPadding: "30px",
        footerText: "",
        copyrightText: "",
        forceTableLayout: false,
        customCSS: "",
        inlineStyles: true,
      };
    },
    []
  );

  // Email composer only supports email preview mode (table-based layout)
  const supportedPreviewModes = [{ value: "email", label: "Email Preview" }];

  // Handle export with options
  const handleExportWithOptions = useCallback(
    async (options: ExportOptions, selectedStylesheetId?: string | null) => {
      const mergedOptions: ExportOptions = {
        ...options,
        // If not explicitly overridden in the modal, use current toolbar/preview spacing
        blockSpacing: options.blockSpacing ?? emailContainerConfig.blockSpacing,
      };

      await exportWithOptions(
        props.blocks,
        props.template?.id || null,
        options.fileName || "email-composition", // Use filename from options or default
        mergedOptions,
        props.selectedCopies[0]?.projectId || props.projectId,
        props.selectedCopies[0]?.carId || props.carId,
        selectedStylesheetId || null // Use the actual selected stylesheet ID
      );
    },
    [
      exportWithOptions,
      props.blocks,
      props.template,
      props.selectedCopies,
      props.projectId,
      props.carId,
    ]
  );

  // Email preview renderer
  const renderPreview = useCallback(
    (previewProps: PreviewRenderProps) => {
      return (
        <RendererFactory
          mode={previewProps.previewMode as any}
          blocks={previewProps.blocks}
          compositionName={previewProps.compositionName}
          frontmatter={previewProps.frontmatter}
          selectedStylesheetId={previewProps.selectedStylesheetId}
          emailContainerConfig={{
            ...convertToOldConfig(emailContainerConfig),
            platform: selectedEmailPlatform, // Pass the selected platform
          }}
          stylesheetData={previewProps.stylesheetData}
        />
      );
    },
    [emailContainerConfig, convertToOldConfig, selectedEmailPlatform]
  );

  // Email export buttons
  const renderExportButtons = useCallback(
    (exportProps: ExportButtonsProps) => {
      return (
        <>
          {/* Global Block Spacing (Toolbar, header row) */}
          <div className="flex items-center gap-2">
            <Label
              htmlFor="toolbar-block-spacing"
              className="text-sm font-medium"
            >
              Block Spacing:
            </Label>
            <Input
              id="toolbar-block-spacing"
              value={emailContainerConfig.blockSpacing || ""}
              onChange={(e) =>
                setEmailContainerConfig({
                  ...emailContainerConfig,
                  blockSpacing: e.target.value,
                })
              }
              placeholder="12px"
              className="w-24 h-8 text-sm"
            />
          </div>

          <Button
            onClick={() => setShowExportModal(true)}
            variant="outline"
            size="sm"
            className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export HTML
            {hasEmailFeatures(exportProps.blocks) && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                Email
              </span>
            )}
          </Button>

          {/* Export Modal */}
          <ExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            blocks={exportProps.blocks}
            compositionName={exportProps.compositionName}
            selectedStylesheetId={exportProps.selectedStylesheetId}
            template={exportProps.template}
            projectId={exportProps.effectiveProjectId}
            carId={exportProps.effectiveCarId}
            hasEmailFeatures={hasEmailFeatures(exportProps.blocks)}
            onExport={(options) =>
              handleExportWithOptions(options, exportProps.selectedStylesheetId)
            }
          />
        </>
      );
    },
    [
      hasEmailFeatures,
      showExportModal,
      handleExportWithOptions,
      emailContainerConfig,
    ]
  );

  // Email-specific controls
  const renderSpecializedControls = useCallback(
    (controlsProps: SpecializedControlsProps) => {
      return (
        <>
          {/* Email Platform Selector */}
          <div className="flex items-center gap-2">
            <Label htmlFor="email-platform" className="text-sm font-medium">
              Platform:
            </Label>
            <Select
              value={selectedEmailPlatform}
              onValueChange={(value: "sendgrid" | "mailchimp" | "generic") =>
                setSelectedEmailPlatform(value)
              }
            >
              <SelectTrigger id="email-platform" className="w-40">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sendgrid">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    SendGrid
                  </div>
                </SelectItem>
                <SelectItem value="mailchimp">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Mailchimp
                  </div>
                </SelectItem>
                <SelectItem value="generic">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Generic
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Settings Button - Always show since we only have email preview mode */}
          <Button
            onClick={() => setShowEmailSettingsModal(true)}
            variant="outline"
            size="sm"
            className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Email Settings
          </Button>
        </>
      );
    },
    [selectedEmailPlatform]
  );

  return (
    <>
      <BaseComposer
        {...props}
        composerType="email"
        renderPreview={renderPreview}
        renderExportButtons={renderExportButtons}
        renderSpecializedControls={renderSpecializedControls}
        onLoadCopy={props.onLoadCopy}
        onLoadComposition={props.onLoadComposition}
        onCreateNewWithCopy={props.onCreateNewWithCopy}
        onCompositionSaved={props.onCompositionSaved}
        defaultPreviewMode="email"
        supportedPreviewModes={supportedPreviewModes}
        supportsCSSEditor={true}
        supportsEmailContainer={true}
        supportsFrontmatter={false}
        emailPlatform={selectedEmailPlatform}
      />

      {/* Email Settings Modal */}
      <EmailSettingsModal
        isOpen={showEmailSettingsModal}
        onClose={() => setShowEmailSettingsModal(false)}
        config={emailContainerConfig}
        onConfigChange={setEmailContainerConfig}
      />
    </>
  );
}
