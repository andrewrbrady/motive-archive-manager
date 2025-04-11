"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPassword({ params }: any) {
  const router = useRouter();
  const { token } = params;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isValidToken, setIsValidToken] = useState(true);

  // Verify token on load
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(
          `/api/auth/verify-reset-token?token=${token}`
        );

        if (!response.ok) {
          setIsValidToken(false);
          setError("This reset link is invalid or has expired.");
        }
      } catch (err) {
        setIsValidToken(false);
        setError("An error occurred while verifying the reset link.");
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setMessage(
        "Your password has been reset successfully. You can now sign in with your new password."
      );
      setPassword("");
      setConfirmPassword("");

      // Redirect to sign in page after 3 seconds
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-success/15 text-success p-3 rounded-md text-center">
            {message}
          </div>
        )}

        {isValidToken ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your new password"
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Confirm your new password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <p>This reset link is invalid or has expired.</p>
            <Link
              href="/auth/forgot-password"
              className="text-primary hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        )}

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
