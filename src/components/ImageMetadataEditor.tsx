import React, { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
  updateCloudflareImageMetadata,
  deleteCloudflareImageMetadata,
} from "@/lib/cloudflare";
import { CarImage } from "@/types/car";

// Define the metadata structure that matches the CarImage interface
interface ImageMetadataFields {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
}

type MetadataKey = keyof ImageMetadataFields;

interface ImageMetadataEditorProps {
  imageId: string;
  metadata: ImageMetadataFields;
  onMetadataChange: (newMetadata: ImageMetadataFields) => void;
}

const ALLOWED_METADATA_FIELDS = [
  "angle",
  "description",
  "movement",
  "tod",
  "view",
  "side",
] as const;

export const ImageMetadataEditor: React.FC<ImageMetadataEditorProps> = ({
  imageId,
  metadata,
  onMetadataChange,
}) => {
  const [newKey, setNewKey] = useState<MetadataKey>("angle");
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
      setNewKey("angle");
      setNewValue("");
    }

    setIsLoading(false);
  };

  const handleUpdateMetadata = async (key: MetadataKey, value: string) => {
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

  const handleDeleteMetadata = async (key: MetadataKey) => {
    setIsLoading(true);

    const success = await deleteCloudflareImageMetadata(imageId, key);
    if (success) {
      const updatedMetadata = { ...metadata };
      delete updatedMetadata[key];
      onMetadataChange(updatedMetadata);
    }

    setIsLoading(false);
  };

  const getMetadataValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (value === undefined) return "";
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Object.entries(metadata)
          .filter(([key]) =>
            ALLOWED_METADATA_FIELDS.includes(key as MetadataKey)
          )
          .map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="text"
                value={key}
                disabled
                className="px-2 py-1 border rounded bg-[hsl(var(--background))]"
              />
              <input
                type="text"
                value={getMetadataValue(value)}
                onChange={(e) =>
                  handleUpdateMetadata(key as MetadataKey, e.target.value)
                }
                className="px-2 py-1 border rounded flex-1"
              />
              <button
                onClick={() => handleDeleteMetadata(key as MetadataKey)}
                className="p-1 text-destructive-500 hover:bg-destructive-50 rounded"
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={newKey}
          onChange={(e) => setNewKey(e.target.value as MetadataKey)}
          className="px-2 py-1 border rounded"
        >
          {ALLOWED_METADATA_FIELDS.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
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
          className="p-1 text-info-500 hover:bg-info-50 rounded disabled:opacity-50"
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
