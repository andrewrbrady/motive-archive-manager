"use client";

import { useSession } from "@/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading";

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  redirectTo = "/auth/signin",
}: AuthGuardProps) {
  const { status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Only redirect if we're definitely unauthenticated (not loading)
    if (status === "unauthenticated" && !isRedirecting) {
      console.log(
        "AuthGuard: User is unauthenticated, redirecting to:",
        redirectTo
      );
      setIsRedirecting(true);
      router.push(redirectTo);
    }

    // Reset redirecting state if user becomes authenticated
    if (status === "authenticated" && isRedirecting) {
      setIsRedirecting(false);
    }
  }, [status, router, redirectTo, isRedirecting]);

  // Show loading while checking auth status or redirecting
  if (status === "loading" || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If unauthenticated, show nothing (redirect is happening)
  if (status === "unauthenticated") {
    return null;
  }

  // User is authenticated, show children
  return <>{children}</>;
}

interface AdminGuardProps {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
}

export function AdminGuard({ children, fallbackComponent }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showUnauthorized, setShowUnauthorized] = useState(false);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const isAdmin = session?.user?.roles?.includes("admin");

  // Temporary bypass for specific admin user
  const isAdminBypass = session?.user?.id === "G46fdpqaufe7bmhluKAhakVM44e2";

  useEffect(() => {
    // Don't make any decisions while still loading
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated" && !isRedirecting) {
      setIsRedirecting(true);
      router.push("/auth/signin");
    } else if (
      status === "authenticated" &&
      !isAdmin &&
      !isAdminBypass &&
      !isRedirecting
    ) {
      setShowUnauthorized(true);
      // Don't redirect immediately, show unauthorized message first
      setTimeout(() => {
        if (!isRedirecting) {
          setIsRedirecting(true);
          router.push("/unauthorized");
        }
      }, 3000); // Show message for 3 seconds before redirecting
    }
  }, [status, isAdmin, isAdminBypass, router, isRedirecting]); // Removed session from dependencies to prevent unnecessary re-runs

  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (showUnauthorized && fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  if (isAuthenticated && !isAdmin && !isAdminBypass) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to unauthorized page...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
