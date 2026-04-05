"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton({ className }: { className?: string }) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={() => void signOut()}
      className={className}
      aria-label="Sign out"
    >
      <LogOut className="w-4 h-4 sm:mr-2" />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
