"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Settings,
  Save,
  RotateCcw,
  AlertCircle,
  Bot,
  DollarSign,
  Activity,
} from "lucide-react";
import {
  AIModel,
  DEFAULT_MODEL_CONFIGS,
  validateTokenRange,
} from "@/utils/aiHelpers";

interface ModelConfigData {
  _id?: string;
  modelId: AIModel;
  displayName: string;
  description: string;
  defaultTokens: number;
  maxTokens: number;
  enabled: boolean;
  cost?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export function ModelsConfigurator() {
  const [configs, setConfigs] = useState<ModelConfigData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load model configurations on mount
  useEffect(() => {
    loadModelConfigs();
  }, []);

  const loadModelConfigs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/model-configs");

      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs || []);
      } else {
        // If no configs exist, initialize with defaults
        if (response.status === 404) {
          setConfigs(
            DEFAULT_MODEL_CONFIGS.map((config) => ({
              modelId: config.id,
              displayName: config.displayName,
              description: config.description,
              defaultTokens: config.defaultTokens,
              maxTokens: config.maxTokens,
              enabled: config.enabled,
              cost: 0,
            }))
          );
        } else {
          throw new Error("Failed to load model configurations");
        }
      }
    } catch (err) {
      console.error("Error loading model configs:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load model configurations"
      );
      // Initialize with defaults on error
      setConfigs(
        DEFAULT_MODEL_CONFIGS.map((config) => ({
          modelId: config.id,
          displayName: config.displayName,
          description: config.description,
          defaultTokens: config.defaultTokens,
          maxTokens: config.maxTokens,
          enabled: config.enabled,
          cost: 0,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (
    modelId: AIModel,
    updates: Partial<ModelConfigData>
  ) => {
    setConfigs((prev) =>
      prev.map((config) =>
        config.modelId === modelId ? { ...config, ...updates } : config
      )
    );
    setHasChanges(true);
  };

  const saveConfigurations = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/admin/model-configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ configs }),
      });

      if (!response.ok) {
        throw new Error("Failed to save model configurations");
      }

      const result = await response.json();
      setConfigs(result.configs);
      setHasChanges(false);

      toast({
        title: "Success",
        description: "Model configurations saved successfully",
      });
    } catch (err) {
      console.error("Error saving configs:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save configurations"
      );

      toast({
        title: "Error",
        description: "Failed to save model configurations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setConfigs(
      DEFAULT_MODEL_CONFIGS.map((config) => ({
        modelId: config.id,
        displayName: config.displayName,
        description: config.description,
        defaultTokens: config.defaultTokens,
        maxTokens: config.maxTokens,
        enabled: config.enabled,
        cost: 0,
      }))
    );
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Bot className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading model configurations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">AI Models Configuration</h1>
            <p className="text-muted-foreground">
              Configure available AI models, token limits, and settings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>

          <Button
            onClick={saveConfigurations}
            disabled={!hasChanges || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Changes Indicator */}
      {hasChanges && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save your configurations.
          </AlertDescription>
        </Alert>
      )}

      {/* Model Configuration Cards */}
      <div className="grid gap-6">
        {configs.map((config) => (
          <Card
            key={config.modelId}
            className={`${!config.enabled ? "opacity-60" : ""}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-primary" />
                  <CardTitle className="flex items-center gap-2">
                    {config.displayName}
                    <Badge variant={config.enabled ? "default" : "secondary"}>
                      {config.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </CardTitle>
                </div>

                <Switch
                  checked={config.enabled}
                  onCheckedChange={(enabled) =>
                    updateConfig(config.modelId, { enabled })
                  }
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor={`desc-${config.modelId}`}>Description</Label>
                <Textarea
                  id={`desc-${config.modelId}`}
                  value={config.description}
                  onChange={(e) =>
                    updateConfig(config.modelId, {
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe this model's capabilities and use cases"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Default Token Length */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Default Token Length</Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {config.defaultTokens} tokens
                    </span>
                  </div>
                  <Slider
                    value={[config.defaultTokens]}
                    onValueChange={(value) =>
                      updateConfig(config.modelId, {
                        defaultTokens: validateTokenRange(value[0]),
                      })
                    }
                    min={500}
                    max={config.maxTokens}
                    step={100}
                    className="w-full"
                  />
                </div>

                {/* Maximum Token Length */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Maximum Token Length</Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {config.maxTokens} tokens
                    </span>
                  </div>
                  <Slider
                    value={[config.maxTokens]}
                    onValueChange={(value) =>
                      updateConfig(config.modelId, {
                        maxTokens: validateTokenRange(value[0]),
                      })
                    }
                    min={Math.max(config.defaultTokens, 500)}
                    max={4000}
                    step={100}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Cost Configuration (placeholder for Phase 2B) */}
              <div className="space-y-2">
                <Label
                  htmlFor={`cost-${config.modelId}`}
                  className="flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Cost per 1K tokens (USD) - Future Feature
                </Label>
                <Input
                  id={`cost-${config.modelId}`}
                  type="number"
                  step="0.001"
                  min="0"
                  value={config.cost || 0}
                  onChange={(e) =>
                    updateConfig(config.modelId, {
                      cost: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.000"
                  disabled
                  className="opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Cost tracking and budgeting will be available in Phase 2B
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Configuration Notes
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • Model configurations apply to all new chat conversations
              </li>
              <li>
                • Existing conversations continue using their saved settings
              </li>
              <li>
                • Token limits are enforced on both user input and AI responses
              </li>
              <li>
                • Disabled models won't appear in user model selection dropdowns
              </li>
              <li>• Cost tracking and usage analytics coming in Phase 2B</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
