"use client";

import { Suspense } from "react";
import SigninForm from "@/components/SigninForm";

function SigninContent() {
  return <SigninForm />;
}

export default function SigninPage() {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-20 p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          </div>
        }
      >
        <SigninContent />
      </Suspense>
    </div>
  );
}
