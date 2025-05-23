"use client";

import { useMemo, useEffect } from "react";
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
import { useUsers } from "@/hooks/useUsers";

interface UserSelectorProps {
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

export default function UserSelector({
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
}: UserSelectorProps) {
  const { data: users = [], isLoading, error } = useUsers();

  // Find the selected user - only by Firebase UID
  const selectedUser = useMemo(() => {
    if (!value) return null;

    // Look for user with matching Firebase UID
    const firebaseUidMatch = users.find((user) => user.uid === value);

    if (firebaseUidMatch) {
      return firebaseUidMatch;
    }

    // If no exact match but we have an editor name, create a placeholder user
    if (editorName) {
      return {
        uid: value,
        name: editorName,
        email: "",
        roles: [],
        creativeRoles: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        image: "",
        profileImage: "",
      } as FirestoreUser;
    }

    return null;
  }, [value, users, editorName]);

  // When the selected user changes, call the callback with the user's name
  useEffect(() => {
    if (onUserInfoRetrieved) {
      onUserInfoRetrieved(selectedUser?.name || editorName || null);
    }
  }, [selectedUser, onUserInfoRetrieved, editorName]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name || typeof name !== "string") {
      return "?";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Determine the height class based on size
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

  // Determine the text size class based on size
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

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}

      <Select
        value={value || ""}
        onValueChange={(newValue) => {
          // Handle unassign case
          if (newValue === "unassigned") {
            onChange(null);
            return;
          }
          onChange(newValue);
        }}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={`w-full ${heightClass} ${textSizeClass}`}>
          <SelectValue placeholder={placeholder}>
            {selectedUser ? (
              <div className="flex items-center gap-2">
                {showAvatar && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={
                        selectedUser.profileImage ||
                        selectedUser.photoURL ||
                        selectedUser.image
                      }
                      alt={selectedUser.name}
                    />
                    <AvatarFallback>
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span>{selectedUser.name}</span>
              </div>
            ) : (
              placeholder
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent align={align} side={side}>
          <SelectGroup>
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-2 text-sm text-red-500">
                Failed to load users
              </div>
            ) : (
              <>
                {allowUnassign && (
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <UserMinus className="h-4 w-4" />
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                )}
                {users.map((user) => (
                  <SelectItem key={user.uid} value={user.uid}>
                    <div className="flex items-center gap-2">
                      {showAvatar ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={
                              user.profileImage || user.photoURL || user.image
                            }
                            alt={user.name}
                          />
                          <AvatarFallback>
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
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
