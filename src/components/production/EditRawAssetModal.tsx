"use client";

import React, { useState, useEffect, useRef } from "react";
import { XIcon, HardDriveIcon, Search, CarIcon } from "lucide-react";
import { RawAssetData } from "@/models/raw_assets";
import { HardDriveData } from "@/models/hard-drive";
import CarSelector from "@/components/CarSelector";
import { ObjectId } from "@/lib/types";
import { Car } from "@/types/car";

interface EditRawAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Partial<RawAssetData>) => Promise<void>;
  asset?: RawAssetData;
}

// Ensure HardDriveData has required _id as string for UI
interface HardDriveWithId extends Omit<HardDriveData, "_id"> {
  _id: string;
  name?: string; // Some drives might use 'name' instead of 'label'
}

// Add helper function to safely compare car IDs
const isSameCarId = (id1: any, id2: any): boolean => {
  // Convert both IDs to strings for safe comparison
  const strId1 = typeof id1 === "string" ? id1 : id1?.toString();
  const strId2 = typeof id2 === "string" ? id2 : id2?.toString();
  return strId1 === strId2;
};

// Helper function to find a car in the cache by ID
const findCarInCache = (cache: Record<string, any>, carId: string): any => {
  // First try direct lookup by ID
  if (cache[carId]) {
    return cache[carId];
  }

  // Then try finding the car by comparing IDs using isSameCarId
  return Object.values(cache).find((car) => isSameCarId(car._id, carId));
};

// Helper function to format a car ID for display
const formatCarId = (id: string): string => {
  if (!id) return "Unknown Car";
  const cleanId = id.toString().replace(/[^a-zA-Z0-9]/g, "");
  return cleanId.substring(0, 8);
};

// Helper function to check if a car has proper metadata
const hasProperCarData = (car: any): boolean => {
  return !!(car && (car.make || car.model || car.year));
};

