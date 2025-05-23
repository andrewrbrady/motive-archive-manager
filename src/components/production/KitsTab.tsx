"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Package,
  Filter,
  Download,
  Upload,
  LogIn,
  LogOut,
  Pencil,
  SlidersHorizontal,
  X,
  Info,
  Check,
} from "lucide-react";
import KitsList from "./KitsList";
import KitsGrid from "./KitsGrid";
import { Kit } from "@/types/inventory";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateKitModal from "./CreateKitModal";
import KitDetailsModal from "./KitDetailsModal";
import KitCheckoutModal from "./KitCheckoutModal";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function KitsTab() {
  const { toast } = useToast();
  const [kits, setKits] = useState<Kit[]>([]);
  const [filteredKits, setFilteredKits] = useState<Kit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewType, setViewType] = useState<"grid" | "list">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKits, setSelectedKits] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentKit, setCurrentKit] = useState<Kit | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<"checkout" | "checkin">(
    "checkout"
  );

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<string>("available");
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [selectedItemsMap, setSelectedItemsMap] = useState<
    Record<string, boolean>
  >({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Derived state for selected items
  const formSelectedItems = useMemo(() => {
    return Object.keys(selectedItemsMap).filter((id) => selectedItemsMap[id]);
  }, [selectedItemsMap]);

  // Fetch kits on component mount
  useEffect(() => {
    fetchKits();
  }, []);

  // Filter kits when search query or status filter changes
  useEffect(() => {
    filterKits();
  }, [searchQuery, statusFilter, kits]);

  // Reset form when opening create/edit modal
  useEffect(() => {
    if (isCreateModalOpen) {
      // [REMOVED] // [REMOVED] console.log("Modal opened, initializing form state");

      if (currentKit) {
        // Edit mode - populate form with current kit data
        // [REMOVED] // [REMOVED] console.log("Edit mode for kit:", currentKit);
        setFormName(currentKit.name || "");
        setFormDescription(currentKit.description || "");
        setFormStatus(currentKit.status || "available");

        // Convert array of IDs to selection map
        const itemsMap: Record<string, boolean> = {};
        const kitItems = Array.isArray(currentKit.items)
          ? currentKit.items
          : [];
        kitItems.forEach((id) => {
          itemsMap[id] = true;
        });
        // [REMOVED] // [REMOVED] console.log("Setting selected items map:", itemsMap);
        setSelectedItemsMap(itemsMap);
      } else {
        // Create mode - reset form to defaults
        // [REMOVED] // [REMOVED] console.log("Create mode - resetting form");
        setFormName("");
        setFormDescription("");
        setFormStatus("available");
        setSelectedItemsMap({});
      }

      setFormSearchQuery("");
      fetchInventoryItems();
    } else {
      // Modal closed, clear selections
      // [REMOVED] // [REMOVED] console.log("Modal closed, clearing form state");
      setSelectedItemsMap({});
    }
  }, [isCreateModalOpen, currentKit]);

  // Filter inventory items based on search query
  const filteredInventoryItems = inventoryItems.filter((item) => {
    if (!formSearchQuery) return true;
    const query = formSearchQuery.toLowerCase();
    const matches =
      item.name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.manufacturer?.toLowerCase().includes(query) ||
      item.model?.toLowerCase().includes(query);
    // Debug: Log the item ID to ensure it exists and is correct
    if (isCreateModalOpen && matches) {
      // [REMOVED] // [REMOVED] console.log("Matched item:", item.id, item.name);
    }
    return matches;
  });

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
      setIsCreateModalOpen(false);
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

  const handleEdit = (kit: Kit) => {
    setCurrentKit(kit);
    setIsCreateModalOpen(true);
  };

  const handleView = (kit: Kit) => {
    // Fetch detailed kit information
    fetchKitDetails(kit.id);
  };

  const handleCheckout = (kit: Kit) => {
    setCheckoutMode("checkout");
    fetchKitDetails(kit.id, true);
  };

  const handleCheckin = (kit: Kit) => {
    setCheckoutMode("checkin");
    fetchKitDetails(kit.id, true);
  };

  // Fetch detailed kit information including items
  const fetchKitDetails = async (kitId: string, forCheckout = false) => {
    try {
      const response = await fetch(`/api/kits/${kitId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch kit details");
      }
      const kitDetails = await response.json();
      setCurrentKit(kitDetails);

      if (forCheckout) {
        setIsCheckoutModalOpen(true);
      } else {
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching kit details:", error);
      toast({
        title: "Error",
        description: "Failed to load kit details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (kit: Kit) => {
    setCurrentKit(kit);
    setIsDeleteDialogOpen(true);
  };

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedKits(selectedIds);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedKits([]);
  };

  const handleExportCSV = () => {
    // Create CSV content from filtered kits
    const headers = [
      "Name",
      "Description",
      "Status",
      "Number of Items",
      "Checked Out To",
      "Checkout Date",
      "Expected Return Date",
      "Created By",
      "Created At",
    ];

    const csvRows = [headers];

    // Add data rows
    const kitsToExport =
      isSelectionMode && selectedKits.length > 0
        ? kits.filter((kit) => selectedKits.includes(kit.id))
        : filteredKits;

    kitsToExport.forEach((kit) => {
      const row = [
        kit.name || "",
        kit.description || "",
        kit.status || "",
        String(kit.items?.length || 0),
        kit.checkedOutTo || "",
        kit.checkoutDate
          ? new Date(kit.checkoutDate).toISOString().split("T")[0]
          : "",
        kit.expectedReturnDate
          ? new Date(kit.expectedReturnDate).toISOString().split("T")[0]
          : "",
        kit.createdBy || "",
        kit.createdAt
          ? new Date(kit.createdAt).toISOString().split("T")[0]
          : "",
      ];
      csvRows.push(row);
    });

    // Convert to CSV string
    const csvContent = csvRows
      .map((row) =>
        row
          .map((cell) =>
            // Escape quotes and wrap in quotes if contains comma or newline
            typeof cell === "string" &&
            (cell.includes(",") || cell.includes("\n") || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(",")
      )
      .join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `kits-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${kitsToExport.length} kits to CSV`,
    });
  };

  // Fetch inventory items for the form
  const fetchInventoryItems = async () => {
    setIsLoadingItems(true);
    try {
      const response = await fetch("/api/studio_inventory");
      if (!response.ok) {
        throw new Error("Failed to fetch inventory items");
      }
      const data = await response.json();

      // Process the items to ensure they all have a proper id
      const processedItems = data.map((item: any) => ({
        ...item,
        // Ensure each item has an id (use _id as fallback if needed)
        id: item.id || item._id,
      }));

      // [REMOVED] // [REMOVED] console.log("Fetched items sample:", processedItems.slice(0, 3));

      // Filter out items that are already in other kits
      const availableItems = processedItems.filter(
        (item: any) =>
          !item.currentKitId ||
          (currentKit && item.currentKitId === currentKit.id)
      );

      setInventoryItems(availableItems);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Toggle selection of an inventory item with new approach
  const toggleItemSelection = (itemId: string) => {
    // [REMOVED] // [REMOVED] console.log("Toggling item:", itemId);

    setSelectedItemsMap((prev) => {
      const newMap = { ...prev };
      newMap[itemId] = !prev[itemId];
      // [REMOVED] // [REMOVED] console.log("New selection map:", newMap);
      return newMap;
    });
  };

  // Handle form submission with updated selection approach
  const handleSubmitForm = () => {
    if (!formName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a kit name",
        variant: "destructive",
      });
      return;
    }

    if (formSelectedItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one item for the kit",
        variant: "destructive",
      });
      return;
    }

    const kitData: Partial<Kit> = {
      name: formName,
      description: formDescription,
      status: formStatus as any,
      items: formSelectedItems,
    };

    if (currentKit) {
      // Edit mode
      kitData.id = currentKit.id;
      handleUpdateKit(kitData as Kit);
    } else {
      // Create mode
      handleCreateKit(kitData);
    }
  };

  // Determine if filter is active
  const isFilterActive = statusFilter !== "all";

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {/* Show banner when filters are active */}
        {isFilterActive && (
          <div className="bg-muted p-2 rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
              <span className="text-sm">Status: {statusFilter}</span>
            </div>
          </div>
        )}

        {/* Selection mode banner */}
        {isSelectionMode && selectedKits.length > 0 && (
          <div className="bg-muted p-2 rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <span className="text-sm">
                {selectedKits.length} kit
                {selectedKits.length !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export Selected
              </Button>
            </div>
          </div>
        )}

        {/* Grid/List View Header with Search and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Grid/List View Selector */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewType === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewType("grid")}
                >
                  <div className="grid grid-cols-2 gap-0.5">
                    <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                    <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                    <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                    <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid View</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewType === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewType("list")}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="w-4 h-1 bg-current rounded-sm" />
                    <div className="w-4 h-1 bg-current rounded-sm" />
                    <div className="w-4 h-1 bg-current rounded-sm" />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>List View</TooltipContent>
            </Tooltip>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search kits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-[250px] md:w-[300px]"
              />
            </div>

            {/* Status Filter */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[160px]">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="All Statuses" />
                      </div>
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
              </TooltipTrigger>
              <TooltipContent>Filter by Status</TooltipContent>
            </Tooltip>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {isSelectionMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelSelection}
                >
                  Cancel
                </Button>
                <span className="text-sm">
                  {selectedKits.length} kit
                  {selectedKits.length !== 1 ? "s" : ""} selected
                </span>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isEditMode ? "default" : "outline"}
                      size="icon"
                      onClick={() => setIsEditMode(!isEditMode)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create New Kit</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleExportCSV}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export to CSV</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setIsSelectionMode(true);
                        setSelectedKits([]);
                      }}
                    >
                      <div className="relative">
                        <LogOut className="h-4 w-4" />
                        <LogIn className="h-3 w-3 absolute -top-1 -right-1 text-primary" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Batch Check Out/In</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading kits...</p>
            </div>
          ) : viewType === "grid" ? (
            <KitsGrid
              kits={filteredKits}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onCheckout={handleCheckout}
              onCheckin={handleCheckin}
              selectionMode={isSelectionMode}
              selectedKits={selectedKits}
              onSelectionChange={handleSelectionChange}
              isEditMode={isEditMode}
            />
          ) : (
            <KitsList
              kits={filteredKits}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onCheckout={handleCheckout}
              onCheckin={handleCheckin}
              selectionMode={isSelectionMode}
              selectedKits={selectedKits}
              onSelectionChange={handleSelectionChange}
              isEditMode={isEditMode}
            />
          )}
        </div>

        {/* Create/Edit Kit Modal */}
        {isCreateModalOpen && (
          <Dialog
            open={isCreateModalOpen}
            onOpenChange={(open) => {
              // [REMOVED] // [REMOVED] console.log("Dialog onOpenChange:", open);
              if (!open) {
                // [REMOVED] // [REMOVED] console.log("Dialog closing, cleaning up state");
                setSelectedItemsMap({});
                setIsCreateModalOpen(false);
                setCurrentKit(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {!!currentKit ? "Edit Kit" : "Create New Kit"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter kit name"
                    className="col-span-3"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Enter kit description"
                    className="col-span-3"
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select
                    value={formStatus}
                    onValueChange={(value) => setFormStatus(value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in-use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Select Items</Label>
                    {formSelectedItems.length > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {formSelectedItems.length} item
                        {formSelectedItems.length !== 1 ? "s" : ""} selected
                      </Badge>
                    )}
                  </div>
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search inventory items..."
                      className="pl-8"
                      value={formSearchQuery}
                      onChange={(e) => setFormSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="border rounded-md p-4 h-[300px] overflow-y-auto">
                    {isLoadingItems ? (
                      <p className="text-center text-muted-foreground">
                        Loading inventory items...
                      </p>
                    ) : filteredInventoryItems.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        {formSearchQuery
                          ? "No items match your search"
                          : "No items available"}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredInventoryItems.map((item) => {
                          // Debug: Log each item being rendered
                          // [REMOVED] // [REMOVED] console.log("Rendering item:", item.id, item.name);
                          const isSelected = !!selectedItemsMap[item.id];

                          return (
                            <div
                              key={item.id}
                              className={`border rounded-md p-2 flex items-center ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-muted-foreground"
                              }`}
                              onClick={() => {
                                console.log(
                                  "Clicked on item:",
                                  item.id,
                                  item.name
                                );
                                toggleItemSelection(item.id);
                              }}
                            >
                              <div className="mr-3 flex-shrink-0">
                                {item.primaryImage ? (
                                  <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                                    <img
                                      src={item.primaryImage}
                                      alt={item.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.category} • {item.manufacturer}{" "}
                                  {item.model}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="ml-2 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log(
                                    "Clicked button for item:",
                                    item.id
                                  );
                                  toggleItemSelection(item.id);
                                }}
                              >
                                {isSelected ? (
                                  <Check className="h-4 w-4 text-primary" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCurrentKit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitForm}>
                  {!!currentKit ? "Update Kit" : "Create Kit"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* View Kit Details Modal */}
        {currentKit && (
          <>
            <KitDetailsModal
              isOpen={isViewModalOpen}
              onClose={() => {
                setIsViewModalOpen(false);
                setCurrentKit(null);
              }}
              kit={currentKit}
            />

            {/* Checkout/Checkin Modal */}
            <KitCheckoutModal
              isOpen={isCheckoutModalOpen}
              onClose={() => {
                setIsCheckoutModalOpen(false);
                setCurrentKit(null);
              }}
              kit={currentKit}
              mode={checkoutMode}
              onCheckout={(userId, returnDate) => {
                // Implement checkout logic here
                setIsCheckoutModalOpen(false);
                fetchKits(); // Refresh kits after checkout
              }}
              onCheckin={() => {
                // Implement checkin logic here
                setIsCheckoutModalOpen(false);
                fetchKits(); // Refresh kits after checkin
              }}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
              isOpen={isDeleteDialogOpen}
              onClose={() => {
                setIsDeleteDialogOpen(false);
                setCurrentKit(null);
              }}
              onConfirm={handleDeleteKit}
              title="Delete Kit"
              description={`Are you sure you want to delete the kit "${currentKit.name}"? This action cannot be undone.`}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
