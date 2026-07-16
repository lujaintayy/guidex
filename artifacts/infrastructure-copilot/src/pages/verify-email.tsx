import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ShieldCheck, Loader2, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => { refs[0].current?.focus(); }, []);

  const handleDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs[i - 1].current?.focus();
    if (e.key === "ArrowRight" && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text) {
      const next = [...digits];
      [...text].forEach((ch, idx) => { if (idx < 6) next[idx] = ch; });
      setDigits(next);
      refs[Math.min(text.length, 5)].current?.focus();
    }
  };

  const code = digits.join("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) { setError("Please enter the full 6-digit code"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verification failed"); return; }
      setLocation("/awaiting-approval");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(false);
    setError("");
    try {
      // Re-trigger register with same email to resend OTP
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: "Resend", password: "placeholder123" }),
      });
      setResent(true);
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-foreground">GuideX</span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
        <p className="text-muted-foreground mb-2">
          We sent a 6-digit verification code to
        </p>
        <p className="text-foreground font-semibold mb-8">{email || "your email address"}</p>

        <form onSubmit={handleSubmit}>
          {/* OTP input boxes */}
          <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          {resent && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
              A new code has been sent to your email.
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</> : "Verify email"}
          </Button>
        </form>

        <button
          onClick={handleResend}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mx-auto mt-4 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Resend code
        </button>
      </div>
    </div>
  );
}
