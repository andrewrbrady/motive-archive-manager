"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import {
  PencilIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

interface Location {
  [key: string]: string;
}

interface Asset {
  _id: string;
  name: string;
  description: string;
  location: Location;
}

interface EditState {
  field: string;
  value: string;
}

interface LocationEditState {
  drive: string;
  path: string;
  isNew?: boolean;
}

export default function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [asset, setAsset] = React.useState<Asset | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editState, setEditState] = React.useState<EditState | null>(null);
  const [locationEdit, setLocationEdit] =
    React.useState<LocationEditState | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Unwrap params using React.use()
  const { id } = React.use(params);

  const fetchAsset = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/assets/${id}`);
      if (!response.ok) throw new Error("Failed to fetch asset");
      const data = await response.json();
      setAsset(data.asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const startEditing = (field: string, value: string) => {
    setEditState({ field, value });
  };

  const cancelEditing = () => {
    setEditState(null);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (editState) {
      setEditState({ ...editState, value: e.target.value });
    }
  };

  const startLocationEdit = (
    drive: string = "",
    path: string = "",
    isNew: boolean = false
  ) => {
    setLocationEdit({ drive, path, isNew });
  };

  const cancelLocationEdit = () => {
    setLocationEdit(null);
  };

  const handleLocationEditChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "drive" | "path"
  ) => {
    if (locationEdit) {
      setLocationEdit({ ...locationEdit, [field]: e.target.value });
    }
  };

  const saveLocation = async () => {
    if (!locationEdit || !asset) return;

    try {
      setSaving(true);
      const newLocations = { ...asset.location };

      // Remove old drive if it's being renamed
      if (!locationEdit.isNew && locationEdit.drive in newLocations) {
        delete newLocations[locationEdit.drive];
      }

      // Add new location
      newLocations[locationEdit.drive] = locationEdit.path;

      const response = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: "location",
          value: newLocations,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update locations");
      }

      setAsset({
        ...asset,
        location: newLocations,
      });
      setLocationEdit(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update locations"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (drive: string) => {
    if (!asset) return;

    try {
      setSaving(true);
      const newLocations = { ...asset.location };
      delete newLocations[drive];

      const response = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: "location",
          value: newLocations,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete location");
      }

      setAsset({
        ...asset,
        location: newLocations,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete location"
      );
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = async () => {
    if (!editState || !asset) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: editState.field,
          value: editState.value,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update asset");
      }

      setAsset({
        ...asset,
        [editState.field]: editState.value,
      });
      setEditState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update asset");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveChanges();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveLocation();
    } else if (e.key === "Escape") {
      cancelLocationEdit();
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      </>
    );
  }

  if (error || !asset) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <div className="text-red-500 p-4 rounded-lg bg-red-50 mb-4">
            Error: {error || "Asset not found"}
          </div>
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-700"
          >
            ← Back to list
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-700"
          >
            ← Back to list
          </button>
          {error && (
            <div className="text-red-500">
              Error saving changes. Please try again.
            </div>
          )}
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            {editState?.field === "name" ? (
              <div className="flex-grow">
                <input
                  type="text"
                  value={editState.value}
                  onChange={handleEditChange}
                  onKeyDown={handleKeyDown}
                  className="w-full text-2xl font-bold p-2 border rounded"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="text-green-600 hover:text-green-700 disabled:opacity-50"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{asset.name}</h1>
                <button
                  onClick={() => startEditing("name", asset.name)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">Description</h2>
                {editState?.field !== "description" && (
                  <button
                    onClick={() =>
                      startEditing("description", asset.description)
                    }
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {editState?.field === "description" ? (
                <div>
                  <textarea
                    value={editState.value}
                    onChange={handleEditChange}
                    onKeyDown={handleKeyDown}
                    className="w-full p-2 border rounded min-h-[100px]"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="text-green-600 hover:text-green-700 disabled:opacity-50"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700">{asset.description}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Locations</h2>
                <button
                  onClick={() => startLocationEdit("", "", true)}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Location
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(asset.location).map(([drive, path]) => (
                  <div key={drive} className="flex items-center group">
                    {locationEdit?.drive === drive ? (
                      <div className="flex-grow space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={locationEdit.drive}
                            onChange={(e) =>
                              handleLocationEditChange(e, "drive")
                            }
                            onKeyDown={handleLocationKeyDown}
                            placeholder="Drive letter or name"
                            className="w-32 p-2 border rounded"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={locationEdit.path}
                            onChange={(e) =>
                              handleLocationEditChange(e, "path")
                            }
                            onKeyDown={handleLocationKeyDown}
                            placeholder="Path"
                            className="flex-grow p-2 border rounded"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveLocation}
                            disabled={saving}
                            className="text-green-600 hover:text-green-700 disabled:opacity-50"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={cancelLocationEdit}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium min-w-[100px]">
                          {drive}:
                        </span>
                        <span className="text-gray-700 flex-grow">{path}</span>
                        <div className="hidden group-hover:flex gap-2">
                          <button
                            onClick={() => startLocationEdit(drive, path)}
                            className="text-gray-500 hover:text-blue-600"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteLocation(drive)}
                            className="text-gray-500 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {locationEdit?.isNew && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={locationEdit.drive}
                        onChange={(e) => handleLocationEditChange(e, "drive")}
                        onKeyDown={handleLocationKeyDown}
                        placeholder="Drive letter or name"
                        className="w-32 p-2 border rounded"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={locationEdit.path}
                        onChange={(e) => handleLocationEditChange(e, "path")}
                        onKeyDown={handleLocationKeyDown}
                        placeholder="Path"
                        className="flex-grow p-2 border rounded"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveLocation}
                        disabled={saving}
                        className="text-green-600 hover:text-green-700 disabled:opacity-50"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={cancelLocationEdit}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
