"use client";

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  ReactNode,
  useRef,
  useEffect,
} from "react";

// Car details interface for storing raw car data
export interface CarDetails {
  _id: string;
  year?: number | string;
  make?: string;
  model?: string;
  color?: string;
  exteriorColor?: string;
}

interface LabelsContextType {
  carLabels: Record<string, string>;
  driveLabels: Record<string, string>;
  carDetails: Record<string, CarDetails>;
  fetchingCarIds: Set<string>;
  fetchingDriveIds: Set<string>;
  fetchCarLabels: (carIds: string[]) => Promise<Record<string, string>>;
  fetchDriveLabels: (driveIds: string[]) => Promise<Record<string, string>>;
  getCarLabel: (carId: string) => string;
  getCarDetails: (carId: string) => CarDetails | null;
  getDriveLabel: (driveId: string) => string;
}

const defaultContext: LabelsContextType = {
  carLabels: {},
  driveLabels: {},
  carDetails: {},
  fetchingCarIds: new Set<string>(),
  fetchingDriveIds: new Set<string>(),
  fetchCarLabels: async () => ({}),
  fetchDriveLabels: async () => ({}),
  getCarLabel: () => "",
  getCarDetails: () => null,
  getDriveLabel: () => "",
};

// Create context
const LabelsContext = createContext<LabelsContextType>(defaultContext);

