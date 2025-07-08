import React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnrichmentProgress } from "@/components/ui/EnrichmentProgress";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface EnrichmentResponse {
  success?: boolean;
  data?: any;
  progress?: {
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
  error?: string;
}

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
  const api = useAPI();
  const [state, setState] = React.useState<EnrichmentState>({
    isEnriching: false,
    showProgress: false,
    progress: {
      step: 0,
      currentStep: "",
      status: "pending",
    },
  });

  // Authentication guard
  if (!api) {
    return null;
  }

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
      const data = await api.post<EnrichmentResponse>(
        `cars/${carId}/enrich`,
        {}
      );

      if (data.success && data.data) {
        // Update progress based on backend response
        if (data.progress) {
          const { step, currentStep, status, error, details } = data.progress;
          setState((prev) => ({
            ...prev,
            progress: {
              step,
              currentStep,
              status,
              error,
              details,
            },
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

        toast.success("Car data enriched successfully");
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
        toast.error(errorMessage);
      }
    } catch (error: any) {
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
      toast.error(errorMessage);
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
