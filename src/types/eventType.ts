export interface EventTypeSetting {
  key: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // CSS color class
  category: "auction" | "service" | "logistics" | "production" | "other";
}

export interface EventTypeCategory {
  key: string;
  name: string;
  description: string;
  color: string;
}

// Default event type settings
export const defaultEventTypeSettings: EventTypeSetting[] = [
  {
    key: "auction_submission",
    name: "Auction Submission",
    description: "Vehicle submitted to auction platform",
    icon: "Upload",
    color: "bg-blue-100 text-blue-800",
    category: "auction",
  },
  {
    key: "auction_listing",
    name: "Auction Listing",
    description: "Vehicle listed for auction",
    icon: "Tag",
    color: "bg-blue-200 text-blue-900",
    category: "auction",
  },
  {
    key: "auction_end",
    name: "Auction End",
    description: "Auction completed with final sale",
    icon: "Gavel",
    color: "bg-blue-300 text-blue-900",
    category: "auction",
  },
  {
    key: "inspection",
    name: "Inspection",
    description: "Vehicle inspection and assessment",
    icon: "Search",
    color: "bg-yellow-100 text-yellow-800",
    category: "service",
  },
  {
    key: "detail",
    name: "Detail",
    description: "Vehicle detailing and cleaning",
    icon: "Wrench",
    color: "bg-orange-100 text-orange-800",
    category: "service",
  },
  {
    key: "production",
    name: "Production",
    description: "Content production and photography",
    icon: "Camera",
    color: "bg-purple-100 text-purple-800",
    category: "production",
  },
  {
    key: "post_production",
    name: "Post Production",
    description: "Content editing and post-processing",
    icon: "Video",
    color: "bg-indigo-100 text-indigo-800",
    category: "production",
  },
  {
    key: "marketing",
    name: "Marketing",
    description: "Marketing campaigns and promotion",
    icon: "Sparkles",
    color: "bg-pink-100 text-pink-800",
    category: "production",
  },
  {
    key: "pickup",
    name: "Pickup",
    description: "Vehicle pickup and transport",
    icon: "Package",
    color: "bg-green-100 text-green-800",
    category: "logistics",
  },
  {
    key: "delivery",
    name: "Delivery",
    description: "Vehicle delivery to destination",
    icon: "Truck",
    color: "bg-blue-100 text-blue-800",
    category: "logistics",
  },
  {
    key: "other",
    name: "Other",
    description: "Miscellaneous events",
    icon: "MoreHorizontal",
    color: "bg-gray-100 text-gray-800",
    category: "other",
  },
];

export const eventTypeCategories: EventTypeCategory[] = [
  {
    key: "auction",
    name: "Auction",
    description: "Auction-related events",
    color: "bg-blue-50 border-blue-200",
  },
  {
    key: "service",
    name: "Service",
    description: "Vehicle service and maintenance",
    color: "bg-yellow-50 border-yellow-200",
  },
  {
    key: "logistics",
    name: "Logistics",
    description: "Transportation and logistics",
    color: "bg-green-50 border-green-200",
  },
  {
    key: "production",
    name: "Production",
    description: "Content creation and marketing",
    color: "bg-purple-50 border-purple-200",
  },
  {
    key: "other",
    name: "Other",
    description: "Miscellaneous events",
    color: "bg-gray-50 border-gray-200",
  },
];
