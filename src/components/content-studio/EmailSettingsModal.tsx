"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Code, Palette, Info } from "lucide-react";

// Simplified email container configuration (without header/footer)
export interface EmailContainerConfig {
  // Layout
  maxWidth: string;
  backgroundColor: string;
  padding: string;
  borderRadius: string;

  // Content area
  contentBackgroundColor: string;
  contentPadding: string;
  textColor: string;
  linkColor: string;

  // Platform-specific
  platform: "sendgrid" | "mailchimp" | "generic";

  // Mobile responsiveness
  mobileMaxWidth: string;
  mobilePadding: string;

  // Global block spacing applied across all blocks (td bottom padding)
  blockSpacing?: string;
}

// Default email container configuration (simplified)
export const defaultEmailContainerConfig: EmailContainerConfig = {
  // Layout
  maxWidth: "600px",
  backgroundColor: "#f4f4f4",
  padding: "20px",
  borderRadius: "8px",

  // Content area
  contentBackgroundColor: "#ffffff",
  contentPadding: "30px",
  textColor: "#333333",
  linkColor: "#0066cc",

  // Platform-specific
  platform: "generic",

  // Mobile responsiveness
  mobileMaxWidth: "100%",
  mobilePadding: "15px",

  // Global spacing default
  blockSpacing: "12px",
};

interface EmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EmailContainerConfig;
  onConfigChange: (config: EmailContainerConfig) => void;
}

/**
 * EmailSettingsModal - Modal for configuring email container settings
 *
 * Simplified version that focuses on essential email styling options
 * without header/footer features or save functionality.
 */
export function EmailSettingsModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
}: EmailSettingsModalProps) {
  const updateConfig = (updates: Partial<EmailContainerConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const resetToDefaults = () => {
    onConfigChange(defaultEmailContainerConfig);
  };

  const getPlatformInfo = (platform: string) => {
    switch (platform) {
      case "sendgrid":
        return {
          name: "SendGrid",
          description: "Optimized for SendGrid with div-based layout",
          icon: "📧",
        };
      case "mailchimp":
        return {
          name: "Mailchimp",
          description: "Table-based layout for maximum compatibility",
          icon: "📬",
        };
      default:
        return {
          name: "Generic",
          description: "Standard HTML email format",
          icon: "📨",
        };
    }
  };

  const platformInfo = getPlatformInfo(config.platform);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Email Container Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Code className="h-4 w-4" />
              Email Platform
            </Label>
            <Select
              value={config.platform}
              onValueChange={(value) =>
                updateConfig({
                  platform: value as EmailContainerConfig["platform"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">
                  <div className="flex items-center gap-2">
                    <span>📨</span>
                    <div>
                      <div className="font-medium">Generic</div>
                      <div className="text-xs text-muted-foreground">
                        Standard HTML email
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="sendgrid">
                  <div className="flex items-center gap-2">
                    <span>📧</span>
                    <div>
                      <div className="font-medium">SendGrid</div>
                      <div className="text-xs text-muted-foreground">
                        Optimized for SendGrid
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="mailchimp">
                  <div className="flex items-center gap-2">
                    <span>📬</span>
                    <div>
                      <div className="font-medium">Mailchimp</div>
                      <div className="text-xs text-muted-foreground">
                        Table-based layout
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>{platformInfo.description}</span>
            </div>
          </div>

          {/* Layout Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Layout & Styling
            </Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Max Width</Label>
                <Input
                  value={config.maxWidth}
                  onChange={(e) => updateConfig({ maxWidth: e.target.value })}
                  placeholder="600px"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Background Color</Label>
                <Input
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) =>
                    updateConfig({ backgroundColor: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Padding</Label>
                <Input
                  value={config.padding}
                  onChange={(e) => updateConfig({ padding: e.target.value })}
                  placeholder="20px"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Border Radius</Label>
                <Input
                  value={config.borderRadius}
                  onChange={(e) =>
                    updateConfig({ borderRadius: e.target.value })
                  }
                  placeholder="8px"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Block Spacing (all blocks)</Label>
              <Input
                value={config.blockSpacing || ""}
                onChange={(e) =>
                  updateConfig({ blockSpacing: e.target.value || "" })
                }
                placeholder="12px"
              />
            </div>
          </div>

          {/* Content Area Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Content Area</Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Content Background</Label>
                <Input
                  type="color"
                  value={config.contentBackgroundColor}
                  onChange={(e) =>
                    updateConfig({ contentBackgroundColor: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Content Padding</Label>
                <Input
                  value={config.contentPadding}
                  onChange={(e) =>
                    updateConfig({ contentPadding: e.target.value })
                  }
                  placeholder="30px"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <Input
                  type="color"
                  value={config.textColor}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Link Color</Label>
                <Input
                  type="color"
                  value={config.linkColor}
                  onChange={(e) => updateConfig({ linkColor: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Mobile Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Mobile Responsiveness</Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Mobile Max Width</Label>
                <Input
                  value={config.mobileMaxWidth}
                  onChange={(e) =>
                    updateConfig({ mobileMaxWidth: e.target.value })
                  }
                  placeholder="100%"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Mobile Padding</Label>
                <Input
                  value={config.mobilePadding}
                  onChange={(e) =>
                    updateConfig({ mobilePadding: e.target.value })
                  }
                  placeholder="15px"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="text-sm"
            >
              Reset to Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {platformInfo.icon} {platformInfo.name}
              </Badge>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
