import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingContainer } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Save, Edit3, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { SavedCaption } from "./types";

interface CaptionPreviewProps {
  generatedCaption: string | null;
  savedCaptions: SavedCaption[];
  onUpdateCaption: (caption: string) => void;
  onSaveCaption: (caption: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function CaptionPreview({
  generatedCaption,
  savedCaptions,
  onUpdateCaption,
  onSaveCaption,
  loading,
  error,
}: CaptionPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditedCaption(generatedCaption || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onUpdateCaption(editedCaption);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCaption("");
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleSave = async () => {
    if (!generatedCaption) return;

    setIsSaving(true);
    try {
      const success = await onSaveCaption(generatedCaption);
      if (success) {
        toast.success("Caption saved successfully!");
      } else {
        toast.error("Failed to save caption");
      }
    } catch (error) {
      toast.error("Failed to save caption");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generated Caption */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Generated Caption
            </CardTitle>
            {generatedCaption && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(generatedCaption)}
                  className="flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : !generatedCaption ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Generate a caption to see the preview</p>
            </div>
          ) : isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap p-4 bg-muted/50 rounded-md">
              {generatedCaption}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Captions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Saved Captions ({savedCaptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingContainer />
          ) : savedCaptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Save className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No saved captions yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {savedCaptions.map((caption) => (
                <div
                  key={caption._id}
                  className="p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium mb-1">
                        {caption.platform} •{" "}
                        {new Date(caption.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {caption.caption}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(caption.caption)}
                      className="flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
