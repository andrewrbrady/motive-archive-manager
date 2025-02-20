"use client";

import * as React from "react";
import { X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  menuPortalTarget?: HTMLElement;
  styles?: {
    menuPortal: (base: any) => React.CSSProperties;
  };
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select items...",
  className,
  menuPortalTarget,
  styles,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    console.log("MultiSelect mounted with value:", value);
  }, []);

  const selectedItems = value
    .map((v) => options.find((opt) => opt.value === v)?.label)
    .filter(Boolean);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (optionValue: string) => {
    console.log(
      "toggleOption called for:",
      optionValue,
      "with current value:",
      value
    );
    let newValue;
    if (value.includes(optionValue)) {
      newValue = value.filter((v) => v !== optionValue);
      console.log("Removing option. New value:", newValue);
    } else {
      newValue = [...value, optionValue];
      console.log("Adding option. New value:", newValue);
    }
    onChange(newValue);
  };

  const handleLabelClick = (
    e: React.MouseEvent<HTMLLabelElement>,
    optionValue: string
  ) => {
    console.log(
      "Label clicked for option:",
      optionValue,
      "Event target:",
      e.target
    );
    e.preventDefault(); // Prevent any default behavior
    toggleOption(optionValue);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between hover:bg-gray-50 dark:hover:bg-gray-800",
            selectedItems.length > 0 ? "h-full min-h-[2.5rem] py-2" : "h-10",
            className
          )}
        >
          <div className="flex gap-1 flex-wrap">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <Badge
                  variant="secondary"
                  key={item}
                  className="mr-1 mb-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    const optionValue = options.find(
                      (opt) => opt.label === item
                    )?.value;
                    if (optionValue) {
                      toggleOption(optionValue);
                    }
                  }}
                >
                  {item}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-gray-200 dark:hover:bg-gray-700"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        const optionValue = options.find(
                          (opt) => opt.label === item
                        )?.value;
                        if (optionValue) {
                          toggleOption(optionValue);
                        }
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <X className="h-3 w-3 hover:text-gray-600 dark:hover:text-gray-300" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg"
        style={{
          ...(styles?.menuPortal ? styles.menuPortal({}) : {}),
          ...(menuPortalTarget ? { zIndex: 9999 } : {}),
        }}
      >
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          className="mb-2 bg-transparent"
        />
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {filteredOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={(e) => handleLabelClick(e, option.value)}
            >
              <Checkbox
                checked={value.includes(option.value)}
                className="border border-gray-300 dark:border-gray-600 rounded"
                readOnly
              />
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {option.label}
              </span>
            </label>
          ))}
          {filteredOptions.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              No options found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
