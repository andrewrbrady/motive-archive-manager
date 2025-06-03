/**
 * Car Details Context - Global car details management for deliverables
 *
 * This context solves the N+1 API call problem where every deliverable component
 * that needs car details was causing individual API calls or the deliverables API
 * was making individual car queries. Now car details are fetched in batches and cached globally.
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useAPI } from "@/hooks/useAPI";

interface CarDetails {
  _id: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  vin?: string;
}

interface CarDetailsContextType {
  carDetails: Record<string, CarDetails>;
  isLoading: boolean;
  error: string | null;
  getCarDetails: (carId: string) => CarDetails | undefined;
  getCarDetailsBatch: (carIds: string[]) => Record<string, CarDetails>;
  preloadCarDetails: (carIds: string[]) => Promise<void>;
}

const CarDetailsContext = createContext<CarDetailsContextType | undefined>(
  undefined
);

interface CarDetailsProviderProps {
  children: ReactNode;
}

export function CarDetailsProvider({ children }: CarDetailsProviderProps) {
  const [carDetails, setCarDetails] = useState<Record<string, CarDetails>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingIds, setFetchingIds] = useState<Set<string>>(new Set());

  // Queue for pending IDs to be processed in batches
  const pendingIds = useRef<Set<string>>(new Set());
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const api = useAPI();

  // Batch fetch car details with throttling
  const fetchCarDetailsInternal = useCallback(
    async (carIds: string[]) => {
      if (!api || carIds.length === 0) return;

      // Filter out IDs we already have or are currently fetching
      const idsToFetch = carIds.filter(
        (id) => !carDetails[id] && !fetchingIds.has(id)
      );

      if (idsToFetch.length === 0) return;

      // Mark as fetching
      setFetchingIds((prev) => new Set([...prev, ...idsToFetch]));
      setIsLoading(true);

      try {
        // Use the cars API with multiple IDs
        const idsParam = idsToFetch.join(",");
        const response = await api.get(
          `cars?ids=${idsParam}&fields=_id,make,model,year,color,vin`
        );

        const carsData = Array.isArray(response)
          ? response
          : (response as any)?.cars || [];

        // Build a map of car details
        const newCarDetails: Record<string, CarDetails> = {};
        carsData.forEach((car: any) => {
          if (car._id) {
            newCarDetails[car._id] = {
              _id: car._id,
              make: car.make || "Unknown",
              model: car.model || "Vehicle",
              year: car.year || 0,
              color: car.color,
              vin: car.vin,
            };
          }
        });

        // Update state with new car details
        setCarDetails((prev) => ({ ...prev, ...newCarDetails }));

        if (process.env.NODE_ENV === "development") {
          console.log(
            `✅ CarDetailsContext: Loaded ${Object.keys(newCarDetails).length} car details`
          );
        }
      } catch (error) {
        console.error(
          "❌ CarDetailsContext: Failed to fetch car details:",
          error
        );
        setError(
          error instanceof Error ? error.message : "Failed to load car details"
        );
      } finally {
        // Remove from fetching set
        setFetchingIds((prev) => {
          const newSet = new Set(prev);
          idsToFetch.forEach((id) => newSet.delete(id));
          return newSet;
        });
        setIsLoading(false);
      }
    },
    [api, carDetails, fetchingIds]
  );

  // Process batches with throttling
  const processBatches = useCallback(() => {
    if (pendingIds.current.size > 0) {
      const idsToFetch = Array.from(pendingIds.current);
      pendingIds.current.clear();
      fetchCarDetailsInternal(idsToFetch);
    }

    // Schedule next batch processing
    fetchTimeoutRef.current = setTimeout(processBatches, 300);
  }, [fetchCarDetailsInternal]);

  // Start batch processing
  useEffect(() => {
    fetchTimeoutRef.current = setTimeout(processBatches, 100);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [processBatches]);

  // Helper to get car details with auto-fetch
  const getCarDetails = useCallback(
    (carId: string): CarDetails | undefined => {
      if (!carId) return undefined;

      // Return cached details if available
      if (carDetails[carId]) {
        return carDetails[carId];
      }

      // Queue for batch fetch if not already fetching
      if (!fetchingIds.has(carId)) {
        pendingIds.current.add(carId);
      }

      return undefined;
    },
    [carDetails, fetchingIds]
  );

  // Helper to get multiple car details
  const getCarDetailsBatch = useCallback(
    (carIds: string[]): Record<string, CarDetails> => {
      const result: Record<string, CarDetails> = {};
      const missingIds: string[] = [];

      carIds.forEach((carId) => {
        if (carDetails[carId]) {
          result[carId] = carDetails[carId];
        } else if (!fetchingIds.has(carId)) {
          missingIds.push(carId);
        }
      });

      // Queue missing IDs for batch fetch
      if (missingIds.length > 0) {
        missingIds.forEach((id) => pendingIds.current.add(id));
      }

      return result;
    },
    [carDetails, fetchingIds]
  );

  // Public method to preload car details (useful for optimization)
  const preloadCarDetails = useCallback(
    async (carIds: string[]): Promise<void> => {
      const missingIds = carIds.filter(
        (id) => !carDetails[id] && !fetchingIds.has(id)
      );
      if (missingIds.length > 0) {
        await fetchCarDetailsInternal(missingIds);
      }
    },
    [carDetails, fetchingIds, fetchCarDetailsInternal]
  );

  const contextValue: CarDetailsContextType = {
    carDetails,
    isLoading,
    error,
    getCarDetails,
    getCarDetailsBatch,
    preloadCarDetails,
  };

  return (
    <CarDetailsContext.Provider value={contextValue}>
      {children}
    </CarDetailsContext.Provider>
  );
}

export function useCarDetails(): CarDetailsContextType {
  const context = useContext(CarDetailsContext);
  if (context === undefined) {
    throw new Error("useCarDetails must be used within a CarDetailsProvider");
  }
  return context;
}
