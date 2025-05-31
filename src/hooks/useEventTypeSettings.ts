import { useState, useEffect } from "react";
import { EventTypeSetting, defaultEventTypeSettings } from "@/types/eventType";
import { useAPIQuery } from "@/hooks/useAPIQuery";

export const useEventTypeSettings = () => {
  const {
    data: eventTypeSettings,
    isLoading,
    error,
    refetch,
  } = useAPIQuery<EventTypeSetting[]>("/api/event-type-settings", {
    // Use default settings as initial data
    initialData: defaultEventTypeSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes - event type settings don't change often
  });

  const getEventTypeSetting = (key: string): EventTypeSetting | undefined => {
    return eventTypeSettings?.find((setting) => setting.key === key);
  };

  const getEventTypesByCategory = (
    category: EventTypeSetting["category"]
  ): EventTypeSetting[] => {
    return (
      eventTypeSettings?.filter((setting) => setting.category === category) ||
      []
    );
  };

  const getEventTypeOptions = () => {
    return (
      eventTypeSettings?.map((setting) => ({
        value: setting.key,
        label: setting.name,
        icon: setting.icon,
        color: setting.color,
        description: setting.description,
        category: setting.category,
      })) || []
    );
  };

  return {
    eventTypeSettings: eventTypeSettings || defaultEventTypeSettings,
    isLoading,
    error,
    refetch,
    getEventTypeSetting,
    getEventTypesByCategory,
    getEventTypeOptions,
  };
};
