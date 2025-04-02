"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-amber-600">Access Denied</h1>
          <div className="mt-4 text-gray-600">
            <p className="mb-4">
              You don&apos;t have the necessary permissions to access this page.
            </p>

            {session?.user && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md text-sm">
                <p className="font-semibold mb-2">Your current access:</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="font-semibold">Roles:</span>
                  {session.user.roles?.length > 0 ? (
                    session.user.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-red-500">None</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="font-semibold">Creative Roles:</span>
                  {session.user.creativeRoles?.length > 0 ? (
                    session.user.creativeRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>
            )}

            <p className="mt-4">
              If you believe you should have access to this page, please contact
              an administrator.
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            variant="default"
            className="w-full"
            onClick={() => router.push("/")}
          >
            Go to Home
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
          <Link
            href="/profile"
            className="text-sm text-center text-blue-600 hover:underline"
          >
            View Your Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
