"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Box, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContainerResponse } from "@/models/container";
import { LocationResponse } from "@/models/location";
import EditContainerModal from "./EditContainerModal";
import ContainerItemsModal from "./ContainerItemsModal";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ContainersListProps {
  containers: ContainerResponse[];
  onContainerUpdate: (updatedContainer: ContainerResponse) => void;
  onContainerDelete: (containerId: string) => void;
  hoverModeActive?: boolean;
}

// New interface for container items
interface ContainerItem {
  id: string;
  name: string;
  primary_image?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  condition?: string;
}

export default function ContainersList({
  containers,
  onContainerUpdate,
  onContainerDelete,
  hoverModeActive = false,
}: ContainersListProps) {
  const { toast } = useToast();
  const [editingContainer, setEditingContainer] =
    useState<ContainerResponse | null>(null);
  const [selectedContainer, setSelectedContainer] =
    useState<ContainerResponse | null>(null);
  const [locations, setLocations] = useState<Record<string, LocationResponse>>(
    {}
  );
  const [hoverContainer, setHoverContainer] = useState<string | null>(null);
  const [containerItems, setContainerItems] = useState<
    Record<string, ContainerItem[]>
  >({});
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const [isHoveringPopup, setIsHoveringPopup] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch locations when component mounts
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/locations");
        if (!response.ok) throw new Error("Failed to fetch locations");
        const data = await response.json();

        // Convert array to record for easy lookup
        const locationsRecord: Record<string, LocationResponse> = {};
        data.forEach((location: LocationResponse) => {
          locationsRecord[location.id] = location;
        });

        setLocations(locationsRecord);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    fetchLocations();
  }, []);

  const getLocationName = (locationId: string | undefined) => {
    if (!locationId) return "No location";
    return locations[locationId]?.name || "Unknown location";
  };

  const handleMouseEnter = async (
    container: ContainerResponse,
    event: React.MouseEvent
  ) => {
    if (!hoverModeActive) return;

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Set hover position based on mouse position
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverPosition({
      top: rect.top, // Align with the row
      left: event.clientX + 50, // Position to the right of the cursor with more spacing
    });

    setHoverContainer(container.id);

    // Only fetch items if we haven't fetched them before
    if (!containerItems[container.id]) {
      try {
        const response = await fetch(`/api/containers/${container.id}/items`);
        if (response.ok) {
          const items = await response.json();
          setContainerItems((prev) => ({
            ...prev,
            [container.id]: items,
          }));
        }
      } catch (error) {
        console.error(
          "Error fetching container items for hover preview:",
          error
        );
      }
    }
  };

  const handleMouseLeave = () => {
    // Only start the hide timer if we're not hovering the popup
    if (!isHoveringPopup) {
      hideTimeoutRef.current = setTimeout(() => {
        setHoverContainer(null);
      }, 300);
    }
  };

  const handlePopupMouseEnter = () => {
    setIsHoveringPopup(true);
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handlePopupMouseLeave = () => {
    setIsHoveringPopup(false);
    // Start the hide timer
    hideTimeoutRef.current = setTimeout(() => {
      setHoverContainer(null);
    }, 300);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleSaveEdit = async (updatedContainer: ContainerResponse) => {
    try {
      const response = await fetch(`/api/containers/${updatedContainer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedContainer),
      });

      if (!response.ok) throw new Error("Failed to update container");
      onContainerUpdate(updatedContainer);
      toast({
        title: "Success",
        description: "Container updated successfully",
      });
    } catch (error) {
      console.error("Error updating container:", error);
      toast({
        title: "Error",
        description: "Failed to update container",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (containerId: string) => {
    try {
      const response = await fetch(`/api/containers/${containerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete container");
      }

      onContainerDelete(containerId);
      toast({
        title: "Success",
        description: "Container deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting container:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete container",
        variant: "destructive",
      });
    }
  };

  const handleContainerClick = (container: ContainerResponse) => {
    setSelectedContainer(container);
  };

  return (
    <div className="space-y-2 relative">
      {containers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No containers found. Add a new container to get started.
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg border border-[hsl(var(--border))]">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className="text-left text-[hsl(var(--muted-foreground))] text-xs uppercase">
                <th className="py-3 px-2 w-12"></th> {/* Icon column */}
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-2">Type</th>
                <th className="py-3 px-2">ID#</th>
                <th className="py-3 px-2">Location</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="text-[hsl(var(--foreground))]">
              {containers.map((container) => (
                <tr
                  key={container.id}
                  className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  onClick={() => handleContainerClick(container)}
                  onMouseEnter={(e) => handleMouseEnter(container, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Icon */}
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center">
                      <Box className="h-5 w-5 text-primary" />
                    </div>
                  </td>

                  {/* Name */}
                  <td className="py-3 px-4">
                    <span className="font-medium">{container.name}</span>
                  </td>

                  {/* Type */}
                  <td className="py-3 px-2">{container.type}</td>

                  {/* Container Number */}
                  <td className="py-3 px-2">#{container.containerNumber}</td>

                  {/* Location */}
                  <td className="py-3 px-2">
                    {container.locationId ? (
                      <span className="inline-flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {getLocationName(container.locationId)}
                      </span>
                    ) : (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        -
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-2 py-1 rounded-md text-xs",
                        container.isActive
                          ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                          : "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]"
                      )}
                    >
                      {container.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-2 text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          setEditingContainer(container);
                        }}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleDelete(container.id);
                        }}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hover preview with animation */}
      <div
        className={`fixed z-50 bg-background border border-primary rounded-md shadow-lg p-4 w-[300px] max-h-[400px] overflow-hidden transition-opacity duration-150 ease-in-out ${
          hoverModeActive && hoverContainer
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
        style={{
          top: `${Math.max(10, hoverPosition.top)}px`, // Ensure it's not off-screen at the top
          left: `${hoverPosition.left}px`,
        }}
        onMouseEnter={handlePopupMouseEnter}
        onMouseLeave={handlePopupMouseLeave}
      >
        <div className="max-h-[350px] overflow-y-auto">
          {!containerItems[hoverContainer || ""] ? (
            <div className="flex items-center justify-center h-16 text-muted-foreground">
              Loading...
            </div>
          ) : (containerItems[hoverContainer || ""] || []).length === 0 ? (
            <div className="text-muted-foreground">
              No items in this container
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(containerItems[hoverContainer || ""] || []).map((item) => (
                <div
                  key={item.id}
                  className="text-sm border border-[hsl(var(--border))] rounded p-2"
                >
                  {item.primary_image ? (
                    <img
                      src={item.primary_image}
                      alt={item.name}
                      className="w-full h-24 object-cover mb-1 rounded"
                    />
                  ) : (
                    <div className="w-full h-24 bg-muted flex items-center justify-center mb-1 rounded">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="truncate">{item.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingContainer && (
        <EditContainerModal
          isOpen={!!editingContainer}
          onClose={() => setEditingContainer(null)}
          onSave={handleSaveEdit}
          container={editingContainer}
        />
      )}

      {selectedContainer && (
        <ContainerItemsModal
          isOpen={!!selectedContainer}
          onClose={() => setSelectedContainer(null)}
          containerId={selectedContainer.id}
          containerName={selectedContainer.name}
        />
      )}
    </div>
  );
}
