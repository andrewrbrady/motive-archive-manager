import { Metadata } from "next";
import AdminTabs from "./AdminTabs";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Admin Dashboard | Motive Archive",
  description: "Administration dashboard for Motive Archive system",
};

export default function AdminPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <PageTitle title="Admin Dashboard" />
            <AdminTabs />
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
