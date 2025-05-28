"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ErrorContent from "./ErrorContent";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">
          Motive Archive Manager
        </h1>
        <Suspense fallback={<div>Loading...</div>}>
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  );
}
