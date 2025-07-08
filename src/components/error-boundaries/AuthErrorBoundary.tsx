"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, LogIn, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  isAuthError: boolean;
}

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * AuthErrorBoundary - Global error boundary for authentication failures
 *
 * This component catches all authentication-related errors thrown by the APIClient
 * and provides appropriate fallback UI with actions to resolve the issue.
 *
 * Key Features:
 * - Detects authentication errors from APIClient
 * - Provides user-friendly error messages
 * - Offers actions to resolve auth issues (sign in, refresh, etc.)
 * - Logs errors for debugging
 * - Graceful fallback for non-auth errors
 */
export class AuthErrorBoundary extends Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isAuthError: false,
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<AuthErrorBoundaryState> {
    const isAuthError = AuthErrorBoundary.isAuthenticationError(error);

    return {
      hasError: true,
      error,
      isAuthError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("🚨 AuthErrorBoundary caught error:", error, errorInfo);

    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      console.error("Production error:", { error, errorInfo });
    }
  }

  /**
   * Determines if an error is authentication-related
   */
  private static isAuthenticationError(error: Error): boolean {
    const authKeywords = [
      "authentication required",
      "authentication failed",
      "please sign in",
      "please sign in again",
      "no user logged in",
      "failed to get token",
      "failed to refresh token",
      "unauthorized",
      "401",
    ];

    const errorMessage = error.message.toLowerCase();
    return authKeywords.some((keyword) => errorMessage.includes(keyword));
  }

  /**
   * Handles retry by resetting error state
   */
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isAuthError: false,
    });
  };

  /**
   * Handles sign in action
   */
  private handleSignIn = () => {
    // Redirect to sign in page
    window.location.href = "/auth/signin";
  };

  /**
   * Handles page refresh
   */
  private handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Handles navigation to home
   */
  private handleGoHome = () => {
    window.location.href = "/";
  };

  /**
   * Renders authentication error UI
   */
  private renderAuthError() {
    const { error } = this.state;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-xl font-semibold text-destructive">
              Authentication Required
            </CardTitle>
            <CardDescription>
              You need to sign in to access this content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                {error?.message || "Please sign in to continue"}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              <Button onClick={this.handleSignIn} className="w-full">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
              <Button
                onClick={this.handleRetry}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && (
              <details className="mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {error?.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Renders general error UI
   */
  private renderGeneralError() {
    const { error } = this.state;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-xl font-semibold text-destructive">
              Something went wrong
            </CardTitle>
            <CardDescription>An unexpected error occurred</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error?.message || "An unexpected error occurred"}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleRefresh}
                variant="outline"
                className="w-full"
              >
                Refresh Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && (
              <details className="mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {error?.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Check if custom fallback is provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render specific UI based on error type
      if (this.state.isAuthError) {
        return this.renderAuthError();
      } else {
        return this.renderGeneralError();
      }
    }

    return this.props.children;
  }
}

/**
 * Hook version of the AuthErrorBoundary for easier usage in functional components
 */
export function useAuthErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Throw error during render to be caught by error boundary
  if (error) {
    throw error;
  }

  return { captureError, resetError };
}
