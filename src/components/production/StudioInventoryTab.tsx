"use client";

import { useState, useEffect } from "react";
import { StudioInventoryItem, Kit } from "@/types/inventory";
import AddInventoryItemModal from "./AddInventoryItemModal";
import CreateKitModal from "./CreateKitModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Check,
  X,
  Filter,
  Search,
  SlidersHorizontal,
  LogIn,
  LogOut,
  Package,
  Download,
  Upload,
  Pencil,
  MapPin,
} from "lucide-react";
import StudioInventoryList from "./StudioInventoryList";
import KitsTab from "./KitsTab";
import KitDetailsModal from "./KitDetailsModal";
import KitCheckoutModal from "./KitCheckoutModal";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";
import LocationsFilter from "./LocationsFilter";
import { Input } from "@/components/ui/input";
import AdvancedFilterModal, { FilterCriteria } from "./AdvancedFilterModal";
import CheckoutModal from "./CheckoutModal";
import { useToast } from "@/components/ui/use-toast";
import BulkEditModal from "./BulkEditModal";
import BulkCheckoutModal from "./BulkCheckoutModal";
import ImportInventoryModal from "./ImportInventoryModal";
import { LoadingContainer } from "@/components/ui/loading-container";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import ContainersTab from "./ContainersTab";
import StudioInventoryGrid from "./StudioInventoryGrid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

