import { useState, useEffect } from "react";
import { EventTypeSetting, defaultEventTypeSettings } from "@/types/eventType";
import { useAPI } from "@/lib/fetcher";

export const useEventTypeSettings = () => {
  const api = useAPI();
  const [eventTypeSettings, setEventTypeSettings] = useState<
    EventTypeSetting[]
  >(defaultEventTypeSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventTypeSettings();
  }, []);

  const fetchEventTypeSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get("/api/event-type-settings");
      setEventTypeSettings(data);
    } catch (err) {
      console.error("Error fetching event type settings:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Fallback to defaults on error
      setEventTypeSettings(defaultEventTypeSettings);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventTypeSetting = (key: string): EventTypeSetting | undefined => {
    return eventTypeSettings.find((setting) => setting.key === key);
  };

  const getEventTypesByCategory = (
    category: EventTypeSetting["category"]
  ): EventTypeSetting[] => {
    return eventTypeSettings.filter((setting) => setting.category === category);
  };

  const getEventTypeOptions = () => {
    return eventTypeSettings.map((setting) => ({
      value: setting.key,
      label: setting.name,
      icon: setting.icon,
      color: setting.color,
      description: setting.description,
      category: setting.category,
    }));
  };

  return {
    eventTypeSettings,
    isLoading,
    error,
    refetch: fetchEventTypeSettings,
    getEventTypeSetting,
    getEventTypesByCategory,
    getEventTypeOptions,
  };
};
