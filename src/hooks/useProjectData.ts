import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAPI } from "@/hooks/useAPI";
import { Project } from "@/types/project";

// ⚡ PERFORMANCE OPTIMIZED PROJECT DATA HOOKS
// These hooks provide caching and background refetching for project data

export interface PreloadedProjectData {
  events?: {
    events: any[];
    total: number;
  };
  cars?: {
    cars: any[];
    total: number;
  };
  models?: {
    models: any[];
    total: number;
  };
  captions?: {
    captions: any[];
    total: number;
  };
  galleries?: any[];
  deliverables?: any[];
  timeline?: any;
}

// Query keys for consistent caching
export const projectQueryKeys = {
  all: ["projects"] as const,
  lists: () => [...projectQueryKeys.all, "list"] as const,
  list: (filters: string) =>
    [...projectQueryKeys.lists(), { filters }] as const,
  details: () => [...projectQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...projectQueryKeys.details(), id] as const,
  preload: (id: string, tabs: string[]) =>
    [...projectQueryKeys.detail(id), "preload", { tabs }] as const,
  events: (id: string) => [...projectQueryKeys.detail(id), "events"] as const,
  cars: (id: string) => [...projectQueryKeys.detail(id), "cars"] as const,
  captions: (id: string) =>
    [...projectQueryKeys.detail(id), "captions"] as const,
};

/**
 * ⚡ OPTIMIZED: Hook for preloading multiple tab data in a single request
 * This dramatically reduces MongoDB connection usage and improves load times
 */
export function useProjectPreload(
  projectId: string,
  tabs: string[] = ["events", "cars", "captions"],
  options?: {
    enabled?: boolean;
    limit?: number;
    includeCars?: boolean;
  }
) {
  const api = useAPI();
  const { enabled = true, limit = 50, includeCars = true } = options || {};

  return useQuery({
    queryKey: projectQueryKeys.preload(projectId, tabs),
    queryFn: async () => {
      if (!api) throw new Error("API not available");

      console.time("useProjectPreload-fetch");

      const params = new URLSearchParams({
        tabs: tabs.join(","),
        limit: limit.toString(),
        includeCars: includeCars.toString(),
      });

      const response = (await api.get(
        `projects/${projectId}/preload?${params.toString()}`
      )) as {
        success: boolean;
        data: PreloadedProjectData;
        loadedTabs: string[];
        timestamp: string;
      };

      console.timeEnd("useProjectPreload-fetch");

      if (!response.success) {
        throw new Error("Failed to preload project data");
      }

      return response;
    },
    enabled: enabled && !!api && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook for fetching individual project events with caching
 */
export function useProjectEvents(
  projectId: string,
  options?: {
    enabled?: boolean;
    includeCars?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  const api = useAPI();
  const {
    enabled = true,
    includeCars = true,
    limit = 50,
    offset = 0,
  } = options || {};

  return useQuery({
    queryKey: projectQueryKeys.events(projectId),
    queryFn: async () => {
      if (!api) throw new Error("API not available");

      const params = new URLSearchParams({
        includeCars: includeCars.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
      });

      return api.get(`projects/${projectId}/events?${params.toString()}`);
    },
    enabled: enabled && !!api && !!projectId,
    staleTime: 1000 * 60 * 3, // 3 minutes for events (more dynamic)
    gcTime: 1000 * 60 * 8,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching individual project cars with caching
 */
export function useProjectCars(
  projectId: string,
  options?: {
    enabled?: boolean;
    includeImages?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  const api = useAPI();
  const {
    enabled = true,
    includeImages = false,
    limit = 20,
    offset = 0,
  } = options || {};

  return useQuery({
    queryKey: projectQueryKeys.cars(projectId),
    queryFn: async () => {
      if (!api) throw new Error("API not available");

      const params = new URLSearchParams({
        includeImages: includeImages.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
      });

      return api.get(`projects/${projectId}/cars?${params.toString()}`);
    },
    enabled: enabled && !!api && !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes for cars (less dynamic)
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching project captions with caching
 */
export function useProjectCaptions(
  projectId: string,
  options?: {
    enabled?: boolean;
    platform?: string;
    limit?: number;
    offset?: number;
  }
) {
  const api = useAPI();
  const { enabled = true, platform, limit = 50, offset = 0 } = options || {};

  return useQuery({
    queryKey: projectQueryKeys.captions(projectId),
    queryFn: async () => {
      if (!api) throw new Error("API not available");

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (platform) {
        params.append("platform", platform);
      }

      return api.get(`projects/${projectId}/captions?${params.toString()}`);
    },
    enabled: enabled && !!api && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes for captions
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation for updating project data with cache invalidation
 */
export function useUpdateProject() {
  const api = useAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      updates: Partial<Project>;
    }) => {
      if (!api) throw new Error("API not available");

      return api.put(`projects/${data.projectId}`, data.updates);
    },
    onSuccess: (data, variables) => {
      // Invalidate all project-related queries for this project
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(variables.projectId),
      });

      // Also invalidate the project list
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.lists(),
      });
    },
  });
}

/**
 * Utility function to prefetch project data
 * Useful for hover/focus prefetching on project links
 */
export function usePrefetchProject() {
  const queryClient = useQueryClient();
  const api = useAPI();

  return async (projectId: string, tabs: string[] = ["events", "cars"]) => {
    if (!api) return;

    await queryClient.prefetchQuery({
      queryKey: projectQueryKeys.preload(projectId, tabs),
      queryFn: async () => {
        const params = new URLSearchParams({
          tabs: tabs.join(","),
          limit: "20",
          includeCars: "true",
        });

        const response = await api.get(
          `projects/${projectId}/preload?${params.toString()}`
        );

        return response;
      },
      staleTime: 1000 * 60 * 5,
    });
  };
}

/**
 * Hook to invalidate project cache when needed
 */
export function useInvalidateProject() {
  const queryClient = useQueryClient();

  return {
    invalidateProject: (projectId: string) => {
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(projectId),
      });
    },
    invalidateAllProjects: () => {
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.all,
      });
    },
    removeProject: (projectId: string) => {
      queryClient.removeQueries({
        queryKey: projectQueryKeys.detail(projectId),
      });
    },
  };
}
