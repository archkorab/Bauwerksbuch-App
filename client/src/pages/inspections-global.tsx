import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAllInspections } from "@/hooks/use-inspections";
import { useProjects } from "@/hooks/use-projects";
import {
  ClipboardCheck, Building, Calendar, AlertTriangle, ArrowRight, Loader2,
  ChevronRight, CheckCircle2, Hash, Eye, X, MapPin, User, FileText
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const inspTypeLabels: Record<string, string> = {
  erstpruefung: "Erstprüfung",
  folgepruefung: "Folgeprüfung",
};

const inspStatusLabels: Record<string, string> = {
  OK: "OK",
  needs_repair: "Reparaturbedarf",
  urgent: "Dringend",
};

const fristLabels: Record<string, string> = {
  "1_woche": "1 Woche",
  "2_wochen": "2 Wochen",
  "1_monat": "1 Monat",
  "2_monate": "2 Monate",
  "6_monate": "6 Monate",
};

export default function InspectionsGlobal() {
  const { data: allInspections, isLoading: insLoading } = useAllInspections();
  const { data: projects, isLoading: projLoading } = useProjects();
  const [detailInspection, setDetailInspection] = useState<any>(null);

  const isLoading = insLoading || projLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  const projectsNeedingInspection = projects?.filter(p => p.nextInspectionDue && new Date(p.nextInspectionDue) < new Date()) || [];

  return (
    <Layout>
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Prüfungsverzeichnis</h1>
        <p className="text-muted-foreground">Alle Prüfungen im Überblick. Klicken Sie auf eine Prüfung, um Details einzusehen.</p>
      </div>

      {projectsNeedingInspection.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl inline-flex shadow-sm">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-display font-bold">Handlungsbedarf: Prüfungen überfällig</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsNeedingInspection.map(project => (
              <Link key={project.id} href={`/projects/${project.id}?tab=inspections`}>
                <div className="group bg-card border border-destructive/30 hover:border-destructive/60 rounded-xl p-4 hover-elevate cursor-pointer flex items-center gap-4 transition-all shadow-sm" data-testid={`urgent-project-${project.id}`}>
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Fällig: {project.nextInspectionDue ? format(new Date(project.nextInspectionDue), 'dd.MM.yyyy') : '–'}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-xl font-bold text-foreground mb-6">Alle Prüfungen</h2>

        {(!allInspections || allInspections.length === 0) ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
            Keine Prüfungen im Verzeichnis vorhanden.
          </div>
        ) : (
          <div className="space-y-3">
            {allInspections.map((ins: any) => {
              const defectCount = ins.defects?.length || 0;
              const groberCount = ins.defects?.filter((d: any) => d.status === "grober_mangel").length || 0;
              const leichterCount = ins.defects?.filter((d: any) => d.status === "leichter_mangel").length || 0;

              return (
                <div
                  key={ins.id}
                  className="bg-card border border-border rounded-xl shadow-sm overflow-hidden hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => setDetailInspection(ins)}
                  data-testid={`inspection-row-${ins.id}`}
                >
                  <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border
                      ${ins.status === 'OK' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        ins.status === 'urgent' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                      {ins.status === 'OK' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-foreground">
                          {inspTypeLabels[ins.type] || "Erstprüfung"}
                        </span>
                        <span className="text-muted-foreground">—</span>
                        <span className="text-foreground font-medium">{format(new Date(ins.date), 'dd.MM.yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5" />
                          <Link href={`/projects/${ins.projectId}?tab=inspections`} className="hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                            {ins.projectName || `Projekt #${ins.projectId}`}
                          </Link>
                        </span>
                        {ins.engineer && (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            {ins.engineer.firstName} {ins.engineer.lastName}
                          </span>
                        )}
                        {ins.notes && (
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{ins.notes}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {defectCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          {groberCount > 0 && (
                            <Badge variant="destructive" className="text-xs" data-testid={`badge-grober-${ins.id}`}>
                              {groberCount} grob
                            </Badge>
                          )}
                          {leichterCount > 0 && (
                            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600" data-testid={`badge-leichter-${ins.id}`}>
                              {leichterCount} leicht
                            </Badge>
                          )}
                        </div>
                      )}
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase
                        ${ins.status === 'OK' ? 'text-emerald-600 border-emerald-500/30' :
                          ins.status === 'urgent' ? 'text-destructive border-destructive/30' :
                          'text-amber-600 border-amber-500/30'}`}>
                        {inspStatusLabels[ins.status] || ins.status}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-primary"
                        onClick={() => setDetailInspection(ins)}
                        data-testid={`button-view-inspection-${ins.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!detailInspection} onOpenChange={(open) => !open && setDetailInspection(null)}>
        <DialogContent className="bg-card border-border sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          {detailInspection && <InspectionDetailView inspection={detailInspection} onClose={() => setDetailInspection(null)} />}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function InspectionDetailView({ inspection, onClose }: { inspection: any; onClose: () => void }) {
  const primaryDefects = inspection.defects?.filter((d: any) => !d.parentDefectId) || [];
  const followUps = inspection.defects?.filter((d: any) => d.parentDefectId) || [];

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="font-display text-xl flex items-center gap-3">
          {inspTypeLabels[inspection.type] || "Erstprüfung"} — {format(new Date(inspection.date), 'dd.MM.yyyy')}
        </DialogTitle>
      </DialogHeader>

      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-background rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prüfungsdetails</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Art</span>
                <span className="font-medium text-foreground">{inspTypeLabels[inspection.type] || inspection.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Datum</span>
                <span className="font-medium text-foreground">{format(new Date(inspection.date), 'dd.MM.yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-bold ${inspection.status === 'OK' ? 'text-emerald-600' : inspection.status === 'urgent' ? 'text-destructive' : 'text-amber-600'}`}>
                  {inspStatusLabels[inspection.status] || inspection.status}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-background rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Zuordnung</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projekt</span>
                <Link href={`/projects/${inspection.projectId}?tab=inspections`} className="font-medium text-primary hover:underline" data-testid="link-detail-project">
                  {inspection.projectName || `Projekt #${inspection.projectId}`}
                </Link>
              </div>
              {inspection.projectAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adresse</span>
                  <span className="font-medium text-foreground text-right max-w-[200px]">{inspection.projectAddress}</span>
                </div>
              )}
              {inspection.engineer && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ingenieur</span>
                  <span className="font-medium text-foreground">{inspection.engineer.firstName} {inspection.engineer.lastName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {inspection.notes && (
          <div className="bg-background rounded-xl border border-border p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Anmerkungen</h4>
            <p className="text-sm text-foreground">{inspection.notes}</p>
          </div>
        )}

        <div>
          <h4 className="font-display font-bold text-lg mb-4">
            Mängel ({inspection.defects?.length || 0})
          </h4>

          {(!inspection.defects || inspection.defects.length === 0) ? (
            <div className="p-6 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
              Keine Mängel bei dieser Prüfung erfasst.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm" data-testid="detail-defects-table">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Mangel-Nr.</th>
                    <th className="text-left px-4 py-3 font-semibold">Bauteil</th>
                    <th className="text-left px-4 py-3 font-semibold">Datum</th>
                    <th className="text-left px-4 py-3 font-semibold">Beschreibung</th>
                    <th className="text-left px-4 py-3 font-semibold">Lage</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Frist</th>
                    <th className="text-left px-4 py-3 font-semibold">Reparatur bis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {primaryDefects.map((defect: any) => {
                    const children = followUps.filter((f: any) => f.parentDefectId === defect.id);
                    return (
                      <DefectRows key={defect.id} defect={defect} followUpDefects={children} />
                    );
                  })}
                  {followUps.filter((f: any) => !primaryDefects.some((p: any) => p.id === f.parentDefectId)).map((defect: any) => (
                    <DefectRows key={defect.id} defect={defect} followUpDefects={[]} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DefectRows({ defect, followUpDefects }: { defect: any; followUpDefects: any[] }) {
  return (
    <>
      <tr className="hover:bg-muted/40 transition-colors" data-testid={`detail-defect-row-${defect.defectId}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono font-semibold text-primary">{defect.defectId}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-foreground">{defect.bauteil && defect.bauteil.length > 0 ? defect.bauteil.join(", ") : "–"}</td>
        <td className="px-4 py-3 text-foreground">{format(new Date(defect.dateFound), 'dd.MM.yyyy')}</td>
        <td className="px-4 py-3 text-foreground max-w-[200px]">
          <span className="line-clamp-2">{defect.description}</span>
        </td>
        <td className="px-4 py-3 text-foreground">{defect.location}</td>
        <td className="px-4 py-3">
          <Badge variant={defect.status === "grober_mangel" ? "destructive" : "outline"} className={defect.status === "leichter_mangel" ? "border-amber-500/30 text-amber-600" : ""}>
            {defect.status === "grober_mangel" ? "Grober Mangel" : "Leichter Mangel"}
          </Badge>
        </td>
        <td className="px-4 py-3 text-foreground">{defect.frist ? fristLabels[defect.frist] || defect.frist : "–"}</td>
        <td className="px-4 py-3 text-foreground">{defect.repairDue ? format(new Date(defect.repairDue), 'dd.MM.yyyy') : "–"}</td>
      </tr>
      {followUpDefects.map((child: any) => (
        <tr key={child.id} className="hover:bg-muted/40 transition-colors bg-muted/10" data-testid={`detail-defect-row-${child.defectId}`}>
          <td className="px-4 py-3 pl-8">
            <div className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Hash className="w-3.5 h-3.5 text-primary/60" />
              <span className="font-mono font-semibold text-primary/80">{child.defectId}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-foreground">{child.bauteil && child.bauteil.length > 0 ? child.bauteil.join(", ") : "–"}</td>
          <td className="px-4 py-3 text-foreground">{format(new Date(child.dateFound), 'dd.MM.yyyy')}</td>
          <td className="px-4 py-3 text-foreground max-w-[200px]">
            <span className="line-clamp-2">{child.description}</span>
          </td>
          <td className="px-4 py-3 text-foreground">{child.location}</td>
          <td className="px-4 py-3">
            <Badge variant={child.status === "grober_mangel" ? "destructive" : "outline"} className={child.status === "leichter_mangel" ? "border-amber-500/30 text-amber-600" : ""}>
              {child.status === "grober_mangel" ? "Grober Mangel" : "Leichter Mangel"}
            </Badge>
          </td>
          <td className="px-4 py-3 text-foreground">{child.frist ? fristLabels[child.frist] || child.frist : "–"}</td>
          <td className="px-4 py-3 text-foreground">{child.repairDue ? format(new Date(child.repairDue), 'dd.MM.yyyy') : "–"}</td>
        </tr>
      ))}
    </>
  );
}
