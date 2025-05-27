"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useMemo,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
// import Navbar from "@/components/layout/navbar"; // Removed Navbar import
import { PageTitle } from "@/components/ui/PageTitle";
import { CarAvatar } from "@/components/ui/CarAvatar";
import SpecificationsStandalone from "@/components/cars/SpecificationsStandalone";
import { CustomTabs } from "@/components/ui/custom-tabs";
import type { ExtendedCar } from "@/types/car-page";
import DeliverablesTab from "@/components/deliverables/DeliverablesTab";
import EventsTab from "@/components/events/EventsTab";
import FullCalendarTab from "@/components/cars/FullCalendarTab";
import ShotList from "@/components/cars/ShotList";
import Scripts from "@/components/cars/Scripts";
import PhotoShoots from "@/components/cars/PhotoShoots";
import { GalleryContainer } from "@/components/cars/GalleryContainer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { generateCarTitle } from "@/utils/car-helpers";
import { CarCopywriter } from "@/components/cars/CarCopywriter";
import BaTListingGenerator from "@/components/BaTListingGenerator";
import DocumentationFiles from "@/components/DocumentationFiles";
import { ArticleGenerator } from "@/components/cars/ArticleGenerator";
import InspectionTab from "@/components/cars/InspectionTab";
import CarGalleries from "@/components/cars/CarGalleries";

export default function CarPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id?.toString();

  // Consolidated state
  const [state, setState] = useState({
    activeTab:
      searchParams?.get("tab")?.toString() ||
      (typeof window !== "undefined" && window.location.hash
        ? window.location.hash.slice(1)
        : "gallery"),
    car: null as ExtendedCar | null,
    isLoading: true,
    error: null as string | null,
  });

  // Use React 19 transition for better performance
  const [isPending, startTransition] = useTransition();

  // Memoized tab items to prevent unnecessary re-renders
  const tabItems = useMemo(() => {
    if (!id) return [];

    return [
      {
        value: "gallery",
        label: "Image Gallery",
        content: <GalleryContainer carId={id} />,
      },
      {
        value: "car-galleries",
        label: "Attached Galleries",
        content: <CarGalleries carId={id} />,
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
        content: <BaTListingGenerator carId={id} />,
      },
      {
        value: "captions",
        label: "Copywriter",
        content: <CarCopywriter carId={id} />,
      },
      {
        value: "inspections",
        label: "Inspections",
        content: <InspectionTab carId={id} />,
      },
      {
        value: "documentation",
        label: "Documentation",
        content: <DocumentationFiles carId={id} />,
      },
      {
        value: "article",
        label: "Article",
        content: <ArticleGenerator carId={id} />,
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
    ];
  }, [id]);

  // Optimized car data fetcher
  const fetchCarData = useCallback(async () => {
    if (!id) return null;

    try {
      const response = await fetch(`/api/cars/${id}`);
      if (!response.ok) throw new Error("Failed to fetch car data");
      return await response.json();
    } catch (error) {
      console.error("Error fetching car data:", error);
      throw error;
    }
  }, [id]);

  // Consolidated effect for initial setup and car data fetching
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (!id) {
        router.push("/cars");
        return;
      }

      startTransition(async () => {
        try {
          setState((prev) => ({ ...prev, isLoading: true, error: null }));
          const carData = await fetchCarData();

          if (isMounted) {
            setState((prev) => ({
              ...prev,
              car: carData,
              isLoading: false,
              error: null,
            }));
          }
        } catch (error) {
          if (isMounted) {
            setState((prev) => ({
              ...prev,
              error: "Failed to load car data",
              isLoading: false,
            }));
          }
        }
      });
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [id, router, fetchCarData, startTransition]);

  // Return early if no ID
  if (!id) {
    return null;
  }

  const { car, isLoading, error } = state;

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        {/* <Navbar /> */} {/* Removed Navbar component */}
        <div className="container-wide px-6 py-8">
          {error ? (
            <div className="max-w-2xl mx-auto bg-destructive-50 dark:bg-destructive-900 border border-destructive-200 dark:border-destructive-800 text-destructive-700 dark:text-destructive-200 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              {/* Car title and header - always show this */}
              <div className="flex items-center gap-4 mb-6">
                <CarAvatar
                  primaryImageId={car?.primaryImageId}
                  entityName={generateCarTitle(car)}
                />
                <PageTitle title={generateCarTitle(car)} className="" />
              </div>

              {/* Always render tabs - each tab handles its own loading state */}
              <CustomTabs
                items={tabItems}
                defaultValue={state.activeTab}
                basePath={`/cars/${id}`}
              />
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