export default function StudioInventoryTab() {
  const { toast: shadcnToast } = useToast();
  const api = useAPI();
  const [selectedView, setSelectedView] = useState<"items" | "kits">("items");
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [items, setItems] = useState<StudioInventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<StudioInventoryItem[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [filteredKits, setFilteredKits] = useState<Kit[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isCreateKitModalOpen, setIsCreateKitModalOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCriteria | null>(null);
  const [savedFilters, setSavedFilters] = useState<FilterCriteria[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"checkout" | "checkin">(
    "checkout"
  );
  const [isKitDetailsModalOpen, setIsKitDetailsModalOpen] = useState(false);
  const [isKitCheckoutModalOpen, setIsKitCheckoutModalOpen] = useState(false);
  const [isDeleteKitDialogOpen, setIsDeleteKitDialogOpen] = useState(false);
  const [currentKit, setCurrentKit] = useState<Kit | null>(null);
  const [kitCheckoutMode, setKitCheckoutMode] = useState<
    "checkout" | "checkin"
  >("checkout");
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkCheckoutModalOpen, setIsBulkCheckoutModalOpen] = useState(false);
  const [bulkCheckoutMode, setBulkCheckoutMode] = useState<
    "checkout" | "checkin"
  >("checkout");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);

  // Fetch data on component mount
  useEffect(() => {
    if (api) {
      fetchInventoryItems();
      fetchLocations();
      fetchContainers();
      fetchCategories();
      fetchManufacturers();
      fetchKits();
      loadSavedFilters();
    }
  }, [api]);

  // Filter items when search term, location, category, or active filter changes
  useEffect(() => {
    let result = items;

    // Apply active filter if exists
    if (activeFilter) {
      // Filter by categories
      if (activeFilter.categories && activeFilter.categories.length > 0) {
        result = result.filter((item) =>
          activeFilter.categories?.includes(item.category)
        );
      }

      // Filter by manufacturers
      if (activeFilter.manufacturers && activeFilter.manufacturers.length > 0) {
        result = result.filter((item) =>
          activeFilter.manufacturers?.includes(item.manufacturer || "")
        );
      }

      // Filter by locations
      if (activeFilter.locations && activeFilter.locations.length > 0) {
        result = result.filter(
          (item) =>
            item.location && activeFilter.locations?.includes(item.location)
        );
      }

      // Filter by conditions
      if (activeFilter.conditions && activeFilter.conditions.length > 0) {
        result = result.filter((item) =>
          activeFilter.conditions?.includes(item.condition)
        );
      }

      // Filter by tags
      if (activeFilter.tags && activeFilter.tags.length > 0) {
        result = result.filter((item) =>
          item.tags?.some((tag) => activeFilter.tags?.includes(tag))
        );
      }

      // Filter by price range
      if (activeFilter.minPurchasePrice !== undefined) {
        result = result.filter(
          (item) =>
            item.purchasePrice !== undefined &&
            item.purchasePrice >= (activeFilter.minPurchasePrice || 0)
        );
      }

      if (activeFilter.maxPurchasePrice !== undefined) {
        result = result.filter(
          (item) =>
            item.purchasePrice !== undefined &&
            item.purchasePrice <= (activeFilter.maxPurchasePrice || Infinity)
        );
      }

      // Filter by purchase date range
      if (activeFilter.purchaseDateStart !== undefined) {
        result = result.filter(
          (item) =>
            item.purchaseDate !== undefined &&
            new Date(item.purchaseDate) >=
              new Date(activeFilter.purchaseDateStart!)
        );
      }

      if (activeFilter.purchaseDateEnd !== undefined) {
        result = result.filter(
          (item) =>
            item.purchaseDate !== undefined &&
            new Date(item.purchaseDate) <=
              new Date(activeFilter.purchaseDateEnd!)
        );
      }

      // Filter by availability
      if (activeFilter.isAvailable !== undefined) {
        result = result.filter(
          (item) => item.isAvailable === activeFilter.isAvailable
        );
      }
    } else {
      // If no active filter, apply basic filters

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            (item.manufacturer || "").toLowerCase().includes(term) ||
            item.model.toLowerCase().includes(term) ||
            (item.serialNumber &&
              item.serialNumber.toLowerCase().includes(term)) ||
            item.category.toLowerCase().includes(term) ||
            (item.tags &&
              item.tags.some((tag) => tag.toLowerCase().includes(term)))
        );
      }

      // Filter by location
      if (selectedLocation) {
        result = result.filter((item) => item.location === selectedLocation);
      }

      // Filter by category
      if (selectedCategory) {
        result = result.filter((item) => item.category === selectedCategory);
      }
    }

    setFilteredItems(result);
  }, [items, searchTerm, selectedLocation, selectedCategory, activeFilter]);

  const fetchInventoryItems = async () => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      const data = await api.get<any[]>("/studio_inventory");

      // Convert snake_case to camelCase
      const formattedItems = data.map((item: any) => ({
        id: item.id || item._id,
        name: item.name,
        category: item.category,
        subCategory: item.sub_category,
        manufacturer: item.manufacturer || "",
        model: item.model,
        serialNumber: item.serial_number,
        purchaseDate: item.purchase_date
          ? new Date(item.purchase_date)
          : undefined,
        lastMaintenanceDate: item.last_maintenance_date
          ? new Date(item.last_maintenance_date)
          : undefined,
        condition: item.condition,
        notes: item.notes,
        location: item.location,
        containerId: item.container_id,
        isAvailable: item.is_available,
        quantity: item.quantity || 1,
        currentKitId: item.current_kit_id,
        images: item.images || [],
        primaryImage: item.primary_image,
        purchasePrice: item.purchase_price,
        currentValue: item.current_value,
        depreciationRate: item.depreciation_rate,
        insuranceValue: item.insurance_value,
        tags: item.tags || [],
        powerRequirements: item.power_requirements,
        dimensions: item.dimensions,
        manualUrl: item.manual_url,
        warrantyExpirationDate: item.warranty_expiration_date
          ? new Date(item.warranty_expiration_date)
          : undefined,
        serviceProvider: item.service_provider,
        serviceContactInfo: item.service_contact_info,
        checkedOutTo: item.checked_out_to,
        checkoutDate: item.checkout_date
          ? new Date(item.checkout_date)
          : undefined,
        expectedReturnDate: item.expected_return_date
          ? new Date(item.expected_return_date)
          : undefined,
      }));

      // Ensure isAvailable is correctly set based on checkedOutTo
      const itemsWithCorrectAvailability = formattedItems.map(
        (item: StudioInventoryItem) => {
          if (item.checkedOutTo) {
            return { ...item, isAvailable: false };
          }
          return item;
        }
      );

      setItems(itemsWithCorrectAvailability);
      setFilteredItems(itemsWithCorrectAvailability);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      toast.error("Failed to fetch inventory items. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKits = async () => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      const data = await api.get<Kit[]>("/kits");
      setKits(data);
      setFilteredKits(data);
    } catch (error) {
      console.error("Error fetching kits:", error);
      toast.error("Failed to fetch kits. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter kits when search term changes
  useEffect(() => {
    if (selectedView === "kits") {
      const filtered = kits.filter(
        (kit) =>
          kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (kit.description &&
            kit.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredKits(filtered);
    }
  }, [searchTerm, kits, selectedView]);

  const loadSavedFilters = () => {
    const savedFiltersJson = localStorage.getItem("savedInventoryFilters");
    if (savedFiltersJson) {
      try {
        const parsedFilters = JSON.parse(savedFiltersJson);

        // Convert date strings back to Date objects
        const processedFilters = parsedFilters.map(
          (filter: FilterCriteria) => ({
            ...filter,
            purchaseDateStart: filter.purchaseDateStart
              ? new Date(filter.purchaseDateStart)
              : undefined,
            purchaseDateEnd: filter.purchaseDateEnd
              ? new Date(filter.purchaseDateEnd)
              : undefined,
          })
        );

        setSavedFilters(processedFilters);
      } catch (error) {
        console.error("Error parsing saved filters:", error);
      }
    }
  };

  const handleSaveFilter = (filter: FilterCriteria) => {
    const updatedFilters = [...savedFilters, filter];
    setSavedFilters(updatedFilters);

    // Save to localStorage
    localStorage.setItem(
      "savedInventoryFilters",
      JSON.stringify(updatedFilters)
    );
  };

  const handleDeleteSavedFilter = (filterId: string) => {
    const updatedFilters = savedFilters.filter(
      (filter) => filter.id !== filterId
    );
    setSavedFilters(updatedFilters);

    // Update localStorage
    localStorage.setItem(
      "savedInventoryFilters",
      JSON.stringify(updatedFilters)
    );
  };

  const handleApplyFilter = (filter: FilterCriteria) => {
    setActiveFilter(filter);
    // Clear basic filters when applying advanced filter
    setSearchTerm("");
    setSelectedLocation(null);
    setSelectedCategory(null);
  };

  const handleClearFilter = () => {
    setActiveFilter(null);
    setSelectedCategory(null);
    setSelectedLocation(null);
  };

  const handleAddItem = async (newItem: Omit<StudioInventoryItem, "id">) => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Sending to API:", newItem);

      // Ensure required fields are present
      if (!newItem.name || !newItem.category || !newItem.model) {
        console.error("Missing required fields:", {
          name: newItem.name,
          category: newItem.category,
          model: newItem.model,
        });

        toast.error(
          "Please fill in all required fields (Name, Category, Model)"
        );
        return;
      }

      const data = await api.post<any>("/studio_inventory", newItem);

      // Convert snake_case to camelCase
      const formattedItem: StudioInventoryItem = {
        id: data.id || data._id,
        name: data.name,
        category: data.category,
        subCategory: data.sub_category,
        manufacturer: data.manufacturer || "",
        model: data.model,
        serialNumber: data.serial_number,
        purchaseDate: data.purchase_date
          ? new Date(data.purchase_date)
          : undefined,
        lastMaintenanceDate: data.last_maintenance_date
          ? new Date(data.last_maintenance_date)
          : undefined,
        condition: data.condition,
        notes: data.notes,
        location: data.location,
        containerId: data.container_id,
        isAvailable: data.is_available,
        quantity: data.quantity || 1,
        currentKitId: data.current_kit_id,
        images: data.images || [],
        primaryImage: data.primary_image,
        purchasePrice: data.purchase_price,
        currentValue: data.current_value,
        depreciationRate: data.depreciation_rate,
        insuranceValue: data.insurance_value,
        tags: data.tags || [],
        powerRequirements: data.power_requirements,
        dimensions: data.dimensions,
        manualUrl: data.manual_url,
        warrantyExpirationDate: data.warranty_expiration_date
          ? new Date(data.warranty_expiration_date)
          : undefined,
        serviceProvider: data.service_provider,
        serviceContactInfo: data.service_contact_info,
        checkedOutTo: data.checked_out_to,
        checkoutDate: data.checkout_date
          ? new Date(data.checkout_date)
          : undefined,
        expectedReturnDate: data.expected_return_date
          ? new Date(data.expected_return_date)
          : undefined,
      };

      setItems((prevItems) => [...prevItems, formattedItem]);
      setIsAddItemModalOpen(false);

      toast.success("Inventory item added successfully");
    } catch (error) {
      console.error("Error adding inventory item:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create inventory item"
      );
    }
  };

  const handleCreateKit = async (newKit: Partial<Kit>) => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      const createdKit = await api.post<Kit>("/kits", {
        ...newKit,
        items: isSelectionMode ? selectedItems : newKit.items || [],
      });

      setKits((prevKits) => [...prevKits, createdKit]);

      // If kit was created from selected items, update those items
      if (isSelectionMode && selectedItems.length > 0) {
        // Update local state to reflect items are now part of a kit
        setItems((prevItems) =>
          prevItems.map((item) => {
            if (selectedItems.includes(item.id)) {
              return {
                ...item,
                isAvailable: false,
                currentKitId: createdKit.id,
              };
            }
            return item;
          })
        );

        // Reset selection mode
        setIsSelectionMode(false);
        setSelectedItems([]);
      }

      setIsCreateKitModalOpen(false);

      toast.success("Kit created successfully");
    } catch (error) {
      console.error("Error creating kit:", error);
      toast.error("Failed to create kit. Please try again.");
    }
  };

  const handleItemUpdate = (updatedItem: StudioInventoryItem) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleItemDelete = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  // New function to handle duplicating an inventory item
  const handleDuplicateItem = (itemToDuplicate: StudioInventoryItem) => {
    // Create a new item object without the ID and any unique identifiers
    const duplicatedItem: Omit<StudioInventoryItem, "id"> = {
      name: `${itemToDuplicate.name} (Copy)`,
      category: itemToDuplicate.category,
      subCategory: itemToDuplicate.subCategory,
      manufacturer: itemToDuplicate.manufacturer || "",
      model: itemToDuplicate.model,
      serialNumber: undefined, // Reset serial number as it should be unique
      purchaseDate: itemToDuplicate.purchaseDate,
      lastMaintenanceDate: itemToDuplicate.lastMaintenanceDate,
      condition: itemToDuplicate.condition,
      notes: itemToDuplicate.notes,
      location: itemToDuplicate.location,
      containerId: itemToDuplicate.containerId,
      isAvailable: true, // Always set as available
      quantity: itemToDuplicate.quantity || 1, // Preserve the quantity
      images: itemToDuplicate.images ? [...itemToDuplicate.images] : [],
      primaryImage: itemToDuplicate.primaryImage,
      purchasePrice: itemToDuplicate.purchasePrice,
      currentValue: itemToDuplicate.currentValue,
      depreciationRate: itemToDuplicate.depreciationRate,
      insuranceValue: itemToDuplicate.insuranceValue,
      tags: itemToDuplicate.tags ? [...itemToDuplicate.tags] : [],
      powerRequirements: itemToDuplicate.powerRequirements,
      dimensions: itemToDuplicate.dimensions,
      manualUrl: itemToDuplicate.manualUrl,
      warrantyExpirationDate: itemToDuplicate.warrantyExpirationDate,
      serviceProvider: itemToDuplicate.serviceProvider,
      serviceContactInfo: itemToDuplicate.serviceContactInfo,
    };

    // Call the existing handleAddItem function to create the new item
    handleAddItem(duplicatedItem);

    toast.success("A copy of the item has been created.");
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedItems([]);
  };

  const handleCreateKitFromSelection = () => {
    setIsCreateKitModalOpen(true);
  };

  const handleCheckoutItems = () => {
    setBulkCheckoutMode("checkout");
    setIsBulkCheckoutModalOpen(true);
  };

  const handleCheckinItems = () => {
    setBulkCheckoutMode("checkin");
    setIsBulkCheckoutModalOpen(true);
  };

  const handleSaveCheckout = async (
    action: "checkout" | "checkin",
    data?: { checkedOutTo: string; expectedReturnDate?: Date }
  ) => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      await api.post("/studio_inventory/batch", {
        action,
        itemIds: selectedItems,
        checkoutInfo: data,
      });

      // Refresh the inventory list
      fetchInventoryItems();

      // Clear selection
      setSelectedItems([]);
      setIsSelectionMode(false);

      toast.success(
        `${action === "checkout" ? "Checked out" : "Checked in"} ${
          selectedItems.length
        } items successfully`
      );
    } catch (error) {
      console.error(`Error in batch ${action}:`, error);
      toast.error(`Failed to ${action} items`);
    }
  };

  const availableItems = items.filter((item) => item.isAvailable);

  // Count checked out items in selection
  const checkedOutCount = selectedItems.filter(
    (id) => !items.find((item) => item.id === id)?.isAvailable
  ).length;

  // Count checked in items in selection
  const checkedInCount = selectedItems.filter(
    (id) => items.find((item) => item.id === id)?.isAvailable
  ).length;

  const handleUpdateKit = async (updatedKit: Partial<Kit>) => {
    if (!updatedKit.id || !api) return;

    try {
      const data = await api.put<any>(`/kits/${updatedKit.id}`, updatedKit);

      // Update kits in state
      setKits((prevKits) =>
        prevKits.map((kit) => (kit.id === data.id ? data : kit))
      );

      setIsCreateKitModalOpen(false);
      setCurrentKit(null);

      toast.success("Kit updated successfully");
    } catch (error) {
      console.error("Error updating kit:", error);
      toast.error("Failed to update kit. Please try again.");
    }
  };

  const handleDeleteKit = async () => {
    if (!currentKit || !api) return;

    try {
      await api.delete(`/kits/${currentKit.id}`);

      // Remove kit from state
      setKits((prevKits) => prevKits.filter((kit) => kit.id !== currentKit.id));
      setIsDeleteKitDialogOpen(false);
      setCurrentKit(null);

      toast.success("Kit deleted successfully");
    } catch (error) {
      console.error("Error deleting kit:", error);
      toast.error("Failed to delete kit. Please try again.");
    }
  };

  const handleCheckoutKit = async (userId: string, returnDate: Date) => {
    if (!currentKit || !api) return;

    try {
      const updatedKit = await api.post<any>(
        `/kits/${currentKit.id}/checkout`,
        {
          userId,
          expectedReturnDate: returnDate,
        }
      );

      // Update kits in state
      setKits((prevKits) =>
        prevKits.map((kit) => (kit.id === updatedKit.id ? updatedKit : kit))
      );

      setIsKitCheckoutModalOpen(false);
      setCurrentKit(null);

      toast.success("Kit checked out successfully");
    } catch (error) {
      console.error("Error checking out kit:", error);
      toast.error("Failed to check out kit. Please try again.");
    }
  };

  const handleCheckinKit = async () => {
    if (!currentKit || !api) return;

    try {
      const updatedKit = await api.post<any>(`/kits/${currentKit.id}/checkin`);

      // Update kits in state
      setKits((prevKits) =>
        prevKits.map((kit) => (kit.id === updatedKit.id ? updatedKit : kit))
      );

      setIsKitCheckoutModalOpen(false);
      setCurrentKit(null);

      toast.success("Kit checked in successfully");
    } catch (error) {
      console.error("Error checking in kit:", error);
      toast.error("Failed to check in kit. Please try again.");
    }
  };

  const handleViewKit = (kit: Kit) => {
    setCurrentKit(kit);
    setIsKitDetailsModalOpen(true);
  };

  const handleEditKit = (kit: Kit) => {
    setCurrentKit(kit);
    setIsCreateKitModalOpen(true);
  };

  const handleDeleteKitConfirm = (kit: Kit) => {
    setCurrentKit(kit);
    setIsDeleteKitDialogOpen(true);
  };

  const handleKitCheckout = (kit: Kit) => {
    setCurrentKit(kit);
    setKitCheckoutMode("checkout");
    setIsKitCheckoutModalOpen(true);
  };

  const handleKitCheckin = (kit: Kit) => {
    setCurrentKit(kit);
    setKitCheckoutMode("checkin");
    setIsKitCheckoutModalOpen(true);
  };

  // Add a new function to handle bulk edit
  const handleBulkEdit = async (
    updates: Partial<StudioInventoryItem> & {
      tagsToAdd?: string[];
      tagsToRemove?: string[];
    },
    itemIds: string[]
  ) => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      await api.put("/studio_inventory/batch", {
        updates,
        itemIds,
      });

      // Refresh the inventory list
      fetchInventoryItems();

      // Clear selection
      setSelectedItems([]);
      setIsSelectionMode(false);

      toast.success(`Updated ${itemIds.length} items successfully`);
    } catch (error) {
      console.error("Error in bulk edit:", error);
      toast.error("Failed to update items");
    }
  };

  // Add a new function to handle CSV export
  const handleExportCSV = () => {
    // Create CSV content from filtered items
    const headers = [
      "Name",
      "Category",
      "Sub Category",
      "Manufacturer",
      "Model",
      "Serial Number",
      "Quantity",
      "Rental Price",
      "Purchase Date",
      "Last Maintenance Date",
      "Condition",
      "Notes",
      "Location",
      "Is Available",
      "Current Kit ID",
      "Purchase Price",
      "Current Value",
      "Tags",
      "Power Requirements",
      "Dimensions",
      "Manual URL",
      "Warranty Expiration Date",
      "Service Provider",
      "Service Contact Info",
      "Checked Out To",
      "Checkout Date",
      "Expected Return Date",
    ];

    const csvRows = [headers];

    // Add data rows
    const itemsToExport =
      isSelectionMode && selectedItems.length > 0
        ? items.filter((item) => selectedItems.includes(item.id))
        : filteredItems;

    itemsToExport.forEach((item) => {
      const row = [
        item.name,
        item.category,
        item.subCategory || "",
        item.manufacturer || "",
        item.model,
        item.serialNumber || "",
        (item.quantity || 1).toString(),
        item.rentalPrice ? `$${item.rentalPrice.toFixed(2)}` : "",
        item.purchaseDate ? item.purchaseDate.toISOString().split("T")[0] : "",
        item.lastMaintenanceDate
          ? item.lastMaintenanceDate.toISOString().split("T")[0]
          : "",
        item.condition,
        item.notes || "",
        item.location || "",
        item.isAvailable ? "Yes" : "No",
        item.currentKitId || "",
        item.purchasePrice ? item.purchasePrice.toString() : "",
        item.currentValue ? item.currentValue.toString() : "",
        item.tags ? item.tags.join(", ") : "",
        item.powerRequirements || "",
        item.dimensions || "",
        item.manualUrl || "",
        item.warrantyExpirationDate
          ? item.warrantyExpirationDate.toISOString().split("T")[0]
          : "",
        item.serviceProvider || "",
        item.serviceContactInfo || "",
        item.checkedOutTo || "",
        item.checkoutDate ? item.checkoutDate.toISOString().split("T")[0] : "",
        item.expectedReturnDate
          ? item.expectedReturnDate.toISOString().split("T")[0]
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
      `studio-inventory-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${itemsToExport.length} items to CSV`);
  };

  // Fetch locations function
  const fetchLocations = async () => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      const data = await api.get<any[]>("/locations");
      // Extract location names
      const locationNames = data.map((location: any) => location.name);
      setLocations(locationNames);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Failed to load locations");
    }
  };

  // Add fetch containers function
  const fetchContainers = async () => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      const data = await api.get<any[]>("/containers");
      setContainers(data);
    } catch (error) {
      console.error("Error fetching containers:", error);
      toast.error("Failed to load containers");
    }
  };

  // Fetch categories function
  const fetchCategories = async () => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      const data = await api.get<string[]>("/studio_inventory/categories");
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Fetch manufacturers function
  const fetchManufacturers = async () => {
    if (!api) {
      toast.error("Authentication Required");
      return;
    }

    try {
      const data = await api.get<string[]>("/studio_inventory/manufacturers");
      setManufacturers(data);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
    }
  };

  if (isLoading) {
    return <LoadingContainer />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {!isSelectionMode && selectedView === "kits" && (
          <div className="flex justify-between items-center">
            <Button onClick={() => setIsCreateKitModalOpen(true)}>
              <Package className="w-4 h-4 mr-2" />
              Create Kit
            </Button>
          </div>
        )}

        {(isSelectionMode || activeFilter) && (
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {isSelectionMode && (
              <div className="w-full md:w-auto flex gap-2">
                <Button
                  onClick={handleCreateKitFromSelection}
                  variant="default"
                  disabled={selectedItems.length === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Create Kit ({selectedItems.length})
                </Button>
                <Button
                  onClick={handleCheckoutItems}
                  variant="outline"
                  disabled={selectedItems.length === 0 || checkedOutCount > 0}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Check Out ({selectedItems.length})
                </Button>
                <Button
                  onClick={handleCheckinItems}
                  variant="outline"
                  disabled={selectedItems.length === 0 || checkedInCount > 0}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Check In ({selectedItems.length})
                </Button>
                <Button onClick={handleCancelSelection} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}

            {activeFilter && (
              <div className={isSelectionMode ? "" : "ml-auto"}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilter}
                  className="whitespace-nowrap"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filter
                </Button>
              </div>
            )}
          </div>
        )}

        {activeFilter && (
          <div className="bg-muted p-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">
                {activeFilter.name || "Custom Filter"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilter}
              className="h-7 px-2"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {isSelectionMode && (
          <div className="bg-muted p-2 rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
              >
                Cancel
              </Button>
              <span className="text-sm">
                {selectedItems.length} item
                {selectedItems.length !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkEditModalOpen(true)}
              >
                Bulk Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateKitFromSelection}
                disabled={selectedItems.length === 0}
              >
                Create Kit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckoutItems}
                disabled={selectedItems.length === 0}
              >
                Check Out
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckinItems}
                disabled={selectedItems.length === 0}
              >
                Check In
              </Button>
            </div>
          </div>
        )}

        <CustomTabs
          items={[
            {
              value: "items",
              label: "Individual Items",
              content: (
                <div>
                  {isSelectionMode ? (
                    <></>
                  ) : (
                    <div className="mb-4 flex justify-between">
                      <div className="flex gap-2 items-center">
                        {/* Grid/List View Selector */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                viewType === "grid" ? "default" : "outline"
                              }
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
                              variant={
                                viewType === "list" ? "default" : "outline"
                              }
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

                        {!activeFilter && (
                          <div className="relative mr-2">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                              placeholder="Search..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8 h-9 w-[200px]"
                              disabled={!!activeFilter}
                            />
                          </div>
                        )}

                        {selectedView === "items" && !activeFilter && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Select
                                    value={selectedLocation || "all"}
                                    onValueChange={(value) =>
                                      setSelectedLocation(
                                        value === "all" ? null : value
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-9 w-9 p-0 flex items-center justify-center border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md">
                                      <MapPin className="h-4 w-4" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">
                                        All Locations
                                      </SelectItem>
                                      {locations.map((location) => (
                                        <SelectItem
                                          key={location}
                                          value={location}
                                        >
                                          <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3" />
                                            {location}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {selectedLocation
                                  ? `Location: ${selectedLocation}`
                                  : "Filter by Location"}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Select
                                    value={selectedCategory || "all"}
                                    onValueChange={(value) =>
                                      setSelectedCategory(
                                        value === "all" ? null : value
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-9 w-9 p-0 flex items-center justify-center border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md">
                                      <Filter className="h-4 w-4" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">
                                        All Categories
                                      </SelectItem>
                                      {categories.map((category) => (
                                        <SelectItem
                                          key={category}
                                          value={category}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Filter className="w-3 h-3" />
                                            {category}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {selectedCategory
                                  ? `Category: ${selectedCategory}`
                                  : "Filter by Category"}
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
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

                        {!isSelectionMode && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setIsAddItemModalOpen(true)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Add New Item</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setIsAdvancedFilterOpen(true)}
                                  className={
                                    activeFilter
                                      ? "bg-primary text-primary-foreground"
                                      : ""
                                  }
                                >
                                  <SlidersHorizontal className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Advanced Filter</TooltipContent>
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
                                  onClick={() => setIsImportModalOpen(true)}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Import from CSV</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setIsSelectionMode(true);
                                    setSelectedItems([]);
                                  }}
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Create Kit from Items
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setIsSelectionMode(true);
                                    setSelectedItems([]);
                                  }}
                                >
                                  <div className="relative">
                                    <LogOut className="h-4 w-4" />
                                    <LogIn className="h-3 w-3 absolute -top-1 -right-1 text-primary" />
                                  </div>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Batch Check Out/In
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {viewType === "grid" ? (
                    <StudioInventoryGrid
                      items={filteredItems}
                      onItemUpdate={handleItemUpdate}
                      onItemDelete={handleItemDelete}
                      onItemDuplicate={handleDuplicateItem}
                      selectedItems={selectedItems}
                      onSelectedItemsChange={setSelectedItems}
                      isSelectionMode={isSelectionMode}
                      isEditMode={isEditMode}
                    />
                  ) : (
                    <StudioInventoryList
                      items={filteredItems}
                      onItemUpdate={handleItemUpdate}
                      onItemDelete={handleItemDelete}
                      onItemDuplicate={handleDuplicateItem}
                      selectedItems={selectedItems}
                      onSelectedItemsChange={setSelectedItems}
                      isSelectionMode={isSelectionMode}
                      isEditMode={isEditMode}
                    />
                  )}
                </div>
              ),
            },
            {
              value: "kits",
              label: "Kits",
              content: <KitsTab />,
            },
            {
              value: "containers",
              label: "Containers",
              content: <ContainersTab />,
            },
          ]}
          defaultValue="items"
          basePath="/production"
          paramName="view"
        />

        <AddInventoryItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          onAdd={handleAddItem}
        />

        <CreateKitModal
          isOpen={isCreateKitModalOpen}
          onClose={() => {
            setIsCreateKitModalOpen(false);
            setSelectedItems([]);
            setCurrentKit(null);
          }}
          onSave={currentKit ? handleUpdateKit : handleCreateKit}
          kit={currentKit || undefined}
          isEditing={!!currentKit}
        />

        {currentKit && (
          <>
            <KitDetailsModal
              isOpen={isKitDetailsModalOpen}
              onClose={() => {
                setIsKitDetailsModalOpen(false);
                setCurrentKit(null);
              }}
              kit={currentKit}
            />

            <KitCheckoutModal
              isOpen={isKitCheckoutModalOpen}
              onClose={() => {
                setIsKitCheckoutModalOpen(false);
                setCurrentKit(null);
              }}
              kit={currentKit}
              mode={kitCheckoutMode}
              onCheckout={handleCheckoutKit}
              onCheckin={handleCheckinKit}
            />

            <DeleteConfirmationDialog
              isOpen={isDeleteKitDialogOpen}
              onClose={() => {
                setIsDeleteKitDialogOpen(false);
                setCurrentKit(null);
              }}
              onConfirm={handleDeleteKit}
              title="Delete Kit"
              description={`Are you sure you want to delete the kit "${currentKit.name}"? This action cannot be undone.`}
            />
          </>
        )}

        <AdvancedFilterModal
          isOpen={isAdvancedFilterOpen}
          onClose={() => setIsAdvancedFilterOpen(false)}
          onApplyFilter={handleApplyFilter}
          onSaveFilter={handleSaveFilter}
          savedFilters={savedFilters}
          onDeleteSavedFilter={handleDeleteSavedFilter}
          onLoadSavedFilter={handleApplyFilter}
          initialFilter={activeFilter || undefined}
        />

        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          selectedItems={items.filter((item) =>
            selectedItems.includes(item.id)
          )}
          mode={checkoutMode}
          onSave={handleSaveCheckout}
        />

        {isBulkEditModalOpen && (
          <BulkEditModal
            isOpen={isBulkEditModalOpen}
            onClose={() => setIsBulkEditModalOpen(false)}
            selectedItems={items.filter((item) =>
              selectedItems.includes(item.id)
            )}
            onSave={handleBulkEdit}
          />
        )}

        {isBulkCheckoutModalOpen && (
          <BulkCheckoutModal
            isOpen={isBulkCheckoutModalOpen}
            onClose={() => setIsBulkCheckoutModalOpen(false)}
            selectedItems={items.filter((item) =>
              selectedItems.includes(item.id)
            )}
            mode={bulkCheckoutMode}
            onSave={handleSaveCheckout}
          />
        )}

        {isImportModalOpen && (
          <ImportInventoryModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={fetchInventoryItems}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
