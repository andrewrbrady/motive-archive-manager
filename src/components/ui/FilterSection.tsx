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
    <div className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
      <div className="p-4">{children}</div>
      {hasActiveFilters && (
        <div className="border-t border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] px-4 py-2 flex justify-end">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground-subtle))] hover:text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground))] transition-colors"
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
    <label className="block text-xs font-medium uppercase tracking-wide text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] mb-1">
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
      className={`block w-full text-sm border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] focus:ring-0 focus:border-[hsl(var(--border-primary))] dark:focus:border-[hsl(var(--border-subtle))] px-3 py-1.5 ${className}`}
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
      className={`block w-full text-sm border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] focus:ring-0 focus:border-[hsl(var(--border-primary))] dark:focus:border-[hsl(var(--border-subtle))] px-3 py-1.5 ${className}`}
    />
  );
}
