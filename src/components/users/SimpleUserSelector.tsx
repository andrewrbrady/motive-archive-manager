/**
 * A simplified UserSelector that doesn't rely on complex UI components
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, ChevronDown, ChevronUp, UserMinus, Loader2 } from "lucide-react";
import { FirestoreUser } from "@/types/firebase";
import { getUsers } from "@/lib/users/cache";

interface SimpleUserSelectorProps {
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
  editorName?: string;
}

export default function SimpleUserSelector({
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
  editorName,
}: SimpleUserSelectorProps) {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, [creativeRole]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const fetchUsers = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the caching utility to fetch from Firestore
      const cachedUsers = await getUsers(creativeRole, forceRefresh);
      console.log(
        "SimpleUserSelector: Fetched users count:",
        cachedUsers.length
      );

      setUsers(cachedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = value ? users.find((user) => user.uid === value) : null;

  // When the selected user changes, call the callback with the user's name
  useEffect(() => {
    if (onUserInfoRetrieved) {
      onUserInfoRetrieved(selectedUser?.name || editorName || null);
    }
  }, [selectedUser, onUserInfoRetrieved, editorName]);

  // Handle toggle dropdown
  const toggleDropdown = () => {
    if (!isOpen && !isLoading) {
      // Force refresh users when opening
      fetchUsers(true);
    }
    setIsOpen(!isOpen && !disabled);
  };

  // Handle selecting a user
  const handleSelectUser = (userId: string | null) => {
    onChange(userId);
    setIsOpen(false);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-sm font-medium mb-1 block">{label}</label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled || isLoading}
        className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md border border-input bg-background h-10"
      >
        <div className="flex items-center gap-2 truncate">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : value && selectedUser ? (
            <>
              {showAvatar && (
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={selectedUser.profileImage || selectedUser.image || ""}
                    alt={selectedUser.name}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="truncate">{selectedUser.name}</span>
            </>
          ) : value && editorName ? (
            <>
              {showAvatar && (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(editorName)}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="truncate">{editorName}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 opacity-50" />
        ) : (
          <ChevronDown className="h-4 w-4 opacity-50" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background rounded-md border border-input shadow-md overflow-y-auto max-h-60">
          {error ? (
            <div className="px-2 py-1 text-xs text-destructive">{error}</div>
          ) : isLoading ? (
            <div className="flex items-center justify-center p-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Loading users...</span>
            </div>
          ) : (
            <div className="py-1">
              {/* Debug info */}
              <div className="px-2 py-1 text-xs font-semibold bg-muted">
                {users.length} users available
              </div>

              {/* Unassign option */}
              {allowUnassign && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSelectUser(null)}
                >
                  <UserMinus className="h-4 w-4" />
                  <span>Unassign</span>
                </button>
              )}

              {/* User options */}
              {users.length > 0 ? (
                users.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleSelectUser(user.uid)}
                  >
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
                    <span className="truncate">{user.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
