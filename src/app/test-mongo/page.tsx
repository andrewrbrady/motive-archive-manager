"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function TestMongoDBPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directApiUrl, setDirectApiUrl] = useState("/api/test-mongodb");

  const testConnection = async (url = "/api/test-mongodb") => {
    setLoading(true);
    setError(null);

    try {
      console.log("Testing MongoDB connection to:", url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      setResult(data);
      console.log("MongoDB test result:", data);
    } catch (err) {
      console.error("Error testing MongoDB:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Run the test on page load
    testConnection();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">MongoDB Connection Test</h1>

      <div className="mb-6">
        <Button
          onClick={() => testConnection()}
          disabled={loading}
          className="mr-2"
        >
          {loading ? "Testing..." : "Test Connection"}
        </Button>

        <div className="mt-4 flex items-center">
          <input
            type="text"
            value={directApiUrl}
            onChange={(e) => setDirectApiUrl(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mr-2"
            placeholder="API URL"
          />
          <Button onClick={() => testConnection(directApiUrl)}>
            Test Custom URL
          </Button>
        </div>
      </div>

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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded shadow-sm">
                  <h3 className="font-medium">Database Info</h3>
                  <p>Name: {result.databaseName}</p>
                  <p>Collections: {result.collectionCount}</p>
                </div>

                <div className="bg-white p-3 rounded shadow-sm">
                  <h3 className="font-medium">Cars Collection</h3>
                  <p>Document Count: {result.carsCollection.documentCount}</p>
                  <p>
                    Latest Car ID: {result.carsCollection.latestCarId || "None"}
                  </p>
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow-sm mb-4">
                <h3 className="font-medium mb-2">Database Stats</h3>
                <p>Data Size: {result.databaseStats.dataSize}</p>
                <p>Storage Size: {result.databaseStats.storageSize}</p>
                <p>Document Count: {result.databaseStats.documentsCount}</p>
              </div>

              <div className="bg-white p-3 rounded shadow-sm">
                <h3 className="font-medium mb-2">Collection Names</h3>
                <ul className="list-disc pl-5">
                  {result.collections.map((collection: string) => (
                    <li key={collection}>{collection}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="mt-4 bg-white p-3 rounded shadow-sm">
            <h3 className="font-medium mb-2">Environment</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
              {JSON.stringify(result.environment || {}, null, 2)}
            </pre>
          </div>

          {result.error && (
            <div className="mt-4 bg-red-50 p-3 rounded shadow-sm border border-red-200">
              <h3 className="font-medium mb-2 text-red-700">Error Details</h3>
              <pre className="bg-white p-2 rounded text-sm overflow-auto max-h-60 whitespace-pre-wrap">
                {JSON.stringify(result.error, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Timestamp: {result.timestamp}
          </div>
        </div>
      )}
    </div>
  );
}
