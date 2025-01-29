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
    <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Enriching Vehicle Data
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {status === "error" ? (
          <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
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
                      <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" />
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-full border-2 ${
                          isPending
                            ? "border-gray-300 dark:border-gray-700"
                            : "border-blue-500 dark:border-blue-400"
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isActive
                          ? "text-blue-500 dark:text-blue-400"
                          : isComplete
                          ? "text-green-500 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {s.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Show details when complete */}
            {status === "complete" && details && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Enrichment Summary
                    </p>
                    <ul className="space-y-1">
                      {details.searchTermsGenerated !== undefined && (
                        <li className="text-xs text-gray-500 dark:text-gray-400">
                          • Generated {details.searchTermsGenerated} search
                          terms
                        </li>
                      )}
                      {details.additionalSearchesCompleted !== undefined && (
                        <li className="text-xs text-gray-500 dark:text-gray-400">
                          • Completed {details.additionalSearchesCompleted}{" "}
                          additional searches
                        </li>
                      )}
                      {details.fieldsUpdated !== undefined && (
                        <li className="text-xs text-gray-500 dark:text-gray-400">
                          • Updated {details.fieldsUpdated} data fields
                        </li>
                      )}
                      {details.protectedFieldsPreserved && (
                        <li className="text-xs text-gray-500 dark:text-gray-400">
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
