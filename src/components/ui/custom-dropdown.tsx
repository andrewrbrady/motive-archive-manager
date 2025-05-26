import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
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
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();

      // Check if we're inside a modal/dialog
      const isInModal = triggerRef.current.closest('[role="dialog"]') !== null;

      // Calculate position more accurately for modals
      let top = triggerRect.bottom + window.scrollY;
      let left = triggerRect.left + window.scrollX;

      // If in modal, adjust for potential viewport constraints
      if (isInModal) {
        // Ensure dropdown doesn't go off-screen
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const dropdownHeight = Math.min(240, options.length * 40 + 20); // Estimate dropdown height

        // If dropdown would go below viewport, position it above the trigger
        if (top + dropdownHeight > viewportHeight) {
          top = triggerRect.top + window.scrollY - dropdownHeight - 4;
        }

        // Ensure dropdown doesn't go off the right edge
        if (left + triggerRect.width > viewportWidth - 20) {
          left = viewportWidth - triggerRect.width - 20;
        }

        // Ensure dropdown doesn't go off the left edge
        if (left < 20) {
          left = 20;
        }
      }

      setDropdownPosition({
        top,
        left,
        width: Math.max(triggerRect.width, 200), // Minimum width of 200px
      });
    }
  }, [isOpen, options.length]);

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
  }, [isOpen]);

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const dropdownContent = isOpen ? (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 99999, // Higher z-index to ensure it's above modals
      }}
      onWheel={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        ref={dropdownRef}
        className="bg-background rounded-lg border border-input shadow-xl overflow-y-auto max-h-60 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{
          position: "absolute",
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          pointerEvents: "auto",
          maxHeight: "240px", // Explicit max height
        }}
        onWheel={(e) => {
          e.stopPropagation();
        }}
        onScroll={(e) => {
          e.stopPropagation();
        }}
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
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md border border-input bg-background h-10 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
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

      {typeof window !== "undefined" &&
        dropdownContent &&
        createPortal(dropdownContent, document.body)}
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
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");

      const data = await response.json();
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
