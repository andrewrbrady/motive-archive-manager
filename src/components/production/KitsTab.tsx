import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package } from "lucide-react";
import KitsList from "./KitsList";
import { Kit } from "@/types/inventory";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateKitModal from "./CreateKitModal";
import KitDetailsModal from "./KitDetailsModal";
import KitCheckoutModal from "./KitCheckoutModal";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";

export default function KitsTab() {
  const { toast } = useToast();
  const [kits, setKits] = useState<Kit[]>([]);
  const [filteredKits, setFilteredKits] = useState<Kit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKits, setSelectedKits] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentKit, setCurrentKit] = useState<Kit | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<"checkout" | "checkin">(
    "checkout"
  );

  // Fetch kits on component mount
  useEffect(() => {
    fetchKits();
  }, []);

  // Filter kits when search query or status filter changes
  useEffect(() => {
    filterKits();
  }, [searchQuery, statusFilter, kits]);

  const fetchKits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/kits");
      if (!response.ok) {
        throw new Error("Failed to fetch kits");
      }
      const data = await response.json();
      setKits(data);
    } catch (error) {
      console.error("Error fetching kits:", error);
      toast({
        title: "Error",
        description: "Failed to load kits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterKits = () => {
    let filtered = [...kits];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (kit) =>
          kit.name?.toLowerCase().includes(query) ||
          kit.description?.toLowerCase().includes(query) ||
          kit.checkedOutTo?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (kit) => kit.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredKits(filtered);
  };

  const handleCreateKit = async (newKit: Partial<Kit>) => {
    try {
      const response = await fetch("/api/kits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newKit),
      });

      if (!response.ok) {
        throw new Error("Failed to create kit");
      }

      const createdKit = await response.json();
      setKits([...kits, createdKit]);
      setIsCreateModalOpen(false);
      toast({
        title: "Success",
        description: "Kit created successfully",
      });
    } catch (error) {
      console.error("Error creating kit:", error);
      toast({
        title: "Error",
        description: "Failed to create kit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateKit = async (updatedKit: Kit) => {
    try {
      const response = await fetch(`/api/kits/${updatedKit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedKit),
      });

      if (!response.ok) {
        throw new Error("Failed to update kit");
      }

      const updated = await response.json();
      setKits(kits.map((kit) => (kit.id === updated.id ? updated : kit)));
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Kit updated successfully",
      });
    } catch (error) {
      console.error("Error updating kit:", error);
      toast({
        title: "Error",
        description: "Failed to update kit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKit = async () => {
    if (!currentKit) return;

    try {
      const response = await fetch(`/api/kits/${currentKit.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete kit");
      }

      setKits(kits.filter((kit) => kit.id !== currentKit.id));
      setIsDeleteDialogOpen(false);
      setCurrentKit(null);
      toast({
        title: "Success",
        description: "Kit deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting kit:", error);
      toast({
        title: "Error",
        description: "Failed to delete kit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckoutKit = async (
    kitId: string,
    userId: string,
    expectedReturnDate: Date
  ) => {
    try {
      const kitToUpdate = kits.find((kit) => kit.id === kitId);
      if (!kitToUpdate) return;

      const updatedKit = {
        ...kitToUpdate,
        status: "checked-out",
        checkedOutTo: userId,
        checkoutDate: new Date(),
        expectedReturnDate,
        checkoutHistory: [
          ...(kitToUpdate.checkoutHistory || []),
          {
            checkedOutTo: userId,
            checkedOutDate: new Date(),
            expectedReturnDate,
          },
        ],
      };

      const response = await fetch(`/api/kits/${kitId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedKit),
      });

      if (!response.ok) {
        throw new Error("Failed to checkout kit");
      }

      const updated = await response.json();
      setKits(kits.map((kit) => (kit.id === updated.id ? updated : kit)));
      setIsCheckoutModalOpen(false);
      setCurrentKit(null);
      toast({
        title: "Success",
        description: "Kit checked out successfully",
      });
    } catch (error) {
      console.error("Error checking out kit:", error);
      toast({
        title: "Error",
        description: "Failed to checkout kit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckinKit = async (kitId: string) => {
    try {
      const kitToUpdate = kits.find((kit) => kit.id === kitId);
      if (!kitToUpdate) return;

      // Update the checkout history with the return date
      const updatedCheckoutHistory = kitToUpdate.checkoutHistory?.map(
        (record, index) => {
          if (index === kitToUpdate.checkoutHistory!.length - 1) {
            return {
              ...record,
              actualReturnDate: new Date(),
            };
          }
          return record;
        }
      );

      const updatedKit = {
        ...kitToUpdate,
        status: "available",
        checkedOutTo: null,
        checkoutDate: null,
        expectedReturnDate: null,
        checkoutHistory: updatedCheckoutHistory,
      };

      const response = await fetch(`/api/kits/${kitId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedKit),
      });

      if (!response.ok) {
        throw new Error("Failed to checkin kit");
      }

      const updated = await response.json();
      setKits(kits.map((kit) => (kit.id === updated.id ? updated : kit)));
      setIsCheckoutModalOpen(false);
      setCurrentKit(null);
      toast({
        title: "Success",
        description: "Kit checked in successfully",
      });
    } catch (error) {
      console.error("Error checking in kit:", error);
      toast({
        title: "Error",
        description: "Failed to checkin kit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (kit: Kit) => {
    setCurrentKit(kit);
    setIsEditModalOpen(true);
  };

  const handleView = (kit: Kit) => {
    setCurrentKit(kit);
    setIsViewModalOpen(true);
  };

  const handleDelete = (kit: Kit) => {
    setCurrentKit(kit);
    setIsDeleteDialogOpen(true);
  };

  const handleCheckout = (kit: Kit) => {
    setCurrentKit(kit);
    setCheckoutMode("checkout");
    setIsCheckoutModalOpen(true);
  };

  const handleCheckin = (kit: Kit) => {
    setCurrentKit(kit);
    setCheckoutMode("checkin");
    setIsCheckoutModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Kits</h2>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Kit
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search kits..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="checked-out">Checked Out</SelectItem>
              <SelectItem value="in-use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading kits...</p>
        </div>
      ) : (
        <KitsList
          kits={filteredKits}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          onCheckout={handleCheckout}
          onCheckin={handleCheckin}
        />
      )}

      {/* Create Kit Modal */}
      {isCreateModalOpen && (
        <CreateKitModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateKit}
        />
      )}

      {/* Edit Kit Modal */}
      {isEditModalOpen && currentKit && (
        <CreateKitModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updatedKit: Partial<Kit>) => {
            if (updatedKit.id) {
              handleUpdateKit(updatedKit as Kit);
            }
          }}
          kit={currentKit}
          isEditing
        />
      )}

      {/* View Kit Details Modal */}
      {isViewModalOpen && currentKit && (
        <KitDetailsModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          kit={currentKit}
        />
      )}

      {/* Checkout/Checkin Modal */}
      {isCheckoutModalOpen && currentKit && (
        <KitCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          kit={currentKit}
          mode={checkoutMode}
          onCheckout={(userId: string, returnDate: Date) =>
            handleCheckoutKit(currentKit.id, userId, returnDate)
          }
          onCheckin={() => handleCheckinKit(currentKit.id)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteKit}
        title="Delete Kit"
        description={`Are you sure you want to delete the kit "${currentKit?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
