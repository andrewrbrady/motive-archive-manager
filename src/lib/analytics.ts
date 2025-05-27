import { track } from "@vercel/analytics";

/**
 * Track custom events with Vercel Analytics
 * This utility provides a centralized way to track user interactions
 */

export const analytics = {
  /**
   * Track a custom event
   * @param name - Event name
   * @param properties - Optional event properties
   */
  track: (name: string, properties?: Record<string, any>) => {
    if (typeof window !== "undefined") {
      track(name, properties);
    }
  },

  /**
   * Track page views (automatically handled by Analytics component)
   * This is here for reference - page views are tracked automatically
   */
  pageView: (path: string) => {
    // Page views are automatically tracked by the Analytics component
    // This function is provided for custom page view tracking if needed
    if (typeof window !== "undefined") {
      track("page_view", { path });
    }
  },

  /**
   * Track user interactions
   */
  interaction: (
    element: string,
    action: string,
    properties?: Record<string, any>
  ) => {
    analytics.track("user_interaction", {
      element,
      action,
      ...properties,
    });
  },

  /**
   * Track feature usage
   */
  feature: (
    feature: string,
    action: string,
    properties?: Record<string, any>
  ) => {
    analytics.track("feature_usage", {
      feature,
      action,
      ...properties,
    });
  },

  /**
   * Track errors
   */
  error: (error: string, context?: Record<string, any>) => {
    analytics.track("error", {
      error,
      ...context,
    });
  },
};

export default analytics;
