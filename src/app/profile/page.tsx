"use client";

import { useSession } from "@/hooks/useFirebaseAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Navbar from "@/components/layout/navbar";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Navbar />
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  // Function to get user initials for the avatar fallback
  const getInitials = () => {
    if (!session?.user?.name) return "U";
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Since we've already checked that session.user exists, we can safely use it
  const user = session.user;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl pt-24">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto">
              <AvatarImage src={user.image || ""} alt={user.name || "User"} />
              <AvatarFallback className="text-xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {user.roles?.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize">
                  {role}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {user.creativeRoles?.map((role) => (
                <Badge key={role} variant="outline" className="capitalize">
                  {role}
                </Badge>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-sm font-medium">Account Status</p>
              <Badge
                variant={user.status === "active" ? "default" : "destructive"}
                className="mt-1"
              >
                {user.status || "active"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Name
                </dt>
                <dd className="mt-1">{user.name || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  User ID
                </dt>
                <dd className="mt-1 font-mono text-sm">{user.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
