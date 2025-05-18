"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowLeft, HardDriveIcon, Loader2, Search, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/PageTitle";

interface RawAsset {
  _id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  hardDriveIds?: string[];
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
  rawAssets?: string[];
}

export default function AddStoragePage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params?.id as string;

  const [asset, setAsset] = useState<RawAsset | null>(null);
  const [availableDrives, setAvailableDrives] = useState<HardDrive[]>([]);
  const [selectedDrives, setSelectedDrives] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch asset and available hard drives
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the asset details
        const assetResponse = await fetch(`/api/raw-assets/${assetId}`);
        if (!assetResponse.ok) {
          throw new Error(`Failed to fetch asset: ${assetResponse.statusText}`);
        }

        const assetData = await assetResponse.json();
        setAsset(assetData);

        // Fetch all hard drives
        const drivesResponse = await fetch("/api/hard-drives");
        if (!drivesResponse.ok) {
          throw new Error(
            `Failed to fetch hard drives: ${drivesResponse.statusText}`
          );
        }

        const drivesData = await drivesResponse.json();

        // Filter out hard drives that already contain this asset
        const filteredDrives = drivesData.hard_drives.filter(
          (drive: HardDrive) => !assetData.hardDriveIds?.includes(drive._id)
        );

        setAvailableDrives(filteredDrives);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (assetId) {
      fetchData();
    }
  }, [assetId]);

  // Filter drives based on search query
  const filteredDrives = availableDrives.filter((drive) => {
    const query = searchQuery.toLowerCase();
    return (
      drive.label.toLowerCase().includes(query) ||
      (drive.systemName && drive.systemName.toLowerCase().includes(query)) ||
      drive.type.toLowerCase().includes(query) ||
      drive.status.toLowerCase().includes(query)
    );
  });

  // Handle checkbox change
  const handleDriveSelection = (driveId: string) => {
    setSelectedDrives((prevSelected) => {
      if (prevSelected.includes(driveId)) {
        return prevSelected.filter((id) => id !== driveId);
      } else {
        return [...prevSelected, driveId];
      }
    });
  };

  // Handle save button click
  const handleSave = async () => {
    if (selectedDrives.length === 0) {
      toast({
        title: "Warning",
        description: "Please select at least one hard drive",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Process each selected drive in parallel
      const promises = selectedDrives.map((driveId) =>
        fetch(`/api/hard-drives/${driveId}/assets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assetId }),
        }).then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to add asset to drive ${driveId}`);
          }
          return { driveId, success: true };
        })
      );

      const results = await Promise.allSettled(promises);

      // Check for any failures
      const failures = results.filter(
        (result) => result.status === "rejected"
      ) as PromiseRejectedResult[];

      if (failures.length > 0) {
        console.error("Some operations failed:", failures);
        toast({
          title: "Partial Success",
          description: `Added to ${
            results.length - failures.length
          } drives, but ${failures.length} operations failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Asset added to ${selectedDrives.length} hard drive${
            selectedDrives.length > 1 ? "s" : ""
          }`,
        });
      }

      // Navigate back to the asset details page
      router.push(`/raw/${assetId}`);
    } catch (err) {
      console.error("Error adding asset to drives:", err);
      toast({
        title: "Error",
        description: "Failed to add asset to selected drives",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !asset) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mt-8 p-6 bg-background-secondary rounded-lg text-center">
            <h2 className="text-xl font-semibold mb-4">
              {error || "Asset not found"}
            </h2>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mt-8 mb-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/raw/${assetId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Asset Details
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDriveIcon className="h-5 w-5" />
                <CardTitle>Add Asset to Hard Drives</CardTitle>
              </div>
              <CardDescription>
                Select the hard drives where you want to store this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Asset Details</h3>
                <div className="p-4 rounded-md border border-border">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{asset.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{asset.status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {asset.type}
                      </span>
                    </div>
                    {asset.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {asset.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Search and selection */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search hard drives..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                  {filteredDrives.length > 0 ? (
                    filteredDrives.map((drive) => (
                      <div
                        key={drive._id}
                        className="flex items-start p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleDriveSelection(drive._id)}
                      >
                        <Checkbox
                          checked={selectedDrives.includes(drive._id)}
                          onCheckedChange={() =>
                            handleDriveSelection(drive._id)
                          }
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{drive.label}</p>
                              {drive.systemName && (
                                <p className="text-sm text-muted-foreground">
                                  System Name: {drive.systemName}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">{drive.status}</Badge>
                          </div>
                          <div className="mt-1 text-sm">
                            <span className="text-muted-foreground">
                              {drive.type} • {drive.capacity.total} GB
                              {drive.capacity.used !== undefined &&
                                ` (${drive.capacity.used} GB used)`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "No hard drives match your search"
                          : "No available hard drives found"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/raw/${assetId}`)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={selectedDrives.length === 0 || saving}
                    className="flex items-center"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Add to Selected Drives{" "}
                    {selectedDrives.length > 0 && `(${selectedDrives.length})`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
