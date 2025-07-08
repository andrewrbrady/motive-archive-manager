"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/components/ui/IconPicker";

interface Option {
  label: string;
  value: string;
  icon?: string;
}

interface MultiSelectProps {
  options: Option[];
  value: Option[];
  onChange: (value: Option[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  className,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (option: Option) => {
    onChange(value.filter((v) => v.value !== option.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && value.length > 0) {
          const newValue = [...value];
          newValue.pop();
          onChange(newValue);
        }
      }
      if (e.key === "Escape") {
        input.blur();
        setOpen(false);
      }
    }
  };

  const selectables = options.filter(
    (option) => !value.some((v) => v.value === option.value)
  );

  // Filter options based on search input
  const filteredOptions = options.filter((option) => {
    const matchesSearch =
      inputValue === "" ||
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase());
    return matchesSearch;
  });

  const isSelected = (option: Option) => {
    return value.some((v) => v.value === option.value);
  };

  const handleSelect = (option: Option) => {
    setInputValue("");
    if (isSelected(option)) {
      // Unselect if already selected
      onChange(value.filter((v) => v.value !== option.value));
    } else {
      // Select if not selected
      onChange([...value, option]);
    }
  };

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={cn("overflow-visible", className)}
    >
      <div
        className="group border border-[hsl(var(--border))] px-3 py-2 text-sm ring-offset-[hsl(var(--background))] rounded-md focus-within:ring-2 focus-within:ring-[hsl(var(--ring))] focus-within:ring-offset-2 bg-[hsl(var(--background))]"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        <div className="flex gap-1 flex-wrap">
          {value.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="rounded-sm px-1 font-normal"
            >
              {option.label}
              <button
                className="ml-1 ring-offset-[hsl(var(--background))] rounded-full outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus-ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(option);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnselect(option);
                }}
              >
                <X className="h-3 w-3 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={(e) => {
              // Only close if not clicking inside the dropdown
              setTimeout(() => {
                // If currentTarget is null, user clicked outside, so close dropdown
                // If currentTarget exists, check if click was outside dropdown
                const shouldClose =
                  !e.currentTarget ||
                  !e.currentTarget.closest("[data-multi-select-dropdown]");

                if (shouldClose) {
                  setOpen(false);
                  setInputValue("");
                }
              }, 150);
            }}
            onFocus={() => setOpen(true)}
            placeholder={value.length === 0 ? placeholder : undefined}
            className="ml-2 bg-transparent outline-none placeholder:text-[hsl(var(--foreground-muted))] text-[hsl(var(--foreground))] flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && options.length > 0 ? (
          <div
            data-multi-select-dropdown
            className="absolute w-full z-50 top-0 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-md outline-none animate-in overflow-hidden"
          >
            <div className="max-h-[200px] overflow-auto p-1">
              <div className="space-y-0.5">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-[hsl(var(--foreground-muted))] text-center">
                    {inputValue ? "No results found" : "No options available"}
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const selected = isSelected(option);
                    const IconComponent = option.icon
                      ? getIconComponent(option.icon)
                      : null;
                    return (
                      <div
                        key={option.value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(option);
                        }}
                        className={cn(
                          "cursor-pointer rounded-md px-3 py-2 transition-colors text-left text-sm w-full flex items-center gap-2",
                          selected
                            ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                            : "hover:bg-[hsl(var(--background-subtle))] hover:text-[hsl(var(--foreground))]"
                        )}
                      >
                        {IconComponent && (
                          <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <span className="truncate">{option.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
