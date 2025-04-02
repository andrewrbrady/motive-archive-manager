import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserForm } from "./UserForm";
import UserRolesManagement from "./UserRolesManagement";
import { LoadingSpinner } from "@/components/ui/loading";
import { User } from "./UserManagement";

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: (user: User) => void;
}

export default function UserDetailModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}: UserDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (isOpen) {
      // Reset active tab when dialog opens
      setActiveTab("profile");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Create New User"}</DialogTitle>
        </DialogHeader>

        {user ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile Info</TabsTrigger>
              <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-4">
              <UserForm
                user={user}
                onSubmit={onUserUpdated}
                onCancel={onClose}
              />
            </TabsContent>
            <TabsContent value="roles" className="mt-4">
              <UserRolesManagement
                userId={user.uid}
                initialRoles={user.roles || []}
                initialCreativeRoles={user.creativeRoles || []}
                initialStatus={user.status || "active"}
                onUpdate={() => {
                  // For role updates, pass the existing user back
                  // The parent component should refresh user data
                  onUserUpdated(user);
                }}
              />
            </TabsContent>
          </Tabs>
        ) : (
          // For creating a new user, only show the form
          <UserForm user={null} onSubmit={onUserUpdated} onCancel={onClose} />
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <LoadingSpinner />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
