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
import { UserPlus, RefreshCw, Users } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserDetailModal from "./UserDetailModal";

// Shared User interface to be consistent across components
export interface User {
  uid: string;
  email: string;
  name: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
  photoURL?: string;
  image?: string;
  accountType?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
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
  const [isSyncingUser, setIsSyncingUser] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    // Check session and sync claims when component mounts
    const syncSession = async () => {
      try {
        if (process.env.NODE_ENV !== "production") {
          console.log("Refreshing session from Firebase Auth...");
        }
        const refreshResponse = await fetch("/api/auth/refresh-session");
        const refreshData = await refreshResponse.json();

        if (process.env.NODE_ENV !== "production") {
          console.log("Session refresh result:", {
            success: !!refreshData,
            hasData: !!refreshData,
          });
        }

        // Now fetch users with the refreshed session
        await fetchUsers();
      } catch (error) {
        console.error(
          "Error refreshing session:",
          (error as Error).message || "Unknown error"
        );
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

      // Add pagination parameters if provided
      if (startAfter) {
        url.searchParams.set("startAfter", startAfter);
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("Fetching users from:", url.toString());
      }

      // Make the request directly - authentication will be handled by Next.js session
      let response = await fetch(url.toString(), {
        credentials: "include", // This ensures cookies are sent with the request
      });

      // Log the response status
      if (process.env.NODE_ENV !== "production") {
        console.log("API response status:", response.status);
      }

      // If the main endpoint fails, try a fallback approach
      if (!response.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.log("Primary endpoint failed, trying fallback approach...");
        }

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
              createdAt: new Date(),
              updatedAt: new Date(),
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
              createdAt: new Date(),
              updatedAt: new Date(),
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
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (process.env.NODE_ENV !== "production") {
        console.log("Fetched users data:", {
          hasUsers: !!data.users,
          usersCount: data.users?.length || 0,
          hasMore: !!data.hasMore,
          hasLastId: !!data.lastId,
        });
      }

      if (data.users && Array.isArray(data.users)) {
        if (startAfter) {
          // Append to existing users for pagination
          setUsers((prev) => [...prev, ...data.users]);
          setFilteredUsers((prev) => [...prev, ...data.users]);
        } else {
          // Replace users for initial load
          setUsers(data.users);
          setFilteredUsers(data.users);
        }

        // Handle pagination
        setHasMore(data.hasMore || false);
        setLastId(data.lastId);

        if (process.env.NODE_ENV !== "production") {
          console.log(`Loaded ${data.users.length} users`);
        }
      } else {
        console.error("Invalid response format:", data);
        throw new Error("Invalid response format");
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
          createdAt: new Date(),
          updatedAt: new Date(),
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
          createdAt: new Date(),
          updatedAt: new Date(),
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

  const handleInviteUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    // Ensure we have a valid uid
    if (!user.uid) {
      console.error("Cannot edit user without uid:", user);
      toast({
        title: "Error",
        description: "Invalid user data. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
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
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.uid === updatedUser.uid ? updatedUser : user
      )
    );
  };

  const syncUserAvatar = async (userId: string) => {
    setIsSyncingUser(userId);
    try {
      const response = await fetch("/api/users/sync-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync avatar");
      }

      const result = await response.json();

      // Update the user in our local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === userId
            ? { ...user, photoURL: result.photoURL, image: result.photoURL }
            : user
        )
      );

      toast({
        title: "Success",
        description: "Avatar synced successfully",
      });
    } catch (error) {
      console.error("Error syncing avatar:", error);
      toast({
        title: "Error",
        description: "Failed to sync avatar",
        variant: "destructive",
      });
    } finally {
      setIsSyncingUser(null);
    }
  };

  const syncAllAvatars = async () => {
    setIsSyncingAll(true);
    try {
      const response = await fetch("/api/users/sync-all-avatars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sync all avatars");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `Successfully synced ${result.updated} user avatars`,
      });

      // Refresh the user list to show updated avatars
      fetchUsers();
    } catch (error) {
      console.error("Error syncing all avatars:", error);
      toast({
        title: "Error",
        description: "Failed to sync all avatars",
        variant: "destructive",
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return "N/A";
    try {
      // Handle Firestore timestamp format
      if (dateValue._seconds) {
        const date = new Date(dateValue._seconds * 1000);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      // Handle regular date strings/objects
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
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
            onClick={syncAllAvatars}
            variant="outline"
            disabled={isSyncingAll}
            className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
          >
            {isSyncingAll ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Users className="w-4 h-4 mr-2" />
            )}
            {isSyncingAll ? "Syncing..." : "Sync All Avatars"}
          </Button>
          <Button
            onClick={handleInviteUser}
            variant="outline"
            className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </FilterContainer>

      <ListContainer>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] hover:bg-transparent">
              <TableHead className="w-[60px]">Photo</TableHead>
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
              <TableRow key="loading">
                <TableCell colSpan={8} className="text-center py-4">
                  <LoadingSpinner size="sm" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow key="no-users">
                <TableCell colSpan={8} className="text-center py-4">
                  <span className="text-muted-foreground">No users found</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user: User) => {
                // Ensure we have a valid uid for the key
                const rowKey = user.uid || `temp-${user.email}`;
                return (
                  <TableRow
                    key={rowKey}
                    className="border-b border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50"
                  >
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.photoURL || user.image || ""}
                          alt={user.name}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.uid ? (
                        <a
                          href={`/admin/users/${user.uid}`}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          {user.name}
                        </a>
                      ) : (
                        <span>{user.name}</span>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role: string, index: number) => (
                          <span
                            key={`${rowKey}-role-${index}`}
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
                          user.creativeRoles.map(
                            (role: string, index: number) => (
                              <span
                                key={`${rowKey}-creative-role-${index}`}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
                              >
                                {role
                                  .split("_")
                                  .map(
                                    (word: string) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1)
                                  )
                                  .join(" ")}
                              </span>
                            )
                          )
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
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {user.uid && (
                          <>
                            <Button
                              onClick={() => syncUserAvatar(user.uid)}
                              variant="ghost"
                              size="sm"
                              disabled={isSyncingUser === user.uid}
                              title="Sync Google Avatar"
                            >
                              {isSyncingUser === user.uid ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
