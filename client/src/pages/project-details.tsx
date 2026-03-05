import { useState, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { displayName, displayInitials } from "@/lib/utils";
import { MapPlaceholder } from "@/components/map-placeholder";
import { useProject, useUpdateProject, useDefectSummary } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-users";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import { useInspections, useCreateInspection, useCreateDefect, useUpdateInspection, useUpdateDefect, useDeleteDefect, useDeleteInspection } from "@/hooks/use-inspections";
import { useBauakte, useImportBauakt, useUploadBauaktFiles } from "@/hooks/use-bauakte";
import { useProjectImages, useUploadProjectImages, useDeleteProjectImage } from "@/hooks/use-project-images";
import { useProfile } from "@/hooks/use-profile";
import { format } from "date-fns";
import { 
  Building, MapPin, Calendar, FileText, ChevronRight, ChevronDown, Download, Clock, CheckCircle2, AlertTriangle, Plus, Upload, Loader2, CornerDownRight, Hash, MapPinned, Pencil, Archive, ExternalLink, FileUp, Trash2, ImagePlus, Image, X, LayoutGrid, List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useQueryClient } from "@tanstack/react-query";
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
  needs_repair: "Leichter Mangel",
  urgent: "Schwerer Mangel",
};

const defectStatusLabels: Record<string, string> = {
  leichter_mangel: "Leichter Mangel",
  grober_mangel: "Schwerer Mangel",
};

const inspTypeLabels: Record<string, string> = {
  erstpruefung: "Erstprüfung",
  folgepruefung: "Folgeprüfung",
};

const BAUTEIL_OPTIONS_SIMPLE = ["Dach", "Fassade/Gesimse", "Decken", "Treppen", "Wände"] as const;

const BAUTEIL_OPTIONS = [
  { label: "Fassade/Gesimse", level: 0 },
  { label: "Verputz", level: 1, ref: "1.1", defaultGegenstand: "Risse, lose Teile, Hohlstellen, Abplatzungen" },
  { label: "Gesimse", level: 1, ref: "1.2", defaultGegenstand: "Risse, lose Teile, Hohlstellen, Abplatzungen" },
  { label: "Fenster", level: 1, ref: "1.3", defaultGegenstand: "Verformungen, Sprünge, Verglasungen, Rahmen, Absturzsicherung" },
  { label: "Sonderbauteile", level: 1, ref: "1.4", defaultGegenstand: "z.B. Befestigungen von SAT-Anlagen" },
  { label: "Dach", level: 0 },
  { label: "Konstruktion", level: 1, ref: "2.1", defaultGegenstand: "Zustand" },
  { label: "Eindeckung, Schneefangeinrichtung", level: 1, ref: "2.2", defaultGegenstand: "lose Teile, Fehlstellen" },
  { label: "Saum-, Hängerinnen", level: 1, ref: "2.3", defaultGegenstand: "lose Teile, Fehlstellen" },
  { label: "Kamin-, Lüftungsköpfe", level: 1, ref: "2.4", defaultGegenstand: "Standsicherheit" },
  { label: "Decken/Treppen", level: 0 },
  { label: "Konstruktion (Decken)", level: 1, ref: "3.1", defaultGegenstand: "Zustand" },
  { label: "Treppen, Außentreppen, Rampen, sonst. Rettungswege", level: 1, ref: "3.2", defaultGegenstand: "Zustand (Risse, Schäden an Stufen)" },
  { label: "Geländer, Absturzsicherungen", level: 1, ref: "3.3", defaultGegenstand: "Befestigungen, Handlauf, Füllung, Steher" },
  { label: "Sonderbauteile (Decken/Treppen)", level: 1, ref: "3.4" },
  { label: "Wände", level: 0 },
  { label: "Konstruktion (Wände)", level: 1, ref: "4.1", defaultGegenstand: "Zustand" },
  { label: "Wände Brandabschnitte", level: 1, ref: "4.2", defaultGegenstand: "Zustand (Leichtbauwand, Rohrdurchführungen)" },
  { label: "Türen und sonst. Öffnungen Brandabschnitte", level: 1, ref: "4.3", defaultGegenstand: "Funktionskontrolle" },
  { label: "Sonderbauteile (Wände)", level: 1, ref: "4.4" },
];

function getParentBauteil(label: string): string | null {
  const idx = BAUTEIL_OPTIONS.findIndex(b => b.label === label);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (BAUTEIL_OPTIONS[i].level === 0) return BAUTEIL_OPTIONS[i].label;
  }
  return null;
}

interface BauteilMangel {
  defectId: string;
  description: string;
  location: string;
  status: string;
  dateFound: string;
  frist: string;
  repairDue: string;
  imageFiles: File[];
  imageUrls: string[];
  existingDefectId?: number;
}

interface BauteilPruefung {
  bauteil: string;
  level: number;
  refNr: string;
  artDesMangels: string;
  geprueft: boolean;
  mangel: boolean;
  vertieftePruefung: boolean;
  vertieftePruefungText: string;
  maengel: BauteilMangel[];
}

interface BauteilRowProps {
  bp: BauteilPruefung;
  index: number;
  isDefault: boolean;
  isHeader: boolean;
  onUpdate: (index: number, field: keyof BauteilPruefung, value: any) => void;
  onRemove: (index: number) => void;
  onAddMangel: (index: number) => void;
  onUpdateMangel: (bauteilIndex: number, mangelIndex: number, field: keyof BauteilMangel, value: string) => void;
  onAddMangelImages: (bauteilIndex: number, mangelIndex: number, files: File[]) => void;
  onRemoveMangelFile: (bauteilIndex: number, mangelIndex: number, fileIndex: number) => void;
  onRemoveMangelUrl: (bauteilIndex: number, mangelIndex: number, url: string) => void;
  onRemoveMangel: (bauteilIndex: number, mangelIndex: number) => void;
}

