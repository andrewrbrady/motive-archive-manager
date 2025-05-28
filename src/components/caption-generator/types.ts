import type { ProviderId } from "@/lib/llmProviders";

export interface CaptionFormState {
  context: string;
  additionalContext: string;
  tone: Tone;
  style: Style;
  platform: Platform;
  model: string;
  provider: ProviderId;
  temperature: number;
}

export interface GenerationContext {
  carId?: string;
  selectedCarIds: string[];
  selectedEventIds: string[];
  selectedSystemPromptId: string | null;
  carDetails: any[];
  eventDetails: any[];
  derivedLength: LengthSetting | null;
  useMinimalCarData: boolean;
  editableLLMText: string;
  clientHandle: string | null;
}

export interface SavedCaption {
  _id: string;
  platform: string;
  context: string;
  caption: string;
  carId?: string;
  projectId?: string;
  carIds: string[];
  eventIds: string[];
  createdAt: string;
}

export interface LengthSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
}

export interface SystemPrompt {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  type: string;
  content: string;
}

export interface PromptTemplate {
  _id: string;
  name: string;
  prompt: string;
  platform: string;
  tone: string;
  style: string;
  length: string;
  aiModel: string;
  llmProvider: string;
  modelParams?: {
    temperature?: number;
  };
}

export interface CarDetails {
  _id: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  status: string;
  primaryImageId?: string;
  imageIds?: string[];
}

export interface EventDetails {
  id: string;
  car_id?: string;
  project_id?: string;
  type: string;
  title: string;
  description: string;
  start: string;
  end?: string;
  isAllDay?: boolean;
  teamMemberIds: string[];
  locationId?: string;
  primaryImageId?: string;
  imageIds?: string[];
}

// Platform is now dynamic and configurable through admin settings
export type Platform =
  | "instagram"
  | "youtube"
  | "facebook"
  | "twitter"
  | "linkedin";
export type Template = "none" | "bat" | "dealer" | "question";
export type Tone = "professional" | "casual" | "enthusiastic" | "technical";
export type Style = "descriptive" | "minimal" | "storytelling";

export interface CaptionGeneratorProps {
  carId?: string;
  projectId?: string;
  mode?: "car" | "project";
}
