"use client";

import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2, ChevronDown, Check, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

type EnhancementType =
  | "improve"
  | "makeConcise"
  | "expandDetail"
  | "correctGrammar"
  | "makeSimpler"
  | "custom";

const enhancementOptions: Record<
  EnhancementType,
  { label: string; prompt: string }
> = {
  improve: {
    label: "Improve Text",
    prompt:
      "Please improve the following markdown text. Make it clearer, more concise, and fix any grammar or spelling issues. Only return the improved text without any explanations or additional comments.",
  },
  makeConcise: {
    label: "Make Concise",
    prompt:
      "Please make the following markdown text more concise while preserving its key information. Remove redundancies and unnecessary words. Only return the concise text without any explanations or additional comments.",
  },
  expandDetail: {
    label: "Expand Details",
    prompt:
      "Please expand on the following markdown text to add more detail and depth. Elaborate on the concepts present while maintaining the original meaning. Only return the expanded text without any explanations or additional comments.",
  },
  correctGrammar: {
    label: "Fix Grammar",
    prompt:
      "Please correct any grammar, spelling, or punctuation errors in the following markdown text without changing its content or meaning. Only return the corrected text without any explanations or additional comments.",
  },
  makeSimpler: {
    label: "Simplify",
    prompt:
      "Please simplify the following markdown text to make it more accessible and easier to understand. Use simpler language and shorter sentences. Only return the simplified text without any explanations or additional comments.",
  },
  custom: {
    label: "Custom Instruction",
    prompt: "",
  },
};

export default function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enhancementType, setEnhancementType] =
    useState<EnhancementType>("improve");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const getSelectedText = (): {
    text: string;
    start: number;
    end: number;
  } | null => {
    if (!textareaRef.current) return null;

    const { selectionStart, selectionEnd } = textareaRef.current;
    if (selectionStart === selectionEnd) return null;

    const selectedText = value.substring(selectionStart, selectionEnd);
    if (!selectedText.trim()) return null;

    return {
      text: selectedText,
      start: selectionStart,
      end: selectionEnd,
    };
  };

  const enhanceSelectedText = async () => {
    const selection = getSelectedText();
    if (!selection || isLoading) {
      // Alert user to select text
      alert("Please select some text to enhance.");
      return;
    }

    try {
      setIsLoading(true);
      setIsDialogOpen(false);

      // Get the prompt based on enhancement type
      const prompt =
        enhancementType === "custom"
          ? customPrompt
          : enhancementOptions[enhancementType].prompt;

      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selection.text,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance text");
      }

      const data = await response.json();

      if (data.enhancedText) {
        const newValue =
          value.substring(0, selection.start) +
          data.enhancedText +
          value.substring(selection.end);

        onChange(newValue);
      }
    } catch (error) {
      console.error("Error enhancing text:", error);
      alert("Error enhancing text. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Toolbar with enhance button */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center"
              disabled={readOnly || isLoading}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Enhance with Claude
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Enhance Text with Claude</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm mb-4">
                Select an enhancement type or create a custom instruction.
              </p>

              <RadioGroup
                value={enhancementType}
                onValueChange={(value) => {
                  setEnhancementType(value as EnhancementType);
                  setShowCustom(value === "custom");
                }}
                className="space-y-2"
              >
                {Object.entries(enhancementOptions)
                  .filter(([type]) => type !== "custom")
                  .map(([type, { label }]) => (
                    <div key={type} className="flex items-center space-x-2">
                      <RadioGroupItem value={type} id={type} />
                      <Label htmlFor={type}>{label}</Label>
                    </div>
                  ))}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom Instruction</Label>
                </div>
              </RadioGroup>

              {showCustom && (
                <div className="mt-4">
                  <Label htmlFor="custom-prompt">Instructions for Claude</Label>
                  <Textarea
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Please transform the selected text by..."
                    className="min-h-[100px] mt-2"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={enhanceSelectedText}
                disabled={isLoading}
              >
                {isLoading ? "Enhancing..." : "Enhance Selected Text"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Editor */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly || isLoading}
        className="min-h-[200px] font-mono"
        placeholder="Write or paste markdown text here. Select text and use the 'Enhance with Claude' button to modify it."
      />
    </div>
  );
}
