"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RefreshCw,
  Pencil,
  Trash2,
  Copy,
  Check,
  Instagram,
  Youtube,
  X,
  Car,
  Plus,
  Calendar,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  getRandomQuestion,
  formatQuestion,
} from "@/constants/question-examples";
import type { BaTCarDetails } from "@/types/car-page";
import { Project } from "@/types/project";
import { Event } from "@/types/event";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  getAllModels,
  llmProviders,
  ProviderId,
  findModelById,
} from "@/lib/llmProviders";
import { toast } from "@/components/ui/use-toast";
import { CarAvatar } from "@/components/ui/CarAvatar";
import PromptForm, {
  PromptFormData,
  PromptFormRef,
} from "@/components/admin/PromptForm";

type Platform = "instagram" | "youtube";
type Template = "none" | "bat" | "dealer" | "question";
type Tone = "professional" | "casual" | "enthusiastic" | "technical";
type Style = "descriptive" | "minimal" | "storytelling";

interface LengthSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
}

interface ProjectCar {
  _id: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  status: string;
  primaryImageId?: string;
  imageIds?: string[];
  createdAt: string;
}

interface ProjectEvent {
  id: string;
  car_id?: string;
  project_id?: string;
  type: string;
  title: string;
  description: string;
  status: string;
  start: string;
  end?: string;
  isAllDay?: boolean;
  teamMemberIds: string[];
  locationId?: string;
  primaryImageId?: string;
  imageIds?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectCaptionGeneratorProps {
  project: Project;
  onProjectUpdate: () => void;
}

const generateQuestion = async (carDetails: BaTCarDetails[]) => {
  // Generate a question that can work with multiple cars
  const randomQuestion = getRandomQuestion();
  if (carDetails.length === 1) {
    return formatQuestion(randomQuestion, {
      year: carDetails[0].year,
      make: carDetails[0].make,
      model: carDetails[0].model,
    });
  } else {
    // For multiple cars, create a more general question
    const makes = [...new Set(carDetails.map((car) => car.make))];
    const years = [...new Set(carDetails.map((car) => car.year))].sort();
    return `What makes this collection of ${makes.join(", ")} vehicles from ${years[0]} to ${years[years.length - 1]} so special?`;
  }
};

export function ProjectCaptionGenerator({
  project,
  onProjectUpdate,
}: ProjectCaptionGeneratorProps) {
  const [projectCars, setProjectCars] = useState<ProjectCar[]>([]);
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [carDetails, setCarDetails] = useState<BaTCarDetails[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [template, setTemplate] = useState<Template>("none");
  const [context, setContext] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(1.0);
  const [tone, setTone] = useState<Tone>("professional");
  const [style, setStyle] = useState<Style>("descriptive");
  const [length, setLength] = useState<LengthSetting | null>(null);
  const [savedCaptions, setSavedCaptions] = useState<
    Array<{
      _id: string;
      platform: string;
      context: string;
      caption: string;
      projectId: string;
      carIds: string[];
      eventIds: string[];
      createdAt: string;
    }>
  >([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [model, setModel] = useState<string>("claude-3-5-sonnet-20241022");
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [clientHandle, setClientHandle] = useState<string | null>(null);
  const [includeClientHandle, setIncludeClientHandle] = useState(false);

  // Prompt template system state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptList, setPromptList] = useState<any[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);
  const [isPromptSubmitting, setIsPromptSubmitting] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const promptFormRef = useRef<PromptFormRef>(null);

  // Event-related state
  const [projectEvents, setProjectEvents] = useState<ProjectEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [eventDetails, setEventDetails] = useState<ProjectEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // System prompt selection state
  const [systemPrompts, setSystemPrompts] = useState<any[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] =
    useState<string>("");
  const [loadingSystemPrompts, setLoadingSystemPrompts] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(
    null
  );

  // Length settings state
  const [lengthSettings, setLengthSettings] = useState<LengthSetting[]>([]);
  const [loadingLengthSettings, setLoadingLengthSettings] = useState(false);
  const [lengthSettingsError, setLengthSettingsError] = useState<string | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [editableLLMText, setEditableLLMText] = useState<string>("");

  // Data filtering options
  const [useMinimalCarData, setUseMinimalCarData] = useState(false);

  // Fetch project cars on mount and when project changes
  useEffect(() => {
    if (project) {
      fetchProjectCars();
      fetchProjectCaptions();
      fetchProjectEvents();
    }
  }, [project]);

  // Fetch prompts when component mounts
  useEffect(() => {
    setPromptLoading(true);
    setPromptError(null);
    fetch("/api/caption-prompts")
      .then((res) => res.json())
      .then((data) => {
        setPromptList(Array.isArray(data) ? data : []);
      })
      .catch((err) => setPromptError("Failed to fetch prompts"))
      .finally(() => setPromptLoading(false));
  }, []);

  // Fetch system prompts when component mounts
  useEffect(() => {
    fetchSystemPrompts();
  }, []);

  // Fetch length settings when component mounts
  useEffect(() => {
    fetchLengthSettings();
  }, []);

  // Refetch system prompts when length changes
  useEffect(() => {
    fetchSystemPrompts();
  }, [length]);

  const fetchSystemPrompts = async () => {
    try {
      setLoadingSystemPrompts(true);
      setSystemPromptError(null);

      // Include length parameter if one is selected
      const lengthParam = length ? `&length=${length.key}` : "";
      const response = await fetch(
        `/api/system-prompts/list?type=project_caption${lengthParam}`
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

  // Fetch length settings when component mounts
  const fetchLengthSettings = async () => {
    try {
      setLoadingLengthSettings(true);
      setLengthSettingsError(null);

      const response = await fetch("/api/length-settings");

      if (!response.ok) {
        throw new Error("Failed to fetch length settings");
      }

      const data = await response.json();
      setLengthSettings(data);

      // Auto-select the first length setting if none is currently selected
      if (!length && data.length > 0) {
        setLength(data[0]);
      }
    } catch (error) {
      console.error("Error fetching length settings:", error);
      setLengthSettingsError("Failed to load length settings");
    } finally {
      setLoadingLengthSettings(false);
    }
  };

  // Update form values when selectedPrompt changes
  useEffect(() => {
    if (selectedPrompt) {
      setContext(selectedPrompt.prompt || "");
      setTone(selectedPrompt.tone || "professional");
      setStyle(selectedPrompt.style || "descriptive");
      setModel(selectedPrompt.aiModel || "claude-3-5-sonnet-20241022");
      setProvider(selectedPrompt.llmProvider || "anthropic");
      setTemperature(selectedPrompt.modelParams?.temperature || 1.0);
      setPlatform(selectedPrompt.platform || "instagram");
    }
  }, [selectedPrompt]);

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

  const fetchProjectCars = async () => {
    try {
      setLoadingCars(true);
      const response = await fetch(`/api/projects/${project._id}/cars`);

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

  const fetchProjectCaptions = async () => {
    try {
      const response = await fetch(`/api/projects/${project._id}/captions`);
      if (!response.ok) {
        throw new Error("Failed to fetch project captions");
      }
      const captions = await response.json();
      setSavedCaptions(captions);
    } catch (err) {
      console.error("Error fetching project captions:", err);
    }
  };

  const fetchProjectEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await fetch(`/api/projects/${project._id}/events`);

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

  const handleGenerate = async (_captionId?: string) => {
    if (selectedCarIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one car to generate captions",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSystemPromptId) {
      toast({
        title: "Error",
        description: "Please select a system prompt to generate captions",
        variant: "destructive",
      });
      return;
    }

    if (!length) {
      toast({
        title: "Error",
        description: "Please select a caption length to generate captions",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      let contextToUse = context;

      // Combine template context with additional context
      if (additionalContext.trim()) {
        contextToUse = contextToUse
          ? `${contextToUse}\n\nAdditional Context:\n${additionalContext}`
          : additionalContext;
      }

      const clientInfo =
        includeClientHandle && clientHandle
          ? {
              handle: clientHandle,
              includeInCaption: true,
            }
          : null;

      // Combine car details for multi-car captions
      const combinedCarDetails = {
        cars: carDetails,
        count: carDetails.length,
        makes: [...new Set(carDetails.map((car) => car.make))],
        years: [...new Set(carDetails.map((car) => car.year))].sort(),
        colors: [
          ...new Set(carDetails.map((car) => car.color).filter(Boolean)),
        ],
      };

      // Combine event details for multi-event captions
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

      console.log("Generating project caption with:", {
        platform,
        context: contextToUse,
        clientInfo,
        model,
        selectedCars: selectedCarIds.length,
        selectedEvents: selectedEventIds.length,
        combinedCarDetails,
        combinedEventDetails,
        customLLMText: editableLLMText
          ? "Using custom edited text"
          : "Using auto-generated text",
      });

      // Prepare the request payload
      const requestPayload: any = {
        platform,
        context: contextToUse,
        clientInfo,
        carDetails: combinedCarDetails,
        eventDetails: combinedEventDetails,
        temperature,
        tone,
        style,
        length: length?.key || "concise",
        template,
        aiModel: model,
        projectId: project._id,
        selectedCarIds,
        selectedEventIds,
        systemPromptId: selectedSystemPromptId,
        useMinimalCarData,
      };

      // If we have custom edited LLM text, include it in the request
      if (editableLLMText && editableLLMText.trim()) {
        requestPayload.customLLMText = editableLLMText;
      }

      // Generate new caption text
      const response = await fetch("/api/openai/generate-project-caption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to generate caption");
      }

      const data = await response.json();

      // If we're editing, update the existing caption
      if (_captionId) {
        const updateResponse = await fetch(
          `/api/projects/${project._id}/captions?id=${_captionId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              platform,
              context: contextToUse,
              caption: data.caption,
              carIds: selectedCarIds,
              eventIds: selectedEventIds,
            }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error("Failed to update caption");
        }

        // Update the caption in the local state
        setSavedCaptions((prev) =>
          prev.map((caption) =>
            caption._id === _captionId
              ? {
                  ...caption,
                  caption: data.caption,
                  platform,
                  context: contextToUse,
                  carIds: selectedCarIds,
                  eventIds: selectedEventIds,
                }
              : caption
          )
        );
        setGeneratedCaption("");
        setEditingCaptionId(null);
      } else {
        // Set the generated caption for preview
        setGeneratedCaption(data.caption);
      }

      toast({
        title: "Success",
        description:
          editableLLMText && editableLLMText.trim()
            ? "Caption generated using your custom LLM input"
            : "Caption generated successfully",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to generate caption",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCaption = async () => {
    if (!generatedCaption) return;

    try {
      const contextToSave =
        context +
        (additionalContext.trim()
          ? `\n\nAdditional Context:\n${additionalContext}`
          : "");

      const saveResponse = await fetch(
        `/api/projects/${project._id}/captions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform,
            projectId: project._id,
            carIds: selectedCarIds,
            eventIds: selectedEventIds,
            context: contextToSave,
            caption: generatedCaption,
          }),
        }
      );

      if (!saveResponse.ok) {
        throw new Error("Failed to save caption to database");
      }

      // Add the new caption to the saved captions list
      const { caption: savedCaption } = await saveResponse.json();
      setSavedCaptions((prev) => [savedCaption, ...prev]);
      setGeneratedCaption("");

      toast({
        title: "Success",
        description: "Caption saved successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save caption",
        variant: "destructive",
      });
    }
  };

  const handleTemplateChange = async (value: Template) => {
    setTemplate(value);
    if (value === "question" && carDetails.length > 0) {
      const question = await generateQuestion(carDetails);
      setContext(question);
    } else if (value === "dealer") {
      setContext("These cars are now available from our friends at [DEALER]");
    } else if (value === "bat") {
      setContext(
        "These cars are currently live from our friends [DEALER] on @bringatrailer. Follow the link in our bio to view the auction."
      );
    } else {
      setContext("");
    }
  };

  const handleDelete = async (captionId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${project._id}/captions?id=${captionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete caption");
      }

      setSavedCaptions((prev) =>
        prev.filter((caption) => caption._id !== captionId)
      );

      if (
        savedCaptions.find((c) => c._id === captionId)?.caption ===
        generatedCaption
      ) {
        setGeneratedCaption("");
      }

      toast({
        title: "Success",
        description: "Caption deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting caption:", err);
      toast({
        title: "Error",
        description: "Failed to delete caption",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (captionId: string, currentCaption: string) => {
    try {
      const captionToEdit = savedCaptions.find((c) => c._id === captionId);
      if (!captionToEdit) {
        throw new Error("Caption not found");
      }

      const updateResponse = await fetch(
        `/api/projects/${project._id}/captions?id=${captionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caption: currentCaption,
            platform: captionToEdit.platform,
            context: captionToEdit.context || "",
            carIds: captionToEdit.carIds,
            eventIds: captionToEdit.eventIds,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error("Failed to update caption");
      }

      setSavedCaptions((prev) =>
        prev.map((caption) =>
          caption._id === captionId
            ? {
                ...caption,
                caption: currentCaption,
              }
            : caption
        )
      );

      toast({
        title: "Success",
        description: "Caption updated successfully",
      });
    } catch (err) {
      console.error("Error editing caption:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      toast({
        title: "Error",
        description: "Failed to update caption",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Success",
        description: "Caption copied to clipboard",
      });
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast({
        title: "Error",
        description: "Failed to copy caption",
        variant: "destructive",
      });
    }
  };

  const handleTextChange = (text: string, _captionId: string) => {
    setEditingText(text);
  };

  const handleSaveEdit = async (captionId: string) => {
    await handleEdit(captionId, editingText);
    setEditingCaptionId(null);
    setEditingText("");
  };

  const formatCarName = (car: ProjectCar) => {
    const parts = [car.year, car.make, car.model].filter(Boolean);
    return parts.join(" ");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      case "sold":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCarImageUrl = (car: ProjectCar) => {
    if (!car.primaryImageId) {
      if (car.imageIds && car.imageIds.length > 0) {
        return `/api/images/${car.imageIds[0]}`;
      }
      return null;
    }
    return `/api/images/${car.primaryImageId}`;
  };

  const buildLLMText = () => {
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
    if (context) {
      llmText += "ADDITIONAL INSTRUCTIONS:\n" + context + "\n\n";
    }

    // Additional context
    if (additionalContext) {
      llmText += "ADDITIONAL CONTEXT:\n" + additionalContext + "\n\n";
    }

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

    // Caption requirements
    llmText += "CAPTION REQUIREMENTS:\n";
    llmText += `- Platform: ${platform}\n`;
    llmText += `- Tone: ${tone}\n`;
    llmText += `- Style: ${style}\n`;
    llmText += `- Length: ${length?.key || "Will be selected during generation"}\n`;

    if (template && template !== "none") {
      llmText += `- Template: ${template}\n`;
    }

    // Length instructions (if available)
    if (length) {
      llmText += "\nLENGTH INSTRUCTIONS:\n";
      llmText += length.instructions + "\n";
    }

    llmText += "\nGenerate a caption that follows the requirements above.";

    return llmText;
  };

  if (loadingCars || loadingEvents || loadingSystemPrompts) {
    return (
      <div className="py-8 text-center text-[hsl(var(--foreground-muted))]">
        Loading project data...
      </div>
    );
  }

  if (projectCars.length === 0) {
    return (
      <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
        <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No cars linked to project</p>
        <p className="text-sm">
          Link cars to this project to generate captions with their
          specifications
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-white uppercase">
        Project Caption Generator
      </h1>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Generator */}
        <div className="space-y-4">
          {/* Car Selection */}
          <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                Select Cars for Caption
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllCars}
                className="border-[hsl(var(--border))]"
              >
                {selectedCarIds.length === projectCars.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {projectCars.map((car) => {
                const isSelected = selectedCarIds.includes(car._id);
                const imageUrl = getCarImageUrl(car);

                return (
                  <button
                    key={car._id}
                    onClick={() => handleCarSelection(car._id)}
                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-all text-left w-full ${
                      isSelected
                        ? "border-blue-500/50"
                        : "border-[hsl(var(--border-subtle))] hover:border-white"
                    }`}
                  >
                    {/* Car Avatar */}
                    <div className="flex-shrink-0">
                      <CarAvatar
                        primaryImageId={car.primaryImageId}
                        entityName={formatCarName(car)}
                        size="md"
                        className="rounded-lg"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="font-medium text-sm text-[hsl(var(--foreground))] dark:text-white">
                        {formatCarName(car)}
                      </div>
                      <div className="text-xs text-[hsl(var(--foreground-muted))]">
                        {car.color && <span>{car.color}</span>}
                        {car.vin && (
                          <span>
                            {car.color ? " • " : ""}VIN: {car.vin}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(car.status)}`}
                    >
                      {car.status}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedCarIds.length > 0 && (
              <div className="text-sm text-[hsl(var(--foreground-muted))]">
                {selectedCarIds.length} car
                {selectedCarIds.length !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>

          {/* Event Selection */}
          {projectEvents.length > 0 && (
            <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                  Select Events for Caption
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllEvents}
                  className="border-[hsl(var(--border))]"
                >
                  {selectedEventIds.length === projectEvents.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {projectEvents.map((event) => {
                  const isSelected = selectedEventIds.includes(event.id);
                  const eventDate = new Date(event.start);
                  const isUpcoming = eventDate > new Date();

                  return (
                    <button
                      key={event.id}
                      onClick={() => handleEventSelection(event.id)}
                      className={`flex items-center space-x-3 p-3 border rounded-lg transition-all text-left w-full ${
                        isSelected
                          ? "border-blue-500/50"
                          : "border-[hsl(var(--border-subtle))] hover:border-white"
                      }`}
                    >
                      {/* Event Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="font-medium text-sm text-[hsl(var(--foreground))] dark:text-white">
                          {event.title}
                        </div>
                        <div className="text-xs text-[hsl(var(--foreground-muted))]">
                          {event.type} • {eventDate.toLocaleDateString()}
                          {event.description && (
                            <span>
                              {" "}
                              • {event.description.substring(0, 50)}
                              {event.description.length > 50 ? "..." : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${
                            event.status === "completed"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : event.status === "in_progress"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                          }`}
                        >
                          {event.status.replace("_", " ")}
                        </span>
                        {isUpcoming && (
                          <span className="text-xs text-blue-600 font-medium">
                            Upcoming
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedEventIds.length > 0 && (
                <div className="text-sm text-[hsl(var(--foreground-muted))]">
                  {selectedEventIds.length} event
                  {selectedEventIds.length !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          )}

          {/* System Prompt Selection */}
          <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                System Prompt
              </h3>
              {systemPromptError && (
                <span className="text-xs text-red-500">
                  {systemPromptError}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                Select System Prompt
              </label>
              <Select
                value={selectedSystemPromptId}
                onValueChange={setSelectedSystemPromptId}
                disabled={loadingSystemPrompts || systemPrompts.length === 0}
              >
                <SelectTrigger className="w-full bg-transparent border-[hsl(var(--border))]">
                  <SelectValue
                    placeholder={
                      loadingSystemPrompts
                        ? "Loading system prompts..."
                        : systemPrompts.length === 0
                          ? "No system prompts available"
                          : "Select a system prompt..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {systemPrompts.map((prompt) => (
                    <SelectItem key={prompt._id} value={prompt._id}>
                      <div className="flex items-center gap-2 w-full">
                        <span className="truncate">{prompt.name}</span>
                        {prompt.isActive && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSystemPromptId && (
                <div className="text-xs text-[hsl(var(--foreground-muted))]">
                  {
                    systemPrompts.find((p) => p._id === selectedSystemPromptId)
                      ?.description
                  }
                </div>
              )}
            </div>
          </div>

          {/* Caption Generation Controls */}
          {selectedCarIds.length > 0 && (
            <>
              {/* Prompt Selection and Action Buttons */}
              <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
                <div className="flex-grow">
                  <label
                    htmlFor="main-prompt-select"
                    className="block text-xs font-medium mb-1 text-[hsl(var(--foreground-muted))]"
                  >
                    Active Prompt Template
                  </label>
                  <Select
                    value={selectedPrompt?._id || ""}
                    onValueChange={(promptId) => {
                      if (promptId === "__PROMPT_NONE__") {
                        setSelectedPrompt(null);
                        setContext("");
                        setTone("professional");
                        setStyle("descriptive");
                        setLength(null);
                        setModel("claude-3-5-sonnet-20241022");
                        setProvider("anthropic");
                        return;
                      }
                      const found = promptList.find((p) => p._id === promptId);
                      setSelectedPrompt(found || null);
                      setIsCreatingPrompt(false);
                    }}
                    disabled={
                      promptLoading || (promptList.length === 0 && !promptError)
                    }
                  >
                    <SelectTrigger
                      id="main-prompt-select"
                      className="w-full bg-transparent border-[hsl(var(--border))]"
                    >
                      <SelectValue
                        placeholder={
                          promptLoading
                            ? "Loading prompts..."
                            : promptError
                              ? "Error loading"
                              : "Select a prompt..."
                        }
                      >
                        {selectedPrompt && (
                          <div className="flex items-center gap-2 truncate">
                            {selectedPrompt.platform === "instagram" && (
                              <Instagram className="w-4 h-4 flex-shrink-0" />
                            )}
                            {selectedPrompt.platform === "youtube" && (
                              <Youtube className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span className="truncate">
                              {selectedPrompt.name}
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {promptError && (
                        <SelectItem
                          value="__ERROR__"
                          disabled
                          className="text-destructive-500"
                        >
                          Error: {promptError}
                        </SelectItem>
                      )}
                      {!promptError &&
                        promptList.length === 0 &&
                        !promptLoading && (
                          <SelectItem value="__NO_PROMPTS__" disabled>
                            No prompts. Click 'New' to create.
                          </SelectItem>
                        )}
                      <SelectItem value="__PROMPT_NONE__">
                        -- None --
                      </SelectItem>
                      {promptList.map((prompt) => (
                        <SelectItem key={prompt._id} value={prompt._id}>
                          <div className="flex items-center gap-2 w-full">
                            {prompt.platform === "instagram" && (
                              <Instagram className="w-4 h-4 flex-shrink-0" />
                            )}
                            {prompt.platform === "youtube" && (
                              <Youtube className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span className="truncate">{prompt.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedPrompt) {
                      setIsCreatingPrompt(false);
                      setIsPromptModalOpen(true);
                    }
                  }}
                  disabled={!selectedPrompt}
                  className="border-[hsl(var(--border))]"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // For a new prompt, reset relevant states to defaults
                    setSelectedPrompt(null);
                    setIsCreatingPrompt(true);
                    setContext(""); // Default or empty context for new prompt
                    setTone("professional"); // Default tone
                    setStyle("descriptive"); // Default style
                    setLength(null); // Default length
                    setModel("claude-3-5-sonnet-20241022"); // Default model
                    setProvider("anthropic"); // Default provider
                    setTemperature(1.0); // Default temperature
                    setIsPromptModalOpen(true);
                  }}
                  className="border-[hsl(var(--border))]"
                >
                  New
                </Button>
              </div>

              {/* Additional Context Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Additional Context
                </label>
                <Textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Add specific context, instructions, or details for this caption generation..."
                  className="min-h-[80px] bg-transparent border-[hsl(var(--border))] text-[hsl(var(--foreground))] dark:text-white"
                />
                <p className="text-xs text-[hsl(var(--foreground-muted))]">
                  This will be combined with your selected prompt template to
                  provide more specific guidance to the AI.
                </p>
              </div>

              {/* Data Filtering Options */}
              <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
                <div className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                  Data Filtering Options
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="minimal-car-data"
                      checked={useMinimalCarData}
                      onCheckedChange={(checked) => {
                        setUseMinimalCarData(checked as boolean);
                        // Regenerate LLM text if preview is open
                        if (showPreview) {
                          const generatedText = buildLLMText();
                          setEditableLLMText(generatedText);
                        }
                      }}
                    />
                    <label
                      htmlFor="minimal-car-data"
                      className="text-sm text-[hsl(var(--foreground))] dark:text-white cursor-pointer"
                    >
                      Use minimal car data
                    </label>
                  </div>
                  <p className="text-xs text-[hsl(var(--foreground-muted))] ml-6">
                    Excludes car descriptions from the data sent to the LLM to
                    reduce verbosity
                  </p>
                </div>
              </div>

              {/* LLM Preview Toggle */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!showPreview) {
                      // Generate the LLM text when opening preview
                      const generatedText = buildLLMText();
                      setEditableLLMText(generatedText);
                    }
                    setShowPreview(!showPreview);
                  }}
                  className="w-full justify-center gap-2 border-[hsl(var(--border))]"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Hide LLM Preview
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Show LLM Preview
                    </>
                  )}
                </Button>

                {showPreview && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
                    {/* Left Panel - Informative Overview */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                        Selection Overview
                      </div>

                      {/* System Prompt Info */}
                      <div className="space-y-1">
                        <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                          System Prompt
                        </div>
                        <div className="text-xs text-[hsl(var(--foreground))] dark:text-white">
                          {(() => {
                            console.log("System prompt debug:", {
                              selectedSystemPromptId,
                              systemPromptsLength: systemPrompts.length,
                              systemPrompts: systemPrompts.map((p) => ({
                                id: p._id,
                                name: p.name,
                              })),
                            });

                            if (!selectedSystemPromptId) {
                              return "No system prompt selected";
                            }

                            const foundPrompt = systemPrompts.find(
                              (p) => p._id === selectedSystemPromptId
                            );
                            if (!foundPrompt) {
                              return `System prompt not found (ID: ${selectedSystemPromptId})`;
                            }

                            return foundPrompt.name;
                          })()}
                        </div>
                      </div>

                      {/* Length Info */}
                      <div className="space-y-1">
                        <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                          Length Setting
                        </div>
                        <div className="text-xs text-[hsl(var(--foreground))] dark:text-white">
                          {length
                            ? `${length.name} - ${length.description}`
                            : "No length selected"}
                        </div>
                      </div>

                      {/* Cars Info */}
                      <div className="space-y-1">
                        <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                          Selected Cars ({selectedCarIds.length})
                        </div>
                        <div className="text-xs text-[hsl(var(--foreground))] dark:text-white max-h-20 overflow-y-auto">
                          {selectedCarIds
                            .map((carId) => {
                              const car = projectCars.find(
                                (c) => c._id === carId
                              );
                              return car ? formatCarName(car) : carId;
                            })
                            .join(", ") || "None"}
                        </div>
                      </div>

                      {/* Events Info */}
                      {selectedEventIds.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                            Selected Events ({selectedEventIds.length})
                          </div>
                          <div className="text-xs text-[hsl(var(--foreground))] dark:text-white max-h-20 overflow-y-auto">
                            {selectedEventIds
                              .map((eventId) => {
                                const event = projectEvents.find(
                                  (e) => e.id === eventId
                                );
                                return event ? event.title : eventId;
                              })
                              .join(", ")}
                          </div>
                        </div>
                      )}

                      {/* Generation Settings */}
                      <div className="space-y-1">
                        <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                          Settings
                        </div>
                        <div className="text-xs text-[hsl(var(--foreground))] dark:text-white">
                          {platform} • {tone} • {style} • {model} • temp:{" "}
                          {temperature}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const generatedText = buildLLMText();
                          setEditableLLMText(generatedText);
                        }}
                        className="w-full text-xs"
                      >
                        Refresh LLM Text
                      </Button>
                    </div>

                    {/* Right Panel - Editable LLM Text */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                        Editable LLM Input
                      </div>
                      <div className="text-xs text-[hsl(var(--foreground-muted))]">
                        Edit this text to remove verbose descriptions or add
                        custom instructions. This exact text will be sent to the
                        LLM.
                      </div>
                      <Textarea
                        value={editableLLMText}
                        onChange={(e) => setEditableLLMText(e.target.value)}
                        className="min-h-[300px] max-h-[400px] text-xs font-mono bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-white resize-none"
                        placeholder="LLM input will appear here when you select cars and system prompt..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Show summary of selected prompt/model */}
              <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="text-xs text-[hsl(var(--foreground-muted))] mb-1">
                      Prompt Template
                    </div>
                    <div className="font-medium text-[hsl(var(--foreground))] dark:text-white whitespace-pre-line">
                      {context || "No prompt template selected"}
                    </div>
                  </div>
                  {additionalContext && (
                    <div>
                      <div className="text-xs text-[hsl(var(--foreground-muted))] mb-1">
                        Additional Context
                      </div>
                      <div className="font-medium text-[hsl(var(--foreground))] dark:text-white whitespace-pre-line">
                        {additionalContext}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-[hsl(var(--foreground-muted))]">
                  <div className="flex items-center gap-1">
                    {platform === "instagram" && (
                      <Instagram className="w-3 h-3" />
                    )}
                    {platform === "youtube" && <Youtube className="w-3 h-3" />}
                    <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
                      {platform}
                    </span>
                  </div>
                  <span>
                    Tone:{" "}
                    <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
                      {tone}
                    </span>
                  </span>
                  <span>
                    Style:{" "}
                    <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
                      {style}
                    </span>
                  </span>
                  <span>
                    Length:{" "}
                    <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
                      {length?.name || "No length selected"}
                    </span>
                  </span>
                  <span>
                    Cars:{" "}
                    <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
                      {selectedCarIds.length}
                    </span>
                  </span>
                  {selectedEventIds.length > 0 && (
                    <span>
                      Events:{" "}
                      <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
                        {selectedEventIds.length}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={() => handleGenerate()}
                disabled={
                  isGenerating ||
                  selectedCarIds.length === 0 ||
                  !selectedSystemPromptId ||
                  !length
                }
                variant="outline"
                className="w-full bg-[var(--background-primary)] hover:bg-black dark:bg-[var(--background-primary)] dark:hover:bg-black text-white border-[hsl(var(--border))]"
              >
                {isGenerating ? "Generating..." : "Generate Caption"}
              </Button>

              {error && (
                <p className="text-sm text-destructive-500 dark:text-destructive-400">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Right Column - Preview and Saved Captions */}
        <div className="space-y-4">
          {/* Generated Caption Preview */}
          {generatedCaption && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                  Generated Caption Preview
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(generatedCaption, "preview")}
                    className="border-[hsl(var(--border))]"
                  >
                    {copiedId === "preview" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveCaption}
                    className="border-[hsl(var(--border))]"
                  >
                    Save
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {platform === "instagram" && (
                    <Instagram className="w-4 h-4" />
                  )}
                  {platform === "youtube" && <Youtube className="w-4 h-4" />}
                  <span className="text-sm font-medium capitalize">
                    {platform}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] dark:text-white">
                  {generatedCaption}
                </p>
              </div>
            </div>
          )}

          {/* Saved Captions */}
          {savedCaptions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                Saved Captions
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedCaptions.map((caption) => (
                  <div
                    key={caption._id}
                    className="group relative p-3 bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-primary))] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {caption.platform === "instagram" && (
                        <Instagram className="w-4 h-4" />
                      )}
                      {caption.platform === "youtube" && (
                        <Youtube className="w-4 h-4" />
                      )}
                      <span className="text-xs font-medium capitalize">
                        {caption.platform}
                      </span>
                      <span className="text-xs text-[hsl(var(--foreground-muted))]">
                        • {caption.carIds?.length || 0} cars
                        {caption.eventIds && caption.eventIds.length > 0 && (
                          <span> • {caption.eventIds.length} events</span>
                        )}
                      </span>
                    </div>

                    {editingCaptionId === caption._id ? (
                      <Textarea
                        value={editingText || caption.caption}
                        onChange={(e) =>
                          handleTextChange(e.target.value, caption._id)
                        }
                        className="min-h-[100px] w-full resize-none bg-transparent border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSaveEdit(caption._id);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingCaptionId(null);
                            setEditingText("");
                          }
                        }}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-[hsl(var(--foreground))] pr-8">
                        {caption.caption}
                      </p>
                    )}

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(caption.caption, caption._id)}
                        className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                        title="Copy caption"
                      >
                        {copiedId === caption._id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      {editingCaptionId === caption._id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveEdit(caption._id)}
                            className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                            title="Save changes"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCaptionId(null);
                              setEditingText("");
                            }}
                            className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                            title="Cancel editing"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCaptionId(caption._id);
                              setEditingText(caption.caption);
                            }}
                            className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                            title="Edit caption"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(caption._id)}
                            className="h-8 w-8 p-0 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                            title="Delete caption"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Editing or Creating Prompts */}
      <Dialog
        open={isPromptModalOpen}
        onOpenChange={(isOpen) => {
          setIsPromptModalOpen(isOpen);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
            <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
              {isCreatingPrompt
                ? "Create New Prompt Template"
                : `Edit Prompt: ${selectedPrompt?.name || "Selected Prompt"}`}
            </DialogTitle>
            <DialogDescription className="text-sm text-[hsl(var(--foreground-muted))]">
              {isCreatingPrompt
                ? "Define a new reusable prompt template for caption generation."
                : "Modify the existing prompt template, including its content, parameters, and AI model."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
            {/* Client handle switch */}
            {clientHandle && (
              <div className="flex items-center gap-2 mb-3">
                <Switch
                  id="include-client-handle"
                  checked={includeClientHandle}
                  onCheckedChange={setIncludeClientHandle}
                />
                <label htmlFor="include-client-handle" className="text-sm">
                  Make client handle ({clientHandle}) available to prompt
                </label>
              </div>
            )}

            {/* Render PromptForm */}
            {isPromptModalOpen && (
              <PromptForm
                ref={promptFormRef}
                key={
                  isCreatingPrompt
                    ? "new-prompt-form"
                    : selectedPrompt?._id || "edit-prompt-form"
                }
                prompt={
                  isCreatingPrompt ? undefined : selectedPrompt || undefined
                }
                isSubmitting={isPromptSubmitting}
                externalAiModel={model}
                onCancel={() => {
                  setIsPromptModalOpen(false);
                }}
                onSubmit={async (formData) => {
                  setIsPromptSubmitting(true);
                  setPromptError(null);
                  try {
                    const method = isCreatingPrompt ? "POST" : "PATCH";
                    const url = "/api/caption-prompts";

                    const payload: Record<string, any> = {
                      ...formData,
                      aiModel: model,
                      llmProvider: provider,
                      modelParams: {
                        temperature: temperature || undefined,
                      },
                    };

                    if (!isCreatingPrompt && selectedPrompt) {
                      payload.id = selectedPrompt._id;
                    }

                    console.log("Submitting prompt with payload:", payload);
                    console.log("Method:", method, "URL:", url);

                    const response = await fetch(url, {
                      method,
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(payload),
                    });

                    console.log("Response status:", response.status);

                    if (!response.ok) {
                      const errorData = await response.json();
                      console.error("Error response:", errorData);
                      throw new Error(
                        errorData.error || "Failed to save prompt"
                      );
                    }

                    const result = await response.json();
                    console.log("Success response:", result);

                    // Update local prompt list
                    if (isCreatingPrompt) {
                      setPromptList((prev) => [result, ...prev]);
                      setSelectedPrompt(result);
                    } else {
                      setPromptList((prev) =>
                        prev.map((p) =>
                          p._id === selectedPrompt._id ? result : p
                        )
                      );
                      setSelectedPrompt(result);
                    }

                    // Update form values
                    setContext(formData.prompt);
                    setTone(formData.tone as Tone);
                    setStyle(formData.style as Style);
                    const lengthSetting = lengthSettings.find(
                      (l) => l.key === formData.length
                    );
                    setLength(lengthSetting || null);
                    setPlatform(formData.platform as Platform);

                    setIsPromptModalOpen(false);

                    toast({
                      title: "Success",
                      description: isCreatingPrompt
                        ? "Prompt created successfully"
                        : "Prompt updated successfully",
                    });
                  } catch (err) {
                    console.error("Error saving prompt:", err);
                    setPromptError(
                      err instanceof Error
                        ? err.message
                        : "An unexpected error occurred while saving the prompt."
                    );

                    toast({
                      title: "Error",
                      description:
                        err instanceof Error
                          ? err.message
                          : "Failed to save prompt",
                      variant: "destructive",
                    });
                  } finally {
                    setIsPromptSubmitting(false);
                  }
                }}
                renderModelSelector={() => (
                  <div className="space-y-3 p-3 border border-[hsl(var(--border-subtle))] rounded-lg bg-[var(--background-secondary)]">
                    <div className="flex items-center gap-1">
                      <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                      <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                        AI Model Configuration
                      </span>
                      <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                          AI Provider
                        </label>
                        <select
                          className="w-full border rounded p-2 bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border-subtle))] text-sm"
                          value={provider}
                          onChange={(e) => {
                            const newProvider = e.target.value as ProviderId;
                            setProvider(newProvider);
                            const providerModels =
                              llmProviders[newProvider]?.models || [];
                            if (!providerModels.some((m) => m.id === model)) {
                              setModel(providerModels[0]?.id || "");
                            }
                          }}
                        >
                          {Object.values(llmProviders)
                            .filter((p) => p.models.length > 0)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                          AI Model
                        </label>
                        <select
                          className="w-full border rounded p-2 bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border-subtle))] text-sm"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                        >
                          {(llmProviders[provider]?.models || []).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                        Temperature: {temperature}
                      </label>
                      <div className="relative">
                        <div className="relative w-full h-2 rounded-lg border border-[hsl(var(--border-subtle))] bg-transparent overflow-hidden">
                          <div
                            className="h-full rounded-lg transition-all duration-200"
                            style={{
                              width: `${(temperature / 2) * 100}%`,
                              background: `linear-gradient(to right, 
                                #3b82f6 0%, 
                                #06b6d4 25%, 
                                #10b981 41.7%, 
                                #f59e0b 75%, 
                                #ef4444 100%)`,
                            }}
                          />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={temperature}
                          onChange={(e) =>
                            setTemperature(parseFloat(e.target.value))
                          }
                          className="absolute top-0 w-full h-2 rounded-lg appearance-none cursor-pointer slider-thumb bg-transparent"
                        />
                        <style jsx>{`
                          .slider-thumb::-webkit-slider-thumb {
                            appearance: none;
                            height: 16px;
                            width: 16px;
                            border-radius: 50%;
                            background: ${temperature <= 0.5
                              ? "#3b82f6"
                              : temperature <= 1.0
                                ? "#f59e0b"
                                : "#ef4444"};
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                            cursor: pointer;
                          }

                          .slider-thumb::-moz-range-thumb {
                            height: 16px;
                            width: 16px;
                            border-radius: 50%;
                            background: ${temperature <= 0.5
                              ? "#3b82f6"
                              : temperature <= 1.0
                                ? "#f59e0b"
                                : "#ef4444"};
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                            cursor: pointer;
                            border: none;
                          }

                          .slider-thumb::-webkit-slider-track {
                            height: 8px;
                            border-radius: 4px;
                            background: transparent;
                          }

                          .slider-thumb::-moz-range-track {
                            height: 8px;
                            border-radius: 4px;
                            border: none;
                            background: transparent;
                          }
                        `}</style>
                        <div className="flex justify-between text-xs text-[hsl(var(--foreground-muted))] mt-1">
                          <span className="text-blue-500">Precise</span>
                          <span className="text-red-500">Creative</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}

            {promptError && (
              <p className="mt-3 text-sm text-destructive-500 dark:text-destructive-400 text-center">
                {promptError}
              </p>
            )}
          </div>

          <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
            <Button
              variant="outline"
              onClick={() => setIsPromptModalOpen(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => promptFormRef.current?.submit()}
              disabled={isPromptSubmitting}
              size="sm"
            >
              {isPromptSubmitting
                ? "Submitting..."
                : isCreatingPrompt
                  ? "Create Prompt"
                  : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
