"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdminGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LoadingSpinner } from "@/components/ui/loading";
import { toast } from "sonner";

interface UserRolesData {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

export default function UserRolesPage() {
  const params = useParams();
  const id = params?.id?.toString();

  if (!id) {
    return null;
  }

  return (
    <AdminGuard>
      <UserRolesContent userId={id} />
    </AdminGuard>
  );
}

function UserRolesContent({ userId }: { userId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<UserRolesData | null>(null);
  const [formData, setFormData] = useState<{
    roles: string[];
    creativeRoles: string[];
    status: string;
  } | null>(null);

  // Available roles and creative roles
  const availableRoles = ["user", "editor", "admin"];
  const availableCreativeRoles = [
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
    "developer",
  ];
  const availableStatuses = ["active", "inactive", "suspended"];

  // Load user data
  useEffect(() => {
    async function fetchUserRoles() {
      try {
        setIsLoading(true);
        setIsError(false);
        // Fetch directly from the main user API endpoint
        const response = await fetch(`/api/users/${userId}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("User not found");
            router.push("/admin?tab=users");
            return;
          }

          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          toast.error(
            errorData.error || `Failed to fetch user: ${response.statusText}`
          );
          setIsError(true);
          return;
        }

        const data = await response.json();
        setUserData({
          uid: data.uid,
          email: data.email,
          displayName: data.name,
          disabled: data.status !== "active",
          roles: data.roles || ["user"],
          creativeRoles: data.creativeRoles || [],
          status: data.status || "active",
        });
        setFormData({
          roles: data.roles || ["user"],
          creativeRoles: data.creativeRoles || [],
          status: data.status || "active",
        });
      } catch (error) {
        console.error("Error fetching user roles:", error);
        toast.error("Failed to load user roles. Please try again later.");
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserRoles();
  }, [userId, router]);

  // Handle role selection
  const handleRoleChange = (role: string, checked: boolean) => {
    if (!formData) return;

    if (checked) {
      // Add role, ensuring at least "user" role remains
      setFormData({
        ...formData,
        roles: [...formData.roles, role],
      });
    } else {
      // Prevent removing the last role or the "user" role if it's the only one
      if (formData.roles.length === 1 && formData.roles[0] === "user") {
        toast.error("User must have at least one role");
        return;
      }

      setFormData({
        ...formData,
        roles: formData.roles.filter((r) => r !== role),
      });
    }
  };

  // Handle creative role selection
  const handleCreativeRoleChange = (role: string, checked: boolean) => {
    if (!formData) return;

    if (checked) {
      setFormData({
        ...formData,
        creativeRoles: [...formData.creativeRoles, role],
      });
    } else {
      setFormData({
        ...formData,
        creativeRoles: formData.creativeRoles.filter((r) => r !== role),
      });
    }
  };

  // Handle status change
  const handleStatusChange = (status: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      status,
    });
  };

  // Save changes
  const handleSave = async () => {
    if (!formData || !userData) return;

    try {
      setIsSaving(true);

      // Use the main user API endpoint with updateType: "roles"
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updateType: "roles",
          roles: formData.roles,
          creativeRoles: formData.creativeRoles,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error ||
            `Failed to update user roles: ${response.statusText}`
        );
      }

      const result = await response.json();
      toast.success("User roles updated successfully");

      // Refresh user data
      setUserData({
        ...userData,
        roles: result.user.roles,
        creativeRoles: result.user.creativeRoles,
        status: result.user.status,
      });

      // Attempt to refresh the session to sync the role changes
      try {
        await fetch("/api/auth/refresh-session");
      } catch (refreshError) {
        console.error(
          "Error refreshing session after role update:",
          refreshError
        );
        // Don't fail the update if this fails
      }
    } catch (error) {
      console.error("Error updating user roles:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update user roles"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading user data</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/admin?tab=users")}
        >
          Back to Users
        </Button>
      </div>
    );
  }

  if (!userData || !formData) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">User not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/admin?tab=users")}
        >
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manage User Roles</h1>
          <p className="text-gray-500">
            {userData.displayName || userData.email}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/admin?tab=users")}
        >
          Back to Users
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableRoles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={formData.roles.includes(role)}
                    onCheckedChange={(checked) =>
                      handleRoleChange(role, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`role-${role}`}
                    className="capitalize font-medium"
                  >
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Creative Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableCreativeRoles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`creative-${role}`}
                    checked={formData.creativeRoles.includes(role)}
                    onCheckedChange={(checked) =>
                      handleCreativeRoleChange(role, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`creative-${role}`}
                    className="capitalize font-medium"
                  >
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.status}
              onValueChange={handleStatusChange}
              className="space-y-4"
            >
              {availableStatuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <RadioGroupItem value={status} id={`status-${status}`} />
                  <Label
                    htmlFor={`status-${status}`}
                    className="capitalize font-medium"
                  >
                    {status}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <LoadingSpinner size="sm" /> : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
