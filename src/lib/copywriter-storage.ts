/**
 * Utility functions for copywriter localStorage persistence
 * Handles graceful error handling for JSON parse failures and quota exceeded
 */

const STORAGE_KEYS = {
  SYSTEM_PROMPT: "copywriter-system-prompt",
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
 * Clear all copywriter-related localStorage data
 */
export function clearCopywriterStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SYSTEM_PROMPT);
    console.log("🧹 Cleared copywriter localStorage data");
  } catch (error) {
    console.warn("⚠️ Failed to clear copywriter localStorage:", error);
  }
}
