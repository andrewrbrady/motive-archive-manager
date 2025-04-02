"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EyeIcon, PencilIcon, UserIcon, ShieldIcon } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles?: string[];
  status?: string;
  profileImage?: string;
}

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
}

export default function UserTable({
  users,
  isLoading = false,
}: UserTableProps) {
  const router = useRouter();
  const [displayedUsers, setDisplayedUsers] = useState<User[]>(users || []);

  // Filter users by status
  const filterUsersByStatus = (status: string) => {
    if (status === "all") {
      setDisplayedUsers(users);
    } else {
      setDisplayedUsers(users.filter((user) => user.status === status));
    }
  };

  // Handle view user
  const handleViewUser = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  // Handle edit user
  const handleEditUser = (userId: string) => {
    router.push(`/admin/users/${userId}/edit`);
  };

  // Handle manage roles
  const handleManageRoles = (userId: string) => {
    router.push(`/admin/users/${userId}/roles`);
  };

  // Create initials from name
  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  // Get status badge color
  const getStatusBadgeVariant = (
    status?: string
  ): "success" | "secondary" | "destructive" | "outline" | "default" => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading users...</div>;
  }

  if (!displayedUsers || displayedUsers.length === 0) {
    return <div className="p-8 text-center">No users found</div>;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => filterUsersByStatus("all")}
          >
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => filterUsersByStatus("active")}
          >
            Active
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => filterUsersByStatus("suspended")}
          >
            Suspended
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          {displayedUsers.length} users
        </div>
      </div>

      <div className="border rounded-md">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-3 px-4 text-left font-medium">User</th>
              <th className="py-3 px-4 text-left font-medium">Email</th>
              <th className="py-3 px-4 text-left font-medium">Roles</th>
              <th className="py-3 px-4 text-left font-medium">Status</th>
              <th className="py-3 px-4 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b transition-colors hover:bg-muted/30"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      {user.profileImage ? (
                        <AvatarImage
                          src={user.profileImage}
                          alt={user.name || user.email}
                        />
                      ) : null}
                      <AvatarFallback>
                        {getInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {user.name || "No name"}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">{user.email}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className="capitalize"
                      >
                        {role}
                      </Badge>
                    ))}
                    {user.creativeRoles?.map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className="capitalize text-xs"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant={getStatusBadgeVariant(user.status)}
                    className="capitalize"
                  >
                    {user.status || "active"}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewUser(user.id)}
                      title="View user"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUser(user.id)}
                      title="Edit user"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleManageRoles(user.id)}
                      title="Manage roles"
                    >
                      <ShieldIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
