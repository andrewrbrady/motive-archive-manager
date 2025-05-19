"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog"; // If used within a dialog
import type { ModelType } from "@/types/models"; // Corrected: ModelType from types/models
import type { ProviderId } from "@/lib/llmProviders";
import { getAllModels, llmProviders, findModelById } from "@/lib/llmProviders";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// Assuming ArticlePrompt interface is defined in ArticleGenerator.tsx or a shared types file
// For now, let's define a simplified version here for clarity, ensure it matches the one in ArticleGenerator
interface ArticlePromptForForm {
  _id?: string;
  name: string;
  prompt: string;
  aiModel: ModelType;
  llmProvider: ProviderId;
  modelParams?: {
    temperature?: number;
  };
  isDefault?: boolean; // Add if managing default status here
}

export interface ArticlePromptFormData {
  name: string;
  prompt: string;
  aiModel: ModelType;
  llmProvider: ProviderId;
  modelParams: {
    temperature: number;
  };
  isDefault?: boolean;
  // other fields as needed
}

interface ArticlePromptFormProps {
  prompt?: ArticlePromptForForm; // For editing
  isSubmitting: boolean;
  onSubmit: (data: ArticlePromptFormData) => Promise<void>;
  onCancel: () => void;
  // To allow ArticleGenerator to manage these states if preferred, and pass them down
  initialModel?: ModelType;
  initialProvider?: ProviderId;
  initialTemperature?: number;
  renderModelSelector?: () => React.ReactNode;
}

