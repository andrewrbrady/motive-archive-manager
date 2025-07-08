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

  // Don't show loading spinner - let the page content handle its own loading states
  // This prevents the double loading spinner issue
  if (status === "loading") {
    return <>{children}</>;
  }

  // If unauthenticated or redirecting, show nothing (redirect is happening)
  if (status === "unauthenticated" || isRedirecting) {
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
  const [unauthorizedTimeoutId, setUnauthorizedTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const isAdmin = session?.user?.roles?.includes("admin");

  // Temporary bypass for specific admin users
  const adminBypassIds = [
    "G46fdpqaufe7bmhluKAhakVM44e2", // Original admin
    "B1hNo4GocJh9rPVAhMUhtvO6PGZ2", // Current user
  ];
  const isAdminBypass =
    session?.user?.id && adminBypassIds.includes(session.user.id);

  // CRITICAL FIX: Check if we're in a loading state where user is authenticated but session data isn't loaded yet
  const isSessionDataLoading = isAuthenticated && !session?.user;

  // Debug logging
  useEffect(() => {
    if (session?.user) {
      console.log("AdminGuard: Session data:", {
        userId: session.user.id,
        email: session.user.email,
        roles: session.user.roles,
        isAdmin,
        isAdminBypass,
        status,
        isSessionDataLoading,
      });
    } else if (isAuthenticated) {
      console.log(
        "AdminGuard: Authenticated but no session data yet (loading user data)"
      );
    }
  }, [session, isAdmin, isAdminBypass, status, isSessionDataLoading]);

  // CRITICAL FIX: Clear timeout and reset unauthorized state when admin access is detected
  useEffect(() => {
    if (isAdmin || isAdminBypass) {
      if (unauthorizedTimeoutId) {
        console.log(
          "AdminGuard: Admin access detected, clearing unauthorized timeout"
        );
        clearTimeout(unauthorizedTimeoutId);
        setUnauthorizedTimeoutId(null);
      }
      setShowUnauthorized(false);
    }
  }, [isAdmin, isAdminBypass, unauthorizedTimeoutId]);

  useEffect(() => {
    // Clear any existing timeout when dependencies change
    if (unauthorizedTimeoutId) {
      clearTimeout(unauthorizedTimeoutId);
      setUnauthorizedTimeoutId(null);
    }

    // CRITICAL FIX: Don't make any decisions while still loading OR while session data is loading
    if (status === "loading" || isSessionDataLoading) {
      return;
    }

    if (status === "unauthenticated" && !isRedirecting) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("AdminGuard: User unauthenticated, redirecting to signin");
      setIsRedirecting(true);
      router.push("/auth/signin");
    } else if (
      status === "authenticated" &&
      session?.user && // CRITICAL FIX: Ensure we have session data before making admin decisions
      !isAdmin &&
      !isAdminBypass &&
      !isRedirecting
    ) {
      console.log(
        "AdminGuard: User authenticated but not admin, showing unauthorized"
      );
      setShowUnauthorized(true);
      // Don't redirect immediately, show unauthorized message first
      const timeoutId = setTimeout(() => {
        if (!isRedirecting) {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("AdminGuard: Redirecting to unauthorized page");
          setIsRedirecting(true);
          router.push("/unauthorized");
        }
      }, 3000); // Show message for 3 seconds before redirecting
      setUnauthorizedTimeoutId(timeoutId);
    } else if (status === "authenticated" && (isAdmin || isAdminBypass)) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("AdminGuard: User has admin access, showing content");
    }
  }, [
    status,
    isAdmin,
    isAdminBypass,
    router,
    isRedirecting,
    session?.user,
    isSessionDataLoading,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (unauthorizedTimeoutId) {
        clearTimeout(unauthorizedTimeoutId);
      }
    };
  }, [unauthorizedTimeoutId]);

  // CRITICAL FIX: Show loading while authentication is being determined OR while session data is loading
  if (isLoading || isRedirecting || isSessionDataLoading) {
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

  // CRITICAL FIX: Only show unauthorized if we have session data and user is definitely not admin
  if (isAuthenticated && session?.user && !isAdmin && !isAdminBypass) {
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
