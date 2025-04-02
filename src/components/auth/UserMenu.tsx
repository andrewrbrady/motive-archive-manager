"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserMenu() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      console.log("Attempting to sign out...");

      try {
        // First try using NextAuth's signOut
        await signOut({ callbackUrl: "/" });
        console.log("NextAuth signOut completed");
      } catch (nextAuthError) {
        console.warn(
          "NextAuth signOut failed, using direct API:",
          nextAuthError
        );

        // Fall back to our custom endpoint if NextAuth fails
        window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(
          "/"
        )}`;
      }
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoading(false);
    }
  };

  // Add a direct sign-out function
  const handleDirectSignOut = async () => {
    setIsLoading(true);

    try {
      // Clear any local storage or cookies we can access from client side
      if (typeof window !== "undefined") {
        // Clear localStorage
        localStorage.removeItem("next-auth.session-token");
        localStorage.removeItem("next-auth.callback-url");
        localStorage.removeItem("next-auth.csrf-token");

        // First fetch the session endpoint with clear_session=true
        await fetch("/api/auth/session?clear_session=true", {
          method: "GET",
          cache: "no-store",
        });

        // Force redirect to home
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error in direct sign out:", error);
      // Force redirect anyway
      window.location.href = "/";
    }
  };

  // User is not authenticated
  if (!session) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/auth/signin">
          <Button variant="outline">Sign In</Button>
        </Link>
        <Link href="/auth/signup">
          <Button>Sign Up</Button>
        </Link>
      </div>
    );
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!session?.user?.name) return "U";
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // User is authenticated
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={session?.user?.image || ""}
              alt={session?.user?.name || "User"}
            />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session?.user?.name || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session?.user?.email || "user@example.com"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">Profile</Link>
          </DropdownMenuItem>
          {session?.user?.roles?.includes("admin") && (
            <DropdownMenuItem asChild>
              <Link href="/admin">Admin</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isLoading}
          className="cursor-pointer"
        >
          {isLoading ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDirectSignOut}
          className="cursor-pointer text-destructive"
        >
          Force Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
