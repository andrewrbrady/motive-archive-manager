"use client";

import { useSession } from "next-auth/react";
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
    if (status === "unauthenticated" && !isRedirecting) {
      console.log(
        "AuthGuard: User is unauthenticated, redirecting to:",
        redirectTo
      );
      setIsRedirecting(true);
      router.push(redirectTo);
    }
  }, [status, router, redirectTo, isRedirecting]);

  if (status === "loading" || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

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
    console.log("AdminGuard: Status check", {
      status,
      isAuthenticated,
      isAdmin,
      isAdminBypass,
      userRoles: session?.user?.roles,
      userId: session?.user?.id,
    });

    if (status === "unauthenticated" && !isRedirecting) {
      // [REMOVED] // [REMOVED] console.log("AdminGuard: User is unauthenticated, redirecting to signin");
      setIsRedirecting(true);
      router.push("/auth/signin");
    } else if (
      isAuthenticated &&
      !isAdmin &&
      !isAdminBypass &&
      !isRedirecting
    ) {
      console.log(
        "AdminGuard: User is authenticated but not admin, showing unauthorized"
      );
      setShowUnauthorized(true);
      // Don't redirect immediately, show unauthorized message first
      setTimeout(() => {
        if (!isRedirecting) {
          setIsRedirecting(true);
          router.push("/unauthorized");
        }
      }, 3000); // Show message for 3 seconds before redirecting
    }
  }, [
    status,
    isAuthenticated,
    isAdmin,
    isAdminBypass,
    router,
    session,
    isRedirecting,
  ]);

  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (showUnauthorized || (isAuthenticated && !isAdmin && !isAdminBypass)) {
    return (
      fallbackComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to the home page...
            </p>
          </div>
        </div>
      )
    );
  }

  if (isAuthenticated && (isAdmin || isAdminBypass)) {
    return <>{children}</>;
  }

  return null;
}

export default AuthGuard;
