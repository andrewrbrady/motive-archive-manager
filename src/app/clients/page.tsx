"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin?tab=clients");
  }, [router]);

  return null;
}
