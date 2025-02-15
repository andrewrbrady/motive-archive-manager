import React from "react";
import { X } from "lucide-react";

interface FilterSectionProps {
  children: React.ReactNode;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function FilterSection({
  children,
  hasActiveFilters = false,
  onClearFilters = () => {},
}: FilterSectionProps) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800">
      <div className="p-4">{children}</div>
      {hasActiveFilters && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex justify-end">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            title="Clear all filters"
          >
            <span>Clear filters</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function FilterItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`space-y-0.5 ${className}`}>{children}</div>;
}

export function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
      {children}
    </label>
  );
}

export function FilterSelect({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`block w-full text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] text-gray-900 dark:text-gray-100 focus:ring-0 focus:border-gray-400 dark:focus:border-gray-700 px-3 py-1.5 ${className}`}
    />
  );
}

export function FilterInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`block w-full text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] text-gray-900 dark:text-gray-100 focus:ring-0 focus:border-gray-400 dark:focus:border-gray-700 px-3 py-1.5 ${className}`}
    />
  );
}
