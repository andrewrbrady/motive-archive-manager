"use client";

import { useState } from "react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
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

interface FirestoreUserSelectorProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowUnassign?: boolean;
  className?: string;
  showAvatar?: boolean;
}

export default function FirestoreUserSelector({
  value,
  onChange,
  placeholder = "Select user",
  disabled = false,
  allowUnassign = true,
  className = "",
  showAvatar = true,
}: FirestoreUserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch users using our authenticated API client
  const {
    data: usersResponse,
    isLoading,
    error,
    refetch,
  } = useAPIQuery<{ users?: FirestoreUser[] } | FirestoreUser[]>("/users", {
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes
  });

  // Handle both API response formats (array or object with users property)
  const users = Array.isArray(usersResponse)
    ? usersResponse.filter(
        (user: FirestoreUser) => user && typeof user === "object"
      )
    : (usersResponse?.users || []).filter(
        (user: FirestoreUser) => user && typeof user === "object"
      );

  // Find the selected user
  const selectedUser = value
    ? users.find((user: FirestoreUser) => user?.uid === value)
    : null;

  // Get initials for avatar
  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== "string") return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "U";
    return (
      parts
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .toUpperCase() || "U"
    );
  };

  // Handle value change
  const handleValueChange = (newValue: string) => {
    if (newValue === "unassigned") {
      onChange(null);
      return;
    }
    onChange(newValue);
  };

  // Prefetch users when dropdown is about to open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      refetch();
    }
  };

  return (
    <div className={className}>
      <Select
        value={value || ""}
        onValueChange={handleValueChange}
        onOpenChange={handleOpenChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full">
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
                      alt={selectedUser.name || "User"}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span>{selectedUser.name || "Unnamed User"}</span>
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

        <SelectContent className="z-50 min-w-[200px]" position="popper">
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

                {users.length > 0 ? (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold bg-muted">
                      {users.length} users available
                    </div>

                    {users.map((user: FirestoreUser) =>
                      user && typeof user === "object" && user.uid ? (
                        <SelectItem key={user.uid} value={user.uid}>
                          <div className="flex items-center gap-2">
                            {showAvatar ? (
                              <Avatar className="h-5 w-5">
                                <AvatarImage
                                  src={user.profileImage || user.image || ""}
                                  alt={user.name || "User"}
                                />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                            <span>{user.name || "Unnamed User"}</span>
                          </div>
                        </SelectItem>
                      ) : null
                    )}
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
