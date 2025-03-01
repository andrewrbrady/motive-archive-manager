"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Loader2,
  Pencil,
  HardDriveIcon,
  Unlink,
  Plus,
  Trash2,
  ArrowLeft,
  Paperclip,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RawAsset {
  _id?: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  tags?: string[];
  date?: string;
  metadata?: {
    format?: string;
    duration?: number;
    dimensions?: {
      width?: number;
      height?: number;
    };
    frameRate?: number;
    other?: Record<string, any>;
  };
  dateCreated?: string;
  dateImported?: string;
  hardDriveIds?: string[];
  notes?: string;
  location?: string;
}

interface HardDrive {
  _id: string;
  label: string;
  systemName?: string;
  type: string;
  status: string;
  capacity: {
    total: number;
    used?: number;
  };
}

interface LocationData {
  _id: string;
  name: string;
  type: string;
}

interface RawAssetDetailsProps {
  params: {
    id: string;
  };
}

export default function RawAssetDetails({ params }: RawAssetDetailsProps) {
  const router = useRouter();
  const [asset, setAsset] = useState<RawAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [hardDrives, setHardDrives] = useState<HardDrive[]>([]);
  const [locations, setLocations] = useState<Record<string, LocationData>>({});
  const [removingDriveId, setRemovingDriveId] = useState<string | null>(null);
  const [isRemovingDrive, setIsRemovingDrive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch asset data
  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/raw/${params.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch asset: ${response.statusText}`);
        }

        const data = await response.json();
        setAsset(data);

        // If the asset has hard drives, fetch them
        if (data.hardDriveIds && data.hardDriveIds.length > 0) {
          await fetchLinkedHardDrives(data.hardDriveIds);
        }

        // If the asset has a location, store it for later reference
        if (data.location) {
          await fetchLocations();
        }
      } catch (err) {
        console.error("Error fetching asset details:", err);
        setError("Failed to load asset details. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load asset details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAsset();
    }
  }, [params.id]);

  // Fetch hard drives linked to this asset
  const fetchLinkedHardDrives = async (hardDriveIds: string[]) => {
    try {
      const promises = hardDriveIds.map((id) =>
        fetch(`/api/hard-drives/${id}`).then((res) => {
          if (!res.ok) {
            console.warn(`Failed to fetch hard drive ${id}`);
            return null;
          }
          return res.json();
        })
      );

      const results = await Promise.all(promises);
      const validDrives = results.filter(Boolean) as HardDrive[];
      setHardDrives(validDrives);
    } catch (err) {
      console.error("Error fetching linked hard drives:", err);
      toast({
        title: "Warning",
        description: "Failed to load some linked hard drives",
        variant: "destructive",
      });
    }
  };

  // Fetch location information
  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }

      const data = await response.json();
      const locationsMap: Record<string, LocationData> = {};

      data.locations.forEach((loc: LocationData) => {
        locationsMap[loc._id] = loc;
      });

      setLocations(locationsMap);
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  };

  // Handle removing a hard drive
  const handleRemoveHardDrive = async () => {
    if (!removingDriveId || !asset?._id) return;

    setIsRemovingDrive(true);

    try {
      const response = await fetch(
        `/api/hard-drives/${removingDriveId}/assets/${asset._id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove asset from hard drive");
      }

      // Update UI by removing the hard drive from the list
      setHardDrives((drives) =>
        drives.filter((drive) => drive._id !== removingDriveId)
      );

      // Update the asset's hardDriveIds
      if (asset.hardDriveIds) {
        setAsset({
          ...asset,
          hardDriveIds: asset.hardDriveIds.filter(
            (id) => id !== removingDriveId
          ),
        });
      }

      toast({
        title: "Success",
        description: "Asset removed from hard drive",
      });
    } catch (err) {
      console.error("Error removing asset from hard drive:", err);
      toast({
        title: "Error",
        description: "Failed to remove asset from hard drive",
        variant: "destructive",
      });
    } finally {
      setIsRemovingDrive(false);
      setRemovingDriveId(null);
    }
  };

  // Handle navigation to edit page
  const handleEdit = () => {
    if (asset?._id) {
      router.push(`/raw/${asset._id}/edit`);
    }
  };

  // Format asset type for display
  const formatAssetType = (type: string) => {
    // Handle undefined or null type
    if (!type) {
      return "Unknown";
    }

    switch (type) {
      case "video":
        return "Video";
      case "audio":
        return "Audio";
      case "image":
        return "Image";
      case "document":
        return "Document";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Format asset status for display
  const getStatusBadge = (status: string) => {
    let variant = "default";

    // Check if status is defined before calling toLowerCase
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>;
    }

    switch (status.toLowerCase()) {
      case "ingest":
        variant = "secondary";
        break;
      case "processing":
        variant = "default";
        break;
      case "ready":
        variant = "success";
        break;
      case "archived":
        variant = "outline";
        break;
      case "error":
        variant = "destructive";
        break;
    }
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Format duration for display
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !asset) {
    return (
      <div className="container mx-auto p-6">
        <Navbar />
        <div className="mt-8 p-6 bg-background-secondary rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-4">
            {error || "Asset not found"}
          </h2>
          <Button variant="outline" onClick={() => router.push("/production")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Production
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Navbar />

      <div className="mt-8 mb-4">
        <Button
          variant="outline"
          onClick={() => router.push("/production")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Production
        </Button>

        <div className="bg-[hsl(var(--background))] rounded-lg p-6">
          <div className="flex flex-col space-y-8">
            {/* Header with title and actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col">
                <h1 className="text-2xl font-semibold">
                  {asset.title || asset.description || "Untitled Asset"}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(asset.status)}
                  <span className="text-sm text-muted-foreground">
                    {formatAssetType(asset.type)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Asset Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Basic Information and Technical Details */}
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Date
                      </h4>
                      <p>
                        {asset.date
                          ? formatDate(asset.date)
                          : "No date provided."}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Description
                      </h4>
                      <p>{asset.description || "No description provided."}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {asset.tags && asset.tags.length > 0 ? (
                          asset.tags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No tags
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Location
                      </h4>
                      <p>
                        {asset.location && locations[asset.location]
                          ? locations[asset.location].name
                          : "No location assigned"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Notes
                      </h4>
                      <p>{asset.notes || "No notes."}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {asset.metadata?.format && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          Format
                        </h4>
                        <p>{asset.metadata.format}</p>
                      </div>
                    )}

                    {asset.metadata?.duration !== undefined && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          Duration
                        </h4>
                        <p>{formatDuration(asset.metadata.duration)}</p>
                      </div>
                    )}

                    {asset.metadata?.dimensions && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          Dimensions
                        </h4>
                        <p>
                          {asset.metadata.dimensions.width || "?"} ×{" "}
                          {asset.metadata.dimensions.height || "?"}
                        </p>
                      </div>
                    )}

                    {asset.metadata?.frameRate && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          Frame Rate
                        </h4>
                        <p>{asset.metadata.frameRate} fps</p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Date Created
                      </h4>
                      <p>{formatDate(asset.dateCreated)}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Date Imported
                      </h4>
                      <p>{formatDate(asset.dateImported)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Storage Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Storage</CardTitle>
                    <CardDescription>
                      Hard drives where this asset is stored
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (asset._id) {
                        router.push(`/raw/${asset._id}/add-storage`);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Drive
                  </Button>
                </CardHeader>
                <CardContent>
                  {hardDrives.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Label</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hardDrives.map((drive) => (
                          <TableRow key={drive._id}>
                            <TableCell>
                              <div className="font-medium">
                                <Link href={`/hard-drives/${drive._id}`}>
                                  {drive.label}
                                </Link>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {drive.systemName || ""}
                              </div>
                            </TableCell>
                            <TableCell>{drive.type}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{drive.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {drive.capacity.total} GB
                              {drive.capacity.used !== undefined &&
                                ` (${drive.capacity.used} GB used)`}
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setRemovingDriveId(drive._id)
                                    }
                                  >
                                    <Unlink className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Remove from Hard Drive
                                    </DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to remove this asset
                                      from the hard drive "{drive.label}
                                      "? This will only unlink the reference; it
                                      won't delete any files from the drive.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => setRemovingDriveId(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={handleRemoveHardDrive}
                                      disabled={isRemovingDrive}
                                    >
                                      {isRemovingDrive ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Removing...
                                        </>
                                      ) : (
                                        <>
                                          <Unlink className="h-4 w-4 mr-2" />
                                          Remove
                                        </>
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <HardDriveIcon className="h-8 w-8 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">
                        No hard drives linked
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        This asset is not linked to any hard drives yet
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (asset._id) {
                            router.push(`/raw/${asset._id}/add-storage`);
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Drive
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
