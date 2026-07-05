"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { LandingPage } from "@/components/landing/landing-page";
import { AppShell } from "@/components/app-shell";
import { FullScreenLoader } from "@/components/shared/loaders";

export default function Home() {
  const user = useAppStore((s) => s.user);
  const loadingUser = useAppStore((s) => s.loadingUser);
  const refreshUser = useAppStore((s) => s.refreshUser);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  if (loadingUser) return <FullScreenLoader />;
  if (!user) return <LandingPage />;
  return <AppShell />;
}
