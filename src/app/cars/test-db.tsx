"use client";

import { useEffect, useState } from "react";
import { useAPI } from "@/hooks/useAPI";

interface TestDBResponse {
  error?: string;
  count?: number;
  cars?: any[];
}

export default function TestDatabase() {
  const api = useAPI();
  const [status, setStatus] = useState("Loading...");
  const [cars, setCars] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api) return;

    async function testConnection() {
      try {
        setStatus("Testing database connection...");

        // Direct API call to check database - api is guaranteed to be non-null here
        const data = (await api!.get("test-db")) as TestDBResponse;

        if (data.error) {
          setError(data.error);
          setStatus("Error connecting to database");
          return;
        }

        setStatus(`Connected to database. Found ${data.count} cars.`);
        setCars(data.cars || []);
      } catch (err) {
        console.error("Failed to test database:", err);
        setError(String(err));
        setStatus("Error connecting to database");
      }
    }

    testConnection();
  }, [api]);

  if (!api) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      <div className="mb-4 p-4 border rounded">
        <p className="font-semibold">
          Status:{" "}
          <span
            className={
              status.includes("Error") ? "text-red-500" : "text-green-500"
            }
          >
            {status}
          </span>
        </p>
        {error && <p className="text-red-500 mt-2">Error: {error}</p>}
      </div>

      {cars.length > 0 ? (
        <div>
          <h2 className="text-xl mb-2">Cars in Database ({cars.length}):</h2>
          <ul className="space-y-2">
            {cars.map((car: any) => (
              <li key={car._id} className="p-2 border rounded">
                <p>ID: {car._id}</p>
                <p>Make: {car.make || "N/A"}</p>
                <p>Model: {car.model || "N/A"}</p>
                <p>Year: {car.year || "N/A"}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="italic">No cars found in database</p>
      )}

      <div className="mt-4">
        <button
          onClick={() => (window.location.href = "/cars")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Cars
        </button>
      </div>
    </div>
  );
}
