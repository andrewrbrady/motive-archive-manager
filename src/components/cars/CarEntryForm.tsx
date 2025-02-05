"use client";

import { useState, useEffect } from "react";
import { Car } from "@/types/car";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { getUnitsForType } from "@/constants/units";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Client {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  documents: string[];
  cars: string[];
  instagram?: string;
}

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
  error?: string;
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
  price: number;
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
    price: 0,
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
        console.log("Fetched clients:", data); // For debugging
        setClients(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
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
    }

    if (correctedVin.length !== 17) {
      toast.error("Please enter a valid 17-character VIN");
      return;
    }

    console.log("Starting VIN decode for:", correctedVin);
    setIsDecodingVinWithCorrections(true);

    // Create a loading toast that we can update
    const toastId = toast.loading("Initiating VIN decode...", {
      duration: 20000, // Long duration as we'll dismiss it manually
    });

    try {
      toast.loading("Fetching vehicle data from NHTSA...", { id: toastId });
      const response = await fetch(`/api/vin?vin=${correctedVin}`);
      const data: VINResponse = await response.json();

      console.log("Received VIN decode response:", data);

      if (data.error) {
        console.error("VIN decode error:", data.error);
        toast.error(data.error, { id: toastId });
        return;
      }

      toast.loading("Processing vehicle information...", { id: toastId });
      console.log("Previous form data:", formData);

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
        // Update description with AI insights
        const highlights = Object.entries(data.aiAnalysis || {})
          .filter(([_, info]) => info.confidence === "confirmed")
          .map(([_, info]) => info.value)
          .join("\n");

        if (highlights) {
          updatedFormData.description =
            formData.description + "\n\nVehicle Highlights:\n" + highlights;
        }
      }

      console.log("Updated form data:", updatedFormData);
      setFormData(updatedFormData);

      // Show success message with summary
      toast.success(
        `Successfully decoded VIN for ${data.year} ${data.make} ${data.model}`,
        { id: toastId }
      );
    } catch (error) {
      console.error("Error decoding VIN:", error);
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

    console.log("Starting VIN decode without corrections for:", formData.vin);
    setIsDecodingVinWithoutCorrections(true);

    const toastId = toast.loading("Initiating VIN decode...", {
      duration: 20000,
    });

    try {
      toast.loading("Fetching vehicle data from NHTSA...", { id: toastId });
      const response = await fetch(`/api/vin?vin=${formData.vin}`);
      const data: VINResponse = await response.json();

      console.log("Received VIN decode response:", data);

      if (data.error) {
        console.error("VIN decode error:", data.error);
        toast.error(data.error, { id: toastId });
        return;
      }

      toast.loading("Processing vehicle information...", { id: toastId });
      console.log("Previous form data:", formData);

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

      console.log("Updated form data:", updatedFormData);
      setFormData(updatedFormData);

      toast.success(
        `Successfully decoded VIN for ${data.year} ${data.make} ${data.model}`,
        {
          id: toastId,
        }
      );
    } catch (error) {
      console.error("Error decoding VIN:", error);
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
    "w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]";
  const labelClasses = "text-sm text-gray-600 dark:text-gray-400";
  const sectionTitleClasses =
    "text-lg font-semibold text-gray-900 dark:text-white uppercase";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-lg bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
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
                value={formData.price}
                onChange={(e) =>
                  handleChange("price", parseInt(e.target.value))
                }
                className={inputClasses}
                required
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
                    className="flex-1 whitespace-nowrap bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
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
                    className="flex-1 whitespace-nowrap bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  <option key={client._id} value={client._id}>
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
      <div className="rounded-lg bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 p-6">
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
      <div className="rounded-lg bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 p-6">
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
      <div className="rounded-lg bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 p-6">
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
      <div className="rounded-lg bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 p-6">
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
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111] disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Car"}
        </button>
      </div>
    </form>
  );
}
