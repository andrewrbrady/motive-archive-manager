"use client";

import { useState, useEffect, useCallback } from "react";
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
import Image from "next/image";
import Link from "next/link";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import { LoadingSpinner } from "@/components/ui/loading";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { CarGridSelector } from "../cars/CarGridSelector";
import { useAPI } from "@/hooks/useAPI";

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
  images?: Array<{
    _id: string;
    url: string;
    metadata?: {
      isPrimary?: boolean;
    };
  }>;
  createdAt: string;
}

interface ProjectCarsTabProps {
  project: Project;
  onProjectUpdate: () => void;
  initialCars?: Car[]; // Optional pre-fetched cars data for SSR optimization
}

// Car Card Component for Project Cars
function ProjectCarCard({
  car,
  onUnlink,
}: {
  car: Car;
  onUnlink: (carId: string) => void;
}) {
  const api = useAPI();
  const [primaryImage, setPrimaryImage] = useState<{
    id?: string;
    url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findPrimaryImage = () => {
      setLoading(true);

      // Case 1: We have an array of images
      if (car.images && Array.isArray(car.images) && car.images.length > 0) {
        // Try to find the image marked as primary first
        const primaryImg = car.images.find(
          (img) =>
            img.metadata?.isPrimary ||
            (car.primaryImageId && img._id === car.primaryImageId)
        );

        // Use primary image if found, otherwise use first image
        const imageToUse = primaryImg || car.images[0];

        setPrimaryImage({
          id: imageToUse._id,
          url: fixCloudflareImageUrl(imageToUse.url),
        });

        setLoading(false);
        return;
      }

      // Case 2: We have image IDs but no loaded images
      if (car.imageIds?.length && car.primaryImageId && api) {
        // Fetch the primary image using authenticated API
        const fetchImage = async () => {
          try {
            const imageData = (await api.get(
              `images/${car.primaryImageId}`
            )) as any;
            setPrimaryImage({
              id: imageData._id,
              url: fixCloudflareImageUrl(imageData.url),
            });
          } catch (error) {
            // If primary image fetch fails, try the first image
            if (
              car.imageIds &&
              car.imageIds.length > 0 &&
              car.imageIds[0] !== car.primaryImageId
            ) {
              try {
                const fallbackImageData = (await api.get(
                  `images/${car.imageIds[0]}`
                )) as any;
                setPrimaryImage({
                  id: fallbackImageData._id,
                  url: fixCloudflareImageUrl(fallbackImageData.url),
                });
              } catch (fallbackError) {
                console.error("Error fetching fallback image:", fallbackError);
                setPrimaryImage(null);
              }
            } else {
              setPrimaryImage(null);
            }
          } finally {
            setLoading(false);
          }
        };

        fetchImage();
        return;
      }

      // No images available
      setLoading(false);
      setPrimaryImage(null);
    };

    findPrimaryImage();
  }, [car._id, car.imageIds, car.images, car.primaryImageId, api]);

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

  const generateCarTitle = () => {
    return [
      car.year ? car.year : null,
      car.make ? car.make : null,
      car.model ? car.model : null,
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div className="bg-background rounded-lg border border-border-primary overflow-hidden hover:border-border-secondary transition-colors relative group">
      {/* Image */}
      <div className="relative aspect-[16/9]">
        {loading ? (
          <div className="w-full h-full bg-background-primary/50 flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="lg" />
          </div>
        ) : primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={generateCarTitle()}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        ) : (
          <div className="w-full h-full bg-black/10 dark:bg-black/40 flex items-center justify-center">
            <div className="flex items-center gap-4 px-6">
              <MotiveLogo className="w-12 h-12 text-text-primary fill-current" />
              <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                No Image
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions Menu - Absolutely positioned */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-background/90 hover:bg-background border border-border/20 hover:border-border/30"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/cars/${car._id}`}>View Car Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUnlink(car._id)}
              className="text-red-600"
            >
              Unlink from Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Car Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {generateCarTitle()}
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {car.color && (
            <p className="text-sm text-text-secondary">
              <span className="font-medium">Color:</span> {car.color}
            </p>
          )}
          {car.vin && (
            <p className="text-sm text-text-secondary">
              <span className="font-medium">VIN:</span> {car.vin}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectCarsTab({
  project,
  onProjectUpdate,
  initialCars,
}: ProjectCarsTabProps) {
  const api = useAPI();
  const [projectCars, setProjectCars] = useState<Car[]>(initialCars || []);
  const [loadingProjectCars, setLoadingProjectCars] = useState(!initialCars); // Don't show loading if we have initial data
  const [isLinkCarOpen, setIsLinkCarOpen] = useState(false);
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [isLinkingCar, setIsLinkingCar] = useState(false);

  const fetchProjectCars = useCallback(async () => {
    try {
      setLoadingProjectCars(true);
      console.time("ProjectCarsTab-fetchProjectCars");

      if (!api) {
        console.log("ProjectCarsTab: No API available for fetchProjectCars");
        throw new Error("No authenticated API found");
      }

      const data = (await api.get(`projects/${project._id}/cars`)) as {
        cars?: Car[];
      };
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
      console.timeEnd("ProjectCarsTab-fetchProjectCars");
    }
  }, [api, project._id]);

  // Fetch project cars on component mount and when project changes - only if no initial data
  useEffect(() => {
    if (api && project._id && !initialCars) {
      fetchProjectCars();
    }
  }, [fetchProjectCars, api, project._id, initialCars]);

  const handleLinkCars = async () => {
    if (selectedCarIds.length === 0) {
      toast({
        title: "No cars selected",
        description: "Please select at least one car to link",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLinkingCar(true);

      if (!api) {
        console.log("ProjectCarsTab: No API available for handleLinkCars");
        throw new Error("No authenticated API found");
      }

      // Link cars one by one (could be optimized with a batch endpoint)
      for (const carId of selectedCarIds) {
        await api.post(`projects/${project._id}/cars`, { carId });
      }

      // Refresh project data and cars
      await onProjectUpdate();
      await fetchProjectCars();
      setSelectedCarIds([]);
      setIsLinkCarOpen(false);

      toast({
        title: "Success",
        description: `${selectedCarIds.length} car${selectedCarIds.length !== 1 ? "s" : ""} linked to project successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to link cars",
        variant: "destructive",
      });
    } finally {
      setIsLinkingCar(false);
    }
  };

  const handleUnlinkCar = async (carId: string) => {
    try {
      if (!api) {
        console.log("ProjectCarsTab: No API available for handleUnlinkCar");
        throw new Error("No authenticated API found");
      }

      await api.delete(`projects/${project._id}/cars?carId=${carId}`);

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

  // Get currently linked car IDs to exclude from selection
  const linkedCarIds = project?.carIds || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Project Cars</CardTitle>
          <Dialog
            open={isLinkCarOpen}
            onOpenChange={(open) => {
              setIsLinkCarOpen(open);
              if (!open) {
                setSelectedCarIds([]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" disabled={!api}>
                <Plus className="h-4 w-4 mr-2" />
                Link Cars
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Link Cars to Project</DialogTitle>
                <DialogDescription>
                  Select cars to link to this project. Use the filters to find
                  specific cars.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto">
                <CarGridSelector
                  selectionMode="multiple"
                  selectedCarIds={selectedCarIds}
                  onCarsSelect={setSelectedCarIds}
                  excludeCarIds={linkedCarIds}
                  showFilters={true}
                  showPagination={true}
                  pageSize={12}
                  gridClassName="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                />
              </div>

              <DialogFooter className="flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCarIds([]);
                    setIsLinkCarOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLinkCars}
                  disabled={isLinkingCar || selectedCarIds.length === 0 || !api}
                >
                  {isLinkingCar ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Linking...
                    </>
                  ) : (
                    `Link ${selectedCarIds.length} Car${selectedCarIds.length !== 1 ? "s" : ""}`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!api ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" />
          </div>
        ) : loadingProjectCars ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectCars.map((car) => (
              <ProjectCarCard
                key={car._id}
                car={car}
                onUnlink={handleUnlinkCar}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
