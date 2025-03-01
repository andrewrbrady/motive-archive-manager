import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onReset?: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onReset,
  placeholder = "Search...",
}: SearchBarProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(var(--foreground-muted))]" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-8"
        />
      </div>
      {onReset && (
        <Button
          variant="outline"
          size="icon"
          onClick={onReset}
          className="shrink-0"
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
