import { useState } from "react";
import { Layout } from "@/components/layout";
import { displayName } from "@/lib/utils";
import { useAllUsers, useUpdateUserRole, useDeleteUser, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { useProjects } from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { 
  Users, Shield, UserCog, Trash2, Loader2, Mail, Building, AlertTriangle, UserPlus, Home, Briefcase, Pencil, Lock, Eye, EyeOff, LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";

export default function UserManagement() {
  const { data: allUsers, isLoading } = useAllUsers();
  const { data: allProjects } = useProjects();
  const { user: currentUser, impersonate } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile } = useProfile();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { title: "", firstName: "", lastName: "", email: "", role: "hausverwaltung", company: "", phone: "", password: "" }
  });
  const selectedRole = watch("role");

  const { register: editReg, handleSubmit: handleEditSubmit, reset: resetEdit, setValue: setEditValue, watch: watchEdit } = useForm({
    defaultValues: { title: "", firstName: "", lastName: "", email: "", role: "eigentuemer", company: "", phone: "", newPassword: "" }
  });
  const editRole = watchEdit("role");

  const openEditDialog = (user: any) => {
    resetEdit({
      title: user.title || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.profile?.role || "eigentuemer",
      company: user.profile?.company || "",
      phone: user.profile?.phone || "",
      newPassword: "",
    });
    setShowEditPw(false);
    setEditTarget(user);
  };

  const onEditUser = (data: any) => {
    if (!editTarget) return;
    const payload = { ...data };
    if (!payload.newPassword) delete payload.newPassword;
    updateUser.mutate({ userId: editTarget.id, data: payload }, {
      onSuccess: () => {
        toast({ title: "Benutzer aktualisiert", description: `${data.firstName} ${data.lastName} wurde aktualisiert.` });
        setEditTarget(null);
      },
      onError: (err: any) => {
        toast({ title: "Fehler", description: err.message, variant: "destructive" });
      }
    });
  };

  if (profile?.role !== "admin") {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Zugriff verweigert</h2>
            <p className="text-muted-foreground">Nur Administratoren haben Zugriff auf die Benutzerverwaltung.</p>
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
        toast({ title: "Rolle aktualisiert", description: `Benutzerrolle geändert zu ${roleLabels[role] || role}.` });
      },
      onError: (err: any) => {
        toast({ title: "Fehler", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Benutzer entfernt", description: `${deleteTarget.name} wurde entfernt.` });
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast({ title: "Fehler", description: err.message, variant: "destructive" });
        setDeleteTarget(null);
      }
    });
  };

  const onAddUser = (data: any) => {
    createUser.mutate(data, {
      onSuccess: () => {
        toast({ title: "Benutzer erstellt", description: `${data.firstName} ${data.lastName} wurde hinzugefügt.` });
        setAddUserOpen(false);
        reset();
      },
      onError: (err: any) => {
        toast({ title: "Fehler", description: err.message, variant: "destructive" });
      }
    });
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    hausverwaltung: "Hausverwaltung",
    eigentuemer: "Eigentümer",
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-primary/10 text-primary border-primary/20";
      case "hausverwaltung": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "eigentuemer": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getProjectCount = (userId: string) => {
    if (!allProjects) return 0;
    return allProjects.filter(p => p.clientId === userId || p.verwaltungId === userId).length;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="w-7 h-7 text-primary" />;
      case "hausverwaltung": return <Building className="w-7 h-7 text-amber-500" />;
      case "eigentuemer": return <Home className="w-7 h-7 text-emerald-500" />;
      default: return <Users className="w-7 h-7 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <UserCog className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Benutzerverwaltung</h1>
            </div>
            <p className="text-muted-foreground">Benutzerkonten verwalten und Rollen auf der Plattform zuweisen.</p>
          </div>
          <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-user">
                <UserPlus className="w-4 h-4" /> Benutzer hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Neuen Benutzer hinzufügen</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onAddUser)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Titel (optional)</Label>
                  <Input {...register("title")} placeholder="Dr., Mag., DI, ..." className="bg-background" data-testid="input-user-title" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vorname</Label>
                    <Input {...register("firstName")} className="bg-background" data-testid="input-user-firstname" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nachname</Label>
                    <Input {...register("lastName")} className="bg-background" data-testid="input-user-lastname" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input {...register("email")} type="email" required className="bg-background" data-testid="input-user-email" />
                </div>
                <div className="space-y-2">
                  <Label>Rolle</Label>
                  <Select value={selectedRole} onValueChange={(val) => setValue("role", val)}>
                    <SelectTrigger className="bg-background border-border" data-testid="select-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hausverwaltung">Hausverwaltung</SelectItem>
                      <SelectItem value="eigentuemer">Eigentümer</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unternehmen (optional)</Label>
                  <Input {...register("company")} className="bg-background" data-testid="input-user-company" />
                </div>
                <div className="space-y-2">
                  <Label>Telefon (optional)</Label>
                  <Input {...register("phone")} className="bg-background" data-testid="input-user-phone" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Passwort (optional)</Label>
                  <div className="relative">
                    <Input
                      {...register("password")}
                      type={showCreatePw ? "text" : "password"}
                      placeholder="Standard: changeme123"
                      className="bg-background pr-10"
                      data-testid="input-user-password"
                    />
                    <button type="button" onClick={() => setShowCreatePw(!showCreatePw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCreatePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Leer lassen für Standardpasswort „changeme123"</p>
                </div>
                <Button type="submit" className="w-full" disabled={createUser.isPending} data-testid="button-submit-user">
                  {createUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Benutzer erstellen
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {(["admin", "hausverwaltung", "eigentuemer"] as const).map((role) => (
          <div key={role} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${getRoleBadgeClass(role)}`}>
              {getRoleIcon(role)}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{roleLabels[role]}</p>
              <h3 className="text-3xl font-display font-bold text-foreground">{allUsers?.filter(u => u.profile?.role === role).length || 0}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display font-bold text-lg">Alle Benutzer</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="users-table">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-semibold">Benutzer</th>
                <th className="text-left px-6 py-3 font-semibold">E-Mail</th>
                <th className="text-left px-6 py-3 font-semibold">Unternehmen</th>
                <th className="text-center px-6 py-3 font-semibold">Projekte</th>
                <th className="text-left px-6 py-3 font-semibold">Rolle</th>
                <th className="text-right px-6 py-3 font-semibold">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allUsers?.map(user => {
                const isCurrentUser = user.id === currentUser?.id;
                const userName = displayName(user);
                return (
                  <tr key={user.id} className="hover:bg-muted/40 transition-colors" data-testid={`user-row-${user.id}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{userName}</p>
                        {isCurrentUser && <span className="text-xs text-primary font-medium">(Sie)</span>}
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
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-muted border border-border text-foreground" data-testid={`text-project-count-${user.id}`}>
                        {getProjectCount(user.id)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isCurrentUser ? (
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase ${getRoleBadgeClass(user.profile?.role || "eigentuemer")}`}>
                          {roleLabels[user.profile?.role || "eigentuemer"] || user.profile?.role}
                        </span>
                      ) : (
                        <Select
                          defaultValue={user.profile?.role || "eigentuemer"}
                          onValueChange={(val) => handleRoleChange(user.id, val)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs bg-background border-border" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hausverwaltung">Hausverwaltung</SelectItem>
                            <SelectItem value="eigentuemer">Eigentümer</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                            title="Als Benutzer anmelden"
                            onClick={() => impersonate.mutate(user.id, {
                              onSuccess: () => setLocation("/projects"),
                            })}
                            disabled={impersonate.isPending}
                            data-testid={`button-impersonate-${user.id}`}
                          >
                            <LogIn className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openEditDialog(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!allUsers || allUsers.length === 0) && (
          <div className="p-8 text-center text-muted-foreground">Keine Benutzer gefunden.</div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Benutzer entfernen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie <strong>{deleteTarget?.name}</strong> entfernen möchten? Diese Aktion kann nicht rückgängig gemacht werden und entfernt das Profil sowie alle zugehörigen Daten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Benutzer entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Benutzer bearbeiten</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit(onEditUser)} className="space-y-4">
            <div className="space-y-2">
              <Label>Titel (optional)</Label>
              <Input {...editReg("title")} placeholder="Dr., Mag., DI, ..." className="bg-background" data-testid="input-edit-user-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vorname {!watchEdit("company") && <span className="text-destructive">*</span>}</Label>
                <Input {...editReg("firstName")} required={!watchEdit("company")} className="bg-background" data-testid="input-edit-user-firstname" />
              </div>
              <div className="space-y-2">
                <Label>Nachname {!watchEdit("company") && <span className="text-destructive">*</span>}</Label>
                <Input {...editReg("lastName")} required={!watchEdit("company")} className="bg-background" data-testid="input-edit-user-lastname" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input {...editReg("email")} type="email" required className="bg-background" data-testid="input-edit-user-email" />
            </div>
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select value={editRole} onValueChange={(val) => setEditValue("role", val)}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hausverwaltung">Hausverwaltung</SelectItem>
                  <SelectItem value="eigentuemer">Eigentümer</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unternehmen (optional)</Label>
              <Input {...editReg("company")} className="bg-background" data-testid="input-edit-user-company" />
            </div>
            <div className="space-y-2">
              <Label>Telefon (optional)</Label>
              <Input {...editReg("phone")} className="bg-background" data-testid="input-edit-user-phone" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Neues Passwort (optional)</Label>
              <div className="relative">
                <Input
                  {...editReg("newPassword")}
                  type={showEditPw ? "text" : "password"}
                  placeholder="Leer lassen, um Passwort nicht zu ändern"
                  className="bg-background pr-10"
                  minLength={6}
                  data-testid="input-edit-user-password"
                />
                <button type="button" onClick={() => setShowEditPw(!showEditPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showEditPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Min. 6 Zeichen. Leer lassen, um das aktuelle Passwort beizubehalten.</p>
            </div>
            <Button type="submit" className="w-full" disabled={updateUser.isPending} data-testid="button-submit-edit-user">
              {updateUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
              Änderungen speichern
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
