"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { LocationResponse } from "@/models/location";
import LocationsTable from "@/components/locations/LocationsTable";
import AddLocationModal from "@/components/locations/AddLocationModal";
import EditLocationModal from "@/components/locations/EditLocationModal";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";

export default function LocationsClient() {
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationResponse | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      setLocations(data);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle title="Locations">
            <div className="flex items-center gap-4 ml-auto">
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </div>
          </PageTitle>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading locations...</p>
            </div>
          ) : (
            <LocationsTable
              locations={locations}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          )}
        </div>
      </main>

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

      <Footer />
    </div>
  );
}
