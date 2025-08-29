"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Palette, Settings, Plus, Edit, Trash2 } from "lucide-react";
import {
  StylesheetMetadata,
  CreateStylesheetRequest,
} from "@/types/stylesheet";
import { useToast } from "@/components/ui/use-toast";
import { StylesheetEditDialog } from "./StylesheetEditDialog";
import { StylesheetDeleteDialog } from "./StylesheetDeleteDialog";
import { invalidateStylesheetCache } from "@/hooks/useStylesheetData";

interface StylesheetSelectorProps {
  selectedStylesheetId?: string;
  onStylesheetChange: (stylesheetId: string | null) => void;
  className?: string;
  // Controls whether to show stats (class/category counts)
  showStats?: boolean;
}

const StylesheetSelectorComponent = React.memo(function StylesheetSelector({
  selectedStylesheetId,
  onStylesheetChange,
  className,
  showStats = true,
}: StylesheetSelectorProps) {
  const { toast } = useToast();
  const [stylesheets, setStylesheets] = useState<StylesheetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit and delete dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStylesheetForAction, setSelectedStylesheetForAction] =
    useState<StylesheetMetadata | null>(null);

  // Form state for uploading new stylesheet
  const [newStylesheet, setNewStylesheet] = useState<CreateStylesheetRequest>({
    name: "",
    cssContent: "",
    description: "",
    clientId: "",
    version: "1.0.0",
    tags: [],
  });

  useEffect(() => {
    fetchStylesheets();
  }, []);

  const fetchStylesheets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stylesheets");

      if (response.ok) {
        const data = await response.json();
        setStylesheets(data.stylesheets);
        console.log("Loaded stylesheets:", data.stylesheets.length);
      } else {
        console.error("Failed to fetch stylesheets:", response.status);
        toast({
          title: "Loading Error",
          description: "Failed to load available stylesheets.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching stylesheets:", error);
      toast({
        title: "Loading Error",
        description: "Unable to connect to the stylesheet service.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadStylesheet = async () => {
    if (!newStylesheet.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the stylesheet.",
        variant: "destructive",
      });
      return;
    }

    if (!newStylesheet.cssContent.trim()) {
      toast({
        title: "CSS Content Required",
        description: "Please paste your CSS content.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      console.log("Uploading stylesheet:", {
        name: newStylesheet.name,
        cssLength: newStylesheet.cssContent.length,
      });

      const response = await fetch("/api/stylesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStylesheet),
      });

      console.log("Upload response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Upload successful, response:", data);

        // Invalidate cache to trigger preview updates
        invalidateStylesheetCache();

        await fetchStylesheets();
        onStylesheetChange(data.stylesheet.id);
        setUploadDialogOpen(false);

        toast({
          title: "Stylesheet Uploaded",
          description: `"${newStylesheet.name}" has been successfully uploaded and applied.`,
        });

        // Reset form
        setNewStylesheet({
          name: "",
          cssContent: "",
          description: "",
          clientId: "",
          version: "1.0.0",
          tags: [],
        });
      } else {
        // Handle error response
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }

        console.error("Upload failed:", errorMessage);
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading stylesheet:", error);
      toast({
        title: "Upload Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while uploading the stylesheet.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const selectedStylesheet = stylesheets.find(
    (s) => s.id === selectedStylesheetId
  );

  // Handle edit and delete actions
  const handleEditStylesheet = (stylesheet: StylesheetMetadata) => {
    setSelectedStylesheetForAction(stylesheet);
    setEditDialogOpen(true);
  };

  const handleDeleteStylesheet = (stylesheet: StylesheetMetadata) => {
    setSelectedStylesheetForAction(stylesheet);
    setDeleteDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    // Invalidate cache to trigger preview updates
    invalidateStylesheetCache();
    fetchStylesheets(); // Refresh the stylesheet list
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedStylesheetForAction(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedStylesheetForAction(null);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select
        value={selectedStylesheetId || "none"}
        onValueChange={(value) =>
          onStylesheetChange(value === "none" ? null : value)
        }
      >
        <SelectTrigger className="w-48 bg-background border-border/40 hover:bg-muted/20 shadow-sm">
          <Palette className="h-4 w-4 mr-2" />
          <SelectValue className="truncate" placeholder="Select stylesheet..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No stylesheet</SelectItem>
          {stylesheets.map((stylesheet) => (
            <SelectItem key={stylesheet.id} value={stylesheet.id}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{stylesheet.name}</span>
                {stylesheet.clientName && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {stylesheet.clientName}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showStats && selectedStylesheet && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{selectedStylesheet.classCount} classes</span>
            <span>•</span>
            <span>{selectedStylesheet.categoryCount} categories</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditStylesheet(selectedStylesheet)}
              className="h-6 w-6 p-0 hover:bg-muted/50"
              title="Edit stylesheet"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteStylesheet(selectedStylesheet)}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              title="Delete stylesheet"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="h-3 w-3 mr-1" />
            Upload CSS
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Client Stylesheet</DialogTitle>
            <DialogDescription>
              Upload a CSS file to automatically extract available styles for
              this client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Stylesheet Name</Label>
                <Input
                  id="name"
                  value={newStylesheet.name}
                  onChange={(e) =>
                    setNewStylesheet({ ...newStylesheet, name: e.target.value })
                  }
                  placeholder="Client Name Newsletter Styles"
                  disabled={uploading}
                />
              </div>
              <div>
                <Label htmlFor="clientId">Client ID (Optional)</Label>
                <Input
                  id="clientId"
                  value={newStylesheet.clientId || ""}
                  onChange={(e) =>
                    setNewStylesheet({
                      ...newStylesheet,
                      clientId: e.target.value,
                    })
                  }
                  placeholder="client-abc-123"
                  disabled={uploading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={newStylesheet.description || ""}
                onChange={(e) =>
                  setNewStylesheet({
                    ...newStylesheet,
                    description: e.target.value,
                  })
                }
                placeholder="Newsletter styles for XYZ Company"
                disabled={uploading}
              />
            </div>

            <div>
              <Label htmlFor="cssContent">CSS Content</Label>
              <Textarea
                id="cssContent"
                value={newStylesheet.cssContent}
                onChange={(e) =>
                  setNewStylesheet({
                    ...newStylesheet,
                    cssContent: e.target.value,
                  })
                }
                placeholder="Paste your CSS here..."
                className="min-h-48 font-mono text-sm"
                disabled={uploading}
              />
              {newStylesheet.cssContent && (
                <div className="text-xs text-muted-foreground mt-1">
                  {newStylesheet.cssContent.length.toLocaleString()} characters
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadStylesheet}
                disabled={
                  uploading || !newStylesheet.name || !newStylesheet.cssContent
                }
              >
                {uploading ? (
                  <>
                    <Upload className="h-3 w-3 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 mr-1" />
                    Upload Stylesheet
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {selectedStylesheetForAction && (
        <StylesheetEditDialog
          isOpen={editDialogOpen}
          onClose={handleCloseEditDialog}
          stylesheet={selectedStylesheetForAction}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Delete Dialog */}
      {selectedStylesheetForAction && (
        <StylesheetDeleteDialog
          isOpen={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          stylesheet={selectedStylesheetForAction}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
});

export { StylesheetSelectorComponent as StylesheetSelector };
