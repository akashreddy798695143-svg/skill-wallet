"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  History,
  Gauge,
  Brain,
  Smile,
  Award,
  TrendingUp,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { DashboardData } from "@/lib/types";
import { ViewHeader, Card } from "@/components/shared/view-parts";
import { CardSkeleton } from "@/components/shared/loaders";
import { useAppStore } from "@/lib/store";

const EMOTION_COLORS: Record<string, string> = {
  happy: "var(--chart-1)",
  sad: "var(--chart-4)",
  angry: "var(--destructive)",
  neutral: "var(--muted-foreground)",
  fear: "var(--chart-5)",
  surprise: "var(--chart-3)",
};
const RATING_COLORS: Record<string, string> = {
  Excellent: "var(--chart-1)",
  Good: "var(--chart-2)",
  Average: "var(--chart-3)",
  "Needs Improvement": "var(--chart-4)",
};

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setView = useAppStore((s) => s.setView);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await api.get<DashboardData>("/api/dashboard");
        if (active) setData(d);
      } catch (e) {
        if (active) setError(e instanceof ApiError ? e.message : "Failed to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error || !data)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{error ?? "No data yet."}</p>
      </Card>
    );

  const cards = [
    { label: "Total Sessions", value: data.totalSessions, icon: History, accent: "var(--chart-1)" },
    { label: "Average Score", value: data.averageScore, icon: Gauge, accent: "var(--chart-2)" },
    { label: "Highest Score", value: data.highestScore, icon: Award, accent: "var(--chart-3)" },
    {
      label: "Top Emotion",
      value: data.emotionHistory.length
        ? data.emotionHistory.reduce((a, b) => (a.count > b.count ? a : b)).emotion
        : "—",
      icon: Smile,
      accent: "var(--chart-4)",
    },
  ];

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Dashboard"
        description="Your speech performance analytics at a glance."
        icon={LayoutDashboard}
        action={
          <button
            onClick={() => setView("studio")}
            className="inline-flex items-center gap-2 rounded-xl brand-gradient text-white font-medium px-4 py-2.5 text-sm shadow hover:opacity-90 transition"
          >
            <Brain className="h-4 w-4" /> New Session
          </button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="relative overflow-hidden">
            <div
              className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10"
              style={{ background: c.accent }}
            />
            <c.icon className="h-5 w-5 mb-3" style={{ color: c.accent }} />
            <div className="text-3xl font-extrabold tracking-tight capitalize">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Emotion History" subtitle="Distribution of detected emotions">
          {data.emotionHistory.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.emotionHistory}
                  dataKey="count"
                  nameKey="emotion"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {data.emotionHistory.map((e) => (
                    <Cell key={e.emotion} fill={EMOTION_COLORS[e.emotion] || "var(--chart-5)"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Rating Distribution" subtitle="Overall ratings across sessions">
          {data.ratingDistribution.some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.ratingDistribution} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="rating" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.ratingDistribution.map((r) => (
                    <Cell key={r.rating} fill={RATING_COLORS[r.rating]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Score Trend" subtitle="Recent overall speaking scores">
          {data.scoreTrend.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.scoreTrend.map((s, i) => ({ idx: i + 1, score: s.score }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="idx" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--chart-1)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Weekly Performance" subtitle="Average score over the last 8 weeks">
          {data.weeklyPerformance.some((w) => w.sessions > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.weeklyPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="var(--chart-2)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Monthly Performance" subtitle="Average score over the last 6 months">
          {data.monthlyPerformance.some((m) => m.sessions > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.monthlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--chart-3)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--chart-3)" }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      {/* Speech history list */}
      <Card title="Recent Sessions" subtitle="Your latest evaluated sessions">
        {data.speechHistory.length ? (
          <div className="space-y-2 max-h-72 overflow-y-auto fancy-scroll pr-1">
            {data.speechHistory
              .slice()
              .reverse()
              .slice(0, 8)
              .map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border bg-card/50 px-3 py-2.5"
                >
                  <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.rating}</div>
                  </div>
                  <div className="text-lg font-bold">{s.score}</div>
                </div>
              ))}
          </div>
        ) : (
          <Empty />
        )}
      </Card>
    </div>
  );
}

function Empty() {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
      <Gauge className="h-8 w-8 opacity-40" />
      No data yet. Run a session in the Voice Studio.
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 shimmer rounded-lg" />
      <CardSkeleton count={4} />
      <CardSkeleton count={3} />
    </div>
  );
}
