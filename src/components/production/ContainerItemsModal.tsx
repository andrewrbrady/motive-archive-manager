"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Box, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingContainer } from "@/components/ui/loading-container";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface ContainerItem {
  id: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  condition?: string;
  primary_image?: string;
}

// TypeScript interfaces for API responses
interface ContainerItemsResponse {
  data?: ContainerItem[];
}

interface ContainerItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string;
  containerName: string;
}

export default function ContainerItemsModal({
  isOpen,
  onClose,
  containerId,
  containerName,
}: ContainerItemsModalProps) {
  const { toast: uiToast } = useToast();
  const api = useAPI();
  const [items, setItems] = useState<ContainerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && containerId && api) {
      fetchContainerItems();
    }
  }, [isOpen, containerId, api]);

  const fetchContainerItems = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const response = await api.get(`containers/${containerId}/items`);
      const data = Array.isArray(response) ? response : [];
      setItems(data);
    } catch (error) {
      console.error("Error fetching container items:", error);
      toast.error("Failed to fetch items in this container");
      uiToast({
        title: "Error",
        description: "Failed to fetch items in this container",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state if API not ready
  if (!api) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-4xl">
          <div className="h-64 flex items-center justify-center">
            <LoadingContainer />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            <span>Items in Container: {containerName}</span>
          </DialogTitle>
          <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingContainer />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No items found in this container.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-2"></th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Manufacturer</th>
                  <th className="px-4 py-2 font-medium">Model</th>
                  <th className="px-4 py-2 font-medium">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.primary_image ? (
                        <div className="h-10 w-10 rounded overflow-hidden">
                          <img
                            src={item.primary_image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">
                      {item.category && (
                        <Badge variant="outline">{item.category}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.manufacturer || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.model || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {item.condition ? (
                        <Badge
                          variant="outline"
                          className={
                            item.condition.toLowerCase() === "new"
                              ? "bg-green-100 text-green-800 border-green-300"
                              : item.condition.toLowerCase() === "good"
                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                : item.condition.toLowerCase() === "fair"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                  : item.condition.toLowerCase() === "poor"
                                    ? "bg-orange-100 text-orange-800 border-orange-300"
                                    : "bg-muted text-muted-foreground"
                          }
                        >
                          {item.condition}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
