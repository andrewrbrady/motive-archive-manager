"use client";

import React from "react";
import { Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface ResearchFile {
  _id: string;
  filename: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    type?: string;
    size?: number;
    description?: string;
  };
}

interface ResearchListProps {
  carId: string;
  research: ResearchFile[];
  onResearchUpdated: () => void;
}

export function ResearchList({
  carId,
  research,
  onResearchUpdated,
}: ResearchListProps): JSX.Element {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this research file?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/research/${fileId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ carId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete research file");
      }

      onResearchUpdated();
    } catch (error) {
      console.error("Error deleting research file:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (file: ResearchFile) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  if (research.length === 0) {
    return (
      <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
        No research files uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[hsl(var(--border-subtle))]">
              <th className="text-left py-2 px-4">File Name</th>
              <th className="text-left py-2 px-4">Type</th>
              <th className="text-left py-2 px-4">Size</th>
              <th className="text-left py-2 px-4">Uploaded</th>
              <th className="text-right py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {research.map((file) => (
              <tr
                key={file._id}
                className="border-b border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--background))]"
              >
                <td className="py-2 px-4">{file.filename}</td>
                <td className="py-2 px-4">
                  {file.metadata?.type || "Unknown"}
                </td>
                <td className="py-2 px-4">
                  {file.metadata?.size
                    ? `${Math.round(file.metadata.size / 1024)} KB`
                    : "Unknown"}
                </td>
                <td className="py-2 px-4">
                  {formatDistanceToNow(new Date(file.createdAt), {
                    addSuffix: true,
                  })}
                </td>
                <td className="py-2 px-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file._id)}
                      disabled={isDeleting}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