function BauteilRow({ bp, index, isDefault, isHeader, onUpdate, onRemove, onAddMangel, onUpdateMangel, onAddMangelImages, onRemoveMangelFile, onRemoveMangelUrl, onRemoveMangel }: BauteilRowProps) {
  const [expanded, setExpanded] = useState(bp.maengel.length > 0);
  const hasMaengel = bp.maengel.length > 0;
  const prevLenRef = useRef(bp.maengel.length);
  useEffect(() => {
    if (bp.maengel.length > prevLenRef.current) setExpanded(true);
    prevLenRef.current = bp.maengel.length;
  }, [bp.maengel.length]);

  return (
    <>
      <tr className={`border-b border-border hover:bg-muted/20 transition-colors ${bp.level > 0 ? "bg-muted/5" : ""}`} data-testid={`bauteil-row-${index}`}>
        <td className="px-2 py-2.5 w-[45px]">
          {bp.refNr ? <span className="text-xs font-mono text-muted-foreground">{bp.refNr}</span> : null}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: bp.level > 0 ? `${bp.level * 8}px` : undefined }}>
            {isDefault || isHeader ? (
              <span className={bp.level > 0 ? "text-sm text-muted-foreground" : "font-medium text-foreground"}>{bp.bauteil}</span>
            ) : (
              <Input value={bp.bauteil} onChange={(e) => onUpdate(index, "bauteil", e.target.value)} placeholder="Bauteil..." className="h-8 text-sm bg-background border-border" data-testid={`input-bauteil-name-${index}`} />
            )}
            {hasMaengel && (
              <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-0.5" data-testid={`button-toggle-maengel-${index}`}>
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="text-xs ml-0.5">({bp.maengel.length})</span>
              </button>
            )}
          </div>
        </td>
        {isHeader ? (
          <td colSpan={5} className="px-3 py-2.5"></td>
        ) : (
          <>
            <td className="px-3 py-2.5">
              <Input value={bp.artDesMangels} onChange={(e) => onUpdate(index, "artDesMangels", e.target.value)} placeholder="Gegenstand..." className="h-8 text-sm bg-background border-border" data-testid={`input-art-mangel-${index}`} />
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center"><Checkbox checked={bp.geprueft} onCheckedChange={(checked) => onUpdate(index, "geprueft", !!checked)} data-testid={`checkbox-geprueft-${index}`} /></div>
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center"><Checkbox checked={bp.mangel} onCheckedChange={(checked) => onUpdate(index, "mangel", !!checked)} data-testid={`checkbox-mangel-${index}`} /></div>
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center"><Checkbox checked={bp.vertieftePruefung} onCheckedChange={(checked) => onUpdate(index, "vertieftePruefung", !!checked)} data-testid={`checkbox-vertiefte-${index}`} /></div>
            </td>
            <td className="px-2 py-2.5">
              <div className="flex items-center gap-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onAddMangel(index)} title="Mangel hinzufügen" data-testid={`button-add-mangel-${index}`}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                {!isDefault && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onRemove(index)} data-testid={`button-remove-bauteil-${index}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </td>
          </>
        )}
      </tr>
      {bp.vertieftePruefung && (
        <tr className="border-b border-border bg-blue-50/20 dark:bg-blue-900/10" data-testid={`vertiefte-pruefung-row-${index}`}>
          <td colSpan={7} className="px-3 py-3">
            <div className="ml-4 border-l-2 border-blue-500/40 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Vertiefte Prüfung — {bp.bauteil || "Bauteil"}</span>
              </div>
              <Input
                value={bp.vertieftePruefungText || ""}
                onChange={(e) => onUpdate(index, "vertieftePruefungText", e.target.value)}
                placeholder="Beschreibung der vertieften Prüfung..."
                className="h-8 text-sm bg-background border-border"
                data-testid={`input-vertiefte-pruefung-${index}`}
              />
            </div>
          </td>
        </tr>
      )}
      {hasMaengel && expanded && bp.maengel.map((m, mi) => (
        <tr key={`mangel-${index}-${mi}`} className="border-b border-border bg-muted/10" data-testid={`mangel-row-${index}-${mi}`}>
          <td colSpan={7} className="px-3 py-3">
            <div className="ml-4 border-l-2 border-primary/30 pl-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mangel {mi + 1} — {bp.bauteil || "Bauteil"}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onRemoveMangel(index, mi)} data-testid={`button-remove-mangel-${index}-${mi}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Mangel-ID *</Label>
                  <Input value={m.defectId} onChange={(e) => onUpdateMangel(index, mi, "defectId", e.target.value)} placeholder="z.B. M-001" className="h-8 text-sm mt-1" data-testid={`input-mangel-id-${index}-${mi}`} />
                </div>
                <div>
                  <Label className="text-xs">Datum *</Label>
                  <Input type="date" value={m.dateFound} onChange={(e) => onUpdateMangel(index, mi, "dateFound", e.target.value)} className="h-8 text-sm mt-1" data-testid={`input-mangel-date-${index}-${mi}`} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Beschreibung *</Label>
                  <Input value={m.description} onChange={(e) => onUpdateMangel(index, mi, "description", e.target.value)} placeholder="Beschreibung des Mangels..." className="h-8 text-sm mt-1" data-testid={`input-mangel-desc-${index}-${mi}`} />
                </div>
                <div>
                  <Label className="text-xs">Ort *</Label>
                  <Input value={m.location} onChange={(e) => onUpdateMangel(index, mi, "location", e.target.value)} placeholder="z.B. 2. OG links" className="h-8 text-sm mt-1" data-testid={`input-mangel-location-${index}-${mi}`} />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={m.status} onValueChange={(v) => onUpdateMangel(index, mi, "status", v)}>
                    <SelectTrigger className="h-8 text-sm mt-1" data-testid={`select-mangel-status-${index}-${mi}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leichter_mangel">Leichter Mangel</SelectItem>
                      <SelectItem value="grober_mangel">Schwerer Mangel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Frist</Label>
                  <Select value={m.frist} onValueChange={(v) => onUpdateMangel(index, mi, "frist", v)}>
                    <SelectTrigger className="h-8 text-sm mt-1" data-testid={`select-mangel-frist-${index}-${mi}`}><SelectValue placeholder="Keine" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(fristLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {m.repairDue && (
                  <div>
                    <Label className="text-xs">Reparatur bis</Label>
                    <Input value={m.repairDue} disabled className="h-8 text-sm mt-1 bg-muted" data-testid={`input-mangel-repairdue-${index}-${mi}`} />
                  </div>
                )}
                <div className="col-span-2">
                  <Label className="text-xs">Fotos</Label>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {(m.imageUrls || []).map((url, ui) => (
                      <div key={`url-${ui}`} className="relative group">
                        <div className="w-16 h-16 rounded-lg border border-border overflow-hidden">
                          <img src={url} alt="Mangel" className="w-full h-full object-cover" />
                        </div>
                        <button type="button" onClick={() => onRemoveMangelUrl(index, mi, url)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-remove-mangel-url-${index}-${mi}-${ui}`}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(m.imageFiles || []).map((file, fi) => (
                      <div key={`file-${fi}`} className="relative group">
                        <div className="w-16 h-16 rounded-lg border border-border overflow-hidden">
                          <img src={URL.createObjectURL(file)} alt="Mangel" className="w-full h-full object-cover" />
                        </div>
                        <button type="button" onClick={() => onRemoveMangelFile(index, mi, fi)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-remove-mangel-file-${index}-${mi}-${fi}`}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors text-xs" data-testid={`button-add-mangel-image-${index}-${mi}`}>
                      <ImagePlus className="w-4 h-4" />
                      Foto hinzufügen
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) onAddMangelImages(index, mi, files); }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

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
  "umgehend": "Umgehend",
  "6_monate": "6 Monate",
  "1_jahr": "1 Jahr",
};

function calcRepairDue(dateFound: string, frist: string): string {
  if (!dateFound || !frist) return "";
  const d = new Date(dateFound);
  switch (frist) {
    case "umgehend": break;
    case "6_monate": d.setMonth(d.getMonth() + 6); break;
    case "1_jahr": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

export default function ProjectDetails() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: documents } = useDocuments(projectId);

  const { data: inspections } = useInspections(projectId);
  const { data: profile } = useProfile();
  
  const { data: clients } = useClients();
  const { data: defectSummary } = useDefectSummary();
  const { data: bauakte } = useBauakte(projectId);
  const { data: projectImages } = useProjectImages(projectId);
  const uploadProjectImages = useUploadProjectImages();
  const deleteProjectImage = useDeleteProjectImage();
  const queryClient = useQueryClient();
  const createDocument = useCreateDocument();

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

  const [inspDialogOpen, setInspDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [imageViewMode, setImageViewMode] = useState<"grid" | "list">("grid");
  const [deleteInspectionId, setDeleteInspectionId] = useState<number | null>(null);
  const [bauaktSearch, setBauaktSearch] = useState("");

  const isAdmin = profile?.role === "admin";

  const [defectEntries, setDefectEntries] = useState<DefectEntry[]>([]);
  const [editInspDialogOpen, setEditInspDialogOpen] = useState(false);
  const [expandedInspId, setExpandedInspId] = useState<number | null>(null);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [editDefectEntries, setEditDefectEntries] = useState<(DefectEntry & { existingId?: number })[]>([]);
  const [editInspSubmitting, setEditInspSubmitting] = useState(false);
  const [deletedDefectIds, setDeletedDefectIds] = useState<number[]>([]);
  const [editBauteilPruefungen, setEditBauteilPruefungen] = useState<BauteilPruefung[]>([]);

  const [bauteilPruefungen, setBauteilPruefungen] = useState<BauteilPruefung[]>(
    BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: (b as any).ref || "", artDesMangels: (b as any).defaultGegenstand || "", geprueft: true, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] }))
  );

  const updateBauteilPruefung = (index: number, field: keyof BauteilPruefung, value: any) => {
    setBauteilPruefungen(prev => prev.map((bp, i) => i === index ? { ...bp, [field]: value } : bp));
  };

  const addBauteilPruefung = () => {
    setBauteilPruefungen(prev => {
      const hasSonderbauteileHeader = prev.some(b => b.bauteil === "Sonderbauteile" && b.level === 0);
      const customCount = prev.filter(b => b.refNr.startsWith("5.")).length;
      const nextRef = `5.${customCount + 1}`;
      const newChild = { bauteil: "", level: 1, refNr: nextRef, artDesMangels: "", geprueft: true, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
      if (!hasSonderbauteileHeader) {
        const header = { bauteil: "Sonderbauteile", level: 0, refNr: "", artDesMangels: "", geprueft: true, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
        return [...prev, header, newChild];
      }
      return [...prev, newChild];
    });
  };

  const addBauteilMangel = (bauteilIndex: number) => {
    setBauteilPruefungen(prev => {
      const updated = [...prev];
      updated[bauteilIndex] = {
        ...updated[bauteilIndex],
        mangel: true,
        maengel: [...updated[bauteilIndex].maengel, { defectId: "", description: "", location: "", status: "leichter_mangel", dateFound: "", frist: "", repairDue: "", imageFiles: [], imageUrls: [] }],
      };
      return updated;
    });
  };

  const updateBauteilMangel = (bauteilIndex: number, mangelIndex: number, field: keyof BauteilMangel, value: string) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const maengel = bp.maengel.map((m, mi) => {
        if (mi !== mangelIndex) return m;
        const updated = { ...m, [field]: value };
        if (field === "frist" || field === "dateFound") {
          const df = field === "dateFound" ? value : updated.dateFound;
          const fr = field === "frist" ? value : updated.frist;
          updated.repairDue = calcRepairDue(df, fr);
        }
        return updated;
      });
      return { ...bp, maengel };
    }));
  };

  const addBauteilMangelImages = (bauteilIndex: number, mangelIndex: number, files: File[]) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const maengel = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFiles: [...(m.imageFiles || []), ...files] } : m);
      return { ...bp, maengel };
    }));
  };

  const removeBauteilMangelFile = (bauteilIndex: number, mangelIndex: number, fileIndex: number) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const maengel = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFiles: (m.imageFiles || []).filter((_, i) => i !== fileIndex) } : m);
      return { ...bp, maengel };
    }));
  };

  const removeBauteilMangelUrl = (bauteilIndex: number, mangelIndex: number, url: string) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const maengel = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageUrls: (m.imageUrls || []).filter(u => u !== url) } : m);
      return { ...bp, maengel };
    }));
  };

  const removeBauteilMangel = (bauteilIndex: number, mangelIndex: number) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const maengel = bp.maengel.filter((_, mi) => mi !== mangelIndex);
      return { ...bp, maengel, mangel: maengel.length > 0 ? bp.mangel : false };
    }));
  };

  const removeBauteilPruefung = (index: number) => {
    setBauteilPruefungen(prev => prev.filter((_, i) => i !== index));
  };

  const resetBauteilPruefungen = () => {
    setBauteilPruefungen(BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: (b as any).ref || "", artDesMangels: (b as any).defaultGegenstand || "", geprueft: true, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] })));
  };

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

  const [docFiles, setDocFiles] = useState<File[]>([]);
  const { register: docReg, handleSubmit: handleDocSubmit, reset: resetDocForm } = useForm({
    defaultValues: { name: "" }
  });

  const onDocSubmit = (data: any) => {
    if (docFiles.length === 0) return;
    const formData = new FormData();
    docFiles.forEach(f => formData.append('file', f));
    if (docFiles.length === 1 && data.name) {
      formData.append('name', data.name);
    }
    createDocument.mutate({ projectId, formData }, {
      onSuccess: () => {
        setDocDialogOpen(false);
        setDocFiles([]);
        resetDocForm();
      }
    });
  };


  const { register: inspReg, handleSubmit: handleInspSubmit, setValue: setInspValue, reset: resetInspForm } = useForm({
    defaultValues: { date: "", status: "OK", type: "erstpruefung", notes: "" }
  });

  const [inspSubmitting, setInspSubmitting] = useState(false);

  const onInspSubmit = async (data: any) => {
    setInspSubmitting(true);
    try {
      const bauteilNotes = bauteilPruefungen
        .filter(bp => bp.geprueft || bp.mangel || bp.vertieftePruefung)
        .map(bp => {
          const parts = [`[${bp.bauteil}]`];
          if (bp.artDesMangels) parts.push(`Gegenstand: ${bp.artDesMangels}`);
          if (bp.geprueft) parts.push("geprüft");
          if (bp.mangel) parts.push("Mangel");
          if (bp.vertieftePruefung) parts.push(bp.vertieftePruefungText ? `vertiefte Prüfung: ${bp.vertieftePruefungText}` : "vertiefte Prüfung erforderlich");
          return parts.join(" - ");
        })
        .join("; ");

      const fullNotes = bauteilNotes ? `${data.notes || ""} | Bauteilprüfung: ${bauteilNotes}`.trim() : (data.notes || "");

      const hasGroberMangel = bauteilPruefungen.some(bp => bp.maengel.some(m => m.status === "grober_mangel"));
      const hasMangel = bauteilPruefungen.some(bp => bp.mangel || bp.maengel.length > 0);
      const autoStatus = hasGroberMangel ? "urgent" : hasMangel ? "needs_repair" : data.status;

      const inspection = await createInspection.mutateAsync({ 
        projectId, 
        data: { 
          projectId,
          engineerId: profile!.userId,
          date: new Date(data.date), 
          status: autoStatus,
          type: data.type,
          notes: fullNotes || null 
        } 
      });

      for (const bp of bauteilPruefungen) {
        for (const m of bp.maengel) {
          if (!m.defectId || !m.dateFound) continue;
          const defect = await createDefect.mutateAsync({
            inspectionId: inspection.id,
            projectId,
            data: {
              inspectionId: inspection.id,
              defectId: m.defectId,
              bauteil: getParentBauteil(bp.bauteil) ? [getParentBauteil(bp.bauteil)!, bp.bauteil] : [bp.bauteil],
              dateFound: new Date(m.dateFound),
              description: m.description || bp.bauteil,
              location: m.location || "–",
              status: m.status as "leichter_mangel" | "grober_mangel",
              frist: (m.frist || null) as any,
              repairDue: m.repairDue ? new Date(m.repairDue) : null,
            }
          });
          if (defect?.id && m.imageFiles?.length) {
            for (const imgFile of m.imageFiles) {
              const formData = new FormData();
              formData.append('image', imgFile);
              await fetch(`/api/defects/${defect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
            }
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/inspections`] });
      queryClient.invalidateQueries({ queryKey: ["/api/defects/summary"] });
      setInspDialogOpen(false);
      resetInspForm();
      setDefectEntries([]);
      resetBauteilPruefungen();
    } catch (error) {
      console.error("Failed to create inspection:", error);
    } finally {
      setInspSubmitting(false);
    }
  };

  const updateEditBauteilPruefung = (index: number, field: keyof BauteilPruefung, value: any) => {
    setEditBauteilPruefungen(prev => prev.map((bp, i) => i === index ? { ...bp, [field]: value } : bp));
  };

  const addEditCustomBauteil = () => {
    setEditBauteilPruefungen(prev => {
      const hasSonderbauteileHeader = prev.some(b => b.bauteil === "Sonderbauteile" && b.level === 0);
      const customCount = prev.filter(b => b.refNr.startsWith("5.")).length;
      const nextRef = `5.${customCount + 1}`;
      const newChild = { bauteil: "", level: 1, refNr: nextRef, artDesMangels: "", geprueft: true, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
      if (!hasSonderbauteileHeader) {
        const header = { bauteil: "Sonderbauteile", level: 0, refNr: "", artDesMangels: "", geprueft: true, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
        return [...prev, header, newChild];
      }
      return [...prev, newChild];
    });
  };

  const removeEditBauteilPruefung = (index: number) => {
    setEditBauteilPruefungen(prev => prev.filter((_, i) => i !== index));
  };

  const addEditMangelToBauteil = (bauteilIndex: number) => {
    setEditBauteilPruefungen(prev => {
      const bp = prev[bauteilIndex];
      const opt = BAUTEIL_OPTIONS.find(o => o.label === bp.bauteil);
      const ref = opt?.ref || "";
      const nextNum = bp.maengel.length + 1;
      const autoId = ref ? `M ${ref}.${nextNum}` : `M-${nextNum}`;
      const inspDate = watchEditInsp("date") || new Date().toISOString().split("T")[0];
      return prev.map((b, i) => i === bauteilIndex
        ? { ...b, mangel: true, maengel: [...b.maengel, { defectId: autoId, description: "", location: "", status: "leichter_mangel", dateFound: inspDate, frist: "", repairDue: "", imageFiles: [], imageUrls: [] }] }
        : b
      );
    });
  };

  const updateEditMangel = (bauteilIndex: number, mangelIndex: number, field: keyof BauteilMangel, value: string) => {
    setEditBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => {
        if (mi !== mangelIndex) return m;
        const newM = { ...m, [field]: value };
        if (field === "dateFound" || field === "frist") {
          newM.repairDue = calcRepairDue(
            field === "dateFound" ? value : m.dateFound,
            field === "frist" ? value : m.frist
          );
        }
        return newM;
      });
      return { ...bp, maengel: updated };
    }));
  };

  const removeEditMangel = (bauteilIndex: number, mangelIndex: number) => {
    setEditBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const newMaengel = bp.maengel.filter((_, mi) => mi !== mangelIndex);
      return { ...bp, maengel: newMaengel, mangel: newMaengel.length > 0 };
    }));
  };

  const addEditMangelImages = (bauteilIndex: number, mangelIndex: number, files: File[]) => {
    setEditBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFiles: [...(m.imageFiles || []), ...files] } : m);
      return { ...bp, maengel: updated };
    }));
  };

  const removeEditMangelFile = (bauteilIndex: number, mangelIndex: number, fileIndex: number) => {
    setEditBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFiles: (m.imageFiles || []).filter((_, i) => i !== fileIndex) } : m);
      return { ...bp, maengel: updated };
    }));
  };

  const removeEditMangelUrl = (bauteilIndex: number, mangelIndex: number, url: string) => {
    setEditBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageUrls: (m.imageUrls || []).filter(u => u !== url) } : m);
      return { ...bp, maengel: updated };
    }));
  };

  const buildEditBauteilState = (ins: any): BauteilPruefung[] => {
    const base = BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: (b as any).ref || "", artDesMangels: (b as any).defaultGegenstand || "", geprueft: false, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] as BauteilMangel[] }));
    const notes = ins.notes || "";
    if (notes.includes("| Bauteilprüfung: ")) {
      const bauteilPart = notes.split("| Bauteilprüfung: ")[1];
      const entries = bauteilPart.split("; ");
      for (const entry of entries) {
        const match = entry.match(/^\[(.+?)\]/);
        if (!match) continue;
        const name = match[1];
        const bp = base.find(b => b.bauteil === name);
        if (!bp) continue;
        const gegenstandMatch = entry.match(/Gegenstand: (.+?)(?:\s*-|$)/);
        if (gegenstandMatch) bp.artDesMangels = gegenstandMatch[1].trim();
        if (entry.includes("geprüft")) bp.geprueft = true;
        if (entry.includes("Mangel")) {
          bp.mangel = true;
          if (!gegenstandMatch) {
            const legacyMatch = entry.match(/Mangel: (.+?)(?:\s*-|$)/);
            if (legacyMatch) bp.artDesMangels = legacyMatch[1].trim();
          }
        }
        if (entry.includes("vertiefte Prüfung")) {
          bp.vertieftePruefung = true;
          const vtMatch = entry.match(/vertiefte Prüfung: (.+)$/);
          if (vtMatch) bp.vertieftePruefungText = vtMatch[1].trim();
        }
      }
    }
    const defects = ins.defects || [];
    for (const d of defects) {
      const bauteilNames: string[] = d.bauteil || [];
      const targetName = bauteilNames[0];
      if (!targetName) continue;
      const bp = base.find(b => b.bauteil === targetName);
      if (!bp) continue;
      bp.mangel = true;
      const existingUrls: string[] = d.imageUrls?.length ? d.imageUrls : (d.imageUrl ? [d.imageUrl] : []);
      bp.maengel.push({
        defectId: d.defectId || "",
        description: d.description || "",
        location: d.location || "",
        status: d.status || "leichter_mangel",
        dateFound: d.dateFound ? format(new Date(d.dateFound), 'yyyy-MM-dd') : "",
        frist: d.frist || "",
        repairDue: d.repairDue ? format(new Date(d.repairDue), 'yyyy-MM-dd') : "",
        imageFiles: [],
        imageUrls: existingUrls,
        existingDefectId: d.id,
      });
    }
    return base;
  };

  const openEditInspection = (ins: any) => {
    setEditingInspection(ins);
    const userNotes = ins.notes?.includes("| Bauteilprüfung: ") ? ins.notes.split("| Bauteilprüfung: ")[0].trim() : (ins.notes || "");
    resetEditInspForm({
      date: ins.date ? format(new Date(ins.date), 'yyyy-MM-dd') : "",
      status: ins.status || "OK",
      type: (ins as any).type || "erstpruefung",
      notes: userNotes,
      engineerId: ins.engineerId || "",
    });
    setEditBauteilPruefungen(buildEditBauteilState(ins));
    setEditDefectEntries([]);
    setDeletedDefectIds([]);
    setEditInspDialogOpen(true);
  };

  const { register: editInspReg, handleSubmit: handleEditInspSubmit, setValue: setEditInspValue, reset: resetEditInspForm, watch: watchEditInsp } = useForm({
    defaultValues: { date: "", status: "OK", type: "erstpruefung", notes: "", engineerId: "" }
  });
  const editInspType = watchEditInsp("type");
  const editInspStatus = watchEditInsp("status");
  const editInspEngineerId = watchEditInsp("engineerId");

  const onEditInspSubmit = async (data: any) => {
    if (!editingInspection) return;
    setEditInspSubmitting(true);
    try {
      const bauteilNotes = editBauteilPruefungen
        .filter(bp => bp.geprueft || bp.mangel || bp.vertieftePruefung)
        .map(bp => {
          const parts = [`[${bp.bauteil}]`];
          if (bp.artDesMangels) parts.push(`Gegenstand: ${bp.artDesMangels}`);
          if (bp.geprueft) parts.push("geprüft");
          if (bp.mangel) parts.push("Mangel");
          if (bp.vertieftePruefung) parts.push(bp.vertieftePruefungText ? `vertiefte Prüfung: ${bp.vertieftePruefungText}` : "vertiefte Prüfung erforderlich");
          return parts.join(" - ");
        })
        .join("; ");

      const fullNotes = bauteilNotes ? `${data.notes || ""} | Bauteilprüfung: ${bauteilNotes}`.trim() : (data.notes || "");

      const hasGroberMangel = editBauteilPruefungen.some(bp => bp.maengel.some(m => m.status === "grober_mangel"));
      const hasMangel = editBauteilPruefungen.some(bp => bp.mangel || bp.maengel.length > 0);
      const autoStatus = hasGroberMangel ? "urgent" : hasMangel ? "needs_repair" : data.status;

      await updateInspection.mutateAsync({
        id: editingInspection.id,
        projectId,
        data: {
          date: new Date(data.date),
          status: autoStatus,
          type: data.type,
          notes: fullNotes || null,
          engineerId: data.engineerId || editingInspection.engineerId,
        }
      });

      for (const id of deletedDefectIds) {
        await deleteDefect.mutateAsync({ id, projectId });
      }

      for (const bp of editBauteilPruefungen) {
        for (const m of bp.maengel) {
          if (!m.defectId || !m.dateFound) continue;
          const existingDefect = m.existingDefectId
            ? editingInspection.defects?.find((d: any) => d.id === m.existingDefectId)
            : editingInspection.defects?.find((d: any) => d.defectId === m.defectId);
          if (existingDefect) {
            const originalUrls: string[] = existingDefect.imageUrls?.length ? existingDefect.imageUrls : (existingDefect.imageUrl ? [existingDefect.imageUrl] : []);
            const currentUrls: string[] = m.imageUrls || [];
            for (const removedUrl of originalUrls.filter((u: string) => !currentUrls.includes(u))) {
              await fetch(`/api/defects/${existingDefect.id}/image`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: removedUrl }), credentials: 'include' });
            }
            await updateDefect.mutateAsync({
              id: existingDefect.id,
              projectId,
              data: {
                defectId: m.defectId,
                bauteil: [bp.bauteil],
                dateFound: new Date(m.dateFound),
                description: m.description,
                location: m.location,
                status: m.status as "leichter_mangel" | "grober_mangel",
                frist: (m.frist || null) as any,
                repairDue: m.repairDue ? new Date(m.repairDue) : null,
              }
            });
            for (const imgFile of (m.imageFiles || [])) {
              const formData = new FormData();
              formData.append('image', imgFile);
              await fetch(`/api/defects/${existingDefect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
            }
          } else {
            const defect = await createDefect.mutateAsync({
              inspectionId: editingInspection.id,
              projectId,
              data: {
                inspectionId: editingInspection.id,
                defectId: m.defectId,
                bauteil: [bp.bauteil],
                dateFound: new Date(m.dateFound),
                description: m.description,
                location: m.location,
                status: m.status as "leichter_mangel" | "grober_mangel",
                frist: (m.frist || null) as any,
                repairDue: m.repairDue ? new Date(m.repairDue) : null,
              }
            });
            if (defect?.id && m.imageFiles?.length) {
              for (const imgFile of m.imageFiles) {
                const formData = new FormData();
                formData.append('image', imgFile);
                await fetch(`/api/defects/${defect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
              }
            }
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

  const { register: editReg, handleSubmit: handleEditSubmit, setValue: setEditValue, watch: watchEdit, reset: resetEditForm } = useForm({
    defaultValues: {
      name: "",
      address: "",
      status: "active",
      clientId: "",
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
      clientId: project.clientId || "",
      verwaltungId: project.verwaltungId || "",
      nextInspectionDue: project.nextInspectionDue
        ? format(new Date(project.nextInspectionDue), 'yyyy-MM-dd')
        : project.createdAt
          ? format(new Date(new Date(project.createdAt).setFullYear(new Date(project.createdAt).getFullYear() + 1)), 'yyyy-MM-dd')
          : "",
    });
    setEditDialogOpen(true);
  };

  const onEditSubmit = (data: any) => {
    const updates: any = {
      name: data.name,
      address: data.address,
      status: data.status,
      clientId: data.clientId || null,
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
                const mangelLabels: Record<string, string> = { kein_mangel: "Kein Mangel", leichter_mangel: "Leichter Mangel", grober_mangel: "Schwerer Mangel" };
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
            <form onSubmit={handleEditSubmit((data) => onEditSubmit({ ...data, name: data.address }))} className="space-y-5 mt-2">
              <input type="hidden" {...editReg("name")} />
              <div className="space-y-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <AddressAutocomplete
                  id="edit-address"
                  value={watchEdit("address")}
                  onChange={(val) => { setEditValue("address", val); setEditValue("name", val); }}
                  required
                  className="bg-background border-border"
                  data-testid="input-edit-address"
                />
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
                        {displayName(client)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>User zuweisen</Label>
                <Select defaultValue={project.clientId || ""} onValueChange={(val) => setEditValue("clientId", val)}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-edit-client">
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
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Verwaltung</p>
              <p className="font-medium" data-testid="text-verwaltung">
                {project.verwaltung 
                  ? displayName(project.verwaltung)
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
            {isAdmin && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">User</p>
                <p className="font-medium" data-testid="text-client-name">
                  {project.client ? displayName(project.client) : '—'}
                </p>
              </div>
            )}
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
                      <DialogHeader><DialogTitle>Dokumente hochladen</DialogTitle></DialogHeader>
                      <form onSubmit={handleDocSubmit(onDocSubmit)} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Dateien auswählen</Label>
                          <Input
                            type="file"
                            multiple
                            onChange={(e) => {
                              const files = e.target.files ? Array.from(e.target.files) : [];
                              setDocFiles(files);
                            }}
                            required
                            className="bg-background"
                            data-testid="input-doc-file"
                          />
                          {docFiles.length > 1 && (
                            <p className="text-xs text-muted-foreground">{docFiles.length} Dateien ausgewählt</p>
                          )}
                        </div>
                        {docFiles.length <= 1 && (
                          <div className="space-y-2"><Label>Dokumentname (optional)</Label><Input {...docReg("name")} placeholder={docFiles[0]?.name || "Wird aus Dateiname übernommen"} className="bg-background" data-testid="input-doc-name"/></div>
                        )}
                        <Button type="submit" className="w-full" disabled={createDocument.isPending || docFiles.length === 0} data-testid="button-doc-submit">
                          {createDocument.isPending ? "Wird hochgeladen..." : docFiles.length > 1 ? `${docFiles.length} Dateien hochladen` : "Hochladen"}
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
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                    <Button
                      variant={imageViewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setImageViewMode("grid")}
                      className="px-3 h-8"
                      data-testid="button-images-view-grid"
                    >
                      <LayoutGrid className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">Kacheln</span>
                    </Button>
                    <Button
                      variant={imageViewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setImageViewMode("list")}
                      className="px-3 h-8"
                      data-testid="button-images-view-list"
                    >
                      <List className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">Liste</span>
                    </Button>
                  </div>
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
              ) : imageViewMode === "grid" ? (
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
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs w-16">Bild</th>
                        <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Dateiname</th>
                        <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Datum</th>
                        <th className="w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {projectImages.map((img: any) => (
                        <tr key={img.id} className="hover:bg-muted/40 transition-colors group" data-testid={`project-image-row-${img.id}`}>
                          <td className="px-6 py-3">
                            <a href={img.url} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded-lg overflow-hidden border border-border">
                              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                            </a>
                          </td>
                          <td className="px-6 py-3">
                            <a href={img.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary transition-colors">
                              {img.name}
                            </a>
                          </td>
                          <td className="px-6 py-3 text-muted-foreground">
                            {img.createdAt ? format(new Date(img.createdAt), 'dd.MM.yyyy') : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <a
                                href={img.url}
                                download={img.name}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`button-download-image-list-${img.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              {isAdmin && (
                                <button
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                  onClick={() => {
                                    if (confirm("Bild wirklich löschen?")) {
                                      deleteProjectImage.mutate({ id: img.id, projectId });
                                    }
                                  }}
                                  data-testid={`button-delete-image-list-${img.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <Dialog open={inspDialogOpen} onOpenChange={(open) => { setInspDialogOpen(open); if (!open) { setDefectEntries([]); resetInspForm(); resetBauteilPruefungen(); } }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-card border-border hover:bg-muted/60" data-testid="button-add-inspection">
                        <Plus className="w-4 h-4 mr-2" /> Prüfung hinzufügen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
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
                                <SelectItem value="needs_repair">Leichter Mangel</SelectItem>
                                <SelectItem value="urgent">Schwerer Mangel</SelectItem>
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
                            <h4 className="font-display font-bold text-base">Bauteilprüfung</h4>
                            <Button type="button" variant="outline" size="sm" onClick={addBauteilPruefung} className="bg-card border-border hover:bg-muted/60" data-testid="button-add-bauteil">
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Sonderbauteil hinzufügen
                            </Button>
                          </div>
                          <div className="overflow-x-auto border border-border rounded-xl">
                            <table className="w-full text-sm" data-testid="bauteil-pruefung-table">
                              <thead>
                                <tr className="bg-muted/30 border-b border-border">
                                  <th className="text-left px-2 py-2 font-semibold w-[45px]">Nr.</th>
                                  <th className="text-left px-3 py-2 font-semibold">Bauteil</th>
                                  <th className="text-left px-3 py-2 font-semibold">Gegenstand</th>
                                  <th className="text-center px-3 py-2 font-semibold w-20">Geprüft</th>
                                  <th className="text-center px-3 py-2 font-semibold w-20">Mangel</th>
                                  <th className="text-center px-3 py-2 font-semibold w-28">Vertiefte Prüfung</th>
                                  <th className="px-2 py-2 w-20"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {bauteilPruefungen.map((bp, index) => {
                                  const defaultOpt = BAUTEIL_OPTIONS.find(o => o.label === bp.bauteil);
                                  const isDefault = !!defaultOpt;
                                  const isHeader = (isDefault && defaultOpt.level === 0) || (!isDefault && bp.level === 0);
                                  return (
                                    <BauteilRow
                                      key={`bp-${index}`}
                                      bp={bp}
                                      index={index}
                                      isDefault={isDefault}
                                      isHeader={isHeader}
                                      onUpdate={updateBauteilPruefung}
                                      onRemove={removeBauteilPruefung}
                                      onAddMangel={addBauteilMangel}
                                      onUpdateMangel={updateBauteilMangel}
                                      onAddMangelImages={addBauteilMangelImages}
                                      onRemoveMangelFile={removeBauteilMangelFile}
                                      onRemoveMangelUrl={removeBauteilMangelUrl}
                                      onRemoveMangel={removeBauteilMangel}
                                    />
                                  );
                                })}
                              </tbody>
                            </table>
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
              <Dialog open={editInspDialogOpen} onOpenChange={(open) => { setEditInspDialogOpen(open); if (!open) { setEditingInspection(null); setEditDefectEntries([]); setDeletedDefectIds([]); setEditBauteilPruefungen([]); } }}>
                <DialogContent className="bg-card border-border sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
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
                            <SelectItem value="needs_repair">Leichter Mangel</SelectItem>
                            <SelectItem value="urgent">Schwerer Mangel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Sachverständiger</Label>
                        <Select value={editInspEngineerId} onValueChange={(val) => setEditInspValue("engineerId", val)}>
                          <SelectTrigger className="bg-background border-border" data-testid="edit-select-inspection-engineer">
                            <SelectValue placeholder="Sachverständigen wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {(clients || []).map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{displayName(c)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Anmerkungen</Label>
                        <Input {...editInspReg("notes")} placeholder="Kurze Notizen..." className="bg-background border-border" data-testid="edit-input-inspection-notes" />
                      </div>
                    </div>

                    <div className="border-t border-border pt-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-display font-bold text-base">Bauteil Prüfung</h4>
                        <Button type="button" variant="outline" size="sm" onClick={addEditCustomBauteil} className="bg-card border-border hover:bg-muted/60" data-testid="edit-button-add-bauteil">
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Sonderbauteil hinzufügen
                        </Button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-border mb-6">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                              <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Nr.</th>
                              <th className="text-left px-3 py-2.5 font-semibold">Bauteil</th>
                              <th className="text-left px-3 py-2.5 font-semibold">Gegenstand</th>
                              <th className="text-center px-3 py-2.5 font-semibold">Geprüft</th>
                              <th className="text-center px-3 py-2.5 font-semibold">Mangel</th>
                              <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Vertiefte Prüfung</th>
                              <th className="px-2 py-2.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {editBauteilPruefungen.map((bp, index) => {
                              const isDefault = index < BAUTEIL_OPTIONS.length && bp.bauteil === BAUTEIL_OPTIONS[index].label;
                              const isHeader = (isDefault && bp.level === 0 && index < BAUTEIL_OPTIONS.length - 1 && BAUTEIL_OPTIONS[index + 1]?.level === 1) || (!isDefault && bp.level === 0);
                              return (
                                <BauteilRow
                                  key={index}
                                  bp={bp}
                                  index={index}
                                  isDefault={isDefault}
                                  isHeader={isHeader}
                                  onUpdate={updateEditBauteilPruefung}
                                  onRemove={removeEditBauteilPruefung}
                                  onAddMangel={addEditMangelToBauteil}
                                  onUpdateMangel={updateEditMangel}
                                  onAddMangelImages={addEditMangelImages}
                                  onRemoveMangelFile={removeEditMangelFile}
                                  onRemoveMangelUrl={removeEditMangelUrl}
                                  onRemoveMangel={removeEditMangel}
                                />
                              );
                            })}
                          </tbody>
                        </table>
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
                    const insGroberCount = ins.defects?.filter((d: any) => d.status === "grober_mangel").length || 0;
                    const insLeichterCount = ins.defects?.filter((d: any) => d.status === "leichter_mangel").length || 0;
                    const insHasBauteilMangel = ins.notes?.includes("- Mangel") || false;
                    const insEffectiveStatus = (insGroberCount > 0 || ins.status === "urgent") ? "urgent" : (insLeichterCount > 0 || insHasBauteilMangel || ins.status === "needs_repair") ? "needs_repair" : "OK";
                    
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
                                ${insEffectiveStatus === 'OK' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                  insEffectiveStatus === 'urgent' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                                  'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                {insEffectiveStatus === 'OK' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-lg">{inspTypeLabels[(ins as any).type] || "Erstprüfung"} — {format(new Date(ins.date), 'dd.MM.yyyy')}</p>
                                <p className="text-sm text-muted-foreground mt-1">{(ins.notes?.includes("| Bauteilprüfung: ") ? ins.notes.split("| Bauteilprüfung: ")[0].trim() : ins.notes) || 'Keine Anmerkungen.'}</p>
                                {ins.engineer && (
                                  <p className="text-xs text-muted-foreground mt-2 font-medium">Sachverständiger: {displayName(ins.engineer)}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isAdmin && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openEditInspection(ins); }} data-testid={`button-edit-inspection-${ins.id}`}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteInspectionId(ins.id); }} data-testid={`button-delete-inspection-${ins.id}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase
                                ${insEffectiveStatus === 'OK' ? 'text-emerald-500 border-emerald-500/30' : 
                                  insEffectiveStatus === 'urgent' ? 'text-destructive border-destructive/30' : 
                                  'text-amber-500 border-amber-500/30'}`}>
                                {inspStatusLabels[insEffectiveStatus] || insEffectiveStatus}
                              </span>
                              {isInsExpanded ? (
                                <ChevronDown className="w-5 h-5 text-primary" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isInsExpanded && (
                          <div className="border-t border-border bg-muted/20 p-5 space-y-5" data-testid={`inspection-detail-${ins.id}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prüfungsdetails</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Art</span>
                                    <span className="font-medium text-foreground">{inspTypeLabels[(ins as any).type] || (ins as any).type}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Datum</span>
                                    <span className="font-medium text-foreground">{format(new Date(ins.date), 'dd.MM.yyyy')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className={`font-bold ${insEffectiveStatus === 'OK' ? 'text-emerald-600' : insEffectiveStatus === 'urgent' ? 'text-destructive' : 'text-amber-600'}`}>
                                      {inspStatusLabels[insEffectiveStatus] || insEffectiveStatus}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Zuordnung</h4>
                                <div className="space-y-2 text-sm">
                                  {ins.engineer && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Sachverständiger</span>
                                      <span className="font-medium text-foreground">{displayName(ins.engineer)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {(() => {
                              const notes = ins.notes || "";
                              const userNotes = notes.includes("| Bauteilprüfung: ") ? notes.split("| Bauteilprüfung: ")[0].trim() : notes;
                              return userNotes ? (
                                <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anmerkungen</h4>
                                  <p className="text-sm text-foreground">{userNotes}</p>
                                </div>
                              ) : null;
                            })()}

                            {(() => {
                              const notes = ins.notes || "";
                              if (!notes.includes("| Bauteilprüfung: ")) return null;
                              const bauteilPart = notes.split("| Bauteilprüfung: ")[1];
                              const entries = bauteilPart.split("; ").map((entry: string) => {
                                const nameMatch = entry.match(/^\[(.+?)\]/);
                                if (!nameMatch) return null;
                                const name = nameMatch[1];
                                const opt = BAUTEIL_OPTIONS.find(b => b.label === name);
                                const gegenstandMatch = entry.match(/Gegenstand: (.+?)(?:\s*-|$)/);
                                const legacyMangelMatch = entry.match(/Mangel: (.+?)(?:\s*-|$)/);
                                return {
                                  name,
                                  ref: opt?.ref || "",
                                  level: opt?.level ?? 0,
                                  geprueft: entry.includes("geprüft"),
                                  mangel: entry.includes("Mangel"),
                                  gegenstand: gegenstandMatch?.[1]?.trim() || legacyMangelMatch?.[1]?.trim() || opt?.defaultGegenstand || "",
                                  vertieftePruefung: entry.includes("vertiefte Prüfung"),
                                  vertieftePruefungText: (() => { const m = entry.match(/vertiefte Prüfung: (.+)$/); return m ? m[1].trim() : ""; })(),
                                };
                              }).filter(Boolean) as { name: string; ref: string; level: number; geprueft: boolean; mangel: boolean; gegenstand: string; vertieftePruefung: boolean; vertieftePruefungText: string }[];
                              if (entries.length === 0) return null;
                              const headerNames = new Set<string>();
                              for (let i = 0; i < BAUTEIL_OPTIONS.length; i++) {
                                if (BAUTEIL_OPTIONS[i].level === 0 && BAUTEIL_OPTIONS[i + 1]?.level === 1) headerNames.add(BAUTEIL_OPTIONS[i].label);
                              }
                              const entryMap = new Map(entries.map(e => [e.name, e]));
                              const displayEntries: typeof entries = [];
                              for (const opt of BAUTEIL_OPTIONS) {
                                if (headerNames.has(opt.label)) {
                                  const hasChildInEntries = BAUTEIL_OPTIONS.some(o => o.level === 1 && entryMap.has(o.label) && BAUTEIL_OPTIONS.indexOf(o) > BAUTEIL_OPTIONS.indexOf(opt) && (BAUTEIL_OPTIONS.indexOf(o) === BAUTEIL_OPTIONS.indexOf(opt) + 1 || BAUTEIL_OPTIONS.slice(BAUTEIL_OPTIONS.indexOf(opt) + 1, BAUTEIL_OPTIONS.indexOf(o)).every(s => s.level === 1)));
                                  if (hasChildInEntries || entryMap.has(opt.label)) {
                                    displayEntries.push({ name: opt.label, ref: "", level: 0, geprueft: false, mangel: false, gegenstand: "", vertieftePruefung: false, vertieftePruefungText: "" });
                                  }
                                } else if (entryMap.has(opt.label)) {
                                  displayEntries.push(entryMap.get(opt.label)!);
                                }
                              }
                              return (
                                <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bauteil Prüfung</h4>
                                  <div className="overflow-x-auto rounded-lg border border-border">
                                    <table className="w-full text-sm" data-testid={`detail-bauteil-table-${ins.id}`}>
                                      <thead>
                                        <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                                          <th className="text-left px-3 py-2 font-semibold w-10">Nr.</th>
                                          <th className="text-left px-3 py-2 font-semibold">Bauteil</th>
                                          <th className="text-left px-3 py-2 font-semibold">Gegenstand</th>
                                          <th className="text-center px-3 py-2 font-semibold w-20">Geprüft</th>
                                          <th className="text-center px-3 py-2 font-semibold w-20">Mangel</th>
                                          <th className="text-center px-3 py-2 font-semibold w-28">Vertiefte Prüfung</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {displayEntries.map((e, i) => {
                                          const isHeader = headerNames.has(e.name);
                                          return isHeader ? (
                                            <tr key={i} className="bg-muted/30">
                                              <td colSpan={6} className="px-3 py-2 font-bold text-foreground">{e.name}</td>
                                            </tr>
                                          ) : (
                                            <tr key={i} className="hover:bg-muted/10">
                                              <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{e.ref}</td>
                                              <td className={`px-3 py-2 ${e.level === 1 ? "pl-8" : ""}`}>{e.name}</td>
                                              <td className="px-3 py-2 text-muted-foreground">{e.gegenstand}</td>
                                              <td className="px-3 py-2 text-center">
                                                {e.geprueft ? <span className="text-emerald-600 font-medium">Ja</span> : <span className="text-muted-foreground">Nein</span>}
                                              </td>
                                              <td className="px-3 py-2 text-center">
                                                {e.mangel ? <span className="text-red-600 font-medium">Ja</span> : <span className="text-muted-foreground">Nein</span>}
                                              </td>
                                              <td className="px-3 py-2 text-center">
                                                {e.vertieftePruefung ? (
                                                  <span className="text-blue-600 font-medium">{e.vertieftePruefungText ? `Ja: ${e.vertieftePruefungText}` : "Ja"}</span>
                                                ) : (
                                                  <span className="text-muted-foreground">Nein</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })()}

                            <div>
                              <h4 className="font-display font-bold text-base mb-3">
                                Mängel ({ins.defects?.length || 0})
                              </h4>
                              {(!ins.defects || ins.defects.length === 0) ? (
                                <div className="p-4 text-center border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                                  Keine Mängel bei dieser Prüfung erfasst.
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-border">
                                  <table className="w-full text-sm" data-testid={`defects-table-${ins.id}`}>
                                    <thead>
                                      <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                                        <th className="text-left px-4 py-2.5 font-semibold">Mangel-Nr.</th>
                                        <th className="text-left px-4 py-2.5 font-semibold">Bauteil</th>
                                        <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
                                        <th className="text-left px-4 py-2.5 font-semibold">Beschreibung</th>
                                        <th className="text-left px-4 py-2.5 font-semibold">Lage</th>
                                        <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                                        <th className="text-left px-4 py-2.5 font-semibold">Frist</th>
                                        <th className="text-left px-4 py-2.5 font-semibold">Reparatur bis</th>
                                        <th className="text-left px-4 py-2.5 font-semibold">Foto</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {primaryDefects.flatMap((defect: any) => {
                                        const children = followUps.filter((f: any) => f.parentDefectId === defect.id);
                                        return [
                                          <tr key={`defect-${defect.id}`} className="hover:bg-muted/40 transition-colors" data-testid={`defect-row-${defect.defectId}`}>
                                            <td className="px-4 py-2.5">
                                              <div className="flex items-center gap-2">
                                                <Hash className="w-3.5 h-3.5 text-primary" />
                                                <span className="font-mono font-semibold text-primary">{defect.defectId}</span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground">{defect.bauteil && defect.bauteil.length > 0 ? defect.bauteil.join(", ") : "–"}</td>
                                            <td className="px-4 py-2.5">
                                              <div className="flex items-center gap-2 text-foreground">
                                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                {format(new Date(defect.dateFound), 'dd.MM.yyyy')}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground max-w-xs">{defect.description}</td>
                                            <td className="px-4 py-2.5">
                                              <div className="flex items-center gap-2 text-foreground">
                                                <MapPinned className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                {defect.location}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase
                                                ${defect.status === 'grober_mangel' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                                                  'text-amber-500 border-amber-500/30 bg-amber-500/10'}`}>
                                                {defectStatusLabels[defect.status] || defect.status}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground">{defect.frist ? fristLabels[defect.frist] || defect.frist : "–"}</td>
                                            <td className="px-4 py-2.5 text-foreground">{defect.repairDue ? format(new Date(defect.repairDue), 'dd.MM.yyyy') : "–"}</td>
                                            <td className="px-4 py-2.5">
                                              {(() => {
                                                const imgs: string[] = defect.imageUrls?.length ? defect.imageUrls : (defect.imageUrl ? [defect.imageUrl] : []);
                                                return imgs.length > 0 ? (
                                                  <div className="flex flex-wrap gap-1.5">
                                                    {imgs.map((src: string, ii: number) => (
                                                      <ExpandableImage key={ii} src={src} alt="Mangel" testId={`defect-image-${defect.defectId}-${ii}`} />
                                                    ))}
                                                  </div>
                                                ) : <span className="text-muted-foreground">–</span>;
                                              })()}
                                            </td>
                                          </tr>,
                                          ...children.map((child: any) => (
                                            <tr key={`child-${child.id}`} className="bg-muted/10 hover:bg-muted/40 transition-colors" data-testid={`defect-row-${child.defectId}`}>
                                              <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2 pl-4">
                                                  <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground" />
                                                  <span className="font-mono font-semibold text-muted-foreground">{child.defectId}</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-2.5 text-foreground">{child.bauteil && child.bauteil.length > 0 ? child.bauteil.join(", ") : "–"}</td>
                                              <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2 text-foreground">
                                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                  {format(new Date(child.dateFound), 'dd.MM.yyyy')}
                                                </div>
                                              </td>
                                              <td className="px-4 py-2.5 text-foreground max-w-xs">{child.description}</td>
                                              <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2 text-foreground">
                                                  <MapPinned className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                  {child.location}
                                                </div>
                                              </td>
                                              <td className="px-4 py-2.5">
                                                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase
                                                  ${child.status === 'grober_mangel' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                                                    'text-amber-500 border-amber-500/30 bg-amber-500/10'}`}>
                                                  {defectStatusLabels[child.status] || child.status}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2.5 text-foreground">{child.frist ? fristLabels[child.frist] || child.frist : "–"}</td>
                                              <td className="px-4 py-2.5 text-foreground">{child.repairDue ? format(new Date(child.repairDue), 'dd.MM.yyyy') : "–"}</td>
                                              <td className="px-4 py-2.5">
                                                {(() => {
                                                  const imgs: string[] = child.imageUrls?.length ? child.imageUrls : (child.imageUrl ? [child.imageUrl] : []);
                                                  return imgs.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                      {imgs.map((src: string, ii: number) => (
                                                        <ExpandableImage key={ii} src={src} alt="Mangel" testId={`defect-image-${child.defectId}-${ii}`} />
                                                      ))}
                                                    </div>
                                                  ) : <span className="text-muted-foreground">–</span>;
                                                })()}
                                              </td>
                                            </tr>
                                          ))
                                        ];
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
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

          </Tabs>
      </div>

      <AlertDialog open={deleteInspectionId !== null} onOpenChange={(open) => { if (!open) setDeleteInspectionId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Prüfung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Prüfung wirklich löschen? Alle zugehörigen Mängel werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border" data-testid="button-cancel-delete-inspection">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteInspection.isPending}
              onClick={() => {
                if (deleteInspectionId) {
                  deleteInspection.mutate({ id: deleteInspectionId, projectId }, {
                    onSuccess: () => setDeleteInspectionId(null),
                  });
                }
              }}
              data-testid="button-confirm-delete-inspection"
            >
              {deleteInspection.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function ExpandableImage({ src, alt, testId }: { src: string; alt: string; testId?: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="block w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
        data-testid={testId}
      >
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </button>
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setExpanded(false)}>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[85vh] rounded-xl border-2 border-border shadow-2xl object-contain bg-card"
            onClick={(e) => e.stopPropagation()}
            data-testid="img-expanded"
          />
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            data-testid="button-close-image"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
