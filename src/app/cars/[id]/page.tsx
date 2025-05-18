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
import { GalleryContainer } from "@/components/cars/GalleryContainer";
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
import { generateCarTitle } from "@/utils/car-helpers";
import { CarAvatar } from "@/components/ui/CarAvatar";
import { FileInfoDisplay } from "@/components/ui/FileInfoDisplay";
import SpecificationsStandalone from "@/components/cars/SpecificationsStandalone";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isPending, startTransition] = useReactTransition();

  // All useEffect declarations at the top level
  useEffect(() => {
    if (!id) {
      router.push("/cars");
      return;
    }
  }, [id, router]);

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

  // Return early if no ID
  if (!id) {
    router.push("/cars");
    return null;
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
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
                          <GalleryContainer
                            carId={id}
                            car={{
                              _id: id,
                              year: car?.year || 0,
                              make: car?.make || "",
                              model: car?.model || "",
                              primaryImageId: car?.primaryImageId,
                            }}
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    value: "specs",
                    label: "Specifications",
                    content: <SpecificationsStandalone carId={id} />,
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
                      <ArticleGenerator car={car as BaseCar} />
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
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
