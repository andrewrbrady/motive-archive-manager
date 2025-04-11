/**
 * A direct user selector that fetches from the API instead of Firestore
 */
"use client";

import { useEffect, useState, useMemo, useRef, memo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading";

interface DirectUserSelectorProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  showAvatar?: boolean;
  editorName?: string;
  className?: string;
}

function DirectUserSelector({
  value,
  onChange,
  showAvatar = false,
  editorName,
  className,
}: DirectUserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Store internal state for selected user
  const [selectedUserId, setSelectedUserId] = useState<string | null>(value);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(
    editorName || null
  );

  // Flag to prevent multiple fetch calls
  const hasFetchedRef = useRef(false);

  // Log state changes for debugging
  useEffect(() => {
    console.log("DirectUserSelector state:", {
      externalValue: value,
      internalValue: selectedUserId,
      externalName: editorName,
      internalName: selectedUserName,
    });
  }, [value, selectedUserId, editorName, selectedUserName]);

  // Update internal state when external props change
  useEffect(() => {
    if (value !== selectedUserId) {
      setSelectedUserId(value);

      // If value is null, set name to "Unassigned"
      if (value === null) {
        setSelectedUserName("Unassigned");
      }
      // Otherwise, if we have editor name from props, use it
      else if (editorName && value) {
        setSelectedUserName(editorName);
      }
      // If we have users loaded, try to find the name
      else if (value && users.length > 0) {
        const user = users.find((u) => u.uid === value);
        if (user) {
          setSelectedUserName(user.name);
        }
      }
    }
  }, [value, editorName, users]);

  // Fetch users from API
  const fetchUsers = async () => {
    if (loading || (users.length > 0 && hasFetchedRef.current)) return;

    try {
      setLoading(true);
      hasFetchedRef.current = true;

      const response = await fetch("/api/users");
      if (!response.ok)
        throw new Error(`Failed to fetch users: ${response.status}`);

      const data = await response.json();
      console.log(`Fetched ${data.length} users`);

      // Filter out OAuth IDs (long numeric strings)
      const filteredUsers = data
        .filter((user: any) => user.uid && !/^\d{21,}$/.test(user.uid))
        .map((user: any) => ({
          uid: user.uid,
          name: user.name || "Unknown User",
          email: user.email || "",
          profileImage: user.profileImage || user.image || "",
          image: user.profileImage || user.image || "",
        }));

      // Sort alphabetically
      filteredUsers.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setUsers(filteredUsers);

      // Update selected user name if we have a value but no name
      if (
        selectedUserId &&
        (!selectedUserName || selectedUserName === "Unassigned")
      ) {
        const matchingUser = filteredUsers.find(
          (u: any) => u.uid === selectedUserId
        );
        if (matchingUser) {
          setSelectedUserName(matchingUser.name);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;

    const searchTerm = search.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
  }, [users, search]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Handle user selection
  const handleSelectUser = (userId: string, userName: string) => {
    // Skip if already selected
    if (userId === selectedUserId) {
      setOpen(false);
      return;
    }

    console.log(`Selecting user: ${userName} (${userId})`);

    // Update internal state
    setSelectedUserId(userId);
    setSelectedUserName(userName);

    // Close dropdown
    setOpen(false);

    // Notify parent
    onChange(userId);
  };

  // Handle unassign
  const handleClearSelection = () => {
    console.log("Clearing selection");

    // Update internal state
    setSelectedUserId(null);
    setSelectedUserName("Unassigned");

    // Close dropdown
    setOpen(false);

    // Notify parent
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className} transition-all duration-200`}
        >
          {loading && users.length === 0 ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner className="h-3 w-3" />
              <span>Loading...</span>
            </div>
          ) : selectedUserId ? (
            <div className="flex items-center gap-2">
              {showAvatar && (
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={
                      users.find((u) => u.uid === selectedUserId)
                        ?.profileImage || ""
                    }
                    alt={selectedUserName || ""}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(selectedUserName || "")}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="truncate">{selectedUserName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Unassigned</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[220px] bg-background border shadow-md"
        align="start"
      >
        <div className="flex flex-col">
          <div className="p-2 bg-background">
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="border-t max-h-[300px] overflow-y-auto bg-background">
            <button
              className="w-full flex items-center gap-2 p-2 hover:bg-accent transition-colors bg-background"
              onClick={handleClearSelection}
            >
              <div className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                <UserMinus className="h-4 w-4" />
              </div>
              <span>Unassigned</span>
              {selectedUserId === null && <Check className="ml-auto h-4 w-4" />}
            </button>
            {filteredUsers.map((user) => (
              <button
                key={user.uid}
                className={cn(
                  "w-full flex items-center gap-2 p-2 hover:bg-accent transition-colors",
                  user.uid === selectedUserId ? "bg-accent" : "bg-background"
                )}
                onClick={() => handleSelectUser(user.uid, user.name)}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={user.profileImage || user.image || ""}
                    alt={user.name}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user.name}</span>
                {user.uid === selectedUserId && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center p-2 text-muted-foreground text-sm bg-background">
                No users found
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Export the component wrapped in memo to prevent unnecessary re-renders
export default memo(DirectUserSelector);

// UserMinus icon component
function UserMinus({ className = "h-6 w-6" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
