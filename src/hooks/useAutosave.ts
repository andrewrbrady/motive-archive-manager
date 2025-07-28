import { useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

interface AutosaveOptions {
  delay?: number; // Delay in milliseconds before saving (default: 3000)
  enabled?: boolean; // Whether autosave is enabled (default: true)
  onSave: (data: any) => Promise<void>; // Function to call for saving
  onError?: (error: Error) => void; // Optional error handler
}

interface AutosaveData {
  blocks: any[];
  selectedCopies: any[];
  activeTemplate: any;
  compositionName?: string;
  hasChanges: boolean;
}

export function useAutosave({
  delay = 3000,
  enabled = true,
  onSave,
  onError,
}: AutosaveOptions) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = useRef(false);
  const lastSavedDataRef = useRef<string>("");

  // Clear any pending autosave
  const clearAutosave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Schedule an autosave
  const scheduleAutosave = useCallback(
    (data: AutosaveData) => {
      if (!enabled || isAutoSavingRef.current) {
        return;
      }

      // Check if data has actually changed
      const currentDataString = JSON.stringify(data);
      if (currentDataString === lastSavedDataRef.current) {
        return;
      }

      // Clear any existing timeout
      clearAutosave();

      // Only autosave if there are blocks and changes
      if (!data.blocks || data.blocks.length === 0 || !data.hasChanges) {
        return;
      }

      // Schedule new autosave
      timeoutRef.current = setTimeout(async () => {
        try {
          isAutoSavingRef.current = true;
          await onSave(data);
          lastSavedDataRef.current = currentDataString;

          // Show subtle autosave indicator
          toast({
            title: "Autosaved",
            description: "Your composition has been automatically saved.",
            duration: 2000,
          });
        } catch (error) {
          console.error("Autosave error:", error);
          if (onError) {
            onError(error as Error);
          } else {
            toast({
              title: "Autosave Failed",
              description:
                "Failed to autosave your composition. Please save manually.",
              variant: "destructive",
              duration: 3000,
            });
          }
        } finally {
          isAutoSavingRef.current = false;
        }
      }, delay);
    },
    [enabled, delay, onSave, onError, clearAutosave, toast]
  );

  // Force an immediate save (useful for manual saves)
  const forceSave = useCallback(
    async (data: AutosaveData) => {
      clearAutosave();
      if (isAutoSavingRef.current) {
        return;
      }

      try {
        isAutoSavingRef.current = true;
        await onSave(data);
        lastSavedDataRef.current = JSON.stringify(data);
      } finally {
        isAutoSavingRef.current = false;
      }
    },
    [onSave, clearAutosave]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutosave();
    };
  }, [clearAutosave]);

  return {
    scheduleAutosave,
    forceSave,
    clearAutosave,
    isAutoSaving: isAutoSavingRef.current,
  };
}
