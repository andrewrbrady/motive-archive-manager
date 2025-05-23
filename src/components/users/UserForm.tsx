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
import { User } from "./UserManagement";

interface UserFormProps {
  user: User | null;
  onSubmit: (user: User) => void;
  onCancel: () => void;
}

const ROLES = ["user", "admin", "editor", "viewer"];
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
  "director",
  "producer",
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Extract the fields we want to update
      const userData = {
        name: formData.name,
        email: formData.email,
        roles: formData.roles || ["viewer"],
        creativeRoles: formData.creativeRoles || [],
        status: formData.status || "active",
        updateType: "roles",
      };

      if (process.env.NODE_ENV !== "production") {
        console.log("Submitting user data:", {
          isEdit: !!user,
          hasUserId: !!user?.uid,
          hasName: !!userData.name,
          hasEmail: !!userData.email,
          rolesCount: userData.roles?.length || 0,
          creativeRolesCount: userData.creativeRoles?.length || 0,
          status: userData.status,
        });
      }

      // Determine if we're updating an existing user or creating a new one
      const userId = user?.uid;
      const url = userId
        ? `/api/users/${userId}` // Use UID for existing user
        : `/api/users/index`; // POST to index endpoint for new user invitation

      const response = await fetch(url, {
        method: userId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("API error:", errorData?.error || "Unknown error");
        throw new Error(errorData?.error || "Failed to save user");
      }

      const responseData = await response.json();
      if (process.env.NODE_ENV !== "production") {
        console.log("API response:", {
          success: !!responseData,
          hasUid: !!responseData.uid,
          hasId: !!responseData._id,
        });
      }

      // If we're editing a user with roles or creativeRoles changes,
      // immediately refresh the session to synchronize the claims
      if (
        userId &&
        (JSON.stringify(user?.roles || []) !== JSON.stringify(userData.roles) ||
          JSON.stringify(user?.creativeRoles || []) !==
            JSON.stringify(userData.creativeRoles))
      ) {
        try {
          console.log("Refreshing session due to role changes");
          await fetch("/api/auth/refresh-session");
        } catch (refreshError) {
          console.error("Error refreshing session:", refreshError);
          // Don't fail the update if this fails
        }
      }

      toast({
        title: "Success",
        description: userId
          ? "User updated successfully"
          : "User created successfully",
      });

      if (onSubmit) {
        // Pass the updated user data back to the parent
        onSubmit({
          ...userData,
          uid: responseData.uid || userId,
          _id: responseData._id,
          createdAt: responseData.createdAt
            ? new Date(responseData.createdAt)
            : new Date(),
          updatedAt: responseData.updatedAt
            ? new Date(responseData.updatedAt)
            : new Date(),
        } as User);
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => {
      // Always include the "user" role
      let newRoles = prev.roles || ["user"];

      if (value === "user") {
        // If selecting "user", keep only user role
        newRoles = ["user"];
      } else if (newRoles.includes(value)) {
        // If role already exists, remove it (except "user")
        newRoles = newRoles.filter((r) => r === "user" || r !== value);
      } else {
        // Add the new role while keeping existing roles
        newRoles = [...newRoles, value];
      }

      return {
        ...prev,
        roles: newRoles,
      };
    });
  };

  const handleCreativeRoleChange = (value: string) => {
    // Skip if the role is already selected
    if (formData.creativeRoles?.includes(value)) return;

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] mb-1"
          >
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--background))] dark:focus:ring-[hsl(var(--background))] focus:border-transparent"
            placeholder="Full Name"
            required
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] mb-1"
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--background))] dark:focus:ring-[hsl(var(--background))] focus:border-transparent"
            placeholder="user@company.com"
            required
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="roles"
          className="block text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] mb-1"
        >
          Access Level *
        </label>
        <select
          id="roles"
          name="roles"
          value={formData.roles?.includes("admin") ? "admin" : "user"}
          onChange={(e) => {
            const selectedRole = e.target.value;
            setFormData({
              ...formData,
              roles: selectedRole === "admin" ? ["admin", "user"] : ["user"],
            });
          }}
          className="w-full px-3 py-2 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--background))] dark:focus:ring-[hsl(var(--background))] focus:border-transparent"
          required
        >
          <option value="user">User - Standard Access</option>
          <option value="admin">Admin - Full Access</option>
        </select>
        <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
          {formData.roles?.includes("admin")
            ? "Admin users can manage the system and other users"
            : "Standard users can view and manage content"}
        </p>
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
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.creativeRoles?.map((role) => (
            <div
              key={role}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-[hsl(var(--background))] text-sm"
            >
              <span>
                {role
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </span>
              <button
                type="button"
                onClick={() => removeCreativeRole(role)}
                className="text-[hsl(var(--foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
              >
                &times;
              </button>
            </div>
          ))}
          {formData.creativeRoles?.length === 0 && (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              No creative roles assigned
            </div>
          )}
        </div>
        <Select onValueChange={handleCreativeRoleChange}>
          <SelectTrigger className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
            <SelectValue placeholder="Add creative role" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--background-primary)] dark:bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
            {CREATIVE_ROLES.filter(
              (role) => !formData.creativeRoles?.includes(role)
            ).map((role) => (
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
          disabled={isSubmitting}
          className="bg-[hsl(var(--background))] hover:bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] text-white dark:text-[hsl(var(--foreground))]"
        >
          {isSubmitting
            ? "Processing..."
            : user
              ? "Update User"
              : "Send Invitation"}
        </Button>
      </div>

      {!user && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> This will create an invitation for the user.
            They will need to sign in with their Google account to access the
            system. If they don't have access yet, they'll be automatically
            added when they first sign in with Google.
          </p>
        </div>
      )}
    </form>
  );
}
