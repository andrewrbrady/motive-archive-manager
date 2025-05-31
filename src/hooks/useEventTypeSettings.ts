import { useState, useEffect } from "react";
import { EventTypeSetting, defaultEventTypeSettings } from "@/types/eventType";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAuthenticatedFetch } from "@/hooks/useFirebaseAuth";

export const useEventTypeSettings = () => {
  const { data: session, status } = useSession();
  const { authenticatedFetch, isAuthenticated, hasValidToken } =
    useAuthenticatedFetch();
  const [eventTypeSettings, setEventTypeSettings] = useState<
    EventTypeSetting[]
  >(defaultEventTypeSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch when we have proper authentication
    if (
      status === "authenticated" &&
      session?.user &&
      isAuthenticated &&
      hasValidToken
    ) {
      fetchEventTypeSettings();
    } else if (status === "unauthenticated") {
      // If not authenticated, just use defaults and stop loading
      setIsLoading(false);
    }
    // Still loading authentication - keep isLoading true
  }, [status, session, isAuthenticated, hasValidToken]);

  const fetchEventTypeSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authenticatedFetch("/api/event-type-settings");
      if (!response.ok) {
        throw new Error("Failed to fetch event type settings");
      }
      const data = await response.json();
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
