import { Layout } from "@/components/layout";
import { useProjects } from "@/hooks/use-projects";
import { ClipboardCheck, Building, Calendar, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function InspectionsGlobal() {
  const { data: projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  const projectsNeedingInspection = projects?.filter(p => p.nextInspectionDue && new Date(p.nextInspectionDue) < new Date()) || [];
  const otherProjects = projects?.filter(p => !projectsNeedingInspection.includes(p)) || [];

  return (
    <Layout>
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Prüfungsverzeichnis</h1>
        <p className="text-muted-foreground">Wählen Sie ein Projekt, um das vollständige Prüfprotokoll einzusehen oder neue Begehungen zu planen.</p>
      </div>

      {projectsNeedingInspection.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl inline-flex shadow-sm">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-display font-bold">Handlungsbedarf: Prüfungen überfällig</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsNeedingInspection.map(project => (
              <ProjectInspectionCard key={project.id} project={project} isUrgent />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-xl font-bold text-foreground mb-6">Alle Projektprotokolle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherProjects.map(project => (
            <ProjectInspectionCard key={project.id} project={project} />
          ))}
          {projects?.length === 0 && (
            <div className="col-span-full p-8 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
              Keine Projekte im Verzeichnis vorhanden.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ProjectInspectionCard({ project, isUrgent = false }: { project: any, isUrgent?: boolean }) {
  return (
    <Link href={`/projects/${project.id}?tab=inspections`}>
      <div className={`group bg-card border rounded-2xl p-6 hover-elevate cursor-pointer h-full flex flex-col transition-all shadow-sm
        ${isUrgent ? 'border-destructive/30 hover:border-destructive/60' : 'border-border'}`}>
        
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
            ${isUrgent ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary'}`}>
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Building className="w-3.5 h-3.5" />
              <span className="truncate">{project.address}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>
              Fällig: {project.nextInspectionDue ? format(new Date(project.nextInspectionDue), 'MMM d, yyyy') : 'Nicht geplant'}
            </span>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
