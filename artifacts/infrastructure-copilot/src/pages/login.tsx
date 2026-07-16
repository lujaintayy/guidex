import { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
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

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data: any) => {
        login(data.user, data.token);
        setLocation("/");
      },
      onError: () => {
        setError("Invalid email or password. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } });
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
        <div className="grid grid-cols-3 gap-4 mt-12">
          {[
            { label: "Deployments", value: "2,400+" },
            { label: "Success Rate", value: "99.2%" },
            { label: "Servers Managed", value: "850+" },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-primary">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
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
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  data-testid="input-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-submit">
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
