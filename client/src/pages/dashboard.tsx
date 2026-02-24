import { useState } from "react";
import { Layout } from "@/components/layout";
import { useProjects, useCreateProject, useDefectSummary } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-users";
import { useProfile } from "@/hooks/use-profile";
import { Link } from "wouter";
import { 
  Building, 
  MapPin, 
  Calendar as CalendarIcon, 
  Plus, 
  FolderGit2, 
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  address: z.string().min(1, "Adresse ist erforderlich"),
  clientId: z.string().min(1, "Eigentümer ist erforderlich"),
  verwaltungId: z.string().optional(),
  eigentuemer: z.string().optional(),
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
  leichter_mangel: "Leichter Mangel",
  grober_mangel: "Grober Mangel",
};

export default function Dashboard() {
  const { data: projects, isLoading } = useProjects();
  const { data: profile } = useProfile();
  const { data: clients } = useClients();
  const { data: defectSummary } = useDefectSummary();
  const createProject = useCreateProject();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { status: "active" }
  });

  const onSubmit = (data: CreateProjectForm) => {
    createProject.mutate(data, {
      onSuccess: () => setIsDialogOpen(false)
    });
  };

  const isAdmin = profile?.role === "admin";

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

  return (
    <Layout>
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Projektübersicht</h1>
          <p className="text-muted-foreground">Übersicht aller aktiven Baustellen und Dokumentationen.</p>
        </div>
        
        {isAdmin && (
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Projektname</Label>
                  <Input id="name" {...register("name")} className="bg-background border-border focus:ring-primary/20" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input id="address" {...register("address")} className="bg-background border-border focus:ring-primary/20" />
                  {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Eigentümer zuweisen</Label>
                  <Select onValueChange={(val) => setValue("clientId", val)}>
                    <SelectTrigger className="bg-background border-border" data-testid="select-client">
                      <SelectValue placeholder="Eigentümer wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName} ({client.email})
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
                          {client.firstName} {client.lastName} ({client.profile?.company || ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eigentuemer">Eigentümer</Label>
                  <Input id="eigentuemer" {...register("eigentuemer")} placeholder="Name des Eigentümers" className="bg-background border-border focus:ring-primary/20" data-testid="input-eigentuemer" />
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
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <FolderGit2 className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1" data-testid="text-total-label">Projekte gesamt</p>
            <h3 className="text-3xl font-display font-bold text-foreground" data-testid="text-total-count">{projects?.length || 0}</h3>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1" data-testid="text-leichter-label">Leichter Mangel</p>
            <h3 className="text-3xl font-display font-bold text-foreground" data-testid="text-leichter-count">{leichterCount}</h3>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1" data-testid="text-grober-label">Grober Mangel</p>
            <h3 className="text-3xl font-display font-bold text-foreground" data-testid="text-grober-count">{groberCount}</h3>
          </div>
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects?.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card/30">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-foreground mb-1">Keine Projekte gefunden</h3>
            <p className="text-muted-foreground">Ihnen sind noch keine Projekte zugewiesen.</p>
          </div>
        ) : (
          projects?.map((project) => {
            const mangel = getMangelStatus(project.id);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group bg-card border border-border rounded-2xl p-6 hover-elevate cursor-pointer h-full flex flex-col" data-testid={`card-project-${project.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center border border-border">
                      <Building className="w-6 h-6 text-primary" />
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider
                      ${mangel === 'grober_mangel' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        mangel === 'leichter_mangel' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}
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
                          {project.client.firstName?.[0]}{project.client.lastName?.[0]}
                        </div>
                        <div className="text-xs">
                          <p className="text-muted-foreground font-medium uppercase tracking-wider">Eigentümer</p>
                          <p className="text-foreground font-semibold">{project.client.firstName} {project.client.lastName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Layout>
  );
}
