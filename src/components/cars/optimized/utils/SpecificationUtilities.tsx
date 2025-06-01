import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { getUnitsForType } from "@/constants/units";
import { CarData } from "../BaseSpecifications";

interface SpecificationUtilitiesProps {
  localSpecs: Partial<CarData>;
  onInputChange: (field: string, value: any) => void;
  onNestedInputChange: (parent: string, field: string, value: any) => void;
}

// Memoized utility input field
const UtilityInputField = React.memo(
  ({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>{label}</Label>
      <Input
        id={label.toLowerCase().replace(/\s+/g, "-")}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
);
UtilityInputField.displayName = "UtilityInputField";

const getInputValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

export default function SpecificationUtilities({
  localSpecs,
  onInputChange,
  onNestedInputChange,
}: SpecificationUtilitiesProps) {
  return (
    <div className="space-y-6">
      {/* Engine Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Engine Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UtilityInputField
              label="Engine Type"
              value={getInputValue(localSpecs.engine?.type)}
              onChange={(value) => onNestedInputChange("engine", "type", value)}
              placeholder="e.g., Inline-6 Turbo"
            />

            {/* Engine Displacement */}
            <div className="space-y-2">
              <Label>Displacement</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.engine?.displacement ?? {
                    value: null,
                    unit: getUnitsForType("VOLUME")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("engine", "displacement", value)
                }
                availableUnits={getUnitsForType("VOLUME")}
              />
            </div>
          </div>

          {/* Power and Torque */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UtilityInputField
              label="Power (HP)"
              type="number"
              value={getInputValue(localSpecs.engine?.power?.hp)}
              onChange={(value) => {
                const hp = parseFloat(value) || 0;
                const kW = Math.round(hp * 0.7457);
                const ps = Math.round(hp * 1.014);
                onNestedInputChange("engine", "power", { hp, kW, ps });
              }}
              placeholder="e.g., 473"
            />

            <UtilityInputField
              label="Torque (lb-ft)"
              type="number"
              value={getInputValue(localSpecs.engine?.torque?.["lb-ft"])}
              onChange={(value) => {
                const lbft = parseFloat(value) || 0;
                const Nm = Math.round(lbft * 1.356);
                onNestedInputChange("engine", "torque", {
                  "lb-ft": lbft,
                  Nm,
                });
              }}
              placeholder="e.g., 406"
            />
          </div>

          {/* Engine Features */}
          <UtilityInputField
            label="Engine Features"
            value={localSpecs.engine?.features?.join(", ") || ""}
            onChange={(value) => {
              const features = value
                .split(",")
                .map((f) => f.trim())
                .filter((f) => f);
              onNestedInputChange("engine", "features", features);
            }}
            placeholder="e.g., Twin Turbo, Direct Injection, Variable Valve Timing"
          />
        </CardContent>
      </Card>

      {/* Transmission */}
      <Card>
        <CardHeader>
          <CardTitle>Transmission</CardTitle>
        </CardHeader>
        <CardContent>
          <UtilityInputField
            label="Transmission Type"
            value={getInputValue(localSpecs.transmission?.type)}
            onChange={(value) =>
              onNestedInputChange("transmission", "type", value)
            }
            placeholder="e.g., 8-Speed Automatic"
          />
        </CardContent>
      </Card>

      {/* Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle>Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Length */}
            <div className="space-y-2">
              <Label>Length</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.dimensions?.length ?? {
                    value: null,
                    unit: getUnitsForType("LENGTH")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("dimensions", "length", value)
                }
                availableUnits={getUnitsForType("LENGTH")}
              />
            </div>

            {/* Width */}
            <div className="space-y-2">
              <Label>Width</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.dimensions?.width ?? {
                    value: null,
                    unit: getUnitsForType("LENGTH")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("dimensions", "width", value)
                }
                availableUnits={getUnitsForType("LENGTH")}
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label>Height</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.dimensions?.height ?? {
                    value: null,
                    unit: getUnitsForType("LENGTH")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("dimensions", "height", value)
                }
                availableUnits={getUnitsForType("LENGTH")}
              />
            </div>

            {/* Wheelbase */}
            <div className="space-y-2">
              <Label>Wheelbase</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.dimensions?.wheelbase ?? {
                    value: null,
                    unit: getUnitsForType("LENGTH")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("dimensions", "wheelbase", value)
                }
                availableUnits={getUnitsForType("LENGTH")}
              />
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label>Weight</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.dimensions?.weight ?? {
                    value: null,
                    unit: getUnitsForType("WEIGHT")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("dimensions", "weight", value)
                }
                availableUnits={getUnitsForType("WEIGHT")}
              />
            </div>

            {/* GVWR */}
            <div className="space-y-2">
              <Label>GVWR</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.dimensions?.gvwr ?? {
                    value: null,
                    unit: getUnitsForType("WEIGHT")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("dimensions", "gvwr", value)
                }
                availableUnits={getUnitsForType("WEIGHT")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manufacturing Details */}
      <Card>
        <CardHeader>
          <CardTitle>Manufacturing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UtilityInputField
              label="Series"
              value={getInputValue(localSpecs.manufacturing?.series)}
              onChange={(value) =>
                onNestedInputChange("manufacturing", "series", value)
              }
              placeholder="e.g., G80"
            />

            <UtilityInputField
              label="Trim"
              value={getInputValue(localSpecs.manufacturing?.trim)}
              onChange={(value) =>
                onNestedInputChange("manufacturing", "trim", value)
              }
              placeholder="e.g., Competition"
            />

            <UtilityInputField
              label="Body Class"
              value={getInputValue(localSpecs.manufacturing?.bodyClass)}
              onChange={(value) =>
                onNestedInputChange("manufacturing", "bodyClass", value)
              }
              placeholder="e.g., Sedan"
            />

            <UtilityInputField
              label="Manufacturing Location"
              value={
                localSpecs.manufacturing?.plant
                  ? `${localSpecs.manufacturing.plant.city}, ${localSpecs.manufacturing.plant.country}`
                  : ""
              }
              onChange={(value) => {
                const [city, country] = value.split(",").map((s) => s.trim());
                onNestedInputChange("manufacturing", "plant", {
                  city: city || "",
                  country: country || "",
                  company: localSpecs.manufacturing?.plant?.company || "",
                });
              }}
              placeholder="e.g., Munich, Germany"
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 0-60 mph */}
            <div className="space-y-2">
              <Label>0-60 mph</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.performance?.["0_to_60_mph"] ?? {
                    value: null,
                    unit: getUnitsForType("TIME")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("performance", "0_to_60_mph", value)
                }
                availableUnits={getUnitsForType("TIME")}
              />
            </div>

            {/* Top Speed */}
            <div className="space-y-2">
              <Label>Top Speed</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.performance?.top_speed ?? {
                    value: null,
                    unit: getUnitsForType("SPEED")[0],
                  }
                }
                onChange={(value) =>
                  onNestedInputChange("performance", "top_speed", value)
                }
                availableUnits={getUnitsForType("SPEED")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UtilityInputField
              label="Number of Doors"
              type="number"
              value={getInputValue(localSpecs.doors)}
              onChange={(value) =>
                onInputChange("doors", parseInt(value) || null)
              }
              placeholder="e.g., 4"
            />

            <UtilityInputField
              label="Location"
              value={getInputValue(localSpecs.location)}
              onChange={(value) => onInputChange("location", value)}
              placeholder="e.g., Los Angeles, CA"
            />

            <UtilityInputField
              label="Type"
              value={getInputValue(localSpecs.type)}
              onChange={(value) => onInputChange("type", value)}
              placeholder="e.g., Sports Car"
            />

            {/* Mileage */}
            <div className="space-y-2">
              <Label>Mileage</Label>
              <MeasurementInputWithUnit
                value={
                  localSpecs.mileage ?? {
                    value: null,
                    unit: getUnitsForType("MILEAGE")[0],
                  }
                }
                onChange={(value) => onInputChange("mileage", value)}
                availableUnits={getUnitsForType("MILEAGE")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
