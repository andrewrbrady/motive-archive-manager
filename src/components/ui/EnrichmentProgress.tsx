import React from "react";
import { Loader2, X, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface EnrichmentProgressProps {
  isVisible: boolean;
  step: number;
  _currentStep: string;
  status: "pending" | "processing" | "complete" | "error";
  error?: string;
  details?: {
    searchTermsGenerated?: number;
    additionalSearchesCompleted?: number;
    fieldsUpdated?: number;
    protectedFieldsPreserved?: string[];
  };
  onClose: () => void;
}

const steps = [
  {
    id: 1,
    name: "Initial Search",
    description: "Searching for vehicle specifications",
  },
  {
    id: 2,
    name: "Initial Data Cleaning",
    description: "Processing initial search results",
  },
  {
    id: 3,
    name: "Generating New Search Terms",
    description: "Analyzing data to find missing information",
  },
  {
    id: 4,
    name: "Performing Additional Searches",
    description: "Gathering detailed specifications",
  },
  {
    id: 5,
    name: "Final Validation",
    description: "Cross-referencing and validating data",
  },
  {
    id: 6,
    name: "Updating Database",
    description: "Saving enriched vehicle data",
  },
];

export function EnrichmentProgress({
  isVisible,
  step,
  _currentStep,
  status,
  error,
  details,
  onClose,
}: EnrichmentProgressProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] flex items-center justify-between">
        <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
          Enriching Vehicle Data
        </h3>
        <button
          onClick={onClose}
          className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {status === "error" ? (
          <div className="flex items-start gap-3 text-destructive-600 dark:text-destructive-400">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((s) => {
              const isActive = s.id === step;
              const isComplete = s.id < step || status === "complete";
              const isPending = s.id > step;

              return (
                <div key={s.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-success-500 dark:text-success-400" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-info-500 dark:text-info-400 animate-spin" />
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-full border-2 ${
                          isPending
                            ? "border-[hsl(var(--border-primary))] dark:border-[hsl(var(--border-subtle))]"
                            : "border-info-500 dark:border-info-400"
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isActive
                          ? "text-info-500 dark:text-info-400"
                          : isComplete
                          ? "text-success-500 dark:text-success-400"
                          : "text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]"
                      }`}
                    >
                      {s.name}
                    </p>
                    <p className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Show details when complete */}
            {status === "complete" && details && (
              <div className="mt-4 pt-4 border-t border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-info-500 dark:text-info-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
                      Enrichment Summary
                    </p>
                    <ul className="space-y-1">
                      {details.searchTermsGenerated !== undefined && (
                        <li className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                          • Generated {details.searchTermsGenerated} search
                          terms
                        </li>
                      )}
                      {details.additionalSearchesCompleted !== undefined && (
                        <li className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                          • Completed {details.additionalSearchesCompleted}{" "}
                          additional searches
                        </li>
                      )}
                      {details.fieldsUpdated !== undefined && (
                        <li className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                          • Updated {details.fieldsUpdated} data fields
                        </li>
                      )}
                      {details.protectedFieldsPreserved && (
                        <li className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                          • Protected fields:{" "}
                          {details.protectedFieldsPreserved.join(", ")}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
