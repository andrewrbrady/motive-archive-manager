import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface MetadataDisplayProps {
  metadata: any;
  theme?: "light" | "dark";
  searchable?: boolean;
  compact?: boolean;
  maxArrayItems?: number;
  maxStringLength?: number;
}

export function MetadataDisplay({
  metadata,
  theme = "light",
  searchable = false,
  compact = false,
  maxArrayItems = 3,
  maxStringLength = 100,
}: MetadataDisplayProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <div
        className={`text-center py-8 ${
          theme === "dark" ? "text-gray-400" : "text-muted-foreground"
        }`}
      >
        No metadata available
      </div>
    );
  }

  const metadataEntries = Object.entries(metadata);
  const filteredEntries = searchTerm
    ? metadataEntries.filter(
        ([key, value]) =>
          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : metadataEntries;

  const formatValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return (
        <span
          className={`italic ${
            theme === "dark" ? "text-gray-500" : "text-muted-foreground"
          }`}
        >
          null
        </span>
      );
    }

    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-xs">
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    if (typeof value === "number") {
      return (
        <span className="font-mono text-sm">{value.toLocaleString()}</span>
      );
    }

    if (typeof value === "string") {
      // Handle URLs
      if (value.startsWith("http")) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all text-sm ${
              theme === "dark"
                ? "text-blue-400 hover:text-blue-300"
                : "text-blue-600 hover:text-blue-800"
            }`}
          >
            {value}
          </a>
        );
      }

      // Handle very long strings
      if (value.length > maxStringLength) {
        return (
          <div className="space-y-2">
            <div
              className={`p-2 rounded text-xs font-mono break-all max-h-32 overflow-y-auto ${
                theme === "dark" ? "bg-black/20" : "bg-muted/50"
              }`}
            >
              {value}
            </div>
          </div>
        );
      }

      return <span className="break-all text-sm">{value}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <span
            className={`italic text-sm ${
              theme === "dark" ? "text-gray-500" : "text-muted-foreground"
            }`}
          >
            Empty array
          </span>
        );
      }

      return (
        <div className="space-y-1">
          {value.slice(0, maxArrayItems).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {index + 1}
              </Badge>
              <span className="text-xs">{formatValue(item)}</span>
            </div>
          ))}
          {value.length > maxArrayItems && (
            <div
              className={`text-xs ${
                theme === "dark" ? "text-gray-500" : "text-muted-foreground"
              }`}
            >
              ... and {value.length - maxArrayItems} more
            </div>
          )}
        </div>
      );
    }

    if (typeof value === "object") {
      return (
        <div
          className={`p-2 rounded text-xs font-mono break-all max-h-32 overflow-y-auto ${
            theme === "dark" ? "bg-black/20" : "bg-muted/50"
          }`}
        >
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </div>
      );
    }

    return <span className="break-all text-sm">{String(value)}</span>;
  };

  const formatKey = (key: string): string => {
    // Convert camelCase/snake_case to Title Case
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const getPriorityOrder = (key: string): number => {
    // Define priority order for common fields
    const priorities: { [key: string]: number } = {
      description: 1,
      category: 2,
      angle: 3,
      view: 4,
      movement: 5,
      tod: 6,
      side: 7,
      primary_subject: 8,
      content_type: 9,
      style: 10,
      usage_context: 11,
      dominant_colors: 12,
      has_text: 13,
      has_brand_elements: 14,
      width: 15,
      height: 16,
      size: 17,
      format: 18,
      isPrimary: 100, // Show isPrimary at the end
    };

    return priorities[key] || 50; // Default priority for unknown fields
  };

  // Sort entries by priority, then alphabetically
  const sortedEntries = filteredEntries.sort(([keyA], [keyB]) => {
    const priorityA = getPriorityOrder(keyA);
    const priorityB = getPriorityOrder(keyB);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return keyA.localeCompare(keyB);
  });

  return (
    <div className={`space-y-${compact ? "2" : "4"}`}>
      {/* Search/Filter controls */}
      {searchable && metadataEntries.length > 5 && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className={`h-8 ${
              theme === "dark" ? "text-white hover:bg-white/20" : ""
            }`}
          >
            <Search className="h-4 w-4" />
          </Button>
          {showSearch && (
            <Input
              placeholder="Search metadata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`h-8 text-xs ${
                theme === "dark"
                  ? "bg-black/20 border-white/20 text-white placeholder:text-gray-400"
                  : ""
              }`}
            />
          )}
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className={`h-8 ${
                theme === "dark" ? "text-white hover:bg-white/20" : ""
              }`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Metadata entries */}
      <div className={`space-y-${compact ? "2" : "3"}`}>
        {sortedEntries.length === 0 ? (
          <div
            className={`text-center py-4 text-sm ${
              theme === "dark" ? "text-gray-400" : "text-muted-foreground"
            }`}
          >
            No metadata matches your search
          </div>
        ) : (
          sortedEntries.map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium ${
                    theme === "dark" ? "text-gray-400" : "text-muted-foreground"
                  }`}
                >
                  {formatKey(key)}:
                </span>
                {typeof value === "object" && !Array.isArray(value) && (
                  <Badge variant="outline" className="text-xs">
                    Object
                  </Badge>
                )}
                {Array.isArray(value) && (
                  <Badge variant="outline" className="text-xs">
                    Array ({value.length})
                  </Badge>
                )}
              </div>
              <div
                className={`${
                  compact ? "pl-2" : "pl-0"
                } ${compact ? "" : "bg-muted/50 p-2 rounded"} text-xs`}
              >
                {formatValue(value)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Metadata summary */}
      {searchable && searchTerm && (
        <div
          className={`pt-2 border-t ${
            theme === "dark" ? "border-white/20" : ""
          }`}
        >
          <div
            className={`text-xs ${
              theme === "dark" ? "text-gray-400" : "text-muted-foreground"
            }`}
          >
            {filteredEntries.length} of {metadataEntries.length} fields matching
            "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
}

export default MetadataDisplay;
