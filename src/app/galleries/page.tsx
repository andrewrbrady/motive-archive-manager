import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import GalleriesClient from "./GalleriesClient";

export const metadata = {
  title: "Galleries - Motive Archive Manager",
  description: "Browse and manage your image galleries",
};

export default function GalleriesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading galleries...</div>}>
        <GalleriesClient />
      </Suspense>
    </AuthGuard>
  );
}
