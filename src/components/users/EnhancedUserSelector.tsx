"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, UserMinus } from "lucide-react";
import { FirestoreUser } from "@/types/firebase";
import { getUsers } from "@/lib/users/cache";

interface EnhancedUserSelectorProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  onUserInfoRetrieved?: (username: string | null) => void;
  creativeRole?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  allowUnassign?: boolean;
  className?: string;
  showAvatar?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  editorName?: string;
}

export default function EnhancedUserSelector({
  value,
  onChange,
  onUserInfoRetrieved,
  creativeRole,
  label,
  placeholder = "Select user",
  disabled = false,
  allowUnassign = true,
  className = "",
  showAvatar = true,
  size = "md",
  align = "start",
  side = "top",
  editorName,
}: EnhancedUserSelectorProps) {
  // Use React Query for data fetching and caching
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  }: UseQueryResult<FirestoreUser[], Error> = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<FirestoreUser[]> => {
      // [REMOVED] // [REMOVED] console.log("Fetching all users");
      const fetchedUsers = await getUsers();
      // [REMOVED] // [REMOVED] console.log("Fetched users:", fetchedUsers);

      // Only filter out OAuth IDs and inactive users
      const filteredUsers = fetchedUsers.filter((user: FirestoreUser) => {
        const hasOAuthId = user.uid && /^\d{21,}$/.test(user.uid);
        const isActive = user.status === "active";
        return !hasOAuthId && isActive;
      });

      // [REMOVED] // [REMOVED] console.log("Filtered users:", filteredUsers);
      return filteredUsers;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes
  });

  // No need to filter by creative role anymore
  const filteredUsers = users;

  // Find the selected user - memoized to prevent unnecessary recalculations
  const selectedUser = useMemo(() => {
    if (!value) return null;
    return filteredUsers.find((user: FirestoreUser) => user.uid === value);
  }, [value, filteredUsers]);

  // Get initials for avatar - memoized
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }, []);

  // Determine the height class based on size - memoized
  const heightClass = useMemo(() => {
    switch (size) {
      case "sm":
        return "h-8";
      case "lg":
        return "h-12";
      default:
        return "h-10";
    }
  }, [size]);

  // Determine the text size class based on size - memoized
  const textSizeClass = useMemo(() => {
    switch (size) {
      case "sm":
        return "text-xs";
      case "lg":
        return "text-base";
      default:
        return "text-sm";
    }
  }, [size]);

  // Update parent component with user info when selected user changes
  useEffect(() => {
    if (onUserInfoRetrieved) {
      onUserInfoRetrieved(selectedUser?.name || editorName || null);
    }
  }, [selectedUser, editorName, onUserInfoRetrieved]);

  // Handle value change
  const handleValueChange = useCallback(
    (newValue: string) => {
      // Handle unassign case
      if (newValue === "unassigned") {
        onChange(null);
        return;
      }
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}

      <Select
        value={value || ""}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={`w-full ${heightClass} ${textSizeClass}`}>
          <SelectValue placeholder={placeholder}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : selectedUser ? (
              <div className="flex items-center gap-2">
                {showAvatar && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage
                      src={
                        selectedUser.profileImage || selectedUser.image || ""
                      }
                      alt={selectedUser.name}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span>{selectedUser.name}</span>
              </div>
            ) : value && editorName ? (
              <div className="flex items-center gap-2">
                {showAvatar && (
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(editorName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span>{editorName}</span>
              </div>
            ) : value === null && allowUnassign ? (
              <div className="flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-muted-foreground" />
                <span>Unassigned</span>
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent
          align={align}
          side={side}
          className="z-50 min-w-[200px]"
          position="popper"
        >
          <SelectGroup>
            {error ? (
              <div className="px-2 py-1 text-xs text-destructive">
                Failed to load users
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading users...</span>
              </div>
            ) : (
              <>
                {allowUnassign && (
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <UserMinus className="h-4 w-4" />
                      <span>Unassign</span>
                    </div>
                  </SelectItem>
                )}

                {filteredUsers.length > 0 ? (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold bg-muted">
                      {filteredUsers.length} users available
                    </div>

                    {filteredUsers.map((user: FirestoreUser) => (
                      <SelectItem key={user.uid} value={user.uid}>
                        <div className="flex items-center gap-2">
                          {showAvatar ? (
                            <Avatar className="h-5 w-5">
                              <AvatarImage
                                src={user.profileImage || user.image || ""}
                                alt={user.name}
                              />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <span>{user.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    No users found
                  </div>
                )}
              </>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
