import React, { useEffect, useState } from "react";
import type { ExtendedCar } from "@/types/car-page";
import { MeasurementValue } from "@/types/measurements";
import { getUnitsForType } from "@/constants/units";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

interface SpecificationsStandaloneProps {
  carId: string;
}

interface ClientsResponse {
  clients: any[];
}

// Helper functions and subcomponents
const baseInputClasses =
  "bg-[var(--background-primary)] dark:bg-background-primary border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded px-2 py-1 text-[hsl(var(--foreground))] dark:text-white focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-background-primary";

const getInputValue = (
  value: string | number | MeasurementValue | null | undefined
): string => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (value.value === null) return "";
  return value.value.toString();
};

const getNumberInputValue = (
  value: string | number | MeasurementValue | null | undefined
): string => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string" && !isNaN(Number(value))) return value;
  if (typeof value === "object" && value.value !== null)
    return value.value.toString();
  return "";
};

const formatMeasurement = (
  measurement: MeasurementValue | string | undefined
): string => {
  if (!measurement) return "N/A";
  if (typeof measurement === "string") return measurement;
  if (measurement.value === null) return "N/A";
  return `${measurement.value} ${measurement.unit}`;
};

const formatMileage = (mileage: MeasurementValue | undefined): string => {
  if (!mileage || mileage.value === null || mileage.value === undefined)
    return "0";
  return (
    mileage.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    " " +
    (mileage.unit || "")
  );
};

