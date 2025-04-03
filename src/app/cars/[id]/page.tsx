"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useTransition as useReactTransition,
  useRef,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import DocumentsClient from "@/app/documents/DocumentsClient";
import {
  Loader2,
  Plus,
  Sparkles,
  Pencil,
  Trash2,
  Check,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { getUnitsForType } from "@/constants/units";
import { PageTitle } from "@/components/ui/PageTitle";
import Footer from "@/components/layout/footer";
import { CarPageSkeleton } from "@/components/ui/CarPageSkeleton";
import { EnrichmentProgress } from "@/components/ui/EnrichmentProgress";
import ImageUploadWithContext from "@/components/ImageUploadWithContext";
import CaptionGenerator from "@/components/CaptionGenerator";
import BaTListingGenerator from "@/components/BaTListingGenerator";
import { toast } from "@/components/ui/use-toast";
import ResearchFiles from "@/components/ResearchFiles";
import DocumentationFiles from "@/components/DocumentationFiles";
import Specifications from "@/components/cars/Specifications";
import { ArticleGenerator } from "@/components/cars/ArticleGenerator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import type { Car as BaseCar, CarImage, PriceHistory } from "@/types/car";
import DeliverablesTab from "@/components/deliverables/DeliverablesTab";
import EventsTab from "@/components/events/EventsTab";
import CalendarTab from "@/components/cars/CalendarTab";
import FullCalendarTab from "@/components/cars/FullCalendarTab";
import ShotList from "@/components/cars/ShotList";
import Scripts from "@/components/cars/Scripts";
import { Car } from "@/types/car";
import { MeasurementValue } from "@/types/measurements";
import PhotoShoots from "@/components/cars/PhotoShoots";
import { ImageGalleryWithQuery } from "@/components/cars/ImageGalleryWithQuery";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusNotification } from "@/components/StatusNotification";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface Power {
  hp: number;
  kW: number;
  ps: number;
}

interface Torque {
  "lb-ft": number;
  Nm: number;
}

interface ApiCarResponse {
  _id?: string;
  make: string;
  model: string;
  year: number;
  price: string | number;
  mileage?: {
    value: number;
    unit: string;
  };
  color?: string;
  interior_color?: string;
  vin?: string;
  status?: "available" | "sold" | "pending";
  condition?: string;
  location?: string;
  description?: string;
  type?: string;
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
  images?: CarImage[];
  client?: string;
  clientInfo?: any;
  manufacturing?: any;
  dimensions?: any;
  safety?: any;
  doors?: number;
  interior_features?: any;
  transmission?: {
    type: string;
  };
  performance?: any;
  aiAnalysis?: any;
}

interface ExtendedCar
  extends Omit<BaseCar, "mileage" | "year" | "images" | "imageIds"> {
  mileage: MeasurementValue;
  year: number;
  images?: CarImage[];
  imageIds: string[];
}

interface Dimensions {
  length: MeasurementValue;
  width: MeasurementValue;
  height: MeasurementValue;
  wheelbase: MeasurementValue;
}

interface InteriorFeatures {
  [key: string]: number | string | undefined;
  seats?: number;
  upholstery?: string;
}

interface Performance {
  "0_to_60_mph": MeasurementValue;
  top_speed: MeasurementValue;
}

interface Transmission {
  type: string;
}

interface Weight {
  curb_weight: MeasurementValue;
}

interface ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
  aiAnalysis?: {
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
  };
}

interface ImageVariants {
  [key: string]: string;
}

interface UploadedImageData {
  id: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  variants: ImageVariants;
  createdAt: string;
  updatedAt: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
}

interface EditableSpecs {
  [key: string]: any;
  color?: string;
  interior_color?: string;
  mileage?: MeasurementValue;
  engine?: {
    displacement?: MeasurementValue;
    power?: Power;
    torque?: Torque;
    [key: string]: any;
  };
  dimensions?: {
    [key: string]: MeasurementValue | undefined;
  };
  interior_features?: {
    [key: string]: string | number | undefined;
  };
  transmission?: {
    [key: string]: string | number | undefined;
  };
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface ClientInfo {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: Address;
  businessType: string;
}

interface CarFormData extends CarData {
  // Add form-specific fields here
  _id: string;
  images?: CarImage[];
  status: "available" | "sold" | "pending";
}

interface BaTCarDetails {
  _id: string;
  year: number;
  make: string;
  model: string;
  color?: string;
  mileage?: {
    value: number;
    unit: string;
  };
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
    };
  };
  transmission: {
    type: string;
  };
  vin?: string;
  condition?: string;
  interior_color?: string;
  interior_features?: {
    seats: number;
    upholstery?: string;
  };
  description?: string;
}

interface CarData
  extends Omit<
    ExtendedCar,
    | "dimensions"
    | "interior_features"
    | "transmission"
    | "mileage"
    | "year"
    | "clientInfo"
  > {
  year: number;
  mileage: MeasurementValue;
  dimensions?: Record<string, MeasurementValue>;
  interior_features?: {
    seats?: number;
    upholstery?: string;
    features?: string[];
  };
  transmission?: {
    type: string;
    speeds?: number;
  };
  clientInfo?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    role?: string;
    [key: string]: string | undefined;
  };
}

interface DimensionsMap {
  length?: { value: number; unit: string };
  width?: { value: number; unit: string };
  height?: { value: number; unit: string };
  wheelbase?: { value: number; unit: string };
  trackWidth?: { value: number; unit: string };
  weight?: { value: number; unit: string };
  gvwr?: { value: number; unit: string };
}

interface InteriorFeaturesMap {
  seats?: number;
  upholstery?: string;
  features?: string[];
}

interface TransmissionMap {
  [key: string]: string | number | undefined;
  type: string;
  speeds?: number;
}

// Type guard to check if a value is a string
function isString(value: unknown): value is string {
  return typeof value === "string";
}

