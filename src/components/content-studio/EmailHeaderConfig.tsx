"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings } from "lucide-react";

/**
 * EmailHeaderConfig - Email header configuration component
 * Phase 1 Performance: Extracted from BlockComposer.tsx for better maintainability
 * Simplified to only use Gmail-compatible single header image format
 */
interface EmailHeaderState {
  enabled: boolean;
  headerImageUrl: string;
  headerImageAlt: string;
  headerImageHeight: string;
  // Optional colored stripes above/below header image
  stripes?: {
    enabled: boolean;
    topColor?: string;
    bottomColor?: string;
    height?: string;
  };
}

interface EmailHeaderConfigProps {
  emailHeader: EmailHeaderState;
  onEmailHeaderChange: (emailHeader: EmailHeaderState) => void;
}

const EmailHeaderConfig = React.memo<EmailHeaderConfigProps>(
  function EmailHeaderConfig({ emailHeader, onEmailHeaderChange }) {
    const setEmailHeader = (
      updater: (prev: EmailHeaderState) => EmailHeaderState
    ) => {
      onEmailHeaderChange(updater(emailHeader));
    };

    return (
      <div className="space-y-4">
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <Label className="text-base font-medium">
              Email Header Settings
            </Label>
          </div>

          {/* Enable Header Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enable-header"
              checked={emailHeader.enabled}
              onChange={(e) =>
                setEmailHeader((prev) => ({
                  ...prev,
                  enabled: e.target.checked,
                }))
              }
              className="rounded border-gray-300"
            />
            <Label htmlFor="enable-header" className="text-sm">
              Add branded header image (Gmail compatible)
            </Label>
          </div>

          {/* Header Configuration - Only show when enabled */}
          {emailHeader.enabled && (
            <div className="space-y-4 p-4 bg-muted/10 rounded-lg border border-border/20">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Header Image</h4>
                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="header-image-url"
                      className="text-sm font-medium"
                    >
                      Header Image URL
                    </Label>
                    <Input
                      id="header-image-url"
                      placeholder="https://example.com/header.png"
                      value={emailHeader.headerImageUrl}
                      onChange={(e) =>
                        setEmailHeader((prev) => ({
                          ...prev,
                          headerImageUrl: e.target.value,
                        }))
                      }
                      className="bg-transparent border-border/40 focus:border-border/60"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor="header-image-alt"
                        className="text-sm font-medium"
                      >
                        Alt Text
                      </Label>
                      <Input
                        id="header-image-alt"
                        placeholder="Email Header"
                        value={emailHeader.headerImageAlt}
                        onChange={(e) =>
                          setEmailHeader((prev) => ({
                            ...prev,
                            headerImageAlt: e.target.value,
                          }))
                        }
                        className="bg-transparent border-border/40 focus:border-border/60"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="header-image-height"
                        className="text-sm font-medium"
                      >
                        Height (px)
                      </Label>
                      <Input
                        id="header-image-height"
                        placeholder="100"
                        value={emailHeader.headerImageHeight}
                        onChange={(e) =>
                          setEmailHeader((prev) => ({
                            ...prev,
                            headerImageHeight: e.target.value,
                          }))
                        }
                        className="bg-transparent border-border/40 focus:border-border/60"
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground bg-blue-50/50 p-3 rounded border border-blue-200/50">
                    💡 <strong>Recommended:</strong> 600px wide × 80-120px tall
                    <br />
                    Create a single image with your logo, colored stripes, and
                    branding for best Gmail compatibility.
                  </div>
                </div>
              </div>

              {/* Optional Colored Stripes */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center space-x-2">
                  <span>🎨</span>
                  <span>Colored Stripes (Optional)</span>
                </h4>

                {/* Enable Stripes Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable-header-stripes"
                    checked={emailHeader.stripes?.enabled || false}
                    onChange={(e) =>
                      setEmailHeader((prev) => ({
                        ...prev,
                        stripes: {
                          enabled: e.target.checked,
                          topColor: prev.stripes?.topColor || "#BC1F1F",
                          bottomColor: prev.stripes?.bottomColor || "#0E2D4E",
                          height: prev.stripes?.height || "4px",
                        },
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="enable-header-stripes" className="text-sm">
                    Add colored stripes above and below header image
                  </Label>
                </div>

                {/* Stripe Configuration - Only show when enabled */}
                {emailHeader.stripes?.enabled && (
                  <div className="space-y-3 p-3 bg-muted/10 rounded-lg border border-border/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          Top Stripe Color
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            type="color"
                            value={emailHeader.stripes?.topColor || "#BC1F1F"}
                            onChange={(e) =>
                              setEmailHeader((prev) => ({
                                ...prev,
                                stripes: {
                                  ...prev.stripes,
                                  enabled: true,
                                  topColor: e.target.value,
                                },
                              }))
                            }
                            className="w-12 h-8 p-1 bg-transparent border-border/40"
                          />
                          <Input
                            placeholder="#BC1F1F"
                            value={emailHeader.stripes?.topColor || "#BC1F1F"}
                            onChange={(e) =>
                              setEmailHeader((prev) => ({
                                ...prev,
                                stripes: {
                                  ...prev.stripes,
                                  enabled: true,
                                  topColor: e.target.value,
                                },
                              }))
                            }
                            className="bg-transparent border-border/40 focus:border-border/60 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          Bottom Stripe Color
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            type="color"
                            value={
                              emailHeader.stripes?.bottomColor || "#0E2D4E"
                            }
                            onChange={(e) =>
                              setEmailHeader((prev) => ({
                                ...prev,
                                stripes: {
                                  ...prev.stripes,
                                  enabled: true,
                                  bottomColor: e.target.value,
                                },
                              }))
                            }
                            className="w-12 h-8 p-1 bg-transparent border-border/40"
                          />
                          <Input
                            placeholder="#0E2D4E"
                            value={
                              emailHeader.stripes?.bottomColor || "#0E2D4E"
                            }
                            onChange={(e) =>
                              setEmailHeader((prev) => ({
                                ...prev,
                                stripes: {
                                  ...prev.stripes,
                                  enabled: true,
                                  bottomColor: e.target.value,
                                },
                              }))
                            }
                            className="bg-transparent border-border/40 focus:border-border/60 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">
                        Stripe Height
                      </Label>
                      <Input
                        placeholder="4px"
                        value={emailHeader.stripes?.height || "4px"}
                        onChange={(e) =>
                          setEmailHeader((prev) => ({
                            ...prev,
                            stripes: {
                              ...prev.stripes,
                              enabled: true,
                              height: e.target.value,
                            },
                          }))
                        }
                        className="bg-transparent border-border/40 focus:border-border/60 text-xs"
                      />
                      <div className="text-xs text-muted-foreground">
                        Examples: 4px, 6px, 8px
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export { EmailHeaderConfig, type EmailHeaderState };
