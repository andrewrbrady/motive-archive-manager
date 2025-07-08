"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";
import { useAPIQuery, useAPIMutation } from "@/hooks/useAPIQuery";

/**
 * Test component to validate AuthErrorBoundary functionality
 *
 * This component provides various ways to trigger authentication errors
 * to ensure the error boundary catches them correctly.
 */
export function TestAuthErrorBoundary() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${result}`,
    ]);
  };

  // Test direct API client calls
  const testDirectAPICall = async () => {
    try {
      addResult("Testing direct API call...");
      await api.get("/test-auth-required");
      addResult("✅ Direct API call succeeded");
    } catch (error: any) {
      addResult(`❌ Direct API call failed: ${error.message}`);
      // This should trigger the error boundary
      throw error;
    }
  };

  // Test useAPIQuery hook
  const {
    data: queryData,
    error: queryError,
    isLoading: queryLoading,
    refetch: refetchQuery,
  } = useAPIQuery("/test-auth-required", {
    enabled: false, // Don't auto-fetch
  });

  // Test useAPIMutation hook
  const mutation = useAPIMutation("/test-auth-required", {
    onError: (error: any) => {
      addResult(`❌ Mutation failed: ${error.message}`);
      // This should trigger the error boundary
      throw error;
    },
    onSuccess: () => {
      addResult("✅ Mutation succeeded");
    },
  });

  // Test throwing auth errors directly
  const throwAuthError = () => {
    addResult("Throwing authentication error...");
    throw new Error("Authentication required - no user logged in");
  };

  const throwGeneralError = () => {
    addResult("Throwing general error...");
    throw new Error("Something went wrong");
  };

  // Test manual API calls that should trigger auth errors
  const testUnauthenticatedFetch = async () => {
    try {
      addResult("Testing unauthenticated fetch...");
      const response = await fetch("/api/test-auth-required");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Authentication required`);
      }
      addResult("✅ Unauthenticated fetch succeeded");
    } catch (error: any) {
      addResult(`❌ Unauthenticated fetch failed: ${error.message}`);
      // This should trigger the error boundary
      throw error;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auth Error Boundary Test Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Direct API Client Tests */}
            <div className="space-y-2">
              <h3 className="font-semibold">Direct API Client</h3>
              <Button
                onClick={testDirectAPICall}
                variant="outline"
                className="w-full"
              >
                Test API Client (Auth Required)
              </Button>
            </div>

            {/* React Query Tests */}
            <div className="space-y-2">
              <h3 className="font-semibold">React Query Hooks</h3>
              <Button
                onClick={() => refetchQuery()}
                variant="outline"
                className="w-full"
                disabled={queryLoading}
              >
                {queryLoading ? "Loading..." : "Test useAPIQuery"}
              </Button>
              <Button
                onClick={() => mutation.mutate({ test: true })}
                variant="outline"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Loading..." : "Test useAPIMutation"}
              </Button>
            </div>

            {/* Manual Error Tests */}
            <div className="space-y-2">
              <h3 className="font-semibold">Manual Error Tests</h3>
              <Button
                onClick={throwAuthError}
                variant="destructive"
                className="w-full"
              >
                Throw Auth Error
              </Button>
              <Button
                onClick={throwGeneralError}
                variant="destructive"
                className="w-full"
              >
                Throw General Error
              </Button>
            </div>

            {/* Fetch Tests */}
            <div className="space-y-2">
              <h3 className="font-semibold">Raw Fetch Tests</h3>
              <Button
                onClick={testUnauthenticatedFetch}
                variant="outline"
                className="w-full"
              >
                Test Unauthenticated Fetch
              </Button>
            </div>
          </div>

          <Separator />

          {/* Test Results */}
          <div>
            <h3 className="font-semibold mb-2">Test Results</h3>
            <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground">No tests run yet.</p>
              ) : (
                <div className="space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={() => setTestResults([])}
              variant="ghost"
              size="sm"
              className="mt-2"
            >
              Clear Results
            </Button>
          </div>

          {/* Current State Display */}
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold">Query State</h4>
              <div className="bg-muted p-2 rounded text-xs">
                <div>Loading: {queryLoading ? "Yes" : "No"}</div>
                <div>Error: {queryError ? queryError.message : "None"}</div>
                <div>Data: {queryData ? "Available" : "None"}</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold">Mutation State</h4>
              <div className="bg-muted p-2 rounded text-xs">
                <div>Pending: {mutation.isPending ? "Yes" : "No"}</div>
                <div>
                  Error: {mutation.error ? mutation.error.message : "None"}
                </div>
                <div>Success: {mutation.isSuccess ? "Yes" : "No"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1. Auth Error Tests:</strong> These should trigger the
            AuthErrorBoundary and show the authentication error UI with sign-in
            options.
          </p>
          <p>
            <strong>2. General Error Tests:</strong> These should trigger the
            AuthErrorBoundary but show the general error UI.
          </p>
          <p>
            <strong>3. Expected Behavior:</strong> When an authentication error
            occurs, you should see the error boundary UI instead of this test
            component.
          </p>
          <p>
            <strong>4. Recovery:</strong> Use the "Try Again" button in the
            error UI to return to this test component.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