const ArticlePromptForm: React.FC<ArticlePromptFormProps> = ({
  prompt,
  isSubmitting,
  onSubmit,
  onCancel,
  initialModel = "claude-3-5-sonnet-20241022",
  initialProvider = "anthropic",
  initialTemperature = 0.7,
  renderModelSelector,
}) => {
  const [name, setName] = useState(prompt?.name || "");
  const [promptText, setPromptText] = useState(prompt?.prompt || "");
  const [currentAiModel, setCurrentAiModel] = useState<ModelType>(
    prompt?.aiModel || initialModel
  );
  const [currentProvider, setCurrentProvider] = useState<ProviderId>(
    prompt?.llmProvider || initialProvider
  );
  const [currentTemperature, setCurrentTemperature] = useState<number>(
    prompt?.modelParams?.temperature !== undefined
      ? prompt.modelParams.temperature
      : initialTemperature
  );
  const [isDefault, setIsDefault] = useState<boolean>(
    prompt?.isDefault || false
  );

  const allModels = getAllModels();
  const modelsByCurrentProvider = llmProviders[currentProvider]?.models || [];

  useEffect(() => {
    if (prompt) {
      setName(prompt.name);
      setPromptText(prompt.prompt);
      setCurrentAiModel(prompt.aiModel);
      setCurrentProvider(prompt.llmProvider);
      setCurrentTemperature(
        prompt.modelParams?.temperature !== undefined
          ? prompt.modelParams.temperature
          : initialTemperature
      );
      setIsDefault(prompt.isDefault || false);
    } else {
      // Reset to defaults for new prompt form
      setName("");
      setPromptText("");
      setCurrentAiModel(initialModel);
      setCurrentProvider(initialProvider);
      setCurrentTemperature(initialTemperature);
      setIsDefault(false);
    }
  }, [prompt, initialModel, initialProvider, initialTemperature]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !promptText.trim()) {
      // Basic validation, consider more robust validation
      alert("Prompt Name and Prompt Text cannot be empty.");
      return;
    }
    onSubmit({
      name,
      prompt: promptText,
      aiModel: currentAiModel,
      llmProvider: currentProvider,
      modelParams: {
        temperature: currentTemperature,
      },
      isDefault,
    });
  };

  const handleProviderChange = (newProviderId: ProviderId) => {
    setCurrentProvider(newProviderId);
    // If current model is not in new provider's list, set to first model of new provider
    const providerModels = llmProviders[newProviderId]?.models || [];
    if (!providerModels.some((m) => m.id === currentAiModel)) {
      setCurrentAiModel(
        (providerModels[0]?.id ||
          allModels[0]?.model.id ||
          "claude-3-5-sonnet-20241022") as ModelType
      ); // Fallback
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="promptName" className="text-sm font-medium">
          Prompt Name
        </Label>
        <Input
          id="promptName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Standard Feature Article, Quick Update Teaser"
          className="mt-1 w-full"
          required
        />
      </div>

      <div>
        <Label htmlFor="promptText" className="text-sm font-medium">
          Prompt Instructions
        </Label>
        <Textarea
          id="promptText"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Enter the detailed instructions for the AI to generate the article..."
          className="mt-1 w-full min-h-[150px]"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          You can use placeholders like {"{CAR_YEAR}"}, {"{CAR_MAKE}"},{" "}
          {"{CAR_MODEL}"}, {"{CAR_DETAILS_SUMMARY}"}, etc. These will be
          replaced with actual car data during generation.
        </p>
      </div>

      {/* AI Model Configuration Section */}
      <div className="space-y-4 mt-4 p-4 border border-border rounded-md bg-muted/20">
        <h3 className="text-base font-semibold text-foreground">
          AI Configuration
        </h3>
        <div>
          <Label
            htmlFor="aiProvider"
            className="block text-sm font-medium mb-1"
          >
            AI Provider
          </Label>
          <select
            id="aiProvider"
            value={currentProvider}
            onChange={(e) => handleProviderChange(e.target.value as ProviderId)}
            className="w-full border rounded-md p-2 bg-background text-foreground border-input focus:ring-ring focus:border-ring"
          >
            {Object.values(llmProviders)
              .filter((p) => p.models.length > 0)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <Label htmlFor="aiModel" className="block text-sm font-medium mb-1">
            AI Model
          </Label>
          <select
            id="aiModel"
            value={currentAiModel}
            onChange={(e) => setCurrentAiModel(e.target.value as ModelType)}
            disabled={modelsByCurrentProvider.length === 0}
            className="w-full border rounded-md p-2 bg-background text-foreground border-input focus:ring-ring focus:border-ring"
          >
            {modelsByCurrentProvider.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            {modelsByCurrentProvider.length === 0 && (
              <option value="" disabled>
                Select a provider with available models or check configuration.
              </option>
            )}
          </select>
          {currentAiModel && llmProviders[currentProvider] && (
            <div className="mt-2 text-xs text-muted-foreground">
              {findModelById(currentAiModel)?.model.contextWindow
                ? `Context: ${findModelById(currentAiModel)?.model.contextWindow?.toLocaleString()} tokens`
                : ""}
              {findModelById(currentAiModel)?.model.costPer1KTokens
                ? ` • Cost: $${findModelById(currentAiModel)?.model.costPer1KTokens?.toFixed(5)}/1K tokens`
                : ""}
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="temperature" className="text-sm font-medium">
              Temperature (Creativity)
            </Label>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {currentTemperature.toFixed(1)}
            </span>
          </div>
          <input
            id="temperature"
            type="range"
            min="0.0"
            max="2.0"
            step="0.1"
            value={currentTemperature}
            onChange={(e) => setCurrentTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>More Precise</span>
            <span>More Creative</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-2">
          <input
            type="checkbox"
            id="isDefaultPrompt"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <Label htmlFor="isDefaultPrompt" className="text-sm font-medium">
            Set as Default Article Prompt
          </Label>
        </div>
      </div>

      {/* Model selector is conditionally rendered if the prop is provided */}
      {renderModelSelector && (
        <div className="mt-6">{renderModelSelector()}</div>
      )}

      <DialogFooter className="pt-4">
        {" "}
        {/* Ensure this is styled if not usingshadcn Dialog directly */}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || !promptText.trim()}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {prompt?._id ? "Save Changes" : "Create Prompt"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ArticlePromptForm;
