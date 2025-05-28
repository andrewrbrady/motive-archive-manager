import { useQuery } from "@tanstack/react-query";
import { FirestoreUser } from "@/lib/firestore/users";

async function fetchUsers(): Promise<FirestoreUser[]> {
  const response = await fetch("/api/users");
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  const data = await response.json();

  // Handle the correct API response structure: { users: [...], total: number }
  if (data.users && Array.isArray(data.users)) {
    return data.users;
  } else if (Array.isArray(data)) {
    // Fallback for legacy API responses that return array directly
    return data;
  } else {
    throw new Error("Unexpected API response structure");
  }
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
}
