import { useState } from "react";
import { Plus, Users, Building2, Shield, Trash2, CheckCircle2, AlertCircle, UserPlus, X, Loader2 } from "lucide-react";
import { useGetOrganization, useListOrgMembers, useAddOrgMember, useUpdateOrgMember, useRemoveOrgMember, getGetOrganizationQueryKey, getListOrgMembersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

const ROLE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  admin:    { label: "Admin",    color: "bg-red-400/10 text-red-400",    description: "Full access including org management" },
  reviewer: { label: "Reviewer", color: "bg-amber-400/10 text-amber-400", description: "Can approve or reject deployments" },
  engineer: { label: "Engineer", color: "bg-blue-400/10 text-blue-400",  description: "Can create and execute deployments" },
};

function Toast({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium
      ${type === "success" ? "bg-emerald-950 border-emerald-800 text-emerald-300" : "bg-red-950 border-red-800 text-red-300"}`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">×</button>
    </div>
  );
}

// ── Create Account Dialog (admin-direct) ──────────────────────────────────────
function CreateAccountDialog({
  orgId, onClose, onSuccess,
}: {
  orgId: number; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "engineer" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("All fields are required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setCreating(true);
    try {
      const stored = localStorage.getItem("infra-auth");
      const token = stored ? JSON.parse(stored).token ?? "" : "";
      const res = await fetch("/api/auth/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create account");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Create Account</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Create an account directly without requiring the user to self-register. The account will be immediately active.
          </p>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
            <Input placeholder="Jane Smith" value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Address *</label>
            <Input type="email" placeholder="jane@company.com" value={form.email} onChange={e => set("email", e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Temporary Password *</label>
            <Input type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => set("password", e.target.value)} required />
            <p className="text-[10px] text-muted-foreground mt-1">Share this with the user — they can change it after logging in.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Role *</label>
            <select
              value={form.role}
              onChange={e => set("role", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="engineer">Engineer — can create and execute deployments</option>
              <option value="reviewer">Reviewer — can approve or reject deployments</option>
              <option value="admin">Admin — full access including org management</option>
            </select>
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create Account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Member row — isolated per-row mutations so one row's state never bleeds into another ──
function MemberRow({
  member, orgId, onRemoved, onRoleChanged,
}: {
  member: any;
  orgId: number;
  onRemoved: () => void;
  onRoleChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Each row owns its own mutation instance — no shared state between rows
  const removeMember = useRemoveOrgMember({
    mutation: { onSuccess: onRemoved },
  });
  const updateRole = useUpdateOrgMember({
    mutation: { onSuccess: onRoleChanged },
  });

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    removeMember.mutate({ orgId, userId: member.userId } as any);
    setConfirmDelete(false);
  };

  const handleRoleChange = (newRole: string) => {
    updateRole.mutate({ orgId, userId: member.userId, data: { role: newRole } } as any);
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground shrink-0">
        {(member.name ?? member.email ?? "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{member.name ?? member.email}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>

      <select
        value={member.role}
        onChange={e => handleRoleChange(e.target.value)}
        disabled={updateRole.isPending}
        className="h-7 rounded-md border border-border bg-background text-xs px-2 text-foreground disabled:opacity-50"
      >
        <option value="engineer">Engineer</option>
        <option value="reviewer">Reviewer</option>
        <option value="admin">Admin</option>
      </select>

      {confirmDelete ? (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-destructive mr-1">Remove?</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            disabled={removeMember.isPending}
            onClick={handleDelete}
          >
            {removeMember.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setConfirmDelete(false)}
          >
            No
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive shrink-0"
          disabled={removeMember.isPending}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function OrganizationPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");
  const [inviting, setInviting] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: org } = useGetOrganization(orgId, { query: { queryKey: getGetOrganizationQueryKey(orgId) } });
  const { data: members, isLoading } = useListOrgMembers(orgId, { query: { queryKey: getListOrgMembersQueryKey(orgId) } });
  const allMembers = (members ?? []) as any[];

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const refreshMembers = () => qc.invalidateQueries({ queryKey: getListOrgMembersQueryKey(orgId) });

  const addMember = useAddOrgMember({
    mutation: {
      onSuccess: () => {
        refreshMembers();
        setInviteEmail("");
        setInviting(false);
        showToast("success", "Member added successfully");
      },
      onError: (err: any) => {
        setInviting(false);
        const status = err?.response?.status ?? err?.status;
        if (status === 404) {
          showToast("error", "No account with that email — use 'Create Account' to set one up directly.");
        } else if (status === 409) {
          showToast("error", "This user is already a member of your organisation.");
        } else {
          showToast("error", err?.message ?? "Failed to add member. Please try again.");
        }
      },
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    addMember.mutate({ orgId, data: { email: inviteEmail, role: inviteRole } } as any);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {showCreateAccount && (
        <CreateAccountDialog
          orgId={orgId}
          onClose={() => setShowCreateAccount(false)}
          onSuccess={() => {
            refreshMembers();
            showToast("success", "Account created successfully");
          }}
        />
      )}

      {/* Org header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{org?.name ?? "Organisation"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{allMembers.length} member{allMembers.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreateAccount(true)}>
          <UserPlus className="w-4 h-4 mr-2" />Create Account
        </Button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <div key={role} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{cfg.description}</p>
            <p className="text-2xl font-bold text-foreground mt-2">
              {allMembers.filter((m: any) => m.role === role).length}
            </p>
          </div>
        ))}
      </div>

      {/* Add existing member */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add existing member
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Enter the email of someone who already has a GuideX account. To create a new account, use the <strong>Create Account</strong> button above.
        </p>
        <form onSubmit={handleInvite} className="flex items-center gap-3">
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1"
            required
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="h-9 rounded-md border border-border bg-background text-sm px-2 text-foreground"
          >
            <option value="engineer">Engineer</option>
            <option value="reviewer">Reviewer</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit" size="sm" disabled={inviting}>
            {inviting ? "Adding…" : "Add"}
          </Button>
        </form>
      </div>

      {/* Members list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-sm">Members</h2>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : allMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No members yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Create or add team members above</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allMembers.map((m: any) => (
              <MemberRow
                key={m.userId ?? m.email}
                member={m}
                orgId={orgId}
                onRemoved={() => {
                  refreshMembers();
                  showToast("success", `${m.name ?? m.email} removed`);
                }}
                onRoleChanged={refreshMembers}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
