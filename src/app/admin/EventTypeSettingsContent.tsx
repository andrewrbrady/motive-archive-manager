"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Save, Plus, Trash2, RotateCcw } from "lucide-react";
import {
  EventTypeSetting,
  defaultEventTypeSettings,
  eventTypeCategories,
} from "@/types/eventType";
import { IconPicker, getIconComponent } from "@/components/ui/IconPicker";
import { useAPI } from "@/hooks/useAPI";

// Available color classes
const availableColors = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-yellow-100 text-yellow-800",
  "bg-red-100 text-red-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-800",
  "bg-gray-100 text-gray-800",
  "bg-cyan-100 text-cyan-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
];

const EventTypeSettingsContent: React.FC = () => {
  const [eventTypeSettings, setEventTypeSettings] = useState<
    EventTypeSetting[]
  >([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSetting, setNewSetting] = useState<EventTypeSetting>({
    key: "",
    name: "",
    description: "",
    icon: "Calendar",
    color: "bg-gray-100 text-gray-800",
    category: "other",
  });

  const api = useAPI();

  useEffect(() => {
    if (api) {
      fetchEventTypeSettings();
    }
  }, [api]);

  const fetchEventTypeSettings = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const data = (await api.get(
        "/api/event-type-settings"
      )) as EventTypeSetting[];
      setEventTypeSettings(data);
    } catch (error) {
      console.error("Error fetching event type settings:", error);
      toast({
        title: "Error",
        description: "Failed to load event type settings",
        variant: "destructive",
      });
      // Fallback to defaults
      setEventTypeSettings(defaultEventTypeSettings);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (
    key: string,
    field: keyof EventTypeSetting,
    value: string | boolean
  ) => {
    setEventTypeSettings((prev) =>
      prev.map((setting) => {
        if (setting.key === key) {
          const updatedSetting = { ...setting, [field]: value };
          // Auto-generate key from name
          if (field === "name" && typeof value === "string") {
            updatedSetting.key = value
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, "")
              .replace(/\s+/g, "_");
          }
          return updatedSetting;
        }
        return setting;
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!api) return;

    try {
      setIsSaving(true);
      await api.post("/api/event-type-settings", eventTypeSettings);

      setHasChanges(false);
      toast({
        title: "Success",
        description: "Event type settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving event type settings:", error);
      toast({
        title: "Error",
        description: "Failed to save event type settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEventTypeSettings(defaultEventTypeSettings);
    setHasChanges(true);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      icon: "Calendar",
      color: "bg-gray-100 text-gray-800",
      category: "other",
    });
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      icon: "Calendar",
      color: "bg-gray-100 text-gray-800",
      category: "other",
    });
  };

  const handleSaveNew = () => {
    if (!newSetting.key || !newSetting.name || !newSetting.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check if key already exists
    if (eventTypeSettings.some((setting) => setting.key === newSetting.key)) {
      toast({
        title: "Error",
        description: "An event type with this key already exists",
        variant: "destructive",
      });
      return;
    }

    setEventTypeSettings((prev) => [...prev, newSetting]);
    setHasChanges(true);
    setIsAddingNew(false);
    setNewSetting({
      key: "",
      name: "",
      description: "",
      icon: "Calendar",
      color: "bg-gray-100 text-gray-800",
      category: "other",
    });

    toast({
      title: "Success",
      description: "New event type added successfully",
    });
  };

  const handleDelete = async (keyToDelete: string) => {
    // Prevent deletion of core event types
    const coreTypes = [
      "auction_submission",
      "auction_listing",
      "auction_end",
      "inspection",
      "detail",
      "production",
      "post_production",
      "marketing",
      "pickup",
      "delivery",
      "other",
    ];
    if (coreTypes.includes(keyToDelete)) {
      toast({
        title: "Error",
        description: "Cannot delete core event types",
        variant: "destructive",
      });
      return;
    }

    setEventTypeSettings((prev) =>
      prev.filter((setting) => setting.key !== keyToDelete)
    );
    setHasChanges(true);
    toast({
      title: "Success",
      description: "Event type deleted successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            Event Type Settings
          </h1>
          <p className="text-[hsl(var(--foreground-muted))] mt-1">
            Manage event types, their appearance, and marketing relevance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNew} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Event Type
          </Button>
          <Button onClick={handleReset} variant="outline">
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

      {/* Add New Event Type Form */}
      {isAddingNew && (
        <Card className="mb-6 border-[hsl(var(--border))] bg-[hsl(var(--background))] dark:border-[hsl(var(--border))] dark:bg-[hsl(var(--background))]">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--foreground))] dark:text-white">
              Add New Event Type
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-name" className="text-sm font-medium">
                  Display Name
                </Label>
                <Input
                  id="new-name"
                  value={newSetting.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const key = name
                      .toLowerCase()
                      .replace(/[^a-z0-9\s]/g, "")
                      .replace(/\s+/g, "_");
                    setNewSetting((prev) => ({ ...prev, name, key }));
                  }}
                  placeholder="e.g., Custom Service, Special Event"
                  className="mt-1"
                />
                {newSetting.name && (
                  <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                    Key:{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                      {newSetting.key}
                    </code>
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="new-description"
                  className="text-sm font-medium"
                >
                  Description
                </Label>
                <Textarea
                  id="new-description"
                  value={newSetting.description}
                  onChange={(e) =>
                    setNewSetting((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief description of this event type..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="new-icon" className="text-sm font-medium">
                  Icon
                </Label>
                <IconPicker
                  selectedIcon={newSetting.icon}
                  onIconSelect={(iconName) =>
                    setNewSetting((prev) => ({ ...prev, icon: iconName }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="new-color" className="text-sm font-medium">
                  Color
                </Label>
                <Select
                  value={newSetting.color}
                  onValueChange={(value) =>
                    setNewSetting((prev) => ({ ...prev, color: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        <Badge className={color}>
                          {color
                            .split(" ")[0]
                            .replace("bg-", "")
                            .replace("-100", "")}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="new-category" className="text-sm font-medium">
                  Category
                </Label>
                <Select
                  value={newSetting.category}
                  onValueChange={(value: any) =>
                    setNewSetting((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeCategories.map((category) => (
                      <SelectItem key={category.key} value={category.key}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveNew}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Add Event Type
              </Button>
              <Button onClick={handleCancelAdd} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Type Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {eventTypeSettings.map((setting) => (
          <Card
            key={setting.key}
            className="border border-[hsl(var(--border))]"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-white">
                    {setting.name}
                  </CardTitle>
                </div>
                {![
                  "auction_submission",
                  "auction_listing",
                  "auction_end",
                  "inspection",
                  "detail",
                  "production",
                  "post_production",
                  "marketing",
                  "pickup",
                  "delivery",
                  "other",
                ].includes(setting.key) && (
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
                  placeholder="e.g., Production"
                />
                <p className="text-xs text-[hsl(var(--foreground-muted))]">
                  Key:{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                    {setting.key}
                  </code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${setting.key}-description`}>
                  Description
                </Label>
                <Textarea
                  id={`${setting.key}-description`}
                  value={setting.description}
                  onChange={(e) =>
                    handleSettingChange(
                      setting.key,
                      "description",
                      e.target.value
                    )
                  }
                  placeholder="Brief description of this event type..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${setting.key}-icon`}>Icon</Label>
                  <IconPicker
                    selectedIcon={setting.icon}
                    onIconSelect={(iconName) =>
                      handleSettingChange(setting.key, "icon", iconName)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${setting.key}-color`}>Color</Label>
                  <Select
                    value={setting.color}
                    onValueChange={(value) =>
                      handleSettingChange(setting.key, "color", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColors.map((color) => (
                        <SelectItem key={color} value={color}>
                          <Badge className={color}>
                            {color
                              .split(" ")[0]
                              .replace("bg-", "")
                              .replace("-100", "")}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${setting.key}-category`}>Category</Label>
                <Select
                  value={setting.category}
                  onValueChange={(value: any) =>
                    handleSettingChange(setting.key, "category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeCategories.map((category) => (
                      <SelectItem key={category.key} value={category.key}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventTypeSettingsContent;
