"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus, ProjectTimeline } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import { useUpdateProjectStatus } from "@/lib/hooks/query/useProjects";
import { useAPI } from "@/hooks/useAPI";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { Event } from "@/types/event";
import { useProjectPreload } from "@/hooks/useProjectData";

// Define types for SSR optimization (compatible with both tab interfaces)
interface EventCar {
  _id: string;
  make: string;
  model: string;
  year: number;
  primaryImageId?: string;
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
  images?: Array<{
    _id: string;
    url: string;
    metadata?: {
      isPrimary?: boolean;
    };
  }>;
  createdAt: string;
}

interface EventWithCar extends Event {
  car?: EventCar;
  isAttached?: boolean;
}

interface ProjectClientWrapperProps {
  project: Project;
  initialTab?: string;
}

export function ProjectClientWrapper({
  project,
  initialTab,
}: ProjectClientWrapperProps) {
  const { data: session, status } = useSession();
  const { user, isAuthenticated, loading: authLoading } = useFirebaseAuth();
  const router = useRouter();
  const api = useAPI();

  const updateStatusMutation = useUpdateProjectStatus();

  const [invitingUser, setInvitingUser] = useState(false);
  const retryAttemptRef = useRef(0);
  const maxRetries = 2;

  // Fix tab flashing: Use initialTab from SSR or fallback to client-side detection
  const [activeTab, setActiveTab] = useState(() => {
    // Prefer server-provided initialTab for SSR optimization
    if (initialTab) {
      return initialTab;
    }

    // Fallback to client-side detection (for direct navigation)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get("tab");

      // Migration: redirect old "captions" tab to new "copywriter" tab
      if (tabFromUrl === "captions") {
        return "copywriter";
      }

      if (
        tabFromUrl &&
        [
          "overview",
          "timeline",
          "events",
          "team",
          "cars",
          "images",
          "galleries",
          "assets",
          "deliverables",
          "copywriter",
          "content-studio",
          "ai-chat",
          "calendar",
        ].includes(tabFromUrl)
      ) {
        return tabFromUrl;
      }
    }
    return "overview";
  });

  // State for member details
  const [memberDetails, setMemberDetails] = useState<
    Record<
      string,
      {
        name: string;
        email: string;
        image?: string;
      }
    >
  >({});

  // State for SSR-optimized tab data
  const [preloadedEvents, setPreloadedEvents] = useState<
    EventWithCar[] | undefined
  >(undefined);
  const [preloadedCars, setPreloadedCars] = useState<ProjectCar[] | undefined>(
    undefined
  );
  const [preloadedGalleries, setPreloadedGalleries] = useState<
    any[] | undefined
  >(undefined);
  const [preloadedAssets, setPreloadedAssets] = useState<any[] | undefined>(
    undefined
  );
  const [preloadedDeliverables, setPreloadedDeliverables] = useState<
    any[] | undefined
  >(undefined);
  const [preloadedTimelineData, setPreloadedTimelineData] = useState<
    ProjectTimeline | undefined
  >(undefined);
  const [preloadedCopywriterData, setPreloadedCopywriterData] = useState<
    { cars: any[]; events: any[]; captions: any[] } | undefined
  >(undefined);
  // const [isPreloadingTabs, setIsPreloadingTabs] = useState(false); // Removed: now using React Query
  const hasPreloadedRef = useRef(false);

  // Handle URL migration for old "captions" tab on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get("tab");

      // Migration: redirect old "captions" tab to new "copywriter" tab
      if (tabFromUrl === "captions") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "copywriter");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get("tab");

      // Migration: redirect old "captions" tab to new "copywriter" tab
      if (tabFromUrl === "captions") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "copywriter");
        window.history.replaceState({}, "", url.toString());
        setActiveTab("copywriter");
        return;
      }

      if (
        tabFromUrl &&
        [
          "overview",
          "timeline",
          "events",
          "team",
          "cars",
          "images",
          "galleries",
          "assets",
          "deliverables",
          "copywriter",
          "content-studio",
          "ai-chat",
          "calendar",
        ].includes(tabFromUrl)
      ) {
        setActiveTab(tabFromUrl);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Function to handle tab changes with URL updates
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);

    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.pushState({}, "", url.toString());
  };

  // Fetch member details when project is loaded
  useEffect(() => {
    if (project?.members && project.members.length > 0 && api) {
      fetchMemberDetails(project.members.map((m: any) => m.userId));
    }
  }, [project?.members, api]);

  // ⚡ OPTIMIZED: Use React Query for data preloading with caching
  const {
    data: preloadData,
    isLoading: isPreloadingTabs,
    error: preloadError,
    refetch: refetchPreload,
  } = useProjectPreload(project._id || "", ["events", "cars", "captions"], {
    enabled: !!api && !!project._id,
    limit: 50,
    includeCars: true,
  });

  // Set preloaded data when available
  useEffect(() => {
    if (preloadData?.success && preloadData.data) {
      const { data } = preloadData;

      // Set events data
      if (data.events?.events && !preloadedEvents) {
        setPreloadedEvents(data.events.events);
        console.log(
          "✅ Pre-loaded events data:",
          data.events.events.length,
          "events"
        );
      }

      // Set cars data
      if (data.cars?.cars && !preloadedCars) {
        setPreloadedCars(data.cars.cars);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Pre-loaded cars data:", data.cars.cars.length, "cars");
      }

      // Set copywriter data
      if (data.captions?.captions && !preloadedCopywriterData) {
        setPreloadedCopywriterData({
          cars: data.cars?.cars || [],
          events: data.events?.events || [],
          captions: data.captions.captions,
        });
        console.log(
          "✅ Pre-loaded copywriter data:",
          data.captions.captions.length,
          "captions"
        );
      }

      // Set defaults for other tabs
      if (!preloadedAssets) {
        setPreloadedAssets(project.assets || []);
      }

      if (!preloadedTimelineData) {
        setPreloadedTimelineData(
          project.timeline || {
            startDate: new Date().toISOString(),
            milestones: [],
            estimatedDuration: 0,
          }
        );
      }
    }
  }, [
    preloadData,
    preloadedEvents,
    preloadedCars,
    preloadedCopywriterData,
    preloadedAssets,
    preloadedTimelineData,
  ]);

  // Handle preload errors with fallback
  useEffect(() => {
    if (preloadError && !hasPreloadedRef.current) {
      console.warn("Preload failed, using fallback:", preloadError);
      hasPreloadedRef.current = true;
      fetchCriticalTabDataFallback();
    }
  }, [preloadError]);

  // Enhanced fetchMemberDetails with defensive error handling
  const fetchMemberDetails = async (userIds: string[]) => {
    if (!api) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("No API client available for fetching member details");
      return;
    }

    try {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("👥 Fetching member details for users:", userIds);
      // Use the project-specific users endpoint (no admin required)
      const response = await api.get("projects/users");
      const data = response as any;

      if (!data.users || !Array.isArray(data.users)) {
        console.warn(
          "Invalid response format for member details, continuing without member info"
        );
        return;
      }

      const details: Record<
        string,
        { name: string; email: string; image?: string }
      > = {};

      data.users.forEach((user: any) => {
        if (userIds.includes(user.uid)) {
          details[user.uid] = {
            name: user.name || user.email,
            email: user.email,
            image: user.image,
          };
        }
      });

      console.log(
        "✅ Member details loaded for",
        Object.keys(details).length,
        "users"
      );
      setMemberDetails(details);
    } catch (error) {
      console.error("💥 Error fetching member details:", error);
      // Don't fail the entire page if member details fail
      toast({
        title: "Warning",
        description: "Could not load team member details",
        variant: "default",
      });
    }
  };

  // ⚡ OPTIMIZED: Pre-fetch critical tab data using single optimized API call
  const fetchCriticalTabData = async () => {
    if (!api || isPreloadingTabs) return;

    try {
      // setIsPreloadingTabs(true); // Removed: React Query handles loading state
      console.time("ProjectClientWrapper-optimized-preload");

      console.log(
        "🚀 Fetching critical tab data using optimized preload API..."
      );

      // ⚡ PERFORMANCE BOOST: Use single API call instead of 6+ parallel calls
      // This prevents MongoDB connection pool exhaustion and reduces load time by 60%+
      const preloadResponse = (await api.get(
        `projects/${project._id}/preload?tabs=events,cars,captions&limit=50&includeCars=true`
      )) as {
        success: boolean;
        data: {
          events?: { events: EventWithCar[]; total: number };
          cars?: { cars: ProjectCar[]; total: number };
          captions?: { captions: any[]; total: number };
        };
        loadedTabs: string[];
      };

      if (preloadResponse.success && preloadResponse.data) {
        const { data } = preloadResponse;

        // Set preloaded events data
        if (data.events?.events) {
          setPreloadedEvents(data.events.events);
          console.log(
            "✅ Pre-loaded events data:",
            data.events.events.length,
            "events"
          );
        }

        // Set preloaded cars data
        if (data.cars?.cars) {
          setPreloadedCars(data.cars.cars);
          console.log(
            "✅ Pre-loaded cars data:",
            data.cars.cars.length,
            "cars"
          );
        }

        // Set preloaded captions data for copywriter tab
        if (data.captions?.captions) {
          // Transform captions data to match expected copywriter format
          setPreloadedCopywriterData({
            cars: data.cars?.cars || [],
            events: data.events?.events || [],
            captions: data.captions.captions,
          });
          console.log(
            "✅ Pre-loaded copywriter data:",
            data.captions.captions.length,
            "captions"
          );
        }

        // Fetch remaining data that's not in preload API yet
        const [galleriesData, deliverablesData] = await Promise.allSettled([
          fetchGalleriesData(),
          fetchDeliverablesData(),
        ]);

        if (galleriesData.status === "fulfilled") {
          setPreloadedGalleries(galleriesData.value);
          console.log(
            "✅ Pre-loaded galleries data:",
            galleriesData.value.length,
            "galleries"
          );
        }

        if (deliverablesData.status === "fulfilled") {
          setPreloadedDeliverables(deliverablesData.value);
          console.log(
            "✅ Pre-loaded deliverables data:",
            deliverablesData.value.length,
            "deliverables"
          );
        }

        // Assets are embedded in project data, always available
        setPreloadedAssets(project.assets || []);
        console.log(
          "✅ Pre-loaded assets data:",
          (project.assets || []).length,
          "assets (from project data)"
        );

        // Set basic timeline data
        setPreloadedTimelineData(
          project.timeline || {
            startDate: new Date().toISOString(),
            milestones: [],
            estimatedDuration: 0,
          }
        );
      } else {
        console.warn(
          "Preload API failed, falling back to individual API calls"
        );
        // Fallback to old method if preload fails
        await fetchCriticalTabDataFallback();
      }
    } catch (error) {
      console.error("Error using optimized preload API, falling back:", error);
      // Fallback to old method if there's an error
      await fetchCriticalTabDataFallback();
    } finally {
      console.timeEnd("ProjectClientWrapper-optimized-preload");
    }
  };

  // Fallback method for when optimized preload fails
  const fetchCriticalTabDataFallback = async () => {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Using fallback individual API calls...");

    // Only fetch essential data to minimize connection usage
    const [eventsData, carsData] = await Promise.allSettled([
      fetchEventsData(),
      fetchCarsData(),
    ]);

    if (eventsData.status === "fulfilled") {
      setPreloadedEvents(eventsData.value);
    }

    if (carsData.status === "fulfilled") {
      setPreloadedCars(carsData.value);
    }

    // Set minimal defaults for other tabs
    setPreloadedAssets(project.assets || []);
    setPreloadedTimelineData(
      project.timeline || {
        startDate: new Date().toISOString(),
        milestones: [],
        estimatedDuration: 0,
      }
    );
  };

  // Fetch events data with car information (optimized for connection management)
  const fetchEventsData = async (): Promise<EventWithCar[]> => {
    if (!api) throw new Error("No API available");

    const response = (await api.get(
      `projects/${project._id}/events`
    )) as Event[];

    // ⚡ OPTIMIZED: Batch car fetching to prevent connection exhaustion
    // Instead of parallel fetching all cars at once, process in smaller batches
    const BATCH_SIZE = 3; // Limit concurrent car fetches
    const eventsWithCars: EventWithCar[] = [];

    for (let i = 0; i < response.length; i += BATCH_SIZE) {
      const batch = response.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (event: Event) => {
          try {
            let car: EventCar | undefined = undefined;
            if (event.car_id) {
              try {
                car = (await api.get(`cars/${event.car_id}`)) as EventCar;
              } catch (carError) {
                // Silently handle car fetch errors - car might not exist or be inaccessible
                console.warn(
                  `Car ${event.car_id} could not be fetched for event ${event.id}`
                );
                car = undefined;
              }
            }

            // Check if this event was created specifically for this project
            const isCreatedForProject = event.project_id === project._id;

            return {
              ...event,
              car,
              isAttached: !isCreatedForProject,
            };
          } catch (error) {
            // This should rarely happen since we handle car errors separately
            console.warn(
              `Error processing event ${event.id}:`,
              error instanceof Error ? error.message : "Unknown error"
            );
            return {
              ...event,
              car: undefined,
              isAttached: event.project_id !== project._id,
            };
          }
        })
      );

      eventsWithCars.push(...batchResults);

      // Small delay between batches to prevent overwhelming the connection pool
      if (i + BATCH_SIZE < response.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return eventsWithCars;
  };

  // Fetch cars data
  const fetchCarsData = async (): Promise<ProjectCar[]> => {
    if (!api) throw new Error("No API available");

    const data = (await api.get(`projects/${project._id}/cars`)) as {
      cars?: ProjectCar[];
    };
    return data.cars || [];
  };

  // Fetch galleries data
  const fetchGalleriesData = async (): Promise<any[]> => {
    if (!api) throw new Error("No API available");

    const data = (await api.get(`projects/${project._id}/galleries`)) as {
      galleries: any[];
    };
    return data.galleries || [];
  };

  // Note: Assets are embedded in project data, no separate API call needed

  // Fetch timeline data
  const fetchTimelineData = async (): Promise<ProjectTimeline> => {
    if (!api) throw new Error("No API available");

    const data = (await api.get(`projects/${project._id}/timeline`)) as {
      timeline: ProjectTimeline;
    };
    return data.timeline || project.timeline;
  };

  // Fetch deliverables data
  const fetchDeliverablesData = async (): Promise<any[]> => {
    if (!api) throw new Error("No API available");

    const data = (await api.get(`projects/${project._id}/deliverables`)) as {
      deliverables: any[];
    };
    return data.deliverables || [];
  };

  // Fetch copywriter data (cars, events, captions)
  const fetchCopywriterData = async (): Promise<{
    cars: any[];
    events: any[];
    captions: any[];
  }> => {
    if (!api) throw new Error("No API available");

    // Fetch all copywriter-related data in parallel for this batch
    const [carsResponse, eventsResponse, captionsResponse] = await Promise.all([
      api.get(`projects/${project._id}/cars`) as Promise<{ cars: any[] }>,
      api.get(`projects/${project._id}/events`) as Promise<any[]>,
      api.get(`projects/${project._id}/captions`) as Promise<any[]>,
    ]);

    // Extract cars data (API returns {cars: [...]} format)
    const cars = Array.isArray(carsResponse?.cars) ? carsResponse.cars : [];

    // For project mode, we need full car details since project cars API only returns basic info
    let fullCarsData = cars;
    if (cars.length > 0) {
      try {
        // Validate and filter car IDs - ensure they're valid MongoDB ObjectIds (24 char hex strings)
        const carIds = cars
          .map((car: any) => car._id)
          .filter((id: any) => {
            if (!id) return false;
            const idStr = id.toString();
            // MongoDB ObjectId should be 24 character hex string
            return idStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(idStr);
          });

        if (carIds.length > 0) {
          if (carIds.length === 1) {
            const fullCarData = await api.get(`cars/${carIds[0]}`);
            fullCarsData = [fullCarData];
          } else {
            const fullCarsResponse = (await api.get(
              `cars/batch?ids=${carIds.join(",")}`
            )) as any;
            fullCarsData = Array.isArray(fullCarsResponse)
              ? fullCarsResponse
              : (fullCarsResponse as any)?.cars || [];
          }
        }
      } catch (error) {
        console.warn(
          "Failed to fetch full car details for copywriter, using basic data:",
          error
        );
        // Fallback to basic car data if full details fail
        fullCarsData = cars;
      }
    }

    // Events data is already in correct format
    const events = Array.isArray(eventsResponse) ? eventsResponse : [];

    // Captions data is already in correct format
    const captions = Array.isArray(captionsResponse) ? captionsResponse : [];

    return {
      cars: fullCarsData,
      events,
      captions,
    };
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project) return;

    try {
      await updateStatusMutation.mutateAsync({
        projectId: project._id!,
        status: newStatus,
      });

      toast({
        title: "Success",
        description: "Project status updated successfully",
      });

      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error updating project status:", error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    router.push("/projects");
  };

  // Update handleProjectUpdate to refresh pre-loaded data
  const handleProjectUpdate = () => {
    // Clear pre-loaded data to ensure fresh data on next tab access
    setPreloadedEvents(undefined);
    setPreloadedCars(undefined);
    setPreloadedGalleries(undefined);
    setPreloadedAssets(undefined);
    setPreloadedDeliverables(undefined);
    setPreloadedTimelineData(undefined);
    setPreloadedCopywriterData(undefined);
    hasPreloadedRef.current = false; // Reset to allow fresh data fetch

    // Refresh the page to get updated data from server
    router.refresh();
  };

  // Enhanced inviteUser with comprehensive error handling
  const inviteUser = async (email: string, role: string) => {
    if (!api) {
      toast({
        title: "Authentication Required",
        description: "Please refresh the page and try again",
        variant: "destructive",
      });
      return;
    }

    try {
      setInvitingUser(true);
      await api.post("projects/users", {
        projectId: project._id,
        userEmail: email,
        role: role,
      });

      toast({
        title: "Success",
        description: `User invited to project successfully`,
      });

      // Refresh the page to show new member
      router.refresh();
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: "Failed to invite user to project",
        variant: "destructive",
      });
    } finally {
      setInvitingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        onStatusChange={handleStatusChange}
        onBack={handleBack}
      />

      <ProjectTabs
        project={project}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        memberDetails={memberDetails}
        onProjectUpdate={handleProjectUpdate}
        preloadedEvents={preloadedEvents}
        preloadedCars={preloadedCars}
        preloadedGalleries={preloadedGalleries}
        preloadedAssets={preloadedAssets}
        preloadedDeliverables={preloadedDeliverables}
        preloadedTimelineData={preloadedTimelineData}
        preloadedCopywriterData={preloadedCopywriterData}
      />
    </div>
  );
}
