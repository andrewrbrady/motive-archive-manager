"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterContainer } from "@/components/ui/FilterContainer";
import { ListContainer } from "@/components/ui/ListContainer";
import { UserPlus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import UserDetailModal from "./UserDetailModal";

// Shared User interface to be consistent across components
export interface User {
  uid: string;
  _id?: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
  accountType?: string;
  photoURL?: string;
  bio?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check session and sync claims when component mounts
    const syncSession = async () => {
      try {
        // First try to refresh the session from Firebase Auth
        console.log("Refreshing session from Firebase Auth...");
        const refreshResponse = await fetch("/api/auth/refresh-session");
        const refreshData = await refreshResponse.json();

        console.log("Session refresh result:", refreshData);

        // Now fetch users with the refreshed session
        await fetchUsers();
      } catch (error) {
        console.error("Error refreshing session:", error);
        fetchUsers(); // Still try to fetch users
      }
    };

    syncSession();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.roles.some((role) => role.toLowerCase().includes(query)) ||
        user.creativeRoles.some((role) => role.toLowerCase().includes(query))
    );

    setFilteredUsers(filtered);
  };

  const resetSearch = () => {
    setSearchQuery("");
  };

  const fetchUsers = async (startAfter?: string) => {
    try {
      setIsLoading(true);

      // Try with a simplified approach in case of failures
      let url = new URL("/api/users/index", window.location.origin);

      console.log("Fetching users from:", url.toString());

      // Make the request directly - authentication will be handled by Next.js session
      let response = await fetch(url.toString(), {
        credentials: "include", // This ensures cookies are sent with the request
      });

      // Log the response status
      console.log("API response status:", response.status);

      // If the main endpoint fails, try a fallback approach
      if (!response.ok) {
        console.log("Primary endpoint failed, trying fallback approach...");

        // Don't show an error toast on initial load - just inform the user about the issue
        if (!startAfter) {
          setUsers([
            {
              uid: "temp-1",
              name: "Error Loading Users",
              email: "Please refresh or check console",
              roles: ["user"],
              creativeRoles: [],
              status: "active",
            },
          ]);
          setFilteredUsers([
            {
              uid: "temp-1",
              name: "Error Loading Users",
              email: "Please refresh or check console",
              roles: ["user"],
              creativeRoles: [],
              status: "active",
            },
          ]);

          // Show toast with instructions to fix
          toast({
            title: "Authentication Issue",
            description:
              "There might be an issue with your admin permissions. Try visiting /api/auth/grant-admin to fix.",
            variant: "destructive",
          });

          return;
        } else {
          // If we're loading more data and it fails, show an error
          toast({
            title: "Error",
            description: "Failed to load more users. Try refreshing the page.",
            variant: "destructive",
          });
          return;
        }
      }

      // Process the response
      const data = await response.json();
      console.log("Received data:", {
        userCount: Array.isArray(data) ? data.length : "N/A",
      });

      // Process the response (might be different format for the non-paginated endpoint)
      const users = Array.isArray(data) ? data : data.users || [];
      const hasMoreData = data.pagination?.hasMore || false;
      const lastUserId = data.pagination?.lastId || undefined;

      // Update pagination state
      setHasMore(hasMoreData);
      setLastId(lastUserId);

      // Update users state based on whether we're loading more or starting fresh
      if (startAfter) {
        setUsers((prev) => [...prev, ...users]);
        setFilteredUsers((prev) => [...prev, ...users]);
      } else {
        setUsers(users);
        setFilteredUsers(users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      // Show an error message with helpful instructions
      setUsers([
        {
          uid: "temp-error",
          name: "Error Occurred",
          email: "Please check console for details",
          roles: ["user"],
          creativeRoles: [],
          status: "active",
        },
      ]);
      setFilteredUsers([
        {
          uid: "temp-error",
          name: "Error Occurred",
          email: "Please check console for details",
          roles: ["user"],
          creativeRoles: [],
          status: "active",
        },
      ]);

      toast({
        title: "Error",
        description:
          "Failed to fetch users. Check the console for more details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && lastId) {
      fetchUsers(lastId);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      // Updated to use the Firestore API endpoint
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      // Refresh the user list
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
      console.error("Error deleting user:", error);
    }
  };

  const handleUserUpdated = (updatedUser: User) => {
    setIsUserModalOpen(false);
    fetchUsers(); // Refresh the user list
  };

  const syncSession = async () => {
    try {
      setIsLoading(true);

      // Refresh the session from Firebase Auth
      const refreshResponse = await fetch("/api/auth/refresh-session");
      const refreshData = await refreshResponse.json();

      console.log("Session refresh result:", refreshData);

      // Now fetch users with the refreshed session
      await fetchUsers();

      toast({
        title: "Success",
        description: "User data refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing session:", error);
      toast({
        title: "Error",
        description: "Failed to refresh user data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <FilterContainer>
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onReset={resetSearch}
            placeholder="Search users..."
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => syncSession()}
            variant="outline"
            disabled={isLoading}
            className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
          >
            Refresh Users
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="outline"
            className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </FilterContainer>

      <ListContainer>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Creative Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  <LoadingSpinner size="sm" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  <span className="text-muted-foreground">No users found</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.uid}
                  className="border-b border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50"
                >
                  <TableCell className="font-medium">
                    <a
                      href={`/admin/users/${user.uid}`}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      {user.name}
                    </a>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.creativeRoles.length > 0 ? (
                        user.creativeRoles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
                          >
                            {role
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt
                      ? user.createdAt instanceof Date
                        ? user.createdAt.toLocaleDateString()
                        : new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => handleEditUser(user)}
                        variant="ghost"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(user.uid)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              onClick={loadMore}
              variant="outline"
              disabled={isLoading}
              className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : "Load More"}
            </Button>
          </div>
        )}
      </ListContainer>

      {/* User Detail Modal for both create and edit */}
      <UserDetailModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
