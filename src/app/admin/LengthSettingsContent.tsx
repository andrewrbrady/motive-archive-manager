"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Save, X, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";

interface LengthSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
}

const defaultLengthSettings: LengthSetting[] = [
  {
    key: "concise",
    name: "Concise",
    description: "1-2 lines",
    instructions:
      "Keep the caption brief and to the point. Focus on the most essential details only. Aim for 1-2 lines maximum.",
  },
  {
    key: "standard",
    name: "Standard",
    description: "2-3 lines",
    instructions:
      "Provide a balanced caption with key details about the vehicle. Include make, model, year, and one or two standout features. Aim for 2-3 lines.",
  },
  {
    key: "detailed",
    name: "Detailed",
    description: "3-4 lines",
    instructions:
      "Create a comprehensive caption that includes vehicle specifications, notable features, condition details, and context. Aim for 3-4 lines with rich descriptive language.",
  },
  {
    key: "comprehensive",
    name: "Comprehensive",
    description: "4+ lines",
    instructions:
      "Write an extensive caption covering all relevant aspects: full specifications, history, unique features, condition, market context, and appeal. Use 4 or more lines with detailed storytelling.",
  },
];

const LengthSettingsContent: React.FC = () => {
  const [lengthSettings, setLengthSettings] = useState<LengthSetting[]>(
    defaultLengthSettings
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSetting, setNewSetting] = useState<LengthSetting>({
    key: "",
    name: "",
    description: "",
    instructions: "",
  });

  const api = useAPI();

  useEffect(() => {
    if (api) {
      fetchLengthSettings();
    }
  }, [api]);

  const fetchLengthSettings = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const data = (await api.get(
        "/api/admin/length-settings"
      )) as LengthSetting[];
      setLengthSettings(data.length > 0 ? data : defaultLengthSettings);
    } catch (error) {
      console.error("Error fetching length settings:", error);
      setLengthSettings(defaultLengthSettings);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (
    key: string,
    field: keyof LengthSetting,
    value: string
  ) => {
    setLengthSettings((prev) =>
      prev.map((setting) =>
        setting.key === key ? { ...setting, [field]: value } : setting
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!api) return;

    try {
      setIsSaving(true);
      await api.post("/api/admin/length-settings", lengthSettings);

      setHasChanges(false);
      toast({
        title: "Success",
        description: "Length settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving length settings:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save length settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLengthSettings(defaultLengthSettings);
    setHasChanges(true);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      instructions: "",
    });
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      instructions: "",
    });
  };

  const handleSaveNew = () => {
    // Validate the new setting
    if (
      !newSetting.key ||
      !newSetting.name ||
      !newSetting.description ||
      !newSetting.instructions
    ) {
      toast({
        title: "Error",
        description: "All fields are required for a new length setting",
        variant: "destructive",
      });
      return;
    }

    // Check if key already exists
    if (lengthSettings.some((setting) => setting.key === newSetting.key)) {
      toast({
        title: "Error",
        description: "A length setting with this key already exists",
        variant: "destructive",
      });
      return;
    }

    // Validate key format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(newSetting.key)) {
      toast({
        title: "Error",
        description: "Key can only contain letters, numbers, and underscores",
        variant: "destructive",
      });
      return;
    }

    setLengthSettings((prev) => [...prev, newSetting]);
    setHasChanges(true);
    setIsAddingNew(false);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      instructions: "",
    });

    toast({
      title: "Success",
      description:
        "New length setting added. Don't forget to save your changes!",
    });
  };

  const handleDelete = async (keyToDelete: string) => {
    if (!api) return;

    try {
      await api.delete(`/api/admin/length-settings?key=${keyToDelete}`);

      // Remove from local state
      setLengthSettings((prev) =>
        prev.filter((setting) => setting.key !== keyToDelete)
      );
      setHasChanges(true);

      toast({
        title: "Success",
        description: "Length setting deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting length setting:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete length setting",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading length settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            Length Settings
          </h1>
          <p className="text-[hsl(var(--foreground-muted))] mt-1">
            Customize the length options and instructions for caption generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddNew}
            variant="outline"
            className="bg-green-600 hover:bg-green-700 text-white border-green-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Length Setting
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Add New Length Setting Form */}
      {isAddingNew && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">
              Add New Length Setting
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-key" className="text-sm font-medium">
                  Key (used in code)
                </Label>
                <Input
                  id="new-key"
                  value={newSetting.key}
                  onChange={(e) =>
                    setNewSetting((prev) => ({
                      ...prev,
                      key: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, ""),
                    }))
                  }
                  placeholder="e.g., ultra_brief, extended"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only lowercase letters, numbers, and underscores allowed
                </p>
              </div>
              <div>
                <Label htmlFor="new-name" className="text-sm font-medium">
                  Display Name
                </Label>
                <Input
                  id="new-name"
                  value={newSetting.name}
                  onChange={(e) =>
                    setNewSetting((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Ultra Brief, Extended"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-description" className="text-sm font-medium">
                Description (shown to users)
              </Label>
              <Input
                id="new-description"
                value={newSetting.description}
                onChange={(e) =>
                  setNewSetting((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="e.g., 1 line maximum, 5+ lines with full details"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-instructions" className="text-sm font-medium">
                AI Instructions
              </Label>
              <Textarea
                id="new-instructions"
                value={newSetting.instructions}
                onChange={(e) =>
                  setNewSetting((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
                placeholder="Detailed instructions for the AI about how to write captions of this length..."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveNew}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Add Length Setting
              </Button>
              <Button onClick={handleCancelAdd} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lengthSettings.map((setting) => (
          <Card
            key={setting.key}
            className="border border-[hsl(var(--border))]"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-white">
                  {setting.name}
                </CardTitle>
                {!["concise", "standard", "detailed", "comprehensive"].includes(
                  setting.key
                ) && (
                  <Button
                    onClick={() => handleDelete(setting.key)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-[hsl(var(--foreground-muted))]">
                Key:{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  {setting.key}
                </code>
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${setting.key}-name`}>Display Name</Label>
                <Input
                  id={`${setting.key}-name`}
                  value={setting.name}
                  onChange={(e) =>
                    handleSettingChange(setting.key, "name", e.target.value)
                  }
                  placeholder="e.g., Concise"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${setting.key}-description`}>
                  Description
                </Label>
                <Input
                  id={`${setting.key}-description`}
                  value={setting.description}
                  onChange={(e) =>
                    handleSettingChange(
                      setting.key,
                      "description",
                      e.target.value
                    )
                  }
                  placeholder="e.g., 1-2 lines"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${setting.key}-instructions`}>
                  AI Instructions
                </Label>
                <Textarea
                  id={`${setting.key}-instructions`}
                  value={setting.instructions}
                  onChange={(e) =>
                    handleSettingChange(
                      setting.key,
                      "instructions",
                      e.target.value
                    )
                  }
                  placeholder="Instructions that will be sent to the AI for this length..."
                  rows={4}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  These instructions will be included in the AI prompt when
                  users select "{setting.name}" length.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasChanges && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            You have unsaved changes. Click "Save Changes" to apply your
            modifications.
          </p>
        </div>
      )}
    </div>
  );
};

export default LengthSettingsContent;
