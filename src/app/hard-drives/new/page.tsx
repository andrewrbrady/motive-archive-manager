"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import { Loader2, HardDriveIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAPI } from "@/hooks/useAPI";

interface HardDriveData {
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
}

interface LocationOption {
  _id: string;
  name: string;
  type: string;
}

export default function NewHardDrivePage() {
  const router = useRouter();
  const api = useAPI();
  const [drive, setDrive] = useState<HardDriveData>({
    label: "",
    type: "HDD",
    interface: "USB",
    capacity: {
      total: 0,
    },
    status: "Available",
  });

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch locations on page load
  useEffect(() => {
    const fetchLocations = async () => {
      if (!api) {
        return;
      }

      try {
        const data = await api.get<any>("/locations");
        setLocations(data.locations || []);
      } catch (error) {
        console.error("Error fetching locations:", error);
        toast({
          title: "Warning",
          description: "Failed to load locations",
          variant: "destructive",
        });
      }
    };

    fetchLocations();
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create hard drives",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      await api.post("/hard-drives", drive);

      toast({
        title: "Success",
        description: "Hard drive created successfully",
      });

      // Navigate back to the hard drives list
      router.push("/hard-drives");
    } catch (error) {
      console.error("Error creating hard drive:", error);
      toast({
        title: "Error",
        description: "Failed to create hard drive",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (field.includes(".")) {
      // Handle nested properties like capacity.total
      const [parent, child] = field.split(".");
      setDrive((prev) => {
        // Create a properly typed copy of the nested object
        if (parent === "capacity") {
          return {
            ...prev,
            capacity: {
              ...prev.capacity,
              [child]: value,
            },
          };
        }
        // For any future nested properties, add specific handling here
        return prev;
      });
    } else {
      // Handle top-level properties
      setDrive((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleBack = () => {
    router.push("/production");
  };

  if (!api) {
    return (
      <div className="container mx-auto p-6">
        <Navbar />
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">
            Authentication Required
          </h1>
          <p className="text-muted-foreground">
            Please log in to create hard drives
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mt-8 mb-4">
          <Button variant="outline" onClick={handleBack} className="mb-4">
            &larr; Back to Production
          </Button>

          <div className="bg-[hsl(var(--background-secondary))] rounded-lg p-6">
            <div className="flex flex-col space-y-8">
              {/* Page Header */}
              <div className="flex items-center gap-3">
                <HardDriveIcon className="w-6 h-6" />
                <h1 className="text-2xl font-semibold">Add New Hard Drive</h1>
              </div>

              {/* Add Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Label
                      </label>
                      <Input
                        value={drive.label}
                        onChange={(e) =>
                          handleFieldChange("label", e.target.value)
                        }
                        required
                        placeholder="Enter a label for this drive"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        System Name (Optional)
                      </label>
                      <Input
                        value={drive.systemName || ""}
                        onChange={(e) =>
                          handleFieldChange("systemName", e.target.value)
                        }
                        placeholder="System identifier for this drive"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Type
                      </label>
                      <Select
                        value={drive.type}
                        onValueChange={(value) =>
                          handleFieldChange("type", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select drive type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HDD">HDD</SelectItem>
                          <SelectItem value="SSD">SSD</SelectItem>
                          <SelectItem value="NVME">NVME</SelectItem>
                          <SelectItem value="USB">USB Flash Drive</SelectItem>
                          <SelectItem value="SD">SD Card</SelectItem>
                          <SelectItem value="CF">CF Card</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Interface
                      </label>
                      <Select
                        value={drive.interface}
                        onValueChange={(value) =>
                          handleFieldChange("interface", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select interface type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USB">USB</SelectItem>
                          <SelectItem value="SATA">SATA</SelectItem>
                          <SelectItem value="SAS">SAS</SelectItem>
                          <SelectItem value="PCIE">PCIe</SelectItem>
                          <SelectItem value="Thunderbolt">
                            Thunderbolt
                          </SelectItem>
                          <SelectItem value="FireWire">FireWire</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Total Capacity (GB)
                      </label>
                      <Input
                        type="number"
                        value={drive.capacity.total}
                        onChange={(e) =>
                          handleFieldChange(
                            "capacity.total",
                            Number(e.target.value)
                          )
                        }
                        required
                        min={0}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Used Capacity (GB) (Optional)
                      </label>
                      <Input
                        type="number"
                        value={drive.capacity.used || ""}
                        onChange={(e) => {
                          const value = e.target.value
                            ? Number(e.target.value)
                            : undefined;
                          handleFieldChange("capacity.used", value);
                        }}
                        min={0}
                        max={drive.capacity.total}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Status
                      </label>
                      <Select
                        value={drive.status}
                        onValueChange={(value) =>
                          handleFieldChange("status", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="In Use">In Use</SelectItem>
                          <SelectItem value="Reserved">Reserved</SelectItem>
                          <SelectItem value="Faulty">Faulty</SelectItem>
                          <SelectItem value="Archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Location (Optional)
                      </label>
                      <Select
                        value={drive.location || ""}
                        onValueChange={(value) =>
                          handleFieldChange("location", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Location</SelectItem>
                          {locations.map((location) => (
                            <SelectItem key={location._id} value={location._id}>
                              {location.name} ({location.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes (Optional)
                  </label>
                  <Textarea
                    value={drive.notes || ""}
                    onChange={(e) => handleFieldChange("notes", e.target.value)}
                    placeholder="Add any additional notes about this drive"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex items-center"
                  >
                    {saving && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    <SaveIcon className="w-4 h-4 mr-2" />
                    Create Hard Drive
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
}
