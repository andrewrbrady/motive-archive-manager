export interface ProjectCar {
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
  // === DETAILED SPECIFICATIONS FOR COPYWRITER ===
  // These fields are needed by the copywriter for generating comprehensive captions
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
      kW: number;
      ps: number;
    };
    torque?: {
      "lb-ft": number;
      Nm: number;
    };
    features?: string[];
    configuration?: string;
    cylinders?: number;
    fuelType?: string;
    manufacturer?: string;
  };
  transmission?: {
    type: string;
    speeds?: number;
  };
  dimensions?: {
    length?: { value: number; unit: string };
    width?: { value: number; unit: string };
    height?: { value: number; unit: string };
    wheelbase?: { value: number; unit: string };
    trackWidth?: { value: number; unit: string };
    weight?: { value: number; unit: string };
    gvwr?: { value: number; unit: string };
  };
  manufacturing?: {
    plant?: {
      city?: string;
      country?: string;
      company?: string;
    };
    series?: string;
    trim?: string;
    bodyClass?: string;
  };
  performance?: {
    "0_to_60_mph"?: { value: number; unit: string };
    top_speed?: { value: number; unit: string };
  };
  interior_features?: {
    seats?: number;
    upholstery?: string;
    features?: string[];
  };
  interior_color?: string;
  condition?: string;
  location?: string;
  doors?: number;
  safety?: {
    tpms?: {
      type: string;
      present: boolean;
    };
    [key: string]: any;
  };
  description?: string;
  mileage?: {
    value: number;
    unit: string;
  };
}

export interface ProjectEvent {
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
  createdAt: string;
  updatedAt: string;
}

export interface SavedCaption {
  _id: string;
  platform: string;
  context: string;
  caption: string;
  projectId: string;
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
  prompt: string;
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

// Platform is now dynamic and configurable through admin settings
export type Platform = string;
export type Template = "none" | "bat" | "dealer" | "question";
export type Tone = "professional" | "casual" | "enthusiastic" | "technical";
export type Style = "descriptive" | "minimal" | "storytelling";
