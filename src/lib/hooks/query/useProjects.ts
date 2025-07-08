import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Project,
  ProjectListResponse,
  ProjectStatus,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/types/project";
import { useAPI } from "@/hooks/useAPI";

export interface ProjectsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  includeImages?: boolean;
}

/**
 * Hook to fetch project listings with various filters
 * Based on successful useCars pattern with proper React Query caching
 */
export function useProjects(params: ProjectsQueryParams = {}) {
  const api = useAPI();
  const {
    page = 1,
    limit = 50,
    search,
    status,
    type,
    includeImages = true,
  } = params;

  return useQuery({
    queryKey: [
      "projects",
      { page, limit, search, status, type, includeImages },
    ],
    queryFn: async () => {
      if (!api) throw new Error("Authentication required");

      // Construct query parameters
      const queryParams = new URLSearchParams();
      queryParams.set("page", page.toString());
      queryParams.set("limit", limit.toString());

      if (search) {
        queryParams.set("search", search);
      }

      if (status && status !== "all") {
        queryParams.set("status", status);
      }

      if (type && type !== "all") {
        queryParams.set("type", type);
      }

      if (includeImages) {
        queryParams.set("includeImages", "true");
      }

      const data: ProjectListResponse = await api.get(
        `/projects?${queryParams.toString()}`
      );

      return {
        projects: data.projects as Project[],
        total: data.total as number,
        page: data.page,
        limit: data.limit,
      };
    },
    enabled: !!api, // Only run query when API client is available
    // Use same caching configuration as successful cars hook
    staleTime: 0, // No cache to ensure fresh data like EventsOptimized
    gcTime: 1000 * 60 * 10, // Cache persists for 10 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: true, // Always refetch on mount for fresh project data
    retry: 2, // Only retry failed requests twice
  });
}

/**
 * Hook to fetch single project data
 * Based on successful useCarData pattern
 */
export function useProject(projectId: string) {
  const api = useAPI();

  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!api) throw new Error("Authentication required");
      const response = await api.get(`/projects/${projectId}`);
      return (response as any).project as Project;
    },
    enabled: !!api && !!projectId,
    staleTime: 0, // No cache to ensure fresh data
    gcTime: 1000 * 60 * 30, // Cache persists for 30 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook to update project data
 * Based on successful useUpdateCar pattern with proper cache invalidation
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const api = useAPI();

  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: string;
      data: Partial<UpdateProjectRequest>;
    }) => {
      if (!api) throw new Error("Authentication required");
      return await api.put(`/projects/${projectId}`, data);
    },
    onSuccess: (data, { projectId }) => {
      // Multiple cache invalidation strategies like EventsOptimized

      // Invalidate the specific project query
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
        exact: true,
        refetchType: "active",
      });

      // Invalidate all projects queries to refresh lists
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        refetchType: "active",
      });

      // Force refetch active queries immediately
      queryClient.refetchQueries({
        queryKey: ["project", projectId],
        exact: true,
        type: "active",
      });

      queryClient.refetchQueries({
        queryKey: ["projects"],
        type: "active",
      });
    },
    onError: (error: any) => {
      console.error("Error updating project:", error);
    },
  });
}

/**
 * Hook to create new project
 * Based on successful car creation patterns
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const api = useAPI();

  return useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      if (!api) throw new Error("Authentication required");
      return await api.post("/projects", data);
    },
    onSuccess: () => {
      // Invalidate all projects queries to show new project
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        refetchType: "active",
      });

      // Force refetch active queries
      queryClient.refetchQueries({
        queryKey: ["projects"],
        type: "active",
      });
    },
    onError: (error: any) => {
      console.error("Error creating project:", error);
    },
  });
}

/**
 * Hook to delete a project
 * Based on successful useDeleteCar pattern
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const api = useAPI();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!api) throw new Error("Authentication required");
      return await api.delete(`/projects/${projectId}`);
    },
    onSuccess: (_, projectId) => {
      // Remove this project from all queries
      queryClient.removeQueries({ queryKey: ["project", projectId] });

      // Invalidate the projects list query to refresh it
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        refetchType: "active",
      });

      // Force refetch active queries
      queryClient.refetchQueries({
        queryKey: ["projects"],
        type: "active",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting project:", error);
    },
  });
}

/**
 * Hook to update project status
 * Based on successful car status update patterns
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  const api = useAPI();

  return useMutation({
    mutationFn: async ({
      projectId,
      status,
    }: {
      projectId: string;
      status: ProjectStatus;
    }) => {
      if (!api) throw new Error("Authentication required");
      return await api.put(`/projects/${projectId}`, { status });
    },
    onSuccess: (data, { projectId }) => {
      // Same cache invalidation pattern as useUpdateProject
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
        exact: true,
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: ["projects"],
        refetchType: "active",
      });

      queryClient.refetchQueries({
        queryKey: ["project", projectId],
        exact: true,
        type: "active",
      });

      queryClient.refetchQueries({
        queryKey: ["projects"],
        type: "active",
      });
    },
    onError: (error: any) => {
      console.error("Error updating project status:", error);
    },
  });
}

/**
 * Hook to update project primary image
 * Specialized mutation for image updates with enhanced cache invalidation
 */
export function useUpdateProjectPrimaryImage() {
  const queryClient = useQueryClient();
  const api = useAPI();

  return useMutation({
    mutationFn: async ({
      projectId,
      primaryImageId,
    }: {
      projectId: string;
      primaryImageId: string | null;
    }) => {
      if (!api) throw new Error("Authentication required");
      return await api.put(`/projects/${projectId}`, { primaryImageId });
    },
    onSuccess: (data, { projectId }) => {
      // Enhanced cache invalidation for image updates
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
        exact: true,
        refetchType: "active",
      });

      // Invalidate projects queries with includeImages=true to refresh thumbnails
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [key, params] = query.queryKey;
          return key === "projects" && (params as any)?.includeImages === true;
        },
        refetchType: "active",
      });

      // Force immediate refetch
      queryClient.refetchQueries({
        queryKey: ["project", projectId],
        exact: true,
        type: "active",
      });

      queryClient.refetchQueries({
        predicate: (query) => {
          const [key, params] = query.queryKey;
          return key === "projects" && (params as any)?.includeImages === true;
        },
        type: "active",
      });
    },
    onError: (error: any) => {
      console.error("Error updating project primary image:", error);
    },
  });
}
