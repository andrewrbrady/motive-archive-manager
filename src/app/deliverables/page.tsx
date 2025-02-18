import { Metadata } from "next";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import DeliverablesTabs from "@/components/deliverables/DeliverablesTabs";

export const metadata: Metadata = {
  title: "Deliverables | Motive Archive",
  description: "View and manage all deliverables across all cars",
};

export default function DeliverablePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto py-8 space-y-8">
          <h1 className="text-3xl font-bold">Deliverables</h1>
          <DeliverablesTabs />
        </div>
      </main>
      <Footer />
    </>
  );
}
