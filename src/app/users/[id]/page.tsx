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
import UserDeliverables from "@/components/users/UserDeliverables";
import UserEvents from "@/components/users/UserEvents";
import UserCalendar from "@/components/users/UserCalendar";

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
  const { id } = useParams();
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
          <div className="animate-pulse text-zinc-500 dark:text-zinc-400">
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
          <div className="text-red-500">User not found</div>
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
            <CardHeader>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-500 dark:text-gray-400">
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
                  <h3 className="font-medium text-gray-500 dark:text-gray-400">
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

              {user.profile?.title && (
                <div>
                  <h3 className="font-medium text-gray-500 dark:text-gray-400">
                    Title
                  </h3>
                  <p>{user.profile.title}</p>
                </div>
              )}

              {user.profile?.bio && (
                <div>
                  <h3 className="font-medium text-gray-500 dark:text-gray-400">
                    Bio
                  </h3>
                  <p>{user.profile.bio}</p>
                </div>
              )}

              {user.profile?.specialties &&
                user.profile.specialties.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-500 dark:text-gray-400">
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
                  <h3 className="font-medium text-gray-500 dark:text-gray-400">
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

          {/* Tabs for Calendar, Deliverables, and Events */}
          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <Card>
                <CardContent className="p-0">
                  <UserCalendar userName={user.name} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deliverables">
              <UserDeliverables userName={user.name} />
            </TabsContent>

            <TabsContent value="events">
              <UserEvents userName={user.name} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
