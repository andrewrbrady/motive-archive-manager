"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const api = useAPI();
  const token = params?.token as string;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isValidToken, setIsValidToken] = useState(true);
  const [loading, setLoading] = useState(false);

  // Verify token on load
  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (!api) {
          setIsValidToken(false);
          setError("Authentication service unavailable");
          return;
        }

        const response = (await api.post("/auth/verify-reset-token", {
          token: token,
        })) as any;

        if (!response.success) {
          setIsValidToken(false);
          setError("Invalid or expired reset token");
        }
      } catch (err: any) {
        console.error("Token verification error:", err);
        setIsValidToken(false);
        setError("Invalid or expired reset token");
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token, api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api) {
      toast({
        title: "Error",
        description: "Authentication service unavailable",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/update-password", {
        token: token,
        password: password,
      });

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      router.push("/auth/signin");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                Password must be at least 6 characters long
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
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting..." : "Reset Password"}
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
