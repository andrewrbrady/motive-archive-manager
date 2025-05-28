"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CarsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Cars page error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background">
          <main className="container-wide px-6 py-8">
            <div className="flex items-center justify-center py-12">
              <div className="max-w-md w-full">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription className="mt-2">
                    There was an error loading the cars page. This might be due
                    to a network issue or a temporary server problem.
                  </AlertDescription>
                </Alert>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Reload Page
                  </Button>
                </div>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <h4 className="font-semibold text-sm mb-2">
                      Error Details (Development)
                    </h4>
                    <pre className="text-xs text-muted-foreground overflow-auto">
                      {this.state.error.message}
                      {this.state.error.stack && (
                        <>
                          {"\n\n"}
                          {this.state.error.stack}
                        </>
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
