import { ShieldCheck, Clock, Mail, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AwaitingApprovalPage() {
  const handleLogout = () => {
    // Clear any stored state
    localStorage.removeItem("infra-auth");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-foreground">GuideX</span>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">Request under review</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Your email has been verified. An administrator will review your request and assign you a role.
          You'll receive an email once your account has been approved.
        </p>

        {/* Steps */}
        <div className="rounded-xl border border-border bg-card p-5 mb-8 text-left space-y-4">
          {[
            { icon: ShieldCheck, label: "Account created", done: true },
            { icon: Mail, label: "Email verified", done: true },
            { icon: Clock, label: "Awaiting admin approval", done: false, active: true },
          ].map(({ icon: Icon, label, done, active }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                done
                  ? "bg-emerald-500/15 border border-emerald-500/30"
                  : active
                  ? "bg-amber-500/15 border border-amber-500/30"
                  : "bg-muted border border-border"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${done ? "text-emerald-400" : active ? "text-amber-400" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-sm ${done || active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {done && <span className="ml-auto text-xs text-emerald-400 font-medium">Done</span>}
              {active && <span className="ml-auto text-xs text-amber-400 font-medium">In progress</span>}
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Contact your administrator if you have been waiting more than 24 hours.
        </p>

        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" /> Back to login
        </Button>
      </div>
    </div>
  );
}
