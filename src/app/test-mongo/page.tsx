"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function TestMongoDBPage() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">MongoDB Connection Test</h1>

      <div className="mb-6 p-4 bg-amber-100 border border-amber-300 text-amber-700 rounded">
        <h2 className="font-semibold">Notice:</h2>
        <p className="mt-2">
          The MongoDB test API endpoints have been removed from the application
          for security reasons. If you need to test MongoDB connectivity, please
          use the appropriate administration tools or contact the system
          administrator.
        </p>
      </div>
    </div>
  );
}
