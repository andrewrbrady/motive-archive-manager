"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import ImageGallery from "@/components/ImageGallery";
import { Loader2 } from "lucide-react";
import { RawAsset } from "@/types/inventory";
import { Car } from "@/types/car";
import CarSelector from "@/components/CarSelector";

interface RawAssetFormProps {
  params: {
    id: string;
  };
}

// Use a simpler type structure for the form
type FormRawAsset = {
  _id: string;
  date: string;
  description: string;
  client: string;
  locations: string[];
  carIds: string[];
  createdAt: string;
  updatedAt: string;
};

export default function RawAssetForm({ params }: RawAssetFormProps) {
  const router = useRouter();
  const isNew = params.id === "new";

  const [asset, setAsset] = useState<FormRawAsset>({
    _id: "",
    date: "",
    description: "",
    client: "",
    locations: [],
    carIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [selectedCars, setSelectedCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew) {
      fetchAsset();
    }
  }, [params.id]);

  const fetchAsset = async () => {
    try {
      const response = await fetch(`/api/raw/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch asset");
      const data = await response.json();

      // Ensure all locations are strings
      const locations = Array.isArray(data.locations)
        ? data.locations.map((loc: unknown) => String(loc))
        : [];

      setAsset({
        _id: String(data._id || ""),
        date: String(data.date || ""),
        description: String(data.description || ""),
        client: String(data.client || ""),
        locations,
        carIds: Array.isArray(data.carIds) ? data.carIds.map(String) : [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });

      // Fetch associated cars
      if (data.carIds?.length) {
        const carsResponse = await fetch(
          `/api/cars/batch?ids=${data.carIds.join(",")}`
        );
        if (carsResponse.ok) {
          const carsData = await carsResponse.json();
          setSelectedCars(carsData.cars);
        }
      }
    } catch (err) {
      console.error("Error fetching asset:", err);
      setError("Failed to fetch asset");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/raw" : `/api/raw/${params.id}`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...asset,
          carIds: selectedCars.map((car) => car._id),
        }),
      });

      if (!response.ok) throw new Error("Failed to save asset");

      router.push("/raw");
    } catch (err) {
      console.error("Error saving asset:", err);
      setError("Failed to save asset");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">
            {isNew ? "Add Raw Asset" : "Edit Raw Asset"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Date (YYMMDD)
              </label>
              <input
                type="text"
                value={asset.date}
                onChange={(e) => setAsset({ ...asset, date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
                pattern="\d{6}"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Description
              </label>
              <input
                type="text"
                value={asset.description}
                onChange={(e) =>
                  setAsset({ ...asset, description: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Client
              </label>
              <input
                type="text"
                value={asset.client}
                onChange={(e) => setAsset({ ...asset, client: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Storage Locations
              </label>
              <div className="space-y-2">
                {asset.locations.map((location, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => {
                        const newLocations = [...asset.locations] as string[];
                        newLocations[index] = e.target.value;
                        setAsset({ ...asset, locations: newLocations });
                      }}
                      className="flex-1 px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newLocations = asset.locations.filter(
                          (_, i) => i !== index
                        );
                        setAsset({ ...asset, locations: newLocations });
                      }}
                      className="px-3 py-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))] rounded"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setAsset({
                      ...asset,
                      locations: [...asset.locations, ""] as string[],
                    })
                  }
                  className="px-4 py-2 text-[hsl(var(--info))] hover:bg-[hsl(var(--info))] hover:text-[hsl(var(--info-foreground))] rounded"
                >
                  Add Location
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Associated Cars
              </label>
              <CarSelector
                selectedCars={selectedCars}
                onSelect={setSelectedCars}
              />
            </div>

            {error && (
              <div className="bg-destructive-100 border border-destructive-400 text-destructive-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/raw")}
                className="px-4 py-2 border border-[hsl(var(--border))] rounded hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))] rounded hover:bg-[hsl(var(--info))]"
              >
                {isNew ? "Create" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
