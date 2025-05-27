import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  ProjectCar,
  ProjectEvent,
  SystemPrompt,
  LengthSetting,
  SavedCaption,
  PromptTemplate,
  Platform,
  Tone,
  Style,
  Template,
} from "./types";
import type { BaTCarDetails } from "@/types/car-page";

interface UseProjectDataProps {
  projectId: string;
}

export function useProjectData({ projectId }: UseProjectDataProps) {
  // Car-related state
  const [projectCars, setProjectCars] = useState<ProjectCar[]>([]);
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [carDetails, setCarDetails] = useState<BaTCarDetails[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);

  // Event-related state
  const [projectEvents, setProjectEvents] = useState<ProjectEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [eventDetails, setEventDetails] = useState<ProjectEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // System prompt state
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] =
    useState<string>("");
  const [loadingSystemPrompts, setLoadingSystemPrompts] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(
    null
  );

  // Length settings state
  const [lengthSettings, setLengthSettings] = useState<LengthSetting[]>([]);

  // Prompt template state
  const [promptList, setPromptList] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(
    null
  );
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Generation settings state
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [template, setTemplate] = useState<Template>("none");
  const [context, setContext] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [style, setStyle] = useState<Style>("descriptive");
  const [model, setModel] = useState<string>("claude-3-5-sonnet-20241022");
  const [provider, setProvider] = useState<string>("anthropic");
  const [temperature, setTemperature] = useState(1.0);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Data filtering options
  const [useMinimalCarData, setUseMinimalCarData] = useState(false);

  // LLM Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [editableLLMText, setEditableLLMText] = useState<string>("");

  // Saved captions state
  const [savedCaptions, setSavedCaptions] = useState<SavedCaption[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const fetchProjectCars = async () => {
    try {
      setLoadingCars(true);
      const response = await fetch(`/api/projects/${projectId}/cars`);

      if (!response.ok) {
        throw new Error("Failed to fetch project cars");
      }

      const data = await response.json();
      setProjectCars(data.cars || []);

      // Auto-select all cars if none are selected
      if (data.cars && data.cars.length > 0 && selectedCarIds.length === 0) {
        setSelectedCarIds(data.cars.map((car: ProjectCar) => car._id));
      }
    } catch (error) {
      console.error("Error fetching project cars:", error);
      toast({
        title: "Error",
        description: "Failed to load project cars",
        variant: "destructive",
      });
    } finally {
      setLoadingCars(false);
    }
  };

  const fetchCarDetails = async () => {
    try {
      const carDetailsPromises = selectedCarIds.map(async (carId) => {
        const response = await fetch(`/api/cars/${carId}`);
        if (!response.ok) throw new Error(`Failed to fetch car ${carId}`);
        return response.json();
      });

      const details = await Promise.all(carDetailsPromises);
      setCarDetails(details);
    } catch (error) {
      console.error("Error fetching car details:", error);
      toast({
        title: "Error",
        description: "Failed to load car details",
        variant: "destructive",
      });
    }
  };

  const fetchProjectEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await fetch(`/api/projects/${projectId}/events`);

      if (!response.ok) {
        throw new Error("Failed to fetch project events");
      }

      const data = await response.json();
      setProjectEvents(data || []);
    } catch (error) {
      console.error("Error fetching project events:", error);
      toast({
        title: "Error",
        description: "Failed to load project events",
        variant: "destructive",
      });
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchEventDetails = async () => {
    try {
      const eventDetailsData = selectedEventIds
        .map((eventId) => {
          return projectEvents.find((event) => event.id === eventId);
        })
        .filter(Boolean) as ProjectEvent[];

      setEventDetails(eventDetailsData);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
    }
  };

  const fetchSystemPrompts = async () => {
    try {
      setLoadingSystemPrompts(true);
      setSystemPromptError(null);

      const response = await fetch(
        `/api/system-prompts/list?type=project_caption`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch system prompts");
      }

      const data = await response.json();
      setSystemPrompts(Array.isArray(data) ? data : []);

      // Auto-select the first active system prompt if available
      const activePrompt = data.find((prompt: any) => prompt.isActive);
      if (activePrompt) {
        setSelectedSystemPromptId(activePrompt._id);
      } else if (data.length > 0) {
        setSelectedSystemPromptId(data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching system prompts:", error);
      setSystemPromptError("Failed to load system prompts");
    } finally {
      setLoadingSystemPrompts(false);
    }
  };

  const fetchLengthSettings = async () => {
    try {
      const response = await fetch("/api/length-settings");

      if (!response.ok) {
        throw new Error("Failed to fetch length settings");
      }

      const data = await response.json();
      setLengthSettings(data);
    } catch (error) {
      console.error("Error fetching length settings:", error);
    }
  };

  const fetchPromptTemplates = async () => {
    try {
      setPromptLoading(true);
      setPromptError(null);
      const response = await fetch("/api/caption-prompts");

      if (!response.ok) {
        throw new Error("Failed to fetch prompt templates");
      }

      const data = await response.json();
      setPromptList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching prompt templates:", error);
      setPromptError("Failed to fetch prompts");
    } finally {
      setPromptLoading(false);
    }
  };

  const fetchProjectCaptions = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/captions`);
      if (!response.ok) {
        throw new Error("Failed to fetch project captions");
      }
      const captions = await response.json();
      setSavedCaptions(captions);
    } catch (err) {
      console.error("Error fetching project captions:", err);
    }
  };

  // Fetch project data when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchProjectCars();
      fetchProjectEvents();
      fetchProjectCaptions();
    }
  }, [projectId]);

  // Fetch system prompts when component mounts
  useEffect(() => {
    fetchSystemPrompts();
  }, []);

  // Fetch length settings when component mounts
  useEffect(() => {
    fetchLengthSettings();
  }, []);

  // Fetch prompt templates when component mounts
  useEffect(() => {
    fetchPromptTemplates();
  }, []);

  // Fetch detailed car information when selected cars change
  useEffect(() => {
    if (selectedCarIds.length > 0) {
      fetchCarDetails();
    } else {
      setCarDetails([]);
    }
  }, [selectedCarIds]);

  // Fetch detailed event information when selected events change
  useEffect(() => {
    if (selectedEventIds.length > 0) {
      fetchEventDetails();
    } else {
      setEventDetails([]);
    }
  }, [selectedEventIds]);

  // Update form values when selectedPrompt changes
  useEffect(() => {
    if (selectedPrompt) {
      setContext(selectedPrompt.prompt || "");
      setTone((selectedPrompt.tone as Tone) || "professional");
      setStyle((selectedPrompt.style as Style) || "descriptive");
      setModel(selectedPrompt.aiModel || "claude-3-5-sonnet-20241022");
      setProvider(selectedPrompt.llmProvider || "anthropic");
      setTemperature(selectedPrompt.modelParams?.temperature || 1.0);
      setPlatform((selectedPrompt.platform as Platform) || "instagram");
    }
  }, [selectedPrompt]);

  const handleCarSelection = (carId: string) => {
    setSelectedCarIds((prev) => {
      if (prev.includes(carId)) {
        return prev.filter((id) => id !== carId);
      } else {
        return [...prev, carId];
      }
    });
  };

  const handleSelectAllCars = () => {
    if (selectedCarIds.length === projectCars.length) {
      setSelectedCarIds([]);
    } else {
      setSelectedCarIds(projectCars.map((car) => car._id));
    }
  };

  const handleEventSelection = (eventId: string) => {
    setSelectedEventIds((prev) => {
      if (prev.includes(eventId)) {
        return prev.filter((id) => id !== eventId);
      } else {
        return [...prev, eventId];
      }
    });
  };

  const handleSelectAllEvents = () => {
    if (selectedEventIds.length === projectEvents.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(projectEvents.map((event) => event.id));
    }
  };

  const handleSystemPromptChange = (promptId: string) => {
    setSelectedSystemPromptId(promptId);
  };

  const handlePromptChange = (promptId: string) => {
    if (promptId === "__PROMPT_NONE__") {
      setSelectedPrompt(null);
      setContext("");
      setTone("professional");
      setStyle("descriptive");
      setModel("claude-3-5-sonnet-20241022");
      setProvider("anthropic");
      return;
    }
    const found = promptList.find((p) => p._id === promptId);
    setSelectedPrompt(found || null);
  };

  const buildLLMText = (
    derivedLengthParam?: any,
    formStateParams?: {
      platform?: string;
      tone?: string;
      style?: string;
      template?: string;
      context?: string;
      additionalContext?: string;
    }
  ) => {
    // Use the parameter if provided, otherwise fall back to the prop
    const lengthToUse = derivedLengthParam;

    // Use form state parameters if provided, otherwise fall back to local state
    const platformToUse = formStateParams?.platform || platform;
    const toneToUse = formStateParams?.tone || tone;
    const styleToUse = formStateParams?.style || style;
    const templateToUse = formStateParams?.template || template;
    const contextToUse = formStateParams?.context || context;
    const additionalContextToUse =
      formStateParams?.additionalContext || additionalContext;

    if (!selectedSystemPromptId) {
      return "Please select a system prompt to generate LLM input.";
    }

    const systemPrompt = systemPrompts.find(
      (p) => p._id === selectedSystemPromptId
    );
    if (!systemPrompt) {
      return "System prompt not found. Please select a valid system prompt.";
    }

    let llmText = "";

    // User context - this is what gets sent as the user prompt
    llmText += "USER PROMPT (what gets sent to LLM):\n\n";

    // Base context from selected prompt template
    if (contextToUse) {
      llmText += "ADDITIONAL INSTRUCTIONS:\n" + contextToUse + "\n\n";
    }

    // Additional context
    if (additionalContextToUse) {
      llmText += "ADDITIONAL CONTEXT:\n" + additionalContextToUse + "\n\n";
    }

    // Copywriting requirements - moved to top for better visibility
    llmText += "COPYWRITING REQUIREMENTS:\n";
    llmText += `- Platform: ${platformToUse}\n`;
    llmText += `- Tone: ${toneToUse}\n`;
    llmText += `- Style: ${styleToUse}\n`;
    llmText += `- Length: ${lengthToUse?.key || "Will be selected during generation"}\n`;

    if (templateToUse && templateToUse !== "none") {
      llmText += `- Template: ${templateToUse}\n`;
    }

    // Length instructions (if available)
    if (lengthToUse) {
      llmText += "\nLENGTH INSTRUCTIONS:\n";
      llmText += lengthToUse.instructions + "\n";
    }

    llmText += "\n";

    // Car details - show full details like what's sent to the API
    if (selectedCarIds.length > 0 && carDetails.length > 0) {
      llmText += "VEHICLE PROJECT SPECIFICATIONS:\n";

      // Combined car details summary
      const combinedCarDetails = {
        cars: carDetails,
        count: carDetails.length,
        makes: [...new Set(carDetails.map((car) => car.make))],
        years: [...new Set(carDetails.map((car) => car.year))].sort(),
        colors: [
          ...new Set(carDetails.map((car) => car.color).filter(Boolean)),
        ],
      };

      llmText += `Total Cars: ${combinedCarDetails.count}\n`;
      llmText += `Makes: ${combinedCarDetails.makes.join(", ")}\n`;
      llmText += `Years: ${combinedCarDetails.years.join(", ")}\n`;
      if (combinedCarDetails.colors.length > 0) {
        llmText += `Colors: ${combinedCarDetails.colors.join(", ")}\n`;
      }
      llmText += "\nIndividual Car Details:\n";

      carDetails.forEach((car, index) => {
        llmText += `\nCar ${index + 1}:\n`;
        llmText += `  Make: ${car.make || "N/A"}\n`;
        llmText += `  Model: ${car.model || "N/A"}\n`;
        llmText += `  Year: ${car.year || "N/A"}\n`;
        if (car.color) llmText += `  Color: ${car.color}\n`;
        if (car.vin) llmText += `  VIN: ${car.vin}\n`;
        if (car.mileage)
          llmText += `  Mileage: ${car.mileage.value} ${car.mileage.unit}\n`;
        if (car.engine?.type) llmText += `  Engine Type: ${car.engine.type}\n`;
        if (car.engine?.displacement)
          llmText += `  Engine Displacement: ${car.engine.displacement.value} ${car.engine.displacement.unit}\n`;
        if (car.engine?.power?.hp)
          llmText += `  Engine Power: ${car.engine.power.hp} HP\n`;
        if (car.transmission?.type)
          llmText += `  Transmission: ${car.transmission.type}\n`;
        if (car.interior_color)
          llmText += `  Interior Color: ${car.interior_color}\n`;
        if (car.interior_features?.seats)
          llmText += `  Seats: ${car.interior_features.seats}\n`;
        if (car.interior_features?.upholstery)
          llmText += `  Upholstery: ${car.interior_features.upholstery}\n`;
        if (car.condition) llmText += `  Condition: ${car.condition}\n`;
        if (car.description && !useMinimalCarData)
          llmText += `  Description: ${car.description}\n`;
      });
      llmText += "\n";
    } else if (selectedCarIds.length > 0) {
      llmText += "VEHICLE PROJECT SPECIFICATIONS:\n";
      llmText += "Car details are loading...\n\n";
    }

    // Event details - show full details like what's sent to the API
    if (selectedEventIds.length > 0 && eventDetails.length > 0) {
      llmText += "PROJECT EVENT SPECIFICATIONS:\n";

      // Combined event details summary
      const combinedEventDetails = {
        events: eventDetails,
        count: eventDetails.length,
        types: [...new Set(eventDetails.map((event) => event.type))],
        statuses: [...new Set(eventDetails.map((event) => event.status))],
        upcomingEvents: eventDetails.filter(
          (event) => new Date(event.start) > new Date()
        ),
        pastEvents: eventDetails.filter(
          (event) => new Date(event.start) <= new Date()
        ),
      };

      llmText += `Total Events: ${combinedEventDetails.count}\n`;
      llmText += `Event Types: ${combinedEventDetails.types.join(", ")}\n`;
      llmText += `Event Statuses: ${combinedEventDetails.statuses.join(", ")}\n`;
      llmText += `Upcoming Events: ${combinedEventDetails.upcomingEvents.length}\n`;
      llmText += `Past Events: ${combinedEventDetails.pastEvents.length}\n`;
      llmText += "\nIndividual Event Details:\n";

      eventDetails.forEach((event, index) => {
        const eventDate = new Date(event.start);
        const isUpcoming = eventDate > new Date();

        llmText += `\nEvent ${index + 1}:\n`;
        llmText += `  Title: ${event.title}\n`;
        llmText += `  Type: ${event.type}\n`;
        llmText += `  Status: ${event.status}\n`;
        llmText += `  Start Date: ${eventDate.toLocaleDateString()} ${eventDate.toLocaleTimeString()}\n`;
        if (event.end) {
          const endDate = new Date(event.end);
          llmText += `  End Date: ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}\n`;
        }
        llmText += `  Timing: ${isUpcoming ? "Upcoming" : "Past"}\n`;
        if (event.description)
          llmText += `  Description: ${event.description}\n`;
        if (event.isAllDay) llmText += `  All Day Event: Yes\n`;
        if (event.locationId) llmText += `  Location ID: ${event.locationId}\n`;
        if (event.teamMemberIds && event.teamMemberIds.length > 0) {
          llmText += `  Team Members: ${event.teamMemberIds.length} assigned\n`;
        }
      });
      llmText += "\n";
    } else if (selectedEventIds.length > 0) {
      llmText += "PROJECT EVENT SPECIFICATIONS:\n";
      llmText += "Event details are loading...\n\n";
    }

    llmText += "Generate a caption that follows the requirements above.";

    return llmText;
  };

  const handleShowPreviewToggle = (
    derivedLength?: any,
    formStateParams?: any
  ) => {
    if (!showPreview) {
      // Generate the LLM text when opening preview
      const generatedText = buildLLMText(derivedLength, formStateParams);
      setEditableLLMText(generatedText);
    }
    setShowPreview(!showPreview);
  };

  const handleRefreshLLMText = (derivedLength?: any, formStateParams?: any) => {
    const generatedText = buildLLMText(derivedLength, formStateParams);
    setEditableLLMText(generatedText);
  };

  const handleUseMinimalCarDataChange = (
    checked: boolean,
    derivedLength?: any,
    formStateParams?: any
  ) => {
    setUseMinimalCarData(checked);
    // Regenerate LLM text if preview is open
    if (showPreview) {
      const generatedText = buildLLMText(derivedLength, formStateParams);
      setEditableLLMText(generatedText);
    }
  };

  return {
    // Car data
    projectCars,
    selectedCarIds,
    carDetails,
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

    // Length settings
    lengthSettings,

    // Prompt templates
    promptList,
    selectedPrompt,
    promptLoading,
    promptError,
    handlePromptChange,
    setPromptList,
    setSelectedPrompt,
    setPromptError,

    // Generation settings
    platform,
    setPlatform,
    template,
    setTemplate,
    context,
    setContext,
    additionalContext,
    setAdditionalContext,
    tone,
    setTone,
    style,
    setStyle,
    model,
    setModel,
    provider,
    setProvider,
    temperature,
    setTemperature,

    // Generation state
    isGenerating,
    setIsGenerating,
    generatedCaption,
    setGeneratedCaption,
    error,
    setError,

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

    // Saved captions
    savedCaptions,
    setSavedCaptions,
    copiedId,
    setCopiedId,
    editingCaptionId,
    setEditingCaptionId,
    editingText,
    setEditingText,

    // Refetch functions
    refetchCars: fetchProjectCars,
    refetchEvents: fetchProjectEvents,
    refetchSystemPrompts: fetchSystemPrompts,
    refetchPromptTemplates: fetchPromptTemplates,
    refetchCaptions: fetchProjectCaptions,
  };
}
