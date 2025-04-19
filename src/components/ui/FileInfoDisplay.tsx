import React from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface FileInfoDisplayProps {
  fileName: string;
  fileUrl: string;
}

export function FileInfoDisplay({ fileName, fileUrl }: FileInfoDisplayProps) {
  const handleCopy = async (text: string, type: "name" | "url") => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type === "name" ? "File name" : "URL"} copied to clipboard`,
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm text-muted-foreground mb-1">File Name</div>
          <div className="font-mono text-sm truncate">{fileName}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopy(fileName, "name")}
          className="shrink-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm text-muted-foreground mb-1">URL</div>
          <div className="font-mono text-sm truncate">{fileUrl}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopy(fileUrl, "url")}
          className="shrink-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
