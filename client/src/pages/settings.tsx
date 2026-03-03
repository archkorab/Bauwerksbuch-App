import { useState } from "react";
import { Layout } from "@/components/layout";
import { useProfile } from "@/hooks/use-profile";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { UserCog, HardDrive, Database, FileArchive, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function SettingsPage() {
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === "admin";
  const [storageDialogOpen, setStorageDialogOpen] = useState(false);

  const { data: storageUsage, isLoading: storageLoading } = useQuery<{
    uploads: { usedBytes: number };
    database: { usedBytes: number };
    totalUsedBytes: number;
    totalAvailableBytes: number;
  }>({
    queryKey: ["/api/storage/usage"],
  });

  const usagePercent = storageUsage
    ? (storageUsage.totalUsedBytes / storageUsage.totalAvailableBytes) * 100
    : 0;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2" data-testid="text-settings-title">Einstellungen</h1>
        <p className="text-muted-foreground">Verwaltung und Systemeinstellungen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {isAdmin && (
          <Link href="/admin/users" className="block" data-testid="link-settings-user-management">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors" data-testid="text-user-management-title">Benutzerverwaltung</h3>
                  <p className="text-sm text-muted-foreground">Benutzer verwalten und Rollen zuweisen</p>
                </div>
              </div>
            </div>
          </Link>
        )}

        <div
          className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
          onClick={() => setStorageDialogOpen(true)}
          data-testid="card-storage-usage"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">Speicherplatz</h3>
              <p className="text-sm text-muted-foreground">
                {storageLoading
                  ? "Wird geladen..."
                  : storageUsage
                    ? `${formatBytes(storageUsage.totalUsedBytes)} / ${formatBytes(storageUsage.totalAvailableBytes)} belegt`
                    : "Übersicht der Speichernutzung"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={storageDialogOpen} onOpenChange={setStorageDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-primary" />
              </div>
              Speicherplatz
            </DialogTitle>
          </DialogHeader>

          {storageLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : storageUsage ? (
            <div className="space-y-5 mt-2">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Belegt</span>
                  <span className="font-semibold text-foreground" data-testid="text-storage-used">
                    {formatBytes(storageUsage.totalUsedBytes)} / {formatBytes(storageUsage.totalAvailableBytes)}
                  </span>
                </div>
                <Progress value={usagePercent} className="h-3" data-testid="progress-storage" />
                <p className="text-xs text-muted-foreground mt-1">{usagePercent.toFixed(1)}% belegt</p>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileArchive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Dateien & Uploads</span>
                  </div>
                  <span className="text-sm font-medium text-foreground" data-testid="text-storage-uploads">
                    {formatBytes(storageUsage.uploads.usedBytes)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Datenbank</span>
                  </div>
                  <span className="text-sm font-medium text-foreground" data-testid="text-storage-database">
                    {formatBytes(storageUsage.database.usedBytes)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Speicherinformationen nicht verfügbar</p>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
