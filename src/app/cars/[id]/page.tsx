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
import type { Car as BaseCar, CarImage } from "@/types/car";
import type { MeasurementValue } from "@/types/measurements";
import type {
  ExtendedCar,
  CarFormData,
  EditableSpecs,
  UploadProgress,
  UploadedImageData,
  BaTCarDetails,
  FormClientInfo,
  ApiClientInfo,
  ImageData,
  Performance,
} from "@/types/car-page";
import { Power, Torque } from "@/types/car";
import DeliverablesTab from "@/components/deliverables/DeliverablesTab";
import EventsTab from "@/components/events/EventsTab";
import CalendarTab from "@/components/cars/CalendarTab";
import FullCalendarTab from "@/components/cars/FullCalendarTab";
import ShotList from "@/components/cars/ShotList";
import Scripts from "@/components/cars/Scripts";
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
import {
  isString,
  isMeasurementValue,
  handleDimensions,
  handleInteriorFeatures,
  handleTransmission,
  isStringField,
  handleNestedPath,
  toCarFormData,
  toBaseMileage,
  fromCarFormData,
  toBaTCarDetails,
  formatMeasurement,
  formatMileage,
  formatPower,
  formatTorque,
  formatAddress,
  generateCarTitle,
} from "@/utils/car-helpers";
import { CarAvatar } from "@/components/ui/CarAvatar";

interface PageParams {
  id: string;
}

