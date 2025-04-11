import { useQuery } from "@tanstack/react-query";
import { FirestoreUser } from "@/lib/firestore/users";

async function fetchUsers(): Promise<FirestoreUser[]> {
  const response = await fetch("/api/users");
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
}
