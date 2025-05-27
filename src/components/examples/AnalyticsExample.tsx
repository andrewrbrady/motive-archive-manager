"use client";

import { Button } from "@/components/ui/button";
import analytics from "@/lib/analytics";

/**
 * Example component showing how to use Vercel Analytics for custom event tracking
 * This component demonstrates various analytics tracking patterns
 */
export function AnalyticsExample() {
  const handleButtonClick = () => {
    // Track a simple interaction
    analytics.interaction("button", "click", {
      component: "AnalyticsExample",
      timestamp: new Date().toISOString(),
    });
  };

  const handleFeatureUsage = () => {
    // Track feature usage
    analytics.feature("example_feature", "activated", {
      user_type: "demo",
      feature_version: "1.0",
    });
  };

  const handleError = () => {
    try {
      // Simulate an error
      throw new Error("Example error for analytics tracking");
    } catch (error) {
      // Track the error
      analytics.error("example_error", {
        component: "AnalyticsExample",
        error_type: "simulated",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleCustomEvent = () => {
    // Track a completely custom event
    analytics.track("custom_demo_event", {
      category: "demo",
      value: 42,
      metadata: {
        source: "analytics_example",
        timestamp: Date.now(),
      },
    });
  };

  return (
    <div className="p-6 space-y-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Analytics Tracking Examples</h3>
      <p className="text-sm text-muted-foreground">
        These buttons demonstrate different types of analytics tracking. Check
        your Vercel Analytics dashboard to see the events.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleButtonClick} variant="default">
          Track Interaction
        </Button>

        <Button onClick={handleFeatureUsage} variant="secondary">
          Track Feature Usage
        </Button>

        <Button onClick={handleError} variant="destructive">
          Track Error
        </Button>

        <Button onClick={handleCustomEvent} variant="outline">
          Track Custom Event
        </Button>
      </div>

      <div className="text-xs text-muted-foreground mt-4">
        <p>
          <strong>Note:</strong> Analytics events are only sent in production or
          when explicitly enabled in development.
        </p>
      </div>
    </div>
  );
}

export default AnalyticsExample;
