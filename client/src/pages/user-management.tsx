import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAllUsers, useUpdateUserRole, useDeleteUser } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { 
  Users, Shield, UserCog, Trash2, Loader2, Mail, Building, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function UserManagement() {
  const { data: allUsers, isLoading } = useAllUsers();
  const { user: currentUser } = useAuth();
  const { data: profile } = useProfile();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  if (profile?.role !== "admin") {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can access user management.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const handleRoleChange = (userId: string, role: string) => {
    updateRole.mutate({ userId, role }, {
      onSuccess: () => {
        toast({ title: "Role updated", description: `User role changed to ${role}.` });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "User removed", description: `${deleteTarget.name} has been removed.` });
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        setDeleteTarget(null);
      }
    });
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-primary/10 text-primary border-primary/20";
      case "engineer": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "client": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Layout>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <UserCog className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">User Management</h1>
        </div>
        <p className="text-muted-foreground">Manage user accounts and assign roles across the platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Users className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Users</p>
            <h3 className="text-3xl font-display font-bold text-foreground" data-testid="text-total-users">{allUsers?.length || 0}</h3>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Admins</p>
            <h3 className="text-3xl font-display font-bold text-foreground">{allUsers?.filter(u => u.profile?.role === "admin").length || 0}</h3>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Building className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Clients</p>
            <h3 className="text-3xl font-display font-bold text-foreground">{allUsers?.filter(u => u.profile?.role === "client").length || 0}</h3>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display font-bold text-lg">All Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="users-table">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-semibold">User</th>
                <th className="text-left px-6 py-3 font-semibold">Email</th>
                <th className="text-left px-6 py-3 font-semibold">Company</th>
                <th className="text-left px-6 py-3 font-semibold">Role</th>
                <th className="text-right px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allUsers?.map(user => {
                const isCurrentUser = user.id === currentUser?.id;
                const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email || user.id;
                return (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors" data-testid={`user-row-${user.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary border border-border">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{userName}</p>
                          {isCurrentUser && <span className="text-xs text-primary font-medium">(You)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        {user.email || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {user.profile?.company || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {isCurrentUser ? (
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase ${getRoleBadgeClass(user.profile?.role || "client")}`}>
                          {user.profile?.role || "client"}
                        </span>
                      ) : (
                        <Select
                          defaultValue={user.profile?.role || "client"}
                          onValueChange={(val) => handleRoleChange(user.id, val)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs bg-background border-border" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="engineer">Engineer</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: user.id, name: userName })}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!allUsers || allUsers.length === 0) && (
          <div className="p-8 text-center text-muted-foreground">No users found.</div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This action cannot be undone and will remove their profile and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
