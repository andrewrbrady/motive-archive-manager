"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Box, Eye } from "lucide-react";
import { ContainerResponse } from "@/models/container";
import { useToast } from "@/components/ui/use-toast";
import ContainersList from "./ContainersList";
import AddContainerModal from "./AddContainerModal";
import { LoadingContainer } from "@/components/ui/loading-container";
import { Toggle } from "@/components/ui/toggle";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

// TypeScript interfaces for API responses
interface ContainersResponse {
  data?: ContainerResponse[];
}

export default function ContainersTab() {
  const { toast: uiToast } = useToast();
  const api = useAPI();
  const [containers, setContainers] = useState<ContainerResponse[]>([]);
  const [filteredContainers, setFilteredContainers] = useState<
    ContainerResponse[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [hoverModeActive, setHoverModeActive] = useState(false);

  // Authentication check
  if (!api) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingContainer />
      </div>
    );
  }

  // Fetch containers on component mount
  useEffect(() => {
    if (!api) return;
    fetchContainers();
  }, [api]);

  // Apply search filter when containers or search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContainers(containers);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = containers.filter(
        (container) =>
          container.name.toLowerCase().includes(lowerCaseQuery) ||
          container.type.toLowerCase().includes(lowerCaseQuery) ||
          container.containerNumber.toString().includes(lowerCaseQuery) ||
          (container.description &&
            container.description.toLowerCase().includes(lowerCaseQuery))
      );
      setFilteredContainers(filtered);
    }
  }, [containers, searchQuery]);

  const fetchContainers = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const response = await api.get("containers");
      const data = Array.isArray(response) ? response : [];
      setContainers(data);
      setFilteredContainers(data);
    } catch (error) {
      console.error("Error fetching containers:", error);
      toast.error("Failed to fetch containers");
      uiToast({
        title: "Error",
        description: "Failed to fetch containers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContainer = async (
    newContainer: Omit<
      ContainerResponse,
      "id" | "containerNumber" | "createdAt" | "updatedAt"
    >
  ) => {
    if (!api) return;

    try {
      const createdContainer = (await api.post(
        "containers",
        newContainer
      )) as ContainerResponse;

      setContainers((prev) => [...prev, createdContainer]);

      toast.success("Container created successfully");
      uiToast({
        title: "Success",
        description: "Container created successfully",
      });
    } catch (error) {
      console.error("Error creating container:", error);
      toast.error("Failed to create container");
      uiToast({
        title: "Error",
        description: "Failed to create container",
        variant: "destructive",
      });
    }
  };

  const handleContainerUpdate = (updatedContainer: ContainerResponse) => {
    setContainers((prevContainers) =>
      prevContainers.map((container) =>
        container.id === updatedContainer.id ? updatedContainer : container
      )
    );
  };

  const handleContainerDelete = (containerId: string) => {
    setContainers((prevContainers) =>
      prevContainers.filter((container) => container.id !== containerId)
    );
  };

  const toggleHoverMode = () => {
    setHoverModeActive(!hoverModeActive);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search containers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            aria-label="Toggle hover preview mode"
            pressed={hoverModeActive}
            onPressedChange={toggleHoverMode}
            className={`h-9 w-9 p-0 ${
              hoverModeActive ? "data-[state=on]:bg-accent" : ""
            }`}
            size="sm"
          >
            <div
              className={`p-1 rounded-full ${
                hoverModeActive ? "border-2 border-primary" : ""
              }`}
            >
              <Eye
                className={`h-4 w-4 ${hoverModeActive ? "text-primary" : ""}`}
              />
            </div>
          </Toggle>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 w-9"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <LoadingContainer />
        </div>
      ) : (
        <ContainersList
          containers={filteredContainers}
          onContainerUpdate={handleContainerUpdate}
          onContainerDelete={handleContainerDelete}
          hoverModeActive={hoverModeActive}
        />
      )}

      <AddContainerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddContainer}
      />
    </div>
  );
}
