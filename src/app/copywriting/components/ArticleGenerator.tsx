"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface OutlineItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function ArticleGenerator() {
  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
  const [modificationInput, setModificationInput] = useState("");
  const [finalDraft, setFinalDraft] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  // Handle the generation of instructions based on the prompt
  const handleGenerateInstructions = async () => {
    if (!promptInput.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        "/api/copywriting/article/generate-instructions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: promptInput }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate instructions");

      const data = await response.json();
      setInstructions(data.instructions);

      // Generate outline items from the instructions
      const generatedOutline = data.outline || [];
      const outlineWithIds = generatedOutline.map((item: string) => ({
        id: Math.random().toString(36).substring(2, 9),
        text: item,
        completed: false,
      }));

      setOutlineItems(outlineWithIds);
    } catch (error) {
      console.error("Error generating instructions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle modifications to the outline
  const handleModifyOutline = async () => {
    if (!modificationInput.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/copywriting/article/modify-outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instructions: instructions,
          currentOutline: outlineItems.map((item) => item.text),
          modifications: modificationInput,
        }),
      });

      if (!response.ok) throw new Error("Failed to modify outline");

      const data = await response.json();
      const modifiedOutline = data.outline || [];
      const outlineWithIds = modifiedOutline.map((item: string) => ({
        id: Math.random().toString(36).substring(2, 9),
        text: item,
        completed: false,
      }));

      setOutlineItems(outlineWithIds);
      setModificationInput("");
    } catch (error) {
      console.error("Error modifying outline:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle generating content based on the current outline step
  const handleGenerateContent = async () => {
    if (currentStep >= outlineItems.length) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        "/api/copywriting/article/generate-content",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instructions: instructions,
            currentOutline: outlineItems.map((item) => item.text),
            currentStep: currentStep,
            currentDraft: finalDraft,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate content");

      const data = await response.json();

      // Update the draft with the new content
      setFinalDraft((prev) => {
        const newContent = data.content || "";
        return prev ? `${prev}\n\n${newContent}` : newContent;
      });

      // Mark the current step as completed
      setOutlineItems((prev) =>
        prev.map((item, idx) =>
          idx === currentStep ? { ...item, completed: true } : item
        )
      );

      // Move to the next step
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle the completion status of an outline item
  const toggleOutlineItem = (id: string) => {
    setOutlineItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1: Initial Prompt */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Define Your Article</h3>
        <Textarea
          placeholder="Enter a prompt for your article (e.g., 'Write an article about sustainable car manufacturing techniques')"
          className="min-h-[200px] border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
        />
        <Button
          onClick={handleGenerateInstructions}
          disabled={isGenerating || !promptInput.trim()}
          className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Instructions"
          )}
        </Button>
      </div>

      {/* Column 2: Instructions & Outline */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Article Plan</h3>

        {/* Instructions display */}
        {instructions && (
          <Card className="p-4 mb-4 bg-[hsl(var(--background))] border-[hsl(var(--border))]">
            <h4 className="font-medium mb-2">Generated Instructions</h4>
            <p className="text-sm text-[hsl(var(--foreground-muted))] whitespace-pre-line">
              {instructions}
            </p>
          </Card>
        )}

        {/* Outline modification */}
        <div className="space-y-2">
          <Textarea
            placeholder="Modify the outline (e.g., 'Add a section about electric vehicles', 'Remove the history section')"
            value={modificationInput}
            onChange={(e) => setModificationInput(e.target.value)}
            className="min-h-[100px] border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          />
          <Button
            onClick={handleModifyOutline}
            disabled={
              isGenerating || !instructions || !modificationInput.trim()
            }
            size="sm"
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]"
          >
            Apply Modifications
          </Button>
        </div>

        {/* Outline with checkboxes */}
        {outlineItems.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-2">Article Outline</h4>
            <ul className="space-y-2">
              {outlineItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={() => toggleOutlineItem(item.id)}
                    className="mt-1 border-[hsl(var(--border))]"
                  />
                  <label
                    htmlFor={item.id}
                    className={`text-sm ${
                      item.completed
                        ? "line-through text-[hsl(var(--foreground-muted))]"
                        : ""
                    }`}
                  >
                    {item.text}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Column 3: Working Draft */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Working Draft</h3>
        <Textarea
          placeholder="Your article will appear here as it's generated..."
          className="min-h-[400px] border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          value={finalDraft}
          onChange={(e) => setFinalDraft(e.target.value)}
        />
        <Button
          onClick={handleGenerateContent}
          disabled={
            isGenerating ||
            outlineItems.length === 0 ||
            currentStep >= outlineItems.length
          }
          className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            `Generate Next Section${
              currentStep < outlineItems.length
                ? `: ${outlineItems[currentStep]?.text.substring(0, 30)}${
                    outlineItems[currentStep]?.text.length > 30 ? "..." : ""
                  }`
                : ""
            }`
          )}
        </Button>
      </div>
    </div>
  );
}
