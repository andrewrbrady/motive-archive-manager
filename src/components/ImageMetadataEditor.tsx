import React, { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
  updateCloudflareImageMetadata,
  deleteCloudflareImageMetadata,
} from "@/lib/cloudflare";

interface ImageMetadataEditorProps {
  imageId: string;
  metadata: Record<string, any>;
  onMetadataChange: (newMetadata: Record<string, any>) => void;
}

export const ImageMetadataEditor: React.FC<ImageMetadataEditorProps> = ({
  imageId,
  metadata,
  onMetadataChange,
}) => {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMetadata = async () => {
    if (!newKey || !newValue) return;
    setIsLoading(true);

    const updatedMetadata = {
      ...metadata,
      [newKey]: newValue,
    };

    const success = await updateCloudflareImageMetadata(
      imageId,
      updatedMetadata
    );
    if (success) {
      onMetadataChange(updatedMetadata);
      setNewKey("");
      setNewValue("");
    }

    setIsLoading(false);
  };

  const handleUpdateMetadata = async (key: string, value: string) => {
    setIsLoading(true);

    const updatedMetadata = {
      ...metadata,
      [key]: value,
    };

    const success = await updateCloudflareImageMetadata(
      imageId,
      updatedMetadata
    );
    if (success) {
      onMetadataChange(updatedMetadata);
    }

    setIsLoading(false);
  };

  const handleDeleteMetadata = async (key: string) => {
    setIsLoading(true);

    const success = await deleteCloudflareImageMetadata(imageId, key);
    if (success) {
      const updatedMetadata = { ...metadata };
      delete updatedMetadata[key];
      onMetadataChange(updatedMetadata);
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="text"
              value={key}
              disabled
              className="px-2 py-1 border rounded bg-gray-50"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => handleUpdateMetadata(key, e.target.value)}
              className="px-2 py-1 border rounded flex-1"
            />
            <button
              onClick={() => handleDeleteMetadata(key)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Key"
          className="px-2 py-1 border rounded"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value"
          className="px-2 py-1 border rounded flex-1"
        />
        <button
          onClick={handleAddMetadata}
          disabled={!newKey || !newValue || isLoading}
          className="p-1 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
