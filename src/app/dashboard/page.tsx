"use client";

import { useSession } from "@/hooks/useFirebaseAuth";
import { useEffect, useState, useRef, useCallback } from "react";
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
import { Calendar, Clock } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { PlatformBadges } from "@/components/deliverables/PlatformBadges";
import { useAPI } from "@/hooks/useAPI";
import { useMediaTypes } from "@/hooks/useMediaTypes";

interface DeliverableResponse {
  deliverables: (Deliverable & { car?: Car })[];
  pagination: {
    // New pagination structure from Phase 3E optimization
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    // Legacy pagination support for backward compatibility
    total: number;
    page: number;
    limit: number;
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
  const api = useAPI();
  const { mediaTypes } = useMediaTypes();
  const [deliverables, setDeliverables] = useState<
    (Deliverable & { car?: Car })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ PHASE 4F: Session change debouncing to prevent excessive API calls
  const fetchDeliverablesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_MS = 300; // Wait 300ms after session changes before fetching

  const fetchUserDeliverables = async () => {
    if (!session?.user?.id) {
      console.log("Dashboard: No session user ID, skipping fetch");
      return;
    }

    if (!api) {
      console.log("Dashboard: API client not available yet, skipping fetch");
      return;
    }

    console.log(
      "Dashboard: fetchUserDeliverables called with user ID:",
      session.user.id
    );

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        firebase_uid: session.user.id,
        sortField: "updated_at",
        sortDirection: "desc",
        limit: "100",
      });

      console.log(
        "Dashboard: Fetching deliverables with params:",
        queryParams.toString()
      );

      const data: DeliverableResponse = await api.get(
        `/api/deliverables?${queryParams.toString()}`
      );

      console.log("Dashboard: API response structure:", {
        hasDeliverables: !!data.deliverables,
        deliverableCount: data.deliverables?.length || 0,
        hasPagination: !!data.pagination,
        paginationKeys: data.pagination ? Object.keys(data.pagination) : [],
        pagination: data.pagination,
      });

