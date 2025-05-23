"use client";

import { useState, useEffect } from "react";
import { Car } from "@/types/car";
import { Client } from "@/types/contact";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { getUnitsForType } from "@/constants/units";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface MeasurementValue {
  value: number | null;
  unit: string;
}

interface Power {
  hp: number;
  kW: number;
  ps: number;
}

interface Torque {
  "lb-ft": number;
  Nm: number;
}

interface Engine {
  type: string;
  displacement: MeasurementValue;
  power: Power;
  torque: Torque;
  features: string[];
}

interface VINResponse {
  make: string;
  model: string;
  year: number;
  engineType?: string;
  engineDisplacement?: number;
  engineConfiguration?: string;
  engineCylinders?: number;
  error?: {
    code: string;
    text: string;
    additionalInfo?: string;
  };
  validationStatus?: {
    isPartial: boolean;
    suggestedVIN?: string;
    possibleValues?: string[];
  };
  bodyClass?: string;
  horsepower?: number;
  series?: string;
  trim?: string;
  plant?: {
    city?: string;
    country?: string;
    company?: string;
  };
  aiAnalysis?: {
    [key: string]: {
      value: string;
      confidence: string;
    };
  };
  doors?: number;
  dimensions?: {
    wheelbase?: MeasurementValue;
    weight?: MeasurementValue;
    gvwr?: MeasurementValue;
    trackWidth?: MeasurementValue;
  };
  safety?: {
    tpms?: boolean;
  };
}

export interface CarFormData {
  make: string;
  model: string;
  year: number;
  price?: {
    listPrice: number | null;
    soldPrice?: number | null;
    priceHistory: Array<{
      type: "list" | "sold";
      price: number | null;
      date: string;
      notes?: string;
    }>;
  };
  mileage: MeasurementValue;
  color: string;
  horsepower: number;
  condition: string;
  location: string;
  description: string;
  type: string;
  vin: string;
  interior_color: string;
  status: "available" | "sold" | "pending";
  client?: string;
  engine: Engine;
  manufacturing?: {
    series?: string;
    trim?: string;
    bodyClass?: string;
    plant?: {
      city?: string;
      country?: string;
      company?: string;
    };
  };
  safety?: {
    tpms?: boolean;
  };
  dimensions: {
    wheelbase?: MeasurementValue;
    weight: MeasurementValue;
    gvwr: MeasurementValue;
    trackWidth?: MeasurementValue;
  };
  doors?: number;
}

interface CarEntryFormProps {
  onSubmit: (data: Partial<CarFormData>) => Promise<void>;
  isSubmitting: boolean;
}

