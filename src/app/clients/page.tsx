"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading";

export default function ClientsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/admin?tab=clients");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner text="Redirecting to Admin..." size={30} />
    </div>
  );
}
