"use client";

import React from "react";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import { PencilIcon } from "lucide-react";

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
  id: string;
  field: string;
  value: string;
}

interface PaginationData {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  sortOrder: "asc" | "desc";
}

export default function RawPage() {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("");
  const [editState, setEditState] = React.useState<EditState | null>(null);
  const [pagination, setPagination] = React.useState<PaginationData>({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 20,
    sortOrder: "desc",
  });

  // Existing debounce effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchAssets = React.useCallback(
    async (page: number, sortOrder: "asc" | "desc", search: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.itemsPerPage.toString(),
          sortOrder,
          search,
        });

        const response = await fetch(`/api/assets?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch assets");
        const data = await response.json();
        setAssets(data.assets);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [pagination.itemsPerPage]
  );

  React.useEffect(() => {
    fetchAssets(1, pagination.sortOrder, debouncedSearchTerm);
  }, [debouncedSearchTerm, pagination.sortOrder, fetchAssets]);

  const handlePageChange = (page: number) => {
    fetchAssets(page, pagination.sortOrder, debouncedSearchTerm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (sortOrder: "asc" | "desc") => {
    fetchAssets(1, sortOrder, debouncedSearchTerm);
  };

  const startEditing = (id: string, field: string, value: string) => {
    setEditState({ id, field, value });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editState) {
      setEditState({ ...editState, value: e.target.value });
    }
  };

  const handleEditKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!editState) return;

    if (e.key === "Enter") {
      try {
        // Find the asset being edited
        const asset = assets.find((a) => a._id === editState.id);
        if (!asset) throw new Error("Asset not found");

        // Only proceed if the value has changed
        if (
          asset[
            editState.field as keyof Pick<Asset, "name" | "description">
          ] === editState.value
        ) {
          setEditState(null);
          return;
        }

        const response = await fetch(`/api/assets/${editState.id}`, {
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
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update asset");
        }

        // Update local state
        setAssets(
          assets.map((asset) => {
            if (asset._id === editState.id) {
              // Create a new object with all the existing properties
              const updatedAsset = { ...asset };
              // Only update the specific field that was edited
              if (editState.field === "name") {
                updatedAsset.name = editState.value;
              } else if (editState.field === "description") {
                updatedAsset.description = editState.value;
              }
              return updatedAsset;
            }
            return asset;
          })
        );

        setEditState(null);
      } catch (err) {
        console.error("Update error:", err);
        setError(err instanceof Error ? err.message : "Failed to update asset");
        // Refresh the data to ensure we're in sync with the server
        fetchAssets(
          pagination.currentPage,
          pagination.sortOrder,
          debouncedSearchTerm
        );
      }
    } else if (e.key === "Escape") {
      setEditState(null);
    }
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (editState && !(e.target as HTMLElement).closest(".editable-cell")) {
      setEditState(null);
    }
  };

  return (
    <>
      <Navbar />
      <div className="h-screen overflow-y-auto" onClick={handleClickOutside}>
        <div className="container mx-auto px-4 py-24">
          {/* Existing search and sort controls */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Raw Assets Data</h1>
              <div className="flex items-center gap-4">
                <select
                  value={pagination.sortOrder}
                  onChange={(e) =>
                    handleSortChange(e.target.value as "asc" | "desc")
                  }
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}-
                  {Math.min(
                    pagination.currentPage * pagination.itemsPerPage,
                    pagination.totalItems
                  )}{" "}
                  of {pagination.totalItems} assets
                </div>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search by directory name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-lg pl-4 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Loading and error states */}
          {loading && (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-600">Loading...</div>
            </div>
          )}

          {error && (
            <div className="text-red-500 p-4 rounded-lg bg-red-50 mb-4">
              Error: {error}
            </div>
          )}

          {!loading && !error && assets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No assets found matching your search.
            </div>
          )}

          {/* Updated table with editable cells */}
          {!loading && !error && assets.length > 0 && (
            <div className="overflow-x-auto shadow-md rounded-lg mb-8">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Directory
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr
                      key={asset._id}
                      className="bg-white border-b hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/raw/${asset._id}`}
                            className="flex-grow hover:text-blue-600"
                          >
                            {asset.name}
                          </Link>
                          {editState?.id === asset._id &&
                          editState?.field === "name" ? (
                            <input
                              type="text"
                              value={editState.value}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              className="w-full p-1 border rounded"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() =>
                                startEditing(asset._id, "name", asset.name)
                              }
                              className="text-gray-500 hover:text-blue-600"
                              title="Edit name"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/raw/${asset._id}`}
                            className="flex-grow hover:text-blue-600"
                          >
                            {asset.description}
                          </Link>
                          {editState?.id === asset._id &&
                          editState?.field === "description" ? (
                            <input
                              type="text"
                              value={editState.value}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              className="w-full p-1 border rounded"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() =>
                                startEditing(
                                  asset._id,
                                  "description",
                                  asset.description
                                )
                              }
                              className="text-gray-500 hover:text-blue-600"
                              title="Edit description"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {Object.entries(asset.location).map(
                          ([drive, path], index) => (
                            <div key={drive}>
                              <span className="font-medium">{drive}: </span>
                              {path}
                              {index <
                                Object.entries(asset.location).length - 1 && (
                                <br />
                              )}
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Existing pagination controls */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pb-8">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
                className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>

              {[...Array(pagination.totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === pagination.totalPages ||
                  (pageNumber >= pagination.currentPage - 2 &&
                    pageNumber <= pagination.currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      disabled={loading}
                      className={`px-3 py-1 rounded border ${
                        pagination.currentPage === pageNumber
                          ? "bg-gray-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === pagination.currentPage - 3 ||
                  pageNumber === pagination.currentPage + 3
                ) {
                  return <span key={pageNumber}>...</span>;
                }
                return null;
              })}

              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={
                  pagination.currentPage === pagination.totalPages || loading
                }
                className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
