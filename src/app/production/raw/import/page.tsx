"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Upload, CheckCircle, XCircle, FileText } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

export default function RawImportPage() {
  const router = useRouter();
  const api = useAPI();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

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

  const handleImport = async () => {
    if (!api) {
      toast({
        title: "Authentication Required",
        description: "Please log in to import raw data",
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const data = text.split("\n").filter((line) => line.trim());

        const response = (await api.post("/raw/import", {
          data: data,
          preserveExisting: true,
        })) as any;

        setResults(response.results || []);

        if (response.success) {
          toast({
            title: "Success",
            description: `Import completed: ${response.imported || 0} items processed`,
          });
          router.push("/production?tab=raw-assets");
        } else {
          toast({
            title: "Warning",
            description: "Import completed with some errors",
            variant: "destructive",
          });
        }
      };

      reader.readAsText(file);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import raw data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!api) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center mt-8">
            <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground">
              Please log in to import raw data
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Import Raw Assets</h1>

          <form onSubmit={handleImport} className="space-y-6">
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="w-12 h-12 text-zinc-400 mb-4" />
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
