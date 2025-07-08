import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
import type {
  CarDetails,
  EventDetails,
  SystemPrompt,
  PromptTemplate,
  LengthSetting,
  SavedCaption,
} from "../types";

interface UseCaptionDataProps {
  carId?: string;
  projectId?: string;
  mode?: "car" | "project";
}

export function useCaptionData({
  carId,
  projectId,
  mode = "car",
}: UseCaptionDataProps) {
  const api = useAPI();

  // Car data
  const [carDetails, setCarDetails] = useState<CarDetails | null>(null);
  const [projectCars, setProjectCars] = useState<CarDetails[]>([]);
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);

  // Event data
  const [projectEvents, setProjectEvents] = useState<EventDetails[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [eventDetails, setEventDetails] = useState<EventDetails[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // System prompt data
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<
    string | null
  >(null);
  const [loadingSystemPrompts, setLoadingSystemPrompts] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(
    null
  );

  // Prompt template data
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [loadingPromptTemplates, setLoadingPromptTemplates] = useState(false);

  // Length settings
  const [lengthSettings, setLengthSettings] = useState<LengthSetting[]>([]);
  const [loadingLengthSettings, setLoadingLengthSettings] = useState(false);

  // Saved captions
  const [savedCaptions, setSavedCaptions] = useState<SavedCaption[]>([]);
  const [loadingSavedCaptions, setLoadingSavedCaptions] = useState(false);

  // Client handle
  const [clientHandle, setClientHandle] = useState<string | null>(null);

  // Data filtering options
  const [useMinimalCarData, setUseMinimalCarData] = useState(false);

  // LLM Preview
  const [showPreview, setShowPreview] = useState(false);
  const [editableLLMText, setEditableLLMText] = useState("");

  // Fetch car details (for single car mode)
  const fetchCarDetails = useCallback(async () => {
    if (!carId || mode !== "car" || !api) return;

    setLoadingCars(true);
    try {
      const data = (await api.get(`cars/${carId}`)) as CarDetails & {
        client?: string;
        clientId?: string;
        clientInfo?: { _id: string };
      };
      setCarDetails(data);
      setSelectedCarIds([carId]);

      // Try to get client handle
      const clientId = data.client || data.clientId || data.clientInfo?._id;
      if (clientId) {
        try {
          const client = (await api.get(`clients/${clientId}`)) as any;
          if (client.socialMedia?.instagram) {
            setClientHandle(
              `@${client.socialMedia.instagram.replace(/^@/, "")}`
            );
          }
        } catch (clientError) {
          console.error("Error fetching client:", clientError);
          setClientHandle(null);
        }
      }
    } catch (error) {
      console.error("Error fetching car details:", error);
      toast.error("Failed to fetch car details");
    } finally {
      setLoadingCars(false);
    }
  }, [carId, mode, api]);

  // Fetch project cars (for project mode)
  const fetchProjectCars = useCallback(async () => {
    if (!projectId || mode !== "project" || !api) return;

    setLoadingCars(true);
    try {
      const data = (await api.get(`projects/${projectId}/cars`)) as {
        cars?: CarDetails[];
      };
      setProjectCars(data.cars || []);
    } catch (error) {
      console.error("Error fetching project cars:", error);
      toast.error("Failed to fetch project cars");
    } finally {
      setLoadingCars(false);
    }
  }, [projectId, mode, api]);

  // Fetch project events
  const fetchProjectEvents = useCallback(async () => {
    if (!projectId || mode !== "project" || !api) return;

    setLoadingEvents(true);
    try {
      const data = (await api.get(
        `projects/${projectId}/events`
      )) as EventDetails[];
      setProjectEvents(data || []);
    } catch (error) {
      console.error("Error fetching project events:", error);
      toast.error("Failed to fetch project events");
    } finally {
      setLoadingEvents(false);
    }
  }, [projectId, mode, api]);

  // Fetch system prompts
  const fetchSystemPrompts = useCallback(
    async (length?: string) => {
      if (!api) return;

      setLoadingSystemPrompts(true);
      setSystemPromptError(null);

      try {
        const endpoint = length
          ? `system-prompts/list?length=${length}`
          : "system-prompts/list";
        const data = (await api.get(endpoint)) as SystemPrompt[];
        setSystemPrompts(Array.isArray(data) ? data : []);

        // Auto-select the first active system prompt
        const activePrompt = data.find(
          (prompt: SystemPrompt) => prompt.isActive
        );
        if (activePrompt) {
          setSelectedSystemPromptId(activePrompt._id);
        } else if (data.length > 0) {
          setSelectedSystemPromptId(data[0]._id);
        }
      } catch (error) {
        console.error("Error fetching system prompts:", error);
        setSystemPromptError("Failed to load system prompts");
        toast.error("Failed to fetch system prompts");
      } finally {
        setLoadingSystemPrompts(false);
      }
    },
    [api]
  );

  // Fetch prompt templates
  const fetchPromptTemplates = useCallback(async () => {
    if (!api) return;

    setLoadingPromptTemplates(true);
    try {
      const data = (await api.get("caption-prompts")) as PromptTemplate[];
      setPromptTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching prompt templates:", error);
      toast.error("Failed to fetch prompt templates");
    } finally {
      setLoadingPromptTemplates(false);
    }
  }, [api]);

  // Fetch length settings
  const fetchLengthSettings = useCallback(async () => {
    if (!api) return;

    setLoadingLengthSettings(true);
    try {
      const data = (await api.get("length-settings")) as LengthSetting[];
      setLengthSettings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching length settings:", error);
      toast.error("Failed to fetch length settings");
    } finally {
      setLoadingLengthSettings(false);
    }
  }, [api]);

  // Fetch saved captions
  const fetchSavedCaptions = useCallback(async () => {
    if (!api) return;

    setLoadingSavedCaptions(true);
    try {
      const params = new URLSearchParams();
      if (carId && mode === "car") params.append("carId", carId);
      if (projectId && mode === "project")
        params.append("projectId", projectId);

      const data = (await api.get(
        `captions?${params.toString()}`
      )) as SavedCaption[];
      setSavedCaptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching saved captions:", error);
      toast.error("Failed to fetch saved captions");
    } finally {
      setLoadingSavedCaptions(false);
    }
  }, [carId, projectId, mode, api]);

  // Car selection handlers
  const handleCarSelection = useCallback((carIds: string[]) => {
    setSelectedCarIds(carIds);
  }, []);

  const handleSelectAllCars = useCallback(() => {
    if (mode === "project") {
      setSelectedCarIds(projectCars.map((car) => car._id));
    } else if (carDetails) {
      setSelectedCarIds([carDetails._id]);
    }
  }, [mode, projectCars, carDetails]);

  // Event selection handlers
  const handleEventSelection = useCallback(
    (eventIds: string[]) => {
      setSelectedEventIds(eventIds);
      // Update event details based on selection
      const selectedEvents = projectEvents.filter((event) =>
        eventIds.includes(event.id)
      );
      setEventDetails(selectedEvents);
    },
    [projectEvents]
  );

  const handleSelectAllEvents = useCallback(() => {
    const allEventIds = projectEvents.map((event) => event.id);
    setSelectedEventIds(allEventIds);
    setEventDetails(projectEvents);
  }, [projectEvents]);

  // System prompt handler
  const handleSystemPromptChange = useCallback((promptId: string) => {
    setSelectedSystemPromptId(promptId);
  }, []);

  // Data filtering handlers
  const handleUseMinimalCarDataChange = useCallback((value: boolean) => {
    setUseMinimalCarData(value);
  }, []);

  // LLM Preview handlers
  const handleShowPreviewToggle = useCallback((value: boolean) => {
    setShowPreview(value);
  }, []);

  const handleRefreshLLMText = useCallback(() => {
    // Build LLM text based on current selections
    const llmText = buildLLMText();
    setEditableLLMText(llmText);
  }, []);

  const buildLLMText = useCallback(() => {
    // Implementation for building LLM text from selected data
    let text = "";

    if (selectedCarIds.length > 0) {
      const cars =
        mode === "project"
          ? projectCars.filter((car) => selectedCarIds.includes(car._id))
          : carDetails
            ? [carDetails]
            : [];

      text += "Cars:\n";
      cars.forEach((car) => {
        text += `- ${car.year} ${car.make} ${car.model}${car.color ? ` (${car.color})` : ""}\n`;
      });
      text += "\n";
    }

    if (selectedEventIds.length > 0 && eventDetails.length > 0) {
      text += "Events:\n";
      eventDetails.forEach((event) => {
        text += `- ${event.title}: ${event.description}\n`;
      });
      text += "\n";
    }

    return text;
  }, [
    selectedCarIds,
    selectedEventIds,
    eventDetails,
    carDetails,
    projectCars,
    mode,
  ]);

  // Initialize data on mount
  useEffect(() => {
    if (!api) return;

    if (mode === "car" && carId) {
      fetchCarDetails();
    } else if (mode === "project" && projectId) {
      fetchProjectCars();
      fetchProjectEvents();
    }

    fetchSystemPrompts();
    fetchPromptTemplates();
    fetchLengthSettings();
    fetchSavedCaptions();
  }, [
    api,
    mode,
    carId,
    projectId,
    fetchCarDetails,
    fetchProjectCars,
    fetchProjectEvents,
    fetchSystemPrompts,
    fetchPromptTemplates,
    fetchLengthSettings,
    fetchSavedCaptions,
  ]);

  return {
    // Car data
    carDetails,
    projectCars,
    selectedCarIds,
    loadingCars,
    handleCarSelection,
    handleSelectAllCars,

    // Event data
    projectEvents,
    selectedEventIds,
    eventDetails,
    loadingEvents,
    handleEventSelection,
    handleSelectAllEvents,

    // System prompt data
    systemPrompts,
    selectedSystemPromptId,
    loadingSystemPrompts,
    systemPromptError,
    handleSystemPromptChange,

    // Prompt template data
    promptTemplates,
    loadingPromptTemplates,

    // Length settings
    lengthSettings,
    loadingLengthSettings,

    // Saved captions
    savedCaptions,
    loadingSavedCaptions,

    // Client handle
    clientHandle,
    setClientHandle,

    // Data filtering
    useMinimalCarData,
    handleUseMinimalCarDataChange,

    // LLM Preview
    showPreview,
    editableLLMText,
    setEditableLLMText,
    handleShowPreviewToggle,
    handleRefreshLLMText,
    buildLLMText,

    // Refetch functions
    refetchCars: mode === "car" ? fetchCarDetails : fetchProjectCars,
    refetchEvents: fetchProjectEvents,
    refetchSystemPrompts: fetchSystemPrompts,
    refetchPromptTemplates: fetchPromptTemplates,
    refetchLengthSettings: fetchLengthSettings,
    refetchCaptions: fetchSavedCaptions,
  };
}
