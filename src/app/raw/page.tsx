"use client";
import React, { useCallback, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import AssetRow from "@/components/raw/AssetRow";
import Pagination from "@/components/Pagination";
import { FuzzySearchBar } from "@/components/SearchBar";
import { PencilIcon } from "lucide-react";
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
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
    totalPages: 0,
  });

  const createQueryString = useCallback(
    (params: { [key: string]: string | number | null }) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }
      });
      return newSearchParams.toString();
    },
    [searchParams]
  );

  const fetchAssets = useCallback(
    async (
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

        const response = await fetch(`/api/assets?${queryString}`);
        if (!response.ok) throw new Error("Failed to fetch assets");

        const data = await response.json();
        setAssets(data.assets);
        setPagination({
          total: data.total,
          page: data.page,
          limit: data.limit,
          totalPages: data.totalPages,
        });

        // Update search suggestions based on all asset names
        const uniqueNames = _.uniq(
          data.assets.map((asset: Asset) => asset.name)
        ) as string[];
        setSearchSuggestions(uniqueNames);
      } catch (err) {
        setError("Failed to fetch assets");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, sortField, sortDirection, pagination.limit, createQueryString]
  );

  useEffect(() => {
    fetchAssets(pagination.page);
  }, [fetchAssets, pagination.page, searchParams]);

  const handleSearch = () => {
    router.push(
      `${pathname}?${createQueryString({ page: 1, search: searchTerm })}`
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (!value) {
      router.push(
        `${pathname}?${createQueryString({ search: null, page: 1 })}`
      );
    }
  };

  const handlePageChange = (page: number) => {
    router.push(`${pathname}?${createQueryString({ page })}`);
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(event.target.value);
    router.push(
      `${pathname}?${createQueryString({ limit: newLimit, page: 1 })}`
    );
  };

  const deleteAsset = async (id: string) => {
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }

      // Refetch assets after successful deletion
      fetchAssets(pagination.page);
    } catch (err) {
      setError("Failed to delete asset");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Raw Assets</h1>
            <Link
              href="/add-asset"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <PencilIcon className="w-4 h-4" />
              Add Asset
            </Link>
          </div>

          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <FuzzySearchBar
                value={searchTerm}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                suggestions={searchSuggestions}
                placeholder="Search assets..."
              />
            </div>
            <select
              value={pagination.limit}
              onChange={handleLimitChange}
              className="px-3 py-2 border rounded"
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      No assets found
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <AssetRow
                      key={asset._id}
                      asset={asset}
                      onDelete={() => deleteAsset(asset._id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.limit}
                onChange={handlePageChange}
                useUrlPagination={false}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RawPage;
