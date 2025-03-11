"use client";

import React, { useState } from "react";
import { XIcon, UploadIcon } from "lucide-react";
import Papa from "papaparse";
import { StudioInventoryItem, InventoryCategory } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

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
        // Convert "Yes"/"No" to boolean
        const isAvailable = row["Is Available"]?.toLowerCase() === "yes";

        // Parse dates
        const purchaseDate = row["Purchase Date"]
          ? new Date(row["Purchase Date"])
          : undefined;
        const lastMaintenanceDate = row["Last Maintenance Date"]
          ? new Date(row["Last Maintenance Date"])
          : undefined;
        const warrantyExpirationDate = row["Warranty Expiration Date"]
          ? new Date(row["Warranty Expiration Date"])
          : undefined;
        const checkoutDate = row["Checkout Date"]
          ? new Date(row["Checkout Date"])
          : undefined;
        const expectedReturnDate = row["Expected Return Date"]
          ? new Date(row["Expected Return Date"])
          : undefined;

        // Parse numeric values
        const purchasePrice = row["Purchase Price"]
          ? parseFloat(row["Purchase Price"])
          : undefined;
        const currentValue = row["Current Value"]
          ? parseFloat(row["Current Value"])
          : undefined;

        // Parse tags
        const tags = row["Tags"]
          ? row["Tags"]
              .split(",")
              .map((tag: string) => tag.trim())
              .filter(Boolean)
          : [];

        return {
          name: row["Name"] || "",
          category: (row["Category"] as InventoryCategory) || "other",
          subCategory: row["Sub Category"] || undefined,
          manufacturer: row["Manufacturer"] || "",
          model: row["Model"] || "",
          serialNumber: row["Serial Number"] || undefined,
          purchaseDate,
          lastMaintenanceDate,
          condition: row["Condition"] || "good",
          notes: row["Notes"] || undefined,
          location: row["Location"] || undefined,
          isAvailable,
          currentKitId: row["Current Kit ID"] || undefined,
          purchasePrice,
          currentValue,
          tags,
          powerRequirements: row["Power Requirements"] || undefined,
          dimensions: row["Dimensions"] || undefined,
          manualUrl: row["Manual URL"] || undefined,
          warrantyExpirationDate,
          serviceProvider: row["Service Provider"] || undefined,
          serviceContactInfo: row["Service Contact Info"] || undefined,
          checkedOutTo: row["Checked Out To"] || undefined,
          checkoutDate,
          expectedReturnDate,
        };
      });

      // Send to API
      const response = await fetch("/api/studio_inventory/batch/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: inventoryItems }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import data");
      }

      const result = await response.json();
      if (result.success) {
        onImport();
        onClose();
      } else {
        throw new Error(result.error || "Failed to import data");
      }
    } catch (err) {
      console.error("Error importing data:", err);
      setError(err instanceof Error ? err.message : "Failed to import data");
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
