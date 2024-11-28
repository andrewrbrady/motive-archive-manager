'use client'

import React from 'react';
import { PencilIcon, TrashIcon } from 'lucide-react';
import Link from 'next/link';

interface Location {
  [key: string]: string;
}

interface Asset {
  _id: string;
  name: string;
  description: string;
  location: Location;
  deleteAsset: (id: string) => void;
}

const AssetRow: React.FC<{ asset: Asset; deleteAsset: (id: string) => void }> = ({ asset, deleteAsset }) => {
  return (
    <tr className="bg-white border-b hover:bg-gray-50">
      <td className="px-6 py-4 font-medium text-gray-900">
        <div className="flex items-center space-x-2">
          <Link href={`/raw/${asset._id}`} className="flex-grow hover:text-blue-600">
            {asset.name}
          </Link>
          <button
            onClick={() => deleteAsset(asset._id)}
            className="text-red-500 hover:text-red-700"
            title="Delete asset"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <Link href={`/raw/${asset._id}`} className="text-gray-500 hover:text-blue-600" title="Edit asset">
            <PencilIcon className="h-4 w-4" />
          </Link>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <Link href={`/raw/${asset._id}`} className="flex-grow hover:text-blue-600">
            {asset.description}
          </Link>
        </div>
      </td>
      <td className="px-6 py-4">
        {Object.entries(asset.location).map(([drive, path]) => (
          <div key={drive}>
            <span className="font-medium">{drive}: </span>
            {path}
          </div>
        ))}
      </td>
      <td className="px-6 py-4">
        <Link href={`/raw/${asset._id}`} className="text-gray-500 hover:text-blue-600" title="Edit asset">
          <PencilIcon className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
};

export default AssetRow;
