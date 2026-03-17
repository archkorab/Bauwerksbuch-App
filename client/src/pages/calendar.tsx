import { Layout } from "@/components/layout";
import { useProjects } from "@/hooks/use-projects";
import { useAllInspections } from "@/hooks/use-inspections";
import { format, isFuture, differenceInDays, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Building, ChevronRight, Loader2, AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";
import { formatAddr } from "@/lib/utils";
import type { Project, Inspection } from "@shared/schema";

const inspTypeLabels: Record<string, string> = {
  erstpruefung: "Erstprüfung",
  folgepruefung: "Folgeprüfung",
};

const inspStatusLabels: Record<string, string> = {
  OK: "OK",
  needs_repair: "Leichter Mangel",
  urgent: "Schwerer Mangel",
};

function statusBadge(status: string) {
  switch (status) {
    case "OK":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" /> {inspStatusLabels[status]}
        </span>
      );
    case "needs_repair":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          <AlertTriangle className="w-3 h-3" /> {inspStatusLabels[status]}
        </span>
      );
    case "urgent":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="w-3 h-3" /> {inspStatusLabels[status]}
        </span>
      );
    default:
      return null;
  }
}

function dueBadge(dueDate: Date) {
  const days = differenceInDays(dueDate, new Date());
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="w-3 h-3" /> {Math.abs(days)} Tage überfällig
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Clock className="w-3 h-3" /> In {days} Tagen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      <CalendarIcon className="w-3 h-3" /> In {days} Tagen
    </span>
  );
}

