"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface User {
  _id?: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
  creativeRoles: string[];
}

interface UserFormProps {
  user: User | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const ROLES = ["admin", "editor", "viewer"];
const CREATIVE_ROLES = [
  "video_editor",
  "photographer",
  "content_writer",
  "social_media_manager",
  "cinematographer",
  "sound_engineer",
  "graphic_designer",
  "storyboard_artist",
  "detailer",
  "writer",
  "marketing",
  "mechanic",
];
const STATUS_OPTIONS = ["active", "inactive", "suspended"];

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<Partial<User>>(
    user || {
      name: "",
      email: "",
      roles: ["viewer"],
      status: "active",
      creativeRoles: [],
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = user?._id ? `/api/users/${user._id}` : "/api/users";
      const method = user?._id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save user");
      }

      toast({
        title: "Success",
        description: `User ${user?._id ? "updated" : "created"} successfully`,
      });
      onSubmit();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: [value], // Since we only allow one role at a time
    }));
  };

  const handleCreativeRoleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      creativeRoles: [...(prev.creativeRoles || []), value],
    }));
  };

  const removeCreativeRole = (roleToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      creativeRoles:
        prev.creativeRoles?.filter((role) => role !== roleToRemove) || [],
    }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      status: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
        >
          Name
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Name"
          className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          placeholder="Email"
          className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="roles"
          className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
        >
          Role
        </label>
        <Select value={formData.roles?.[0]} onValueChange={handleRoleChange}>
          <SelectTrigger className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
            {ROLES.map((role) => (
              <SelectItem
                key={role}
                value={role}
                className="!bg-[var(--background-primary)] dark:!bg-[var(--background-secondary)] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] hover:!bg-[hsl(var(--background))] dark:hover:!bg-[hsl(var(--background))]"
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="status"
          className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
        >
          Status
        </label>
        <Select
          defaultValue={formData.status}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
            {STATUS_OPTIONS.map((status) => (
              <SelectItem
                key={status}
                value={status}
                className="!bg-[var(--background-primary)] dark:!bg-[var(--background-secondary)] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] hover:!bg-[hsl(var(--background))] dark:hover:!bg-[hsl(var(--background))]"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="creativeRoles"
          className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
        >
          Creative Roles
        </label>
        <Select value="" onValueChange={handleCreativeRoleChange}>
          <SelectTrigger className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
            <SelectValue placeholder="Add creative role" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
            {CREATIVE_ROLES.map((role) => (
              <SelectItem
                key={role}
                value={role}
                className="!bg-[var(--background-primary)] dark:!bg-[var(--background-secondary)] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] hover:!bg-[hsl(var(--background))] dark:hover:!bg-[hsl(var(--background))]"
              >
                {role
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.creativeRoles && formData.creativeRoles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.creativeRoles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:bg-[hsl(var(--background))] dark:text-[hsl(var(--foreground))]"
              >
                {role
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
                <button
                  type="button"
                  className="ml-1 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-zinc-200"
                  onClick={() => removeCreativeRole(role)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] hover:bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-[hsl(var(--background))] hover:bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] text-white dark:text-[hsl(var(--foreground))]"
        >
          {user?._id ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