// Type guard to check if a value is a MeasurementValue
function isMeasurementValue(value: unknown): value is MeasurementValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "unit" in value &&
    (typeof (value as MeasurementValue).value === "number" ||
      (value as MeasurementValue).value === null) &&
    typeof (value as MeasurementValue).unit === "string"
  );
}

// Handle dimensions with proper type checking
function handleDimensions(
  dimensions: Record<string, unknown>
): Record<string, MeasurementValue | undefined> {
  const result: Record<string, MeasurementValue | undefined> = {};
  for (const [key, value] of Object.entries(dimensions)) {
    if (isMeasurementValue(value)) {
      result[key] = value;
    }
  }
  return result;
}

// Handle interior features with proper type checking
function handleInteriorFeatures(
  features: Record<string, unknown>
): CarFormData["interior_features"] {
  return {
    seats: typeof features.seats === "number" ? features.seats : undefined,
    upholstery: isString(features.upholstery) ? features.upholstery : undefined,
    features: Array.isArray(features.features)
      ? features.features.filter(isString)
      : undefined,
  };
}

// Handle transmission with proper type checking
function handleTransmission(
  transmission: Record<string, unknown>
): CarFormData["transmission"] {
  return {
    type: isString(transmission.type) ? transmission.type : "",
    speeds:
      typeof transmission.speeds === "number" ? transmission.speeds : undefined,
  };
}

// Type guard for field type
const isStringField = (field: string | number): field is string => {
  return typeof field === "string";
};

// Handle nested paths like "engine.displacement"
const handleNestedPath = (
  field: string,
  value: unknown,
  prev: EditableSpecs
) => {
  if (field.includes(".")) {
    const [parentField, childField] = field.split(".");
    const parentValue = (prev[parentField as keyof EditableSpecs] ||
      {}) as Record<string, unknown>;
    return {
      ...prev,
      [parentField]: {
        ...parentValue,
        [childField]: value,
      },
    };
  }
  return prev;
};

// Convert car data to form data with proper type handling
const toCarFormData = (car: ExtendedCar): CarFormData => {
  const transformedClientInfo = car.clientInfo
    ? {
        name: car.clientInfo.name,
        email: car.clientInfo.email,
        phone: car.clientInfo.phone,
        address: car.clientInfo.address
          ? `${car.clientInfo.address.street || ""}, ${
              car.clientInfo.address.city || ""
            }, ${car.clientInfo.address.state || ""} ${
              car.clientInfo.address.zipCode || ""
            }, ${car.clientInfo.address.country || ""}`
          : undefined,
        company: car.clientInfo.businessType,
      }
    : undefined;

  return {
    ...car,
    year: car.year ?? 0,
    mileage: car.mileage ?? { value: 0, unit: "mi" },
    clientInfo: transformedClientInfo,
  };
};

const toBaseMileage = (
  measurement: MeasurementValue | undefined
): { value: number; unit: string } | undefined => {
  if (!measurement || measurement.value === null) {
    return { value: 0, unit: measurement?.unit || "mi" };
  }
  return {
    value: measurement.value,
    unit: measurement.unit,
  };
};

// Convert form data back to car data with proper type handling
const fromCarFormData = (
  formData: CarFormData,
  originalCar: ExtendedCar
): Partial<BaseCar> => {
  const {
    dimensions,
    interior_features,
    transmission,
    mileage,
    clientInfo,
    ...rest
  } = formData;

  return {
    ...rest,
    mileage: toBaseMileage(mileage),
    dimensions: dimensions
      ? Object.entries(dimensions).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: toBaseMileage(value),
          }),
          {}
        )
      : undefined,
    interior_features,
    transmission,
    clientInfo: originalCar.clientInfo,
  };
};

// Convert to BaT car details
const toBaTCarDetails = (car: ExtendedCar): BaTCarDetails => ({
  _id: car._id,
  year: car.year ?? 0,
  make: car.make,
  model: car.model,
  color: car.color,
  mileage:
    car.mileage && car.mileage.value !== null
      ? {
          value: car.mileage.value,
          unit: car.mileage.unit,
        }
      : undefined,
  engine: car.engine
    ? {
        type: car.engine.type,
        displacement:
          car.engine.displacement && car.engine.displacement.value !== null
            ? {
                value: car.engine.displacement.value,
                unit: car.engine.displacement.unit,
              }
            : undefined,
        power: car.engine.power
          ? {
              hp: car.engine.power.hp,
            }
          : undefined,
      }
    : undefined,
  transmission: car.transmission ?? { type: "" },
  vin: car.vin,
  condition: car.condition,
  interior_color: car.interior_color,
  interior_features: car.interior_features
    ? {
        seats: car.interior_features.seats ?? 0,
        upholstery: car.interior_features.upholstery,
      }
    : undefined,
  description: car.description,
});

