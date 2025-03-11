"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface Deliverable {
  _id: string;
  title: string;
  platform: string;
  type: string;
  status: string;
  edit_deadline: string;
  release_date: string;
  car?: Car;
}

interface UserDeliverablesProps {
  userName: string;
}

const PLATFORMS = [
  "Instagram Reels",
  "Instagram Post",
  "Instagram Story",
  "YouTube",
  "YouTube Shorts",
  "TikTok",
  "Facebook",
  "Bring a Trailer",
  "Other",
];

const TYPES = [
  "Photo Gallery",
  "Video",
  "Mixed Gallery",
  "Video Gallery",
  "Still",
  "Graphic",
];

const STATUSES = ["not_started", "in_progress", "done"];

export default function UserDeliverables({ userName }: UserDeliverablesProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [type, setType] = useState("all");

  useEffect(() => {
    const fetchDeliverables = async () => {
      try {
        const params = new URLSearchParams({
          editor: userName,
          sortField: "edit_deadline",
          sortDirection: "asc",
        });

        if (search) params.append("search", search);
        if (status && status !== "all") params.append("status", status);
        if (platform && platform !== "all") params.append("platform", platform);
        if (type && type !== "all") params.append("type", type);

        const response = await fetch(`/api/deliverables?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch deliverables");
        }
        const data = await response.json();
        setDeliverables(data.deliverables);
      } catch (error) {
        console.error("Error fetching deliverables:", error);
        toast({
          title: "Error",
          description: "Failed to fetch deliverables",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userName) {
      fetchDeliverables();
    }
  }, [userName, search, status, platform, type]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started":
        return "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]";
      case "in_progress":
        return "bg-primary/10 text-primary";
      case "done":
        return "bg-success-100 dark:bg-success-800 bg-opacity-20 text-success-700 dark:text-success-300";
      default:
        return "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "No date set";

    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return format(date, "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Loading deliverables...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="search"
                className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
              >
                Search
              </label>
              <Input
                id="search"
                placeholder="Search deliverables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="status"
                className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
              >
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="platform"
                className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
              >
                Platform
              </label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform">
                  <SelectValue placeholder="All platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="type"
                className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
              >
                Type
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {deliverables.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No deliverables found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Edit Deadline</TableHead>
                  <TableHead>Release Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverables.map((deliverable) => (
                  <TableRow key={deliverable._id}>
                    <TableCell className="font-medium">
                      {deliverable.title}
                    </TableCell>
                    <TableCell>
                      {deliverable.car
                        ? `${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>{deliverable.type}</TableCell>
                    <TableCell>{deliverable.platform}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                          deliverable.status
                        )}`}
                      >
                        {formatStatus(deliverable.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDate(deliverable.edit_deadline)}
                    </TableCell>
                    <TableCell>
                      {formatDate(deliverable.release_date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
