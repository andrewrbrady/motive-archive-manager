"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Deliverable } from "@/types/deliverable";
import { Car } from "@/types/car";
import { toast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";
import { useMediaTypes } from "@/hooks/useMediaTypes";
import { LoadingSpinner } from "@/components/ui/loading";
import { PlatformBadges } from "@/components/deliverables/PlatformBadges";

interface UserDeliverablesProps {
  userName: string;
}

// Extended Deliverable type with populated car data
interface DeliverableWithCar extends Deliverable {
  car?: Car;
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
  const [deliverables, setDeliverables] = useState<DeliverableWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [type, setType] = useState("all");

  const api = useAPI();
  const { mediaTypes } = useMediaTypes();

  // Helper function to get the proper media type name for display
  const getMediaTypeName = (deliverable: Deliverable) => {
    if (deliverable.mediaTypeId) {
      const mediaType = mediaTypes.find(
        (mt) => mt._id.toString() === deliverable.mediaTypeId?.toString()
      );
      return mediaType ? mediaType.name : deliverable.type;
    }
    return deliverable.type;
  };

  if (!api) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Loading...</span>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    const fetchDeliverables = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          firebase_uid: userName,
          sortField: "updated_at",
          sortDirection: "asc",
        });

        if (search) params.append("search", search);
        if (status && status !== "all") params.append("status", status);
        if (platform && platform !== "all") params.append("platform", platform);
        if (type && type !== "all") params.append("type", type);

        const data = (await api.get(`deliverables?${params}`)) as {
          deliverables: DeliverableWithCar[];
        };
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
  }, [userName, search, status, platform, type, api]);

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

  const formatDate = (dateInput: string | Date | undefined | null) => {
    if (!dateInput) return "No date set";

    try {
      const date =
        typeof dateInput === "string" ? new Date(dateInput) : dateInput;
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
                htmlFor="status-filter"
                className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
              >
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="platform-filter"
                className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
              >
                Platform
              </label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="type-filter"
                className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
              >
                Media Type
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
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
                  <TableHead>Media Type</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Edit Deadline</TableHead>
                  <TableHead>Release Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverables.map((deliverable) => (
                  <TableRow key={deliverable._id?.toString()}>
                    <TableCell className="font-medium">
                      {deliverable.title}
                    </TableCell>
                    <TableCell>
                      {deliverable.car
                        ? `${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>{getMediaTypeName(deliverable)}</TableCell>
                    <TableCell>
                      <PlatformBadges
                        platform_id={deliverable.platform_id?.toString()}
                        platform={deliverable.platform}
                        platforms={deliverable.platforms}
                        maxVisible={1}
                        size="sm"
                      />
                    </TableCell>
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
