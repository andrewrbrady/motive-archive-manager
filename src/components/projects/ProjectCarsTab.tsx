"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Car, MoreHorizontal, Search } from "lucide-react";
import { format } from "date-fns";
import { Project } from "@/types/project";
import { toast } from "@/components/ui/use-toast";

interface Car {
  _id: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  status: string;
  primaryImageId?: string;
  imageIds?: string[];
  createdAt: string;
}

interface ProjectCarsTabProps {
  project: Project;
  onProjectUpdate: () => void;
}

export function ProjectCarsTab({
  project,
  onProjectUpdate,
}: ProjectCarsTabProps) {
  const [isLinkCarOpen, setIsLinkCarOpen] = useState(false);
  const [projectCars, setProjectCars] = useState<Car[]>([]);
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [loadingProjectCars, setLoadingProjectCars] = useState(false);
  const [loadingAvailableCars, setLoadingAvailableCars] = useState(false);
  const [isLinkingCar, setIsLinkingCar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch project cars on mount and when project changes
  useEffect(() => {
    if (project) {
      fetchProjectCars();
    }
  }, [project]);

  const fetchProjectCars = async () => {
    try {
      setLoadingProjectCars(true);
      const response = await fetch(`/api/projects/${project._id}/cars`);

      if (!response.ok) {
        throw new Error("Failed to fetch project cars");
      }

      const data = await response.json();
      setProjectCars(data.cars || []);
    } catch (error) {
      console.error("Error fetching project cars:", error);
      toast({
        title: "Error",
        description: "Failed to load project cars",
        variant: "destructive",
      });
    } finally {
      setLoadingProjectCars(false);
    }
  };

  const fetchAvailableCars = async () => {
    try {
      setLoadingAvailableCars(true);
      const response = await fetch(
        "/api/cars?fields=_id,make,model,year,color,vin,status,createdAt"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch available cars");
      }

      const data = await response.json();

      // Filter out cars that are already linked to this project
      const currentCarIds = project?.carIds || [];
      const availableCarsList = (data.cars || []).filter(
        (car: Car) => !currentCarIds.includes(car._id)
      );

      setAvailableCars(availableCarsList);
    } catch (error) {
      console.error("Error fetching available cars:", error);
      toast({
        title: "Error",
        description: "Failed to load available cars",
        variant: "destructive",
      });
    } finally {
      setLoadingAvailableCars(false);
    }
  };

  const handleLinkCar = async (carId: string) => {
    try {
      setIsLinkingCar(true);
      const response = await fetch(`/api/projects/${project._id}/cars`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ carId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to link car");
      }

      // Refresh project data and cars
      await onProjectUpdate();
      await fetchProjectCars();
      await fetchAvailableCars();

      toast({
        title: "Success",
        description: "Car linked to project successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to link car",
        variant: "destructive",
      });
    } finally {
      setIsLinkingCar(false);
    }
  };

  const handleUnlinkCar = async (carId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${project._id}/cars?carId=${carId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to unlink car");
      }

      // Refresh project data and cars
      await onProjectUpdate();
      await fetchProjectCars();

      toast({
        title: "Success",
        description: "Car unlinked from project successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to unlink car",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "sold":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCarName = (car: Car) => {
    const parts = [car.year, car.make, car.model].filter(Boolean);
    return parts.join(" ");
  };

  // Filter available cars based on search term
  const filteredAvailableCars = availableCars.filter((car) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      car.make?.toLowerCase().includes(searchLower) ||
      car.model?.toLowerCase().includes(searchLower) ||
      car.year?.toString().includes(searchLower) ||
      car.color?.toLowerCase().includes(searchLower) ||
      car.vin?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Project Cars</CardTitle>
          <Dialog
            open={isLinkCarOpen}
            onOpenChange={(open) => {
              setIsLinkCarOpen(open);
              if (open) {
                fetchAvailableCars();
              } else {
                setSearchTerm("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Link Car
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Link Car to Project</DialogTitle>
                <DialogDescription>
                  Select an existing car to link to this project.
                </DialogDescription>
              </DialogHeader>

              {/* Search */}
              <div className="flex items-center gap-2 py-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cars by make, model, year, color, or VIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingAvailableCars ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">
                      Loading cars...
                    </div>
                  </div>
                ) : filteredAvailableCars.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      {searchTerm ? "No cars found" : "No available cars"}
                    </p>
                    <p className="text-sm">
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : "All cars are already linked to this project"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAvailableCars.map((car) => (
                      <div
                        key={car._id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🚗</div>
                          <div className="flex-1">
                            <div className="font-medium">
                              {formatCarName(car)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {car.color && <span>{car.color}</span>}
                              {car.vin && (
                                <span>
                                  {car.color ? " • " : ""}VIN: {car.vin}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Added{" "}
                              {format(new Date(car.createdAt), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(car.status)}>
                            {car.status}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleLinkCar(car._id)}
                            disabled={isLinkingCar}
                          >
                            {isLinkingCar ? "Linking..." : "Link"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setIsLinkCarOpen(false);
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loadingProjectCars ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">
              Loading project cars...
            </div>
          </div>
        ) : projectCars.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No cars linked yet</p>
            <p className="text-sm">
              Link existing cars to this project to track them
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projectCars.map((car) => (
              <div
                key={car._id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🚗</div>
                  <div className="flex-1">
                    <div className="font-medium">{formatCarName(car)}</div>
                    <div className="text-sm text-muted-foreground">
                      {car.color && <span>{car.color}</span>}
                      {car.vin && (
                        <span>
                          {car.color ? " • " : ""}VIN: {car.vin}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Added {format(new Date(car.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(car.status)}>
                    {car.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Car Details</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUnlinkCar(car._id)}
                        className="text-red-600"
                      >
                        Unlink from Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
