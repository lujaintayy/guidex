import { useState } from "react";
import { Users, CheckCircle, XCircle, Clock, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface PendingUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

function useApiFetch() {
  const { token } = useAuth();
  return (url: string, opts?: RequestInit) =>
    fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...opts?.headers } });
}

export default function UserRequestsPage() {
  const { token } = useAuth();
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [roles, setRoles] = useState<Record<number, string>>({});

  const { data: pending = [], isLoading } = useQuery<PendingUser[]>({
    queryKey: ["pending-users"],
    queryFn: async () => {
      const res = await apiFetch("/api/auth/pending-users");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!token,
  });

  const approve = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiFetch("/api/auth/approve", {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      toast({ title: "User approved", description: `Approved as ${vars.role}` });
    },
    onError: (err: Error) => {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    },
  });

  const decline = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiFetch("/api/auth/decline", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      toast({ title: "User declined" });
    },
    onError: (err: Error) => {
      toast({ title: "Decline failed", description: err.message, variant: "destructive" });
    },
  });

  const getRole = (id: number) => roles[id] ?? "engineer";

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">User Requests</h1>
          <p className="text-sm text-muted-foreground">Approve or decline new account requests</p>
        </div>
        {pending.length > 0 && (
          <Badge className="ml-auto bg-amber-500/15 text-amber-400 border-amber-500/20">
            {pending.length} pending
          </Badge>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading requests…
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground mb-1">No pending requests</p>
          <p className="text-sm text-muted-foreground">New registrations will appear here once users verify their email.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(user => (
            <div key={user.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Requested {timeAgo(user.createdAt)}</span>
                  </div>
                </div>

                {/* Badge */}
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0">
                  Pending
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                <div className="flex-1">
                  <Select
                    value={getRole(user.id)}
                    onValueChange={v => setRoles(r => ({ ...r, [user.id]: v }))}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  onClick={() => approve.mutate({ userId: user.id, role: getRole(user.id) })}
                  disabled={approve.isPending || decline.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                  onClick={() => decline.mutate(user.id)}
                  disabled={approve.isPending || decline.isPending}
                >
                  <XCircle className="w-3.5 h-3.5" /> Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="p-4 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
        <strong className="text-foreground">Role permissions:</strong>
        {" "}Engineer can create deployments · Reviewer can approve deployments · Admin manages the organisation.
      </div>
    </div>
  );
}
