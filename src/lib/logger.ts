interface LogData {
  [key: string]: any;
}

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  private log(level: LogLevel, message: string, data?: LogData) {
    if (!this.isDevelopment && level === "debug") {
      return; // Skip debug logs in production
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data: this.sanitizeData(data) }),
    };

    switch (level) {
      case "error":
        console.error(JSON.stringify(logEntry));
        break;
      case "warn":
        console.warn(JSON.stringify(logEntry));
        break;
      case "info":
        if (this.isDevelopment) {
          console.info(JSON.stringify(logEntry));
        }
        break;
      case "debug":
        if (this.isDevelopment) {
          console.log(JSON.stringify(logEntry));
        }
        break;
    }
  }

  private sanitizeData(data: LogData): LogData {
    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "auth",
      "credential",
      "apiKey",
      "privateKey",
      "publicKey",
      "accessToken",
      "refreshToken",
    ];

    const sanitizeObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(sanitizeObject);

      const result: any = {};
      Object.keys(obj).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
          result[key] = "[REDACTED]";
        } else {
          result[key] = sanitizeObject(obj[key]);
        }
      });
      return result;
    };

    return sanitizeObject(sanitized);
  }

  debug(message: string, data?: LogData) {
    this.log("debug", message, data);
  }

  info(message: string, data?: LogData) {
    this.log("info", message, data);
  }

  warn(message: string, data?: LogData) {
    this.log("warn", message, data);
  }

  error(message: string, data?: LogData) {
    this.log("error", message, data);
  }

  // Convenience method for development-only logging
  dev(message: string, data?: LogData) {
    if (this.isDevelopment) {
      console.log(`[DEV] ${message}`, data || "");
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const { debug, info, warn, error, dev } = logger;
