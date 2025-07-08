"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Target, MoreHorizontal, FileJson } from "lucide-react";
import { format } from "date-fns";
import { Project } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import { useAPI } from "@/hooks/useAPI";
import { CarAvatar } from "@/components/ui/CarAvatar";
import { usePlatforms } from "@/contexts/PlatformContext";
import { MultiSelect } from "@/components/ui/multi-select";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { useGalleries } from "@/hooks/use-galleries";
import DeliverablesTable from "@/components/deliverables/deliverables-tab/components/DeliverablesTable";
import ResizableDeliverablesTable from "@/components/deliverables/deliverables-tab/components/ResizableDeliverablesTable";
import DeliverableCard from "@/components/deliverables/deliverables-tab/components/DeliverableCard";
import DeliverableModal from "@/components/deliverables/deliverables-tab/components/DeliverableModal";
import { Deliverable } from "@/types/deliverable";
import { DeliverableType } from "@/types/deliverable";

interface MemberDetails {
  name: string;
  email: string;
  image?: string;
}

interface ProjectDeliverablesTabProps {
  project: Project;
  memberDetails: Record<string, MemberDetails>;
  onProjectUpdate: () => void;
  initialDeliverables?: any[]; // Optional pre-fetched deliverables data for SSR optimization
}

export function ProjectDeliverablesTab({
  project,
  memberDetails,
  onProjectUpdate,
  initialDeliverables,
}: ProjectDeliverablesTabProps) {
  const api = useAPI();
  const { platforms: availablePlatforms } = usePlatforms();

  // Gallery and caption data
  const { data: galleriesData, isLoading: galleriesLoading } = useGalleries({
    limit: 100,
  });
  const [captionsData, setCaptionsData] = useState<any[]>([]);
  const [captionsLoading, setCaptionsLoading] = useState(false);

  const [isAddDeliverableOpen, setIsAddDeliverableOpen] = useState(false);
  const [isEditDeliverableOpen, setIsEditDeliverableOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<any>(null);
  const [isLinkDeliverableOpen, setIsLinkDeliverableOpen] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const [deliverableForm, setDeliverableForm] = useState({
    title: "",
    description: "",
    type: "Video" as DeliverableType,
    platforms: [] as { label: string; value: string }[],
    duration: 30,
    aspectRatio: "16:9",
    editDeadline: "",
    releaseDate: "",
    assignedTo: "unassigned",
    carId: "",
    scheduled: false,
    gallery_ids: [] as string[],
    caption_ids: [] as string[],
    mediaTypeId: "", // Add mediaTypeId field
  });

  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);
  const [isUpdatingDeliverable, setIsUpdatingDeliverable] = useState(false);
  const [projectDeliverables, setProjectDeliverables] = useState<any[]>(
    initialDeliverables || []
  );
  const [isLoadingDeliverables, setIsLoadingDeliverables] =
    useState(!initialDeliverables); // Don't show loading if we have initial data

  // Log initial data if provided for performance tracking
  useEffect(() => {
    if (initialDeliverables) {
      console.log(
        "✅ Using pre-loaded deliverables data:",
        initialDeliverables.length,
        "deliverables"
      );
    }
  }, [initialDeliverables]);

  const [existingDeliverables, setExistingDeliverables] = useState<any[]>([]);
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    []
  );
  const [isLinkingDeliverables, setIsLinkingDeliverables] = useState(false);
  const [filterByProjectVehicles, setFilterByProjectVehicles] = useState(false);
  const [filterOutPublished, setFilterOutPublished] = useState(false);

  // Car details for displaying avatars
  const [carDetails, setCarDetails] = useState<Record<string, any>>({});

  // Modal state for deliverable detail view
  const [selectedDeliverable, setSelectedDeliverable] =
    useState<Deliverable | null>(null);
  const [isDeliverableModalOpen, setIsDeliverableModalOpen] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<string>(() => {
    return localStorage.getItem("deliverables-sort-field") || "release_date";
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    return (
      (localStorage.getItem("deliverables-sort-direction") as "asc" | "desc") ||
      "desc"
    );
  });

  const fetchProjectDeliverables = useCallback(async () => {
    if (!api) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("API not available for fetching project deliverables");
      return;
    }

    try {
      setIsLoadingDeliverables(true);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📦 Fetching project deliverables...");

      const data = (await api.get(`projects/${project._id}/deliverables`)) as {
        deliverables: any[];
      };
      console.log(
        "✅ Project deliverables fetched:",
        data.deliverables?.length || 0
      );

      // Debug: Check for deliverables without cars
      const deliverablesWithCars =
        data.deliverables?.filter((d) => d.car_id) || [];
      const deliverablesWithoutCars =
        data.deliverables?.filter((d) => !d.car_id) || [];

      console.log("📊 Deliverables breakdown:", {
        total: data.deliverables?.length || 0,
        withCars: deliverablesWithCars.length,
        withoutCars: deliverablesWithoutCars.length,
        withoutCarsData: deliverablesWithoutCars,
      });

      setProjectDeliverables(data.deliverables || []);

      // Fetch car details for deliverables that have car_id
      const carIds = data.deliverables
        ?.filter((d: any) => d.car_id)
        .map((d: any) => d.car_id.toString())
        .filter(
          (id: string, index: number, arr: string[]) =>
            arr.indexOf(id) === index
        ); // Remove duplicates

      if (carIds && carIds.length > 0) {
        fetchCarDetails(carIds);
      }
    } catch (error) {
      console.error("💥 Error fetching project deliverables:", error);
    } finally {
      setIsLoadingDeliverables(false);
    }
  }, [api, project?._id]);

  // Fetch car details for deliverable avatars
  const fetchCarDetails = useCallback(
    async (carIds: string[]) => {
      if (!api || !carIds || carIds.length === 0) return;

      try {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚗 Fetching car details for deliverables:", carIds);
        const carPromises = carIds.map(async (carId) => {
          try {
            const carData = await api.get(`cars/${carId}`);
            return { carId, carData };
          } catch (error) {
            console.warn(`Failed to fetch car ${carId}:`, error);
            return { carId, carData: null };
          }
        });

        const carResults = await Promise.all(carPromises);
        const newCarDetails: Record<string, any> = {};

        carResults.forEach(({ carId, carData }) => {
          if (carData) {
            newCarDetails[carId] = carData;
          }
        });

        setCarDetails((prev) => ({ ...prev, ...newCarDetails }));
        console.log(
          "✅ Car details fetched for",
          Object.keys(newCarDetails).length,
          "cars"
        );
      } catch (error) {
        console.error("💥 Error fetching car details:", error);
      }
    },
    [api]
  );

  // Fetch project deliverables on mount and when project changes (only if no initial data)
  useEffect(() => {
    if (project && !initialDeliverables) {
      fetchProjectDeliverables();
    }
  }, [project, initialDeliverables, fetchProjectDeliverables]);

  // Fetch captions data
  useEffect(() => {
    const fetchCaptions = async () => {
      if (!api) return;

      setCaptionsLoading(true);
      try {
        const captions = await api.get("captions?limit=100");
        setCaptionsData(Array.isArray(captions) ? captions : []);
      } catch (error) {
        console.error("Error fetching captions:", error);
        setCaptionsData([]);
      } finally {
        setCaptionsLoading(false);
      }
    };

    fetchCaptions();
  }, [api]);

  const fetchExistingDeliverables = useCallback(
    async (
      overrideVehicleFilter?: boolean,
      overridePublishedFilter?: boolean
    ) => {
      // Use overrides if provided, otherwise use state
      const shouldFilterByVehicles =
        overrideVehicleFilter !== undefined
          ? overrideVehicleFilter
          : filterByProjectVehicles;
      const shouldFilterOutPublished =
        overridePublishedFilter !== undefined
          ? overridePublishedFilter
          : filterOutPublished;
      if (!api) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("API not available for fetching existing deliverables");
        return;
      }

      try {
        setIsLoadingDeliverables(true);
        const data = (await api.get("deliverables?pageSize=1000")) as {
          deliverables: any[];
        };

        // Filter out deliverables that are already linked to this project
        const currentDeliverableIds = project?.deliverableIds || [];
        let availableDeliverables = (data.deliverables || []).filter(
          (deliverable: any) => !currentDeliverableIds.includes(deliverable._id)
        );

        // Apply filters
        if (shouldFilterByVehicles) {
          const projectCarIds = (project?.carIds || []).map((carId: any) =>
            typeof carId === "string" ? carId : String(carId)
          );

          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎯 FILTER: Project cars:", projectCarIds);

          const filteredDeliverables = availableDeliverables.filter(
            (deliverable: any) => {
              if (!deliverable.car_id) return false;

              const deliverableCarId = String(deliverable.car_id);
              const matches = projectCarIds.includes(deliverableCarId);

              if (matches) {
                // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ "${deliverable.title}" matches project car`);
              }

              return matches;
            }
          );

          availableDeliverables = filteredDeliverables;
          console.log(
            `🎯 Found ${availableDeliverables.length} deliverables with project vehicles`
          );
        }

        // Apply published filter if enabled
        if (shouldFilterOutPublished) {
          const unpublishedDeliverables = availableDeliverables.filter(
            (deliverable: any) => {
              // Check if deliverable has been published (has release date in past + social media link)
              if (!deliverable.release_date || !deliverable.social_media_link) {
                return true; // Keep if missing release date or social media link
              }

              const releaseDate = new Date(deliverable.release_date);
              const now = new Date();
              const isPublished =
                releaseDate <= now && deliverable.social_media_link.trim();

              if (isPublished) {
                console.log(
                  `📅 Filtering out published: "${deliverable.title}"`
                );
                return false; // Filter out published deliverables
              }

              return true; // Keep unpublished deliverables
            }
          );

          availableDeliverables = unpublishedDeliverables;
          console.log(
            `📅 Found ${availableDeliverables.length} unpublished deliverables`
          );
        }

        setExistingDeliverables(availableDeliverables);
      } catch (error) {
        console.error("💥 Error fetching existing deliverables:", error);
        toast({
          title: "Error",
          description: "Failed to load existing deliverables",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDeliverables(false);
      }
    },
    [
      api,
      project?._id,
      project?.carIds,
      filterByProjectVehicles,
      filterOutPublished,
      toast,
    ]
  );

  const handleAddDeliverable = async () => {
    if (!deliverableForm.title.trim()) {
      toast({
        title: "Error",
        description: "Please provide a deliverable title",
        variant: "destructive",
      });
      return;
    }

    if (!api) {
      toast({
        title: "Error",
        description: "You must be logged in to create deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingDeliverable(true);

      const requestBody = {
        title: deliverableForm.title,
        description: deliverableForm.description,
        type: deliverableForm.type,
        platform_id: deliverableForm.platforms[0]?.value,
        duration: deliverableForm.duration,
        aspect_ratio: deliverableForm.aspectRatio,
        edit_deadline: deliverableForm.editDeadline
          ? new Date(deliverableForm.editDeadline).toISOString()
          : undefined,
        release_date: deliverableForm.releaseDate
          ? new Date(deliverableForm.releaseDate).toISOString()
          : undefined,
        assigned_to:
          deliverableForm.assignedTo === "unassigned"
            ? undefined
            : deliverableForm.assignedTo,
        car_id:
          deliverableForm.carId && deliverableForm.carId.trim() !== ""
            ? deliverableForm.carId
            : null,
        scheduled: deliverableForm.scheduled,
        gallery_ids: deliverableForm.gallery_ids,
        caption_ids: deliverableForm.caption_ids,
        mediaTypeId: deliverableForm.mediaTypeId || undefined,
      };

      console.log("🚀 SENDING REQUEST:", {
        url: `projects/${project._id}/deliverables`,
        body: requestBody,
        formCarId: deliverableForm.carId,
        carIdIsEmpty: deliverableForm.carId === "",
        processedCarId:
          deliverableForm.carId && deliverableForm.carId.trim() !== ""
            ? deliverableForm.carId
            : null,
      });

      const response = await api.post(
        `projects/${project._id}/deliverables`,
        requestBody
      );

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ RESPONSE RECEIVED:", response);

      // Refresh project data and deliverables
      await onProjectUpdate();
      await fetchProjectDeliverables();

      // Reset form and close modal
      setDeliverableForm({
        title: "",
        description: "",
        type: "Video",
        platforms: [],
        duration: 30,
        aspectRatio: "16:9",
        editDeadline: "",
        releaseDate: "",
        assignedTo: "unassigned",
        carId: "",
        scheduled: false,
        gallery_ids: [],
        caption_ids: [],
        mediaTypeId: "",
      });
      setIsAddDeliverableOpen(false);

      toast({
        title: "Success",
        description: "Deliverable added successfully",
      });
    } catch (error) {
      console.error("💥 ERROR ADDING DELIVERABLE:", error);
      console.error("💥 ERROR DETAILS:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
      });

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add deliverable",
        variant: "destructive",
      });
    } finally {
      setIsAddingDeliverable(false);
    }
  };

  const handleEditDeliverable = (deliverable: any) => {
    // Populate form with deliverable data
    setDeliverableForm({
      title: deliverable.title || "",
      description: deliverable.description || "",
      type: deliverable.type || "Video",
      platforms:
        deliverable.platforms?.map((platformId: string) => {
          const platform = availablePlatforms.find((p) => p._id === platformId);
          return platform
            ? { label: platform.name, value: platform._id }
            : { label: platformId, value: platformId };
        }) || [],
      duration: deliverable.duration || 30,
      aspectRatio: deliverable.aspect_ratio || "16:9",
      editDeadline: deliverable.edit_deadline || "",
      releaseDate: deliverable.release_date || "",
      assignedTo: deliverable.firebase_uid || "unassigned",
      carId: deliverable.car_id?.toString() || "",
      scheduled: deliverable.scheduled || false,
      gallery_ids: deliverable.gallery_ids || [],
      caption_ids: deliverable.caption_ids || [],
      mediaTypeId: deliverable.mediaTypeId || "",
    });
    setEditingDeliverable(deliverable);
    setIsEditDeliverableOpen(true);
  };

  const handleUpdateDeliverable = async () => {
    if (!deliverableForm.title.trim()) {
      toast({
        title: "Error",
        description: "Please provide a deliverable title",
        variant: "destructive",
      });
      return;
    }

    if (!api || !editingDeliverable) {
      toast({
        title: "Error",
        description: "You must be logged in to update deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingDeliverable(true);

      const requestBody = {
        deliverableId: editingDeliverable._id, // Add deliverableId to body for backend routing
        title: deliverableForm.title,
        description: deliverableForm.description,
        type: deliverableForm.type,
        platforms: deliverableForm.platforms.map((p) => p.value),
        duration: deliverableForm.duration,
        aspectRatio: deliverableForm.aspectRatio,
        editDeadline: deliverableForm.editDeadline
          ? new Date(deliverableForm.editDeadline).toISOString()
          : undefined,
        releaseDate: deliverableForm.releaseDate
          ? new Date(deliverableForm.releaseDate).toISOString()
          : undefined,
        assignedTo:
          deliverableForm.assignedTo === "unassigned"
            ? undefined
            : deliverableForm.assignedTo,
        carId:
          deliverableForm.carId && deliverableForm.carId.trim() !== ""
            ? deliverableForm.carId
            : null,
        scheduled: deliverableForm.scheduled,
        gallery_ids: deliverableForm.gallery_ids,
        caption_ids: deliverableForm.caption_ids,
      };

      console.log("🚀 EDIT - SENDING REQUEST:", {
        url: `deliverables/${editingDeliverable._id}`,
        body: requestBody,
        formCarId: deliverableForm.carId,
        carIdIsEmpty: deliverableForm.carId === "",
        processedCarId:
          deliverableForm.carId && deliverableForm.carId.trim() !== ""
            ? deliverableForm.carId
            : null,
        originalDeliverableCarId: editingDeliverable.car_id,
      });

      const response = await api.put(
        `deliverables/${editingDeliverable._id}`,
        requestBody
      );

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ EDIT - RESPONSE RECEIVED:", response);
      console.log(
        "✅ EDIT - UPDATED DELIVERABLE:",
        (response as any).deliverable
      );
      console.log(
        "✅ EDIT - CAR_ID IN RESPONSE:",
        (response as any).deliverable?.car_id
      );

      // Refresh project data and deliverables
      await onProjectUpdate();
      await fetchProjectDeliverables();

      // Reset form and close modal
      setDeliverableForm({
        title: "",
        description: "",
        type: "Video",
        platforms: [],
        duration: 30,
        aspectRatio: "16:9",
        editDeadline: "",
        releaseDate: "",
        assignedTo: "unassigned",
        carId: "",
        scheduled: false,
        gallery_ids: [],
        caption_ids: [],
        mediaTypeId: "",
      });
      setEditingDeliverable(null);
      setIsEditDeliverableOpen(false);

      toast({
        title: "Success",
        description: "Deliverable updated successfully",
      });
    } catch (error) {
      console.error("💥 ERROR UPDATING DELIVERABLE:", error);
      console.error("💥 UPDATE ERROR DETAILS:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
      });

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update deliverable",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingDeliverable(false);
    }
  };

  const handleLinkExistingDeliverables = async () => {
    if (selectedDeliverables.length === 0) return;

    if (!api) {
      toast({
        title: "Error",
        description: "You must be logged in to link deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLinkingDeliverables(true);

      // Link each selected deliverable to the project
      for (const deliverableId of selectedDeliverables) {
        await api.post(`projects/${project._id}/deliverables`, {
          linkExisting: true,
          deliverableId: deliverableId,
        });
      }

      // Refresh project data and deliverables
      await onProjectUpdate();
      await fetchProjectDeliverables();

      // Reset selection and close modal
      setSelectedDeliverables([]);
      setIsLinkDeliverableOpen(false);

      toast({
        title: "Success",
        description: `${selectedDeliverables.length} deliverable(s) linked to project successfully`,
      });
    } catch (error) {
      console.error("💥 Error linking deliverables:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to link deliverables",
        variant: "destructive",
      });
    } finally {
      setIsLinkingDeliverables(false);
    }
  };

  const handleUpdateDeliverableStatus = async (
    deliverableId: string,
    status: string
  ) => {
    if (!api) {
      toast({
        title: "Error",
        description: "You must be logged in to update deliverable status",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.put(`deliverables/${deliverableId}`, {
        status,
      });

      // Update local state for just this deliverable - no full refresh!
      setProjectDeliverables((prev) =>
        prev.map((deliverable) =>
          deliverable._id === deliverableId
            ? { ...deliverable, status }
            : deliverable
        )
      );

      toast({
        title: "Success",
        description: "Deliverable status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update deliverable",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDeliverable = async (deliverableId: string) => {
    if (!api) {
      toast({
        title: "Error",
        description: "You must be logged in to remove deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.delete(`projects/${project._id}/deliverables/${deliverableId}`);

      // Update local state
      setProjectDeliverables((prev) =>
        prev.filter((d) => d._id !== deliverableId)
      );

      // Trigger project update
      onProjectUpdate();

      toast({
        title: "Success",
        description: "Deliverable removed from project",
      });
    } catch (error) {
      console.error("💥 Error removing deliverable:", error);
      toast({
        title: "Error",
        description: "Failed to remove deliverable",
        variant: "destructive",
      });
    }
  };

  const handleJsonSubmit = async (jsonData: any[]) => {
    if (!api) {
      toast({
        title: "Error",
        description: "You must be logged in to create deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingJson(true);

      const result = (await api.post(
        `projects/${project._id}/deliverables/batch-relaxed`,
        { deliverables: jsonData }
      )) as { created: number };

      toast({
        title: "Success",
        description: `Created ${result.created} deliverable${
          result.created !== 1 ? "s" : ""
        } successfully with relaxed validation`,
      });

      // Refresh the deliverables list
      await fetchProjectDeliverables();
      onProjectUpdate();
    } catch (error) {
      console.error("Error creating deliverables:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create deliverables",
        variant: "destructive",
      });
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setIsSubmittingJson(false);
    }
  };

  const toggleDeliverableSelection = (deliverableId: string) => {
    setSelectedDeliverables((prev) =>
      prev.includes(deliverableId)
        ? prev.filter((id) => id !== deliverableId)
        : [...prev, deliverableId]
    );
  };

  // Modal handlers
  const handleOpenDeliverableModal = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setIsDeliverableModalOpen(true);
  };

  const handleCloseDeliverableModal = () => {
    setSelectedDeliverable(null);
    setIsDeliverableModalOpen(false);
  };

  // Sorting handlers
  const handleSort = (field: string) => {
    let newDirection: "asc" | "desc" = "asc";

    if (sortField === field) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }

    setSortField(field);
    setSortDirection(newDirection);

    // Save to localStorage
    localStorage.setItem("deliverables-sort-field", field);
    localStorage.setItem("deliverables-sort-direction", newDirection);
  };

  // Sort deliverables based on current sort settings
  const sortedDeliverables = useMemo(() => {
    const deliverablesCopy = [...projectDeliverables];

    return deliverablesCopy.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different field types
      if (sortField === "release_date" || sortField === "edit_deadline") {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (
        sortField === "title" ||
        sortField === "editor" ||
        sortField === "status"
      ) {
        aValue = (aValue || "").toLowerCase();
        bValue = (bValue || "").toLowerCase();
      } else if (sortField === "duration") {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (sortField === "scheduled") {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      } else if (sortField === "car") {
        // Sort by car details (year make model) or fallback to car_id
        const aCarDetails = a.car_id ? carDetails[a.car_id.toString()] : null;
        const bCarDetails = b.car_id ? carDetails[b.car_id.toString()] : null;

        if (aCarDetails && bCarDetails) {
          const aCarName =
            `${aCarDetails.year || ""} ${aCarDetails.make || ""} ${aCarDetails.model || ""}`
              .trim()
              .toLowerCase();
          const bCarName =
            `${bCarDetails.year || ""} ${bCarDetails.make || ""} ${bCarDetails.model || ""}`
              .trim()
              .toLowerCase();
          aValue = aCarName || "zzz"; // Put cars without names at the end
          bValue = bCarName || "zzz";
        } else {
          // If no car details, sort by car_id or put at end
          aValue = aCarDetails ? "000" : "zzz"; // Cars with details come first
          bValue = bCarDetails ? "000" : "zzz";
        }
      } else if (sortField === "platform") {
        // Handle platform - could be string or array
        const aPlatform =
          a.platform ||
          (a.platforms && a.platforms.length > 0 ? a.platforms[0] : "");
        const bPlatform =
          b.platform ||
          (b.platforms && b.platforms.length > 0 ? b.platforms[0] : "");
        aValue = (aPlatform || "").toLowerCase();
        bValue = (bPlatform || "").toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [projectDeliverables, sortField, sortDirection]);

  // Actions for the shared deliverable components
  const deliverableActions = {
    onEdit: (deliverable: Deliverable) => {
      handleEditDeliverable(deliverable);
    },
    onDelete: (deliverableId: string) => {
      handleRemoveDeliverable(deliverableId);
    },
    onDuplicate: async (deliverable: Deliverable) => {
      if (!api) {
        toast({
          title: "Error",
          description: "You must be logged in to duplicate deliverables",
          variant: "destructive",
        });
        return;
      }

      try {
        // Create a duplicate deliverable with modified title
        const duplicateData = {
          title: `${deliverable.title} (Copy)`,
          description: deliverable.description || "",
          type: deliverable.type || "Video",
          platforms: deliverable.platforms || [],
          duration: deliverable.duration || 30,
          aspectRatio: deliverable.aspect_ratio || "16:9",
          editDeadline: deliverable.edit_deadline
            ? new Date(deliverable.edit_deadline).toISOString()
            : undefined,
          releaseDate: deliverable.release_date
            ? new Date(deliverable.release_date).toISOString()
            : undefined,
          assignedTo: deliverable.firebase_uid || undefined,
          carId: null, // Don't copy car assignment to duplicates
          scheduled: deliverable.scheduled || false,
          gallery_ids: deliverable.gallery_ids || [],
          caption_ids: deliverable.caption_ids || [],
        };

        console.log("🔄 Duplicating deliverable:", {
          original: deliverable.title,
          duplicate: duplicateData.title,
          projectId: project._id,
        });

        const response = await api.post(
          `projects/${project._id}/deliverables`,
          duplicateData
        );

        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Deliverable duplicated successfully:", response);

        // Only refresh the deliverables list - no need for full project refresh
        await fetchProjectDeliverables();

        toast({
          title: "Success",
          description: `Deliverable "${deliverable.title}" duplicated successfully`,
        });
      } catch (error) {
        console.error("💥 Error duplicating deliverable:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to duplicate deliverable",
          variant: "destructive",
        });
      }
    },
    onStatusChange: (deliverableId: string, newStatus: string) => {
      handleUpdateDeliverableStatus(deliverableId, newStatus);
    },
    onUpdate: (deliverableId: string, updates: Partial<Deliverable>) => {
      // Optimistic update - update local state immediately
      setProjectDeliverables((prev) =>
        prev.map((deliverable) =>
          deliverable._id === deliverableId
            ? { ...deliverable, ...updates }
            : deliverable
        )
      );
    },
    onRefresh: () => {
      fetchProjectDeliverables();
    },
  };

  // Mock batch mode for compatibility with shared components
  const mockBatchMode = {
    isBatchMode: false,
    selectedDeliverables: [],
    toggleBatchMode: () => {},
    toggleDeliverableSelection: () => {},
    toggleAllDeliverables: () => {},
    handleBatchDelete: async () => {},
  };

  const getDeliverableTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return "📄";
      case "video":
        return "🎥";
      case "image":
        return "🖼️";
      case "presentation":
        return "📊";
      default:
        return "📎";
    }
  };

  const getDeliverableStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CardTitle>Deliverables</CardTitle>
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Sorted by{" "}
              {sortField === "edit_deadline"
                ? "Deadline"
                : sortField === "release_date"
                  ? "Release Date"
                  : sortField === "car"
                    ? "Car"
                    : sortField === "platform"
                      ? "Platform"
                      : sortField.charAt(0).toUpperCase() + sortField.slice(1)}
              (
              {sortDirection === "asc"
                ? sortField === "release_date" || sortField === "edit_deadline"
                  ? "Oldest First"
                  : "A to Z"
                : sortField === "release_date" || sortField === "edit_deadline"
                  ? "Newest First"
                  : "Z to A"}
              )
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSort("release_date")}
              className="text-xs"
            >
              Reset Sort
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowJsonUpload(true)}
            >
              <FileJson className="h-4 w-4 mr-2" />
              Batch JSON
            </Button>
            <Dialog
              open={isLinkDeliverableOpen}
              onOpenChange={(open) => {
                setIsLinkDeliverableOpen(open);
                if (open) {
                  fetchExistingDeliverables(
                    filterByProjectVehicles,
                    filterOutPublished
                  );
                } else {
                  setSelectedDeliverables([]);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Link Existing
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Link Existing Deliverables</DialogTitle>
                  <DialogDescription>
                    Select existing deliverables to link to this project.
                  </DialogDescription>
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="vehicleFilter"
                        checked={filterByProjectVehicles}
                        onChange={(e) => {
                          const newFilterValue = e.target.checked;
                          setFilterByProjectVehicles(newFilterValue);
                          setSelectedDeliverables([]);

                          if (isLinkDeliverableOpen) {
                            setTimeout(() => {
                              fetchExistingDeliverables(
                                newFilterValue,
                                filterOutPublished
                              );
                            }, 100);
                          }
                        }}
                        className="rounded"
                      />
                      <Label
                        htmlFor="vehicleFilter"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Only show deliverables linked to this project's vehicles
                      </Label>
                      {filterByProjectVehicles && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Vehicle filter active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="publishedFilter"
                        checked={filterOutPublished}
                        onChange={(e) => {
                          const newFilterValue = e.target.checked;
                          setFilterOutPublished(newFilterValue);
                          setSelectedDeliverables([]);

                          if (isLinkDeliverableOpen) {
                            setTimeout(() => {
                              fetchExistingDeliverables(
                                filterByProjectVehicles,
                                newFilterValue
                              );
                            }, 100);
                          }
                        }}
                        className="rounded"
                      />
                      <Label
                        htmlFor="publishedFilter"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Hide published deliverables (release date past + has
                        social media link)
                      </Label>
                      {filterOutPublished && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          Published filter active
                        </span>
                      )}
                    </div>
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4">
                  {isLoadingDeliverables ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-sm text-muted-foreground">
                        Loading deliverables...
                      </div>
                    </div>
                  ) : existingDeliverables.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">
                        No available deliverables
                      </p>
                      <p className="text-sm">
                        {filterByProjectVehicles || filterOutPublished
                          ? "No deliverables found matching your current filters"
                          : "All existing deliverables are already linked to this project"}
                      </p>
                      {(filterByProjectVehicles || filterOutPublished) && (
                        <p className="text-xs mt-2 text-blue-600">
                          Try unchecking the filters to see more available
                          deliverables
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {existingDeliverables.map((deliverable: any) => (
                        <div
                          key={deliverable._id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedDeliverables.includes(deliverable._id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/20"
                          }`}
                          onClick={() =>
                            toggleDeliverableSelection(deliverable._id)
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selectedDeliverables.includes(
                              deliverable._id
                            )}
                            onChange={() =>
                              toggleDeliverableSelection(deliverable._id)
                            }
                            className="rounded"
                          />
                          {/* Car Avatar for existing deliverables dialog */}
                          {deliverable.car_id && deliverable.car && (
                            <CarAvatar
                              primaryImageId={deliverable.car?.primaryImageId}
                              entityName={`${deliverable.car?.year || ""} ${deliverable.car?.make || ""} ${deliverable.car?.model || ""}`.trim()}
                              size="sm"
                              className="flex-shrink-0"
                            />
                          )}

                          <div className="text-2xl flex-shrink-0">
                            {getDeliverableTypeIcon(deliverable.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">
                              {deliverable.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">
                                {deliverable.platform || "No Platform"}
                              </span>{" "}
                              • {deliverable.type}
                              {deliverable.description && (
                                <span> • {deliverable.description}</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span>
                                Due:{" "}
                                {deliverable.edit_deadline
                                  ? (() => {
                                      try {
                                        const date = new Date(
                                          deliverable.edit_deadline
                                        );
                                        return isNaN(date.getTime())
                                          ? "Invalid Date"
                                          : format(date, "MMM d, yyyy");
                                      } catch {
                                        return "Invalid Date";
                                      }
                                    })()
                                  : "No Date Set"}
                              </span>
                              {deliverable.firebase_uid && (
                                <span>
                                  {" "}
                                  • Assigned to:{" "}
                                  {memberDetails[deliverable.firebase_uid]
                                    ?.name || "Unknown User"}
                                </span>
                              )}
                              {(deliverable.car || deliverable.car_id) && (
                                <span>
                                  {" "}
                                  • Vehicle:{" "}
                                  {deliverable.car
                                    ? `${deliverable.car.year || ""} ${deliverable.car.make || ""} ${deliverable.car.model || ""}`.trim()
                                    : `ID: ${deliverable.car_id}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            className={getDeliverableStatusColor(
                              deliverable.status
                            )}
                          >
                            {deliverable.status.replace("_", " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDeliverables([]);
                      setIsLinkDeliverableOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleLinkExistingDeliverables}
                    disabled={
                      isLinkingDeliverables || selectedDeliverables.length === 0
                    }
                  >
                    {isLinkingDeliverables
                      ? "Linking..."
                      : `Link ${selectedDeliverables.length} Deliverable${
                          selectedDeliverables.length !== 1 ? "s" : ""
                        }`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isAddDeliverableOpen}
              onOpenChange={setIsAddDeliverableOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deliverable
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
                <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
                  <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
                    Add New Deliverable
                  </DialogTitle>
                  <DialogDescription>
                    Create a new deliverable for this project.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
                  <div className="space-y-3 pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                        <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                          Basic Information
                        </span>
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="deliverableTitle"
                            className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                          >
                            Title
                          </label>
                          <Input
                            id="deliverableTitle"
                            value={deliverableForm.title}
                            onChange={(e) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                title: e.target.value,
                              })
                            }
                            placeholder="Enter deliverable title"
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="deliverableDescription"
                            className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                          >
                            Description
                          </label>
                          <Textarea
                            id="deliverableDescription"
                            value={deliverableForm.description}
                            onChange={(e) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                description: e.target.value,
                              })
                            }
                            placeholder="Enter deliverable description (optional)"
                            rows={3}
                            className="text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Platforms
                            </label>
                            <MultiSelect
                              value={deliverableForm.platforms}
                              onChange={(values) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  platforms: values,
                                })
                              }
                              options={availablePlatforms.map((p) => ({
                                label: p.name,
                                value: p._id,
                              }))}
                              placeholder="Select platforms"
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Type
                            </label>
                            <CustomDropdown
                              value={deliverableForm.type}
                              onChange={(value) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  type: value as any,
                                })
                              }
                              options={[
                                {
                                  value: "Photo Gallery",
                                  label: "Photo Gallery",
                                },
                                { value: "Video", label: "Video" },
                                {
                                  value: "Mixed Gallery",
                                  label: "Mixed Gallery",
                                },
                                {
                                  value: "Video Gallery",
                                  label: "Video Gallery",
                                },
                                { value: "Still", label: "Still" },
                                { value: "Graphic", label: "Graphic" },
                                { value: "feature", label: "Feature" },
                                { value: "promo", label: "Promo" },
                                { value: "review", label: "Review" },
                                { value: "walkthrough", label: "Walkthrough" },
                                { value: "highlights", label: "Highlights" },
                                {
                                  value: "Marketing Email",
                                  label: "Marketing Email",
                                },
                                { value: "Blog", label: "Blog" },
                                { value: "other", label: "Other" },
                              ]}
                              placeholder="Select type"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Duration (seconds)
                            </label>
                            <Input
                              type="number"
                              min="1"
                              value={deliverableForm.duration}
                              onChange={(e) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  duration: parseInt(e.target.value) || 30,
                                })
                              }
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Aspect Ratio
                            </label>
                            <CustomDropdown
                              value={deliverableForm.aspectRatio}
                              onChange={(value) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  aspectRatio: value,
                                })
                              }
                              options={[
                                { value: "16:9", label: "16:9" },
                                { value: "9:16", label: "9:16" },
                                { value: "1:1", label: "1:1" },
                                { value: "4:5", label: "4:5" },
                                { value: "5:4", label: "5:4" },
                                { value: "3:2", label: "3:2" },
                                { value: "2:3", label: "2:3" },
                                { value: "custom", label: "Custom" },
                              ]}
                              placeholder="Select aspect ratio"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                        <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                          Assignment & Dates
                        </span>
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Assigned To (Optional)
                          </label>
                          <CustomDropdown
                            value={deliverableForm.assignedTo}
                            onChange={(value) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                assignedTo: value,
                              })
                            }
                            options={[
                              { value: "unassigned", label: "Unassigned" },
                              ...(project?.members.map((member) => ({
                                value: member.userId,
                                label:
                                  memberDetails[member.userId]?.name ||
                                  `User ${member.userId}`,
                              })) || []),
                            ]}
                            placeholder="Select team member"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Edit Deadline
                            </label>
                            <DateTimePicker
                              value={deliverableForm.editDeadline}
                              onChange={(value) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  editDeadline: value,
                                })
                              }
                              placeholder="Select edit deadline"
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Release Date
                            </label>
                            <DateTimePicker
                              value={deliverableForm.releaseDate}
                              onChange={(value) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  releaseDate: value,
                                })
                              }
                              placeholder="Select release date"
                              className="text-sm"
                            />
                            <div className="flex items-center space-x-2 pt-1">
                              <Checkbox
                                id="scheduled-add"
                                checked={deliverableForm.scheduled}
                                onCheckedChange={(checked) =>
                                  setDeliverableForm({
                                    ...deliverableForm,
                                    scheduled: checked === true,
                                  })
                                }
                              />
                              <label
                                htmlFor="scheduled-add"
                                className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide cursor-pointer"
                              >
                                Scheduled
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Vehicle (Optional)
                          </label>
                          <select
                            value={deliverableForm.carId || ""}
                            onChange={(e) => {
                              setDeliverableForm({
                                ...deliverableForm,
                                carId: e.target.value,
                              });
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">
                              🚫 No Vehicle - Project Only
                            </option>
                            {project?.carIds?.map((carId) => (
                              <option key={carId} value={carId}>
                                🚗 Car {carId}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                        <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                          Content References
                        </span>
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Galleries (Optional)
                          </label>
                          <MultiSelect
                            value={deliverableForm.gallery_ids.map((id) => {
                              const gallery = galleriesData?.galleries?.find(
                                (g: any) => g._id === id
                              );
                              return gallery
                                ? {
                                    label:
                                      gallery.name || `Gallery ${gallery._id}`,
                                    value: gallery._id,
                                  }
                                : { label: id, value: id };
                            })}
                            onChange={(selected) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                gallery_ids: selected.map((s) => s.value),
                              })
                            }
                            options={
                              galleriesLoading
                                ? []
                                : galleriesData?.galleries?.map(
                                    (gallery: any) => ({
                                      label:
                                        gallery.name ||
                                        `Gallery ${gallery._id}`,
                                      value: gallery._id,
                                    })
                                  ) || []
                            }
                            placeholder={
                              galleriesLoading
                                ? "Loading galleries..."
                                : "Select galleries"
                            }
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Captions (Optional)
                          </label>
                          <MultiSelect
                            value={deliverableForm.caption_ids.map((id) => {
                              const caption = captionsData.find(
                                (c: any) => c._id === id
                              );
                              return caption
                                ? {
                                    label: `${caption.platform}: ${caption.caption_text?.substring(0, 50)}${caption.caption_text?.length > 50 ? "..." : ""}`,
                                    value: caption._id,
                                  }
                                : { label: id, value: id };
                            })}
                            onChange={(selected) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                caption_ids: selected.map((s) => s.value),
                              })
                            }
                            options={
                              captionsLoading
                                ? []
                                : captionsData?.map((caption: any) => ({
                                    label: `${caption.platform}: ${caption.caption_text?.substring(0, 50)}${caption.caption_text?.length > 50 ? "..." : ""}`,
                                    value: caption._id,
                                  })) || []
                            }
                            placeholder={
                              captionsLoading
                                ? "Loading captions..."
                                : "Select captions"
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDeliverableForm({
                        title: "",
                        description: "",
                        type: "Video",
                        platforms: [],
                        duration: 30,
                        aspectRatio: "16:9",
                        editDeadline: "",
                        releaseDate: "",
                        assignedTo: "unassigned",
                        carId: "",
                        scheduled: false,
                        gallery_ids: [],
                        caption_ids: [],
                        mediaTypeId: "",
                      });
                      setIsAddDeliverableOpen(false);
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddDeliverable}
                    disabled={
                      isAddingDeliverable || !deliverableForm.title.trim()
                    }
                    size="sm"
                  >
                    {isAddingDeliverable ? "Adding..." : "Add Deliverable"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Deliverable Dialog */}
            <Dialog
              open={isEditDeliverableOpen}
              onOpenChange={setIsEditDeliverableOpen}
            >
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
                <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
                  <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
                    Edit Deliverable
                  </DialogTitle>
                  <DialogDescription>
                    Update the deliverable details.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
                  <div className="space-y-3 pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                        <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                          Basic Information
                        </span>
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="editDeliverableTitle"
                            className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                          >
                            Title
                          </label>
                          <Input
                            id="editDeliverableTitle"
                            value={deliverableForm.title}
                            onChange={(e) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                title: e.target.value,
                              })
                            }
                            placeholder="Enter deliverable title"
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="editDeliverableDescription"
                            className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                          >
                            Description
                          </label>
                          <Textarea
                            id="editDeliverableDescription"
                            value={deliverableForm.description}
                            onChange={(e) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                description: e.target.value,
                              })
                            }
                            placeholder="Enter deliverable description (optional)"
                            rows={3}
                            className="text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Platforms
                            </label>
                            <MultiSelect
                              value={deliverableForm.platforms}
                              onChange={(values) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  platforms: values,
                                })
                              }
                              options={availablePlatforms.map((p) => ({
                                label: p.name,
                                value: p._id,
                              }))}
                              placeholder="Select platforms"
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Type
                            </label>
                            <CustomDropdown
                              value={deliverableForm.type}
                              onChange={(value) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  type: value as any,
                                })
                              }
                              options={[
                                {
                                  value: "Photo Gallery",
                                  label: "Photo Gallery",
                                },
                                { value: "Video", label: "Video" },
                                {
                                  value: "Mixed Gallery",
                                  label: "Mixed Gallery",
                                },
                                {
                                  value: "Video Gallery",
                                  label: "Video Gallery",
                                },
                                { value: "Still", label: "Still" },
                                { value: "Graphic", label: "Graphic" },
                                { value: "feature", label: "Feature" },
                                { value: "promo", label: "Promo" },
                                { value: "review", label: "Review" },
                                { value: "walkthrough", label: "Walkthrough" },
                                { value: "highlights", label: "Highlights" },
                                {
                                  value: "Marketing Email",
                                  label: "Marketing Email",
                                },
                                { value: "Blog", label: "Blog" },
                                { value: "other", label: "Other" },
                              ]}
                              placeholder="Select type"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Duration (seconds)
                            </label>
                            <Input
                              type="number"
                              value={deliverableForm.duration}
                              onChange={(e) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  duration: parseInt(e.target.value) || 30,
                                })
                              }
                              min={1}
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                              Aspect Ratio
                            </label>
                            <CustomDropdown
                              value={deliverableForm.aspectRatio}
                              onChange={(value) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  aspectRatio: value,
                                })
                              }
                              options={[
                                { value: "16:9", label: "16:9" },
                                { value: "9:16", label: "9:16" },
                                { value: "1:1", label: "1:1" },
                                { value: "4:5", label: "4:5" },
                                { value: "5:4", label: "5:4" },
                                { value: "3:2", label: "3:2" },
                                { value: "2:3", label: "2:3" },
                                { value: "custom", label: "Custom" },
                              ]}
                              placeholder="Select aspect ratio"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                        <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                          Assignment & Dates
                        </span>
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Assigned To
                          </label>
                          <CustomDropdown
                            value={deliverableForm.assignedTo}
                            onChange={(value) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                assignedTo: value,
                              })
                            }
                            options={[
                              { value: "unassigned", label: "Unassigned" },
                              ...Object.entries(memberDetails).map(
                                ([uid, member]) => ({
                                  value: uid,
                                  label: member.name,
                                })
                              ),
                            ]}
                            placeholder="Select assignee"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Vehicle (Optional)
                          </label>
                          <select
                            value={deliverableForm.carId || ""}
                            onChange={(e) => {
                              setDeliverableForm({
                                ...deliverableForm,
                                carId: e.target.value,
                              });
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">
                              🚫 No Vehicle - Project Only
                            </option>
                            {project?.carIds?.map((carId) => (
                              <option key={carId} value={carId}>
                                🚗 Car {carId}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Edit Deadline
                          </label>
                          <DateTimePicker
                            value={deliverableForm.editDeadline || ""}
                            onChange={(value) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                editDeadline: value,
                              })
                            }
                            placeholder="Select edit deadline"
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Release Date
                          </label>
                          <DateTimePicker
                            value={deliverableForm.releaseDate || ""}
                            onChange={(value) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                releaseDate: value,
                              })
                            }
                            placeholder="Select release date"
                            className="text-sm"
                          />
                          <div className="flex items-center space-x-2 pt-1">
                            <Checkbox
                              id="scheduled-edit"
                              checked={deliverableForm.scheduled}
                              onCheckedChange={(checked) =>
                                setDeliverableForm({
                                  ...deliverableForm,
                                  scheduled: checked === true,
                                })
                              }
                            />
                            <label
                              htmlFor="scheduled-edit"
                              className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide cursor-pointer"
                            >
                              Scheduled
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                        <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                          Content References
                        </span>
                        <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Galleries (Optional)
                          </label>
                          <MultiSelect
                            value={deliverableForm.gallery_ids.map((id) => {
                              const gallery = galleriesData?.galleries?.find(
                                (g: any) => g._id === id
                              );
                              return gallery
                                ? {
                                    label:
                                      gallery.name || `Gallery ${gallery._id}`,
                                    value: gallery._id,
                                  }
                                : { label: id, value: id };
                            })}
                            onChange={(selected) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                gallery_ids: selected.map((s) => s.value),
                              })
                            }
                            options={
                              galleriesLoading
                                ? []
                                : galleriesData?.galleries?.map(
                                    (gallery: any) => ({
                                      label:
                                        gallery.name ||
                                        `Gallery ${gallery._id}`,
                                      value: gallery._id,
                                    })
                                  ) || []
                            }
                            placeholder={
                              galleriesLoading
                                ? "Loading galleries..."
                                : "Select galleries"
                            }
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                            Captions (Optional)
                          </label>
                          <MultiSelect
                            value={deliverableForm.caption_ids.map((id) => {
                              const caption = captionsData.find(
                                (c: any) => c._id === id
                              );
                              return caption
                                ? {
                                    label: `${caption.platform}: ${caption.caption_text?.substring(0, 50)}${caption.caption_text?.length > 50 ? "..." : ""}`,
                                    value: caption._id,
                                  }
                                : { label: id, value: id };
                            })}
                            onChange={(selected) =>
                              setDeliverableForm({
                                ...deliverableForm,
                                caption_ids: selected.map((s) => s.value),
                              })
                            }
                            options={
                              captionsLoading
                                ? []
                                : captionsData?.map((caption: any) => ({
                                    label: `${caption.platform}: ${caption.caption_text?.substring(0, 50)}${caption.caption_text?.length > 50 ? "..." : ""}`,
                                    value: caption._id,
                                  })) || []
                            }
                            placeholder={
                              captionsLoading
                                ? "Loading captions..."
                                : "Select captions"
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDeliverableForm({
                        title: "",
                        description: "",
                        type: "Video",
                        platforms: [],
                        duration: 30,
                        aspectRatio: "16:9",
                        editDeadline: "",
                        releaseDate: "",
                        assignedTo: "unassigned",
                        carId: "",
                        scheduled: false,
                        gallery_ids: [],
                        caption_ids: [],
                        mediaTypeId: "",
                      });
                      setEditingDeliverable(null);
                      setIsEditDeliverableOpen(false);
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateDeliverable}
                    disabled={
                      isUpdatingDeliverable || !deliverableForm.title.trim()
                    }
                    size="sm"
                  >
                    {isUpdatingDeliverable
                      ? "Updating..."
                      : "Update Deliverable"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      {/* Mobile View - Cards */}
      <div className="block md:hidden space-y-3 px-6 pb-6">
        {!isLoadingDeliverables && sortedDeliverables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No deliverables yet</p>
            <p className="text-sm">
              Add deliverables to track project outputs and milestones
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDeliverables.map((deliverable) => (
              <DeliverableCard
                key={deliverable._id?.toString()}
                deliverable={deliverable}
                actions={deliverableActions}
                onOpenModal={handleOpenDeliverableModal}
                showCarInfo={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop View - Table - Full width with Resizable Columns */}
      <ResizableDeliverablesTable
        deliverables={sortedDeliverables}
        isLoading={isLoadingDeliverables}
        actions={deliverableActions}
        batchMode={mockBatchMode}
        showCarColumn={true}
        onOpenModal={handleOpenDeliverableModal}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      {/* Deliverable Detail Modal */}
      <DeliverableModal
        deliverable={selectedDeliverable}
        isOpen={isDeliverableModalOpen}
        onClose={handleCloseDeliverableModal}
        actions={deliverableActions}
      />

      {/* JSON Upload Modal */}
      <JsonUploadPasteModal
        isOpen={showJsonUpload}
        onClose={() => setShowJsonUpload(false)}
        onSubmit={handleJsonSubmit}
        title="Batch Create Deliverables from JSON (Relaxed)"
        description="Upload a JSON file or paste JSON data to create multiple deliverables at once. The JSON should be an array of deliverable objects with minimal validation - only title is required. Platform and editor assignments can be done later."
        expectedType="deliverables-relaxed"
        isSubmitting={isSubmittingJson}
      />
    </Card>
  );
}
