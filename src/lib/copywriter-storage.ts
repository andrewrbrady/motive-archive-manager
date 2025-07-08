/**
 * Utility functions for copywriter localStorage persistence
 * Handles graceful error handling for JSON parse failures and quota exceeded
 */

export interface DataSourceSections {
  deliverables: boolean;
  galleries: boolean;
  inspections: boolean;
}

const STORAGE_KEYS = {
  SYSTEM_PROMPT: "copywriter-system-prompt",
  DATA_SOURCES: "copywriter-data-sources",
} as const;

/**
 * Save system prompt selection to localStorage
 */
export function saveSystemPrompt(promptId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, promptId);
  } catch (error) {
    console.warn("⚠️ Failed to save system prompt to localStorage:", error);
  }
}

/**
 * Restore system prompt selection from localStorage
 */
export function restoreSystemPrompt(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
  } catch (error) {
    console.warn(
      "⚠️ Failed to restore system prompt from localStorage:",
      error
    );
    return null;
  }
}

/**
 * Save data source section states to localStorage
 */
export function saveDataSourceSections(sections: DataSourceSections): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DATA_SOURCES, JSON.stringify(sections));
  } catch (error) {
    console.warn(
      "⚠️ Failed to save data source sections to localStorage:",
      error
    );
  }
}

/**
 * Restore data source section states from localStorage
 */
export function restoreDataSourceSections(): DataSourceSections | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DATA_SOURCES);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate the structure
    if (
      typeof parsed === "object" &&
      typeof parsed.deliverables === "boolean" &&
      typeof parsed.galleries === "boolean" &&
      typeof parsed.inspections === "boolean"
    ) {
      return parsed;
    }

    // Invalid structure, clear it
    localStorage.removeItem(STORAGE_KEYS.DATA_SOURCES);
    return null;
  } catch (error) {
    console.warn(
      "⚠️ Failed to restore data source sections from localStorage:",
      error
    );

    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEYS.DATA_SOURCES);
    } catch (clearError) {
      console.warn(
        "⚠️ Failed to clear corrupted localStorage data:",
        clearError
      );
    }

    return null;
  }
}

/**
 * Get default data source section states
 */
export function getDefaultDataSourceSections(): DataSourceSections {
  return {
    deliverables: false,
    galleries: false,
    inspections: false,
  };
}

/**
 * Clear all copywriter localStorage data
 */
export function clearCopywriterStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SYSTEM_PROMPT);
    localStorage.removeItem(STORAGE_KEYS.DATA_SOURCES);
  } catch (error) {
    console.warn("⚠️ Failed to clear copywriter localStorage:", error);
  }
}
