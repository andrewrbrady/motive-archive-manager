"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, requiredRoles = [] }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check authentication status
    if (status === "loading") {
      return; // Still loading, don't redirect yet
    }

    if (!session) {
      // No session, redirect to login with return path
      const returnUrl = encodeURIComponent(pathname || "/");
      router.push(`/auth/signin?returnUrl=${returnUrl}`);
      return;
    }

    // If roles are required, check if user has any of them
    if (requiredRoles.length > 0) {
      const hasRequiredRole = session.user?.roles?.some((role) =>
        requiredRoles.includes(role)
      );

      if (!hasRequiredRole) {
        // User is authenticated but doesn't have required role
        router.push("/unauthorized");
        return;
      }
    }

    // User is authenticated and has required role (if any)
    setIsAuthorized(true);
  }, [session, status, router, pathname, requiredRoles]);

  // Show loading spinner while checking authentication
  if (status === "loading" || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

// Role-specific guards
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["admin"]}>{children}</AuthGuard>;
}

export function EditorGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["admin", "editor"]}>{children}</AuthGuard>;
}

export default AuthGuard;
