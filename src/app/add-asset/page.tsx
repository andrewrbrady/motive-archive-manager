"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import { PlusIcon, TrashIcon } from "lucide-react";

interface LocationPair {
  key: string;
  value: string;
}

interface Asset {
  name: string;
  description: string;
  location: { [key: string]: string };
}

const AddAssetPage: React.FC = () => {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [locations, setLocations] = useState<LocationPair[]>([
    { key: "", value: "" },
  ]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleLocationChange = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newLocations = [...locations];
    newLocations[index][field] = value;
    setLocations(newLocations);
  };

  const addLocation = () => {
    setLocations([...locations, { key: "", value: "" }]);
  };

  const removeLocation = (index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    setLocations(
      newLocations.length > 0 ? newLocations : [{ key: "", value: "" }]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Convert locations array to object
    const locationObject = locations.reduce((acc, { key, value }) => {
      if (key.trim() !== "") {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as { [key: string]: string });

    const asset: Asset = {
      name,
      description,
      location: locationObject,
    };

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(asset),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add asset");
      }

      router.push("/raw");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-6 text-center">Add New Asset</h1>
        {error && (
          <div className="text-red-500 mb-4 text-center">Error: {error}</div>
        )}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white shadow-md rounded-lg p-6"
        >
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Locations</label>
            <div className="space-y-2">
              {locations.map((location, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Key"
                    value={location.key}
                    onChange={(e) =>
                      handleLocationChange(index, "key", e.target.value)
                    }
                    required
                    className="w-1/2 border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={location.value}
                    onChange={(e) =>
                      handleLocationChange(index, "value", e.target.value)
                    }
                    required
                    className="w-1/2 border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeLocation(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addLocation}
                className="flex items-center bg-blue-500 text-white px-2 py-2 rounded hover:bg-blue-600 transition-all duration-200"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Adding..." : "Add Asset"}
          </button>
        </form>
      </div>
    </>
  );
};

export default AddAssetPage;
