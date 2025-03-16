"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import UserDeliverables from "@/components/users/UserDeliverables";
import UserEvents from "@/components/users/UserEvents";

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
  creativeRoles: string[];
  created_at: string;
  updated_at: string;
  active: boolean;
  permissions: string[];
  last_login?: string;
  profile?: {
    avatar_url?: string;
    title?: string;
    bio?: string;
    specialties?: string[];
    portfolio_url?: string;
  };
}

export default function UserDashboard() {
  const params = useParams();
  const id = params?.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) throw new Error("Failed to fetch user");
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Error fetching user:", error);
        toast({
          title: "Error",
          description: "Failed to fetch user data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="animate-pulse text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
            Loading user data...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-destructive-500">User not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="space-y-8">
          {/* User Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
              <div className="flex flex-row gap-4">
                <div>
                  <h3 className="font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                    Roles
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                    Creative Roles
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {user.creativeRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0">
              {user.profile?.title && (
                <div>
                  <h3 className="font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                    Title
                  </h3>
                  <p>{user.profile.title}</p>
                </div>
              )}

              {user.profile?.bio && (
                <div>
                  <h3 className="font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                    Bio
                  </h3>
                  <p>{user.profile.bio}</p>
                </div>
              )}

              {user.profile?.specialties &&
                user.profile.specialties.length > 0 && (
                  <div>
                    <h3 className="font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      Specialties
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {user.profile.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {user.profile?.portfolio_url && (
                <div>
                  <h3 className="font-medium text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                    Portfolio
                  </h3>
                  <a
                    href={user.profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View Portfolio
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Deliverables and Events */}
          <CustomTabs
            items={[
              {
                value: "deliverables",
                label: "Deliverables",
                content: <UserDeliverables userName={user.name} />,
              },
              {
                value: "events",
                label: "Events",
                content: <UserEvents userName={user.name} />,
              },
            ]}
            defaultValue="deliverables"
            basePath={`/users/${id}`}
            className="space-y-4"
          />
        </div>
      </div>
    </div>
  );
}