// Helper function to fetch a single car by ID - used as a last resort
const fetchSingleCar = async (carId: string): Promise<any> => {
  try {
    // [REMOVED] // [REMOVED] console.log(`Attempting direct fetch for car with ID: ${carId}`);
    const response = await fetch(
      `/api/cars/${carId}?fields=_id,year,make,model,color,manufacturing`
    );

    if (!response.ok) {
      console.warn(
        `Failed to fetch car with ID ${carId}: ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    // [REMOVED] // [REMOVED] console.log(`Direct fetch for car ${carId} successful:`, data);

    // Get the car data from the response
    const car = data.car || data;

    if (car && car._id) {
      // Format and cache the car data
      const formattedCar = {
        _id: car._id,
        make: car.make || "",
        model: car.model || "",
        year: car.year || null,
        color: car.color || "",
        manufacturing: car.manufacturing || {},
      };

      return formattedCar;
    }
  } catch (error) {
    console.error(`Error fetching individual car ${carId}:`, error);
  }

  return null;
};

interface RawAsset {
  _id: string;
  date: string;
  description: string;
  hardDriveIds: string[];
  carIds: string[];
  cars?: Car[];
  createdAt?: Date;
  updatedAt?: Date;
}

export default function EditRawAssetModal({
  isOpen,
  onClose,
  onSave,
  asset,
}: EditRawAssetModalProps) {
  // Keep track of the initial asset to avoid resetting form data when the component rerenders
  const [initialAssetId, setInitialAssetId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RawAssetData>>({
    date: "",
    description: "",
    hardDriveIds: [],
    carIds: [],
  });
  const [selectedCars, setSelectedCars] = useState<any[]>([]);
  const [selectedDrives, setSelectedDrives] = useState<HardDriveWithId[]>([]);
  const [availableDrives, setAvailableDrives] = useState<HardDriveWithId[]>([]);
  const [driveSearchTerm, setDriveSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDrives, setIsLoadingDrives] = useState(false);
  const [hasModifiedForm, setHasModifiedForm] = useState(false);
  const [selectedDriveIndex, setSelectedDriveIndex] = useState(-1);
  const [showDriveSuggestions, setShowDriveSuggestions] = useState(false);
  const [carCache, setCarCache] = useState<Record<string, any>>({});
  const driveSearchRef = useRef<HTMLDivElement>(null);

  // Reset form data when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        date: "",
        description: "",
        hardDriveIds: [],
        carIds: [],
      });
      setSelectedCars([]);
      setSelectedDrives([]);
      setError(null);
      setInitialAssetId(null);
      setHasModifiedForm(false);
    }
  }, [isOpen]);

  // Fetch hard drives
  useEffect(() => {
    const fetchDrives = async () => {
      setIsLoadingDrives(true);
      try {
        const response = await fetch(
          `/api/hard-drives?search=${encodeURIComponent(driveSearchTerm)}`
        );
        if (!response.ok) throw new Error("Failed to fetch hard drives");
        const data = await response.json();
        // Ensure _id is string
        setAvailableDrives(
          (data.drives || data.data || []).map(
            (drive: HardDriveData & { _id: ObjectId }) => ({
              ...drive,
              _id: drive._id.toString(),
            })
          )
        );
      } catch (error) {
        console.error("Error fetching hard drives:", error);
      } finally {
        setIsLoadingDrives(false);
      }
    };

    fetchDrives();
  }, [driveSearchTerm]);

  // Initialize form data when asset changes, but only if it's a new asset or the modal was just opened
  useEffect(() => {
    if (!asset) {
      // Reset form for a new asset
      setFormData({
        date: "",
        description: "",
        hardDriveIds: [],
        carIds: [],
      });
      setSelectedCars([]);
      setSelectedDrives([]);
      setInitialAssetId(null);
      return;
    }

    const currentAssetId = asset._id?.toString() || null;

    // Only initialize if:
    // 1. It's a different asset than we've seen before
    // 2. Or we haven't modified the form yet
    if (currentAssetId !== initialAssetId || (!hasModifiedForm && isOpen)) {
      // [REMOVED] // [REMOVED] console.log("Initializing form with asset:", asset);

      // Save this as our initial asset
      setInitialAssetId(currentAssetId);

      const hardDriveIds = asset.hardDriveIds || [];
      const carIds = asset.carIds || [];

      setFormData({
        date: asset.date || "",
        description: asset.description || "",
        hardDriveIds,
        carIds,
      });

      // Pre-populate car cache with existing selectedCars if available
      // This helps when re-opening the same asset multiple times
      if (selectedCars && selectedCars.length > 0) {
        const newCacheEntries: Record<string, any> = {};
        selectedCars.forEach((car) => {
          if (car && car._id && hasProperCarData(car)) {
            const carIdStr =
              typeof car._id === "string" ? car._id : car._id?.toString();
            if (carIdStr) {
              newCacheEntries[carIdStr] = car;
            }
          }
        });

        if (Object.keys(newCacheEntries).length > 0) {
          setCarCache((prevCache) => ({
            ...prevCache,
            ...newCacheEntries,
          }));
        }
      }

      // Fetch car details for selected cars
      const fetchSelectedCars = async () => {
        try {
          // Ensure carIds are strings
          const carIdsAsStrings = carIds.map((id) =>
            typeof id === "string" ? id : (id as any).toString()
          );

          if (carIdsAsStrings.length === 0) {
            setSelectedCars([]);
            return;
          }

          // [REMOVED] // [REMOVED] console.log("Car IDs to fetch:", carIdsAsStrings);

          // Check which cars we already have in the cache
          const cachedCars: any[] = [];
          const missingCarIds: string[] = [];

          carIdsAsStrings.forEach((id) => {
            // Use proper id comparison
            const cachedCar = findCarInCache(carCache, id);

            // Only use cached car if it has proper data
            if (cachedCar && hasProperCarData(cachedCar)) {
              console.log(
                `Using cached car with proper data: ${cachedCar.make} ${cachedCar.model}`
              );
              cachedCars.push(cachedCar);
            } else {
              // Car not in cache or has incomplete data - fetch it again
              console.log(
                `Car ${id} not in cache or has incomplete data - will fetch`
              );
              missingCarIds.push(id);
            }
          });

          console.log(
            `Using ${cachedCars.length} cached cars, fetching ${missingCarIds.length} new cars`
          );

          // If all cars are cached, use them directly
          if (missingCarIds.length === 0) {
            // [REMOVED] // [REMOVED] console.log("All cars found in cache:", cachedCars);
            setSelectedCars(cachedCars);
            return;
          }

          // Fetch only the missing cars
          // [REMOVED] // [REMOVED] console.log("Fetching cars for IDs:", missingCarIds);

          const response = await fetch(
            `/api/cars?ids=${missingCarIds.join(
              ","
            )}&fields=_id,year,make,model,color,exteriorColor,manufacturing`
          );

          if (!response.ok) {
            console.error(`Failed to fetch cars: ${response.statusText}`);
            // Fallback to just IDs for the missing cars
            const fallbackMissingCars = missingCarIds.map((id) => ({
              _id: id,
              make: `Car ${formatCarId(id)}`,
              model: "",
              year: null,
              color: "",
              manufacturing: {},
            }));

            // Combine with cached cars
            setSelectedCars([...cachedCars, ...fallbackMissingCars]);
            return;
          }

          const data = await response.json();
          // [REMOVED] // [REMOVED] console.log("Fetched car data:", data);

          if (data && data.cars && Array.isArray(data.cars)) {
            // [REMOVED] // [REMOVED] console.log("Raw car data from API:", data.cars);

            // Process the newly fetched cars
            const newlyFetchedCars = data.cars
              .filter((car: any) => {
                // Ensure we only include cars that match our missing IDs
                return missingCarIds.includes(car._id.toString());
              })
              .map((car: any) => ({
                _id: car._id,
                make: car.make || "",
                model: car.model || "",
                year: car.year || null,
                color: car.exteriorColor || car.color || "",
                manufacturing: car.manufacturing || {},
              }));

            // Update the car cache with newly fetched cars
            const newCacheEntries: Record<string, any> = {};
            newlyFetchedCars.forEach((car: any) => {
              // Ensure the ID is converted to a string for consistency
              const carIdStr =
                typeof car._id === "string" ? car._id : car._id?.toString();
              if (carIdStr) {
                newCacheEntries[carIdStr] = car;
              }
            });

            setCarCache((prevCache) => ({
              ...prevCache,
              ...newCacheEntries,
            }));

            // Combine cached and newly fetched cars
            const allCars = [...cachedCars, ...newlyFetchedCars];
            console.log(
              "Combined cars (cached + newly fetched):",
              allCars.map((car) => ({
                id: car._id,
                make: car.make,
                model: car.model,
              }))
            );

            // Make sure the cars are in the same order as the original carIds
            const orderedCars = carIdsAsStrings.map((id) => {
              const foundCar = allCars.find((car) => car._id.toString() === id);
              if (!foundCar || !hasProperCarData(foundCar)) {
                console.log(
                  `No car with proper data found for ID: ${id}, will try individual fetch`
                );
                // We'll fetch these individually after setting initial state
                return {
                  _id: id,
                  make: `Car ${formatCarId(id)}`,
                  model: "",
                  year: null,
                  color: "",
                  manufacturing: {},
                };
              }
              return foundCar;
            });

            // [REMOVED] // [REMOVED] console.log("Final processed cars:", orderedCars);
            setSelectedCars(orderedCars);

            // For cars without proper data, try individual fetches
            const carsNeedingFetch = orderedCars.filter(
              (car) => !hasProperCarData(car)
            );
            if (carsNeedingFetch.length > 0) {
              console.log(
                `Found ${carsNeedingFetch.length} cars needing individual fetches`
              );
              // Attempt individual fetches after setting initial state
              setTimeout(async () => {
                const updatedCars = [...orderedCars];
                let hasUpdates = false;

                for (const car of carsNeedingFetch) {
                  const fetchedCar = await fetchSingleCar(car._id.toString());
                  if (fetchedCar && hasProperCarData(fetchedCar)) {
                    console.log(
                      `Successfully fetched individual car: ${fetchedCar.make} ${fetchedCar.model}`
                    );
                    // Update the car in our array
                    const idx = updatedCars.findIndex(
                      (c) => c._id.toString() === car._id.toString()
                    );
                    if (idx >= 0) {
                      updatedCars[idx] = fetchedCar;
                      hasUpdates = true;

                      // Add to cache
                      setCarCache((prevCache) => ({
                        ...prevCache,
                        [car._id.toString()]: fetchedCar,
                      }));
                    }
                  }
                }

                // Only update if we actually got better data
                if (hasUpdates) {
                  console.log(
                    "Updating cars with individually fetched data:",
                    updatedCars
                  );
                  setSelectedCars(updatedCars);
                }
              }, 100);
            }
          } else {
            // Fallback to just IDs if response format is unexpected
            const fallbackCars = carIdsAsStrings.map((id) => ({
              _id: id,
              make: `Car ${formatCarId(id)}`,
              model: "",
              year: null,
              color: "",
              manufacturing: {},
            }));
            console.log(
              "Setting fallback car data (unexpected response format):",
              fallbackCars
            );
            setSelectedCars(fallbackCars);
          }
        } catch (error) {
          console.error("Error fetching selected cars:", error);
          // Fallback to just IDs if fetch fails
          const carIdsAsStrings = carIds.map((id) =>
            typeof id === "string" ? id : (id as any).toString()
          );
          const fallbackCars = carIdsAsStrings.map((id) => ({
            _id: id,
            make: `Car ${formatCarId(id)}`,
            model: "",
            year: null,
            color: "",
            manufacturing: {},
          }));
          // [REMOVED] // [REMOVED] console.log("Setting fallback car data after error:", fallbackCars);
          setSelectedCars(fallbackCars);
        }
      };

      // Fetch selected drives
      const fetchSelectedDrives = async () => {
        try {
          // Ensure hardDriveIds are strings
          const hardDriveIdsAsStrings = hardDriveIds.map((id) =>
            typeof id === "string" ? id : (id as any).toString()
          );

          // [REMOVED] // [REMOVED] console.log("Fetching drives for IDs:", hardDriveIdsAsStrings);

          const promises = hardDriveIdsAsStrings.map(async (hardDriveId) => {
            const response = await fetch(`/api/hard-drives/${hardDriveId}`);
            if (!response.ok) {
              console.error(`Failed to fetch drive ${hardDriveId}`);
              return null;
            }
            const data = await response.json();
            return {
              ...data,
              _id: data._id.toString(),
            };
          });

          const drives = (await Promise.all(promises)).filter(
            (drive): drive is HardDriveWithId => drive !== null
          );
          // [REMOVED] // [REMOVED] console.log("Fetched drives:", drives);
          setSelectedDrives(drives);
        } catch (error) {
          console.error("Error fetching selected drives:", error);
          setError("Failed to fetch drive information");
        }
      };

      // Fetch car data
      fetchSelectedCars();

      // Fetch drive data
      if (hardDriveIds.length) {
        fetchSelectedDrives();
      } else {
        setSelectedDrives([]);
      }
    } else {
      // [REMOVED] // [REMOVED] console.log("Skipping form reset - form has been modified or same asset");
    }
  }, [asset, initialAssetId, hasModifiedForm, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.date || !formData.description) {
        throw new Error("Date and description are required fields");
      }

      // Validate date format (YYMMDD)
      if (!/^\d{6}$/.test(formData.date)) {
        throw new Error(
          "Date must be in YYMMDD format (e.g., 240315 for March 15, 2024)"
        );
      }

      // Prepare the update data - ensure all IDs are strings
      const updatedAsset: Partial<RawAssetData> = {
        _id: asset?._id,
        date: formData.date,
        description: formData.description,
        // Ensure hard drive IDs are strings
        hardDriveIds: selectedDrives.map((drive) => drive._id.toString()),
        carIds: selectedCars.map((car) => car._id.toString()),
      };

      await onSave(updatedAsset);
      onClose();
    } catch (error) {
      console.error("Error saving asset:", error);
      setError(error instanceof Error ? error.message : "Failed to save asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDrive = (drive: HardDriveWithId) => {
    if (!selectedDrives.find((d) => d._id === drive._id)) {
      const updatedDrives = [...selectedDrives, drive];
      // [REMOVED] // [REMOVED] console.log("Adding drive:", drive, "Updated drives:", updatedDrives);
      setSelectedDrives(updatedDrives);
      // Update formData.hardDriveIds to keep in sync with selectedDrives
      setFormData((prevData) => ({
        ...prevData,
        hardDriveIds: updatedDrives.map((drive) => drive._id),
      }));
      // Mark the form as modified
      setHasModifiedForm(true);
    }
    setDriveSearchTerm("");
  };

  const handleRemoveDrive = (driveId: string) => {
    // [REMOVED] // [REMOVED] console.log("Removing drive:", driveId);
    const updatedDrives = selectedDrives.filter(
      (drive) => drive._id !== driveId
    );
    // [REMOVED] // [REMOVED] console.log("Updated drives after removal:", updatedDrives);
    setSelectedDrives(updatedDrives);
    // Update formData.hardDriveIds to keep in sync with selectedDrives
    setFormData((prevData) => ({
      ...prevData,
      hardDriveIds: updatedDrives.map((drive) => drive._id),
    }));
    // Mark the form as modified
    setHasModifiedForm(true);
  };

  const handleCarSelectionChange = (selectedCars: Car[]) => {
    // [REMOVED] // [REMOVED] console.log("Car selection changed:", selectedCars);
    setSelectedCars(selectedCars);
    setFormData((prevData) => ({
      ...prevData,
      carIds: selectedCars.map((car) => car._id),
    }));
    setHasModifiedForm(true);
  };

  // Handle text field changes and mark form as modified
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setHasModifiedForm(true);
  };

  // Filter available drives based on search term and exclude already selected drives
  const filteredDrives = availableDrives.filter(
    (drive) =>
      // Include drive if it matches search term (or if search term is empty)
      (driveSearchTerm === "" ||
        drive.label?.toLowerCase().includes(driveSearchTerm.toLowerCase()) ||
        drive.name?.toLowerCase().includes(driveSearchTerm.toLowerCase())) &&
      // Exclude drives already selected
      !selectedDrives.some((selected) => selected._id === drive._id)
  );

  // Reset selected index when drive suggestions change
  useEffect(() => {
    setSelectedDriveIndex(-1);
  }, [filteredDrives]);

  // Reset selectedDriveIndex when search term changes
  useEffect(() => {
    setSelectedDriveIndex(-1);
  }, [driveSearchTerm]);

  const handleDriveKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDriveSuggestions || isLoadingDrives || filteredDrives.length === 0)
      return;

    // Navigate through suggestions with arrow keys
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedDriveIndex((prev) =>
        prev < filteredDrives.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedDriveIndex((prev) =>
        prev > 0 ? prev - 1 : filteredDrives.length - 1
      );
    } else if (e.key === "Enter" && selectedDriveIndex >= 0) {
      e.preventDefault();
      const selectedDrive = filteredDrives[selectedDriveIndex];
      handleSelectDrive(selectedDrive);
    } else if (e.key === "Escape") {
      setShowDriveSuggestions(false);
    }
  };

  // Handle click outside to close drive suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        driveSearchRef.current &&
        !driveSearchRef.current.contains(event.target as Node)
      ) {
        setShowDriveSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--background))/95] backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-[hsl(var(--background))] p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-[hsl(var(--border))]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
            {asset ? "Edit Raw Asset" : "Add New Raw Asset"}
          </h2>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[hsl(var(--destructive))/10] border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Date*
            </label>
            <input
              type="text"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              placeholder="YYMMDD"
              pattern="\d{6}"
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Description*
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Storage Locations*
            </label>
            <div className="space-y-4">
              <div ref={driveSearchRef} className="relative">
                <input
                  type="text"
                  value={driveSearchTerm}
                  onChange={(e) => {
                    setDriveSearchTerm(e.target.value);
                    setShowDriveSuggestions(true);
                  }}
                  onFocus={() => setShowDriveSuggestions(true)}
                  onKeyDown={handleDriveKeyDown}
                  placeholder="Search storage locations..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground-muted))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--foreground-muted))]" />

                {showDriveSuggestions && driveSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 border border-[hsl(var(--border))] rounded-lg max-h-48 overflow-y-auto bg-[hsl(var(--background))]">
                    {isLoadingDrives ? (
                      <div className="p-2 text-[hsl(var(--foreground-muted))]">
                        Loading...
                      </div>
                    ) : filteredDrives.length > 0 ? (
                      filteredDrives.map((drive, index) => (
                        <div
                          key={drive._id}
                          className={`p-2 cursor-pointer ${
                            index === selectedDriveIndex
                              ? "bg-[hsl(var(--accent))]"
                              : "hover:bg-[hsl(var(--accent))]"
                          } text-[hsl(var(--foreground))]`}
                          onClick={() => handleSelectDrive(drive)}
                          onMouseEnter={() => setSelectedDriveIndex(index)}
                        >
                          {drive.label || drive.name}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-[hsl(var(--foreground-muted))]">
                        No storage locations found
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedDrives.map((drive) => (
                  <div
                    key={`selected-drive-${drive._id}`}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-full text-sm"
                  >
                    <HardDriveIcon className="w-3 h-3" />
                    {drive.label}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        handleRemoveDrive(drive._id);
                      }}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Associated Cars
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedCars.map((car, index) => (
                <div
                  key={`${car._id}-${index}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
                >
                  <CarIcon className="w-3 h-3" />
                  {car.year} {car.make} {car.model}
                  {car.color && ` (${car.color})`}
                  <button
                    type="button"
                    onClick={() => {
                      const newSelectedCars = selectedCars.filter(
                        (_, i) => i !== index
                      );
                      handleCarSelectionChange(newSelectedCars);
                    }}
                    className="ml-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <CarSelector
              selectedCars={selectedCars}
              onSelect={handleCarSelectionChange}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded hover:bg-[hsl(var(--secondary))/90]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded hover:bg-[hsl(var(--primary))/90] disabled:opacity-50"
            >
              {isSubmitting
                ? asset
                  ? "Saving..."
                  : "Adding..."
                : asset
                ? "Save Changes"
                : "Add Raw Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
