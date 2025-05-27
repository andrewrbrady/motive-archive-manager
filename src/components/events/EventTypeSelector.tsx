"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useEventTypeSettings } from "@/hooks/useEventTypeSettings";
import { eventTypeCategories } from "@/types/eventType";
import * as LucideIcons from "lucide-react";

interface EventTypeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  filterByCategory?: string;
  className?: string;
  required?: boolean;
}

export function EventTypeSelector({
  value,
  onValueChange,
  label = "Event Type",
  placeholder = "Select event type",
  filterByCategory,
  className,
  required = false,
}: EventTypeSelectorProps) {
  const { eventTypeSettings, isLoading, error } = useEventTypeSettings();

  // Filter event types based on props
  const filteredEventTypes = eventTypeSettings.filter((setting) => {
    if (filterByCategory && setting.category !== filterByCategory) {
      return false;
    }
    return true;
  });

  // Group event types by category
  const groupedEventTypes = eventTypeCategories.reduce(
    (acc, category) => {
      const categoryTypes = filteredEventTypes.filter(
        (setting) => setting.category === category.key
      );
      if (categoryTypes.length > 0) {
        acc[category.key] = {
          category,
          types: categoryTypes,
        };
      }
      return acc;
    },
    {} as Record<
      string,
      {
        category: (typeof eventTypeCategories)[0];
        types: typeof filteredEventTypes;
      }
    >
  );

  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? (
      <IconComponent className="w-4 h-4 flex-shrink-0" />
    ) : null;
  };

  const selectedSetting = eventTypeSettings.find(
    (setting) => setting.key === value
  );

  if (isLoading) {
    return (
      <div className={className}>
        {label && (
          <Label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
            {label}
          </Label>
        )}
        <div className="flex items-center justify-center h-10 border rounded-md">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {label && (
          <Label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
            {label}
          </Label>
        )}
        <div className="text-sm text-red-600 p-2 border border-red-200 rounded-md">
          Error loading event types
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <Label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="mt-1 hover:bg-transparent hover:border-white">
          <SelectValue placeholder={placeholder}>
            {selectedSetting && (
              <div className="flex items-center gap-2">
                {getIcon(selectedSetting.icon)}
                <span>{selectedSetting.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedEventTypes).map(
            ([categoryKey, { category, types }]) => (
              <div key={categoryKey}>
                {/* Category Header */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
                  {category.name}
                </div>

                {/* Event Types in Category */}
                {types.map((setting) => (
                  <SelectItem key={setting.key} value={setting.key}>
                    <div className="flex items-center gap-2 w-full">
                      {getIcon(setting.icon)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{setting.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {setting.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </div>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
