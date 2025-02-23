"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import { UploadIcon } from "lucide-react";

export default function ImportRawAssets() {
  const router = useRouter();
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
        router.push("/raw");
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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Import Raw Assets</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <UploadIcon className="w-12 h-12 text-zinc-400 mb-4" />
                <p className="text-lg font-medium mb-2">Upload CSV File</p>
                <p className="text-sm text-zinc-500 mb-4">
                  Select a CSV file containing your raw assets data
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-zinc-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-info-50 file:text-info-700
                    hover:file:bg-info-100"
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive-100 border border-destructive-400 text-destructive-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!file || loading}
                className="px-4 py-2 bg-info-500 text-white rounded hover:bg-info-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Importing..." : "Import Data"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
