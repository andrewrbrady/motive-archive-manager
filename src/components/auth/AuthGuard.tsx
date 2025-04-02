"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredCreativeRoles?: string[];
}

export function AuthGuard({
  children,
  requiredRoles = [],
  requiredCreativeRoles = [],
}: AuthGuardProps) {
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

    // Check if user is suspended
    if (session.user?.status === "suspended") {
      router.push("/account-suspended");
      return;
    }

    let authorized = true;

    // If roles are required, check if user has any of them
    if (requiredRoles.length > 0) {
      const hasRequiredRole = session.user?.roles?.some((role) =>
        requiredRoles.includes(role)
      );

      if (!hasRequiredRole) {
        authorized = false;
      }
    }

    // If creative roles are required, check if user has any of them
    if (requiredCreativeRoles.length > 0 && authorized) {
      const hasRequiredCreativeRole = session.user?.creativeRoles?.some(
        (role) => requiredCreativeRoles.includes(role)
      );

      if (!hasRequiredCreativeRole) {
        authorized = false;
      }
    }

    if (!authorized) {
      // User is authenticated but doesn't have required roles
      router.push("/unauthorized");
      return;
    }

    // User is authenticated and has required roles
    setIsAuthorized(true);
  }, [session, status, router, pathname, requiredRoles, requiredCreativeRoles]);

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

// Creative role-specific guards
export function CreativeRoleGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  return <AuthGuard requiredCreativeRoles={roles}>{children}</AuthGuard>;
}

// Combined role guards
export function CreativeEditorGuard({
  children,
  creativeRoles,
}: {
  children: React.ReactNode;
  creativeRoles: string[];
}) {
  return (
    <AuthGuard
      requiredRoles={["admin", "editor"]}
      requiredCreativeRoles={creativeRoles}
    >
      {children}
    </AuthGuard>
  );
}

export default AuthGuard;
