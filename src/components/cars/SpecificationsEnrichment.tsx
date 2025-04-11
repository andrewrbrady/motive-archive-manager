import React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnrichmentProgress } from "@/components/ui/EnrichmentProgress";

interface EnrichmentState {
  isEnriching: boolean;
  showProgress: boolean;
  progress: {
    step: number;
    currentStep: string;
    status: "pending" | "processing" | "complete" | "error";
    error?: string;
    details?: {
      searchTermsGenerated?: number;
      additionalSearchesCompleted?: number;
      fieldsUpdated?: number;
      protectedFieldsPreserved?: string[];
    };
  };
}

interface SpecificationsEnrichmentProps {
  carId: string;
  onEnrichComplete: () => void;
}

export function SpecificationsEnrichment({
  carId,
  onEnrichComplete,
}: SpecificationsEnrichmentProps) {
  const [state, setState] = React.useState<EnrichmentState>({
    isEnriching: false,
    showProgress: false,
    progress: {
      step: 0,
      currentStep: "",
      status: "pending",
    },
  });

  const handleEnrichData = async () => {
    setState((prev) => ({
      ...prev,
      isEnriching: true,
      showProgress: true,
      progress: {
        step: 1,
        currentStep: "Initial Search",
        status: "processing",
      },
    }));

    try {
      const response = await fetch(`/api/cars/${carId}/enrich`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to enrich car data");
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Update progress based on backend response
        if (data.progress) {
          setState((prev) => ({
            ...prev,
            progress: data.progress,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            progress: {
              step: 6,
              currentStep: "Complete",
              status: "complete",
            },
          }));
        }

        // Add a small delay to ensure database write is complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        onEnrichComplete();
      } else {
        const errorMessage = data.error || "Failed to enrich car data";
        setState((prev) => ({
          ...prev,
          progress: {
            step: 0,
            currentStep: "",
            status: "error",
            error: errorMessage,
          },
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to enrich car data";
      setState((prev) => ({
        ...prev,
        progress: {
          step: 0,
          currentStep: "",
          status: "error",
          error: errorMessage,
        },
      }));
    } finally {
      // Keep isEnriching true for a moment to show completion state
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isEnriching: false,
          showProgress: false,
          progress: {
            step: 0,
            currentStep: "",
            status: "pending",
          },
        }));
      }, 2000);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnrichData}
        disabled={state.isEnriching}
      >
        {state.isEnriching ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enriching...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Enrich Data
          </>
        )}
      </Button>

      <EnrichmentProgress
        isVisible={state.showProgress}
        step={state.progress.step}
        _currentStep={state.progress.currentStep}
        status={state.progress.status}
        error={state.progress.error}
        details={state.progress.details}
        onClose={() => setState((prev) => ({ ...prev, showProgress: false }))}
      />
    </>
  );
}
