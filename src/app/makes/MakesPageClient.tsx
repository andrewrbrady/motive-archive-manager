"use client";

import React, { useState } from "react";
import { Make } from "@/lib/fetchMakes";
import { DataTable } from "@/components/ui/data-table";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NewMakeDialog from "@/components/makes/NewMakeDialog";

interface MakesPageClientProps {
  makes: Make[];
}

export default function MakesPageClient({
  makes: initialMakes,
}: MakesPageClientProps) {
  const [makes, setMakes] = useState(initialMakes);
  const [isNewMakeDialogOpen, setIsNewMakeDialogOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async (makeId: string) => {
    if (!confirm("Are you sure you want to delete this make?")) return;

    try {
      const response = await fetch(`/api/makes?id=${makeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete make");
      }

      setMakes(makes.filter((make) => make._id !== makeId));
      toast.success("Make deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting make:", error);
      toast.error("Failed to delete make");
    }
  };

  const handleCreate = async (newMake: Partial<Make>) => {
    try {
      const response = await fetch("/api/makes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newMake),
      });

      if (!response.ok) {
        throw new Error("Failed to create make");
      }

      const createdMake = await response.json();
      setMakes([...makes, createdMake]);
      setIsNewMakeDialogOpen(false);
      toast.success("Make created successfully");
      router.refresh();
    } catch (error) {
      console.error("Error creating make:", error);
      toast.error("Failed to create make");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle title="Makes Management">
            <Button
              onClick={() => setIsNewMakeDialogOpen(true)}
              className="ml-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Make
            </Button>
          </PageTitle>

          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country of Origin</TableHead>
                  <TableHead>Founded</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Parent Company</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {makes.map((make) => (
                  <TableRow key={make._id}>
                    <TableCell className="font-medium">{make.name}</TableCell>
                    <TableCell>{make.country_of_origin}</TableCell>
                    <TableCell>{make.founded}</TableCell>
                    <TableCell>{make.type?.join(", ")}</TableCell>
                    <TableCell>{make.parent_company}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(make._id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <NewMakeDialog
        open={isNewMakeDialogOpen}
        onOpenChange={setIsNewMakeDialogOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
