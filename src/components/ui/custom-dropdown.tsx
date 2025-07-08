import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { LocationResponse } from "@/models/location";

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface LocationDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select option",
  disabled = false,
  className = "",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }

    return undefined;
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }

    // Return undefined for all other paths
    return undefined;
  }, [isOpen]);

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md border border-input bg-background h-10 hover:bg-transparent hover:border-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="flex-shrink-0">{selectedOption.icon}</span>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 bg-background rounded-lg border border-input shadow-xl overflow-y-auto max-h-60 mt-1"
        >
          <div className="py-3 px-2 pb-4">
            {options.length > 6 && (
              <div className="text-xs text-muted-foreground text-center mb-2 px-1">
                Scroll for more options
              </div>
            )}
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm border border-transparent hover:border-white/80 rounded-md disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-out hover:shadow-sm mb-1 last:mb-0"
                onClick={() => handleSelectOption(option.value)}
                disabled={option.disabled}
              >
                {option.icon && (
                  <span className="flex-shrink-0">{option.icon}</span>
                )}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LocationDropdown({
  value,
  onChange,
  placeholder = "Select location",
  disabled = false,
  className = "",
  allowEmpty = true,
}: LocationDropdownProps) {
  const api = useAPI();
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchLocations = async () => {
    if (!api) return;

    try {
      setLoading(true);
      const data = (await api.get("locations")) as LocationResponse[];
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch locations when dropdown opens
  const handleDropdownOpen = () => {
    if (!isOpen && locations.length === 0) {
      fetchLocations();
    }
    setIsOpen(true);
  };

  // Create options from locations
  const options: DropdownOption[] = [
    ...(allowEmpty
      ? [
          {
            value: "",
            label: "No location",
            icon: (
              <MapPin className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            ),
          },
        ]
      : []),
    ...locations.map((location) => ({
      value: location.id,
      label: location.name,
      icon: <MapPin className="w-4 h-4 flex-shrink-0" />,
    })),
  ];

  if (loading) {
    options.push({
      value: "loading",
      label: "Loading locations...",
      disabled: true,
      icon: <MapPin className="w-4 h-4 flex-shrink-0 text-muted-foreground" />,
    });
  }

  return (
    <CustomDropdown
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
