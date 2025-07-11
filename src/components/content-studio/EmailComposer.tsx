"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
 * - Email preview modes (clean, email, sendgrid, mailchimp)
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

  // Email preview modes
  const supportedPreviewModes = [
    { value: "clean", label: "Clean" },
    { value: "email", label: "Email" },
  ];

  // Handle export with options
  const handleExportWithOptions = useCallback(
    async (options: ExportOptions) => {
      await exportWithOptions(
        props.blocks,
        props.template?.id || null,
        options.fileName || "email-composition", // Use filename from options or default
        options,
        props.selectedCopies[0]?.projectId || props.projectId,
        props.selectedCopies[0]?.carId || props.carId,
        null // selectedStylesheetId will be managed by BaseComposer
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
          emailContainerConfig={convertToOldConfig(emailContainerConfig)}
          stylesheetData={previewProps.stylesheetData}
        />
      );
    },
    [emailContainerConfig, convertToOldConfig]
  );

  // Email export buttons
  const renderExportButtons = useCallback(
    (exportProps: ExportButtonsProps) => {
      return (
        <>
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
            onExport={handleExportWithOptions}
          />
        </>
      );
    },
    [hasEmailFeatures, showExportModal, handleExportWithOptions]
  );

  // Email-specific controls
  const renderSpecializedControls = useCallback(
    (controlsProps: SpecializedControlsProps) => {
      return (
        <>
          {/* Email Settings Button - Show only in email preview mode */}
          {controlsProps.previewMode === "email" && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowEmailSettingsModal(true)}
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Email Settings
              </Button>
            </div>
          )}
        </>
      );
    },
    []
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
        defaultPreviewMode="clean"
        supportedPreviewModes={supportedPreviewModes}
        supportsCSSEditor={true}
        supportsEmailContainer={true}
        supportsFrontmatter={false}
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
