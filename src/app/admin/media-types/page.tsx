import { Metadata } from "next";
import Navbar from "@/components/layout/navbar";
import { PageTitle } from "@/components/ui/PageTitle";
import { AdminGuard } from "@/components/auth/AuthGuard";
import MediaTypesContent from "./MediaTypesContent";

export const metadata: Metadata = {
  title: "Media Types Admin | Motive Archive",
  description: "Manage media types for deliverables",
};

export default function MediaTypesAdminPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <PageTitle title="Media Types Management" />
            <MediaTypesContent />
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
