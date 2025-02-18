import { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DeliverablesList from "@/components/deliverables/DeliverablesList";
import DeliverablesCalendar from "@/components/deliverables/DeliverablesCalendar";
import NewDeliverableDialog from "@/components/deliverables/NewDeliverableDialog";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Deliverables | Motive Archive",
  description: "View and manage all deliverables across all cars",
};

export default async function DeliverablePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto py-8 space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Deliverables</h1>
            <NewDeliverableDialog>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Deliverable
              </Button>
            </NewDeliverableDialog>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="mt-6">
              <DeliverablesList />
            </TabsContent>
            <TabsContent value="calendar" className="mt-6">
              <DeliverablesCalendar />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
}
