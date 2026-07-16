import { useState } from "react";
import { Plus, Users, Building2, Shield, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { useGetOrganization, useListOrgMembers, useAddOrgMember, useUpdateOrgMember, useRemoveOrgMember, getGetOrganizationQueryKey, getListOrgMembersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

const ROLE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  admin: { label: "Admin", color: "bg-red-400/10 text-red-400", description: "Full access including org management" },
  reviewer: { label: "Reviewer", color: "bg-amber-400/10 text-amber-400", description: "Can approve or reject deployments" },
  engineer: { label: "Engineer", color: "bg-blue-400/10 text-blue-400", description: "Can create and execute deployments" },
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

export default function OrganizationPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: org } = useGetOrganization(orgId, { query: { queryKey: getGetOrganizationQueryKey(orgId) } });
  const { data: members, isLoading } = useListOrgMembers(orgId, { query: { queryKey: getListOrgMembersQueryKey(orgId) } });
  const allMembers = (members ?? []) as any[];

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const addMember = useAddOrgMember({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListOrgMembersQueryKey(orgId) });
        setInviteEmail("");
        setInviting(false);
        showToast("success", "Member added successfully");
      },
      onError: (err: any) => {
        setInviting(false);
        const status = err?.response?.status ?? err?.status;
        if (status === 404) {
          showToast("error", "No account found for this email. Ask them to register first, then add them here.");
        } else if (status === 409) {
          showToast("error", "This user is already a member of your organisation.");
        } else {
          showToast("error", err?.message ?? "Failed to add member. Please try again.");
        }
      },
    },
  });

  const updateRole = useUpdateOrgMember({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListOrgMembersQueryKey(orgId) }) } });
  const removeMember = useRemoveOrgMember({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListOrgMembersQueryKey(orgId) }) } });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    addMember.mutate({ orgId, data: { email: inviteEmail, role: inviteRole } } as any);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Org header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{org?.name ?? "Organisation"}</h1>
          <p className="text-muted-foreground text-sm mt-1">{allMembers.length} member{allMembers.length !== 1 ? "s" : ""}</p>
        </div>
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

      {/* Invite form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add a member
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          The person must already have a GuideX account. If they haven't registered yet, ask them to sign up first.
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
            {inviting ? "Adding…" : "Add Member"}
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
            <p className="text-sm text-muted-foreground/60 mt-1">Add your first team member above</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allMembers.map((m: any) => (
              <div key={m.userId ?? m.email} className="flex items-center gap-4 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                  {(m.name ?? m.email ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name ?? m.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <select
                  value={m.role}
                  onChange={e => updateRole.mutate({ orgId, userId: m.userId, data: { role: e.target.value } } as any)}
                  className="h-7 rounded-md border border-border bg-background text-xs px-2 text-foreground"
                >
                  <option value="engineer">Engineer</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeMember.mutate({ orgId, userId: m.userId } as any)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
