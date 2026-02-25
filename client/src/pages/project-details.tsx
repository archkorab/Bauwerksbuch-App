import { useState, Fragment } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { MapPlaceholder } from "@/components/map-placeholder";
import { useProject, useUpdateProject, useDefectSummary } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-users";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import { useEvents, useCreateEvent } from "@/hooks/use-events";
import { useInspections, useCreateInspection, useCreateDefect, useUpdateInspection, useUpdateDefect, useDeleteDefect, useDeleteInspection } from "@/hooks/use-inspections";
import { useBauakte, useImportBauakt, useUploadBauaktFiles } from "@/hooks/use-bauakte";
import { useProjectImages, useUploadProjectImages, useDeleteProjectImage } from "@/hooks/use-project-images";
import { useProfile } from "@/hooks/use-profile";
import { format } from "date-fns";
import { 
  Building, MapPin, Calendar, FileText, ChevronRight, ChevronDown, Download, Clock, CheckCircle2, AlertTriangle, Plus, Upload, Loader2, CornerDownRight, Hash, MapPinned, Pencil, Archive, ExternalLink, FileUp, Trash2, ImagePlus, Image, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const statusLabels: Record<string, string> = {
  active: "Aktiv",
  completed: "Abgeschlossen",
  archived: "Archiviert",
};

const inspStatusLabels: Record<string, string> = {
  OK: "OK",
  needs_repair: "Reparaturbedarf",
  urgent: "Dringend",
};

const defectStatusLabels: Record<string, string> = {
  leichter_mangel: "Leichter Mangel",
  grober_mangel: "Grober Mangel",
};

const inspTypeLabels: Record<string, string> = {
  erstpruefung: "Erstprüfung",
  folgepruefung: "Folgeprüfung",
};

const BAUTEIL_OPTIONS = ["Dach", "Fassade/Gesimse", "Decken", "Treppen", "Wände"] as const;

interface DefectEntry {
  defectId: string;
  bauteil: string[];
  dateFound: string;
  description: string;
  location: string;
  status: string;
  frist: string;
  repairDue: string;
  imageFile?: File | null;
  imageUrl?: string;
}

const fristLabels: Record<string, string> = {
  "1_woche": "1 Woche",
  "2_wochen": "2 Wochen",
  "1_monat": "1 Monat",
  "2_monate": "2 Monate",
  "6_monate": "6 Monate",
};

function calcRepairDue(dateFound: string, frist: string): string {
  if (!dateFound || !frist) return "";
  const d = new Date(dateFound);
  switch (frist) {
    case "1_woche": d.setDate(d.getDate() + 7); break;
    case "2_wochen": d.setDate(d.getDate() + 14); break;
    case "1_monat": d.setMonth(d.getMonth() + 1); break;
    case "2_monate": d.setMonth(d.getMonth() + 2); break;
    case "6_monate": d.setMonth(d.getMonth() + 6); break;
  }
  return d.toISOString().split("T")[0];
}

export default function ProjectDetails() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: documents } = useDocuments(projectId);
  const { data: events } = useEvents(projectId);
  const { data: inspections } = useInspections(projectId);
  const { data: profile } = useProfile();
  
  const { data: clients } = useClients();
  const { data: defectSummary } = useDefectSummary();
  const { data: bauakte } = useBauakte(projectId);
  const { data: projectImages } = useProjectImages(projectId);
  const uploadProjectImages = useUploadProjectImages();
  const deleteProjectImage = useDeleteProjectImage();
  const createDocument = useCreateDocument();
  const createEvent = useCreateEvent();
  const createInspection = useCreateInspection();
  const createDefect = useCreateDefect();
  const updateInspection = useUpdateInspection();
  const deleteInspection = useDeleteInspection();
  const updateDefect = useUpdateDefect();
  const deleteDefect = useDeleteDefect();
  const updateProject = useUpdateProject();
  const importBauakt = useImportBauakt();
  const uploadBauaktFiles = useUploadBauaktFiles();
  
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [inspDialogOpen, setInspDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bauaktSearch, setBauaktSearch] = useState("");

  const isAdmin = profile?.role === "admin";

  const [defectEntries, setDefectEntries] = useState<DefectEntry[]>([]);
  const [editInspDialogOpen, setEditInspDialogOpen] = useState(false);
  const [expandedInspId, setExpandedInspId] = useState<number | null>(null);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [editDefectEntries, setEditDefectEntries] = useState<(DefectEntry & { existingId?: number })[]>([]);
  const [editInspSubmitting, setEditInspSubmitting] = useState(false);
  const [deletedDefectIds, setDeletedDefectIds] = useState<number[]>([]);

  const addDefectEntry = () => {
    setDefectEntries(prev => [...prev, {
      defectId: "",
      bauteil: [],
      dateFound: "",
      description: "",
      location: "",
      status: "leichter_mangel",
      frist: "",
      repairDue: "",
    }]);
  };

  const updateDefectEntry = (index: number, field: keyof DefectEntry, value: string) => {
    setDefectEntries(prev => prev.map((entry, i) => {
      if (i !== index) return entry;
      const updated = { ...entry, [field]: value };
      if (field === "frist" || field === "dateFound") {
        const df = field === "dateFound" ? value : updated.dateFound;
        const fr = field === "frist" ? value : updated.frist;
        updated.repairDue = calcRepairDue(df, fr);
      }
      return updated;
    }));
  };

  const removeDefectEntry = (index: number) => {
    setDefectEntries(prev => prev.filter((_, i) => i !== index));
  };

  const [docFile, setDocFile] = useState<File | null>(null);
  const { register: docReg, handleSubmit: handleDocSubmit, reset: resetDocForm } = useForm({
    defaultValues: { name: "" }
  });

  const onDocSubmit = (data: any) => {
    if (!docFile) return;
    const formData = new FormData();
    formData.append('file', docFile);
    formData.append('name', data.name || docFile.name);
    createDocument.mutate({ projectId, formData }, {
      onSuccess: () => {
        setDocDialogOpen(false);
        setDocFile(null);
        resetDocForm();
      }
    });
  };

  const { register: eventReg, handleSubmit: handleEventSubmit } = useForm({
    defaultValues: { title: "", description: "", type: "inspection", date: "" }
  });

  const onEventSubmit = (data: any) => {
    createEvent.mutate({ 
      ...data, 
      projectId, 
      date: new Date(data.date).toISOString() 
    }, {
      onSuccess: () => setEventDialogOpen(false)
    });
  };

  const { register: inspReg, handleSubmit: handleInspSubmit, setValue: setInspValue, reset: resetInspForm } = useForm({
    defaultValues: { date: "", status: "OK", type: "erstpruefung", notes: "" }
  });

  const [inspSubmitting, setInspSubmitting] = useState(false);

  const onInspSubmit = async (data: any) => {
    setInspSubmitting(true);
    try {
      const inspection = await createInspection.mutateAsync({ 
        projectId, 
        data: { 
          projectId,
          engineerId: profile!.userId,
          date: new Date(data.date), 
          status: data.status,
          type: data.type,
          notes: data.notes || null 
        } 
      });
      
      const validDefects = defectEntries.filter(e => e.defectId && e.dateFound && e.description && e.location);
      for (const entry of validDefects) {
        const defect = await createDefect.mutateAsync({
          inspectionId: inspection.id,
          projectId,
          data: {
            inspectionId: inspection.id,
            defectId: entry.defectId,
            bauteil: entry.bauteil.length > 0 ? entry.bauteil : null,
            dateFound: new Date(entry.dateFound),
            description: entry.description,
            location: entry.location,
            status: entry.status as "leichter_mangel" | "grober_mangel",
            frist: (entry.frist || null) as any,
            repairDue: entry.repairDue ? new Date(entry.repairDue) : null,
          }
        });
        if (entry.imageFile && defect?.id) {
          const formData = new FormData();
          formData.append('image', entry.imageFile);
          await fetch(`/api/defects/${defect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
        }
      }
      
      setInspDialogOpen(false);
      resetInspForm();
      setDefectEntries([]);
    } catch (error) {
      console.error("Failed to create inspection:", error);
    } finally {
      setInspSubmitting(false);
    }
  };

  const openEditInspection = (ins: any) => {
    setEditingInspection(ins);
    resetEditInspForm({
      date: ins.date ? format(new Date(ins.date), 'yyyy-MM-dd') : "",
      status: ins.status || "OK",
      type: (ins as any).type || "erstpruefung",
      notes: ins.notes || "",
    });
    const existingDefects = (ins.defects || []).map((d: any) => ({
      existingId: d.id,
      defectId: d.defectId,
      bauteil: d.bauteil || [],
      dateFound: d.dateFound ? format(new Date(d.dateFound), 'yyyy-MM-dd') : "",
      description: d.description,
      location: d.location,
      status: d.status,
      frist: d.frist || "",
      repairDue: d.repairDue ? format(new Date(d.repairDue), 'yyyy-MM-dd') : "",
      imageUrl: d.imageUrl || "",
    }));
    setEditDefectEntries(existingDefects);
    setDeletedDefectIds([]);
    setEditInspDialogOpen(true);
  };

  const { register: editInspReg, handleSubmit: handleEditInspSubmit, setValue: setEditInspValue, reset: resetEditInspForm, watch: watchEditInsp } = useForm({
    defaultValues: { date: "", status: "OK", type: "erstpruefung", notes: "" }
  });
  const editInspType = watchEditInsp("type");
  const editInspStatus = watchEditInsp("status");

  const onEditInspSubmit = async (data: any) => {
    if (!editingInspection) return;
    setEditInspSubmitting(true);
    try {
      await updateInspection.mutateAsync({
        id: editingInspection.id,
        projectId,
        data: {
          date: new Date(data.date),
          status: data.status,
          type: data.type,
          notes: data.notes || null,
        }
      });

      for (const id of deletedDefectIds) {
        await deleteDefect.mutateAsync({ id, projectId });
      }

      for (const entry of editDefectEntries) {
        if (!entry.defectId || !entry.dateFound || !entry.description || !entry.location) continue;
        if (entry.existingId) {
          await updateDefect.mutateAsync({
            id: entry.existingId,
            projectId,
            data: {
              defectId: entry.defectId,
              bauteil: entry.bauteil.length > 0 ? entry.bauteil : null,
              dateFound: new Date(entry.dateFound),
              description: entry.description,
              location: entry.location,
              status: entry.status as "leichter_mangel" | "grober_mangel",
              frist: (entry.frist || null) as any,
              repairDue: entry.repairDue ? new Date(entry.repairDue) : null,
            }
          });
          if (entry.imageFile) {
            const formData = new FormData();
            formData.append('image', entry.imageFile);
            await fetch(`/api/defects/${entry.existingId}/image`, { method: 'POST', body: formData, credentials: 'include' });
          }
        } else {
          const defect = await createDefect.mutateAsync({
            inspectionId: editingInspection.id,
            projectId,
            data: {
              inspectionId: editingInspection.id,
              defectId: entry.defectId,
              bauteil: entry.bauteil.length > 0 ? entry.bauteil : null,
              dateFound: new Date(entry.dateFound),
              description: entry.description,
              location: entry.location,
              status: entry.status as "leichter_mangel" | "grober_mangel",
              frist: (entry.frist || null) as any,
              repairDue: entry.repairDue ? new Date(entry.repairDue) : null,
            }
          });
          if (entry.imageFile && defect?.id) {
            const formData = new FormData();
            formData.append('image', entry.imageFile);
            await fetch(`/api/defects/${defect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
          }
        }
      }

      setEditInspDialogOpen(false);
      setEditingInspection(null);
      setEditDefectEntries([]);
      setDeletedDefectIds([]);
    } catch (error) {
      console.error("Failed to update inspection:", error);
    } finally {
      setEditInspSubmitting(false);
    }
  };

  const { register: editReg, handleSubmit: handleEditSubmit, setValue: setEditValue, reset: resetEditForm } = useForm({
    defaultValues: {
      name: "",
      address: "",
      status: "active",
      eigentuemer: "",
      verwaltungId: "",
      nextInspectionDue: "",
    }
  });

  const openEditDialog = () => {
    if (!project) return;
    resetEditForm({
      name: project.name,
      address: project.address,
      status: project.status,
      eigentuemer: project.eigentuemer || "",
      verwaltungId: project.verwaltungId || "",
      nextInspectionDue: project.nextInspectionDue ? format(new Date(project.nextInspectionDue), 'yyyy-MM-dd') : "",
    });
    setEditDialogOpen(true);
  };

  const onEditSubmit = (data: any) => {
    const updates: any = {
      name: data.name,
      address: data.address,
      status: data.status,
      eigentuemer: data.eigentuemer || null,
      verwaltungId: data.verwaltungId || null,
    };
    if (data.nextInspectionDue) {
      updates.nextInspectionDue = new Date(data.nextInspectionDue);
    } else {
      updates.nextInspectionDue = null;
    }
    updateProject.mutate({ id: projectId, updates }, {
      onSuccess: () => setEditDialogOpen(false)
    });
  };

  if (projectLoading || !project) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-4">
          <Building className="w-4 h-4" />
          <Link href="/projects" className="hover:text-primary transition-colors cursor-pointer" data-testid="link-breadcrumb-projects">Projekte</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{project.name}</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">{project.name}</h1>
              {(() => {
                const mangel = defectSummary?.find(s => s.projectId === projectId)?.mangelStatus || "kein_mangel";
                const mangelLabels: Record<string, string> = { kein_mangel: "Kein Mangel", leichter_mangel: "Leichter Mangel", grober_mangel: "Grober Mangel" };
                return (
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-widest
                    ${mangel === 'grober_mangel' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                      mangel === 'leichter_mangel' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}
                    data-testid="badge-mangel-status">
                    {mangelLabels[mangel]}
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{project.address}</span>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" onClick={openEditDialog} className="bg-card border-border hover:bg-muted/60" data-testid="button-edit-project">
              <Pencil className="w-4 h-4 mr-2" /> Projekt bearbeiten
            </Button>
          )}
        </div>

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Projekt bearbeiten</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-5 mt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Projektname</Label>
                <Input id="edit-name" {...editReg("name")} required className="bg-background border-border" data-testid="input-edit-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <Input id="edit-address" {...editReg("address")} required className="bg-background border-border" data-testid="input-edit-address" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue={project.status} onValueChange={(val) => setEditValue("status", val)}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="archived">Archiviert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Verwaltung</Label>
                <Select defaultValue={project.verwaltungId || ""} onValueChange={(val) => setEditValue("verwaltungId", val)}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-edit-verwaltung">
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
                <Label htmlFor="edit-eigentuemer">Eigentümer</Label>
                <Input id="edit-eigentuemer" {...editReg("eigentuemer")} placeholder="Name des Eigentümers" className="bg-background border-border" data-testid="input-edit-eigentuemer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nextInspection">Nächste Prüfung</Label>
                <Input id="edit-nextInspection" type="date" {...editReg("nextInspectionDue")} className="bg-background border-border" data-testid="input-edit-next-inspection" />
              </div>
              <Button type="submit" className="w-full" disabled={updateProject.isPending} data-testid="button-submit-edit">
                {updateProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Änderungen speichern
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 max-w-4xl">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-4">Projektdetails</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Eigentümer</p>
              <p className="font-medium" data-testid="text-client-name">{project.eigentuemer || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Verwaltung</p>
              <p className="font-medium" data-testid="text-verwaltung">
                {project.verwaltung 
                  ? `${project.verwaltung.firstName} ${project.verwaltung.lastName}${project.verwaltung.profile?.company ? ` (${project.verwaltung.profile.company})` : ''}`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Erstellt am</p>
              <p className="font-medium">{format(new Date(project.createdAt!), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Nächste Prüfung</p>
              <p className="font-medium">{project.nextInspectionDue ? format(new Date(project.nextInspectionDue), 'MMMM d, yyyy') : 'Nicht geplant'}</p>
            </div>
          </div>
        </div>

        <div className="h-full min-h-[280px] rounded-2xl overflow-hidden shadow-sm">
          <MapPlaceholder address={project.address} latitude={project.latitude} longitude={project.longitude} />
        </div>
      </div>

      <div>
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="bg-card border border-border p-1 rounded-xl mb-6">
              <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Dokumente</TabsTrigger>
              <TabsTrigger value="bauakt" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-trigger-bauakt">Digitaler Bauakt</TabsTrigger>
              <TabsTrigger value="inspections" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Prüfungen</TabsTrigger>
              <TabsTrigger value="images" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-trigger-images">Bilder</TabsTrigger>
              <TabsTrigger value="events" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Zeitleiste</TabsTrigger>
            </TabsList>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xl">Projektdokumente</h3>
                {isAdmin && (
                  <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-card border-border hover:bg-muted/60">
                        <Upload className="w-4 h-4 mr-2" /> Hochladen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Dokument hochladen</DialogTitle></DialogHeader>
                      <form onSubmit={handleDocSubmit(onDocSubmit)} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Datei auswählen</Label>
                          <Input
                            type="file"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setDocFile(f);
                            }}
                            required
                            className="bg-background"
                            data-testid="input-doc-file"
                          />
                        </div>
                        <div className="space-y-2"><Label>Dokumentname (optional)</Label><Input {...docReg("name")} placeholder={docFile?.name || "Wird aus Dateiname übernommen"} className="bg-background" data-testid="input-doc-name"/></div>
                        <Button type="submit" className="w-full" disabled={createDocument.isPending || !docFile} data-testid="button-doc-submit">
                          {createDocument.isPending ? "Wird hochgeladen..." : "Hochladen"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {documents?.length === 0 ? (
                   <div className="p-8 text-center text-muted-foreground">Noch keine Dokumente hochgeladen.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {documents?.map(doc => (
                      <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors" data-testid={`doc-row-${doc.id}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            {doc.url && doc.url.startsWith('/api/') ? (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:text-primary/80" data-testid={`doc-link-${doc.id}`}>{doc.name}</a>
                            ) : (
                              <p className="font-semibold text-foreground">{doc.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{format(new Date(doc.createdAt!), 'MMM d, yyyy')} • {doc.type.toUpperCase()}</p>
                          </div>
                        </div>
                        {doc.url && doc.url.startsWith('/api/') && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" data-testid={`doc-download-${doc.id}`}>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Bilder Tab */}
            <TabsContent value="images" className="space-y-4" data-testid="tab-images">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xl">Projektbilder</h3>
                {isAdmin && (
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-card border border-border rounded-lg cursor-pointer hover:bg-muted/60 transition-colors" data-testid="button-upload-images">
                    <ImagePlus className="w-4 h-4" />
                    Bilder hochladen
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          uploadProjectImages.mutate({ projectId, files });
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {uploadProjectImages.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-card border border-border rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Bilder werden hochgeladen...
                </div>
              )}

              {(!projectImages || projectImages.length === 0) ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
                  Keine Bilder vorhanden.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {projectImages.map((img: any) => (
                    <div key={img.id} className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm" data-testid={`project-image-${img.id}`}>
                      <a href={img.url} target="_blank" rel="noopener noreferrer" className="block aspect-square">
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      </a>
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-foreground truncate" title={img.name}>{img.name}</p>
                        {img.createdAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(img.createdAt), 'dd.MM.yyyy')}</p>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={img.url}
                          download={img.name}
                          className="p-1.5 bg-card/90 backdrop-blur border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-download-image-${img.id}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {isAdmin && (
                          <button
                            className="p-1.5 bg-card/90 backdrop-blur border border-border rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => {
                              if (confirm("Bild wirklich löschen?")) {
                                deleteProjectImage.mutate({ id: img.id, projectId });
                              }
                            }}
                            data-testid={`button-delete-image-${img.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Digitaler Bauakt Tab */}
            <TabsContent value="bauakt" className="space-y-4" data-testid="tab-bauakt">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h3 className="font-display font-bold text-xl">Digitaler Bauakt</h3>
                <div className="flex items-center gap-2">
                  {profile?.role === "admin" && (
                    <>
                      <label htmlFor="bauakt-file-upload" className="cursor-pointer">
                        <Button variant="outline" size="sm" className="bg-card border-border hover:bg-muted/60" asChild>
                          <span><FileUp className="w-4 h-4 mr-2" /> Dateien hochladen</span>
                        </Button>
                        <input
                          id="bauakt-file-upload"
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
                          className="hidden"
                          data-testid="input-bauakt-file-upload"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              uploadBauaktFiles.mutate({ projectId, files: e.target.files });
                            }
                          }}
                        />
                      </label>
                      <label htmlFor="bauakt-excel-import" className="cursor-pointer">
                        <Button variant="outline" size="sm" className="bg-card border-border hover:bg-muted/60" asChild>
                          <span><Upload className="w-4 h-4 mr-2" /> Excel importieren</span>
                        </Button>
                        <input
                          id="bauakt-excel-import"
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          data-testid="input-bauakt-excel-import"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              importBauakt.mutate({ projectId, file: e.target.files[0] });
                            }
                          }}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
              
              {(importBauakt.isPending || uploadBauaktFiles.isPending) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-xl p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {importBauakt.isPending ? "Excel wird importiert..." : "Dateien werden hochgeladen..."}
                </div>
              )}

              <div className="mb-4">
                <Input
                  placeholder="Suche nach Dateiname, Beschreibung, Art..."
                  value={bauaktSearch}
                  onChange={(e) => setBauaktSearch(e.target.value)}
                  className="bg-background border-border"
                  data-testid="input-bauakt-search"
                />
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {!bauakte || bauakte.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Noch keine Bauakt-Einträge vorhanden.</p>
                    {profile?.role === "admin" && <p className="text-sm mt-1">Importieren Sie eine Excel-Datei, um Einträge hinzuzufügen.</p>}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-bauakt">
                      <thead>
                        <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                          <th className="text-left px-5 py-3 font-semibold">Dateiname</th>
                          <th className="text-left px-5 py-3 font-semibold">Jahr</th>
                          <th className="text-left px-5 py-3 font-semibold">Beschreibung</th>
                          <th className="text-left px-5 py-3 font-semibold">Art</th>
                          <th className="text-left px-5 py-3 font-semibold">Anmerkung</th>
                          <th className="text-left px-5 py-3 font-semibold w-16">Datei</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {bauakte
                          .filter((entry: any) => {
                            if (!bauaktSearch) return true;
                            const s = bauaktSearch.toLowerCase();
                            return (
                              entry.dateiname?.toLowerCase().includes(s) ||
                              entry.beschreibung?.toLowerCase().includes(s) ||
                              entry.art?.toLowerCase().includes(s) ||
                              entry.anmerkung?.toLowerCase().includes(s) ||
                              entry.jahr?.includes(s)
                            );
                          })
                          .map((entry: any) => (
                            <tr key={entry.id} className="hover:bg-muted/40 transition-colors" data-testid={`bauakt-row-${entry.id}`}>
                              <td className="px-5 py-3 font-medium text-foreground">{entry.dateiname}</td>
                              <td className="px-5 py-3 text-foreground">{entry.jahr || '—'}</td>
                              <td className="px-5 py-3 text-foreground max-w-xs">{entry.beschreibung || '—'}</td>
                              <td className="px-5 py-3">
                                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase
                                  ${entry.art === 'Plan' ? 'text-indigo-600 border-indigo-500/30 bg-indigo-500/10' : 
                                    entry.art === 'Bescheid' ? 'text-amber-600 border-amber-500/30 bg-amber-500/10' :
                                    'text-muted-foreground border-border bg-muted/20'}`}>
                                  {entry.art || '—'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-foreground text-xs max-w-xs">{entry.anmerkung || '—'}</td>
                              <td className="px-5 py-3">
                                {entry.fileUrl ? (
                                  <a href={entry.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80" data-testid={`bauakt-file-link-${entry.id}`}>
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {bauakte && bauakte.length > 0 && (
                <p className="text-xs text-muted-foreground">{bauakte.filter((e: any) => {
                  if (!bauaktSearch) return true;
                  const s = bauaktSearch.toLowerCase();
                  return e.dateiname?.toLowerCase().includes(s) || e.beschreibung?.toLowerCase().includes(s) || e.art?.toLowerCase().includes(s) || e.anmerkung?.toLowerCase().includes(s) || e.jahr?.includes(s);
                }).length} von {bauakte.length} Einträgen</p>
              )}
            </TabsContent>

            {/* Inspections Tab */}
            <TabsContent value="inspections" className="space-y-6" data-testid="tab-inspections">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xl">Prüfprotokoll</h3>
                {isAdmin && (
                  <Dialog open={inspDialogOpen} onOpenChange={(open) => { setInspDialogOpen(open); if (!open) { setDefectEntries([]); resetInspForm(); } }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-card border-border hover:bg-muted/60" data-testid="button-add-inspection">
                        <Plus className="w-4 h-4 mr-2" /> Prüfung hinzufügen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle className="font-display text-xl">Neue Prüfung erfassen</DialogTitle></DialogHeader>
                      <form onSubmit={handleInspSubmit(onInspSubmit)} className="space-y-6 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Art der Prüfung</Label>
                            <Select defaultValue="erstpruefung" onValueChange={(val) => setInspValue("type", val)}>
                              <SelectTrigger className="bg-background border-border" data-testid="select-inspection-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="erstpruefung">Erstprüfung</SelectItem>
                                <SelectItem value="folgepruefung">Folgeprüfung</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Prüfdatum</Label>
                            <Input type="date" {...inspReg("date")} required className="bg-background border-border" data-testid="input-inspection-date" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select defaultValue="OK" onValueChange={(val) => setInspValue("status", val)}>
                              <SelectTrigger className="bg-background border-border" data-testid="select-inspection-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OK">OK</SelectItem>
                                <SelectItem value="needs_repair">Reparaturbedarf</SelectItem>
                                <SelectItem value="urgent">Dringend</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Anmerkungen</Label>
                            <Input {...inspReg("notes")} placeholder="Kurze Notizen..." className="bg-background border-border" data-testid="input-inspection-notes" />
                          </div>
                        </div>

                        <div className="border-t border-border pt-5">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-display font-bold text-base">Mängel</h4>
                            <Button type="button" variant="outline" size="sm" onClick={addDefectEntry} className="bg-card border-border hover:bg-muted/60" data-testid="button-add-defect-entry">
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Mangel hinzufügen
                            </Button>
                          </div>

                          {defectEntries.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">Keine Mängel hinzugefügt. Klicken Sie auf „Mangel hinzufügen", um Mängel zu erfassen.</p>
                          )}

                          <div className="space-y-4">
                            {defectEntries.map((entry, index) => (
                              <div key={index} className="bg-background border border-border rounded-xl p-4 space-y-3" data-testid={`defect-entry-${index}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mangel {index + 1}</span>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeDefectEntry(index)} data-testid={`button-remove-defect-${index}`}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Mangel-Nr.</Label>
                                    <Input value={entry.defectId} onChange={(e) => updateDefectEntry(index, "defectId", e.target.value)} placeholder="z.B. M-001" required className="bg-card border-border h-9 text-sm" data-testid={`input-defect-id-${index}`} />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Bauteil</Label>
                                    <div className="flex flex-wrap gap-1.5" data-testid={`bauteil-select-${index}`}>
                                      {BAUTEIL_OPTIONS.map(opt => (
                                        <button key={opt} type="button" onClick={() => {
                                          setDefectEntries(prev => prev.map((ent, i) => {
                                            if (i !== index) return ent;
                                            const has = ent.bauteil.includes(opt);
                                            return { ...ent, bauteil: has ? ent.bauteil.filter(b => b !== opt) : [...ent.bauteil, opt] };
                                          }));
                                        }} className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${entry.bauteil.includes(opt) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}>
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Datum der Feststellung</Label>
                                    <Input type="date" value={entry.dateFound} onChange={(e) => updateDefectEntry(index, "dateFound", e.target.value)} required className="bg-card border-border h-9 text-sm" data-testid={`input-defect-date-${index}`} />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Lage</Label>
                                    <Input value={entry.location} onChange={(e) => updateDefectEntry(index, "location", e.target.value)} placeholder="z.B. Keller, 2. OG" required className="bg-card border-border h-9 text-sm" data-testid={`input-defect-location-${index}`} />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Beschreibung</Label>
                                  <Textarea value={entry.description} onChange={(e) => updateDefectEntry(index, "description", e.target.value)} placeholder="Beschreibung des Mangels..." required className="bg-card border-border min-h-[60px] text-sm" data-testid={`input-defect-description-${index}`} />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Status</Label>
                                  <Select value={entry.status} onValueChange={(val) => updateDefectEntry(index, "status", val)}>
                                    <SelectTrigger className="bg-card border-border h-9 text-sm" data-testid={`select-defect-status-${index}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="leichter_mangel">Leichter Mangel</SelectItem>
                                      <SelectItem value="grober_mangel">Grober Mangel</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Frist</Label>
                                    <Select value={entry.frist} onValueChange={(val) => updateDefectEntry(index, "frist", val)}>
                                      <SelectTrigger className="bg-card border-border h-9 text-sm" data-testid={`select-defect-frist-${index}`}>
                                        <SelectValue placeholder="Frist wählen" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1_woche">1 Woche</SelectItem>
                                        <SelectItem value="2_wochen">2 Wochen</SelectItem>
                                        <SelectItem value="1_monat">1 Monat</SelectItem>
                                        <SelectItem value="2_monate">2 Monate</SelectItem>
                                        <SelectItem value="6_monate">6 Monate</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Reparatur bis</Label>
                                    <Input type="date" value={entry.repairDue} readOnly className="bg-card border-border h-9 text-sm text-muted-foreground" data-testid={`input-defect-repair-due-${index}`} />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Foto</Label>
                                  {entry.imageFile ? (
                                    <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border">
                                      <Image className="w-4 h-4 text-primary shrink-0" />
                                      <span className="text-xs text-foreground truncate flex-1">{entry.imageFile.name}</span>
                                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => {
                                        const updated = [...defectEntries];
                                        updated[index] = { ...updated[index], imageFile: null };
                                        setDefectEntries(updated);
                                      }} data-testid={`button-remove-defect-image-${index}`}>
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <label className="flex items-center gap-2 p-2 bg-card border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors" data-testid={`input-defect-image-${index}`}>
                                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Bild hochladen</span>
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const updated = [...defectEntries];
                                          updated[index] = { ...updated[index], imageFile: file };
                                          setDefectEntries(updated);
                                        }
                                      }} />
                                    </label>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={inspSubmitting} data-testid="button-submit-inspection">
                          {inspSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Prüfung erfassen
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <Dialog open={editInspDialogOpen} onOpenChange={(open) => { setEditInspDialogOpen(open); if (!open) { setEditingInspection(null); setEditDefectEntries([]); setDeletedDefectIds([]); } }}>
                <DialogContent className="bg-card border-border sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display text-xl">Prüfung bearbeiten</DialogTitle></DialogHeader>
                  <form onSubmit={handleEditInspSubmit(onEditInspSubmit)} className="space-y-6 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Art der Prüfung</Label>
                        <Select value={editInspType} onValueChange={(val) => setEditInspValue("type", val)}>
                          <SelectTrigger className="bg-background border-border" data-testid="edit-select-inspection-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="erstpruefung">Erstprüfung</SelectItem>
                            <SelectItem value="folgepruefung">Folgeprüfung</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Prüfdatum</Label>
                        <Input type="date" {...editInspReg("date")} required className="bg-background border-border" data-testid="edit-input-inspection-date" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={editInspStatus} onValueChange={(val) => setEditInspValue("status", val)}>
                          <SelectTrigger className="bg-background border-border" data-testid="edit-select-inspection-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OK">OK</SelectItem>
                            <SelectItem value="needs_repair">Reparaturbedarf</SelectItem>
                            <SelectItem value="urgent">Dringend</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Anmerkungen</Label>
                        <Input {...editInspReg("notes")} placeholder="Kurze Notizen..." className="bg-background border-border" data-testid="edit-input-inspection-notes" />
                      </div>
                    </div>

                    <div className="border-t border-border pt-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-display font-bold text-base">Mängel</h4>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditDefectEntries(prev => [...prev, { defectId: "", bauteil: [], dateFound: "", description: "", location: "", status: "leichter_mangel", frist: "", repairDue: "" }])} className="bg-card border-border hover:bg-muted/60" data-testid="edit-button-add-defect-entry">
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Mangel hinzufügen
                        </Button>
                      </div>

                      {editDefectEntries.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Keine Mängel vorhanden.</p>
                      )}

                      <div className="space-y-4">
                        {editDefectEntries.map((entry, index) => (
                          <div key={index} className="bg-background border border-border rounded-xl p-4 space-y-3" data-testid={`edit-defect-entry-${index}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {entry.existingId ? "Mangel" : "Neuer Mangel"} {index + 1}
                              </span>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => {
                                if (entry.existingId) setDeletedDefectIds(prev => [...prev, entry.existingId!]);
                                setEditDefectEntries(prev => prev.filter((_, i) => i !== index));
                              }} data-testid={`edit-button-remove-defect-${index}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Mangel-Nr.</Label>
                                <Input value={entry.defectId} onChange={(e) => setEditDefectEntries(prev => prev.map((ent, i) => i === index ? { ...ent, defectId: e.target.value } : ent))} placeholder="z.B. M-001" required className="bg-card border-border h-9 text-sm" data-testid={`edit-input-defect-id-${index}`} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Bauteil</Label>
                                <div className="flex flex-wrap gap-1.5" data-testid={`edit-bauteil-select-${index}`}>
                                  {BAUTEIL_OPTIONS.map(opt => (
                                    <button key={opt} type="button" onClick={() => {
                                      setEditDefectEntries(prev => prev.map((ent, i) => {
                                        if (i !== index) return ent;
                                        const has = ent.bauteil.includes(opt);
                                        return { ...ent, bauteil: has ? ent.bauteil.filter(b => b !== opt) : [...ent.bauteil, opt] };
                                      }));
                                    }} className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${entry.bauteil.includes(opt) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}>
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Datum der Feststellung</Label>
                                <Input type="date" value={entry.dateFound} onChange={(e) => setEditDefectEntries(prev => prev.map((ent, i) => {
                                  if (i !== index) return ent;
                                  const updated = { ...ent, dateFound: e.target.value };
                                  if (updated.frist) updated.repairDue = calcRepairDue(e.target.value, updated.frist);
                                  return updated;
                                }))} required className="bg-card border-border h-9 text-sm" data-testid={`edit-input-defect-date-${index}`} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Lage</Label>
                                <Input value={entry.location} onChange={(e) => setEditDefectEntries(prev => prev.map((ent, i) => i === index ? { ...ent, location: e.target.value } : ent))} placeholder="z.B. Keller, 2. OG" required className="bg-card border-border h-9 text-sm" data-testid={`edit-input-defect-location-${index}`} />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Beschreibung</Label>
                              <Textarea value={entry.description} onChange={(e) => setEditDefectEntries(prev => prev.map((ent, i) => i === index ? { ...ent, description: e.target.value } : ent))} placeholder="Beschreibung des Mangels..." required className="bg-card border-border min-h-[60px] text-sm" data-testid={`edit-input-defect-description-${index}`} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Status</Label>
                              <Select value={entry.status} onValueChange={(val) => setEditDefectEntries(prev => prev.map((ent, i) => i === index ? { ...ent, status: val } : ent))}>
                                <SelectTrigger className="bg-card border-border h-9 text-sm" data-testid={`edit-select-defect-status-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="leichter_mangel">Leichter Mangel</SelectItem>
                                  <SelectItem value="grober_mangel">Grober Mangel</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Frist</Label>
                                <Select value={entry.frist} onValueChange={(val) => setEditDefectEntries(prev => prev.map((ent, i) => {
                                  if (i !== index) return ent;
                                  const updated = { ...ent, frist: val };
                                  if (updated.dateFound) updated.repairDue = calcRepairDue(updated.dateFound, val);
                                  return updated;
                                }))}>
                                  <SelectTrigger className="bg-card border-border h-9 text-sm" data-testid={`edit-select-defect-frist-${index}`}>
                                    <SelectValue placeholder="Frist wählen" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1_woche">1 Woche</SelectItem>
                                    <SelectItem value="2_wochen">2 Wochen</SelectItem>
                                    <SelectItem value="1_monat">1 Monat</SelectItem>
                                    <SelectItem value="2_monate">2 Monate</SelectItem>
                                    <SelectItem value="6_monate">6 Monate</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Reparatur bis</Label>
                                <Input type="date" value={entry.repairDue} readOnly className="bg-card border-border h-9 text-sm text-muted-foreground" data-testid={`edit-input-defect-repair-due-${index}`} />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Foto</Label>
                              {entry.imageFile ? (
                                <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border">
                                  <Image className="w-4 h-4 text-primary shrink-0" />
                                  <span className="text-xs text-foreground truncate flex-1">{entry.imageFile.name}</span>
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => {
                                    setEditDefectEntries(prev => prev.map((ent, i) => i === index ? { ...ent, imageFile: null } : ent));
                                  }} data-testid={`edit-button-remove-defect-image-${index}`}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : entry.imageUrl ? (
                                <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border">
                                  <img src={entry.imageUrl} alt="Mangel" className="w-12 h-12 object-cover rounded" />
                                  <span className="text-xs text-foreground flex-1">Vorhandenes Bild</span>
                                  <label className="text-xs text-primary cursor-pointer hover:underline">
                                    Ersetzen
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setEditDefectEntries(prev => prev.map((ent, i) => i === index ? { ...ent, imageFile: file } : ent));
                                      }
                                    }} />
                                  </label>
                                </div>
                              ) : (
                                <label className="flex items-center gap-2 p-2 bg-card border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors" data-testid={`edit-input-defect-image-${index}`}>
                                  <ImagePlus className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Bild hochladen</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setEditDefectEntries(prev => prev.map((ent, i) => i === index ? { ...ent, imageFile: file } : ent));
                                    }
                                  }} />
                                </label>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={editInspSubmitting} data-testid="button-submit-edit-inspection">
                      {editInspSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Änderungen speichern
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="space-y-6">
                {inspections?.length === 0 ? (
                  <div className="p-8 text-center bg-card border border-border rounded-2xl text-muted-foreground">Keine Prüfungen erfasst.</div>
                ) : (
                  inspections?.map(ins => {
                    const primaryDefects = ins.defects?.filter((d: any) => !d.parentDefectId) || [];
                    const followUps = ins.defects?.filter((d: any) => d.parentDefectId) || [];
                    const isInsExpanded = expandedInspId === ins.id;
                    
                    return (
                      <div key={ins.id} className={`bg-card border rounded-2xl shadow-sm overflow-hidden transition-all ${isInsExpanded ? 'border-primary/40' : 'border-border'}`} data-testid={`inspection-card-${ins.id}`}>
                        <div
                          className="p-5 cursor-pointer"
                          onClick={() => setExpandedInspId(prev => prev === ins.id ? null : ins.id)}
                          data-testid={`inspection-toggle-${ins.id}`}
                        >
                          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border
                                ${ins.status === 'OK' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                  ins.status === 'urgent' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                                  'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                {ins.status === 'OK' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-lg">{inspTypeLabels[(ins as any).type] || "Erstprüfung"} — {format(new Date(ins.date), 'dd.MM.yyyy')}</p>
                                <p className="text-sm text-muted-foreground mt-1">{ins.notes || 'Keine Anmerkungen.'}</p>
                                {ins.engineer && (
                                  <p className="text-xs text-muted-foreground mt-2 font-medium">Ingenieur: {ins.engineer.firstName} {ins.engineer.lastName}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isAdmin && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openEditInspection(ins); }} data-testid={`button-edit-inspection-${ins.id}`}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm("Prüfung und alle zugehörigen Mängel wirklich löschen?")) deleteInspection.mutate({ id: ins.id, projectId }); }} data-testid={`button-delete-inspection-${ins.id}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase
                                ${ins.status === 'OK' ? 'text-emerald-500 border-emerald-500/30' : 
                                  ins.status === 'urgent' ? 'text-destructive border-destructive/30' : 
                                  'text-amber-500 border-amber-500/30'}`}>
                                {inspStatusLabels[ins.status] || ins.status}
                              </span>
                              {isInsExpanded ? (
                                <ChevronDown className="w-5 h-5 text-primary" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isInsExpanded && ins.defects && ins.defects.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" data-testid={`defects-table-${ins.id}`}>
                              <thead>
                                <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                                  <th className="text-left px-5 py-3 font-semibold">Mangel-Nr.</th>
                                  <th className="text-left px-5 py-3 font-semibold">Bauteil</th>
                                  <th className="text-left px-5 py-3 font-semibold">Datum der Feststellung</th>
                                  <th className="text-left px-5 py-3 font-semibold">Beschreibung</th>
                                  <th className="text-left px-5 py-3 font-semibold">Lage</th>
                                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                                  <th className="text-left px-5 py-3 font-semibold">Frist</th>
                                  <th className="text-left px-5 py-3 font-semibold">Reparatur bis</th>
                                  <th className="text-left px-5 py-3 font-semibold">Foto</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {primaryDefects.map((defect: any) => {
                                  const children = followUps.filter((f: any) => f.parentDefectId === defect.id);
                                  return (
                                    <Fragment key={defect.id}>
                                      <tr key={defect.id} className="hover:bg-muted/40 transition-colors" data-testid={`defect-row-${defect.defectId}`}>
                                        <td className="px-5 py-3">
                                          <div className="flex items-center gap-2">
                                            <Hash className="w-3.5 h-3.5 text-primary" />
                                            <span className="font-mono font-semibold text-primary">{defect.defectId}</span>
                                          </div>
                                        </td>
                                        <td className="px-5 py-3 text-foreground">{defect.bauteil && defect.bauteil.length > 0 ? defect.bauteil.join(", ") : "–"}</td>
                                        <td className="px-5 py-3">
                                          <div className="flex items-center gap-2 text-foreground">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            {format(new Date(defect.dateFound), 'MMM d, yyyy')}
                                          </div>
                                        </td>
                                        <td className="px-5 py-3 text-foreground max-w-xs">{defect.description}</td>
                                        <td className="px-5 py-3">
                                          <div className="flex items-center gap-2 text-foreground">
                                            <MapPinned className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            {defect.location}
                                          </div>
                                        </td>
                                        <td className="px-5 py-3">
                                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase
                                            ${defect.status === 'grober_mangel' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                                              'text-amber-500 border-amber-500/30 bg-amber-500/10'}`}>
                                            {defectStatusLabels[defect.status] || defect.status}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3 text-foreground">{defect.frist ? fristLabels[defect.frist] || defect.frist : "–"}</td>
                                        <td className="px-5 py-3 text-foreground">{defect.repairDue ? format(new Date(defect.repairDue), 'dd.MM.yyyy') : "–"}</td>
                                        <td className="px-5 py-3">
                                          {defect.imageUrl ? (
                                            <a href={defect.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all" data-testid={`defect-image-${defect.defectId}`}>
                                              <img src={defect.imageUrl} alt="Mangel" className="w-full h-full object-cover" />
                                            </a>
                                          ) : (
                                            <span className="text-muted-foreground">–</span>
                                          )}
                                        </td>
                                      </tr>
                                      {children.map((child: any) => (
                                        <tr key={child.id} className="bg-muted/10 hover:bg-muted/40 transition-colors" data-testid={`defect-row-${child.defectId}`}>
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-2 pl-4">
                                              <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground" />
                                              <span className="font-mono font-semibold text-muted-foreground">{child.defectId}</span>
                                            </div>
                                          </td>
                                          <td className="px-5 py-3 text-foreground">{child.bauteil && child.bauteil.length > 0 ? child.bauteil.join(", ") : "–"}</td>
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-2 text-foreground">
                                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                              {format(new Date(child.dateFound), 'MMM d, yyyy')}
                                            </div>
                                          </td>
                                          <td className="px-5 py-3 text-foreground max-w-xs">{child.description}</td>
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-2 text-foreground">
                                              <MapPinned className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                              {child.location}
                                            </div>
                                          </td>
                                          <td className="px-5 py-3">
                                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase
                                              ${child.status === 'grober_mangel' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                                                'text-amber-500 border-amber-500/30 bg-amber-500/10'}`}>
                                              {defectStatusLabels[child.status] || child.status}
                                            </span>
                                          </td>
                                          <td className="px-5 py-3 text-foreground">{child.frist ? fristLabels[child.frist] || child.frist : "–"}</td>
                                          <td className="px-5 py-3 text-foreground">{child.repairDue ? format(new Date(child.repairDue), 'dd.MM.yyyy') : "–"}</td>
                                          <td className="px-5 py-3">
                                            {child.imageUrl ? (
                                              <a href={child.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all" data-testid={`defect-image-${child.defectId}`}>
                                                <img src={child.imageUrl} alt="Mangel" className="w-full h-full object-cover" />
                                              </a>
                                            ) : (
                                              <span className="text-muted-foreground">–</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {isInsExpanded && (!ins.defects || ins.defects.length === 0) && (
                          <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground">Keine Mängel für diese Prüfung erfasst.</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Events Timeline */}
            <TabsContent value="events" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xl">Projektzeitleiste</h3>
                {isAdmin && (
                  <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-card border-border hover:bg-muted/60">
                        <Plus className="w-4 h-4 mr-2" /> Termin hinzufügen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Termin planen</DialogTitle></DialogHeader>
                      <form onSubmit={handleEventSubmit(onEventSubmit)} className="space-y-4">
                        <div className="space-y-2"><Label>Titel</Label><Input {...eventReg("title")} required className="bg-background"/></div>
                        <div className="space-y-2"><Label>Datum</Label><Input type="date" {...eventReg("date")} required className="bg-background"/></div>
                        <div className="space-y-2"><Label>Beschreibung</Label><Input {...eventReg("description")} className="bg-background"/></div>
                        <Button type="submit" className="w-full" disabled={createEvent.isPending}>Termin hinzufügen</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="bg-card border border-border rounded-2xl p-6">
                {events?.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">Keine anstehenden Termine.</div>
                ) : (
                  <div className="relative border-l-2 border-border ml-3 space-y-8 py-2">
                    {events?.map(ev => (
                      <div key={ev.id} className="relative pl-8">
                        <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div className="bg-background border border-border rounded-xl p-4 shadow-sm hover-elevate">
                          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(ev.date), 'MMMM d, yyyy')}
                          </div>
                          <h4 className="font-bold text-foreground text-lg">{ev.title}</h4>
                          {ev.description && <p className="text-muted-foreground text-sm mt-2">{ev.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </Layout>
  );
}
