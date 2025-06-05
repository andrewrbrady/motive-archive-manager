import { AuthGuard } from "@/components/auth/AuthGuard";
import Navbar from "@/components/layout/navbar";
import DashboardPageClient from "./DashboardPageClient";

// Make this page dynamic to avoid build-time issues
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <DashboardContent />
    </>
  );
}

function DashboardContent() {
  return (
    <AuthGuard>
      <DashboardPageClient />
    </AuthGuard>
  );
}
