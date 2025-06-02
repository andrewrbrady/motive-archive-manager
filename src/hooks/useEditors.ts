import { useQuery } from "@tanstack/react-query";
import { useAPI } from "@/hooks/useAPI";

export interface Editor {
  uid: string;
  name: string;
  email: string;
  creativeRoles: string[];
  status: string;
  photoURL?: string;
}

/**
 * Hook for fetching users that can be assigned as editors to deliverables
 * This uses a public endpoint accessible to all authenticated users
 */
export function useEditors() {
  const api = useAPI();

  const fetchEditors = async (): Promise<Editor[]> => {
    if (!api) throw new Error("Authentication required");

    const data = await api.get("/api/users/editors");

    if (Array.isArray(data)) {
      return data;
    } else {
      throw new Error("Unexpected API response structure");
    }
  };

  return useQuery({
    queryKey: ["editors"],
    queryFn: fetchEditors,
    enabled: !!api, // Only run query when API client is available
  });
}
