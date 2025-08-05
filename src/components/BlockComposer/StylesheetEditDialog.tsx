"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api-client";
import {
  StylesheetMetadata,
  UpdateStylesheetRequest,
  StylesheetResponse,
} from "@/types/stylesheet";
import { invalidateStylesheetCache } from "@/hooks/useStylesheetData";
import { CSSEditor } from "../content-studio/CSSEditor";

interface StylesheetEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stylesheet: StylesheetMetadata;
  onSuccess: () => void;
}

export function StylesheetEditDialog({
  isOpen,
  onClose,
  stylesheet,
  onSuccess,
}: StylesheetEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    version: string;
    tags: string;
    cssContent: string;
  }>({
    name: stylesheet.name,
    description: stylesheet.description || "",
    version: stylesheet.version || "1.0.0",
    tags: stylesheet.tags?.join(", ") || "",
    cssContent: "",
  });

  // Load full stylesheet details when dialog opens
  useEffect(() => {
    if (isOpen && stylesheet.id) {
      loadStylesheetDetails();
    }
  }, [isOpen, stylesheet.id]);

  const loadStylesheetDetails = async () => {
    try {
      setLoadingDetails(true);
      const response = await api.get<StylesheetResponse>(
        `/stylesheets/${stylesheet.id}`
      );

      setFormData({
        name: response.stylesheet.name,
        description: response.stylesheet.description || "",
        version: response.stylesheet.version || "1.0.0",
        tags: response.stylesheet.tags?.join(", ") || "",
        cssContent: response.stylesheet.cssContent,
      });
    } catch (error) {
      console.error("Failed to load stylesheet details:", error);
      toast({
        title: "Loading Error",
        description: "Failed to load stylesheet details for editing.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the stylesheet.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cssContent.trim()) {
      toast({
        title: "CSS Content Required",
        description: "Please enter CSS content.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const updateData: UpdateStylesheetRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        version: formData.version.trim() || undefined,
        cssContent: formData.cssContent.trim(),
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      };

      await api.put(`/stylesheets/${stylesheet.id}`, updateData);

      // Invalidate cache to trigger preview updates
      invalidateStylesheetCache();

      toast({
        title: "Stylesheet Updated",
        description: `"${formData.name}" has been successfully updated.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to update stylesheet:", error);

      let errorMessage = "Failed to update stylesheet. Please try again.";
      if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Edit Stylesheet
          </DialogTitle>
          <DialogDescription>
            Update the stylesheet metadata and CSS content. Changes will be
            automatically parsed and made available for use.
          </DialogDescription>
        </DialogHeader>

        {loadingDetails ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading stylesheet details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-6 h-[calc(95vh-200px)] overflow-hidden">
              {/* Left Column - Metadata */}
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Stylesheet Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Client Name Newsletter Styles"
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) =>
                        handleInputChange("version", e.target.value)
                      }
                      placeholder="1.0.0"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Newsletter styles for XYZ Company"
                    disabled={loading}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleInputChange("tags", e.target.value)}
                    placeholder="newsletter, client, brand"
                    disabled={loading}
                  />
                  <div className="text-xs text-muted-foreground">
                    Separate multiple tags with commas
                  </div>
                </div>

                {/* Stylesheet Info */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {stylesheet.classCount} classes
                  </Badge>
                  <Badge variant="outline">
                    {stylesheet.categoryCount} categories
                  </Badge>
                  {stylesheet.clientName && (
                    <Badge variant="secondary">{stylesheet.clientName}</Badge>
                  )}
                </div>
              </div>

              {/* Right Column - CSS Editor with Vim Mode */}
              <div className="flex flex-col h-full">
                <div className="mb-3">
                  <Label className="text-sm font-medium">
                    CSS Content with Vim Mode
                  </Label>
                  <div className="text-xs text-muted-foreground mt-1">
                    Use Vim keybindings • Ctrl+S to save • Syntax highlighting
                  </div>
                </div>
                <div className="flex-1 border border-border/40 rounded-lg overflow-hidden">
                  <CSSEditor
                    cssContent={formData.cssContent}
                    onCSSChange={(content) =>
                      handleInputChange("cssContent", content)
                    }
                    selectedStylesheetId={stylesheet.id}
                    className="h-full"
                  />
                </div>
                {formData.cssContent && (
                  <div className="text-xs text-muted-foreground mt-2 text-right">
                    {formData.cssContent.length.toLocaleString()} characters
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || loadingDetails}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Stylesheet
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
