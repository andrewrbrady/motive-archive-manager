"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  return <>{children}</>;
}

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isChecking = status === "loading";
  const isAdmin = session?.user?.roles?.includes("admin");

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      console.log(
        "AdminGuard: User is authenticated but not an admin. Redirecting to /"
      );
      router.push("/");
    } else if (status === "unauthenticated") {
      console.log("AdminGuard: User is unauthenticated. Redirecting to /");
      router.push("/");
    }
  }, [status, isAdmin, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === "authenticated" && isAdmin) {
    return <>{children}</>;
  }

  return null;
}

export default AuthGuard;
