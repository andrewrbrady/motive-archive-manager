"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { LocationResponse } from "@/models/location";
import LocationsTable from "@/components/locations/LocationsTable";
import AddLocationModal from "@/components/locations/AddLocationModal";
import EditLocationModal from "@/components/locations/EditLocationModal";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import { LoadingSpinner } from "@/components/ui/loading";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterContainer } from "@/components/ui/FilterContainer";
import { ListContainer } from "@/components/ui/ListContainer";

export interface LocationsClientProps {
  hideNavbar?: boolean;
}

export default function LocationsClient({
  hideNavbar = false,
}: LocationsClientProps) {
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<
    LocationResponse[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [locations, searchQuery]);

  const filterLocations = () => {
    if (!searchQuery.trim()) {
      setFilteredLocations(locations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = locations.filter(
      (location) =>
        location.name.toLowerCase().includes(query) ||
        location.city?.toLowerCase().includes(query) ||
        location.state?.toLowerCase().includes(query) ||
        location.address?.toLowerCase().includes(query)
    );

    setFilteredLocations(filtered);
  };

  const resetSearch = () => {
    setSearchQuery("");
  };

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      setLocations(data);
      setFilteredLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async (
    newLocation: Omit<LocationResponse, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newLocation),
      });

      if (!response.ok) throw new Error("Failed to add location");
      const data = await response.json();
      setLocations([...locations, data]);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error adding location:", error);
    }
  };

  const handleEditLocation = async (updatedLocation: LocationResponse) => {
    try {
      const response = await fetch(`/api/locations/${updatedLocation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedLocation),
      });

      if (!response.ok) throw new Error("Failed to update location");
      const data = await response.json();

      setLocations(
        locations.map((location) => (location.id === data.id ? data : location))
      );

      setIsEditModalOpen(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error("Error updating location:", error);
    }
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return;

    try {
      const response = await fetch(`/api/locations/${selectedLocation.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete location");

      setLocations(
        locations.filter((location) => location.id !== selectedLocation.id)
      );
      setIsDeleteModalOpen(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error("Error deleting location:", error);
    }
  };

  const openEditModal = (location: LocationResponse) => {
    setSelectedLocation(location);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (location: LocationResponse) => {
    setSelectedLocation(location);
    setIsDeleteModalOpen(true);
  };

  // Content without navbar/footer
  const content = (
    <div className="space-y-4">
      <FilterContainer>
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onReset={resetSearch}
            placeholder="Search locations..."
          />
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          variant="outline"
          className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </FilterContainer>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <ListContainer>
          <LocationsTable
            locations={filteredLocations}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
          />
        </ListContainer>
      )}

      {isAddModalOpen && (
        <AddLocationModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddLocation}
        />
      )}

      {isEditModalOpen && selectedLocation && (
        <EditLocationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedLocation(null);
          }}
          onUpdate={handleEditLocation}
          location={selectedLocation}
        />
      )}

      {isDeleteModalOpen && selectedLocation && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedLocation(null);
          }}
          onConfirm={handleDeleteLocation}
          title="Delete Location"
          message={`Are you sure you want to delete the location "${selectedLocation.name}"? This action cannot be undone.`}
        />
      )}
    </div>
  );

  // If hideNavbar is true, return just the content
  if (hideNavbar) {
    return content;
  }

  // Otherwise return the full page with navbar and footer
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">{content}</main>
      <Footer />
    </div>
  );
}
