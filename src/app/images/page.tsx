import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import ImagesClient from "./ImagesClient";

export const metadata = {
  title: "Images - Motive Archive Manager",
  description: "Browse and manage all images in the archive",
};

export default function ImagesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading images...</div>}>
        <ImagesClient />
      </Suspense>
    </AuthGuard>
  );
}
