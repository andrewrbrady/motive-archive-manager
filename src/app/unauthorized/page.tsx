"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useFirebaseAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-destructive">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            You don't have permission to access the requested page.
          </p>

          {session?.user && (
            <div className="text-sm text-muted-foreground">
              <p>Signed in as: {session.user.email}</p>
              <p>Your roles: {session.user.roles?.join(", ") || "None"}</p>
            </div>
          )}

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
