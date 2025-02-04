import { Car } from "@/types/car";

interface SpecificationProps {
  car: Car;
}

interface SpecificationItemProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

const SpecificationItem = ({ label, value, unit }: SpecificationItemProps) => {
  if (!value && value !== 0) return null;

  return (
    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-white font-medium">
        {value}
        {unit && ` ${unit}`}
      </span>
    </div>
  );
};

interface SpecificationSectionProps {
  title: string;
  children: React.ReactNode;
}

const SpecificationSection = ({
  title,
  children,
}: SpecificationSectionProps) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

export default function Specifications({ car }: SpecificationProps) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Specifications
      </h2>

      {/* Basic Information */}
      <SpecificationSection title="Basic Information">
        <SpecificationItem label="Make" value={car.make} />
        <SpecificationItem label="Model" value={car.model} />
        <SpecificationItem label="Year" value={car.year} />
        <SpecificationItem label="VIN" value={car.vin} />
        <SpecificationItem
          label="Body Style"
          value={car.manufacturing?.bodyClass}
        />
        <SpecificationItem label="Number of Doors" value={car.doors} />
        <SpecificationItem label="Condition" value={car.condition} />
        <SpecificationItem
          label="Mileage"
          value={car.mileage.value}
          unit={car.mileage.unit}
        />
      </SpecificationSection>

      {/* Engine & Performance */}
      <SpecificationSection title="Engine & Performance">
        <SpecificationItem label="Engine Type" value={car.engine.type} />
        <SpecificationItem
          label="Displacement"
          value={car.engine.displacement.value}
          unit={car.engine.displacement.unit}
        />
        <SpecificationItem
          label="Power Output"
          value={car.engine.power.hp}
          unit="hp"
        />
        <SpecificationItem
          label="Power (kW)"
          value={car.engine.power.kW}
          unit="kW"
        />
        <SpecificationItem
          label="Power (PS)"
          value={car.engine.power.ps}
          unit="PS"
        />
        <SpecificationItem
          label="Torque"
          value={car.engine.torque["lb-ft"]}
          unit="lb-ft"
        />
        <SpecificationItem
          label="Torque (Nm)"
          value={car.engine.torque.Nm}
          unit="Nm"
        />
        {car.engine.features?.map((feature, index) => (
          <SpecificationItem
            key={index}
            label={`Feature ${index + 1}`}
            value={feature}
          />
        ))}
      </SpecificationSection>

      {/* Vehicle Details */}
      <SpecificationSection title="Vehicle Details">
        <SpecificationItem label="Series" value={car.manufacturing?.series} />
        <SpecificationItem label="Trim Level" value={car.manufacturing?.trim} />
        <SpecificationItem
          label="GVWR"
          value={car.dimensions?.gvwr?.value}
          unit={car.dimensions?.gvwr?.unit}
        />
        <SpecificationItem label="Exterior Color" value={car.color} />
        <SpecificationItem label="Interior Color" value={car.interior_color} />
      </SpecificationSection>

      {/* Manufacturing Information */}
      <SpecificationSection title="Manufacturing Information">
        <SpecificationItem
          label="Manufacturing Plant"
          value={car.manufacturing?.plant?.company}
        />
        <SpecificationItem
          label="Plant Location"
          value={
            car.manufacturing?.plant?.city && car.manufacturing?.plant?.country
              ? `${car.manufacturing.plant.city}, ${car.manufacturing.plant.country}`
              : car.manufacturing?.plant?.city ||
                car.manufacturing?.plant?.country
          }
        />
      </SpecificationSection>

      {/* Safety Features */}
      {car.safety && (
        <SpecificationSection title="Safety Features">
          {car.safety.tpms && (
            <SpecificationItem
              label="Tire Pressure Monitoring"
              value="Equipped"
            />
          )}
          {/* Add more safety features as they become available */}
        </SpecificationSection>
      )}

      {/* AI Analysis Insights */}
      {car.aiAnalysis && Object.keys(car.aiAnalysis).length > 0 && (
        <SpecificationSection title="Additional Information">
          {Object.entries(car.aiAnalysis)
            .filter(([_, info]) => info.confidence === "confirmed")
            .map(([key, info], index) => (
              <SpecificationItem
                key={index}
                label={key.replace(/([A-Z])/g, " $1").trim()} // Convert camelCase to spaces
                value={info.value}
              />
            ))}
        </SpecificationSection>
      )}
    </div>
  );
}
