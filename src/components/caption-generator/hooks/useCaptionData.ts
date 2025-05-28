import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
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
    if (!carId || mode !== "car") return;

    setLoadingCars(true);
    try {
      const response = await fetch(`/api/cars/${carId}`);
      if (!response.ok) throw new Error("Failed to fetch car details");

      const data = await response.json();
      setCarDetails(data);
      setSelectedCarIds([carId]);

      // Try to get client handle
      const clientId = data.client || data.clientId || data.clientInfo?._id;
      if (clientId) {
        const clientRes = await fetch(`/api/clients/${clientId}`);
        if (clientRes.ok) {
          const client = await clientRes.json();
          if (client.socialMedia?.instagram) {
            setClientHandle(
              `@${client.socialMedia.instagram.replace(/^@/, "")}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching car details:", error);
      toast.error("Failed to fetch car details");
    } finally {
      setLoadingCars(false);
    }
  }, [carId, mode]);

  // Fetch project cars (for project mode)
  const fetchProjectCars = useCallback(async () => {
    if (!projectId || mode !== "project") return;

    setLoadingCars(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/cars`);
      if (!response.ok) throw new Error("Failed to fetch project cars");

      const data = await response.json();
      setProjectCars(data.cars || []);
    } catch (error) {
      console.error("Error fetching project cars:", error);
      toast.error("Failed to fetch project cars");
    } finally {
      setLoadingCars(false);
    }
  }, [projectId, mode]);

  // Fetch project events
  const fetchProjectEvents = useCallback(async () => {
    if (!projectId || mode !== "project") return;

    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/events`);
      if (!response.ok) throw new Error("Failed to fetch project events");

      const data = await response.json();
      setProjectEvents(data || []);
    } catch (error) {
      console.error("Error fetching project events:", error);
      toast.error("Failed to fetch project events");
    } finally {
      setLoadingEvents(false);
    }
  }, [projectId, mode]);

  // Fetch system prompts
  const fetchSystemPrompts = useCallback(async (length?: string) => {
    setLoadingSystemPrompts(true);
    setSystemPromptError(null);

    try {
      const lengthParam = length ? `?length=${length}` : "";
      const response = await fetch(`/api/system-prompts/list${lengthParam}`);

      if (!response.ok) throw new Error("Failed to fetch system prompts");

      const data = await response.json();
      setSystemPrompts(Array.isArray(data) ? data : []);

      // Auto-select the first active system prompt
      const activePrompt = data.find((prompt: SystemPrompt) => prompt.isActive);
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
  }, []);

  // Fetch prompt templates
  const fetchPromptTemplates = useCallback(async () => {
    setLoadingPromptTemplates(true);
    try {
      const response = await fetch("/api/caption-prompts");
      if (!response.ok) throw new Error("Failed to fetch prompt templates");

      const data = await response.json();
      setPromptTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching prompt templates:", error);
      toast.error("Failed to fetch prompt templates");
    } finally {
      setLoadingPromptTemplates(false);
    }
  }, []);

  // Fetch length settings
  const fetchLengthSettings = useCallback(async () => {
    setLoadingLengthSettings(true);
    try {
      const response = await fetch("/api/length-settings");
      if (!response.ok) throw new Error("Failed to fetch length settings");

      const data = await response.json();
      setLengthSettings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching length settings:", error);
      toast.error("Failed to fetch length settings");
    } finally {
      setLoadingLengthSettings(false);
    }
  }, []);

  // Fetch saved captions
  const fetchSavedCaptions = useCallback(async () => {
    setLoadingSavedCaptions(true);
    try {
      const params = new URLSearchParams();
      if (carId && mode === "car") params.append("carId", carId);
      if (projectId && mode === "project")
        params.append("projectId", projectId);

      const response = await fetch(`/api/captions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch saved captions");

      const data = await response.json();
      setSavedCaptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching saved captions:", error);
      toast.error("Failed to fetch saved captions");
    } finally {
      setLoadingSavedCaptions(false);
    }
  }, [carId, projectId, mode]);

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
