"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Mic,
  AudioLines,
  History,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAppStore } from "@/lib/store";
import type { ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/components/views/dashboard-view";
import { StudioView } from "@/components/views/studio-view";
import { TtsView } from "@/components/views/tts-view";
import { HistoryView } from "@/components/views/history-view";
import { AdminView } from "@/components/views/admin-view";
import { SettingsView } from "@/components/views/settings-view";

const NAV: { key: ViewKey; label: string; icon: typeof Mic; admin?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "studio", label: "Voice Studio", icon: Mic },
  { key: "tts", label: "Text to Speech", icon: AudioLines },
  { key: "history", label: "History", icon: History },
  { key: "admin", label: "Admin Panel", icon: Shield, admin: true },
  { key: "settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const user = useAppStore((s) => s.user);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const logout = useAppStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((n) => !n.admin || user?.role === "ADMIN");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b h-16 flex items-center px-4 sm:px-6 gap-3">
        <button
          className="lg:hidden rounded-lg p-2 hover:bg-muted"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Wordmark />
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l">
            <div className="h-8 w-8 rounded-full brand-gradient text-white grid place-items-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground">{user?.role === "ADMIN" ? "Administrator" : "Member"}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar/50 p-4 gap-1 sticky top-16 h-[calc(100vh-4rem)]">
          {items.map((n) => (
            <NavButton key={n.key} item={n} active={view === n.key} onClick={() => setView(n.key)} />
          ))}
          <div className="mt-auto rounded-xl glass p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Tip</p>
            Record a short sample in the Voice Studio to see all analyses at once.
          </div>
        </aside>

        {/* Sidebar (mobile) */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 26 }}
              className="lg:hidden fixed z-30 top-16 left-0 w-64 h-[calc(100vh-4rem)] border-r bg-sidebar p-4 flex flex-col gap-1"
            >
              {items.map((n) => (
                <NavButton
                  key={n.key}
                  item={n}
                  active={view === n.key}
                  onClick={() => {
                    setView(n.key);
                    setMobileOpen(false);
                  }}
                />
              ))}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="p-4 sm:p-6 lg:p-8"
            >
              {view === "dashboard" && <DashboardView />}
              {view === "studio" && <StudioView />}
              {view === "tts" && <TtsView />}
              {view === "history" && <HistoryView />}
              {view === "admin" && user?.role === "ADMIN" && <AdminView />}
              {view === "settings" && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { key: ViewKey; label: string; icon: typeof Mic };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
        active
          ? "brand-gradient text-white shadow-md"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </button>
  );
}
