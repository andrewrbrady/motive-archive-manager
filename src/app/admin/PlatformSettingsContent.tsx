"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save, RotateCcw, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { IconPicker, getIconComponent } from "@/components/ui/IconPicker";
import { useAPI } from "@/hooks/useAPI";

interface PlatformSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
  icon?: string;
}

const defaultPlatformSettings: PlatformSetting[] = [
  {
    key: "instagram",
    name: "Instagram",
    description: "Photo and video sharing",
    instructions:
      "Create engaging captions for Instagram posts. Focus on visual storytelling, use relevant hashtags, and encourage engagement. Keep it authentic and visually appealing.",
    icon: "Instagram",
  },
  {
    key: "youtube",
    name: "YouTube",
    description: "Video content platform",
    instructions:
      "Write compelling descriptions for YouTube videos. Include key details about the content, encourage viewers to like and subscribe, and optimize for search with relevant keywords.",
    icon: "Youtube",
  },
  {
    key: "twitter",
    name: "Twitter/X",
    description: "Microblogging platform",
    instructions:
      "Create concise, impactful posts for Twitter/X. Keep within character limits, use relevant hashtags sparingly, and encourage retweets and engagement.",
    icon: "Twitter",
  },
  {
    key: "facebook",
    name: "Facebook",
    description: "Social networking",
    instructions:
      "Write engaging Facebook posts that encourage discussion and sharing. Use a conversational tone and include calls-to-action to boost engagement.",
    icon: "Facebook",
  },
  {
    key: "threads",
    name: "Threads",
    description: "Text-based conversations",
    instructions:
      "Create authentic, conversation-starting content for Threads. Focus on community engagement and meaningful discussions around the automotive content.",
    icon: "MessageCircle",
  },
];

const PlatformSettingsContent: React.FC = () => {
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>(
    defaultPlatformSettings
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSetting, setNewSetting] = useState<PlatformSetting>({
    key: "",
    name: "",
    description: "",
    instructions: "",
    icon: "",
  });

  const api = useAPI();

  useEffect(() => {
    if (api) {
      fetchPlatformSettings();
    }
  }, [api]);

  const fetchPlatformSettings = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const data = (await api.get(
        "/api/admin/platform-settings"
      )) as PlatformSetting[];
      setPlatformSettings(data.length > 0 ? data : defaultPlatformSettings);
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      setPlatformSettings(defaultPlatformSettings);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (
    key: string,
    field: keyof PlatformSetting,
    value: string
  ) => {
    setPlatformSettings((prev) =>
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
      await api.post("/api/admin/platform-settings", platformSettings);

      setHasChanges(false);
      toast({
        title: "Success",
        description: "Platform settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving platform settings:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save platform settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPlatformSettings(defaultPlatformSettings);
    setHasChanges(true);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      instructions: "",
      icon: "",
    });
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      instructions: "",
      icon: "",
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
        description: "All fields are required for a new platform setting",
        variant: "destructive",
      });
      return;
    }

    // Check if key already exists
    if (platformSettings.some((setting) => setting.key === newSetting.key)) {
      toast({
        title: "Error",
        description: "A platform setting with this key already exists",
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

    setPlatformSettings((prev) => [...prev, newSetting]);
    setHasChanges(true);
    setIsAddingNew(false);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      instructions: "",
      icon: "",
    });

    toast({
      title: "Success",
      description: "New platform setting added. Don't forget to save!",
    });
  };

  const handleDelete = async (keyToDelete: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the "${keyToDelete}" platform setting?`
      )
    ) {
      return;
    }

    try {
      // Remove from local state immediately for better UX
      setPlatformSettings((prev) =>
        prev.filter((setting) => setting.key !== keyToDelete)
      );
      setHasChanges(true);

      toast({
        title: "Success",
        description: "Platform setting removed. Don't forget to save!",
      });
    } catch (error) {
      console.error("Error deleting platform setting:", error);
      toast({
        title: "Error",
        description: "Failed to delete platform setting",
        variant: "destructive",
      });
      // Refresh to restore state
      fetchPlatformSettings();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Platform Settings</h2>
          <p className="text-muted-foreground">
            Configure available platforms for caption generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button
            variant="outline"
            onClick={handleAddNew}
            disabled={isSaving || isAddingNew}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Platform
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Add New Platform Form */}
      {isAddingNew && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Add New Platform</CardTitle>
            <CardDescription>
              Create a new platform configuration for caption generation
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-key">Platform Key</Label>
                <Input
                  id="new-key"
                  value={newSetting.key}
                  onChange={(e) =>
                    setNewSetting((prev) => ({ ...prev, key: e.target.value }))
                  }
                  placeholder="e.g., tiktok"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (letters, numbers, underscores only)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Display Name</Label>
                <Input
                  id="new-name"
                  value={newSetting.name}
                  onChange={(e) =>
                    setNewSetting((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., TikTok"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-description">Description</Label>
                <Input
                  id="new-description"
                  value={newSetting.description}
                  onChange={(e) =>
                    setNewSetting((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g., Short-form video content"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-icon">Icon</Label>
                <IconPicker
                  selectedIcon={newSetting.icon}
                  onIconSelect={(iconName) =>
                    setNewSetting((prev) => ({ ...prev, icon: iconName }))
                  }
                  placeholder="Choose an icon"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-instructions">Instructions</Label>
              <Textarea
                id="new-instructions"
                value={newSetting.instructions}
                onChange={(e) =>
                  setNewSetting((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
                placeholder="Detailed instructions for creating content for this platform..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveNew}>Add Platform</Button>
              <Button variant="outline" onClick={handleCancelAdd}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Platform Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {platformSettings.map((setting) => (
          <Card key={setting.key}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {setting.icon &&
                    (() => {
                      const IconComponent = getIconComponent(setting.icon);
                      return IconComponent ? (
                        <IconComponent className="h-5 w-5" />
                      ) : null;
                    })()}
                  <div>
                    <CardTitle className="text-lg">{setting.name}</CardTitle>
                    <CardDescription>Key: {setting.key}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(setting.key)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${setting.key}`}>Display Name</Label>
                  <Input
                    id={`name-${setting.key}`}
                    value={setting.name}
                    onChange={(e) =>
                      handleSettingChange(setting.key, "name", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`description-${setting.key}`}>
                    Description
                  </Label>
                  <Input
                    id={`description-${setting.key}`}
                    value={setting.description}
                    onChange={(e) =>
                      handleSettingChange(
                        setting.key,
                        "description",
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`icon-${setting.key}`}>Icon</Label>
                <IconPicker
                  selectedIcon={setting.icon}
                  onIconSelect={(iconName) =>
                    handleSettingChange(setting.key, "icon", iconName)
                  }
                  placeholder="Choose an icon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`instructions-${setting.key}`}>
                  Instructions
                </Label>
                <Textarea
                  id={`instructions-${setting.key}`}
                  value={setting.instructions}
                  onChange={(e) =>
                    handleSettingChange(
                      setting.key,
                      "instructions",
                      e.target.value
                    )
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {platformSettings.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No platform settings configured. Add a platform to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlatformSettingsContent;
