"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  Folder,
  HardDriveIcon,
  Loader2,
  MoreHorizontal,
  PieChart,
  Unlink,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

interface HardDriveDetailsProps {
  params: {
    id: string;
  };
}

interface HardDrive {
  _id: string;
  label: string;
  systemName?: string;
  type: string;
  interface: string;
  capacity: {
    total: number;
    used?: number;
  };
  status: string;
  location?: string;
  notes?: string;
  rawAssets?: string[];
  dateAdded?: string;
  dateModified?: string;
}

interface Location {
  _id: string;
  name: string;
  type: string;
}

interface RawAsset {
  _id: string;
  title: string;
  type: string;
  status: string;
  description?: string;
  dateCreated?: string;
  dateImported?: string;
}

export default function HardDriveDetails({ params }: any) {
  const router = useRouter();
  const driveId = params.id;

  const [drive, setDrive] = useState<HardDrive | null>(null);
  const [assets, setAssets] = useState<RawAsset[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingAsset, setRemovingAsset] = useState<string | null>(null);
  const [isRemovingAsset, setIsRemovingAsset] = useState(false);
  const [isDeletingDrive, setIsDeletingDrive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch hard drive and related data
  useEffect(() => {
    const fetchDrive = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch hard drive details
        const response = await fetch(`/api/hard-drives/${driveId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch hard drive: ${response.statusText}`);
        }

        const data = await response.json();
        setDrive(data);

        // If there's a location, fetch it
        if (data.location) {
          await fetchLocation(data.location);
        }

        // If there are raw assets, fetch them
        if (data.rawAssets && data.rawAssets.length > 0) {
          await fetchRawAssets(data.rawAssets);
        }
      } catch (err) {
        console.error("Error fetching hard drive details:", err);
        setError("Failed to load hard drive details");
        toast({
          title: "Error",
          description: "Failed to load hard drive details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (driveId) {
      fetchDrive();
    }
  }, [driveId]);

  // Fetch location details
  const fetchLocation = async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`);
      if (!response.ok) {
        console.warn(
          `Failed to fetch location details: ${response.statusText}`
        );
        return;
      }

      const data = await response.json();
      setLocation(data);
    } catch (err) {
      console.error("Error fetching location details:", err);
    }
  };

  // Fetch raw assets
  const fetchRawAssets = async (assetIds: string[]) => {
    try {
      // We'll fetch each asset individually since we don't have a bulk endpoint
      const promises = assetIds.map((id) =>
        fetch(`/api/raw/${id}`).then(async (res) => {
          if (!res.ok) {
            console.warn(`Failed to fetch asset ${id}: ${res.statusText}`);
            return null;
          }
          const data = await res.json();
          console.log(`Asset data for ${id}:`, data);

          // Determine asset type from metadata or extension if available
          let assetType = "Unknown";
          if (data.metadata?.format) {
            // If we have format metadata, use it to determine type
            const format = data.metadata.format.toLowerCase();
            if (
              format.includes("video") ||
              ["mp4", "mov", "avi", "wmv"].some((ext) => format.includes(ext))
            ) {
              assetType = "Video";
            } else if (
              format.includes("audio") ||
              ["mp3", "wav", "aac", "flac"].some((ext) => format.includes(ext))
            ) {
              assetType = "Audio";
            } else if (
              format.includes("image") ||
              ["jpg", "jpeg", "png", "gif", "tiff"].some((ext) =>
                format.includes(ext)
              )
            ) {
              assetType = "Image";
            } else if (
              format.includes("document") ||
              ["pdf", "doc", "docx", "txt"].some((ext) => format.includes(ext))
            ) {
              assetType = "Document";
            }
          }

          // Determine status - we might need to derive this from other properties
          // For now, use a default value or check common status-related fields
          let assetStatus = data.status || data.metadata?.status || "Imported";

          // Transform the API response to match our expected RawAsset interface
          return {
            _id: data._id,
            title:
              data.title || data.name || data.description || "Untitled Asset", // Try multiple fields that might contain a title
            type: data.type || assetType,
            status: assetStatus,
            description: data.description,
            dateCreated: data.createdAt,
            dateImported: data.date,
          };
        })
      );

      const results = await Promise.all(promises);
      const validAssets = results.filter(Boolean) as RawAsset[];
      console.log("All transformed assets:", validAssets);
      setAssets(validAssets);
    } catch (err) {
      console.error("Error fetching raw assets:", err);
    }
  };

  // Handle removing an asset from this drive
  const handleRemoveAsset = async () => {
    if (!removingAsset || !drive?._id) return;

    setIsRemovingAsset(true);

    try {
      const response = await fetch(
        `/api/hard-drives/${drive._id}/assets/${removingAsset}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove asset from hard drive");
      }

      // Update UI by removing the asset from the list
      setAssets((currentAssets) =>
        currentAssets.filter((asset) => asset._id !== removingAsset)
      );

      // Update the drive's rawAssets
      if (drive.rawAssets) {
        setDrive({
          ...drive,
          rawAssets: drive.rawAssets.filter((id) => id !== removingAsset),
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
      setIsRemovingAsset(false);
      setRemovingAsset(null);
    }
  };

  // Handle deleting the hard drive
  const handleDeleteDrive = async () => {
    setIsDeletingDrive(true);

    try {
      const response = await fetch(`/api/hard-drives/${driveId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete hard drive");
      }

      toast({
        title: "Success",
        description: "Hard drive deleted successfully",
      });

      // Navigate back to production page
      router.push("/production");
    } catch (err) {
      console.error("Error deleting hard drive:", err);
      toast({
        title: "Error",
        description: "Failed to delete hard drive",
        variant: "destructive",
      });
    } finally {
      setIsDeletingDrive(false);
    }
  };

  // Format capacity for display
  const formatCapacity = () => {
    if (!drive) return null;

    const { total, used } = drive.capacity;
    const usedSpace = used || 0;
    const usedPercentage =
      total > 0 ? Math.min(100, Math.round((usedSpace / total) * 100)) : 0;
    const freeSpace = total - usedSpace;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{usedSpace} GB used</span>
          <span>{total} GB total</span>
        </div>
        <Progress value={usedPercentage} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{usedPercentage}% used</span>
          <span>{freeSpace} GB free</span>
        </div>
      </div>
    );
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
  if (error || !drive) {
    return (
      <div className="container mx-auto p-6">
        <Navbar />
        <div className="mt-8 p-6 bg-background-secondary rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-4">
            {error || "Hard drive not found"}
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
              <div className="flex items-center gap-3">
                <HardDriveIcon className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-semibold">{drive.label}</h1>
                  {drive.systemName && (
                    <p className="text-muted-foreground">
                      System Name: {drive.systemName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/hard-drives/${drive._id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Hard Drive</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this hard drive? This
                        action cannot be undone.
                        {assets.length > 0 && (
                          <p className="mt-2 text-destructive">
                            Warning: This hard drive has {assets.length} raw
                            assets linked to it. Deleting it will remove these
                            references.
                          </p>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteDrive}
                        disabled={isDeletingDrive}
                      >
                        {isDeletingDrive ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Hard Drive
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Drive Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Basic Information and Storage Information */}
              <div className="space-y-6">
                {/* Basic Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Type
                      </h4>
                      <p>{drive.type}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Interface
                      </h4>
                      <p>{drive.interface}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Status
                      </h4>
                      <Badge variant="outline">{drive.status}</Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Location
                      </h4>
                      <p>
                        {location
                          ? location.name
                          : drive.location
                            ? "Loading..."
                            : "No location assigned"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Notes
                      </h4>
                      <p>{drive.notes || "No notes."}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Storage Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Storage Information</CardTitle>
                    <CardDescription>
                      Capacity and usage details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {formatCapacity()}

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Assets Stored
                      </h4>
                      <p className="flex items-center">
                        <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                        {assets.length} raw asset
                        {assets.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Raw Assets */}
              <Card>
                <CardHeader>
                  <CardTitle>Raw Assets</CardTitle>
                  <CardDescription>
                    Assets stored on this hard drive
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {assets.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((asset) => (
                          <TableRow key={asset._id}>
                            <TableCell className="font-medium">
                              <Link href={`/raw/${asset._id}`}>
                                {asset.title || "Untitled Asset"}
                              </Link>
                              {asset.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {asset.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{asset.type || "Unknown"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {asset.status || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Options</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(`/raw/${asset._id}`)
                                    }
                                  >
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setRemovingAsset(asset._id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    Remove from Drive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Folder className="h-8 w-8 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No assets stored</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        This hard drive doesn't have any raw assets linked to it
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialog for removing an asset */}
      {removingAsset && (
        <Dialog
          open={!!removingAsset}
          onOpenChange={() => setRemovingAsset(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Asset from Hard Drive</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this asset from the hard drive?
                This will only unlink the reference; it won't delete any files
                from the drive.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemovingAsset(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveAsset}
                disabled={isRemovingAsset}
              >
                {isRemovingAsset ? (
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
      )}
    </div>
  );
}
