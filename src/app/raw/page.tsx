"use client";

import React from "react";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import AssetRow from '@/components/raw/AssetRow';
import { PencilIcon, CheckIcon, XIcon } from "lucide-react";

interface Location {
  [key: string]: string;
}

interface Asset {
  _id: string;
  name: string;
  description: string;
  location: Location;
}

export default function RawPage() {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete asset');
      setAssets((prev) => prev.filter((asset) => asset._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  React.useEffect(() => {
    fetchAssets();
  }, []);

  return (
    <>
      <Navbar />
      <div className="h-screen overflow-y-auto">
        <div className="container mx-auto px-4 py-24">
          <Link href="/add-asset" className="bg-red-500 text-white px-6 py-3 rounded mb-8 hover:bg-red-600 transition-all duration-200">
            Add New Asset
          </Link>
          {error && <div className="text-red-500 mb-4">Error: {error}</div>}
          {loading ? (
            <div className="text-gray-600 mb-4">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="text-gray-600 mb-4">No assets found.</div>
          ) : (
            <div className="overflow-x-auto shadow-md rounded-lg mb-8">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Description</th>
                    <th scope="col" className="px-6 py-3">Location</th>
                    <th scope="col" className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <AssetRow key={asset._id} asset={asset} deleteAsset={deleteAsset} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
