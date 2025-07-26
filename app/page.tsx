"use client";

import { useAuth } from "@/lib/auth-context";
import { AuthForm } from "@/components/auth/auth-form";
import { MainApp } from "@/components/main-app";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return user ? <MainApp /> : <AuthForm />;
}
