import { useQuery } from "@tanstack/react-query";
import { FirestoreUser } from "@/lib/firestore/users";
import { useAPI } from "@/hooks/useAPI";

export function useUsers() {
  const api = useAPI();

  const fetchUsers = async (): Promise<FirestoreUser[]> => {
    if (!api) throw new Error("Authentication required");

    const data: any = await api.get("/api/users");

    // Handle the correct API response structure: { users: [...], total: number }
    if (data.users && Array.isArray(data.users)) {
      return data.users;
    } else if (Array.isArray(data)) {
      // Fallback for legacy API responses that return array directly
      return data;
    } else {
      throw new Error("Unexpected API response structure");
    }
  };

  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: !!api, // Only run query when API client is available
  });
}
