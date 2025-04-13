/**
 * Structured logging utility for the application
 */

export interface LogEntry {
  message: string;
  [key: string]: any;
}

/**
 * Logger utility with common log levels
 */
export const logger = {
  /**
   * Log an informational message
   */
  info: (entry: LogEntry) => {
    console.log(
      JSON.stringify({
        ...entry,
        level: "info",
        timestamp: new Date().toISOString(),
      })
    );
  },

  /**
   * Log a warning message
   */
  warn: (entry: LogEntry) => {
    console.warn(
      JSON.stringify({
        ...entry,
        level: "warn",
        timestamp: new Date().toISOString(),
      })
    );
  },

  /**
   * Log an error message
   */
  error: (entry: LogEntry) => {
    console.error(
      JSON.stringify({
        ...entry,
        level: "error",
        timestamp: new Date().toISOString(),
      })
    );
  },

  /**
   * Log a debug message (only in non-production environments)
   */
  debug: (entry: LogEntry) => {
    // Only log debug messages in non-production environments
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        JSON.stringify({
          ...entry,
          level: "debug",
          timestamp: new Date().toISOString(),
        })
      );
    }
  },
};
