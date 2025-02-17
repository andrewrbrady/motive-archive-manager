import { Metadata } from "next";
import UserManagement from "@/components/users/UserManagement";

export const metadata: Metadata = {
  title: "User Management",
  description: "Manage users and their roles",
};

export default function UsersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-gray-600 mt-2">
          Create, view, edit, and manage user accounts and their permissions
        </p>
      </div>
      <UserManagement />
    </div>
  );
}
