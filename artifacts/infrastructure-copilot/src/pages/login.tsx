import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Handle specific statuses
        if (data.status === "pending_verification") {
          setLocation(`/verify-email?email=${encodeURIComponent(email.trim())}`);
          return;
        }
        if (data.status === "pending_approval") {
          setLocation("/awaiting-approval");
          return;
        }
        setError(data.error ?? "Invalid email or password");
        return;
      }
      login(data.user, data.token);
      setLocation("/");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-sidebar border-r border-border p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-foreground">GuideX</p>
            <p className="text-xs text-muted-foreground">Enterprise Platform</p>
          </div>
        </div>
        <div className="mb-auto mt-16">
          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Deploy with<br />
            <span className="text-primary">confidence.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
            AI-powered infrastructure management for production-grade teams. Plan, validate, deploy, and monitor with full audit trails.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">GuideX</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1"
                data-testid="input-email"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  data-testid="input-password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
                : "Sign in"
              }
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
