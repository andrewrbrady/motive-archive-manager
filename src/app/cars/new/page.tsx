"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import CarEntryForm from "@/components/cars/CarEntryForm";
import { Car } from "@/types/car";
import { PageTitle } from "@/components/ui/PageTitle";
import type { CarFormData } from "@/components/cars/CarEntryForm";

export default function NewCarPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: Partial<CarFormData>) => {
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/cars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create car");
      }

      const data = await response.json();
      router.push(`/cars/${data._id}`);
    } catch (error) {
      console.error("Error creating car:", error);
      alert("Failed to create car. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <PageTitle title="Add New Car" className="mb-8" />
            <CarEntryForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
