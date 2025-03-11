"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Database } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Make } from "@/lib/fetchMakes";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterContainer } from "@/components/ui/FilterContainer";
import { ListContainer } from "@/components/ui/ListContainer";
import NewMakeDialog from "@/components/makes/NewMakeDialog";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading";

export default function MakesContent() {
  const [makes, setMakes] = useState<Make[]>([]);
  const [filteredMakes, setFilteredMakes] = useState<Make[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewMakeDialogOpen, setIsNewMakeDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchMakes();
  }, []);

  useEffect(() => {
    filterMakes();
  }, [makes, searchQuery]);

  const fetchMakes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/makes");
      if (!response.ok) {
        throw new Error("Failed to fetch makes");
      }
      const data = await response.json();
      setMakes(data);
      setFilteredMakes(data);
    } catch (error) {
      console.error("Error fetching makes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch makes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterMakes = () => {
    if (!searchQuery.trim()) {
      setFilteredMakes(makes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = makes.filter(
      (make) =>
        make.name.toLowerCase().includes(query) ||
        make.country_of_origin.toLowerCase().includes(query) ||
        make.parent_company?.toLowerCase().includes(query) ||
        (make.type && make.type.some((t) => t.toLowerCase().includes(query)))
    );

    setFilteredMakes(filtered);
  };

  const resetSearch = () => {
    setSearchQuery("");
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
      toast({
        title: "Success",
        description: "Make created successfully",
      });
      router.refresh();
    } catch (error) {
      console.error("Error creating make:", error);
      toast({
        title: "Error",
        description: "Failed to create make",
        variant: "destructive",
      });
    }
  };

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
      toast({
        title: "Success",
        description: "Make deleted successfully",
      });
      router.refresh();
    } catch (error) {
      console.error("Error deleting make:", error);
      toast({
        title: "Error",
        description: "Failed to delete make",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <FilterContainer>
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onReset={resetSearch}
            placeholder="Search makes..."
          />
        </div>
        <Button
          onClick={() => setIsNewMakeDialogOpen(true)}
          variant="outline"
          className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
        >
          <Database className="h-4 w-4 mr-2" />
          Add Make
        </Button>
      </FilterContainer>

      <ListContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Country of Origin</TableHead>
              <TableHead>Founded</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parent Company</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  <LoadingSpinner size="md" />
                </TableCell>
              </TableRow>
            ) : filteredMakes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  <span className="text-muted-foreground">No makes found</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredMakes.map((make) => (
                <TableRow key={make._id}>
                  <TableCell className="font-medium">{make.name}</TableCell>
                  <TableCell>{make.country_of_origin}</TableCell>
                  <TableCell>{make.founded}</TableCell>
                  <TableCell>{make.type?.join(", ")}</TableCell>
                  <TableCell>{make.parent_company}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(make._id)}
                      className="hover:bg-destructive/90"
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ListContainer>

      <NewMakeDialog
        open={isNewMakeDialogOpen}
        onOpenChange={setIsNewMakeDialogOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
