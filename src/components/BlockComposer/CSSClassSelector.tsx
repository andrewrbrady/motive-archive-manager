"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Palette, Eye, Code, EyeOff } from "lucide-react";
import { CSSClass } from "@/lib/css-parser";
import { ClassSearchResponse } from "@/types/stylesheet";
import { classToInlineStyles } from "@/lib/css-parser";

interface CSSClassSelectorProps {
  stylesheetId: string;
  selectedClassName?: string;
  onClassSelect: (cssClass: CSSClass | null) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function CSSClassSelector({
  stylesheetId,
  selectedClassName,
  onClassSelect,
  trigger,
  className,
}: CSSClassSelectorProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<CSSClass[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [previewClass, setPreviewClass] = useState<CSSClass | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open && stylesheetId) {
      fetchClasses();
    }
  }, [open, stylesheetId, searchQuery, selectedCategory]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);
      params.append("limit", "100");

      const response = await fetch(
        `/api/stylesheets/${stylesheetId}/classes?${params}`
      );
      if (response.ok) {
        const data: ClassSearchResponse = await response.json();

        // Deduplicate classes by name to prevent React key conflicts and UI confusion
        const uniqueClasses = data.classes.reduce(
          (acc: CSSClass[], currentClass: CSSClass) => {
            const existingClass = acc.find(
              (cls) => cls.name === currentClass.name
            );
            if (!existingClass) {
              acc.push(currentClass);
            }
            return acc;
          },
          []
        );

        setClasses(uniqueClasses);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (cssClass: CSSClass) => {
    onClassSelect(cssClass);
    setOpen(false);
  };

  const selectedClass = classes.find((cls) => cls.name === selectedClassName);

  const defaultTrigger = (
    <Button
      variant={selectedClassName ? "default" : "outline"}
      size="sm"
      className={className}
    >
      <Palette className="h-3 w-3 mr-1" />
      {selectedClassName ? (
        <span className="font-mono text-xs">.{selectedClassName}</span>
      ) : (
        "Add Style"
      )}
    </Button>
  );

  if (!stylesheetId) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Palette className="h-3 w-3 mr-1" />
        No Stylesheet
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="font-medium text-sm">Select CSS Class</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Preview</span>
              <Button
                variant={showPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-8 w-8 p-0 border-2"
                title={showPreview ? "Hide preview" : "Show preview"}
              >
                {showPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>

            <Select
              value={selectedCategory || "all"}
              onValueChange={(value) =>
                setSelectedCategory(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-64">
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Loading classes...
              </div>
            ) : classes.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                No classes found
              </div>
            ) : (
              <>
                <div className="mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto p-2 text-left"
                    onClick={() => handleClassSelect(null as any)}
                  >
                    <div>
                      <div className="font-mono text-xs">No style</div>
                      <div className="text-xs text-muted-foreground">
                        Remove custom styling
                      </div>
                    </div>
                  </Button>
                </div>

                {classes.map((cssClass, index) => (
                  <div key={`${cssClass.name}-${index}`} className="mb-1">
                    <Button
                      variant={
                        selectedClassName === cssClass.name
                          ? "secondary"
                          : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start h-auto p-2 text-left relative group"
                      onClick={() => handleClassSelect(cssClass)}
                      onMouseEnter={() =>
                        showPreview && setPreviewClass(cssClass)
                      }
                      onMouseLeave={() => showPreview && setPreviewClass(null)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs bg-muted px-1 rounded">
                            .{cssClass.name}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {cssClass.category}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {cssClass.description}
                        </div>
                      </div>

                      {showPreview && (
                        <div
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-muted/20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewClass(
                              previewClass?.name === cssClass.name
                                ? null
                                : cssClass
                            );
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </div>
                      )}
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        {showPreview && previewClass && (
          <div className="border-t p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-3 w-3" />
              <span className="font-mono text-xs">.{previewClass.name}</span>
            </div>
            <div className="space-y-1">
              {Object.entries(previewClass.properties)
                .slice(0, 3)
                .map(([prop, value]) => (
                  <div
                    key={prop}
                    className="text-xs font-mono text-muted-foreground"
                  >
                    {prop}: {value};
                  </div>
                ))}
              {Object.keys(previewClass.properties).length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{Object.keys(previewClass.properties).length - 3} more
                  properties
                </div>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
