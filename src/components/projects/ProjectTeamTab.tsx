"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Users, MoreHorizontal, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Project } from "@/types/project";
import { toast } from "@/components/ui/use-toast";

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface MemberDetails {
  name: string;
  email: string;
  image?: string;
}

interface ProjectTeamTabProps {
  project: Project;
  memberDetails: Record<string, MemberDetails>;
  onProjectUpdate: () => void;
}

export function ProjectTeamTab({
  project,
  memberDetails,
  onProjectUpdate,
}: ProjectTeamTabProps) {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    userId: "",
    role: "viewer" as string,
  });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/projects/users", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();

      if (!data.users || !Array.isArray(data.users)) {
        throw new Error("Invalid response format");
      }

      // Filter out users who are already project members
      const currentMemberIds = project.members.map((m) => m.userId);
      const filteredUsers = data.users.filter(
        (user: any) => !currentMemberIds.includes(user.uid)
      );

      // Convert to our expected format
      const convertedUsers = filteredUsers.map((user: any) => ({
        _id: user.uid,
        name: user.name || user.email,
        email: user.email,
        image: user.image,
      }));

      setAvailableUsers(convertedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.userId.trim()) return;

    try {
      setIsAddingMember(true);
      const response = await fetch(`/api/projects/${project._id}/team`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: memberForm.userId,
          role: memberForm.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add team member");
      }

      // Refresh project data
      await onProjectUpdate();

      // Reset form and close modal
      setMemberForm({
        userId: "",
        role: "viewer",
      });
      setIsAddMemberOpen(false);
      setIsOpen(false);

      toast({
        title: "Success",
        description: "Team member added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add team member",
        variant: "destructive",
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${project._id}/team?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove team member");
      }

      // Refresh project data
      await onProjectUpdate();

      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to remove team member",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/projects/${project._id}/team`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update member role");
      }

      // Refresh project data
      await onProjectUpdate();

      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update member role",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "photographer":
        return "bg-green-100 text-green-800";
      case "editor":
        return "bg-yellow-100 text-yellow-800";
      case "writer":
        return "bg-orange-100 text-orange-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Team Members</CardTitle>
          <Dialog
            open={isAddMemberOpen}
            onOpenChange={(open) => {
              setIsAddMemberOpen(open);
              if (open) {
                fetchAvailableUsers();
              } else {
                setIsOpen(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add an existing user to this project team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="userId">User</Label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isOpen && !loadingUsers) {
                          fetchAvailableUsers();
                        }
                        setIsOpen(!isOpen);
                      }}
                      disabled={loadingUsers}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md border border-input bg-background h-10 hover:bg-accent"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {loadingUsers ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>Loading users...</span>
                          </>
                        ) : memberForm.userId &&
                          availableUsers.find(
                            (u) => u._id === memberForm.userId
                          ) ? (
                          <>
                            <Avatar className="h-5 w-5">
                              <AvatarImage
                                src={
                                  availableUsers.find(
                                    (u) => u._id === memberForm.userId
                                  )?.image
                                }
                                alt={
                                  availableUsers.find(
                                    (u) => u._id === memberForm.userId
                                  )?.name
                                }
                              />
                              <AvatarFallback className="text-[10px]">
                                {availableUsers
                                  .find((u) => u._id === memberForm.userId)
                                  ?.name?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .substring(0, 2) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                              {
                                availableUsers.find(
                                  (u) => u._id === memberForm.userId
                                )?.name
                              }
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            {availableUsers.length === 0 && !loadingUsers
                              ? "No available users"
                              : "Select a user"}
                          </span>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {/* Custom Dropdown */}
                    {isOpen && !loadingUsers && (
                      <div className="absolute z-50 w-full mt-1 bg-background rounded-md border border-input shadow-md overflow-y-auto max-h-60">
                        <div className="py-1">
                          {availableUsers.length === 0 ? (
                            <div className="px-2 py-1 text-xs text-muted-foreground">
                              No available users
                            </div>
                          ) : (
                            availableUsers.map((user) => (
                              <button
                                key={user._id}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  setMemberForm({
                                    ...memberForm,
                                    userId: user._id,
                                  });
                                  setIsOpen(false);
                                }}
                              >
                                <Avatar className="h-5 w-5">
                                  <AvatarImage
                                    src={user.image}
                                    alt={user.name}
                                  />
                                  <AvatarFallback className="text-[10px]">
                                    {user.name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .substring(0, 2) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                  <span className="truncate">{user.name}</span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <CustomDropdown
                    value={memberForm.role}
                    onChange={(value) =>
                      setMemberForm({
                        ...memberForm,
                        role: value,
                      })
                    }
                    options={[
                      { value: "viewer", label: "Viewer" },
                      { value: "writer", label: "Writer" },
                      { value: "editor", label: "Editor" },
                      { value: "photographer", label: "Photographer" },
                      { value: "manager", label: "Manager" },
                      { value: "owner", label: "Owner" },
                    ]}
                    placeholder="Select role"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMemberForm({ userId: "", role: "viewer" });
                    setIsAddMemberOpen(false);
                    setIsOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={isAddingMember || !memberForm.userId.trim()}
                >
                  {isAddingMember ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {project.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage
                    src={memberDetails[member.userId]?.image}
                    alt={
                      memberDetails[member.userId]?.name ||
                      `User ${member.userId}`
                    }
                  />
                  <AvatarFallback>
                    {memberDetails[member.userId]?.name
                      ? memberDetails[member.userId].name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .substring(0, 2)
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {memberDetails[member.userId]?.name ||
                      `User ${member.userId}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {memberDetails[member.userId]?.email ||
                      `Joined ${format(new Date(member.joinedAt), "MMM d, yyyy")}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRoleColor(member.role)}>
                  {member.role}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        handleUpdateMemberRole(member.userId, "viewer")
                      }
                      disabled={member.role === "viewer"}
                    >
                      Set as Viewer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleUpdateMemberRole(member.userId, "writer")
                      }
                      disabled={member.role === "writer"}
                    >
                      Set as Writer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleUpdateMemberRole(member.userId, "editor")
                      }
                      disabled={member.role === "editor"}
                    >
                      Set as Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleUpdateMemberRole(member.userId, "photographer")
                      }
                      disabled={member.role === "photographer"}
                    >
                      Set as Photographer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleUpdateMemberRole(member.userId, "manager")
                      }
                      disabled={member.role === "manager"}
                    >
                      Set as Manager
                    </DropdownMenuItem>
                    {member.role !== "owner" && (
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-red-600"
                      >
                        Remove from Project
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {project.members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No team members yet</p>
              <p className="text-sm">
                Add team members to collaborate on this project
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
