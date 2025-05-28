import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import type { CaptionFormState, PromptTemplate, LengthSetting } from "./types";

interface GenerationControlsProps {
  formState: CaptionFormState;
  formHandlers: any;
  promptTemplates: PromptTemplate[];
  lengthSettings: LengthSetting[];
  onGenerate: () => void;
  isGenerating: boolean;
  useMinimalCarData: boolean;
  onUseMinimalCarDataChange: (value: boolean) => void;
  showPreview: boolean;
  onShowPreviewToggle: (value: boolean) => void;
  editableLLMText: string;
  onEditableLLMTextChange: (value: string) => void;
  onRefreshLLMText: () => void;
}

export function GenerationControls({
  formState,
  formHandlers,
  promptTemplates,
  lengthSettings,
  onGenerate,
  isGenerating,
  useMinimalCarData,
  onUseMinimalCarDataChange,
  showPreview,
  onShowPreviewToggle,
  editableLLMText,
  onEditableLLMTextChange,
  onRefreshLLMText,
}: GenerationControlsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Generation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context Input */}
        <div className="space-y-2">
          <Label htmlFor="context">Context</Label>
          <Textarea
            id="context"
            placeholder="Enter context for caption generation..."
            value={formState.context}
            onChange={(e) => formHandlers.updateContext(e.target.value)}
            rows={3}
          />
        </div>

        {/* Additional Context */}
        <div className="space-y-2">
          <Label htmlFor="additional-context">Additional Context</Label>
          <Textarea
            id="additional-context"
            placeholder="Any additional context..."
            value={formState.additionalContext}
            onChange={(e) =>
              formHandlers.updateAdditionalContext(e.target.value)
            }
            rows={2}
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="minimal-data">Use Minimal Car Data</Label>
            <Switch
              id="minimal-data"
              checked={useMinimalCarData}
              onCheckedChange={onUseMinimalCarDataChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-preview">Show LLM Preview</Label>
            <Switch
              id="show-preview"
              checked={showPreview}
              onCheckedChange={onShowPreviewToggle}
            />
          </div>
        </div>

        {/* LLM Preview */}
        {showPreview && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="llm-text">LLM Text Preview</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshLLMText}
                className="flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </Button>
            </div>
            <Textarea
              id="llm-text"
              value={editableLLMText}
              onChange={(e) => onEditableLLMTextChange(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Caption
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
