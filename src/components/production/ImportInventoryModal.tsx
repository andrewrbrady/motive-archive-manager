"use client";

import React, { useState } from "react";
import { XIcon, UploadIcon } from "lucide-react";
import Papa from "papaparse";
import { StudioInventoryItem, InventoryCategory } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

interface ImportInventoryResponse {
  success: boolean;
  error?: string;
  count?: number;
}

export default function ImportInventoryModal({
  isOpen,
  onClose,
  onImport,
}: ImportInventoryModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [hasPreview, setHasPreview] = useState(false);
  const api = useAPI();

  // Authentication check
  if (!api) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[hsl(var(--background))] rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
      generatePreview(selectedFile);
    } else {
      setError("Please select a valid CSV file");
      setFile(null);
      setPreview([]);
      setHasPreview(false);
    }
  };

  const generatePreview = (file: File) => {
    Papa.parse(file, {
      header: true,
      preview: 3, // Show only first 3 rows in preview
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data);
        setHasPreview(true);
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
        setPreview([]);
        setHasPreview(false);
      },
    });
  };

  // Helper function to clean and parse currency values
  const parseCurrency = (value: string): number | undefined => {
    if (!value || value.trim() === "") return undefined;

    // Remove currency symbols, spaces, and commas
    const cleanedValue = value.replace(/[$,\s]/g, "");
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? undefined : number;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !api) return;

    setLoading(true);
    setError(null);

    try {
      // Parse the CSV file
      const parseResult = await new Promise<Papa.ParseResult<any>>(
        (resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject,
          });
        }
      );

      if (parseResult.errors.length > 0) {
        throw new Error(
          `CSV parsing errors: ${parseResult.errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      // Transform CSV data to match the API format
      const inventoryItems = parseResult.data.map((row: any) => {
        // Generate a name for the item if not provided
        const name =
          row["Name"] ||
          (row["Manufacturer"] && row["Model"]
            ? `${row["Manufacturer"]} ${row["Model"]}`
            : row["Model"] || "Unnamed Item");

        // Normalize categories to match InventoryCategory type
        const category = row["Category"] || "Other";

        // Parse the rental price, handling currency symbols
        const rentalPrice = parseCurrency(row["Rental Price"]);

        // Parse quantity, defaulting to 1 if not provided or invalid
        const quantity = row["Quantity"] ? parseInt(row["Quantity"], 10) : 1;

        // Get manufacturer and model
        const manufacturer = row["Manufacturer"] || "";
        const model = row["Model"] || "";

        // Default values for required fields
        return {
          name: name,
          category: category as InventoryCategory,
          manufacturer: manufacturer,
          model: model || name, // Use name as model if not provided
          condition: row["Condition"] || "good",
          isAvailable: true,
          quantity: isNaN(quantity) ? 1 : quantity,
          tags: row["Tags"]
            ? row["Tags"]
                .split(",")
                .map((tag: string) => tag.trim())
                .filter(Boolean)
            : [],
          rentalPrice: rentalPrice,
          // Add other fields if present in the CSV
          subCategory: row["Sub-Category"] || row["SubCategory"] || undefined,
          serialNumber: row["Serial Number"] || undefined,
          notes: row["Notes"] || undefined,
          location: row["Location"] || undefined,
        };
      });

      // Send to API using authenticated API client
      const result = await api.post<ImportInventoryResponse>(
        "studio_inventory/batch/import",
        {
          items: inventoryItems,
        }
      );

      if (result.success) {
        toast.success(
          `Successfully imported ${result.count || inventoryItems.length} inventory items`
        );
        onImport();
        onClose();
      } else {
        throw new Error(result.error || "Failed to import data");
      }
    } catch (err) {
      console.error("Error importing data:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to import data";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[hsl(var(--background))] rounded-lg shadow-lg w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center p-6 border-b border-[hsl(var(--border))]">
          <h2 className="text-xl font-semibold">Import Inventory Items</h2>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <UploadIcon className="w-12 h-12 text-[hsl(var(--muted-foreground))] mb-4" />
              <p className="text-lg font-medium mb-2">Upload CSV File</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                Select a CSV file containing your inventory data
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-[hsl(var(--muted-foreground))]
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[hsl(var(--secondary))] file:text-[hsl(var(--secondary-foreground))]
                  hover:file:bg-[hsl(var(--secondary))/90]"
              />
            </div>
          </div>

          <div className="bg-[hsl(var(--muted))/20] p-4 rounded-md text-sm">
            <h3 className="font-medium mb-2">Expected CSV Format</h3>
            <p className="mb-2">Your CSV should include these columns:</p>
            <ul className="list-disc pl-5 mb-2 space-y-1">
              <li>Manufacturer - The equipment manufacturer</li>
              <li>Model - The specific model name/number</li>
              <li>Category - Equipment category (Grip, Lighting, etc.)</li>
              <li>Quantity - Number of items (defaults to 1)</li>
              <li>Rental Price - Daily rental rate (can include $ symbol)</li>
            </ul>
            <p>
              Additional columns like Name, Sub-Category, Serial Number, etc.
              will also be imported if present.
            </p>
          </div>

          {hasPreview && preview.length > 0 && (
            <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
              <div className="text-sm font-medium p-3 bg-[hsl(var(--muted))]">
                Preview (first 3 rows)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    <tr>
                      {Object.keys(preview[0])
                        .slice(0, 5)
                        .map((header) => (
                          <th key={header} className="px-4 py-2 text-left">
                            {header}
                          </th>
                        ))}
                      {Object.keys(preview[0]).length > 5 && (
                        <th className="px-4 py-2 text-left">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-[hsl(var(--border))]"
                      >
                        {Object.values(row)
                          .slice(0, 5)
                          .map((value, j) => (
                            <td key={j} className="px-4 py-2">
                              {String(value || "")}
                            </td>
                          ))}
                        {Object.values(row).length > 5 && (
                          <td className="px-4 py-2">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-[hsl(var(--destructive)/15)] border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Importing...</span>
                </div>
              ) : (
                "Import Data"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
