"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/button";
import { Edit2, ArrowLeft } from "lucide-react";
import { Client } from "@/types/contact";
import { useToast } from "@/components/ui/use-toast";
import EditClientDialog from "@/components/clients/EditClientDialog";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

export default function ClientDetailsPage({ params }: any) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [cars, setCars] = useState<any[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch client");
      const data = await response.json();
      setClient(data);
    } catch (error) {
      console.error("Error fetching client:", error);
      toast({
        title: "Error",
        description: "Failed to fetch client details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [params.id, toast]);

  const fetchClientCars = useCallback(async () => {
    try {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Fetching cars for client:", params.id);
      const response = await fetch(`/api/clients/${params.id}/cars`);
      if (!response.ok) throw new Error("Failed to fetch client's cars");
      const data = await response.json();
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Received cars data:", data);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("First car details:", data[0]);
      setCars(data);
    } catch (error) {
      console.error("Error fetching client's cars:", error);
      toast({
        title: "Error",
        description: "Failed to fetch client's cars",
        variant: "destructive",
      });
    }
  }, [params.id, toast]);

  useEffect(() => {
    fetchClient();
    fetchClientCars();
  }, [params.id, fetchClient, fetchClientCars]);

  useEffect(() => {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Current cars state:", cars);
  }, [cars]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-8">
            Loading...
          </div>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
            Client not found.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <PageTitle title={client.name} />
            </div>
            <Button onClick={() => setIsEditDialogOpen(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Client
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Contact Information
                </h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Email
                    </label>
                    <p>{client.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Phone
                    </label>
                    <p>{client.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Business Type
                    </label>
                    <p>{client.businessType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Status
                    </label>
                    <p className="capitalize">{client.status}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Address</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Street
                    </label>
                    <p>{client.address?.street}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      City
                    </label>
                    <p>{client.address?.city}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      State
                    </label>
                    <p>{client.address?.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      ZIP Code
                    </label>
                    <p>{client.address?.zipCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Country
                    </label>
                    <p>{client.address?.country}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Social Media</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Instagram
                    </label>
                    <p>{client.socialMedia?.instagram || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Website
                    </label>
                    <p>{client.socialMedia?.website || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Cars</CardTitle>
                  <CardDescription>
                    Vehicles associated with this client
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {cars.length > 0 ? (
                    <div className="divide-y divide-border overflow-hidden rounded-b-lg">
                      {cars.map((car) => (
                        <Link
                          href={`/cars/${car._id}`}
                          key={car._id}
                          className="block"
                        >
                          <div className="hover:bg-muted/50 transition-colors h-16 flex items-center rounded-b-lg">
                            {car.images?.[0] ? (
                              <div className="w-16 h-16 relative flex-shrink-0 overflow-hidden">
                                <Image
                                  src={`${car.images[0].url.replace(
                                    "/public",
                                    ""
                                  )}/width=200`}
                                  alt={`${car.year} ${car.make} ${car.model}`}
                                  fill
                                  style={{ objectFit: "cover" }}
                                  sizes="(max-width: 768px) 10vw, 64px"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-muted flex-shrink-0 flex items-center justify-center">
                                <MotiveLogo
                                  className="w-10 h-10"
                                  fillColor="var(--accent-primary)"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 px-4">
                              <h3 className="font-medium truncate">
                                {car.year} {car.make} {car.model}
                              </h3>
                              {car.vin && (
                                <p className="text-sm text-muted-foreground truncate">
                                  VIN: {car.vin}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No cars associated with this client.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {isEditDialogOpen && (
          <EditClientDialog
            client={client}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchClient();
            }}
          />
        )}
      </main>
    </div>
  );
}
