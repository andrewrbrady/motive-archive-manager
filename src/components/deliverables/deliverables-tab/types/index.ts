import { Deliverable, DeliverableStatus } from "@/types/deliverable";

export interface DeliverablesTabProps {
  carId: string | string[];
}

export interface EditingCell {
  id: string;
  field: keyof Deliverable;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

export interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

export interface DeliverableWithCar extends Deliverable {
  car?: Car;
  firebase_uid?: string;
  editor: string;
}

export interface DeliverableActions {
  onEdit: (deliverable: Deliverable) => void;
  onDelete: (deliverableId: string) => void;
  onDuplicate: (deliverable: Deliverable) => void;
  onStatusChange: (deliverableId: string, newStatus: DeliverableStatus) => void;
  onUpdate?: (deliverableId: string, updates: Partial<Deliverable>) => void;
  onRefresh: () => void;
}

export interface BatchModeState {
  isBatchMode: boolean;
  selectedDeliverables: string[];
  toggleBatchMode: () => void;
  toggleDeliverableSelection: (id: string) => void;
  toggleAllDeliverables: () => void;
  handleBatchDelete: () => Promise<void>;
}

export interface DeliverableFilters {
  search: string;
  status: string;
  platform: string;
  editor: string;
  type: string;
  selectedCar?: string;
  creativeRole?: string;
}

export interface PaginationState {
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
}
