"use client";

import { useState, useEffect } from "react";
import { UserForm } from "./UserForm";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterContainer } from "@/components/ui/FilterContainer";
import { ListContainer } from "@/components/ui/ListContainer";
import { UserPlus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
  creativeRoles: string[];
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.roles.some((role) => role.toLowerCase().includes(query)) ||
        user.creativeRoles.some((role) => role.toLowerCase().includes(query))
    );

    setFilteredUsers(filtered);
  };

  const resetSearch = () => {
    setSearchQuery("");
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
      setFilteredUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <FilterContainer>
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onReset={resetSearch}
            placeholder="Search users..."
          />
        </div>
        <Button
          onClick={handleCreateUser}
          variant="outline"
          className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </FilterContainer>

      <ListContainer>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Creative Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  <LoadingSpinner text="Loading users..." size={20} />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  <span className="text-muted-foreground">No users found</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user._id}
                  className="border-b border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50"
                >
                  <TableCell className="font-medium">
                    <a
                      href={`/users/${user._id}`}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      {user.name}
                    </a>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.creativeRoles.length > 0 ? (
                        user.creativeRoles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
                          >
                            {role
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] hover:text-foreground"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user._id)}
                      className="hover:bg-destructive/90"
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ListContainer>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
          <DialogHeader className="border-b border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] pb-4">
            <DialogTitle className="text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
              {selectedUser ? "Edit User" : "Create New User"}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            user={selectedUser}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
