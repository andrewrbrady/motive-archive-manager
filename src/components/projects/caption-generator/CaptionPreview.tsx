"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Copy,
  Pencil,
  Trash2,
  X,
  Instagram,
  Youtube,
  Eye,
  FileText,
} from "lucide-react";
import { Platform, SavedCaption } from "./types";

type ViewMode = "preview" | "saved";

interface CaptionPreviewProps {
  // Generated caption preview
  generatedCaption: string;
  platform: Platform;
  copiedId: string | null;
  onCopyCaption: (text: string, id: string) => void;
  onSaveCaption: () => void;
  onUpdatePreviewCaption: (newCaption: string) => void;

  // View mode control
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;

  // Saved captions
  savedCaptions: SavedCaption[];
  editingCaptionId: string | null;
  editingText: string;
  onStartEdit: (captionId: string, currentText: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (captionId: string) => void;
  onEditTextChange: (text: string) => void;
  onDeleteCaption: (captionId: string) => void;
}

export function CaptionPreview({
  generatedCaption,
  platform,
  copiedId,
  onCopyCaption,
  onSaveCaption,
  onUpdatePreviewCaption,
  viewMode,
  onViewModeChange,
  savedCaptions,
  editingCaptionId,
  editingText,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditTextChange,
  onDeleteCaption,
}: CaptionPreviewProps) {
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [previewEditText, setPreviewEditText] = useState("");

  // Use external viewMode or default to "preview"
  const currentViewMode = viewMode || "preview";

  const handleStartPreviewEdit = () => {
    setPreviewEditText(generatedCaption);
    setIsEditingPreview(true);
  };

  const handleCancelPreviewEdit = () => {
    setIsEditingPreview(false);
    setPreviewEditText("");
  };

  const handleSavePreviewEdit = () => {
    // Just finish editing and update the preview - don't save to DB yet
    setIsEditingPreview(false);
    // Update the parent component's generated caption state
    onUpdatePreviewCaption(previewEditText);
  };

  const getCurrentPreviewText = () => {
    return isEditingPreview ? previewEditText : generatedCaption;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggle Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={currentViewMode === "preview" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (onViewModeChange) {
              onViewModeChange("preview");
            }
          }}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Preview
        </Button>
        <Button
          variant={currentViewMode === "saved" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (onViewModeChange) {
              onViewModeChange("saved");
            }
          }}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Saved ({savedCaptions.length})
        </Button>
      </div>

      {/* Content Area with Better Vertical Display */}
      <div className="flex-1 min-h-0">
        {currentViewMode === "preview" && (
          <div className="h-full flex flex-col">
            {/* Generated Caption Preview */}
            {generatedCaption ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                    Generated Caption Preview
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onCopyCaption(getCurrentPreviewText(), "preview")
                      }
                      className="border-[hsl(var(--border))]"
                    >
                      {copiedId === "preview" ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    {isEditingPreview ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSavePreviewEdit}
                          className="border-[hsl(var(--border))]"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelPreviewEdit}
                          className="border-[hsl(var(--border))]"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStartPreviewEdit}
                          className="border-[hsl(var(--border))]"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSaveCaption()}
                          className="border-[hsl(var(--border))]"
                        >
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 p-4 bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] rounded-lg overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    {platform === "instagram" && (
                      <Instagram className="w-4 h-4" />
                    )}
                    {platform === "youtube" && <Youtube className="w-4 h-4" />}
                    <span className="text-sm font-medium capitalize">
                      {platform}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {isEditingPreview ? (
                      <Textarea
                        value={previewEditText}
                        onChange={(e) => setPreviewEditText(e.target.value)}
                        className="min-h-full w-full resize-none bg-transparent border-none text-[hsl(var(--foreground))] text-sm leading-relaxed focus:ring-0 focus:outline-none p-0"
                        placeholder="Edit your caption..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSavePreviewEdit();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            handleCancelPreviewEdit();
                          }
                        }}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] dark:text-white leading-relaxed">
                        {generatedCaption}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    No Caption Generated
                  </p>
                  <p className="text-sm">
                    Generate a caption to see the preview here
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {currentViewMode === "saved" && (
          <div className="h-full flex flex-col">
            {savedCaptions.length > 0 ? (
              <>
                <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white mb-3">
                  Saved Captions ({savedCaptions.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {savedCaptions.map((caption) => (
                    <div
                      key={caption._id}
                      className="group relative p-4 bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {caption.platform === "instagram" && (
                          <Instagram className="w-4 h-4" />
                        )}
                        {caption.platform === "youtube" && (
                          <Youtube className="w-4 h-4" />
                        )}
                        <span className="text-xs font-medium capitalize">
                          {caption.platform}
                        </span>
                        <span className="text-xs text-[hsl(var(--foreground-muted))]">
                          • {caption.carIds?.length || 0} cars
                          {caption.eventIds && caption.eventIds.length > 0 && (
                            <span> • {caption.eventIds.length} events</span>
                          )}
                        </span>
                      </div>

                      {editingCaptionId === caption._id ? (
                        <Textarea
                          value={editingText || caption.caption}
                          onChange={(e) => onEditTextChange(e.target.value)}
                          className="min-h-[120px] w-full resize-none bg-transparent border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] text-sm leading-relaxed"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              onSaveEdit(caption._id);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              onCancelEdit();
                            }
                          }}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] pr-8 leading-relaxed">
                          {caption.caption}
                        </p>
                      )}

                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onCopyCaption(caption.caption, caption._id)
                          }
                          className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                          title="Copy caption"
                        >
                          {copiedId === caption._id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        {editingCaptionId === caption._id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSaveEdit(caption._id)}
                              className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onCancelEdit}
                              className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                              title="Cancel editing"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onStartEdit(caption._id, caption.caption)
                              }
                              className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                              title="Edit caption"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteCaption(caption._id)}
                              className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                              title="Delete caption"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Saved Captions</p>
                  <p className="text-sm">
                    Generate and save captions to see them here
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