export default function CarPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Initialize from URL search params or hash
    const tab = searchParams?.get("tab");
    if (tab) return tab;
    if (typeof window !== "undefined" && window.location.hash) {
      return window.location.hash.slice(1);
    }
    return "gallery";
  });
  const { id } = params as { id: string };
  const [car, setCar] = useState<ExtendedCar | null>(null);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSpecsEditMode, setIsSpecsEditMode] = useState(false);
  const [isSpecsSaving, setIsSpecsSaving] = useState(false);
  const [editedSpecs, setEditedSpecs] = useState<Partial<CarData> | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [showEnrichProgress, setShowEnrichProgress] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{
    step: number;
    currentStep: string;
    status: "pending" | "processing" | "complete" | "error";
    error?: string;
    details?: {
      searchTermsGenerated?: number;
      additionalSearchesCompleted?: number;
      fieldsUpdated?: number;
      protectedFieldsPreserved?: string[];
    };
  }>({
    step: 0,
    currentStep: "",
    status: "pending",
  });
  const [additionalContext, setAdditionalContext] = useState("");
  const [imagesLoading, setImagesLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isPending, startTransition] = useReactTransition();

  // Filtering state
  const [activeFilters, setActiveFilters] = useState<{
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
    side?: string;
  }>({});
  const [filterOptions, setFilterOptions] = useState<{
    angles: string[];
    views: string[];
    movements: string[];
    tods: string[];
    sides: string[];
  }>({ angles: [], views: [], movements: [], tods: [], sides: [] });

  // Memoized filter option update function to avoid unnecessary rerenders
  const handleFilterOptionsChange = useCallback(
    (options: Record<string, string[]>) => {
      // Cast the options to match the expected type
      setFilterOptions({
        angles: options.angles || [],
        views: options.views || [],
        movements: options.movements || [],
        tods: options.tods || [],
        sides: options.sides || [],
      });
    },
    []
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (filterType: string, value: string) => {
      setActiveFilters((prev) => ({
        ...prev,
        [filterType]:
          value === prev[filterType as keyof typeof prev] ? undefined : value,
      }));
    },
    []
  );

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  // Create a CarsClientContext object for the ImageUploadWithContext component
  const carsClientContext = {
    uploadImages: async (
      carId: string,
      files: File[],
      setProgress: (progress: UploadProgress[]) => void
    ) => {
      try {
        // Initialize progress tracking
        const initialProgress = files.map((file) => ({
          fileName: file.name,
          progress: 0,
          status: "pending" as const,
          currentStep: "Starting upload...",
        }));
        setProgress(initialProgress);

        // Convert File[] to FileList-like object for handleImageUpload
        const fileListLike = {
          length: files.length,
          item: (index: number) => files[index],
          [Symbol.iterator]: function* () {
            for (let i = 0; i < files.length; i++) {
              yield files[i];
            }
          },
        } as unknown as FileList;

        // Use the existing handleImageUpload function
        await handleImageUpload(fileListLike);
      } catch (error) {
        console.error("Error in uploadImages:", error);
      }
    },
    deleteImage: async (
      carId: string,
      imageId: string,
      setStatus: (status: any) => void
    ) => {
      console.log(`========== CONTEXT deleteImage CALLED ==========`);
      console.log(`Car ID: ${carId}, Image ID: ${imageId}`);
      try {
        setStatus({ status: "deleting" });

        // Find the image index
        const imageIndex =
          car?.images?.findIndex((img) => img._id === imageId) ?? -1;

        console.log(`Found image at index: ${imageIndex}`);
        if (imageIndex === -1) {
          console.error(`Image with ID ${imageId} not found in car images`);
          throw new Error("Image not found");
        }

        console.log(
          `Calling handleRemoveImage with index [${imageIndex}] and deleteFromStorage=true`
        );
        // Use the existing handleRemoveImage function - FORCE deleteFromStorage to true
        const deleteFromStorage = true; // Make it explicitly a boolean true
        console.log(`Type of deleteFromStorage: ${typeof deleteFromStorage}`);

        await handleRemoveImage([imageIndex], deleteFromStorage);
        console.log(`handleRemoveImage completed successfully`);

        setStatus({ status: "complete" });
      } catch (error) {
        console.error("Error in deleteImage:", error);
        setStatus({ status: "error", error: "Failed to delete image" });
      }
    },
  };

  type NestedFields =
    | "engine"
    | "dimensions"
    | "interior_features"
    | "performance"
    | "transmission"
    | "weight";

  // Helper function to handle input values
  const getInputValue = (
    value: string | number | MeasurementValue | null | undefined
  ): string => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") return value.toString();
    if (typeof value === "string") return value;
    if (value.value === null) return "";
    return value.value.toString();
  };

  // Helper function to handle number input values
  const getNumberInputValue = (
    value: string | number | MeasurementValue | null | undefined
  ): string => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") return value.toString();
    if (typeof value === "string" && !isNaN(Number(value))) return value;
    if (typeof value === "object" && value.value !== null)
      return value.value.toString();
    return "";
  };

  // Helper function to format structured measurement values
  const formatMeasurement = (
    measurement: MeasurementValue | string | undefined
  ): string => {
    if (!measurement) return "N/A";
    if (typeof measurement === "string") return measurement;
    if (measurement.value === null) return "N/A";
    return `${measurement.value} ${measurement.unit}`;
  };

  // Helper function to display mileage
  const formatMileage = (mileage: MeasurementValue | undefined): string => {
    if (!mileage || mileage.value === null || mileage.value === undefined)
      return "0";
    return (
      mileage.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
      " " +
      (mileage.unit || "")
    );
  };

  // Type guard for nested fields
  const isNestedField = (field: keyof EditableSpecs): field is NestedFields => {
    return [
      "engine",
      "dimensions",
      "interior_features",
      "performance",
      "transmission",
      "weight",
    ].includes(field as string);
  };

  // Update the handleInputChange function to handle nested paths safely
  const handleInputChange = (
    field: string,
    value: string | number,
    nestedField?: string
  ) => {
    setEditedSpecs((prev) => {
      if (!prev) return prev;

      // Handle direct field updates
      if (!nestedField) {
        return {
          ...prev,
          [field]: value,
        };
      }

      // Handle nested fields
      const existingFieldValue = (prev[field as keyof CarData] || {}) as Record<
        string,
        unknown
      >;
      return {
        ...prev,
        [field]: {
          ...existingFieldValue,
          [nestedField]: value,
        },
      };
    });
  };

  // Helper function to handle measurement input changes
  const handleMeasurementChange = (
    field: keyof EditableSpecs | string,
    value: MeasurementValue,
    nestedField?: string
  ): void => {
    setEditedSpecs((prev: Partial<CarData> | null) => {
      if (!prev) return prev;
      // Handle nested paths like "engine.displacement"
      if (typeof field === "string" && field.includes(".")) {
        const [parentField, childField] = field.split(".");
        const parentValue = (prev[parentField as keyof CarData] ||
          {}) as Record<string, any>;
        return {
          ...prev,
          [parentField]: {
            ...parentValue,
            [childField]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Add helper function to handle power change
  const handlePowerChange = (value: MeasurementValue) => {
    if (value.value === null) return;

    const hp = value.value;
    const kW = Math.round(hp * 0.7457 * 100) / 100;
    const ps = Math.round(hp * 1.01387 * 100) / 100;

    setEditedSpecs((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        engine: {
          ...prev.engine,
          power: { hp, kW, ps },
        },
      };
    });
  };

  // Add helper function to handle torque change
  const handleTorqueChange = (value: MeasurementValue) => {
    if (value.value === null) return;

    const lbFt = value.value;
    const Nm = Math.round(lbFt * 1.3558 * 100) / 100;

    setEditedSpecs((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        engine: {
          ...prev.engine,
          torque: { "lb-ft": lbFt, Nm },
        },
      };
    });
  };

  // Add escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditMode) {
        setIsEditMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode]);

  // Add effect to refresh car data when entering edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const refreshCarData = async () => {
        try {
          const response = await fetch(`/api/cars/${id}`);
          if (!response.ok) throw new Error("Failed to fetch car data");
          const carData = await response.json();
          setCar(carData);
        } catch (error) {
          console.error("Error refreshing car data:", error);
        }
      };
      refreshCarData();
    }
  }, [isEditMode, id]);

  useEffect(() => {
    const fetchCarData = async () => {
      if (!id) return;

      try {
        // Always set loading to true immediately without any delay
        setIsLoading(true);
        setError(null);

        // Create an AbortController to cancel fetch requests if component unmounts
        const controller = new AbortController();
        const signal = controller.signal;

        // Fetch car data with the signal
        const carResponse = await fetch(`/api/cars/${id}?includeImages=true`, {
          signal,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!carResponse.ok) {
          throw new Error(`Failed to fetch car: ${carResponse.statusText}`);
        }

        const carData = await carResponse.json();
        if (!carData) {
          throw new Error("No car data received");
        }

        // Update state with data
        setCar(carData);
        setEditedSpecs(carData ? toCarFormData(carData) : null);

        // Fetch documents in parallel
        fetch(`/api/cars/${id}/documents`, { signal })
          .then((response) => {
            if (!response.ok) {
              console.error("Failed to fetch documents:", response.statusText);
              return [];
            }
            return response.json();
          })
          .then((docsData) => {
            setDocuments(docsData);
          })
          .catch((err) => {
            console.error("Error fetching documents:", err);
          });

        // Set loading to false once we have the main car data
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching car data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setIsLoading(false);
      }
    };

    // Immediately fetch the car data when the component mounts
    fetchCarData();

    // Cleanup function
    return () => {
      // Cleanup code here
    };
  }, [id]);

  // Add a useEffect specifically for prefetching related data
  useEffect(() => {
    if (!car || !id) return;

    // Prefetch related data to improve navigation experience
    const prefetchRelatedData = async () => {
      try {
        // Prefetch client data if we have car data
        if (car.client) {
          fetch(`/api/clients/${car.client}`).catch(() => {});
        }

        // Prefetch other related endpoints
        fetch(`/api/cars/${id}/events`).catch(() => {});
        fetch(`/api/cars/${id}/deliverables`).catch(() => {});
      } catch (error) {
        // Silently fail prefetching - it's just an optimization
      }
    };

    prefetchRelatedData();
  }, [car, id]);

  // Simplify image loading state effect
  useEffect(() => {
    if (car && car.images) {
      // Only set loading flag initially if no images are loaded yet
      if (car.images.length === 0) {
        setImagesLoading(true);
      } else {
        setImagesLoading(false);
      }
    }
  }, [car?.images]);

  // Sync URL with active tab
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    } else if (typeof window !== "undefined" && window.location.hash) {
      const hashTab = window.location.hash.slice(1);
      if (hashTab !== activeTab) {
        setActiveTab(hashTab);
      }
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL with the new tab value
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    newParams.set("tab", value);
    router.push(`/cars/${params.id}?${newParams.toString()}#${value}`, {
      scroll: false,
    });
  };

  // Add a new state to track if we need to show upload status
  const [showUploadStatus, setShowUploadStatus] = useState(false);

  // Update the handleImageUpload function to set showUploadStatus
  const handleImageUpload = async (files: FileList) => {
    if (!car) return;

    try {
      // Initialize progress tracking immediately
      const fileArray = Array.from(files);
      setUploadProgress(
        fileArray.map((file, i) => ({
          fileName: file.name,
          progress: 0,
          status: "pending" as const,
          currentStep: "Starting upload...",
        }))
      );
      setUploadingImages(true);
      setShowUploadStatus(true); // Always show status when uploading

      // Create upload promises for all files
      const uploadPromises = fileArray.map((file, i) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("carId", id);
        formData.append(
          "vehicleInfo",
          JSON.stringify({
            year: car?.year,
            make: car?.make || "",
            model: car?.model || "",
            type: car?.type,
            color: car?.color,
            interior_color: car?.interior_color,
            description: car?.description,
            condition: car?.condition,
            mileage: car?.mileage,
            vin: car?.vin,
            status: car?.status,
            doors: car?.doors,
            engine: car?.engine
              ? {
                  type: car.engine.type,
                  displacement: car.engine.displacement,
                  power: car.engine.power,
                  torque: car.engine.torque,
                  features: car.engine.features,
                  configuration: car.engine.configuration,
                  cylinders: car.engine.cylinders,
                  fuelType: car.engine.fuelType,
                  manufacturer: car.engine.manufacturer,
                }
              : undefined,
            transmission: car?.transmission,
            dimensions: car?.dimensions,
            interior_features: car?.interior_features,
            performance: car?.performance,
            additionalContext: additionalContext || undefined,
          })
        );

        // Update status to uploading
        setUploadProgress((prev) =>
          prev.map((p, index) =>
            index === i
              ? {
                  ...p,
                  status: "uploading",
                  progress: 0,
                  currentStep: "Uploading...",
                }
              : p
          )
        );

        return new Promise<{
          index: number;
          imageData: UploadedImageData;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 100) / event.total);
              setUploadProgress((prev) =>
                prev.map((p, idx) =>
                  idx === i
                    ? {
                        ...p,
                        progress,
                        currentStep:
                          progress === 100 ? "Processing..." : "Uploading...",
                      }
                    : p
                )
              );
            }
          });

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                // Update status to analyzing
                setUploadProgress((prev) =>
                  prev.map((p, idx) =>
                    idx === i
                      ? {
                          ...p,
                          progress: 100,
                          status: "analyzing",
                          currentStep: "Analyzing image...",
                        }
                      : p
                  )
                );

                const uploadResponse = JSON.parse(xhr.responseText);
                const imageData = {
                  id: uploadResponse.imageId,
                  url: uploadResponse.imageUrl,
                  filename: file.name,
                  metadata: {
                    ...uploadResponse.metadata,
                    angle: uploadResponse.metadata?.aiAnalysis?.angle || "",
                    description:
                      uploadResponse.metadata?.aiAnalysis?.description || "",
                    movement:
                      uploadResponse.metadata?.aiAnalysis?.movement || "",
                    tod: uploadResponse.metadata?.aiAnalysis?.tod || "",
                    view: uploadResponse.metadata?.aiAnalysis?.view || "",
                    side: uploadResponse.metadata?.aiAnalysis?.side || "",
                  },
                  variants: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                // Fetch latest car data immediately after successful upload
                const carResponse = await fetch(`/api/cars/${id}`);
                if (!carResponse.ok) {
                  throw new Error("Failed to fetch latest car data");
                }
                const latestCarData = await carResponse.json();

                // Update the car state with the latest data
                setCar(latestCarData);

                // Update status to complete for this image
                setUploadProgress((prev) =>
                  prev.map((p, idx) =>
                    idx === i
                      ? {
                          ...p,
                          status: "complete",
                          currentStep: "Upload complete",
                        }
                      : p
                  )
                );

                resolve({ index: i, imageData });
              } catch (error) {
                reject(error);
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("POST", "/api/cloudflare/images");
          xhr.send(formData);
        });
      });

      // Process uploads in parallel with a maximum of 3 concurrent uploads
      const batchSize = 3;
      const results = [];
      for (let i = 0; i < uploadPromises.length; i += batchSize) {
        const batch = uploadPromises.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch);
        results.push(...batchResults);
      }

      // Collect successful uploads
      const successfulUploads = results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            index: number;
            imageData: UploadedImageData;
          }> => result.status === "fulfilled"
        )
        .map((result) => result.value.imageData);

      if (successfulUploads.length > 0) {
        try {
          // Fetch latest car data once for the batch
          const carResponse = await fetch(`/api/cars/${id}`);
          if (!carResponse.ok) {
            throw new Error("Failed to fetch latest car data");
          }
          const latestCarData = await carResponse.json();

          // Combine existing images with new uploads
          const allImages = [...latestCarData.images];

          // Add new images, ensuring no duplicates by ID
          successfulUploads.forEach((newImage) => {
            if (!allImages.some((existing) => existing.id === newImage.id)) {
              allImages.push(newImage);
            }
          });

          // Update the backend with all images
          const dbResponse = await fetch(`/api/cars/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              images: allImages,
            }),
          });

          if (!dbResponse.ok) {
            throw new Error("Failed to update car images in database");
          }

          // Verify the update by fetching the latest data
          const verifyResponse = await fetch(`/api/cars/${id}`);
          if (!verifyResponse.ok) {
            throw new Error("Failed to verify image update");
          }
          const verifiedData = await verifyResponse.json();

          // Update UI with verified data
          setCar(verifiedData);
        } catch (error) {
          console.error("Error updating images:", error);
          throw error;
        }
      }

      // Update error status for failed uploads
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index
                ? {
                    ...p,
                    status: "error",
                    currentStep: "Upload failed",
                    error: result.reason.message,
                  }
                : p
            )
          );
        }
      });
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      // Only clear states if all files are complete or errored
      const allComplete = uploadProgress.every(
        (p) => p.status === "complete" || p.status === "error"
      );
      if (allComplete) {
        // Wait a moment to show completion status before clearing
        setTimeout(() => {
          setUploadingImages(false);
          setUploadProgress([]);
          // Don't hide the status immediately to let users see the completion
          setTimeout(() => {
            setShowUploadStatus(false);
          }, 5000); // Keep the status visible for 5 seconds after completion
        }, 2000);
      }
    }
  };

  const handleEnrichData = async () => {
    if (!car) return;

    setIsEnriching(true);
    setShowEnrichProgress(true);
    setEnrichProgress({
      step: 1,
      currentStep: "Initial Search",
      status: "processing",
    });

    try {
      // Start enrichment process
      const response = await fetch(`/api/cars/${car._id}/enrich`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to enrich car data");
      }

      const data = await response.json();
      console.log("Enrichment response:", data);

      if (data.success && data.data) {
        // Update progress based on backend response
        if (data.progress) {
          setEnrichProgress(data.progress);
        } else {
          setEnrichProgress({
            step: 6,
            currentStep: "Complete",
            status: "complete",
          });
        }

        // Add a small delay to ensure database write is complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Fetch fresh data after the delay
        const freshDataResponse = await fetch(`/api/cars/${car._id}`);
        if (!freshDataResponse.ok) {
          throw new Error("Failed to fetch updated car data");
        }
        const freshData = await freshDataResponse.json();
        console.log("Fresh car data:", freshData);

        // Only update if we have valid data
        if (freshData._id) {
          // Force a re-render by creating a new object
          setCar({ ...freshData });
          toast({
            title: "Car Data Enriched",
            description: "Car data enriched successfully",
          });
        } else {
          throw new Error("Invalid car data received");
        }
      } else {
        // Handle error progress from backend
        const errorMessage = data.error || "Failed to enrich car data";
        setEnrichProgress({
          step: 0,
          currentStep: "",
          status: "error",
          error: errorMessage,
        });
        toast({
          title: "Enrichment Failed",
          description: errorMessage,
          variant: "destructive",
        });
        console.error("Failed to enrich car data:", errorMessage);
      }
    } catch (error) {
      // Handle error progress
      const errorMessage =
        error instanceof Error ? error.message : "Failed to enrich car data";
      setEnrichProgress({
        step: 0,
        currentStep: "",
        status: "error",
        error: errorMessage,
      });
      toast({
        title: "Enrichment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error enriching car data:", error);
    } finally {
      // Keep isEnriching true for a moment to show completion state
      setTimeout(() => {
        setIsEnriching(false);
        setShowEnrichProgress(false);
        setEnrichProgress({
          step: 0,
          currentStep: "",
          status: "pending",
        });
      }, 2000);
    }
  };

  // Update the handleSpecsEdit function
  const handleSpecsEdit = async (
    editedSpecs: Partial<CarData>
  ): Promise<void> => {
    if (!car) return;

    try {
      setIsSpecsSaving(true);
      // Preserve the existing images and imageIds
      const updatedSpecs = {
        ...fromCarFormData(editedSpecs as CarData, car),
        // Map CarImage to Image type
        images:
          car.images?.map((img) => ({
            _id: img._id,
            cloudflareId: img.cloudflareId,
            url: img.url,
            filename: img.filename,
            metadata: img.metadata || {},
            carId: car._id,
            createdAt: img.createdAt || new Date().toISOString(),
            updatedAt: img.updatedAt || new Date().toISOString(),
          })) || [],
        imageIds: car.imageIds || [],
      };

      console.log("Updating car with specs:", updatedSpecs);

      const response = await fetch(`/api/cars/${car._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSpecs),
      });

      if (!response.ok) {
        throw new Error("Failed to update car specifications");
      }

      const updatedCar = await response.json();
      console.log("Updated car:", updatedCar);
      setCar(updatedCar);
      setIsSpecsEditMode(false);
    } catch (error) {
      console.error("Error updating car specifications:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update car specifications",
        variant: "destructive",
      });
    } finally {
      setIsSpecsSaving(false);
    }
  };

  // Add helper function to format power values
  const formatPower = (power?: Power): string => {
    if (!power) return "N/A";
    return `${power.hp} hp / ${power.kW} kW / ${power.ps} ps`;
  };

  // Add helper function to format torque values
  const formatTorque = (torque?: Torque): string => {
    if (!torque) return "N/A";
    return `${torque["lb-ft"]} lb-ft / ${torque.Nm} Nm`;
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this car? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/cars/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete car");
      }

      router.push("/cars");
    } catch (error) {
      console.error("Error deleting car:", error);
      alert("Failed to delete car. Please try again.");
    }
  };

  // Helper to format address object to string
  const formatAddress = (address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }) => {
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
  };

  // Handle image operations
  const handleRemoveImage = async (
    indices: number[],
    deleteFromStorage = false
  ) => {
    console.log("=========== handleRemoveImage ENTRY POINT ===========");
    console.log("[DEBUG handleRemoveImage] Called with:", {
      indices,
      deleteFromStorage,
    });

    if (!car?.images?.length) {
      console.log("[DEBUG] No images to delete - car has no images");
      return;
    }

    try {
      // Get the actual images to delete based on indices
      const imagesToDelete = indices
        .filter((index) => index >= 0 && index < car.images!.length)
        .map((index) => car.images![index]);

      console.log(
        "[DEBUG] Images to delete:",
        imagesToDelete.map((img) => ({
          _id: img._id,
          cloudflareId: img.cloudflareId,
          url: img.url.substring(0, 30) + "...",
        }))
      );

      // Optimistically update UI
      const remainingImages = car.images.filter((_, i) => !indices.includes(i));
      setCar((prev) => (prev ? { ...prev, images: remainingImages } : null));

      if (deleteFromStorage) {
        try {
          const apiUrl = new URL(
            `/api/cars/${car._id}/images/batch`,
            window.location.origin
          );
          console.log("Full API URL:", apiUrl.toString());

          // Send both MongoDB IDs and Cloudflare IDs
          const payload = {
            imageIds: imagesToDelete.map((img) => img._id), // MongoDB ObjectIds
            cloudflareIds: imagesToDelete
              .map((img) => img.cloudflareId)
              .filter(Boolean), // Cloudflare IDs
            deleteFromStorage: true,
          };

          console.log(
            "[DEBUG] Delete payload:",
            JSON.stringify(payload, null, 2)
          );

          const response = await fetch(apiUrl.toString(), {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            credentials: "same-origin",
          });

          console.log("[DEBUG] API Response status:", response.status);
          const responseData = await response.json();
          console.log(
            "[DEBUG] API Response data:",
            JSON.stringify(responseData, null, 2)
          );

          if (!response.ok) {
            throw new Error(
              `Failed to delete images: ${JSON.stringify(responseData)}`
            );
          }

          // Refresh car data to ensure UI is in sync
          await refreshCarData();
          toast({
            title: "Images Deleted",
            description: "Images deleted successfully",
          });
        } catch (error: any) {
          console.error("[DEBUG] Error deleting images:", error);
          toast({
            title: "Delete Failed",
            description: `Failed to delete images: ${
              error.message || "Unknown error"
            }`,
            variant: "destructive",
          });
          // Refresh car data even on error to ensure UI is in sync
          await refreshCarData();
        }
      }
    } catch (error) {
      console.error("[DEBUG] Error in handleRemoveImage:", error);
      await refreshCarData();
      throw error;
    }
  };

  // Function to refresh car data after operations
  const refreshCarData = async () => {
    try {
      console.log("Refreshing car data for ID:", id);

      // Generate a unique timestamp that includes microseconds for true uniqueness
      const timestamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log(`Using cache-busting timestamp: ${timestamp}`);

      // Add cache-busting timestamp and no-store fetch option to bypass all caching
      const refreshResponse = await fetch(`/api/cars/${id}?t=${timestamp}`, {
        cache: "no-store",
        next: { revalidate: 0 },
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          "X-Requested-With": "XMLHttpRequest",
          "X-Timestamp": timestamp,
        },
      });

      if (!refreshResponse.ok) {
        throw new Error(
          `Failed to refresh car data: ${refreshResponse.status}`
        );
      }

      const updatedCar = await refreshResponse.json();
      console.log(
        "Car data refreshed with",
        updatedCar.imageIds?.length || 0,
        "imageIds"
      );

      // Log image IDs to help with debugging
      console.log("Image IDs in refreshed data:", updatedCar.imageIds);

      // Force a complete re-render by creating a completely new object
      // with explicit spread to avoid reference issues
      setCar({ ...JSON.parse(JSON.stringify(updatedCar)) });
      return updatedCar;
    } catch (error) {
      console.error("Error refreshing car data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh car data",
        variant: "destructive",
      });
      return null;
    }
  };

  // Add debug log for image data
  console.log("Debug car data in render:", {
    id: car?._id,
    hasImages: Boolean(car?.imageIds?.length),
    imageCount: car?.imageIds?.length || 0,
  });

  // Add debug logging for primaryImageId
  React.useEffect(() => {
    if (car) {
      console.log(
        `[Car Page] Current car primaryImageId: ${car.primaryImageId || "None"}`
      );
    }
  }, [car]);

  const handlePrimaryImageChange = async (imageId: string) => {
    console.log(`[Car Page] Setting primary image ID to: ${imageId}`);

    // Extract ID from URL if it's embedded in the URL but not passed as a proper ID
    if (!imageId || imageId.trim() === "") {
      console.error(
        "[Car Page] Error: Received empty imageId in handlePrimaryImageChange"
      );
      return;
    }

    // Make API call to update the primaryImageId in the database
    try {
      const response = await fetch(`/api/cars/${id}/thumbnail`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ primaryImageId: imageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update primary image");
      }

      // Update car state with the new primary image ID
      setCar((prevCar) => {
        if (!prevCar) return prevCar;
        console.log(
          `[Car Page] Updating car state with primaryImageId: ${imageId}`
        );
        console.log(
          `[Car Page] Previous primaryImageId: ${
            prevCar.primaryImageId || "None"
          }`
        );
        return {
          ...prevCar,
          primaryImageId: imageId,
        };
      });

      // Refresh car data to ensure UI updates
      console.log("[Car Page] Refreshing car data after primary image change");
      await refreshCarData();
    } catch (error) {
      console.error("[Car Page] Error updating primary image:", error);
    }
  };

  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Helper function to generate car title that handles null values
  const generateCarTitle = () => {
    if (!car) return "";
    return [
      car.year ? car.year : null,
      car.make ? car.make : null,
      car.model ? car.model : null,
    ]
      .filter(Boolean)
      .join(" ");
  };

  // Add a function to be passed to ImageGalleryWithQuery to notify parent of uploads
  const notifyUploadStarted = () => {
    console.log("Upload started notification from ImageGalleryWithQuery");
    setShowUploadStatus(true);
    setUploadingImages(true);
  };

  const notifyUploadEnded = () => {
    console.log("Upload ended notification from ImageGalleryWithQuery");
    // Keep the status visible for a moment after completion
    setTimeout(() => {
      setUploadingImages(false);

      // Delay hiding status to allow users to see completion
      setTimeout(() => {
        setShowUploadStatus(false);
      }, 5000);
    }, 1000);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container-wide px-4 py-8 min-h-[70vh]">
          {error ? (
            <div className="max-w-2xl mx-auto bg-destructive-50 dark:bg-destructive-900 border border-destructive-200 dark:border-destructive-800 text-destructive-700 dark:text-destructive-200 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              {/* Car title and header - always show this */}
              <div className="flex items-center gap-4 mb-6">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-border-primary shrink-0">
                        {car?.primaryImageId &&
                        car?.images &&
                        car?.images.length > 0 ? (
                          car.images.find(
                            (img) => img._id === car.primaryImageId
                          ) ? (
                            <Image
                              src={
                                car.images.find(
                                  (img) => img._id === car.primaryImageId
                                )?.url || ""
                              }
                              alt={generateCarTitle()}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                // If primary image fails, try to show the first image
                                if (car.images && car.images.length > 0) {
                                  (e.target as HTMLImageElement).src =
                                    car.images[0].url;
                                }
                              }}
                            />
                          ) : car.images && car.images[0] ? (
                            <Image
                              src={car.images[0].url}
                              alt={generateCarTitle()}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-background-secondary flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-text-secondary" />
                            </div>
                          )
                        ) : (
                          <div className="w-full h-full bg-background-secondary flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-text-secondary" />
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {car?.primaryImageId
                          ? "Primary image"
                          : "No primary image selected"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PageTitle title={generateCarTitle()} className="" />
              </div>

              {/* Always render tabs - each tab handles its own loading state */}
              <CustomTabs
                items={[
                  {
                    value: "gallery",
                    label: "Image Gallery",
                    content: (
                      <div className="space-y-4">
                        <div className="image-gallery-wrapper">
                          <ImageGalleryWithQuery
                            carId={params.id}
                            vehicleInfo={{
                              make: car?.make || "",
                              model: car?.model || "",
                              year: car?.year || 0,
                              color: car?.color || "",
                            }}
                            onFilterOptionsChange={handleFilterOptionsChange}
                            showFilters={true}
                            onUploadStarted={notifyUploadStarted}
                            onUploadEnded={notifyUploadEnded}
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    value: "specs",
                    label: "Specifications",
                    content: car ? (
                      <Specifications
                        car={toCarFormData(car)}
                        isEditMode={isSpecsEditMode}
                        onEdit={() => setIsSpecsEditMode(!isSpecsEditMode)}
                        onSave={async (editedSpecs) => {
                          await handleSpecsEdit(editedSpecs as CarData);
                        }}
                        editedSpecs={editedSpecs}
                        onInputChange={(field, value, nestedField) =>
                          handleInputChange(field, value, nestedField)
                        }
                        onMeasurementChange={handleMeasurementChange}
                        onPowerChange={handlePowerChange}
                        onTorqueChange={handleTorqueChange}
                        onEnrich={handleEnrichData}
                        isEnriching={isEnriching}
                      />
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading specifications...
                      </div>
                    ),
                  },
                  {
                    value: "shoots",
                    label: "Photo Shoots",
                    content: <PhotoShoots carId={id} />,
                  },
                  {
                    value: "shot-lists",
                    label: "Shot Lists",
                    content: <ShotList carId={id} />,
                  },
                  {
                    value: "scripts",
                    label: "Scripts",
                    content: <Scripts carId={id} />,
                  },
                  {
                    value: "bat",
                    label: "BaT Listing",
                    content: car ? (
                      <BaTListingGenerator
                        carDetails={{
                          _id: car._id,
                          year: car.year ?? 0,
                          make: car.make,
                          model: car.model,
                          color: car.color,
                          mileage: car.mileage
                            ? {
                                value: car.mileage.value || 0,
                                unit: car.mileage.unit,
                              }
                            : undefined,
                          engine: car.engine,
                          description: car.description || "",
                        }}
                      />
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading BaT listing...
                      </div>
                    ),
                  },
                  {
                    value: "captions",
                    label: "Social Media",
                    content: car ? (
                      <CaptionGenerator
                        carDetails={{
                          _id: car._id,
                          year: car.year ?? 0,
                          make: car.make,
                          model: car.model,
                          color: car.color,
                          engine: car.engine,
                          mileage: car.mileage
                            ? {
                                value: car.mileage.value || 0,
                                unit: car.mileage.unit,
                              }
                            : undefined,
                          type: car.type,
                          client: car.client,
                          description: car.description || "",
                        }}
                      />
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading caption generator...
                      </div>
                    ),
                  },
                  {
                    value: "service",
                    label: "Service History",
                    content: (
                      <div className="text-center py-12 text-muted-foreground">
                        Service history coming soon
                      </div>
                    ),
                  },
                  {
                    value: "research",
                    label: "Research",
                    content: <ResearchFiles carId={id} />,
                  },
                  {
                    value: "documentation",
                    label: "Documentation",
                    content: <DocumentationFiles carId={id} />,
                  },
                  {
                    value: "article",
                    label: "Article",
                    content: car ? (
                      <ArticleGenerator
                        car={
                          fromCarFormData(toCarFormData(car), car) as BaseCar
                        }
                      />
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading article generator...
                      </div>
                    ),
                  },
                  {
                    value: "deliverables",
                    label: "Deliverables",
                    content: <DeliverablesTab carId={id} />,
                  },
                  {
                    value: "events",
                    label: "Events",
                    content: <EventsTab carId={id} />,
                  },
                  {
                    value: "calendar",
                    label: "Calendar",
                    content: <FullCalendarTab carId={id} />,
                  },
                ]}
                defaultValue={activeTab}
                basePath={`/cars/${id}`}
              />
            </>
          )}
        </main>

        {/* Sticky header for primary image and car title when scrolling */}
        {car && !isLoading && (
          <div
            className={`fixed top-16 left-0 right-0 z-10 bg-background border-b border-border-primary shadow-sm py-2 transform transition-all duration-300 ${
              hasScrolled
                ? "translate-y-0 opacity-100"
                : "-translate-y-full opacity-0"
            }`}
          >
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border-primary shrink-0">
                  {car.primaryImageId && car.images && car.images.length > 0 ? (
                    car.images.find((img) => img._id === car.primaryImageId) ? (
                      <Image
                        src={
                          car.images.find(
                            (img) => img._id === car.primaryImageId
                          )?.url || ""
                        }
                        alt={generateCarTitle()}
                        fill
                        className="object-cover"
                      />
                    ) : car.images && car.images[0] ? (
                      <Image
                        src={car.images[0].url}
                        alt={generateCarTitle()}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-background-secondary flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-text-secondary" />
                      </div>
                    )
                  ) : (
                    <div className="w-full h-full bg-background-secondary flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-text-secondary" />
                    </div>
                  )}
                </div>
                <h1 className="text-base font-semibold text-text-primary truncate">
                  {generateCarTitle()}
                </h1>
                <div className="ml-auto text-sm text-text-secondary">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />

        <EnrichmentProgress
          isVisible={showEnrichProgress}
          step={enrichProgress.step}
          _currentStep={enrichProgress.currentStep}
          status={enrichProgress.status}
          error={enrichProgress.error}
          details={enrichProgress.details}
          onClose={() => setShowEnrichProgress(false)}
        />
      </div>
    </AuthGuard>
  );
}