      // Validate response structure
      if (!data.deliverables) {
        console.warn(
          "Dashboard: No deliverables array in response, using empty array"
        );
        setDeliverables([]);
      } else {
        console.log(
          "Dashboard: Successfully loaded",
          data.deliverables.length,
          "deliverables"
        );
        console.log(
          "Dashboard: First deliverable sample:",
          data.deliverables[0]
        );
        setDeliverables(data.deliverables);
      }
    } catch (error) {
      console.error("Dashboard: Error in fetchUserDeliverables:", error);
      console.error(
        "Dashboard: Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );

      // Provide user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          toast.error("Authentication required. Please sign in again.");
        } else if (error.message.includes("403")) {
          toast.error(
            "Access denied. You may not have permission to view deliverables."
          );
        } else if (error.message.includes("500")) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(
            "Failed to load deliverables. Please try refreshing the page."
          );
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Clear any existing timeout
    if (fetchDeliverablesTimeoutRef.current) {
      clearTimeout(fetchDeliverablesTimeoutRef.current);
    }

    // ✅ PHASE 4F: Throttled useEffect logging (only log on state changes)
    const currentLogState = {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasSessionUserId: !!session?.user?.id,
      sessionUserId: session?.user?.id,
      hasAPI: !!api,
    };

    // Only log significant state changes
    if (session === null) {
      console.log(
        "Dashboard: Session is explicitly null (not loading), clearing deliverables"
      );
      setDeliverables([]);
      setIsLoading(false);
    } else if (!api) {
      console.log("Dashboard: API client not ready yet, waiting...");
      setIsLoading(true);
    } else if (session?.user?.id && api) {
      // ✅ PHASE 4F: Debounce API calls to prevent excessive requests
      console.log(
        "Dashboard: Session and API are ready, debouncing fetchUserDeliverables call"
      );

      fetchDeliverablesTimeoutRef.current = setTimeout(() => {
        console.log("Dashboard: Executing debounced fetchUserDeliverables");
        fetchUserDeliverables();
      }, DEBOUNCE_MS);
    } else {
      console.log(
        "Dashboard: Session is undefined (still loading), waiting..."
      );
      setIsLoading(true);
    }

    // Cleanup timeout on unmount
    return () => {
      if (fetchDeliverablesTimeoutRef.current) {
        clearTimeout(fetchDeliverablesTimeoutRef.current);
      }
    };
  }, [session?.user?.id, api]);

  const handleStatusChange = (
    deliverableId: string,
    newStatus: DeliverableStatus
  ) => {
    // Update the local state optimistically
    setDeliverables((prevDeliverables) =>
      prevDeliverables.map((deliverable) =>
        deliverable._id?.toString() === deliverableId
          ? { ...deliverable, status: newStatus }
          : deliverable
      )
    );
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

  if (!session?.user) {
    return null;
  }

  // Show loading state while API client is initializing
  if (!api) {
    return (
      <div className="container mx-auto px-2 max-w-7xl pt-12">
        <div className="flex justify-center py-8">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-muted-foreground">
              Initializing authentication...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const groupedActiveDeliverables = groupDeliverablesByCar(
    deliverables.filter((d) => d.status !== "done")
  );

  const groupedCompletedDeliverables = groupDeliverablesByCar(
    deliverables.filter((d) => d.status === "done")
  );

  return (
    <div className="container mx-auto px-2 max-w-7xl pt-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {/* Profile Section */}
        <Card className="lg:col-span-1 h-fit border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 p-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage
                  src={session.user.image || ""}
                  alt={session.user.name || "User"}
                />
                <AvatarFallback className="text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm md:text-base leading-none">
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
        <Card className="lg:col-span-3 border-0 shadow-none bg-transparent">
          <CardHeader className="px-0 pb-2">
            <CardTitle className="text-base">Your Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2 text-xs h-8">
                <TabsTrigger value="active" className="text-xs">
                  Active (
                  {deliverables.filter((d) => d.status !== "done").length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs">
                  Completed (
                  {deliverables.filter((d) => d.status === "done").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-2">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-muted-foreground">
                        Loading your deliverables...
                      </p>
                    </div>
                  </div>
                ) : Object.keys(groupedActiveDeliverables).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">
                      No active deliverables assigned to you.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check back later or contact your project manager.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedActiveDeliverables).map(
                      ([carId, { car, deliverables }]) => (
                        <div
                          key={carId}
                          className="rounded-md border border-border overflow-hidden"
                        >
                          {/* Car Header */}
                          <div className="py-2 px-3 border-b border-border">
                            <div className="flex items-center gap-2">
                              <Link href={`/cars/${car._id?.toString()}`}>
                                <CarAvatar
                                  primaryImageId={car.primaryImageId}
                                  entityName={`${car.year} ${car.make} ${car.model}`}
                                  size="sm"
                                />
                              </Link>
                              <div>
                                <p className="text-xs font-medium">
                                  {car.year} {car.make} {car.model}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {deliverables.length} active deliverable
                                  {deliverables.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Desktop Table View */}
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-b border-border/50">
                                  <TableHead className="text-xs py-2 pl-6 pr-2 w-[35%]">
                                    Title
                                  </TableHead>
                                  <TableHead className="text-xs py-2 px-2 w-[30%]">
                                    Platform & Type
                                  </TableHead>
                                  <TableHead className="text-xs py-2 px-2 w-[20%]">
                                    Deadline
                                  </TableHead>
                                  <TableHead className="text-xs py-2 px-2 w-[15%]">
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
                                    <TableCell className="w-[35%] py-1.5 pl-6 pr-2 text-xs font-medium">
                                      {deliverable.title}
                                    </TableCell>
                                    <TableCell className="w-[30%] py-1.5 px-2 text-xs">
                                      <div className="space-y-1">
                                        <PlatformBadges
                                          platform_id={deliverable.platform_id?.toString()}
                                          platform={deliverable.platform}
                                          platforms={deliverable.platforms}
                                          maxVisible={2}
                                          size="sm"
                                        />
                                        <div className="text-xs text-muted-foreground">
                                          {getMediaTypeName(deliverable)}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="w-[20%] py-1.5 px-2 text-xs whitespace-nowrap">
                                      {new Date(
                                        deliverable.edit_deadline
                                      ).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell
                                      className="w-[15%] py-1.5 px-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <StatusSelector
                                        deliverableId={
                                          deliverable._id?.toString() || ""
                                        }
                                        initialStatus={deliverable.status}
                                        size="sm"
                                        onStatusChange={async (newStatus) => {
                                          try {
                                            await api.put(
                                              `/api/deliverables/${deliverable._id}`,
                                              { status: newStatus }
                                            );
                                            // Refresh deliverables data
                                            fetchUserDeliverables();
                                            toast.success("Status updated");
                                          } catch (error) {
                                            console.error(
                                              "Failed to update status:",
                                              error
                                            );
                                            toast.error(
                                              "Failed to update status"
                                            );
                                          }
                                        }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile Card View */}
                          <div className="md:hidden space-y-2 p-3">
                            {deliverables.map((deliverable) => (
                              <div
                                key={deliverable._id?.toString()}
                                className="bg-muted/20 rounded-lg p-3 space-y-2"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {deliverable.title}
                                    </p>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <div>
                                        <PlatformBadges
                                          platform_id={deliverable.platform_id?.toString()}
                                          platform={deliverable.platform}
                                          platforms={deliverable.platforms}
                                          maxVisible={2}
                                          size="sm"
                                        />
                                      </div>
                                      <span>
                                        • {getMediaTypeName(deliverable)}
                                      </span>
                                    </div>
                                  </div>
                                  <StatusSelector
                                    deliverableId={
                                      deliverable._id?.toString() || ""
                                    }
                                    initialStatus={deliverable.status}
                                    size="sm"
                                    onStatusChange={async (newStatus) => {
                                      try {
                                        await api.put(
                                          `/api/deliverables/${deliverable._id}`,
                                          { status: newStatus }
                                        );
                                        // Refresh deliverables data
                                        fetchUserDeliverables();
                                        toast.success("Status updated");
                                      } catch (error) {
                                        console.error(
                                          "Failed to update status:",
                                          error
                                        );
                                        toast.error("Failed to update status");
                                      }
                                    }}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {new Date(
                                        deliverable.edit_deadline
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {deliverable.dropbox_link && (
                                    <a
                                      href={deliverable.dropbox_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Files
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-2">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-muted-foreground">
                        Loading your deliverables...
                      </p>
                    </div>
                  </div>
                ) : Object.keys(groupedCompletedDeliverables).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">
                      No completed deliverables.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed work will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedCompletedDeliverables).map(
                      ([carId, { car, deliverables }]) => (
                        <div
                          key={carId}
                          className="rounded-md border border-border overflow-hidden"
                        >
                          {/* Car Header */}
                          <div className="py-2 px-3 border-b border-border">
                            <div className="flex items-center gap-2">
                              <Link href={`/cars/${car._id?.toString()}`}>
                                <CarAvatar
                                  primaryImageId={car.primaryImageId}
                                  entityName={`${car.year} ${car.make} ${car.model}`}
                                  size="sm"
                                />
                              </Link>
                              <div>
                                <p className="text-xs font-medium">
                                  {car.year} {car.make} {car.model}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {deliverables.length} completed deliverable
                                  {deliverables.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Desktop Table View */}
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-b border-border/50">
                                  <TableHead className="text-xs py-2 pl-6 pr-2 w-[35%]">
                                    Title
                                  </TableHead>
                                  <TableHead className="text-xs py-2 px-2 w-[30%]">
                                    Platform & Type
                                  </TableHead>
                                  <TableHead className="text-xs py-2 px-2 w-[20%]">
                                    Release Date
                                  </TableHead>
                                  <TableHead className="text-xs py-2 px-2 w-[15%]">
                                    Links
                                  </TableHead>
                                </TableRow>
                              </TableHeader>

                              <TableBody>
                                {deliverables.map((deliverable) => (
                                  <TableRow
                                    key={deliverable._id?.toString()}
                                    className="hover:bg-muted/50"
                                  >
                                    <TableCell className="w-[35%] py-1.5 pl-6 pr-2 text-xs font-medium">
                                      {deliverable.title}
                                    </TableCell>
                                    <TableCell className="w-[30%] py-1.5 px-2 text-xs">
                                      <div className="space-y-1">
                                        <PlatformBadges
                                          platform_id={deliverable.platform_id?.toString()}
                                          platform={deliverable.platform}
                                          platforms={deliverable.platforms}
                                          maxVisible={2}
                                          size="sm"
                                        />
                                        <div className="text-xs text-muted-foreground">
                                          {getMediaTypeName(deliverable)}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="w-[20%] py-1.5 px-2 text-xs whitespace-nowrap">
                                      {deliverable.release_date
                                        ? new Date(
                                            deliverable.release_date
                                          ).toLocaleDateString()
                                        : "Not set"}
                                    </TableCell>
                                    <TableCell className="w-[15%] py-1.5 px-2">
                                      <div className="flex items-center gap-1">
                                        {deliverable.social_media_link && (
                                          <a
                                            href={deliverable.social_media_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline"
                                            title="View Published Content"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                        {deliverable.dropbox_link && (
                                          <a
                                            href={deliverable.dropbox_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline"
                                            title="View Files"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile Card View */}
                          <div className="md:hidden space-y-2 p-3">
                            {deliverables.map((deliverable) => (
                              <div
                                key={deliverable._id?.toString()}
                                className="bg-muted/20 rounded-lg p-3 space-y-2"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {deliverable.title}
                                    </p>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <div>
                                        <PlatformBadges
                                          platform_id={deliverable.platform_id?.toString()}
                                          platform={deliverable.platform}
                                          platforms={deliverable.platforms}
                                          maxVisible={2}
                                          size="sm"
                                        />
                                      </div>
                                      <span>
                                        • {getMediaTypeName(deliverable)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {deliverable.social_media_link && (
                                      <a
                                        href={deliverable.social_media_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline"
                                        title="View Published Content"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                    {deliverable.dropbox_link && (
                                      <a
                                        href={deliverable.dropbox_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline"
                                        title="View Files"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    Release:{" "}
                                    {deliverable.release_date
                                      ? new Date(
                                          deliverable.release_date
                                        ).toLocaleDateString()
                                      : "Not set"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
