import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

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

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [positionCalculated, setPositionCalculated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setPositionCalculated(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: triggerRect.bottom + window.scrollY,
        left: triggerRect.left + window.scrollX,
        width: triggerRect.width,
      });
      // Use requestAnimationFrame to ensure position is set before rendering
      requestAnimationFrame(() => {
        setPositionCalculated(true);
      });
    } else {
      setPositionCalculated(false);
    }
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setPositionCalculated(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Only render dropdown content after position is calculated
  const dropdownContent =
    isOpen && positionCalculated ? (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: "none",
        }}
        onWheel={(e) => {
          // CRITICAL: Allow wheel events to pass through to dropdown
          e.stopPropagation();
        }}
      >
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width + 16,
            height: "200px",
            overflow: "hidden",
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            boxShadow:
              "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
            pointerEvents: "auto",
          }}
          onWheel={(e) => {
            // CRITICAL: Ensure wheel events work on the dropdown
            e.stopPropagation();
          }}
        >
          {/* Scrollable inner container */}
          <div
            style={{
              height: "100%",
              overflowY: "scroll",
              overflowX: "hidden",
              padding: "8px",
              scrollbarWidth: "thin",
              scrollbarColor: "hsl(var(--border)) transparent",
            }}
            onWheel={(e) => {
              // CRITICAL: Prevent event from bubbling up
              e.stopPropagation();
            }}
            onScroll={(e) => {
              // Explicitly handle scroll events
              e.stopPropagation();
            }}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid transparent",
                  borderRadius: "6px",
                  marginBottom: index === options.length - 1 ? "0" : "4px",
                  cursor: option.disabled ? "not-allowed" : "pointer",
                  opacity: option.disabled ? "0.5" : "1",
                  backgroundColor: "transparent",
                  color: "hsl(var(--foreground))",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!option.disabled) {
                    e.currentTarget.style.borderColor =
                      "rgba(255, 255, 255, 0.8)";
                    e.currentTarget.style.boxShadow =
                      "0 1px 2px 0 rgb(0 0 0 / 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onClick={() => handleSelectOption(option.value)}
                disabled={option.disabled}
              >
                {option.icon && (
                  <span style={{ flexShrink: 0 }}>{option.icon}</span>
                )}
                <span style={{ flex: 1, textAlign: "left" }}>
                  {option.label}
                </span>
              </button>
            ))}

            {/* Add extra content to force scrolling */}
            <div style={{ height: "20px" }}></div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md border border-input bg-background h-10 hover:bg-accent hover:text-accent-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon && (
            <span className="flex-shrink-0">{selectedOption.icon}</span>
          )}
          <span className={selectedOption ? "" : "text-muted-foreground"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Portal the dropdown content to document.body with pointer-events fix */}
      {typeof window !== "undefined" &&
        dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
