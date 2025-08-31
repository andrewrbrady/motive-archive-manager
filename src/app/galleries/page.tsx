import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import GalleriesClient from "./GalleriesClient";

export default function GalleriesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading galleries...</div>}>
        <GalleriesClient />
      </Suspense>
    </AuthGuard>
  );
}
