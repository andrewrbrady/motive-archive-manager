"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
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
                className="ml-1 ring-offset-[hsl(var(--background))] rounded-full outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
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
            onBlur={() => {
              setOpen(false);
              setInputValue("");
            }}
            onFocus={() => setOpen(true)}
            placeholder={value.length === 0 ? placeholder : undefined}
            className="ml-2 bg-transparent outline-none placeholder:text-[hsl(var(--foreground-muted))] text-[hsl(var(--foreground))] flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectables.length > 0 ? (
          <div className="absolute w-full z-50 top-0 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-md outline-none animate-in overflow-hidden">
            <CommandGroup className="max-h-[200px] overflow-auto">
              <div className="w-full bg-[hsl(var(--background))] p-2">
                <div className="grid grid-cols-2 gap-2">
                  {selectables.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        setInputValue("");
                        onChange([...value, option]);
                      }}
                      className="cursor-pointer bg-[hsl(var(--background))] hover:bg-[hsl(var(--background-subtle))] hover:text-[hsl(var(--foreground))] flex items-center rounded-md px-3 py-2 transition-colors text-left"
                    >
                      <div className="w-4 h-4 border rounded-sm flex items-center justify-center transition-colors border-[hsl(var(--border))]"></div>
                      <span className="text-sm truncate ml-3">
                        {option.label}
                      </span>
                    </CommandItem>
                  ))}
                </div>
              </div>
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
