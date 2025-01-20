"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import { PlusIcon, TrashIcon } from "lucide-react";
import Papa from "papaparse";

interface LocationPair {
  key: string;
  value: string;
}

interface Asset {
  name: string;
  description: string;
  location: { [key: string]: string };
}

interface CSVRow {
  date: string;
  description: string;
  [key: string]: string;
}

const AddAssetPage: React.FC = () => {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [locations, setLocations] = useState<LocationPair[]>([
    { key: "", value: "" },
  ]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadProgress, _setUploadProgress] = useState<number>(0);

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

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result;
      if (typeof csv !== "string") {
        setError("Failed to read CSV file");
        setLoading(false);
        return;
      }

      Papa.parse<CSVRow>(csv, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const assets: Asset[] = [];
          const errors: string[] = [];

          results.data.forEach((row, index) => {
            if (!row.date || !row.description) {
              errors.push(`Row ${index + 1}: Missing required fields`);
              return;
            }

            const asset: Asset = {
              name: row.date,
              description: row.description,
              location: {},
            };

            // Extract location fields
            Object.entries(row).forEach(([key, value]) => {
              if (key !== "date" && key !== "description") {
                asset.location[key] = value;
              }
            });

            assets.push(asset);
          });

          if (errors.length > 0) {
            setError(errors.join("\n"));
            setLoading(false);
            return;
          }

          // Process assets
          try {
            for (const asset of assets) {
              await handleAssetSubmit(asset);
            }
            setSuccess(`Successfully imported ${assets.length} assets`);
          } catch {
            setError("Failed to import assets");
          } finally {
            setLoading(false);
          }
        },
        error: (error: { message: string }) => {
          setError(`Failed to parse CSV: ${error.message}`);
          setLoading(false);
        },
      });
    };

    reader.onerror = () => {
      setError("Failed to read CSV file");
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleAssetSubmit = async (asset: Asset) => {
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

    return response.json();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
      await handleAssetSubmit(asset);
      router.push("/raw");
    } catch {
      setError("An unexpected error occurred");
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
          <div className="mb-4 p-4 text-red-700 bg-red-100 border border-red-400 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 text-green-700 bg-green-100 border border-green-400 rounded">
            {success}
          </div>
        )}

        <div className="mb-8 bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Batch Import</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Upload CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={loading}
              />
            </label>
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-100 text-gray-500">
              Or add manually
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 bg-white shadow-md rounded-lg p-6"
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
