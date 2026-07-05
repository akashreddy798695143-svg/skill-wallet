"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  Mic,
  FileAudio,
  FileText,
  Award,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { ViewHeader, Card } from "@/components/shared/view-parts";
import { CardSkeleton } from "@/components/shared/loaders";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AdminStats {
  totals: { users: number; admins: number; sessions: number; audioFiles: number; transcripts: number; reports: number };
  averageScore: number;
  ratingDistribution: { rating: string; count: number }[];
  recentSessions: {
    id: string;
    title: string;
    createdAt: string;
    user: { name: string; email: string };
    rating?: string;
    overallSpeaking?: number;
    emotion?: string;
  }[];
  loginHistory: { id: string; email: string; success: boolean; ipAddress: string | null; createdAt: string }[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  sessionCount: number;
}

const RATING_COLORS: Record<string, string> = {
  Excellent: "var(--chart-1)",
  Good: "var(--chart-2)",
  Average: "var(--chart-3)",
  "Needs Improvement": "var(--chart-4)",
};

export function AdminView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        api.get<AdminStats>("/api/admin/stats"),
        api.get<{ users: AdminUser[] }>("/api/admin/users"),
      ]);
      setStats(s);
      setUsers(u.users);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function toggleRole(u: AdminUser) {
    setBusyId(u.id);
    try {
      await api.post("/api/admin/users", { userId: u.id, role: u.role === "ADMIN" ? "USER" : "ADMIN" });
      toast.success(`${u.name} is now ${u.role === "ADMIN" ? "Member" : "Admin"}`);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: AdminUser) {
    if (!confirm(`Delete user "${u.name}"? This removes all their sessions and data.`)) return;
    setBusyId(u.id);
    try {
      await api.del(`/api/admin/users/${u.id}`);
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <CardSkeleton count={4} />;

  const cards = [
    { label: "Users", value: stats?.totals.users ?? 0, icon: Users },
    { label: "Admins", value: stats?.totals.admins ?? 0, icon: ShieldCheck },
    { label: "Sessions", value: stats?.totals.sessions ?? 0, icon: Mic },
    { label: "Audio Files", value: stats?.totals.audioFiles ?? 0, icon: FileAudio },
    { label: "Transcripts", value: stats?.totals.transcripts ?? 0, icon: FileText },
    { label: "Avg Score", value: stats?.averageScore ?? 0, icon: Award },
  ];

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Admin Panel"
        description="Manage users, monitor system analytics and audit login history."
        icon={Shield}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <c.icon className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Rating Distribution" subtitle="Across all users">
          {stats && stats.ratingDistribution.some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="rating" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.ratingDistribution.map((r) => (
                    <Cell key={r.rating} fill={RATING_COLORS[r.rating]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No evaluations yet.
            </div>
          )}
        </Card>

        <Card title="Recent Login History" subtitle="Last 20 attempts">
          <div className="space-y-1.5 max-h-64 overflow-y-auto fancy-scroll pr-1">
            {stats?.loginHistory.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2 text-xs">
                {l.success ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                )}
                <span className="flex-1 truncate">{l.email}</span>
                <span className="text-muted-foreground">{l.ipAddress ?? "—"}</span>
                <span className="text-muted-foreground">
                  {new Date(l.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {stats?.loginHistory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No login activity yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Users management */}
      <Card title="User Management" subtitle={`${users.length} users`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2 pr-3 font-medium">User</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Sessions</th>
                <th className="py-2 pr-3 font-medium">Joined</th>
                <th className="py-2 pr-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "ADMIN" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.role === "ADMIN" && <ShieldCheck className="h-3 w-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 pr-3">{u.sessionCount}</td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="inline-flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === u.id}
                        onClick={() => toggleRole(u)}
                        title="Toggle role"
                      >
                        {u.role === "ADMIN" ? "Demote" : "Promote"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        disabled={busyId === u.id || u.role === "ADMIN"}
                        onClick={() => deleteUser(u)}
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent sessions across system */}
      <Card title="Recent Sessions" subtitle="Latest across all users">
        <div className="space-y-1.5 max-h-72 overflow-y-auto fancy-scroll pr-1">
          {stats?.recentSessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
              <HistoryIcon className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {s.user.name} · {new Date(s.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {s.rating && (
                <span className="text-xs rounded-full border px-2 py-0.5 font-medium">{s.rating}</span>
              )}
              {s.overallSpeaking != null && (
                <span className="font-bold">{s.overallSpeaking}</span>
              )}
            </div>
          ))}
          {stats?.recentSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No sessions yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
