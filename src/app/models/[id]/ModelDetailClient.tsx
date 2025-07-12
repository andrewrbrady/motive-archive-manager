"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { VehicleModelClient } from "@/types/model";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Calendar,
  Car,
  Zap,
  Settings,
  DollarSign,
  Gauge,
  Fuel,
  Award,
  Package,
  Info,
} from "lucide-react";
import EditModelDialog from "@/components/models/EditModelDialog";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "sonner";

interface ModelDetailClientProps {
  model: VehicleModelClient;
}

export default function ModelDetailClient({ model }: ModelDetailClientProps) {
  const router = useRouter();
  const api = useAPI();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState(model);

  const handleEdit = async (updatedModel: Partial<VehicleModelClient>) => {
    if (!api) {
      toast.error("API not available");
      return;
    }

    try {
      const result = await api.models.update(currentModel._id, updatedModel);
      setCurrentModel(result as VehicleModelClient);
      setIsEditDialogOpen(false);
      toast.success("Model updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating model:", error);
      toast.error("Failed to update model");
    }
  };

  const formatYearRange = (yearRange?: { start: number; end?: number }) => {
    if (!yearRange) return "N/A";
    if (!yearRange.end) return `${yearRange.start}-Present`;
    return `${yearRange.start}-${yearRange.end}`;
  };

  const formatPrice = (price?: {
    min: number;
    max: number;
    currency: string;
  }) => {
    if (!price) return "N/A";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (price.min === price.max) {
      return formatter.format(price.min);
    }
    return `${formatter.format(price.min)} - ${formatter.format(price.max)}`;
  };

  const formatPower = (power?: { hp: number; kW: number }) => {
    if (!power) return "N/A";
    return `${power.hp} HP (${power.kW} kW)`;
  };

  const formatTorque = (torque?: { value: number; unit: string }) => {
    if (!torque) return "N/A";
    return `${torque.value} ${torque.unit}`;
  };

  const formatDisplacement = (displacement?: {
    value: number;
    unit: string;
  }) => {
    if (!displacement) return "N/A";
    return `${displacement.value} ${displacement.unit}`;
  };

  const formatAcceleration = (acceleration?: {
    "0_to_60"?: { value: number; unit: string };
  }) => {
    if (!acceleration?.["0_to_60"]) return "N/A";
    return `${acceleration["0_to_60"].value} ${acceleration["0_to_60"].unit}`;
  };

  const formatTopSpeed = (topSpeed?: { value: number; unit: string }) => {
    if (!topSpeed) return "N/A";
    return `${topSpeed.value} ${topSpeed.unit}`;
  };

  const formatFuelEconomy = (fuelEconomy?: {
    city_mpg?: number;
    highway_mpg?: number;
    combined_mpg?: number;
  }) => {
    if (!fuelEconomy) return "N/A";
    const parts = [];
    if (fuelEconomy.city_mpg) parts.push(`City: ${fuelEconomy.city_mpg} MPG`);
    if (fuelEconomy.highway_mpg)
      parts.push(`Highway: ${fuelEconomy.highway_mpg} MPG`);
    if (fuelEconomy.combined_mpg)
      parts.push(`Combined: ${fuelEconomy.combined_mpg} MPG`);
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/models")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Models
              </Button>
              <PageTitle title={`${currentModel.make} ${currentModel.model}`}>
                <div className="flex items-center gap-2">
                  {currentModel.generation?.code && (
                    <Badge variant="secondary" className="text-sm">
                      {currentModel.generation.code}
                    </Badge>
                  )}
                  {currentModel.market_segment && (
                    <Badge variant="outline" className="text-sm">
                      {currentModel.market_segment}
                    </Badge>
                  )}
                </div>
              </PageTitle>
            </div>
            <Button onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Model
            </Button>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                    Make & Model
                  </h4>
                  <p className="text-lg font-medium">
                    {currentModel.make} {currentModel.model}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                    Generation
                  </h4>
                  <p className="text-lg">
                    {currentModel.generation?.code || "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                    Production Years
                  </h4>
                  <p className="text-lg">
                    {formatYearRange(currentModel.generation?.year_range)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                    Market Segment
                  </h4>
                  <p className="text-lg">
                    {currentModel.market_segment || "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                    Body Styles
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {currentModel.generation?.body_styles?.map((style) => (
                      <Badge
                        key={style}
                        variant="secondary"
                        className="text-xs"
                      >
                        {style}
                      </Badge>
                    )) || (
                      <span className="text-muted-foreground">
                        None specified
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {currentModel.description && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                      Description
                    </h4>
                    <p className="text-sm leading-relaxed">
                      {currentModel.description}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="engines" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="engines">Engines</TabsTrigger>
              <TabsTrigger value="trims">Trims</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            {/* Engines Tab */}
            <TabsContent value="engines" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Engine Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentModel.engine_options &&
                  currentModel.engine_options.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {currentModel.engine_options.map((engine, index) => (
                        <Card
                          key={engine.id || index}
                          className="border-l-4 border-l-blue-500"
                        >
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {engine.id || `Engine ${index + 1}`}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Type
                                </h5>
                                <p>{engine.type || "N/A"}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Displacement
                                </h5>
                                <p>{formatDisplacement(engine.displacement)}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Power
                                </h5>
                                <p>{formatPower(engine.power)}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Torque
                                </h5>
                                <p>{formatTorque(engine.torque)}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Fuel Type
                                </h5>
                                <p>{engine.fuel_type || "N/A"}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Aspiration
                                </h5>
                                <p>{engine.aspiration || "N/A"}</p>
                              </div>
                              {engine.configuration && (
                                <div>
                                  <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                    Configuration
                                  </h5>
                                  <p>{engine.configuration}</p>
                                </div>
                              )}
                              {engine.valve_configuration && (
                                <div>
                                  <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                    Valve Configuration
                                  </h5>
                                  <p>{engine.valve_configuration}</p>
                                </div>
                              )}
                              {engine.compression_ratio && (
                                <div>
                                  <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                    Compression Ratio
                                  </h5>
                                  <p>{engine.compression_ratio}:1</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No engine information available</p>
                      <p className="text-sm">
                        Use batch import to add detailed engine specifications
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trims Tab */}
            <TabsContent value="trims" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Trim Levels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentModel.generation?.trims &&
                  currentModel.generation.trims.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {currentModel.generation.trims.map((trim, index) => (
                        <Card
                          key={index}
                          className="border-l-4 border-l-green-500"
                        >
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {trim.name || `Trim ${index + 1}`}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Basic Trim Info */}
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Production Years
                                </h5>
                                <p>{formatYearRange(trim.year_range)}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Engine
                                </h5>
                                <p>{trim.engine || "N/A"}</p>
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Transmission
                                </h5>
                                <div className="flex flex-wrap gap-1">
                                  {trim.transmission?.map((trans) => (
                                    <Badge
                                      key={trans}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {trans}
                                    </Badge>
                                  )) || (
                                    <span className="text-muted-foreground">
                                      N/A
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm text-muted-foreground mb-1">
                                  Drivetrain
                                </h5>
                                <div className="flex flex-wrap gap-1">
                                  {trim.drivetrain?.map((drive) => (
                                    <Badge
                                      key={drive}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {drive}
                                    </Badge>
                                  )) || (
                                    <span className="text-muted-foreground">
                                      N/A
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Performance & Specs */}
                            <div className="space-y-4">
                              {/* Performance */}
                              <div>
                                <h5 className="font-semibold mb-3 flex items-center gap-2">
                                  <Gauge className="h-4 w-4" />
                                  Performance
                                </h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                      Horsepower:
                                    </span>
                                    <span className="text-sm">
                                      {trim.performance?.hp || "N/A"} HP
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                      Torque:
                                    </span>
                                    <span className="text-sm">
                                      {formatTorque(trim.performance?.torque)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                      0-60 mph:
                                    </span>
                                    <span className="text-sm">
                                      {formatAcceleration(
                                        trim.performance?.acceleration
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                      Top Speed:
                                    </span>
                                    <span className="text-sm">
                                      {formatTopSpeed(
                                        trim.performance?.top_speed
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Pricing */}
                              <div>
                                <h5 className="font-semibold mb-3 flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  Pricing
                                </h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                      MSRP:
                                    </span>
                                    <span className="text-sm">
                                      {formatPrice(trim.price_range?.msrp)}
                                    </span>
                                  </div>
                                  {trim.price_range?.current_market && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">
                                        Current Market:
                                      </span>
                                      <span className="text-sm">
                                        {formatPrice(
                                          trim.price_range.current_market
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Fuel Economy */}
                            {trim.fuel_economy && (
                              <>
                                <Separator />
                                <div>
                                  <h5 className="font-semibold mb-3 flex items-center gap-2">
                                    <Fuel className="h-4 w-4" />
                                    Fuel Economy
                                  </h5>
                                  <p className="text-sm">
                                    {formatFuelEconomy(trim.fuel_economy)}
                                  </p>
                                </div>
                              </>
                            )}

                            {/* Standard Features */}
                            {trim.standard_features &&
                              trim.standard_features.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h5 className="font-semibold mb-3 flex items-center gap-2">
                                      <Award className="h-4 w-4" />
                                      Standard Features
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                      {trim.standard_features.map(
                                        (feature, featureIndex) => (
                                          <Badge
                                            key={featureIndex}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {feature}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}

                            {/* Optional Packages */}
                            {trim.optional_packages &&
                              trim.optional_packages.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h5 className="font-semibold mb-3 flex items-center gap-2">
                                      <Package className="h-4 w-4" />
                                      Optional Packages
                                    </h5>
                                    <div className="space-y-2">
                                      {trim.optional_packages.map(
                                        (pkg, pkgIndex) => (
                                          <div
                                            key={pkgIndex}
                                            className="border rounded-lg p-3"
                                          >
                                            <div className="flex justify-between items-start mb-2">
                                              <h6 className="font-medium">
                                                {pkg.name}
                                              </h6>
                                              {pkg.price && (
                                                <span className="text-sm text-muted-foreground">
                                                  {new Intl.NumberFormat(
                                                    "en-US",
                                                    {
                                                      style: "currency",
                                                      currency:
                                                        pkg.price.currency ||
                                                        "USD",
                                                    }
                                                  ).format(pkg.price.value)}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {pkg.features.map(
                                                (feature, featureIndex) => (
                                                  <Badge
                                                    key={featureIndex}
                                                    variant="outline"
                                                    className="text-xs"
                                                  >
                                                    {feature}
                                                  </Badge>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No trim information available</p>
                      <p className="text-sm">
                        Use batch import to add detailed trim specifications
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metadata Tab */}
            <TabsContent value="metadata" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                        Model ID
                      </h4>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {currentModel._id}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                        Created
                      </h4>
                      <p className="text-sm">
                        {new Date(currentModel.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                        Last Updated
                      </h4>
                      <p className="text-sm">
                        {new Date(currentModel.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                        Status
                      </h4>
                      <Badge
                        variant={
                          currentModel.active ? "default" : "destructive"
                        }
                      >
                        {currentModel.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {currentModel.tags && currentModel.tags.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                          Tags
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {currentModel.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <EditModelDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          model={currentModel}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
