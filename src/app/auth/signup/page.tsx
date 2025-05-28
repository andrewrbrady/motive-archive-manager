"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import SignupForm from "@/components/SignupForm";

function SignupContent() {
  return <SignupForm />;
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">
          Motive Archive Manager
        </h1>
        <Suspense fallback={<div>Loading...</div>}>
          <SignupContent />
        </Suspense>
      </div>
    </div>
  );
}
