import { useState } from "react";
import { Layout } from "@/components/layout";
import { displayName, displayInitials, formatAddr } from "@/lib/utils";
import { useProjects, useCreateProject, useDefectSummary } from "@/hooks/use-projects";
import { useAllInspections } from "@/hooks/use-inspections";
import { useClients } from "@/hooks/use-users";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  Building, 
  MapPin, 
  Calendar as CalendarIcon, 
  Plus, 
  FolderGit2, 
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LayoutGrid,
  List,
  Search,
  Clock,
  ChevronRight,
  FolderPlus
} from "lucide-react";
import { format, isFuture, isToday, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().default(""),
  address: z.string().min(1, "Adresse ist erforderlich"),
  clientId: z.string().min(1, "User ist erforderlich"),
  verwaltungId: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

const statusLabels: Record<string, string> = {
  active: "Aktiv",
  completed: "Abgeschlossen",
  archived: "Archiviert",
};

const mangelLabels: Record<string, string> = {
  kein_mangel: "Kein Mangel",
  leichter_mangel: "Leichter M.",
  grober_mangel: "Schwerer M.",
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = useProjects();
  const { data: allInspections } = useAllInspections();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { data: clients } = useClients();
  const { data: defectSummary } = useDefectSummary();
  const createProject = useCreateProject();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { status: "active", address: "", name: "" }
  });
  const addressValue = watch("address");

  const onSubmit = (data: CreateProjectForm) => {
    createProject.mutate(data, {
      onSuccess: () => setIsDialogOpen(false)
    });
  };

  const isAdmin = profile?.role === "admin";
  const canCreateProject = isAdmin || profile?.role === "hausverwaltung" || profile?.role === "eigentuemer";

  const getMangelStatus = (projectId: number) => {
    if (!defectSummary) return "kein_mangel";
    const entry = defectSummary.find(s => s.projectId === projectId);
    return entry?.mangelStatus || "kein_mangel";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const leichterCount = defectSummary?.filter(s => s.mangelStatus === "leichter_mangel").length || 0;
  const groberCount = defectSummary?.filter(s => s.mangelStatus === "grober_mangel").length || 0;

  const filteredProjects = projects?.filter(p => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.address.toLowerCase().includes(s);
  });

  return (
    <Layout>
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">
            Projektübersicht
            {(profile?.role === "hausverwaltung" || profile?.role === "eigentuemer") && user && (
              <span className="text-muted-foreground font-normal text-xl ml-3">
                – {user.firstName ? `${user.firstName} ${user.lastName}` : (profile?.company || user.email || '')}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">Übersicht aller Bauwerksbücher</p>
        </div>
        
        {canCreateProject && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" data-testid="button-add-project">
                <Plus className="w-4 h-4 mr-2" /> Projekt hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Neues Projekt erstellen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit((data) => onSubmit({ ...data, name: data.address }))} className="space-y-6 mt-4">
                <input type="hidden" {...register("name")} />
                
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <AddressAutocomplete
                    id="address"
                    value={addressValue}
                    onChange={(val) => { setValue("address", val); setValue("name", val); }}
                    className="bg-background border-border focus:ring-primary/20"
                    data-testid="input-address"
                  />
                  {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>User zuweisen</Label>
                  <Select onValueChange={(val) => setValue("clientId", val)}>
                    <SelectTrigger className="bg-background border-border" data-testid="select-client">
                      <SelectValue placeholder="User wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {displayName(client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Verwaltung</Label>
                  <Select onValueChange={(val) => setValue("verwaltungId", val)}>
                    <SelectTrigger className="bg-background border-border" data-testid="select-verwaltung">
                      <SelectValue placeholder="Verwaltung wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {displayName(client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                <Button type="submit" className="w-full" disabled={createProject.isPending}>
                  {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Projekt erstellen
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <FolderGit2 className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1" data-testid="text-total-label">Projekte gesamt</p>
            <h3 className="text-3xl font-display font-bold text-foreground" data-testid="text-total-count">{projects?.length || 0}</h3>
          </div>
        </div>
        <div
          className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 cursor-pointer hover:border-amber-500/40 transition-colors"
          onClick={() => navigate("/projects?mangel=leichter_mangel")}
          data-testid="card-leichter-mangel"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1" data-testid="text-leichter-label">Liegenschaften mit leichtem Mangel</p>
            <h3 className="text-3xl font-display font-bold text-foreground" data-testid="text-leichter-count">{leichterCount}</h3>
          </div>
        </div>
        <div
          className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 cursor-pointer hover:border-red-500/40 transition-colors"
          onClick={() => navigate("/projects?mangel=grober_mangel")}
          data-testid="card-grober-mangel"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1" data-testid="text-grober-label">Liegenschaften mit schwerem Mangel</p>
            <h3 className="text-3xl font-display font-bold text-foreground" data-testid="text-grober-count">{groberCount}</h3>
          </div>
        </div>
      </div>

      {/* Preview Columns: Upcoming Inspections & Recent Projects */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <Clock className="w-5 h-5 text-primary" /> Anstehende Prüfungen
            </h2>
            <Link href="/calendar">
              <span className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1" data-testid="link-all-inspections">
                Alle anzeigen <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          {(() => {
            const upcomingProjects = (projects || [])
              .filter((p) => p.nextInspectionDue && (isFuture(new Date(p.nextInspectionDue)) || isToday(new Date(p.nextInspectionDue))))
              .sort((a, b) => new Date(a.nextInspectionDue!).getTime() - new Date(b.nextInspectionDue!).getTime())
              .slice(0, 5);
            const overdueProjects = (projects || [])
              .filter((p) => p.nextInspectionDue && !isFuture(new Date(p.nextInspectionDue)) && !isToday(new Date(p.nextInspectionDue)))
              .sort((a, b) => new Date(a.nextInspectionDue!).getTime() - new Date(b.nextInspectionDue!).getTime())
              .slice(0, 3);
            const combined = [...overdueProjects, ...upcomingProjects];
            if (combined.length === 0) {
              return <p className="text-sm text-muted-foreground text-center py-6">Keine anstehenden Prüfungen.</p>;
            }
            return (
              <div className="space-y-3">
                {combined.map((p) => {
                  const due = new Date(p.nextInspectionDue!);
                  const days = differenceInDays(due, new Date());
                  const isOverdue = days < 0;
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <div className={`flex items-center gap-4 rounded-xl p-3 cursor-pointer transition-colors ${isOverdue ? "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30" : "hover:bg-muted/50"}`} data-testid={`preview-upcoming-${p.id}`}>
                        <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 text-center ${isOverdue ? "bg-red-100 dark:bg-red-900/40" : "bg-primary/10"}`}>
                          <span className={`text-[10px] font-bold uppercase leading-none ${isOverdue ? "text-red-500" : "text-primary"}`}>{format(due, 'MMM', { locale: de })}</span>
                          <span className={`text-base font-bold leading-tight ${isOverdue ? "text-red-600 dark:text-red-400" : "text-primary"}`}>{format(due, 'd')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{p.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{formatAddr(p.address)}</p>
                        </div>
                        {isOverdue ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {Math.abs(days)}d überfällig
                          </span>
                        ) : (
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${days <= 30 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                            {days === 0 ? "Heute" : `In ${days}d`}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <FolderPlus className="w-5 h-5 text-primary" /> Letzte Prüfungen
            </h2>
            <Link href="/projekte">
              <span className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1" data-testid="link-all-projects">
                Alle Projekte <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          {(() => {
            const recentProjects = [...(projects || [])]
              .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
              .slice(0, 5);
            if (recentProjects.length === 0) {
              return <p className="text-sm text-muted-foreground text-center py-6">Keine Projekte vorhanden.</p>;
            }
            return (
              <div className="space-y-3">
                {recentProjects.map((p) => {
                  const mangel = getMangelStatus(p.id);
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <div className="flex items-center gap-4 rounded-xl p-3 hover:bg-muted/50 cursor-pointer transition-colors" data-testid={`preview-recent-${p.id}`}>
                        <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{p.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{formatAddr(p.address)}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${mangel === 'grober_mangel' ? 'bg-red-500/10 text-red-600 border-red-500/20' : mangel === 'leichter_mangel' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                            {mangelLabels[mangel]}
                          </span>
                          {p.createdAt && (
                            <span className="text-[10px] text-muted-foreground">{format(new Date(p.createdAt), 'dd.MM.yyyy', { locale: de })}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Search & View Toggle */}
      <div className="flex items-center justify-end mb-6 gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Projekt suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
            data-testid="input-search-projects"
          />
        </div>
        <Button
          variant={viewMode === "grid" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("grid")}
          className="px-3"
          data-testid="button-view-grid"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("list")}
          className="px-3"
          data-testid="button-view-list"
        >
          <List className="w-4 h-4" />
        </Button>
      </div>

      {/* Projects */}
      {filteredProjects?.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card/30">
          <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground mb-1">{search ? "Keine Ergebnisse" : "Keine Projekte gefunden"}</h3>
          <p className="text-muted-foreground">{search ? "Versuchen Sie einen anderen Suchbegriff." : "Ihnen sind noch keine Projekte zugewiesen."}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects?.map((project) => {
            const mangel = getMangelStatus(project.id);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group bg-card border border-border rounded-2xl p-6 hover-elevate cursor-pointer h-full flex flex-col" data-testid={`card-project-${project.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center border border-border">
                      <Building className="w-6 h-6 text-primary" />
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider
                      ${mangel === 'grober_mangel' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                        mangel === 'leichter_mangel' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}
                      data-testid={`badge-mangel-${project.id}`}>
                      {mangelLabels[mangel]}
                    </span>
                  </div>
                  
                  <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                  
                  <div className="space-y-3 mt-auto pt-4">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{project.address}</span>
                    </div>
                    
                    {project.nextInspectionDue && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        <span>Nächste Prüfung: <strong className="text-foreground">{format(new Date(project.nextInspectionDue), 'dd.MM.yyyy')}</strong></span>
                      </div>
                    )}
                    
                    {isAdmin && project.client && (
                      <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">
                          {displayInitials(project.client)}
                        </div>
                        <div className="text-xs">
                          <p className="text-muted-foreground font-medium uppercase tracking-wider">User</p>
                          <p className="text-foreground font-semibold">{displayName(project.client)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Projekt</th>
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Adresse</th>
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Nächste Prüfung</th>
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Status</th>
                {isAdmin && <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">User</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProjects?.map((project) => {
                const mangel = getMangelStatus(project.id);
                return (
                  <tr key={project.id} className="hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => window.location.href = `/projects/${project.id}`} data-testid={`row-project-${project.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center border border-border">
                          <Building className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{project.address}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {project.nextInspectionDue ? format(new Date(project.nextInspectionDue), 'dd.MM.yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border uppercase tracking-wider
                        ${mangel === 'grober_mangel' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                          mangel === 'leichter_mangel' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                          'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}
                        data-testid={`badge-mangel-list-${project.id}`}>
                        {mangelLabels[mangel]}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-muted-foreground">
                        {project.client ? `${project.client.firstName} ${project.client.lastName}` : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
