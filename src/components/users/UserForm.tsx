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
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          Name
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Name"
          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
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
          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="roles"
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          Role
        </label>
        <Select value={formData.roles?.[0]} onValueChange={handleRoleChange}>
          <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            {ROLES.map((role) => (
              <SelectItem
                key={role}
                value={role}
                className="!bg-white dark:!bg-[var(--background-secondary)] text-gray-900 dark:text-gray-100 hover:!bg-gray-50 dark:hover:!bg-gray-800"
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
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          Status
        </label>
        <Select
          defaultValue={formData.status}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            {STATUS_OPTIONS.map((status) => (
              <SelectItem
                key={status}
                value={status}
                className="!bg-white dark:!bg-[var(--background-secondary)] text-gray-900 dark:text-gray-100 hover:!bg-gray-50 dark:hover:!bg-gray-800"
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
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          Creative Roles
        </label>
        <Select value="" onValueChange={handleCreativeRoleChange}>
          <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <SelectValue placeholder="Add creative role" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            {CREATIVE_ROLES.map((role) => (
              <SelectItem
                key={role}
                value={role}
                className="!bg-white dark:!bg-[var(--background-secondary)] text-gray-900 dark:text-gray-100 hover:!bg-gray-50 dark:hover:!bg-gray-800"
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
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              >
                {role
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
                <button
                  type="button"
                  className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
          className="border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900"
        >
          {user?._id ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
