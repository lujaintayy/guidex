import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck, Loader2, Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) { setError("Name must be at least 2 characters"); return; }
    if (!form.email.includes("@")) { setError("Please enter a valid email"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
      setLocation(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
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
            Join your<br />
            <span className="text-primary">team today.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
            Create an account to manage infrastructure, run deployments, and collaborate with your team on GuideX.
          </p>
        </div>
        <div className="mt-12 space-y-3">
          {[
            "Verify your email address",
            "Admin reviews your request",
            "Get access to the platform",
          ].map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
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

          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Create account</h2>
          </div>
          <p className="text-muted-foreground mb-8">Fill in the details below to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="Jane Smith"
                className="mt-1"
                required
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@company.com"
                className="mt-1"
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
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                  required
                  autoComplete="new-password"
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</> : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
