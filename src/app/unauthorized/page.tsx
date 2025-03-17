"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>

        <div className="space-y-4">
          {session ? (
            <div className="space-y-2">
              <p>
                You are signed in as{" "}
                <span className="font-medium">{session.user?.name}</span> with{" "}
                <span className="font-medium">
                  {session.user?.roles?.join(", ")} role(s)
                </span>
                .
              </p>
              <p className="text-sm text-muted-foreground">
                If you believe you should have access to this page, please
                contact an administrator.
              </p>
            </div>
          ) : (
            <p>Please sign in to access more features.</p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
            {!session && (
              <Button asChild variant="outline">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
