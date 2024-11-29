"use client";
import React from "react";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import AssetRow from "@/components/raw/AssetRow";
import Pagination from "@/components/Pagination";
import { FuzzySearchBar } from "@/components/SearchBar";
import { PencilIcon, ArrowDown, ArrowUp } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import _ from "lodash";

interface Location {
  [key: string]: string;
}

interface Asset {
  _id: string;
  name: string;
  description: string;
  location: Location;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type SortDirection = "asc" | "desc" | null;
type SortField = "name" | "createdAt";

const LIMIT_OPTIONS = [10, 25, 50, 100];

const RawPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState(
    searchParams.get("search") || ""
  );
  const [sortField, setSortField] = React.useState<SortField>("name");
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>("desc");
  const [searchSuggestions, setSearchSuggestions] = React.useState<string[]>(
    []
  );
  const [pagination, setPagination] = React.useState<PaginationData>({
    total: 0,
    page: 1,
    limit: parseInt(searchParams.get("limit") || "10"),
    totalPages: 1,
  });

  const createQueryString = (params: {
    [key: string]: string | number | null;
  }) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });

    return current.toString();
  };

  const fetchAssets = async (
    page: number = 1,
    search: string = searchTerm,
    field: SortField = sortField,
    direction: SortDirection = sortDirection,
    limit: number = pagination.limit
  ) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = createQueryString({
        page,
        search: search || null,
        sortField: field,
        sortDirection: direction,
        limit,
      });
      router.push(`${pathname}?${queryString}`);

      const response = await fetch(
        `/api/assets?page=${page}&limit=${limit}&search=${encodeURIComponent(
          search
        )}&sortField=${field}&sortDirection=${direction}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }
      const data = await response.json();
      setAssets(data.assets);
      setPagination({ ...data.pagination, limit });

      // Update search suggestions based on all asset names
      const uniqueNames = _.uniq(data.assets.map((asset: Asset) => asset.name));
      setSearchSuggestions(uniqueNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = React.useCallback(
    _.debounce((searchValue: string) => {
      fetchAssets(1, searchValue, sortField, sortDirection, pagination.limit);
    }, 300),
    [sortField, sortDirection, pagination.limit]
  );

  const handleSort = () => {
    if (sortField === "name") {
      setSortField("createdAt");
      setSortDirection("desc");
      fetchAssets(
        pagination.page,
        searchTerm,
        "createdAt",
        "desc",
        pagination.limit
      );
      return;
    }

    let newDirection: SortDirection;
    if (sortDirection === "asc") {
      newDirection = "desc";
    } else if (sortDirection === "desc") {
      setSortField("name");
      setSortDirection("desc");
      fetchAssets(
        pagination.page,
        searchTerm,
        "name",
        "desc",
        pagination.limit
      );
      return;
    } else {
      newDirection = "asc";
    }

    setSortDirection(newDirection);
    fetchAssets(
      pagination.page,
      searchTerm,
      "createdAt",
      newDirection,
      pagination.limit
    );
  };

  const handleSearch = () => {
    fetchAssets(1, searchTerm, sortField, sortDirection, pagination.limit);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.length >= 2) {
      debouncedFetch(value);
    }
  };

  const handlePageChange = (page: number) => {
    fetchAssets(page, searchTerm, sortField, sortDirection, pagination.limit);
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(event.target.value);
    fetchAssets(1, searchTerm, sortField, sortDirection, newLimit);
  };

  const deleteAsset = async (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      try {
        const response = await fetch(`/api/assets/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete asset");
        }
        fetchAssets(
          pagination.page,
          searchTerm,
          sortField,
          sortDirection,
          pagination.limit
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    }
  };

  React.useEffect(() => {
    const initialPage = parseInt(searchParams.get("page") || "1");
    const initialSearch = searchParams.get("search") || "";
    const initialLimit = parseInt(searchParams.get("limit") || "10");
    const initialSortField =
      (searchParams.get("sortField") as SortField) || "name";
    const initialSortDirection =
      (searchParams.get("sortDirection") as SortDirection) || "desc";

    setSearchTerm(initialSearch);
    setSortField(initialSortField);
    setSortDirection(initialSortDirection);
    fetchAssets(
      initialPage,
      initialSearch,
      initialSortField,
      initialSortDirection,
      initialLimit
    );
  }, []);

  const getSortIndicator = () => {
    if (sortField === "name") {
      return null;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-4 h-4 inline-block ml-1" />;
    }
    return <ArrowDown className="w-4 h-4 inline-block ml-1" />;
  };

  return (
    <>
      <Navbar />
      <div className="h-screen overflow-y-auto">
        <div className="container mx-auto px-4 py-24">
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <div className="text-sm text-gray-600">
                  Total Assets: {pagination.total}
                </div>
                <div className="flex items-center space-x-2">
                  <label htmlFor="limit" className="text-sm text-gray-600">
                    Show:
                  </label>
                  <select
                    id="limit"
                    value={pagination.limit}
                    onChange={handleLimitChange}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {LIMIT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label htmlFor="sort" className="text-sm text-gray-600">
                    Sort by:
                  </label>
                  <select
                    id="sort"
                    value={`${sortField}-${sortDirection}`}
                    onChange={(e) => {
                      const [field, direction] = e.target.value.split("-") as [
                        SortField,
                        SortDirection
                      ];
                      setSortField(field);
                      setSortDirection(direction);
                      fetchAssets(
                        1,
                        searchTerm,
                        field,
                        direction,
                        pagination.limit
                      );
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                  </select>
                </div>
              </div>
              <Link
                href="/add-asset"
                className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all duration-200"
                aria-label="Add New Asset"
              >
                <PencilIcon className="w-5 h-5" />
              </Link>
            </div>
            <FuzzySearchBar
              value={searchTerm}
              onChange={handleSearchChange}
              onSearch={handleSearch}
              suggestions={searchSuggestions}
              maxSuggestions={5}
            />
          </div>

          {error && <div className="text-red-500 mb-4">Error: {error}</div>}

          {loading ? (
            <div className="text-gray-600 mb-4">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="text-gray-600 mb-4">
              {searchTerm
                ? `No assets found matching "${searchTerm}"`
                : "No assets found."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto shadow-md rounded-lg mb-8">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Location
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <AssetRow
                        key={asset._id}
                        asset={asset}
                        deleteAsset={deleteAsset}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />

              <div className="text-sm text-gray-600 text-center mt-2">
                Showing page {pagination.page} of {pagination.totalPages}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default RawPage;