export default function CarEntryForm({
  onSubmit,
  isSubmitting,
}: CarEntryFormProps) {
  const [formData, setFormData] = useState<CarFormData>({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    price: {
      listPrice: null,
      soldPrice: null,
      priceHistory: [],
    },
    mileage: { value: 0, unit: "mi" },
    color: "",
    horsepower: 0,
    condition: "",
    location: "",
    description: "",
    type: "",
    vin: "",
    interior_color: "",
    status: "available",
    engine: {
      type: "",
      displacement: { value: null, unit: "L" },
      power: { hp: 0, kW: 0, ps: 0 },
      torque: { "lb-ft": 0, Nm: 0 },
      features: [],
    },
    dimensions: {
      weight: { value: null, unit: "lbs" },
      gvwr: { value: null, unit: "lbs" },
      wheelbase: { value: null, unit: "in" },
      trackWidth: { value: null, unit: "in" },
    },
    manufacturing: {
      series: "",
      trim: "",
      bodyClass: "",
      plant: {
        city: "",
        country: "",
        company: "",
      },
    },
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [isDecodingVinWithCorrections, setIsDecodingVinWithCorrections] =
    useState(false);
  const [isDecodingVinWithoutCorrections, setIsDecodingVinWithoutCorrections] =
    useState(false);

  useEffect(() => {
    // Fetch clients when component mounts
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients");
        if (!response.ok) {
          throw new Error(`Failed to fetch clients: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Fetched clients:", data);
        setClients(data.clients || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to fetch clients");
      }
    };
    fetchClients();
  }, []);

  const handleChange = (field: string, value: any) => {
    if (field === "dimensions") {
      setFormData((prev) => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          ...value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleEngineChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      engine: {
        ...prev.engine,
        [field]: value,
      },
    }));
  };

  const handlePowerChange = (value: MeasurementValue) => {
    // Convert hp to kW and ps
    const hp = value.value || 0;
    const kW = Math.round(hp * 0.7457);
    const ps = Math.round(hp * 1.014);

    setFormData((prev) => ({
      ...prev,
      engine: {
        ...prev.engine,
        power: { hp, kW, ps },
      },
    }));
  };

  const handleTorqueChange = (value: MeasurementValue) => {
    // Convert lb-ft to Nm or vice versa
    const isLbFt = value.unit === "lb-ft";
    const lbFt = isLbFt
      ? value.value || 0
      : Math.round((value.value || 0) * 0.7376);
    const Nm = isLbFt
      ? Math.round((value.value || 0) * 1.3558)
      : value.value || 0;

    setFormData((prev) => ({
      ...prev,
      engine: {
        ...prev.engine,
        torque: { "lb-ft": lbFt, Nm },
      },
    }));
  };

  // Common OCR corrections for VIN numbers
  const correctVinOCRErrors = (vin: string): string => {
    // Convert to uppercase as VINs are always uppercase
    let correctedVin = vin.toUpperCase();

    // Common OCR misinterpretations
    const corrections: { [key: string]: string } = {
      O: "0", // Letter O to number 0
      Q: "0", // Letter Q to number 0
      I: "1", // Letter I to number 1
      L: "1", // Letter L to number 1
      S: "5", // Letter S to number 5
      Z: "2", // Letter Z to number 2
      B: "8", // Letter B to number 8
      D: "0", // Letter D to number 0
    };

    // Known manufacturer codes and their common misinterpretations
    const manufacturerCorrections: { [key: string]: string } = {
      // BMW
      W85: "WBS", // Common misinterpretation for BMW M
      W8A: "WBA", // Common misinterpretation for BMW AG
      W8S: "WBS", // Common misinterpretation for BMW M
      W8Y: "WBY", // Common misinterpretation for BMW Electric
      // Porsche
      WPO: "WP0", // Common misinterpretation for Porsche
      WP0: "WP0", // Preserve correct Porsche code
      WP1: "WP1", // Preserve correct Porsche SUV code
      // Other manufacturers
      SCA: "SCA", // Preserve Rolls-Royce code
      ZFF: "ZFF", // Preserve Ferrari code
      JN1: "JN1", // Preserve Nissan code
      VF9: "VF9", // Preserve Bugatti code
    };

    // First, try to correct the manufacturer code (first 3 characters)
    const firstThree = correctedVin.slice(0, 3);
    const correctedManufacturer = manufacturerCorrections[firstThree];

    if (correctedManufacturer) {
      // If we found a manufacturer correction, use it and apply general corrections to the rest
      correctedVin = correctedManufacturer + correctedVin.slice(3);
      console.log(
        `Corrected manufacturer code from ${firstThree} to ${correctedManufacturer}`
      );
    }

    // Now apply position-specific corrections
    return correctedVin
      .split("")
      .map((char, index) => {
        // Production sequence numbers (positions 12-17) should always be numbers
        if (index >= 11) {
          return corrections[char] || char;
        }

        // Check digit (position 9) can be a number or X
        if (index === 8) {
          return char === "X" ? char : corrections[char] || char;
        }

        // For positions 0-2 (manufacturer code), preserve if it's already corrected
        if (index < 3 && correctedManufacturer) {
          return correctedVin[index];
        }

        // For other positions, apply general corrections
        return corrections[char] || char;
      })
      .join("");
  };

  const handleVinError = (data: VINResponse, toastId: string) => {
    if (!data.error) return false;

    const errorMessages: { [key: string]: string } = {
      "1": "Check digit (9th position) is incorrect. Please verify the VIN.",
      "4": data.validationStatus?.suggestedVIN
        ? `VIN has been corrected. Suggested VIN: ${data.validationStatus.suggestedVIN}`
        : "VIN has an error in one position.",
      "14": "Some characters in the VIN cannot be validated against manufacturer data.",
    };

    const errorCodes = String(data.error.code)
      .split(",")
      .map((code) => code.trim());
    console.log("Processing error codes:", errorCodes);

    // Check if we have position-specific errors
    const positionErrors = data.validationStatus?.possibleValues
      ?.map((value) => {
        const match = value.match(/\((\d+):([^)]+)\)/);
        if (match) {
          const [_, position, values] = match;
          return `Position ${position}: Possible values are ${values}`;
        }
        return value;
      })
      .join("\n");

    // Show error messages but don't block form updates unless it's a critical error
    if (errorCodes.includes("4") && data.validationStatus?.suggestedVIN) {
      const suggestedVin = data.validationStatus.suggestedVIN;
      const originalVin = formData.vin;

      // Create a visual diff of the VINs
      const vinDiff = Array.from(suggestedVin).map((char, i) => {
        if (char === "!") return { char: originalVin[i], changed: true };
        return { char, changed: false };
      });

      toast.error(
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="font-medium">VIN validation issues found:</p>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {errorCodes.map((code) => (
                <li key={code}>{errorMessages[code] || `Error ${code}`}</li>
              ))}
            </ul>
            {positionErrors && (
              <div className="mt-2 text-sm">
                <p className="font-medium">Position-specific details:</p>
                <pre className="bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] p-2 rounded mt-1">
                  {positionErrors}
                </pre>
              </div>
            )}
          </div>
          <div className="border-t border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] pt-2">
            <p className="font-medium mb-1">Suggested correction:</p>
            <div className="font-mono bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] p-2 rounded">
              {vinDiff.map((char, i) => (
                <span
                  key={i}
                  className={
                    char.changed ? "bg-warning-200 dark:bg-warning-900" : ""
                  }
                  title={char.changed ? "Changed character" : ""}
                >
                  {char.char}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                handleChange(
                  "vin",
                  suggestedVin.replace(
                    "!",
                    originalVin[suggestedVin.indexOf("!")]
                  )
                );
                toast.success("VIN updated with suggestion", { id: toastId });
                decodeVinWithoutCorrections();
              }}
              className="px-2 py-1 text-sm bg-success-500 text-white rounded hover:bg-success-600"
            >
              Use Suggested
            </button>
            <button
              onClick={() => toast.dismiss(toastId)}
              className="px-2 py-1 text-sm bg-[hsl(var(--background))] text-white rounded hover:bg-[hsl(var(--background))]"
            >
              Keep Current
            </button>
          </div>
        </div>,
        { id: toastId, duration: 15000 }
      );
      // Don't return true - allow form updates to proceed
    }

    // For error code 14 or other non-critical errors, show warning but continue
    if (errorCodes.includes("14") || (errorCodes.includes("1") && data.make)) {
      toast.warning(
        <div className="space-y-2">
          <p className="font-medium">VIN validation issues:</p>
          <ul className="list-disc pl-4 space-y-1">
            {errorCodes.map((code) => (
              <li key={code}>{errorMessages[code] || `Error ${code}`}</li>
            ))}
          </ul>
          {positionErrors && (
            <pre className="text-sm bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] p-2 rounded mt-1">
              {positionErrors}
            </pre>
          )}
          <p className="text-sm mt-2">
            Proceeding with available vehicle data.
          </p>
        </div>,
        { id: toastId }
      );
      return false; // Continue processing with available data
    }

    // For critical errors with no useful data, show error and stop
    if (!data.make || !data.model || !data.year) {
      toast.error(
        <div className="space-y-2">
          <p className="font-medium">Critical VIN validation error:</p>
          <ul className="list-disc pl-4 space-y-1">
            {errorCodes.map((code) => (
              <li key={code}>{errorMessages[code] || `Error ${code}`}</li>
            ))}
          </ul>
          <p className="text-sm mt-2 text-destructive-500">
            Unable to retrieve basic vehicle information.
          </p>
        </div>,
        { id: toastId }
      );
      return true; // Stop processing only if we couldn't get basic info
    }

    return false; // Allow updates to proceed by default
  };

  const decodeVin = async () => {
    if (!formData.vin) {
      toast.error("Please enter a VIN");
      return;
    }

    // Apply OCR corrections
    const correctedVin = correctVinOCRErrors(formData.vin);

    // Update the form with the corrected VIN
    if (correctedVin !== formData.vin) {
      handleChange("vin", correctedVin);
      toast.info(`VIN corrected from ${formData.vin} to ${correctedVin}`, {
        id: "vin-correction",
      });
    }

    if (correctedVin.length !== 17) {
      toast.error("Please enter a valid 17-character VIN");
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("Starting VIN decode for:", `***${correctedVin.slice(-4)}`);
    }
    setIsDecodingVinWithCorrections(true);

    // Create a loading toast that we can update
    const toastId = `decode-${Date.now()}`;
    toast.loading("Initiating VIN decode...", {
      duration: 20000, // Long duration as we'll dismiss it manually
      id: toastId,
    });

    try {
      toast.loading("Fetching vehicle data from NHTSA...", { id: toastId });
      const response = await fetch(`/api/vin?vin=${correctedVin}`);
      const data: VINResponse = await response.json();

      if (process.env.NODE_ENV !== "production") {
        console.log("Received VIN decode response:", {
          hasMake: !!data.make,
          hasModel: !!data.model,
          hasYear: !!data.year,
          hasError: !!data.error,
        });
      }

      // Handle errors and decide whether to continue
      if (data.error && handleVinError(data, toastId)) {
        return;
      }

      toast.loading("Processing vehicle information...", { id: toastId });
      if (process.env.NODE_ENV !== "production") {
        console.log("Previous form data:", {
          hasMake: !!formData.make,
          hasModel: !!formData.model,
          hasVin: !!formData.vin,
          fieldsCount: Object.keys(formData).length,
        });
      }

      // Update form data with decoded information
      const updatedFormData = {
        ...formData,
        vin: correctedVin,
        make: data.make || formData.make,
        model: data.model || formData.model,
        year: data.year || formData.year,
        type: data.bodyClass || formData.type,
        horsepower: data.horsepower || formData.horsepower,
        engine: {
          ...formData.engine,
          type: data.engineType || formData.engine.type,
          displacement: {
            value:
              data.engineDisplacement || formData.engine.displacement.value,
            unit: "L",
          },
          power: {
            hp: data.horsepower || formData.engine.power.hp,
            kW: Math.round(
              (data.horsepower || formData.engine.power.hp) * 0.7457
            ),
            ps: Math.round(
              (data.horsepower || formData.engine.power.hp) * 1.014
            ),
          },
          features: [
            ...(formData.engine.features || []),
            ...(data.series ? [`Series: ${data.series}`] : []),
            ...(data.trim ? [`Trim: ${data.trim}`] : []),
            ...(data.engineConfiguration ? [data.engineConfiguration] : []),
            ...(data.engineCylinders
              ? [`${data.engineCylinders} cylinders`]
              : []),
          ],
        },
        manufacturing: {
          series: data.series || formData.manufacturing?.series,
          trim: data.trim || formData.manufacturing?.trim,
          bodyClass: data.bodyClass || formData.manufacturing?.bodyClass,
          plant: {
            city: data.plant?.city || formData.manufacturing?.plant?.city,
            country:
              data.plant?.country || formData.manufacturing?.plant?.country,
            company:
              data.plant?.company || formData.manufacturing?.plant?.company,
          },
        },
        safety: {
          ...formData.safety,
          tpms: data.safety?.tpms || formData.safety?.tpms,
        },
        dimensions: {
          ...formData.dimensions,
          ...data.dimensions,
        },
        doors: data.doors || formData.doors,
      } as typeof formData;

      console.log("Dimensions data received:", data.dimensions);
      console.log("Updated dimensions in form:", updatedFormData.dimensions);

      // Add AI analysis insights if available
      if ("aiAnalysis" in data) {
        toast.loading("Processing AI insights...", { id: toastId });
        const highlights = Object.entries(data.aiAnalysis || {})
          .filter(([_, info]) => info.confidence === "confirmed")
          .map(([_, info]) => info.value)
          .join("\n");

        if (highlights) {
          updatedFormData.description =
            formData.description + "\n\nVehicle Highlights:\n" + highlights;
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("Updated form data:", {
          hasMake: !!updatedFormData.make,
          hasModel: !!updatedFormData.model,
          hasVin: !!updatedFormData.vin,
          fieldsCount: Object.keys(updatedFormData).length,
        });
      }
      setFormData(updatedFormData);

      // Show success message with summary
      toast.success(
        `Successfully decoded VIN for ${data.year} ${data.make} ${data.model}`,
        { id: toastId }
      );
    } catch (error) {
      console.error(
        "Error decoding VIN:",
        (error as Error).message || "Unknown error"
      );
      toast.error("Failed to decode VIN", { id: toastId });
    } finally {
      setIsDecodingVinWithCorrections(false);
    }
  };

  const decodeVinWithoutCorrections = async () => {
    if (!formData.vin) {
      toast.error("Please enter a VIN");
      return;
    }

    if (formData.vin.length !== 17) {
      toast.error("Please enter a valid 17-character VIN");
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        "Starting VIN decode without corrections for:",
        `***${formData.vin.slice(-4)}`
      );
    }
    setIsDecodingVinWithoutCorrections(true);

    const toastId = `decode-no-correct-${Date.now()}`;
    toast.loading("Initiating VIN decode...", {
      duration: 20000,
      id: toastId,
    });

    try {
      toast.loading("Fetching vehicle data from NHTSA...", { id: toastId });
      const response = await fetch(`/api/vin?vin=${formData.vin}`);
      const data: VINResponse = await response.json();

      if (process.env.NODE_ENV !== "production") {
        console.log("Received VIN decode response:", {
          hasMake: !!data.make,
          hasModel: !!data.model,
          hasYear: !!data.year,
          hasError: !!data.error,
        });
      }

      // Handle errors and decide whether to continue
      if (data.error && handleVinError(data, toastId)) {
        return;
      }

      toast.loading("Processing vehicle information...", { id: toastId });
      if (process.env.NODE_ENV !== "production") {
        console.log("Previous form data:", {
          hasMake: !!formData.make,
          hasModel: !!formData.model,
          hasVin: !!formData.vin,
          fieldsCount: Object.keys(formData).length,
        });
      }

      // Update form data with decoded information
      const updatedFormData = {
        ...formData,
        make: data.make || formData.make,
        model: data.model || formData.model,
        year: data.year || formData.year,
        type: data.bodyClass || formData.type,
        horsepower: data.horsepower || formData.horsepower,
        engine: {
          ...formData.engine,
          type: data.engineType || formData.engine.type,
          displacement: {
            value:
              data.engineDisplacement || formData.engine.displacement.value,
            unit: "L",
          },
          power: {
            hp: data.horsepower || formData.engine.power.hp,
            kW: Math.round(
              (data.horsepower || formData.engine.power.hp) * 0.7457
            ),
            ps: Math.round(
              (data.horsepower || formData.engine.power.hp) * 1.014
            ),
          },
          features: [
            ...(formData.engine.features || []),
            ...(data.series ? [`Series: ${data.series}`] : []),
            ...(data.trim ? [`Trim: ${data.trim}`] : []),
            ...(data.engineConfiguration ? [data.engineConfiguration] : []),
            ...(data.engineCylinders
              ? [`${data.engineCylinders} cylinders`]
              : []),
          ],
        },
        manufacturing: {
          series: data.series || formData.manufacturing?.series,
          trim: data.trim || formData.manufacturing?.trim,
          bodyClass: data.bodyClass || formData.manufacturing?.bodyClass,
          plant: {
            city: data.plant?.city || formData.manufacturing?.plant?.city,
            country:
              data.plant?.country || formData.manufacturing?.plant?.country,
            company:
              data.plant?.company || formData.manufacturing?.plant?.company,
          },
        },
        safety: {
          ...formData.safety,
          tpms: data.safety?.tpms || formData.safety?.tpms,
        },
        dimensions: {
          ...formData.dimensions,
          ...data.dimensions,
        },
        doors: data.doors || formData.doors,
      } as typeof formData;

      if ("aiAnalysis" in data) {
        toast.loading("Processing AI insights...", { id: toastId });
        const highlights = Object.entries(data.aiAnalysis || {})
          .filter(([_, info]) => info.confidence === "confirmed")
          .map(([_, info]) => info.value)
          .join("\n");

        if (highlights) {
          updatedFormData.description =
            formData.description + "\n\nVehicle Highlights:\n" + highlights;
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("Updated form data:", {
          hasMake: !!updatedFormData.make,
          hasModel: !!updatedFormData.model,
          hasVin: !!updatedFormData.vin,
          fieldsCount: Object.keys(updatedFormData).length,
        });
      }
      setFormData(updatedFormData);

      toast.success(
        `Successfully decoded VIN for ${data.year} ${data.make} ${data.model}`,
        {
          id: toastId,
        }
      );
    } catch (error) {
      console.error(
        "Error decoding VIN:",
        (error as Error).message || "Unknown error"
      );
      toast.error("Failed to decode VIN", { id: toastId });
    } finally {
      setIsDecodingVinWithoutCorrections(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const inputClasses =
    "w-full bg-transparent text-text-primary border border-border-primary rounded-md px-3 py-2 placeholder:text-text-tertiary transition-all duration-base focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";
  const labelClasses = "text-sm text-text-secondary";
  const sectionTitleClasses =
    "text-lg font-semibold text-text-primary uppercase tracking-tight";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 mb-16">
      <div className="rounded-lg border border-border-primary divide-y divide-border-primary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className={sectionTitleClasses}>Basic Information</h2>

            <div>
              <label className={labelClasses}>Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => handleChange("make", e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label className={labelClasses}>Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange("model", e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label className={labelClasses}>Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => handleChange("year", parseInt(e.target.value))}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label className={labelClasses}>Price</label>
              <input
                type="number"
                value={formData.price?.listPrice || ""}
                onChange={(e) =>
                  handleChange("price", {
                    ...formData.price,
                    listPrice: parseInt(e.target.value) || null,
                  })
                }
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Mileage</label>
              <MeasurementInputWithUnit
                value={formData.mileage || { value: null, unit: "mi" }}
                onChange={(value) => handleChange("mileage", value)}
                availableUnits={getUnitsForType("MILEAGE")}
                className="w-full"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h2 className={sectionTitleClasses}>Additional Information</h2>

            <div>
              <label className={labelClasses}>Color</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange("color", e.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Interior Color</label>
              <input
                type="text"
                value={formData.interior_color}
                onChange={(e) => handleChange("interior_color", e.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>VIN</label>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  name="vin"
                  value={formData.vin}
                  onChange={(e) => handleChange("vin", e.target.value)}
                  placeholder="VIN"
                  className={`${inputClasses} font-mono tracking-wider`}
                  maxLength={17}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={decodeVin}
                    disabled={
                      isDecodingVinWithCorrections ||
                      isDecodingVinWithoutCorrections ||
                      formData.vin.length !== 17
                    }
                    variant="outline"
                    className="flex-1 whitespace-nowrap bg-background-primary border border-border-primary text-text-primary hover:bg-background-secondary"
                    title="Decode VIN with OCR corrections"
                  >
                    {isDecodingVinWithCorrections ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Decoding...
                      </>
                    ) : (
                      "Auto-Correct & Decode"
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={decodeVinWithoutCorrections}
                    disabled={
                      isDecodingVinWithCorrections ||
                      isDecodingVinWithoutCorrections ||
                      formData.vin.length !== 17
                    }
                    variant="outline"
                    className="flex-1 whitespace-nowrap bg-background-primary border border-border-primary text-text-primary hover:bg-background-secondary"
                    title="Decode VIN without OCR corrections"
                  >
                    {isDecodingVinWithoutCorrections ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Decoding...
                      </>
                    ) : (
                      "Decode As-Is"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-text-tertiary">
                  {formData.vin.length}/17 characters
                </p>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Type</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => handleChange("type", e.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Client</label>
              <select
                value={formData.client || ""}
                onChange={(e) => handleChange("client", e.target.value)}
                className={inputClasses}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option
                    key={client._id.toString()}
                    value={client._id.toString()}
                  >
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => handleChange("condition", e.target.value)}
                className={inputClasses}
              >
                <option value="">Select condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Engine Information */}
      <div className="rounded-lg border border-border-primary divide-y divide-border-primary p-6">
        <h2 className={sectionTitleClasses}>Engine Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Engine Type</label>
            <input
              type="text"
              value={formData.engine?.type}
              onChange={(e) => handleEngineChange("type", e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Displacement</label>
            <MeasurementInputWithUnit
              value={
                formData.engine?.displacement || { value: null, unit: "L" }
              }
              onChange={(value) => handleEngineChange("displacement", value)}
              availableUnits={["L", "cc"]}
              className="w-full"
            />
          </div>

          <div>
            <label className={labelClasses}>Power Output</label>
            <MeasurementInputWithUnit
              value={{ value: formData.engine.power.hp, unit: "hp" }}
              onChange={handlePowerChange}
              availableUnits={["hp"]}
              className="w-full"
            />
          </div>

          <div>
            <label className={labelClasses}>Torque</label>
            <MeasurementInputWithUnit
              value={{ value: formData.engine.torque["lb-ft"], unit: "lb-ft" }}
              onChange={handleTorqueChange}
              availableUnits={["lb-ft", "Nm"]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="rounded-lg border border-border-primary divide-y divide-border-primary p-6">
        <h2 className={sectionTitleClasses}>Vehicle Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div>
            <label className={labelClasses}>Series</label>
            <input
              type="text"
              value={formData.manufacturing?.series || ""}
              onChange={(e) =>
                handleChange("manufacturing", {
                  ...formData.manufacturing,
                  series: e.target.value,
                })
              }
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Trim Level</label>
            <input
              type="text"
              value={formData.manufacturing?.trim || ""}
              onChange={(e) =>
                handleChange("manufacturing", {
                  ...formData.manufacturing,
                  trim: e.target.value,
                })
              }
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Weight</label>
            <MeasurementInputWithUnit
              value={formData.dimensions.weight}
              onChange={(value) =>
                handleChange("dimensions", {
                  ...formData.dimensions,
                  weight: value,
                })
              }
              availableUnits={["lbs", "kg"]}
              className="w-full"
            />
          </div>

          <div>
            <label className={labelClasses}>GVWR</label>
            <MeasurementInputWithUnit
              value={formData.dimensions.gvwr}
              onChange={(value) =>
                handleChange("dimensions", {
                  ...formData.dimensions,
                  gvwr: value,
                })
              }
              availableUnits={["lbs"]}
              className="w-full"
            />
          </div>

          <div>
            <label className={labelClasses}>Body Style</label>
            <input
              type="text"
              value={formData.manufacturing?.bodyClass || ""}
              onChange={(e) =>
                handleChange("manufacturing", {
                  ...formData.manufacturing,
                  bodyClass: e.target.value,
                })
              }
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Number of Doors</label>
            <input
              type="number"
              value={formData.doors || ""}
              onChange={(e) => handleChange("doors", parseInt(e.target.value))}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      {/* Manufacturing Information */}
      <div className="rounded-lg border border-border-primary divide-y divide-border-primary p-6">
        <h2 className={sectionTitleClasses}>Manufacturing Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div>
            <label className={labelClasses}>Plant City</label>
            <input
              type="text"
              value={formData.manufacturing?.plant?.city || ""}
              onChange={(e) =>
                handleChange("manufacturing", {
                  ...formData.manufacturing,
                  plant: {
                    ...formData.manufacturing?.plant,
                    city: e.target.value,
                  },
                })
              }
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Plant Country</label>
            <input
              type="text"
              value={formData.manufacturing?.plant?.country || ""}
              onChange={(e) =>
                handleChange("manufacturing", {
                  ...formData.manufacturing,
                  plant: {
                    ...formData.manufacturing?.plant,
                    country: e.target.value,
                  },
                })
              }
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Manufacturing Company</label>
            <input
              type="text"
              value={formData.manufacturing?.plant?.company || ""}
              onChange={(e) =>
                handleChange("manufacturing", {
                  ...formData.manufacturing,
                  plant: {
                    ...formData.manufacturing?.plant,
                    company: e.target.value,
                  },
                })
              }
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-lg border border-border-primary divide-y divide-border-primary p-6">
        <h2 className={sectionTitleClasses}>Description</h2>
        <div>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={4}
            className={inputClasses}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary hover:border-border-secondary rounded-md transition-all duration-base focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Car"}
        </button>
      </div>
    </form>
  );
}
