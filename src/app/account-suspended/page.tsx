import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AccountSuspendedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">Account Suspended</h1>
          <div className="mt-2 text-gray-600">
            <p className="mb-4">
              Your account has been suspended. This may be due to:
            </p>
            <ul className="list-disc text-left pl-8 mb-6">
              <li>Violation of our terms of service</li>
              <li>Suspicious activity detected on your account</li>
              <li>Administrative action</li>
            </ul>
            <p>
              If you believe this is an error, please contact our support team
              for assistance.
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign Out
          </Button>
          <Link
            href="/contact"
            className="text-sm text-center text-blue-600 hover:underline"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
