import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Building2, Phone, Save, Loader2, Eye, EyeOff, CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@shared/routes";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/account/profile-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profilbild aktualisiert" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) imageUploadMutation.mutate(file);
  };

  useEffect(() => {
    if (user) {
      setTitle((user as any).title || "");
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
    if (profile) {
      setPhone(profile.phone || "");
      setCompany(profile.company || "");
    }
  }, [user, profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/account/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Update fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: [api.profiles.get.path] });
      toast({ title: "Profil aktualisiert", description: "Ihre Änderungen wurden gespeichert." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ title, firstName, lastName, phone, company });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Fehler", description: "Passwörter stimmen nicht überein", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Fehler", description: "Neues Passwort muss mindestens 6 Zeichen lang sein", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ title, firstName, lastName, phone, company, currentPassword, newPassword });
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    hausverwaltung: "Hausverwaltung",
    eigentuemer: "Eigentümer",
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-profile-title">Mein Profil</h1>
          <p className="text-muted-foreground text-sm mt-1">Persönliche Informationen und Kontoeinstellungen verwalten</p>
        </div>

        <div className="flex items-center gap-5 mb-8 p-5 bg-card border border-border rounded-2xl shadow-sm">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profilbild" className="w-full h-full object-cover" data-testid="img-profile-avatar" />
              ) : (
                (user?.firstName?.[0] || user?.email?.[0] || "?").toUpperCase()
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploadMutation.isPending}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              data-testid="button-upload-avatar"
            >
              {imageUploadMutation.isPending ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              data-testid="input-profile-image"
            />
          </div>
          <div>
            <p className="font-semibold text-foreground" data-testid="text-profile-name">
              {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-profile-email">{user?.email}</p>
            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20" data-testid="text-profile-role">
              {roleLabels[profile?.role || ""] || profile?.role || "—"}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Bild ändern: Hover über das Profilbild</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="bg-card border border-border rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Persönliche Daten</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Titel (z.B. Dr., Ing.)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dr., Mag., DI, ..."
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                data-testid="input-profile-title"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vorname</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                data-testid="input-profile-firstname"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nachname</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                data-testid="input-profile-lastname"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Firma</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="Firmenname"
                  data-testid="input-profile-company"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="+43 1 234 5678"
                  data-testid="input-profile-phone"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="gap-2 rounded-xl"
              data-testid="button-save-profile"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </Button>
          </div>
        </form>

        <form onSubmit={handleChangePassword} className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Passwort ändern</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktuelles Passwort</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-12"
                  placeholder="••••••••"
                  data-testid="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Neues Passwort</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-12"
                    placeholder="Min. 6 Zeichen"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passwort bestätigen</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-12"
                    placeholder="Passwort wiederholen"
                    data-testid="input-confirm-password"
                  />
                  {confirmPassword && newPassword === confirmPassword && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending || !currentPassword || !newPassword}
              variant="outline"
              className="gap-2 rounded-xl"
              data-testid="button-change-password"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Passwort ändern
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