const SpecificationsStandalone: React.FC<SpecificationsStandaloneProps> = ({
  carId,
}) => {
  const api = useAPI();
  const [car, setCar] = useState<ExtendedCar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [localSpecs, setLocalSpecs] = useState<Partial<ExtendedCar> | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    if (!carId || !api) return;
    const fetchCar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = (await api.get(`cars/${carId}`)) as ExtendedCar;
        setCar(data);
        setLocalSpecs(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCar();
  }, [carId, api]);

  useEffect(() => {
    if (!api) return;
    // Fetch clients when component mounts
    const fetchClients = async () => {
      try {
        const data = (await api.get("clients")) as ClientsResponse;
        if (!data || !Array.isArray(data.clients)) {
          setClients([]);
          return;
        }
        setClients(data.clients || []);
      } catch (error) {
        setClients([]);
      }
    };
    fetchClients();
  }, [api]);

  const handleInputChange = (field: string, value: any) => {
    setLocalSpecs((prev) => {
      if (!prev) return prev;
      const newSpecs = { ...prev } as Record<string, any>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        newSpecs[parent] = {
          ...(newSpecs[parent] || {}),
          [child]: value,
        };
      } else {
        newSpecs[field] = value;
      }
      return newSpecs as Partial<ExtendedCar>;
    });
  };

  const handleNestedInputChange = (
    parent: string,
    field: string,
    value: any
  ) => {
    setLocalSpecs((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [parent]: {
          ...(prev as Record<string, any>)[parent],
          [field]: value,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!localSpecs || !api) return;
    setIsSaving(true);
    try {
      const updated = (await api.put(
        `cars/${carId}`,
        localSpecs
      )) as ExtendedCar;
      setCar(updated);
      setLocalSpecs(updated);
      setIsEditMode(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalSpecs(car);
    setIsEditMode(false);
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading specifications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive-foreground">
        {error}
      </div>
    );
  }

  if (!car || !localSpecs) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No car data found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Specifications</h2>
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {/* Basic Info */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Year
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="number"
                value={localSpecs.year || ""}
                onChange={(e) =>
                  handleInputChange("year", parseInt(e.target.value) || "")
                }
                className={`w-24 ${baseInputClasses}`}
              />
            ) : (
              car.year
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Make
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.make || ""}
                onChange={(e) => handleInputChange("make", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.make
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Model
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.model || ""}
                onChange={(e) => handleInputChange("model", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.model
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Color
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.color || ""}
                onChange={(e) => handleInputChange("color", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.color || "N/A"
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Mileage
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <MeasurementInputWithUnit
                value={
                  localSpecs.mileage ?? {
                    value: car.mileage?.value ?? null,
                    unit: car.mileage?.unit ?? getUnitsForType("MILEAGE")[0],
                  }
                }
                onChange={(value) => handleInputChange("mileage", value)}
                availableUnits={getUnitsForType("MILEAGE")}
                className="justify-end"
              />
            ) : (
              formatMileage(car.mileage)
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            VIN
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white font-mono pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.vin || car.vin || ""}
                onChange={(e) => handleInputChange("vin", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.vin || "N/A"
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Client
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <select
                value={localSpecs.client ?? ""}
                onChange={(e) => handleInputChange("client", e.target.value)}
                className={`w-48 ${baseInputClasses}`}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option
                    key={client._id?.toString()}
                    value={client._id?.toString()}
                  >
                    {client.name}
                  </option>
                ))}
              </select>
            ) : (
              localSpecs.clientInfo?.name ||
              (localSpecs.client &&
                clients.find((c) => c._id?.toString() === localSpecs.client)
                  ?.name) ||
              "N/A"
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Location
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.location || car.location || ""}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.location || "N/A"
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            List Price
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="number"
                value={
                  localSpecs.price?.listPrice ?? car.price?.listPrice ?? ""
                }
                onChange={(e) =>
                  handleInputChange("price", {
                    ...car.price,
                    listPrice: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                className={`w-28 ${baseInputClasses}`}
              />
            ) : car.price?.listPrice ? (
              `$${car.price.listPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
            ) : (
              "Price on request"
            )}
          </span>
        </div>
        {car.status === "sold" && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Sold Price
            </span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="number"
                  value={
                    localSpecs.price?.soldPrice ?? car.price?.soldPrice ?? ""
                  }
                  onChange={(e) =>
                    handleInputChange("price", {
                      ...car.price,
                      soldPrice: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  className={`w-28 ${baseInputClasses}`}
                />
              ) : car.price?.soldPrice ? (
                `$${car.price.soldPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
              ) : (
                "Not recorded"
              )}
            </span>
          </div>
        )}
        {/* Engine Info */}
        {car.engine && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Engine Type
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="text"
                    value={localSpecs.engine?.type || ""}
                    onChange={(e) =>
                      handleNestedInputChange("engine", "type", e.target.value)
                    }
                    className={`w-48 ${baseInputClasses}`}
                  />
                ) : (
                  car.engine?.type || "N/A"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Displacement
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.engine?.displacement ??
                      car.engine?.displacement ?? { value: null, unit: "L" }
                    }
                    onChange={(value) =>
                      handleInputChange("engine.displacement", value)
                    }
                    availableUnits={["L", "cc"]}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.engine?.displacement)
                )}
              </span>
            </div>
            {car.engine.power && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Power Output
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={
                          localSpecs.engine?.power?.hp ?? car.engine.power.hp
                        }
                        onChange={(e) => {
                          const hp = parseFloat(e.target.value) || 0;
                          const kW = Math.round(hp * 0.7457);
                          const ps = Math.round(hp * 1.014);
                          handleInputChange("engine", {
                            ...car.engine,
                            power: { hp, kW, ps },
                          });
                        }}
                        className={`w-20 ${baseInputClasses}`}
                      />
                      <span>hp</span>
                    </div>
                  ) : (
                    `${car.engine.power.hp} hp / ${car.engine.power.kW} kW / ${car.engine.power.ps} ps`
                  )}
                </span>
              </div>
            )}
            {car.engine.torque &&
              (car.engine.torque["lb-ft"] > 0 || car.engine.torque.Nm > 0) && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                    Torque
                  </span>
                  <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                    {car.engine.torque["lb-ft"]} lb-ft / {car.engine.torque.Nm}{" "}
                    Nm
                  </span>
                </div>
              )}
            {car.engine.features && car.engine.features.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Engine Features
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {car.engine.features.join(", ")}
                </span>
              </div>
            )}
          </>
        )}
        {/* Manufacturing Info */}
        {car.manufacturing && (
          <>
            {car.manufacturing.series && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Series
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={
                        localSpecs.manufacturing?.series ??
                        car.manufacturing.series ??
                        ""
                      }
                      onChange={(e) =>
                        handleNestedInputChange(
                          "manufacturing",
                          "series",
                          e.target.value
                        )
                      }
                      className={`w-48 ${baseInputClasses}`}
                    />
                  ) : (
                    car.manufacturing.series
                  )}
                </span>
              </div>
            )}
            {car.manufacturing.trim && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Trim
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={
                        localSpecs.manufacturing?.trim ??
                        car.manufacturing.trim ??
                        ""
                      }
                      onChange={(e) =>
                        handleNestedInputChange(
                          "manufacturing",
                          "trim",
                          e.target.value
                        )
                      }
                      className={`w-48 ${baseInputClasses}`}
                    />
                  ) : (
                    car.manufacturing.trim
                  )}
                </span>
              </div>
            )}
            {car.manufacturing.bodyClass && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Body Class
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(
                        localSpecs.manufacturing?.bodyClass ??
                          car.manufacturing.bodyClass
                      )}
                      onChange={(e) =>
                        handleNestedInputChange(
                          "manufacturing",
                          "bodyClass",
                          e.target.value
                        )
                      }
                      className={`w-48 ${baseInputClasses}`}
                    />
                  ) : (
                    car.manufacturing.bodyClass
                  )}
                </span>
              </div>
            )}
          </>
        )}
        {/* Additional Vehicle Info */}
        {car.doors && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Number of Doors
            </span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="number"
                  value={getNumberInputValue(localSpecs.doors ?? car.doors)}
                  onChange={(e) => handleInputChange("doors", e.target.value)}
                  className={`w-24 ${baseInputClasses}`}
                />
              ) : (
                car.doors
              )}
            </span>
          </div>
        )}
        {/* Safety Features */}
        {car.safety?.tpms && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              TPMS Type
            </span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="text"
                  value={getInputValue(
                    localSpecs.safety?.tpms?.type ?? car.safety.tpms.type
                  )}
                  onChange={(e) =>
                    handleNestedInputChange(
                      "safety.tpms",
                      "type",
                      e.target.value
                    )
                  }
                  className={`w-48 ${baseInputClasses}`}
                />
              ) : (
                car.safety.tpms.type
              )}
            </span>
          </div>
        )}
        {/* Dimensions */}
        {car.dimensions && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Length
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.length ?? {
                        value: car.dimensions?.length?.value ?? null,
                        unit:
                          car.dimensions?.length?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "length", value)
                    }
                    availableUnits={getUnitsForType("LENGTH")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.length)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Width
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.width ?? {
                        value: car.dimensions?.width?.value ?? null,
                        unit:
                          car.dimensions?.width?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "width", value)
                    }
                    availableUnits={getUnitsForType("LENGTH")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.width)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Height
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.height ?? {
                        value: car.dimensions?.height?.value ?? null,
                        unit:
                          car.dimensions?.height?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "height", value)
                    }
                    availableUnits={getUnitsForType("LENGTH")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.height)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Wheelbase
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.wheelbase ?? {
                        value: car.dimensions?.wheelbase?.value ?? null,
                        unit:
                          car.dimensions?.wheelbase?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "wheelbase", value)
                    }
                    availableUnits={getUnitsForType("LENGTH")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.wheelbase)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                GVWR
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.gvwr ?? {
                        value: car.dimensions?.gvwr?.value ?? null,
                        unit:
                          car.dimensions?.gvwr?.unit ??
                          getUnitsForType("WEIGHT")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "gvwr", value)
                    }
                    availableUnits={getUnitsForType("WEIGHT")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.gvwr)
                )}
              </span>
            </div>
          </>
        )}
        {/* Interior Features */}
        {car.interior_features && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Interior Color
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="text"
                    value={
                      localSpecs.interior_color ?? car.interior_color ?? ""
                    }
                    onChange={(e) =>
                      handleInputChange("interior_color", e.target.value)
                    }
                    className={`w-48 ${baseInputClasses}`}
                  />
                ) : (
                  car.interior_color || "N/A"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Seats
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="number"
                    value={
                      localSpecs.interior_features?.seats ??
                      car.interior_features?.seats ??
                      ""
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "interior_features.seats",
                        parseInt(e.target.value) || ""
                      )
                    }
                    className={`w-24 ${baseInputClasses}`}
                  />
                ) : (
                  car.interior_features.seats || "N/A"
                )}
              </span>
            </div>
          </>
        )}
        {/* Transmission */}
        {car.transmission && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Transmission Type
            </span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="text"
                  value={
                    localSpecs.transmission?.type ?? car.transmission.type ?? ""
                  }
                  onChange={(e) =>
                    handleNestedInputChange(
                      "transmission",
                      "type",
                      e.target.value
                    )
                  }
                  className={`w-48 ${baseInputClasses}`}
                />
              ) : (
                car.transmission.type
              )}
            </span>
          </div>
        )}
        {/* Description */}
        <div className="flex flex-col px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] mb-2">
            Description
          </span>
          <div className="w-full">
            {isEditMode ? (
              <textarea
                value={localSpecs.description ?? car.description ?? ""}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className={`w-full h-32 ${baseInputClasses}`}
                placeholder="Enter car description..."
              />
            ) : (
              <p className="text-sm text-[hsl(var(--foreground))] dark:text-white whitespace-pre-wrap">
                {car.description || "No description available"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecificationsStandalone;
