"use client";

import { useEffect, useState, useRef } from "react";
import { useUrlParams } from "@/hooks/useUrlParams";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface UrlModalProps {
  /** URL parameter that controls this modal */
  paramName: string;
  /** Value to check for (if not just presence) */
  paramValue?: string;
  /** Called when the modal is closed */
  onClose: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Parameters to preserve when closing */
  preserveParams?: string[];
  /** Title for the modal */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A modal component that syncs its state with URL parameters
 *
 * This component makes modals bookmarkable and shareable via URLs,
 * while ensuring proper cleanup of parameters when closed.
 */
export function UrlModal({
  paramName,
  paramValue,
  onClose,
  children,
  preserveParams = [],
  title,
  className = "",
}: UrlModalProps) {
  console.log(
    "UrlModal rendering with paramName:",
    paramName,
    "paramValue:",
    paramValue
  );

  const { getParam, updateParams } = useUrlParams();
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync modal state with URL
  useEffect(() => {
    const param = getParam(paramName);
    console.log(
      "UrlModal useEffect - Current param value:",
      param,
      "for paramName:",
      paramName,
      "paramValue:",
      paramValue
    );

    const shouldBeOpen = paramValue ? param === paramValue : !!param;
    console.log(
      "UrlModal useEffect - shouldBeOpen:",
      shouldBeOpen,
      "paramValue:",
      paramValue,
      "param:",
      param
    );

    if (shouldBeOpen !== isOpen) {
      console.log(
        "UrlModal - Changing isOpen from",
        isOpen,
        "to",
        shouldBeOpen,
        "- URL:",
        window.location.href
      );
      setIsOpen(shouldBeOpen);
    }
  }, [getParam, paramName, paramValue, isOpen]);

  // Handle closing the modal
  const handleClose = () => {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("UrlModal handleClose called, preserveParams:", preserveParams);

    // Set isOpen to false immediately for better UX
    setIsOpen(false);

    // Then update the URL parameters
    // Use a longer delay to avoid race conditions with URL updates
    setTimeout(() => {
      updateParams({ [paramName]: null }, { preserveParams });
      onClose();
    }, 50);
  };

  // Handle Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Handle clicks outside the modal
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        isOpen
      ) {
        handleClose();
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("UrlModal final isOpen state:", isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--background))]/95 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
      <div
        ref={modalRef}
        className={`bg-[hsl(var(--background))] p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 border border-[hsl(var(--border))] relative ${className}`}
      >
        <div className="flex justify-between items-start mb-6">
          {title && (
            <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
              {title}
            </h2>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] ml-auto"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
