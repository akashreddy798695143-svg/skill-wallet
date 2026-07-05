"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User as UserIcon, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/shared/loaders";
import { api, ApiError } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import type { SafeUser } from "@/lib/types";

type Mode = "login" | "signup" | "forgot";

interface AuthModalProps {
  open: boolean;
  defaultMode?: Mode;
  onClose: () => void;
}

export function AuthModal({ open, defaultMode = "login", onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [resetTokenFromApi, setResetTokenFromApi] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setUser = useAppStore((s) => s.setUser);

  // Keep local mode in sync when reopened
  const [lastDefault, setLastDefault] = useState<Mode>(defaultMode);
  if (defaultMode !== lastDefault) {
    setLastDefault(defaultMode);
    setMode(defaultMode);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { user } = await api.post<{ user: SafeUser }>("/api/auth/register", {
          name,
          email,
          password,
        });
        setUser(user);
        toast.success(`Welcome, ${user.name}!`);
        resetAndClose();
      } else if (mode === "login") {
        const { user } = await api.post<{ user: SafeUser }>("/api/auth/login", {
          email,
          password,
        });
        setUser(user);
        toast.success(`Welcome back, ${user.name}!`);
        resetAndClose();
      } else if (mode === "forgot") {
        const res = await api.post<{ resetToken?: string; message?: string }>(
          "/api/auth/forgot-password",
          { email }
        );
        if (res.resetToken) setResetTokenFromApi(res.resetToken);
        toast.success("Reset token generated. Set a new password below.");
        setMode("reset" as Mode);
      } else if (mode === "reset" as Mode) {
        await api.post("/api/auth/reset-password", {
          token: resetTokenFromApi || token,
          password,
        });
        toast.success("Password reset! You can now log in.");
        setMode("login");
        setToken("");
        setResetTokenFromApi(null);
        setPassword("");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function resetAndClose() {
    setName("");
    setEmail("");
    setPassword("");
    setToken("");
    setResetTokenFromApi(null);
    setMode(defaultMode);
    onClose();
  }

  const isReset = (mode as string) === "reset";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={resetAndClose}
          />
          <motion.div
            className="relative w-full max-w-md glass-strong rounded-2xl shadow-2xl p-7"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
          >
            <button
              onClick={resetAndClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 hover:bg-muted transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl brand-gradient text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {mode === "login" && "Welcome back"}
                {mode === "signup" && "Create your account"}
                {mode === "forgot" && "Reset your password"}
                {isReset && "Set a new password"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login" && "Log in to access your speech dashboard."}
                {mode === "signup" &&
                  "Start analyzing and improving your spoken communication."}
                {mode === "forgot" &&
                  "Enter your email to receive a reset token."}
                {isReset && "Enter a new password to complete the reset."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <Field
                  icon={<UserIcon className="h-4 w-4" />}
                  label="Full name"
                  type="text"
                  value={name}
                  onChange={setName}
                  placeholder="Jane Doe"
                  required
                />
              )}

              {mode !== "forgot" && !isReset && (
                <Field
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  required
                />
              )}

              {mode === "forgot" && (
                <Field
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  required
                />
              )}

              {isReset && !resetTokenFromApi && (
                <Field
                  icon={<Lock className="h-4 w-4" />}
                  label="Reset token"
                  type="text"
                  value={token}
                  onChange={setToken}
                  placeholder="Paste your reset token"
                  required
                />
              )}

              {(mode === "login" || mode === "signup" || isReset) && (
                <Field
                  icon={<Lock className="h-4 w-4" />}
                  label={isReset ? "New password" : "Password"}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  required
                />
              )}

              {resetTokenFromApi && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground break-all">
                  <strong className="text-foreground">Reset token (demo):</strong>{" "}
                  {resetTokenFromApi}
                </div>
              )}

              <Button
                type="submit"
                className="w-full brand-gradient text-white font-semibold h-11"
                disabled={loading}
              >
                {loading && <Spinner className="mr-2" />}
                {mode === "login" && "Log in"}
                {mode === "signup" && "Create account"}
                {mode === "forgot" && "Send reset token"}
                {isReset && "Reset password"}
              </Button>
            </form>

            <div className="mt-5 space-y-2 text-sm text-center text-muted-foreground">
              {mode === "login" && (
                <>
                  <p>
                    Don&apos;t have an account?{" "}
                    <button
                      className="text-primary font-medium hover:underline"
                      onClick={() => setMode("signup")}
                    >
                      Sign up
                    </button>
                  </p>
                  <p>
                    <button
                      className="hover:underline"
                      onClick={() => setMode("forgot")}
                    >
                      Forgot password?
                    </button>
                  </p>
                </>
              )}
              {mode === "signup" && (
                <p>
                  Already have an account?{" "}
                  <button
                    className="text-primary font-medium hover:underline"
                    onClick={() => setMode("login")}
                  >
                    Log in
                  </button>
                </p>
              )}
              {(mode === "forgot" || isReset) && (
                <button
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => {
                    setMode("login");
                    setResetTokenFromApi(null);
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                </button>
              )}
            </div>

            {mode === "signup" && (
              <p className="mt-4 text-[11px] text-center text-muted-foreground/70">
                The first account created becomes the platform admin.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="pl-9 h-11"
        />
      </div>
    </div>
  );
}
