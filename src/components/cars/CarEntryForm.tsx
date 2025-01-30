"use client";

import { useState, useEffect } from "react";
import { Car } from "@/types/car";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { getUnitsForType } from "@/constants/units";

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
  engine?: Engine;
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
  });

  const [clients, setClients] = useState<Client[]>([]);

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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
    <form onSubmit={handleSubmit} className="space-y-6">
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
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => handleChange("vin", e.target.value)}
                className={inputClasses}
              />
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
