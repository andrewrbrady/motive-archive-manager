"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageSizeSelectorProps {
  options: number[];
  currentValue: number;
  onChange: (value: number) => void;
}

export default function PageSizeSelector({
  options,
  currentValue,
  onChange,
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Show</span>
      <Select
        value={currentValue.toString()}
        onValueChange={(value) => onChange(Number(value))}
      >
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder={currentValue} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">per page</span>
    </div>
  );
}
