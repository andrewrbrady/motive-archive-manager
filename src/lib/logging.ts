/**
 * Structured logging utility for the application with security features
 */

export interface LogEntry {
  message: string;
  [key: string]: any;
}

interface SecureLogEntry extends LogEntry {
  sensitive?: boolean;
  maskFields?: string[];
}

/**
 * Masks sensitive data in objects
 */
function maskSensitiveData(data: any, fieldsToMask: string[] = []): any {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sensitiveFields = [
    "email",
    "vin",
    "uid",
    "id",
    "_id",
    "password",
    "token",
    "key",
    "secret",
    "apiKey",
    "clientSecret",
    "accessToken",
    "refreshToken",
    "sessionId",
    "phoneNumber",
    "ssn",
    "creditCard",
    "licensePlate",
    ...fieldsToMask,
  ];

  const masked = { ...data };

  for (const [key, value] of Object.entries(masked)) {
    const lowerKey = key.toLowerCase();

    if (
      sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))
    ) {
      if (typeof value === "string" && value.length > 0) {
        masked[key] = value.substring(0, 3) + "***";
      } else if (value) {
        masked[key] = "***";
      }
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskSensitiveData(value, fieldsToMask);
    }
  }

  return masked;
}

/**
 * Logger utility with common log levels and security features
 */
export const logger = {
  /**
   * Log an informational message
   */
  info: (entry: SecureLogEntry) => {
    const logData = {
      ...entry,
      level: "info",
      timestamp: new Date().toISOString(),
    };

    // Mask sensitive data if specified
    if (entry.sensitive || entry.maskFields) {
      const maskedData = maskSensitiveData(logData, entry.maskFields);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(JSON.stringify(maskedData));
    } else {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(JSON.stringify(logData));
    }
  },

  /**
   * Log a warning message
   */
  warn: (entry: SecureLogEntry) => {
    const logData = {
      ...entry,
      level: "warn",
      timestamp: new Date().toISOString(),
    };

    // Mask sensitive data if specified
    if (entry.sensitive || entry.maskFields) {
      const maskedData = maskSensitiveData(logData, entry.maskFields);
      console.warn(JSON.stringify(maskedData));
    } else {
      console.warn(JSON.stringify(logData));
    }
  },

  /**
   * Log an error message
   */
  error: (entry: SecureLogEntry) => {
    const logData = {
      ...entry,
      level: "error",
      timestamp: new Date().toISOString(),
    };

    // Always mask sensitive data in error logs
    const maskedData = maskSensitiveData(logData, entry.maskFields);
    console.error(JSON.stringify(maskedData));
  },

  /**
   * Log a debug message (only in non-production environments)
   */
  debug: (entry: SecureLogEntry) => {
    // Only log debug messages in non-production environments
    if (process.env.NODE_ENV !== "production") {
      const logData = {
        ...entry,
        level: "debug",
        timestamp: new Date().toISOString(),
      };

      // Mask sensitive data if specified
      if (entry.sensitive || entry.maskFields) {
        const maskedData = maskSensitiveData(logData, entry.maskFields);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.debug(JSON.stringify(maskedData));
      } else {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.debug(JSON.stringify(logData));
      }
    }
  },

  /**
   * Secure development-only logging
   */
  devOnly: (entry: SecureLogEntry) => {
    if (process.env.NODE_ENV !== "production") {
      const logData = {
        ...entry,
        level: "dev",
        timestamp: new Date().toISOString(),
      };

      // Always mask sensitive data in dev logs
      const maskedData = maskSensitiveData(logData, entry.maskFields);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(JSON.stringify(maskedData));
    }
  },

  /**
   * Utility function to mask sensitive fields in any object
   */
  maskSensitive: (data: any, additionalFields: string[] = []) => {
    return maskSensitiveData(data, additionalFields);
  },

  /**
   * Safe error logging that prevents sensitive stack trace exposure
   */
  safeError: (message: string, error: any, context?: Record<string, any>) => {
    const errorData = {
      message,
      error: error instanceof Error ? error.message : String(error),
      context: context ? maskSensitiveData(context) : undefined,
      level: "error",
      timestamp: new Date().toISOString(),
    };

    console.error(JSON.stringify(errorData));
  },
};

// Legacy exports for backward compatibility
export const { info, warn, error, debug } = logger;
