import { Metadata } from "next";
import UserManagement from "@/components/users/UserManagement";
import Navbar from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "User Management",
  description: "Manage users and their roles",
};

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <UserManagement />
      </div>
    </div>
  );
}
