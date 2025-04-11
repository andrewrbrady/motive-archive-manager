"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (
    status === "unauthenticated" ||
    !session?.user?.roles?.includes("admin")
  ) {
    router.push("/");
    return null;
  }

  return <>{children}</>;
}

export default AuthGuard;
