"use client";

import React, { useState } from "react";
import { XIcon, UploadIcon } from "lucide-react";

interface ImportRawAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

export default function ImportRawAssetsModal({
  isOpen,
  onClose,
  onImport,
}: ImportRawAssetsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please select a valid CSV file");
      setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const rows = text.split("\n").map((row) => row.split(","));
      const headers = rows[0];

      // Convert CSV to array of objects
      const data = rows.slice(1).map((row) => {
        const obj: { [key: string]: string } = {};
        headers.forEach((header, index) => {
          obj[header.trim()] = row[index]?.trim() || "";
        });
        return obj;
      });

      // Send to API
      const response = await fetch("/api/raw/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to import data");
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
          <h2 className="text-xl font-semibold">Import Raw Assets</h2>
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
                Select a CSV file containing your raw assets data
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

          {error && (
            <div className="bg-destructive-100 border border-destructive-400 text-destructive-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[hsl(var(--border))] rounded hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded hover:bg-[hsl(var(--primary))/90] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Importing..." : "Import Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