export default function CalendarPage() {
  const { data: projects, isLoading: projLoading } = useProjects();
  const { data: allInspections, isLoading: inspLoading } = useAllInspections();

  const isLoading = projLoading || inspLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  const projectList: Project[] = projects || [];
  const inspections: Inspection[] = allInspections || [];

  const inspByProject = new Map<number, Inspection[]>();
  for (const ins of inspections) {
    const list = inspByProject.get(ins.projectId) || [];
    list.push(ins);
    inspByProject.set(ins.projectId, list);
  }

  for (const [key, list] of inspByProject) {
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const projectsWithUpcoming = projectList
    .filter((p) => p.nextInspectionDue)
    .map((p) => ({
      project: p,
      dueDate: new Date(p.nextInspectionDue!),
      pastInspections: inspByProject.get(p.id) || [],
    }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const overdue = projectsWithUpcoming.filter((e) => !isFuture(e.dueDate) && !isToday(e.dueDate));
  const upcoming = projectsWithUpcoming.filter((e) => isFuture(e.dueDate) || isToday(e.dueDate));

  const projectsWithoutUpcoming = projectList
    .filter((p) => !p.nextInspectionDue)
    .map((p) => ({
      project: p,
      pastInspections: inspByProject.get(p.id) || [],
    }))
    .filter((e) => e.pastInspections.length > 0);

  const allPastInspections = [...inspections]
    .filter((ins) => !isFuture(new Date(ins.date)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const projectMap = new Map(projectList.map((p) => [p.id, p]));

  return (
    <Layout>
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2" data-testid="text-calendar-title">Kalender</h1>
        <p className="text-muted-foreground">Übersicht aller Projekte mit anstehenden und durchgeführten Prüfungen.</p>
      </div>

      {overdue.length > 0 && (
        <div className="mb-10">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-red-600 dark:text-red-400 mb-6 pb-2 border-b border-red-200 dark:border-red-800" data-testid="text-overdue-heading">
            <AlertTriangle className="w-5 h-5" /> Überfällige Prüfungen
          </h2>
          <div className="space-y-4">
            {overdue.map(({ project, dueDate, pastInspections }) => (
              <ProjectCard key={project.id} project={project} dueDate={dueDate} pastInspections={pastInspections} variant="overdue" />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground mb-6 pb-2 border-b border-border" data-testid="text-upcoming-heading">
            <Clock className="w-5 h-5 text-primary" /> Anstehende Prüfungen
          </h2>
          <div className="space-y-4">
            {upcoming.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-2xl text-muted-foreground shadow-sm">Keine anstehenden Prüfungen geplant.</div>
            ) : (
              upcoming.map(({ project, dueDate, pastInspections }) => (
                <ProjectCard key={project.id} project={project} dueDate={dueDate} pastInspections={pastInspections} variant="upcoming" />
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-muted-foreground mb-6 pb-2 border-b border-border" data-testid="text-past-heading">
            <ClipboardCheck className="w-5 h-5 opacity-70" /> Durchgeführte Prüfungen
          </h2>
          <div className="space-y-4">
            {allPastInspections.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">Keine Prüfungen durchgeführt.</div>
            ) : (
              allPastInspections.map((ins) => {
                const proj = projectMap.get(ins.projectId);
                return (
                  <div key={ins.id} className="flex gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm" data-testid={`card-past-inspection-${ins.id}`}>
                    <div className="w-16 flex flex-col items-center justify-center shrink-0 border-r border-border/50 pr-4">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{format(new Date(ins.date), 'MMM', { locale: de })}</span>
                      <span className="text-xl font-display font-bold text-muted-foreground">{format(new Date(ins.date), 'd')}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(ins.date), 'yyyy')}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground line-clamp-1">{proj?.name || `Projekt #${ins.projectId}`}</h3>
                        {statusBadge(ins.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {inspTypeLabels[ins.type] || ins.type}
                        {proj?.address && <span className="ml-2 text-xs">· {formatAddr(proj.address)}</span>}
                      </p>
                      {ins.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">{ins.notes}</p>}
                      {proj && (
                        <Link href={`/projects/${proj.id}`}>
                          <div className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer" data-testid={`link-project-${proj.id}`}>
                            <Building className="w-3.5 h-3.5" /> Projekt ansehen
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {projectsWithoutUpcoming.length > 0 && (
        <div className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-muted-foreground mb-4 pb-2 border-b border-border" data-testid="text-no-upcoming-heading">
            <Building className="w-5 h-5 opacity-70" /> Projekte ohne geplante Prüfung
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectsWithoutUpcoming.map(({ project, pastInspections }) => {
              const lastIns = pastInspections[0];
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-no-upcoming-${project.id}`}>
                    <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{project.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{formatAddr(project.address)}</p>
                    {lastIns && (
                      <p className="text-xs text-muted-foreground">
                        Letzte Prüfung: {format(new Date(lastIns.date), 'dd.MM.yyyy', { locale: de })}
                        <span className="ml-2">{statusBadge(lastIns.status)}</span>
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </Layout>
  );
}

function ProjectCard({ project, dueDate, pastInspections, variant }: {
  project: Project;
  dueDate: Date;
  pastInspections: Inspection[];
  variant: "upcoming" | "overdue";
}) {
  const isOverdue = variant === "overdue";
  const lastInspection = pastInspections.find((ins) => !isFuture(new Date(ins.date)));

  return (
    <div
      className={`group flex gap-4 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${
        isOverdue
          ? "bg-red-50 border-2 border-red-200 dark:bg-red-950/20 dark:border-red-800"
          : "bg-card border border-border"
      }`}
      data-testid={`card-project-${variant}-${project.id}`}
    >
      <div className={`w-16 flex flex-col items-center justify-center shrink-0 border-r pr-4 ${
        isOverdue ? "border-red-200 dark:border-red-800" : "border-border/50"
      }`}>
        <span className={`text-xs font-bold uppercase tracking-widest ${
          isOverdue ? "text-red-500" : "text-primary"
        }`}>{format(dueDate, 'MMM', { locale: de })}</span>
        <span className={`text-2xl font-display font-bold ${
          isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground"
        }`}>{format(dueDate, 'd')}</span>
        <span className="text-[10px] text-muted-foreground">{format(dueDate, 'yyyy')}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-foreground text-lg line-clamp-1">{project.name}</h3>
          {dueBadge(dueDate)}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{formatAddr(project.address)}</p>
        {lastInspection && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Letzte Prüfung: {format(new Date(lastInspection.date), 'dd.MM.yyyy', { locale: de })} ({inspTypeLabels[lastInspection.type] || lastInspection.type})
            </span>
            {statusBadge(lastInspection.status)}
          </div>
        )}
        <Link href={`/projects/${project.id}`}>
          <div className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:underline cursor-pointer" data-testid={`link-project-detail-${project.id}`}>
            <Building className="w-3.5 h-3.5" /> Projekt ansehen <ChevronRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
    </div>
  );
}
