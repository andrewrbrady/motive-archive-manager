import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LoadingSpinner } from "@/components/ui/loading";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";

interface UserRolesProps {
  userId: string;
  initialRoles: string[];
  initialCreativeRoles: string[];
  initialStatus: string;
  onUpdate?: () => void;
}

// Define available roles and creative roles
const AVAILABLE_ROLES = ["user", "admin", "editor", "viewer"];
const AVAILABLE_CREATIVE_ROLES = [
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
const USER_STATUSES = ["active", "inactive", "suspended"];

export default function UserRolesManagement({
  userId,
  initialRoles,
  initialCreativeRoles,
  initialStatus,
  onUpdate,
}: UserRolesProps) {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<string[]>(initialRoles || ["user"]);
  const [creativeRoles, setCreativeRoles] = useState<string[]>(
    initialCreativeRoles || []
  );
  const [status, setStatus] = useState<string>(initialStatus || "active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user has admin privileges
  const isAdmin = session?.user?.roles?.includes("admin");
  // Check if user is trying to modify their own roles
  const isSelfModification = session?.user?.id === userId;

  // Prevent non-admin users from accessing this component
  if (!isAdmin) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        You do not have permission to manage user roles.
      </div>
    );
  }

  // Prevent users from modifying their own roles
  if (isSelfModification) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-600 rounded-md">
        For security reasons, you cannot modify your own roles. Please ask
        another administrator to make any necessary changes.
      </div>
    );
  }

  // Handle role checkbox changes
  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setRoles([...roles, role]);
    } else {
      // Prevent removing the last role or the "user" role if it's the only one
      if (roles.length === 1 && roles[0] === "user") {
        toast.error("User must have at least one role");
        return;
      }
      setRoles(roles.filter((r) => r !== role));
    }
  };

  // Handle creative role changes
  const handleCreativeRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setCreativeRoles([...creativeRoles, role]);
    } else {
      setCreativeRoles(creativeRoles.filter((r) => r !== role));
    }
  };

  // Save user roles
  const handleSave = async () => {
    setIsSubmitting(true);

    try {
      // Ensure user always has at least "user" role
      const rolesList = roles.length > 0 ? roles : ["user"];

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          updateType: "roles",
          roles: rolesList,
          creativeRoles,
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `Failed to update roles: ${response.statusText}`
        );
      }

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

      toast.success("User roles updated successfully");

      // Call the onUpdate callback if provided
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating user roles:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update user roles"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {AVAILABLE_ROLES.map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role}`}
                  checked={roles.includes(role)}
                  onCheckedChange={(checked) =>
                    handleRoleChange(role, checked as boolean)
                  }
                />
                <Label htmlFor={`role-${role}`} className="capitalize">
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
          <div className="grid grid-cols-2 gap-4">
            {AVAILABLE_CREATIVE_ROLES.map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={`creative-role-${role}`}
                  checked={creativeRoles.includes(role)}
                  onCheckedChange={(checked) =>
                    handleCreativeRoleChange(role, checked as boolean)
                  }
                />
                <Label htmlFor={`creative-role-${role}`} className="capitalize">
                  {role.split("_").join(" ")}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={status}
            onValueChange={setStatus}
            className="space-y-2"
          >
            {USER_STATUSES.map((statusOption) => (
              <div key={statusOption} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={statusOption}
                  id={`status-${statusOption}`}
                />
                <Label
                  htmlFor={`status-${statusOption}`}
                  className="capitalize"
                >
                  {statusOption}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
