"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Navbar from "@/components/layout/navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Deliverable } from "@/types/deliverable";
import { Car } from "@/types/car";
import { CarAvatar } from "@/components/ui/CarAvatar";
import { StatusSelector } from "@/components/deliverables/StatusSelector";
import { DeliverableStatus } from "@/types/deliverable";
import { toast } from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface DeliverableResponse {
  deliverables: (Deliverable & { car?: Car })[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface GroupedDeliverables {
  [carId: string]: {
    car: Car;
    deliverables: (Deliverable & { car?: Car })[];
  };
}

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <DashboardContent />
    </>
  );
}

function DashboardContent() {
  return (
    <AuthGuard>
      <DashboardInner />
    </AuthGuard>
  );
}

function DashboardInner() {
  const { data: session } = useSession();
  const [deliverables, setDeliverables] = useState<
    (Deliverable & { car?: Car })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchUserDeliverables = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const url = new URL("/api/deliverables", window.location.origin);
      url.searchParams.append("firebase_uid", session.user.id);
      url.searchParams.append("sortField", "edit_deadline");
      url.searchParams.append("sortDirection", "asc");

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(
          `Failed to fetch deliverables: ${response.status} ${response.statusText}`
        );
      }

      const data: DeliverableResponse = await response.json();
      setDeliverables(data.deliverables);
    } catch (error) {
      console.error("Error in fetchUserDeliverables:", error);
      toast.error("Failed to load deliverables. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserDeliverables();
    }
  }, [session?.user?.id, refreshTrigger]);

  const handleStatusChange = (
    deliverableId: string,
    newStatus: DeliverableStatus
  ) => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const getInitials = () => {
    if (!session?.user?.name) return "U";
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const groupDeliverablesByCar = (
    deliverables: (Deliverable & { car?: Car })[]
  ): GroupedDeliverables => {
    return deliverables.reduce((acc, deliverable) => {
      if (!deliverable.car) return acc;
      const carId = String(deliverable.car._id);

      if (!acc[carId]) {
        acc[carId] = {
          car: deliverable.car,
          deliverables: [],
        };
      }
      acc[carId].deliverables.push(deliverable);
      return acc;
    }, {} as GroupedDeliverables);
  };

  if (!session?.user) {
    return null;
  }

  const groupedActiveDeliverables = groupDeliverablesByCar(
    deliverables.filter((d) => d.status !== "done")
  );

  const groupedCompletedDeliverables = groupDeliverablesByCar(
    deliverables.filter((d) => d.status === "done")
  );

  return (
    <div className="container mx-auto px-2 max-w-7xl pt-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Profile Section */}
        <Card className="md:col-span-1 h-fit border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 p-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={session.user.profileImage || session.user.image || ""}
                  alt={session.user.name || "User"}
                />
                <AvatarFallback className="text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base leading-none">
                  {session.user.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {session.user.email}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {session.user.roles?.map((role) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="text-[10px] px-1 py-0"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Deliverables Section */}
        <div className="md:col-span-3">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-8 mb-0 bg-transparent p-0">
              <TabsTrigger
                value="active"
                className="text-xs px-3 data-[state=active]:bg-transparent"
              >
                Active
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="text-xs px-3 data-[state=active]:bg-transparent"
              >
                Completed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-2">
              <div className="space-y-4">
                {Object.entries(groupedActiveDeliverables).map(
                  ([carId, { car, deliverables }]) => (
                    <div
                      key={carId}
                      className="rounded-md border border-border overflow-hidden"
                    >
                      {/* Car Header */}
                      <div className="py-3 px-3 border-b border-border">
                        <div className="flex items-center gap-3">
                          <Link href={`/cars/${car.id}`}>
                            <CarAvatar
                              primaryImageId={car.primaryImageId}
                              entityName={`${car.year} ${car.make} ${car.model}`}
                              size="md"
                            />
                          </Link>
                          <div>
                            <p className="text-base font-medium">
                              {car.year} {car.make} {car.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {deliverables.length} active deliverable
                              {deliverables.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Deliverables Table */}
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="py-1.5 pl-6 pr-2 text-xs font-medium">
                              Title
                            </TableHead>
                            <TableHead className="py-1.5 px-2 text-xs font-medium">
                              Platform
                            </TableHead>
                            <TableHead className="py-1.5 px-2 text-xs font-medium">
                              Type
                            </TableHead>
                            <TableHead className="py-1.5 px-2 text-xs font-medium whitespace-nowrap">
                              Edit Deadline
                            </TableHead>
                            <TableHead className="w-[90px] py-1.5 pl-2 pr-3 text-right text-xs font-medium">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deliverables.map((deliverable) => (
                            <TableRow
                              key={deliverable._id?.toString()}
                              className="hover:bg-muted/50"
                            >
                              <TableCell className="py-1.5 pl-6 pr-2 text-sm font-medium">
                                {deliverable.title}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-xs">
                                {deliverable.platform}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-xs whitespace-nowrap">
                                {deliverable.type}
                                {deliverable.duration &&
                                  ` • ${deliverable.duration}s`}
                                {deliverable.aspect_ratio &&
                                  ` • ${deliverable.aspect_ratio}`}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-xs whitespace-nowrap">
                                {new Date(
                                  deliverable.edit_deadline
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="py-1.5 pl-2 pr-3 text-right">
                                <StatusSelector
                                  deliverableId={
                                    deliverable._id?.toString() || ""
                                  }
                                  initialStatus={deliverable.status}
                                  onStatusChange={(newStatus) =>
                                    handleStatusChange(
                                      deliverable._id?.toString() || "",
                                      newStatus
                                    )
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-2">
              <div className="space-y-4">
                {Object.entries(groupedCompletedDeliverables).map(
                  ([carId, { car, deliverables }]) => (
                    <div
                      key={carId}
                      className="rounded-md border border-border overflow-hidden"
                    >
                      {/* Car Header */}
                      <div className="py-3 px-3 border-b border-border">
                        <div className="flex items-center gap-3">
                          <Link href={`/cars/${car.id}`}>
                            <CarAvatar
                              primaryImageId={car.primaryImageId}
                              entityName={`${car.year} ${car.make} ${car.model}`}
                              size="md"
                            />
                          </Link>
                          <div>
                            <p className="text-base font-medium">
                              {car.year} {car.make} {car.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {deliverables.length} completed deliverable
                              {deliverables.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Deliverables Table */}
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="py-1.5 pl-6 pr-2 text-xs font-medium">
                              Title
                            </TableHead>
                            <TableHead className="py-1.5 px-2 text-xs font-medium">
                              Platform
                            </TableHead>
                            <TableHead className="py-1.5 px-2 text-xs font-medium">
                              Type
                            </TableHead>
                            <TableHead className="py-1.5 px-2 text-xs font-medium whitespace-nowrap">
                              Edit Deadline
                            </TableHead>
                            <TableHead className="w-[90px] py-1.5 pl-2 pr-3 text-right text-xs font-medium">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deliverables.map((deliverable) => (
                            <TableRow
                              key={deliverable._id?.toString()}
                              className="hover:bg-muted/50"
                            >
                              <TableCell className="py-1.5 pl-6 pr-2 text-sm font-medium">
                                {deliverable.title}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-xs">
                                {deliverable.platform}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-xs whitespace-nowrap">
                                {deliverable.type}
                                {deliverable.duration &&
                                  ` • ${deliverable.duration}s`}
                                {deliverable.aspect_ratio &&
                                  ` • ${deliverable.aspect_ratio}`}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-xs whitespace-nowrap">
                                {new Date(
                                  deliverable.edit_deadline
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="py-1.5 pl-2 pr-3 text-right">
                                <StatusSelector
                                  deliverableId={
                                    deliverable._id?.toString() || ""
                                  }
                                  initialStatus={deliverable.status}
                                  onStatusChange={(newStatus) =>
                                    handleStatusChange(
                                      deliverable._id?.toString() || "",
                                      newStatus
                                    )
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