export const LabelsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // State for labels
  const [carLabels, setCarLabels] = useState<Record<string, string>>({});
  const [driveLabels, setDriveLabels] = useState<Record<string, string>>({});
  const [carDetails, setCarDetails] = useState<Record<string, CarDetails>>({});

  // State for tracking which IDs are currently being fetched
  const [fetchingCarIds, setFetchingCarIds] = useState<Set<string>>(new Set());
  const [fetchingDriveIds, setFetchingDriveIds] = useState<Set<string>>(
    new Set()
  );

  // Queue for pending IDs to be processed in batches
  const pendingCarIds = useRef<Set<string>>(new Set());
  const pendingDriveIds = useRef<Set<string>>(new Set());
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Internal implementation for car labels that doesn't get exposed directly
  const fetchCarLabelsInternal = useCallback(
    async (carIds: string[]) => {
      if (!carIds.length) return {};

      // Filter out already cached IDs
      const uncachedIds = carIds.filter((id) => !carLabels[id]);
      if (uncachedIds.length === 0) return carLabels;

      // Mark these IDs as being fetched
      setFetchingCarIds((prev) => {
        const newSet = new Set(prev);
        uncachedIds.forEach((id) => newSet.add(id));
        return newSet;
      });

      try {
        // Use the batch endpoint instead of the main cars endpoint
        console.log(`Fetching car labels for IDs: ${uncachedIds.join(", ")}`);
        const response = await fetch(
          `/api/cars/batch?ids=${uncachedIds.join(",")}`
        );

        // Log the full URL to help with debugging
        console.log(
          `API Request URL: /api/cars/batch?ids=${uncachedIds.join(",")}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch car labels: ${response.statusText} (${response.status})`
          );
        }

        const data = await response.json();

        // Enhanced logging to debug API response structure
        console.log("Car labels API response structure:", Object.keys(data));
        console.log(
          "Cars array type:",
          Array.isArray(data.cars) ? "array" : typeof data.cars
        );
        console.log(
          "Cars count:",
          Array.isArray(data.cars) ? data.cars.length : "not an array"
        );

        // Log debug info if provided
        if (data.debug) {
          console.log("API debug info:", data.debug);
        }

        // Handle both response formats: {cars: []} and {data: []}
        const carsArray = Array.isArray(data.cars)
          ? data.cars
          : Array.isArray(data.data)
          ? data.data
          : [];

        if (carsArray.length === 0) {
          console.warn("No cars returned from API for IDs:", uncachedIds);
          console.warn(
            "This might indicate missing data in the database or an issue with ID formats"
          );
        } else if (carsArray.length < uncachedIds.length) {
          console.warn(
            `Only ${carsArray.length} of ${uncachedIds.length} requested cars were found`
          );

          // Log which IDs weren't found
          const foundIds = new Set(
            carsArray.map((car: any) => car._id.toString())
          );
          const missingIds = uncachedIds.filter((id) => !foundIds.has(id));
          console.warn("Missing car IDs:", missingIds);
        }

        // Process the results
        const newLabels: Record<string, string> = {};
        const newDetails: Record<string, CarDetails> = {};

        carsArray.forEach((car: any) => {
          if (!car || !car._id) return;

          const carIdStr = car._id.toString();
          const year = car.year || "";
          const make = car.make || "";
          const model = car.model || "";
          const color = car.exteriorColor || car.color || "";

          // Format the label with all available information
          // CRITICAL: Year, Make, Model, Color format as requested
          let formattedParts: string[] = [];

          if (year) formattedParts.push(year.toString());
          if (make) formattedParts.push(make);
          if (model) formattedParts.push(model);

          let label = formattedParts.join(" ");
          if (color) label += ` (${color})`;

          // IMPORTANT: Only use fallback as absolute last resort
          if (
            !label.trim() ||
            label === " " ||
            label === "()" ||
            label === "()"
          ) {
            // Try another format if partial data available
            if (year) label = `${year}`;
            else if (make) label = make;
            else if (model) label = model;
            else if (color) label = `Car (${color})`;
            else label = `Car ${carIdStr.substring(0, 8)}`;
          }

          newLabels[carIdStr] = label;

          // Store car details for later use
          newDetails[carIdStr] = {
            _id: carIdStr,
            year: year,
            make: make,
            model: model,
            color: color || car.exteriorColor,
            exteriorColor: car.exteriorColor || color,
          };
        });

        // Add fallbacks for any IDs that weren't returned - WITHOUT scheduling retries
        uncachedIds.forEach((id) => {
          if (!newLabels[id]) {
            newLabels[id] = `Car ${id.substring(0, 8)}`;

            // Also add placeholder car details to prevent continuous retries
            newDetails[id] = {
              _id: id,
              year: "Unknown",
              make: "Vehicle",
              model: id.substring(0, 8),
              color: "Unknown",
            };

            // Mark in sessionStorage that we've tried this ID multiple times
            // Only if we're running in the browser
            if (typeof window !== "undefined") {
              sessionStorage.setItem(`car-retry-${id}`, "3");
            }
          }
        });

        // Update state non-destructively
        setCarLabels((prev) => ({ ...prev, ...newLabels }));
        setCarDetails((prev) => ({ ...prev, ...newDetails }));

        return { ...carLabels, ...newLabels };
      } catch (error) {
        console.error("Error fetching car labels:", error);

        // Create fallbacks for all requested IDs - WITHOUT scheduling retries
        const fallbackLabels: Record<string, string> = {};
        const fallbackDetails: Record<string, CarDetails> = {};

        uncachedIds.forEach((id) => {
          fallbackLabels[id] = `Car ${id.substring(0, 8)}`;

          // Add placeholder details for failed fetches too
          fallbackDetails[id] = {
            _id: id,
            year: "Unknown",
            make: "Vehicle",
            model: id.substring(0, 8),
            color: "Unknown",
          };

          // Mark as max retries to prevent further attempts
          if (typeof window !== "undefined") {
            sessionStorage.setItem(`car-retry-${id}`, "3");
          }
        });

        setCarLabels((prev) => ({ ...prev, ...fallbackLabels }));
        setCarDetails((prev) => ({ ...prev, ...fallbackDetails }));

        return { ...carLabels, ...fallbackLabels };
      } finally {
        // Clear fetching status
        setFetchingCarIds((prev) => {
          const newSet = new Set(prev);
          uncachedIds.forEach((id) => newSet.delete(id));
          return newSet;
        });
      }
    },
    [carLabels]
  );

  // Internal implementation for drive labels
  const fetchDriveLabelsInternal = useCallback(
    async (driveIds: string[]) => {
      if (!driveIds.length) return {};

      // Filter out already cached IDs
      const uncachedIds = driveIds.filter((id) => !driveLabels[id]);
      if (uncachedIds.length === 0) return driveLabels;

      // Mark these IDs as being fetched
      setFetchingDriveIds((prev) => {
        const newSet = new Set(prev);
        uncachedIds.forEach((id) => newSet.add(id));
        return newSet;
      });

      try {
        const response = await fetch(
          `/api/hard-drives?ids=${uncachedIds.join(",")}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch drive labels: ${response.statusText}`
          );
        }

        const data = await response.json();
        const drives = data.drives || data.data || [];

        if (!Array.isArray(drives)) {
          throw new Error("Invalid response format");
        }

        // Process the results
        const newLabels: Record<string, string> = {};

        drives.forEach((drive: any) => {
          if (!drive || !drive._id) return;

          const driveIdStr = drive._id.toString();
          const label =
            drive.label || drive.name || `Drive ${driveIdStr.substring(0, 8)}`;

          newLabels[driveIdStr] = label;
        });

        // Add fallbacks for any IDs that weren't returned
        uncachedIds.forEach((id) => {
          if (!newLabels[id]) {
            newLabels[id] = `Drive ${id.substring(0, 8)}`;

            // Mark in sessionStorage that we've tried this ID multiple times
            sessionStorage.setItem(`drive-retry-${id}`, "3");
          }
        });

        // Update state non-destructively
        setDriveLabels((prev) => ({ ...prev, ...newLabels }));

        return { ...driveLabels, ...newLabels };
      } catch (error) {
        // Create fallbacks for all requested IDs
        const fallbackLabels: Record<string, string> = {};
        uncachedIds.forEach((id) => {
          fallbackLabels[id] = `Drive ${id.substring(0, 8)}`;

          // Mark as max retries to prevent further attempts
          sessionStorage.setItem(`drive-retry-${id}`, "3");
        });

        setDriveLabels((prev) => ({ ...prev, ...fallbackLabels }));
        return { ...driveLabels, ...fallbackLabels };
      } finally {
        // Clear fetching status
        setFetchingDriveIds((prev) => {
          const newSet = new Set(prev);
          uncachedIds.forEach((id) => newSet.delete(id));
          return newSet;
        });
      }
    },
    [driveLabels]
  );

  // Process batches of pending IDs periodically - NOW DEFINED AFTER THE INTERNAL FUNCTIONS
  const processBatches = useCallback(() => {
    // Process car IDs
    if (pendingCarIds.current.size > 0) {
      // Filter out IDs that have been attempted several times already
      const carIdsToFetch = Array.from(pendingCarIds.current).filter((id) => {
        // Only check sessionStorage in browser environment
        if (typeof window !== "undefined") {
          const retryKey = `car-retry-${id}`;
          const retryCount = parseInt(sessionStorage.getItem(retryKey) || "0");
          return retryCount < 3; // Only attempt each ID up to 3 times
        }
        return true; // In SSR, always try to fetch
      });

      pendingCarIds.current.clear();

      if (carIdsToFetch.length > 0) {
        fetchCarLabelsInternal(carIdsToFetch);
      }
    }

    // Process drive IDs
    if (pendingDriveIds.current.size > 0) {
      // Filter out IDs that have been attempted several times already
      const driveIdsToFetch = Array.from(pendingDriveIds.current).filter(
        (id) => {
          // Only check sessionStorage in browser environment
          if (typeof window !== "undefined") {
            const retryKey = `drive-retry-${id}`;
            const retryCount = parseInt(
              sessionStorage.getItem(retryKey) || "0"
            );
            return retryCount < 3; // Only attempt each ID up to 3 times
          }
          return true; // In SSR, always try to fetch
        }
      );

      pendingDriveIds.current.clear();

      if (driveIdsToFetch.length > 0) {
        fetchDriveLabelsInternal(driveIdsToFetch);
      }
    }

    // Schedule next batch processing with a longer timeout (300ms instead of 50ms)
    fetchTimeoutRef.current = setTimeout(processBatches, 300);
  }, [fetchCarLabelsInternal, fetchDriveLabelsInternal]);

  // Start batch processing on mount, clean up on unmount
  useEffect(() => {
    fetchTimeoutRef.current = setTimeout(processBatches, 300);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [processBatches]);

  // Public API for car labels
  const fetchCarLabels = useCallback(
    (carIds: string[]): Promise<Record<string, string>> => {
      if (!carIds.length) return Promise.resolve({});

      // Queue these IDs for the next batch
      carIds.forEach((id) => pendingCarIds.current.add(id.toString()));

      // Return current labels synchronously
      return Promise.resolve(carLabels);
    },
    [carLabels]
  );

  // Public API for drive labels
  const fetchDriveLabels = useCallback(
    (driveIds: string[]): Promise<Record<string, string>> => {
      if (!driveIds.length) return Promise.resolve({});

      // Queue these IDs for the next batch
      driveIds.forEach((id) => pendingDriveIds.current.add(id.toString()));

      // Return current labels synchronously
      return Promise.resolve(driveLabels);
    },
    [driveLabels]
  );

  // Helper to get car label with auto-fetch - SIMPLIFIED to prevent cascading fetches
  const getCarLabel = useCallback(
    (carId: string): string => {
      if (!carId) return "Unknown Car";
      const id = carId.toString();

      // Return cached label if available
      if (carLabels[id]) {
        return carLabels[id];
      }

      // Queue for batch fetch ONLY if not already fetching - no direct fetch
      if (!fetchingCarIds.has(id)) {
        pendingCarIds.current.add(id);
      }

      // Return loading/fallback state
      return fetchingCarIds.has(id)
        ? "Loading..."
        : `Car ${id.substring(0, 8)}`;
    },
    [carLabels, fetchingCarIds]
  );

  // Helper to get drive label with auto-fetch - SIMPLIFIED to match car label implementation
  const getDriveLabel = useCallback(
    (driveId: string): string => {
      if (!driveId) return "Unknown Drive";
      const id = driveId.toString();

      // Return cached label if available
      if (driveLabels[id]) {
        return driveLabels[id];
      }

      // Queue for batch fetch ONLY if not already fetching - no direct fetch
      if (!fetchingDriveIds.has(id)) {
        pendingDriveIds.current.add(id);
      }

      // Return loading/fallback state
      return fetchingDriveIds.has(id)
        ? "Loading..."
        : `Drive ${id.substring(0, 8)}`;
    },
    [driveLabels, fetchingDriveIds]
  );

  // Helper to get car details
  const getCarDetails = useCallback(
    (carId: string): CarDetails | null => {
      if (!carId) return null;
      const id = carId.toString();

      // Return cached details if available
      if (carDetails[id]) {
        return carDetails[id];
      }

      // Check if we've already attempted to fetch this ID several times and failed
      // This helps prevent continuous polling in case the car simply doesn't exist
      let retryCount = 0;

      // Only access sessionStorage on the client-side
      if (typeof window !== "undefined") {
        const hasRetryCountKey = `car-retry-${id}`;
        retryCount = parseInt(sessionStorage.getItem(hasRetryCountKey) || "0");

        // If we've tried 3+ times and still don't have details, don't try again
        if (retryCount >= 3) {
          // Return a minimal placeholder to prevent constant retries
          return {
            _id: id,
            year: "Unknown",
            make: "Unknown",
            model: "Vehicle",
          };
        }

        // Queue for batch fetch if not already fetching
        if (!fetchingCarIds.has(id)) {
          pendingCarIds.current.add(id);

          // Increment the retry counter
          sessionStorage.setItem(hasRetryCountKey, (retryCount + 1).toString());
        }
      } else {
        // In SSR context, just queue the ID without sessionStorage checks
        if (!fetchingCarIds.has(id)) {
          pendingCarIds.current.add(id);
        }
      }

      return null;
    },
    [carDetails, fetchingCarIds]
  );

  const value = {
    carLabels,
    driveLabels,
    carDetails,
    fetchingCarIds,
    fetchingDriveIds,
    fetchCarLabels,
    fetchDriveLabels,
    getCarLabel,
    getDriveLabel,
    getCarDetails,
  };

  return (
    <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>
  );
};

// Custom hook for using the labels context
export const useLabels = () => useContext(LabelsContext);

export default LabelsContext;
