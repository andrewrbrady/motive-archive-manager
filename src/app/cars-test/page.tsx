"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CarsTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testCarsEndpoint = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Testing cars endpoint...");
      const response = await fetch("/api/cars-test");

      if (!response.ok) {
        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      setResult(data);
      console.log("Cars test result:", data);
    } catch (err) {
      console.error("Error testing cars endpoint:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testCarsEndpoint();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Cars API Test</h1>

      <Button onClick={testCarsEndpoint} disabled={loading} className="mb-4">
        {loading ? "Testing..." : "Retest Cars Endpoint"}
      </Button>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
          <h2 className="font-semibold">Error:</h2>
          <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {result && (
        <div className="bg-gray-50 p-4 rounded border">
          <h2 className="font-semibold text-xl mb-2">
            Status:{" "}
            <span
              className={
                result.status === "success" ? "text-green-600" : "text-red-600"
              }
            >
              {result.status}
            </span>
          </h2>

          <div className="mb-4">
            <p className="text-gray-700">{result.message}</p>
          </div>

          {result.status === "success" && (
            <div className="bg-white p-3 rounded shadow-sm mb-4">
              <h3 className="font-medium mb-2">Cars Collection Info</h3>
              <p>Car Count: {result.count}</p>
              <p>First Car ID: {result.firstCarId || "None"}</p>
            </div>
          )}

          {result.error && (
            <div className="mt-4 bg-red-50 p-3 rounded shadow-sm border border-red-200">
              <h3 className="font-medium mb-2 text-red-700">Error Details</h3>
              <pre className="bg-white p-2 rounded text-sm overflow-auto">
                {result.error}
              </pre>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Timestamp: {result.timestamp}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">
          Compare with Original Cars Page
        </h2>
        <div className="flex gap-4">
          <Button
            onClick={() => window.open("/cars", "_blank")}
            variant="outline"
          >
            Open Cars Page
          </Button>
          <Button
            onClick={() => window.open("/test-mongo", "_blank")}
            variant="outline"
          >
            Open MongoDB Test
          </Button>
        </div>
      </div>
    </div>
  );
}
