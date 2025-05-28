import { Metadata } from "next";
import { Suspense } from "react";
// import Navbar from "@/components/layout/navbar";
// import Footer from "@/components/layout/footer";
import DeliverablesTabs from "@/components/deliverables/DeliverablesTabs";
import { AuthGuard } from "@/components/auth/AuthGuard";
// import { DeliverablesTable } from "@/components/deliverables/DeliverablesTable";

export const metadata: Metadata = {
  title: "Deliverables | Motive Archive",
  description: "View and manage all deliverables across all cars",
};

function DeliverablesContent() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <h1 className="text-3xl font-bold">Deliverables</h1>
        <DeliverablesTabs />
      </div>
    </main>
  );
}

export default function DeliverablePage() {
  return (
    <AuthGuard>
      {/* <Navbar /> */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            Loading...
          </div>
        }
      >
        <DeliverablesContent />
      </Suspense>
      {/* <Footer /> */}
    </AuthGuard>
  );
}
