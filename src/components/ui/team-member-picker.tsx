"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsUpDown, Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAPI } from "@/hooks/useAPI";

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
  firebaseUid?: string;
  image?: string;
}

interface TeamMemberPickerProps {
  selectedMemberIds: string[];
  onSelectionChange: (memberIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TeamMemberPicker({
  selectedMemberIds,
  onSelectionChange,
  placeholder = "Select team members",
  className,
}: TeamMemberPickerProps) {
  const api = useAPI();
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!api) return;

      try {
        const data = (await api.get("users")) as any;

        // Handle different response formats from the users API
        const usersArray = Array.isArray(data) ? data : data.users || [];
        setUsers(usersArray.filter((user: User) => user.status === "active"));
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [api]);

  const handleMemberToggle = (userId: string) => {
    const userUid = users.find((u) => u._id === userId)?.firebaseUid || userId;

    if (selectedMemberIds.includes(userUid)) {
      onSelectionChange(selectedMemberIds.filter((id) => id !== userUid));
    } else {
      onSelectionChange([...selectedMemberIds, userUid]);
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== "string") {
      return "??";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (usersLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-10 border rounded-md">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No team members available</p>
        <p className="text-sm">No active users found in the system</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between hover:bg-transparent hover:border-white"
          >
            {selectedMemberIds.length > 0
              ? `${selectedMemberIds.length} selected`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          align="start"
          side="bottom"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={16}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="max-h-[200px] overflow-y-auto">
            <div className="p-3 space-y-2">
              {users.map((user) => {
                const userUid = user.firebaseUid || user._id;
                const isSelected = selectedMemberIds.includes(userUid);

                return (
                  <button
                    key={user._id}
                    onClick={() => handleMemberToggle(user._id)}
                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-all text-left w-full ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/30 hover:!border-white hover:shadow-md"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image} alt={user.name || "User"} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name || "")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">
                        {user.name || "Unknown User"} •{" "}
                        {user.email || "No email"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
