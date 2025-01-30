"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import CarEntryForm from "@/components/cars/CarEntryForm";
import { Car } from "@/types/car";
import { PageTitle } from "@/components/ui/PageTitle";

export default function NewCarPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (carData: Partial<Car>) => {
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/cars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(carData),
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <PageTitle title="Add New Car" />
          <CarEntryForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
      </main>
    </div>
  );
}
