"use client";

import { Settings as SettingsIcon, Moon, Sun, User, Mail, Shield, LogOut } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ViewHeader, Card } from "@/components/shared/view-parts";
import { Button } from "@/components/ui/button";

export function SettingsView() {
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const logout = useAppStore((s) => s.logout);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <ViewHeader
        title="Settings"
        description="Manage your profile and application preferences."
        icon={SettingsIcon}
      />

      <Card title="Profile">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full brand-gradient text-white grid place-items-center text-2xl font-bold">
            {user.name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-lg">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-medium">
              <Shield className="h-3 w-3" /> {user.role}
            </div>
          </div>
        </div>
        <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border bg-card/50 p-3 flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="rounded-lg border bg-card/50 p-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium truncate">{user.email}</span>
          </div>
          <div className="rounded-lg border bg-card/50 p-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Role:</span>
            <span className="font-medium">{user.role}</span>
          </div>
          <div className="rounded-lg border bg-card/50 p-3 flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Joined:</span>
            <span className="font-medium">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Appearance" subtitle="Choose your preferred theme">
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
              theme === "light" ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted"
            }`}
          >
            <Sun className="h-5 w-5 text-amber-500" />
            <div>
              <div className="font-medium text-sm">Light mode</div>
              <div className="text-xs text-muted-foreground">Bright and clean</div>
            </div>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
              theme === "dark" ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted"
            }`}
          >
            <Moon className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium text-sm">Dark mode</div>
              <div className="text-xs text-muted-foreground">Easy on the eyes</div>
            </div>
          </button>
        </div>
      </Card>

      <Card title="Account">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="sm:w-auto" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Log out
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Your sessions and audio are stored securely and can be deleted anytime from the History tab.
        </p>
      </Card>
    </div>
  );
}
