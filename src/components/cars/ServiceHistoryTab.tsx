import React from "react";

interface ServiceHistoryTabProps {
  carId: string;
}

const ServiceHistoryTab: React.FC<ServiceHistoryTabProps> = ({ carId }) => {
  return (
    <div className="text-center py-12 text-muted-foreground">
      Service history coming soon
    </div>
  );
};

export default ServiceHistoryTab;