export default function CarPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id?.toString();

  // All state declarations at the top level
  const [activeTab, setActiveTab] = useState<string>(
    searchParams?.get("tab")?.toString() ||
      (typeof window !== "undefined" && window.location.hash
        ? window.location.hash.slice(1)
        : "gallery")
  );
  const [car, setCar] = useState<ExtendedCar | null>(null);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSpecsEditMode, setIsSpecsEditMode] = useState(false);
  const [isSpecsSaving, setIsSpecsSaving] = useState(false);
  const [editedSpecs, setEditedSpecs] = useState<EditableSpecs | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [imagesLoading, setImagesLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isPending, startTransition] = useReactTransition();
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
  const [uploadedImages, setUploadedImages] = useState<UploadedImageData[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // All useEffect declarations at the top level
  useEffect(() => {
    if (!id) {
      router.push("/cars");
      return;
    }
  }, [id, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const refreshCarData = async () => {
      if (!id) return;
      try {
        const response = await fetch(`/api/cars/${id}`);
        if (!response.ok) throw new Error("Failed to refresh car data");
        const data = await response.json();
        setCar(data);
      } catch (error) {
        console.error("Error refreshing car data:", error);
      }
    };
    refreshCarData();
  }, [id]);

  useEffect(() => {
    const fetchCarData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const response = await fetch(`/api/cars/${id}`);
        if (!response.ok) throw new Error("Failed to fetch car data");
        const data = await response.json();
        setCar(data);
      } catch (error) {
        console.error("Error fetching car data:", error);
        setError("Failed to load car data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCarData();
  }, [id]);

  useEffect(() => {
    const prefetchRelatedData = async () => {
      if (!id) return;
      try {
        const [docsResponse] = await Promise.all([
          fetch(`/api/cars/${id}/documents`),
        ]);
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          setDocuments(docsData);
        }
      } catch (error) {
        console.error("Error fetching related data:", error);
      }
    };
    prefetchRelatedData();
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!car) return;
    // Additional car-related effects
  }, [car]);

  useEffect(() => {
    const handleImageUploadComplete = () => {
      setUploadingImages(false);
      setUploadProgress([]);
    };
    window.addEventListener("imageUploadComplete", handleImageUploadComplete);
    return () =>
      window.removeEventListener(
        "imageUploadComplete",
        handleImageUploadComplete
      );
  }, []);

  // Return early if no ID
  if (!id) {
    router.push("/cars");
    return null;
  }

  // Define all handler functions after hooks and early return
  const handleFilterOptionsChange = (options: Record<string, string[]>) => {
    setFilterOptions({
      angles: options.angles || [],
      views: options.views || [],
      movements: options.movements || [],
      tods: options.tods || [],
      sides: options.sides || [],
    });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterType]:
        value === prev[filterType as keyof typeof prev] ? undefined : value,
    }));
  };

  const handleResetFilters = () => {
    setActiveFilters({});
  };

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;
    try {
      setUploadingImages(true);
      // ... rest of the upload logic ...
    } catch (error) {
      console.error("Error uploading images:", error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const notifyUploadStarted = () => {
    toast({
      title: "Upload Started",
      description: "Your images are being uploaded...",
    });
  };

  const notifyUploadEnded = () => {
    toast({
      title: "Upload Complete",
      description: "Your images have been uploaded successfully.",
    });
    refreshCarData();
  };

  const handleSpecsEdit = async (editedSpecs: ExtendedCar) => {
    try {
      const response = await fetch(`/api/cars/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedSpecs),
      });

      if (!response.ok) {
        throw new Error("Failed to update specifications");
      }

      await refreshCarData();
      setIsSpecsEditMode(false);
      toast({
        title: "Success",
        description: "Car specifications updated successfully",
      });
    } catch (error) {
      console.error("Error updating specifications:", error);
      toast({
        title: "Error",
        description: "Failed to update specifications",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (
    field: string,
    value: any,
    nestedField?: string
  ) => {
    setEditedSpecs((prev: any) => ({
      ...prev,
      [field]: nestedField ? { ...prev[field], [nestedField]: value } : value,
    }));
  };

  const handleMeasurementChange = (
    field: string,
    value: any,
    nestedField?: string
  ) => {
    handleInputChange(field, value, nestedField);
  };

  const handlePowerChange = (value: MeasurementValue) => {
    const hp = value.value || 0;
    const kW = Math.round(hp * 0.7457);
    const ps = Math.round(hp * 1.014);

    setEditedSpecs((prev: any) => ({
      ...prev,
      engine: {
        ...prev.engine,
        power: { hp, kW, ps },
      },
    }));
  };

  const handleTorqueChange = (value: MeasurementValue) => {
    const isLbFt = value.unit === "lb-ft";
    const lbFt = isLbFt
      ? value.value || 0
      : Math.round((value.value || 0) * 0.7376);
    const Nm = isLbFt
      ? Math.round((value.value || 0) * 1.3558)
      : value.value || 0;

    setEditedSpecs((prev: any) => ({
      ...prev,
      engine: {
        ...prev.engine,
        torque: { "lb-ft": lbFt, Nm },
      },
    }));
  };

  const refreshCarData = async () => {
    try {
      const response = await fetch(`/api/cars/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to refresh car data");
      }
      const data = await response.json();
      // Update your car state here
      setCar(data);
    } catch (error) {
      console.error("Error refreshing car data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh car data",
        variant: "destructive",
      });
    }
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
                <CarAvatar
                  images={car?.images}
                  primaryImageId={car?.primaryImageId}
                  alt={generateCarTitle(car)}
                  showTooltip
                  tooltipContent={
                    <p>
                      {car?.primaryImageId
                        ? "Primary image"
                        : "No primary image selected"}
                    </p>
                  }
                />
                <PageTitle title={generateCarTitle(car)} className="" />
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
                            carId={params.id as string}
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
                          await handleSpecsEdit(editedSpecs as ExtendedCar);
                        }}
                        onCancel={() => setIsSpecsEditMode(false)}
                        onRefresh={refreshCarData}
                        editedSpecs={editedSpecs}
                        onInputChange={(field, value, nestedField) =>
                          handleInputChange(field, value, nestedField)
                        }
                        onMeasurementChange={handleMeasurementChange}
                        onPowerChange={handlePowerChange}
                        onTorqueChange={handleTorqueChange}
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
                <CarAvatar
                  images={car?.images}
                  primaryImageId={car?.primaryImageId}
                  alt={generateCarTitle(car)}
                  size="sm"
                />
                <h1 className="text-base font-semibold text-text-primary truncate">
                  {generateCarTitle(car)}
                </h1>
                <div className="ml-auto text-sm text-text-secondary">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </AuthGuard>
  );
}
