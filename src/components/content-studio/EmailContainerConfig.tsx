"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Info, Settings, Eye, Code, Palette } from "lucide-react";

// Email container configuration interface
export interface EmailContainerConfig {
  // Layout
  maxWidth: string;
  backgroundColor: string;
  backgroundImage?: string;
  padding: string;
  borderRadius: string;
  boxShadow: string;

  // Header
  headerEnabled: boolean;
  headerBackgroundColor: string;
  headerPadding: string;
  logoUrl: string;
  logoAlt: string;
  logoHeight: string;

  // Footer
  footerEnabled: boolean;
  footerBackgroundColor: string;
  footerPadding: string;
  footerText: string;
  copyrightText: string;

  // Content area
  contentBackgroundColor: string;
  contentPadding: string;
  textColor: string;
  linkColor: string;

  // Platform-specific
  platform: "sendgrid" | "mailchimp" | "generic";
  forceTableLayout: boolean;

  // Mobile responsiveness
  mobileMaxWidth: string;
  mobilePadding: string;

  // Advanced
  customCSS: string;
  inlineStyles: boolean;

  // Global block spacing (applied across all table elements)
  blockSpacing?: string;
}

// Default email container configuration
export const defaultEmailContainerConfig: EmailContainerConfig = {
  // Layout
  maxWidth: "600px",
  backgroundColor: "#f4f4f4",
  backgroundImage: "",
  padding: "20px",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

  // Header
  headerEnabled: true,
  headerBackgroundColor: "#ffffff",
  headerPadding: "30px 30px 20px 30px",
  logoUrl:
    "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/ca378627-6b5c-4c8c-088d-5a0bdb76ae00/public",
  logoAlt: "Motive Archive",
  logoHeight: "40px",

  // Footer
  footerEnabled: true,
  footerBackgroundColor: "#f8f9fa",
  footerPadding: "30px",
  footerText: "The Collector's Resource",
  copyrightText: "© 2024 Motive Archive. All rights reserved.",

  // Content area
  contentBackgroundColor: "#ffffff",
  contentPadding: "30px",
  textColor: "#333333",
  linkColor: "#0066cc",

  // Platform-specific
  platform: "generic",
  forceTableLayout: false,

  // Mobile responsiveness
  mobileMaxWidth: "100%",
  mobilePadding: "15px",

  // Advanced
  customCSS: "",
  inlineStyles: true,

  // Global block spacing
  blockSpacing: "12px",
};

interface EmailContainerConfigProps {
  config: EmailContainerConfig;
  onConfigChange: (config: EmailContainerConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * EmailContainerConfig - Configuration panel for email container settings
 * Allows users to customize the email container layout, styling, and behavior
 */
export const EmailContainerConfig: React.FC<EmailContainerConfigProps> = ({
  config,
  onConfigChange,
  isOpen,
  onToggle,
}) => {
  const updateConfig = (updates: Partial<EmailContainerConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const resetToDefaults = () => {
    onConfigChange(defaultEmailContainerConfig);
  };

  const platformInfo = useMemo(() => {
    switch (config.platform) {
      case "sendgrid":
        return {
          name: "SendGrid",
          description: "Optimized for SendGrid with div-based layout",
          icon: "📧",
          color: "blue",
        };
      case "mailchimp":
        return {
          name: "Mailchimp",
          description: "Table-based layout for maximum compatibility",
          icon: "📬",
          color: "orange",
        };
      default:
        return {
          name: "Generic",
          description: "Standard HTML email format",
          icon: "📨",
          color: "gray",
        };
    }
  }, [config.platform]);

  if (!isOpen) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={16} />
              <span className="font-medium">Email Container Settings</span>
              <Badge variant="secondary">{platformInfo.name}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <Eye size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings size={20} />
              Email Container Settings
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure how your email container looks and behaves
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <Eye size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Code size={14} />
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
            <Info size={12} />
            <span>{platformInfo.description}</span>
          </div>
        </div>

        <Separator />

        {/* Layout Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Palette size={14} />
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
                onChange={(e) => updateConfig({ borderRadius: e.target.value })}
                placeholder="8px"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Header Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Header Settings</Label>
            <Switch
              checked={config.headerEnabled}
              onCheckedChange={(checked) =>
                updateConfig({ headerEnabled: checked })
              }
            />
          </div>

          {config.headerEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Header Background</Label>
                  <Input
                    type="color"
                    value={config.headerBackgroundColor}
                    onChange={(e) =>
                      updateConfig({ headerBackgroundColor: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Header Padding</Label>
                  <Input
                    value={config.headerPadding}
                    onChange={(e) =>
                      updateConfig({ headerPadding: e.target.value })
                    }
                    placeholder="30px 30px 20px 30px"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Logo URL</Label>
                <Input
                  value={config.logoUrl}
                  onChange={(e) => updateConfig({ logoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Logo Alt Text</Label>
                  <Input
                    value={config.logoAlt}
                    onChange={(e) => updateConfig({ logoAlt: e.target.value })}
                    placeholder="Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Logo Height</Label>
                  <Input
                    value={config.logoHeight}
                    onChange={(e) =>
                      updateConfig({ logoHeight: e.target.value })
                    }
                    placeholder="40px"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Footer Settings</Label>
            <Switch
              checked={config.footerEnabled}
              onCheckedChange={(checked) =>
                updateConfig({ footerEnabled: checked })
              }
            />
          </div>

          {config.footerEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Footer Background</Label>
                  <Input
                    type="color"
                    value={config.footerBackgroundColor}
                    onChange={(e) =>
                      updateConfig({ footerBackgroundColor: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Footer Padding</Label>
                  <Input
                    value={config.footerPadding}
                    onChange={(e) =>
                      updateConfig({ footerPadding: e.target.value })
                    }
                    placeholder="30px"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Footer Text</Label>
                <Input
                  value={config.footerText}
                  onChange={(e) => updateConfig({ footerText: e.target.value })}
                  placeholder="The Collector's Resource"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Copyright Text</Label>
                <Input
                  value={config.copyrightText}
                  onChange={(e) =>
                    updateConfig({ copyrightText: e.target.value })
                  }
                  placeholder="© 2024 Company Name. All rights reserved."
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Content Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Content Settings</Label>

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
              <Label className="text-xs">Block Spacing (all blocks)</Label>
              <Input
                value={config.blockSpacing || ""}
                onChange={(e) =>
                  updateConfig({ blockSpacing: e.target.value || "" })
                }
                placeholder="12px"
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

        <Separator />

        {/* Advanced Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Advanced Settings</Label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Force Table Layout</Label>
                <p className="text-xs text-muted-foreground">
                  Use table-based layout for maximum compatibility
                </p>
              </div>
              <Switch
                checked={config.forceTableLayout}
                onCheckedChange={(checked) =>
                  updateConfig({ forceTableLayout: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Inline Styles</Label>
                <p className="text-xs text-muted-foreground">
                  Convert CSS classes to inline styles
                </p>
              </div>
              <Switch
                checked={config.inlineStyles}
                onCheckedChange={(checked) =>
                  updateConfig({ inlineStyles: checked })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Custom CSS</Label>
            <Textarea
              value={config.customCSS}
              onChange={(e) => updateConfig({ customCSS: e.target.value })}
              placeholder="/* Add custom CSS here */"
              rows={4}
            />
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <div className="text-xs text-muted-foreground">
            Changes apply to both preview and export
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
