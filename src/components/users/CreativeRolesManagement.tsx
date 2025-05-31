"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, Edit, Trash, Users } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";

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

interface CreativeRoleStats {
  role: string;
  count: number;
}

// TypeScript interfaces for API responses
interface RoleStatsResponse {
  creativeRoles: CreativeRoleStats[];
}

export default function CreativeRolesManagement() {
  const api = useAPI();
  const [isLoading, setIsLoading] = useState(true);
  const [roleStats, setRoleStats] = useState<CreativeRoleStats[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  useEffect(() => {
    if (api) {
      fetchRoleStats();
    }
  }, [api]);

  const fetchRoleStats = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const data = (await api.get("users/role-stats")) as RoleStatsResponse;
      setRoleStats(data.creativeRoles || []);
    } catch (error) {
      console.error("Error fetching role stats:", error);
      toast({
        title: "Error",
        description: "Failed to fetch role statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = () => {
    setNewRoleName("");
    setIsDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Error",
        description: "Role name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!api) {
      toast({
        title: "Error",
        description: "Authentication not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Convert to snake_case
    const formattedRole = newRoleName.toLowerCase().trim().replace(/\s+/g, "_");

    try {
      await api.post("users/creative-roles", { role: formattedRole });
      toast({
        title: "Success",
        description: "Creative role added successfully",
      });
      setIsDialogOpen(false);
      fetchRoleStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add creative role",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Creative Roles</CardTitle>
            <CardDescription>Manage creative roles for users</CardDescription>
          </div>
          <Button variant="outline" onClick={handleAddRole}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-6">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CREATIVE_ROLES.map((role) => {
              const stats = roleStats.find((r) => r.role === role) || {
                role,
                count: 0,
              };
              return (
                <Card key={role} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-muted-foreground mr-2" />
                        <div>
                          <p className="font-medium">
                            {role
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {stats.count} {stats.count === 1 ? "user" : "users"}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`/admin?tab=users&filter=creative_role:${role}`}
                          >
                            <Users className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Creative Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g. Video Editor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Will be converted to snake_case (video_editor)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
