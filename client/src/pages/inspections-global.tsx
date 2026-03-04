import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useAllInspections, useCreateInspection, useCreateDefect, useUpdateInspection, useDeleteInspection, useUpdateDefect } from "@/hooks/use-inspections";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/hooks/use-projects";
import { useProfile } from "@/hooks/use-profile";
import {
  ClipboardCheck, Building, Calendar, AlertTriangle, ArrowRight, Loader2,
  ChevronRight, ChevronDown, CheckCircle2, Hash, Eye, User, FileText, Plus, Trash2, Pencil, ImagePlus, X
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";

interface BauteilOption {
  label: string;
  level: number;
  ref?: string;
  defaultGegenstand?: string;
}

const BAUTEIL_OPTIONS: BauteilOption[] = [
  { label: "Fassade/Gesimse", level: 0 },
  { label: "Verputz", level: 1, ref: "1.1", defaultGegenstand: "Risse, lose Teile, Hohlstellen, Abplatzungen" },
  { label: "Gesimse", level: 1, ref: "1.2", defaultGegenstand: "Risse, lose Teile, Hohlstellen, Abplatzungen" },
  { label: "Fenster", level: 1, ref: "1.3" },
  { label: "Sonderbauteile", level: 1, ref: "1.4" },
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
];

interface BauteilMangel {
  defectId: string;
  description: string;
  location: string;
  status: string;
  dateFound: string;
  frist: string;
  repairDue: string;
  imageFile?: File | null;
  imageUrl?: string;
}

interface BauteilPruefung {
  bauteil: string;
  level: number;
  refNr: string;
  artDesMangels: string;
  geprueft: boolean;
  mangel: boolean;
  vertieftePruefung: boolean;
  maengel: BauteilMangel[];
}

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

const inspTypeLabels: Record<string, string> = {
  erstpruefung: "Erstprüfung",
  folgepruefung: "Folgeprüfung",
};

const inspStatusLabels: Record<string, string> = {
  OK: "OK",
  needs_repair: "Leichter Mangel",
  urgent: "Schwerer Mangel",
};

const fristLabels: Record<string, string> = {
  "1_woche": "1 Woche",
  "2_wochen": "2 Wochen",
  "1_monat": "1 Monat",
  "2_monate": "2 Monate",
  "6_monate": "6 Monate",
};

interface BauteilRowProps {
  bp: BauteilPruefung;
  index: number;
  isDefault: boolean;
  isHeader: boolean;
  onUpdate: (index: number, field: keyof BauteilPruefung, value: any) => void;
  onRemove: (index: number) => void;
  onAddMangel: (index: number) => void;
  onUpdateMangel: (bauteilIndex: number, mangelIndex: number, field: keyof BauteilMangel, value: string) => void;
  onUpdateMangelFile: (bauteilIndex: number, mangelIndex: number, file: File | null) => void;
  onRemoveMangel: (bauteilIndex: number, mangelIndex: number) => void;
}

function BauteilRow({ bp, index, isDefault, isHeader, onUpdate, onRemove, onAddMangel, onUpdateMangel, onUpdateMangelFile, onRemoveMangel }: BauteilRowProps) {
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
          {bp.refNr ? (
            <span className="text-xs font-mono text-muted-foreground">{bp.refNr}</span>
          ) : null}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: bp.level > 0 ? `${bp.level * 8}px` : undefined }}>
            {isDefault ? (
              <span className={bp.level > 0 ? "text-sm text-muted-foreground" : "font-medium text-foreground"}>{bp.bauteil}</span>
            ) : (
              <Input
                value={bp.bauteil}
                onChange={(e) => onUpdate(index, "bauteil", e.target.value)}
                placeholder="Bauteil..."
                className="h-8 text-sm bg-background border-border"
                data-testid={`input-bauteil-name-${index}`}
              />
            )}
            {hasMaengel && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground hover:text-foreground p-0.5"
                data-testid={`button-toggle-maengel-${index}`}
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="text-xs ml-0.5">({bp.maengel.length})</span>
              </button>
            )}
          </div>
        </td>
        {isHeader ? (
          <>
            <td colSpan={5} className="px-3 py-2.5"></td>
          </>
        ) : (
          <>
            <td className="px-3 py-2.5">
              <Input
                value={bp.artDesMangels}
                onChange={(e) => onUpdate(index, "artDesMangels", e.target.value)}
                placeholder="Gegenstand..."
                className="h-8 text-sm bg-background border-border"
                data-testid={`input-art-mangel-${index}`}
              />
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center">
                <Checkbox
                  checked={bp.geprueft}
                  onCheckedChange={(checked) => onUpdate(index, "geprueft", !!checked)}
                  data-testid={`checkbox-geprueft-${index}`}
                />
              </div>
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center">
                <Checkbox
                  checked={bp.mangel}
                  onCheckedChange={(checked) => onUpdate(index, "mangel", !!checked)}
                  data-testid={`checkbox-mangel-${index}`}
                />
              </div>
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center">
                <Checkbox
                  checked={bp.vertieftePruefung}
                  onCheckedChange={(checked) => onUpdate(index, "vertieftePruefung", !!checked)}
                  data-testid={`checkbox-vertiefte-${index}`}
                />
              </div>
            </td>
            <td className="px-2 py-2.5">
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => onAddMangel(index)}
                  title="Mangel hinzufügen"
                  data-testid={`button-add-mangel-${index}`}
                >
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
      {hasMaengel && expanded && bp.maengel.map((m, mi) => (
        <tr key={`mangel-${index}-${mi}`} className="border-b border-border bg-muted/10" data-testid={`mangel-row-${index}-${mi}`}>
          <td colSpan={7} className="px-3 py-3">
            <div className="ml-4 border-l-2 border-primary/30 pl-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mangel {mi + 1} — {bp.bauteil || "Bauteil"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveMangel(index, mi)}
                  data-testid={`button-remove-mangel-${index}-${mi}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Mangel-ID *</Label>
                  <Input
                    value={m.defectId}
                    onChange={(e) => onUpdateMangel(index, mi, "defectId", e.target.value)}
                    placeholder="z.B. M-001"
                    className="h-8 text-sm mt-1"
                    data-testid={`input-mangel-id-${index}-${mi}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">Datum *</Label>
                  <Input
                    type="date"
                    value={m.dateFound}
                    onChange={(e) => onUpdateMangel(index, mi, "dateFound", e.target.value)}
                    className="h-8 text-sm mt-1"
                    data-testid={`input-mangel-date-${index}-${mi}`}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Beschreibung *</Label>
                  <Input
                    value={m.description}
                    onChange={(e) => onUpdateMangel(index, mi, "description", e.target.value)}
                    placeholder="Beschreibung des Mangels..."
                    className="h-8 text-sm mt-1"
                    data-testid={`input-mangel-desc-${index}-${mi}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">Ort *</Label>
                  <Input
                    value={m.location}
                    onChange={(e) => onUpdateMangel(index, mi, "location", e.target.value)}
                    placeholder="z.B. 2. OG links"
                    className="h-8 text-sm mt-1"
                    data-testid={`input-mangel-location-${index}-${mi}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={m.status} onValueChange={(v) => onUpdateMangel(index, mi, "status", v)}>
                    <SelectTrigger className="h-8 text-sm mt-1" data-testid={`select-mangel-status-${index}-${mi}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leichter_mangel">Leichter Mangel</SelectItem>
                      <SelectItem value="grober_mangel">Schwerer Mangel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Frist</Label>
                  <Select value={m.frist} onValueChange={(v) => onUpdateMangel(index, mi, "frist", v)}>
                    <SelectTrigger className="h-8 text-sm mt-1" data-testid={`select-mangel-frist-${index}-${mi}`}>
                      <SelectValue placeholder="Keine" />
                    </SelectTrigger>
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
                    <Input
                      value={m.repairDue}
                      disabled
                      className="h-8 text-sm mt-1 bg-muted"
                      data-testid={`input-mangel-repairdue-${index}-${mi}`}
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <Label className="text-xs">Foto</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {(m.imageFile || m.imageUrl) ? (
                      <div className="relative group">
                        <div className="w-16 h-16 rounded-lg border border-border overflow-hidden">
                          <img
                            src={m.imageFile ? URL.createObjectURL(m.imageFile) : m.imageUrl}
                            alt="Mangel"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdateMangelFile(index, mi, null)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-remove-mangel-image-${index}-${mi}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors text-xs"
                        data-testid={`button-add-mangel-image-${index}-${mi}`}
                      >
                        <ImagePlus className="w-4 h-4" />
                        Foto hinzufügen
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file) onUpdateMangelFile(index, mi, file);
                          }}
                        />
                      </label>
                    )}
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

export default function InspectionsGlobal() {
  const queryClient = useQueryClient();
  const { data: allInspections, isLoading: insLoading } = useAllInspections();
  const { data: projects, isLoading: projLoading } = useProjects();
  const { data: profile } = useProfile();
  const createInspection = useCreateInspection();
  const createDefect = useCreateDefect();
  const updateDefect = useUpdateDefect();
  const updateInspection = useUpdateInspection();
  const deleteInspection = useDeleteInspection();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [inspDialogOpen, setInspDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editBauteilPruefungen, setEditBauteilPruefungen] = useState<BauteilPruefung[]>(
    BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: b.ref || "", artDesMangels: b.defaultGegenstand || "", geprueft: false, mangel: false, vertieftePruefung: false, maengel: [] }))
  );
  const [bauteilPruefungen, setBauteilPruefungen] = useState<BauteilPruefung[]>(
    BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: b.ref || "", artDesMangels: b.defaultGegenstand || "", geprueft: false, mangel: false, vertieftePruefung: false, maengel: [] }))
  );

  const { register: inspReg, handleSubmit: handleInspSubmit, setValue: setInspValue, reset: resetInspForm } = useForm({
    defaultValues: { projectId: "", date: "", status: "OK", type: "erstpruefung", notes: "" }
  });

  const updateBauteilPruefung = (index: number, field: keyof BauteilPruefung, value: any) => {
    setBauteilPruefungen(prev => prev.map((bp, i) => i === index ? { ...bp, [field]: value } : bp));
  };

  const addCustomBauteil = () => {
    setBauteilPruefungen(prev => [...prev, { bauteil: "", level: 0, refNr: "", artDesMangels: "", geprueft: false, mangel: false, vertieftePruefung: false, maengel: [] }]);
  };

  const addMangelToBauteil = (bauteilIndex: number) => {
    setBauteilPruefungen(prev => prev.map((bp, i) => i === bauteilIndex
      ? { ...bp, mangel: true, maengel: [...bp.maengel, { defectId: "", description: "", location: "", status: "leichter_mangel", dateFound: "", frist: "", repairDue: "" }] }
      : bp
    ));
  };

  const updateMangel = (bauteilIndex: number, mangelIndex: number, field: keyof BauteilMangel, value: string) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
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

  const removeMangel = (bauteilIndex: number, mangelIndex: number) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const newMaengel = bp.maengel.filter((_, mi) => mi !== mangelIndex);
      return { ...bp, maengel: newMaengel, mangel: newMaengel.length > 0 };
    }));
  };

  const updateMangelFile = (bauteilIndex: number, mangelIndex: number, file: File | null) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFile: file, imageUrl: file ? undefined : m.imageUrl } : m);
      return { ...bp, maengel: updated };
    }));
  };

  const removeBauteilPruefung = (index: number) => {
    setBauteilPruefungen(prev => prev.filter((_, i) => i !== index));
  };

  const resetDialog = () => {
    resetInspForm();
    setBauteilPruefungen(BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: b.ref || "", artDesMangels: b.defaultGegenstand || "", geprueft: false, mangel: false, vertieftePruefung: false, maengel: [] })));
  };

  const { register: editInspReg, handleSubmit: handleEditInspSubmit, setValue: setEditInspValue, reset: resetEditInspForm, watch: watchEditInsp } = useForm({
    defaultValues: { date: "", status: "OK", type: "erstpruefung", notes: "" }
  });
  const editInspType = watchEditInsp("type");
  const editInspStatus = watchEditInsp("status");

  const updateEditBauteilPruefung = (index: number, field: keyof BauteilPruefung, value: any) => {
    setEditBauteilPruefungen(prev => prev.map((bp, i) => i === index ? { ...bp, [field]: value } : bp));
  };

  const addEditCustomBauteil = () => {
    setEditBauteilPruefungen(prev => [...prev, { bauteil: "", level: 0, refNr: "", artDesMangels: "", geprueft: false, mangel: false, vertieftePruefung: false, maengel: [] }]);
  };

  const removeEditBauteilPruefung = (index: number) => {
    setEditBauteilPruefungen(prev => prev.filter((_, i) => i !== index));
  };

  const addEditMangelToBauteil = (bauteilIndex: number) => {
    setEditBauteilPruefungen(prev => prev.map((bp, i) => i === bauteilIndex
      ? { ...bp, mangel: true, maengel: [...bp.maengel, { defectId: "", description: "", location: "", status: "leichter_mangel", dateFound: "", frist: "", repairDue: "" }] }
      : bp
    ));
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

  const updateEditMangelFile = (bauteilIndex: number, mangelIndex: number, file: File | null) => {
    setEditBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFile: file, imageUrl: file ? undefined : m.imageUrl } : m);
      return { ...bp, maengel: updated };
    }));
  };

  const buildEditBauteilState = (ins: any): BauteilPruefung[] => {
    const base = BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: b.ref || "", artDesMangels: b.defaultGegenstand || "", geprueft: false, mangel: false, vertieftePruefung: false, maengel: [] as BauteilMangel[] }));
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
        if (entry.includes("vertiefte Prüfung")) bp.vertieftePruefung = true;
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
      bp.maengel.push({
        defectId: d.defectId || "",
        description: d.description || "",
        location: d.location || "",
        status: d.status || "leichter_mangel",
        dateFound: d.dateFound ? format(new Date(d.dateFound), 'yyyy-MM-dd') : "",
        frist: d.frist || "",
        repairDue: d.repairDue ? format(new Date(d.repairDue), 'yyyy-MM-dd') : "",
        imageUrl: d.imageUrl || "",
      });
    }
    return base;
  };

  const openEditInspection = (ins: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingInspection(ins);
    const userNotes = ins.notes?.includes("| Bauteilprüfung: ") ? ins.notes.split("| Bauteilprüfung: ")[0].trim() : (ins.notes || "");
    resetEditInspForm({
      date: ins.date ? format(new Date(ins.date), 'yyyy-MM-dd') : "",
      status: ins.status || "OK",
      type: ins.type || "erstpruefung",
      notes: userNotes,
    });
    setEditBauteilPruefungen(buildEditBauteilState(ins));
    setEditDialogOpen(true);
  };

  const onEditInspSubmit = async (data: any) => {
    if (!editingInspection) return;
    setEditSubmitting(true);
    try {
      const bauteilNotes = editBauteilPruefungen
        .filter(bp => bp.geprueft || bp.mangel || bp.vertieftePruefung)
        .map(bp => {
          const parts = [`[${bp.bauteil}]`];
          if (bp.artDesMangels) parts.push(`Gegenstand: ${bp.artDesMangels}`);
          if (bp.geprueft) parts.push("geprüft");
          if (bp.mangel) parts.push("Mangel");
          if (bp.vertieftePruefung) parts.push("vertiefte Prüfung erforderlich");
          return parts.join(" - ");
        })
        .join("; ");

      const fullNotes = bauteilNotes ? `${data.notes || ""} | Bauteilprüfung: ${bauteilNotes}`.trim() : (data.notes || "");

      const hasGroberMangel = editBauteilPruefungen.some(bp => bp.maengel.some(m => m.status === "grober_mangel"));
      const hasMangel = editBauteilPruefungen.some(bp => bp.mangel || bp.maengel.length > 0);
      const autoStatus = hasGroberMangel ? "urgent" : hasMangel ? "needs_repair" : data.status;

      await updateInspection.mutateAsync({
        id: editingInspection.id,
        projectId: editingInspection.projectId,
        data: {
          date: new Date(data.date),
          status: autoStatus,
          type: data.type,
          notes: fullNotes || null,
        }
      });

      for (const bp of editBauteilPruefungen) {
        for (const m of bp.maengel) {
          const defects = editingInspection.defects || [];
          const matchingDefect = defects.find((d: any) => d.defectId === m.defectId);
          if (matchingDefect?.id) {
            if (matchingDefect.status !== m.status || matchingDefect.description !== m.description || matchingDefect.location !== m.location || matchingDefect.frist !== (m.frist || null)) {
              await updateDefect.mutateAsync({
                id: matchingDefect.id,
                projectId: editingInspection.projectId,
                data: {
                  status: m.status as "leichter_mangel" | "grober_mangel",
                  description: m.description,
                  location: m.location,
                  frist: (m.frist || null) as any,
                  repairDue: m.repairDue ? new Date(m.repairDue) : null,
                },
              });
            }
            if (m.imageFile) {
              const formData = new FormData();
              formData.append('image', m.imageFile);
              await fetch(`/api/defects/${matchingDefect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${editingInspection.projectId}/inspections`] });
      setEditDialogOpen(false);
      setEditingInspection(null);
    } catch (error) {
      console.error("Failed to update inspection:", error);
    } finally {
      setEditSubmitting(false);
    }
  };

  const [inspSubmitting, setInspSubmitting] = useState(false);

  const onInspSubmit = async (data: any) => {
    if (!data.projectId || !profile) return;
    setInspSubmitting(true);
    try {
      const projectId = parseInt(data.projectId, 10);

      const bauteilNotes = bauteilPruefungen
        .filter(bp => bp.geprueft || bp.mangel || bp.vertieftePruefung)
        .map(bp => {
          const parts = [`[${bp.bauteil}]`];
          if (bp.artDesMangels) parts.push(`Gegenstand: ${bp.artDesMangels}`);
          if (bp.geprueft) parts.push("geprüft");
          if (bp.mangel) parts.push("Mangel");
          if (bp.vertieftePruefung) parts.push("vertiefte Prüfung erforderlich");
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
          engineerId: profile.userId,
          date: new Date(data.date),
          status: autoStatus,
          type: data.type,
          notes: fullNotes || null,
        }
      });

      for (const bp of bauteilPruefungen) {
        for (const m of bp.maengel) {
          if (!m.defectId || !m.description || !m.location || !m.dateFound) continue;
          const defect = await createDefect.mutateAsync({
            inspectionId: inspection.id,
            projectId,
            data: {
              inspectionId: inspection.id,
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
          if (m.imageFile && defect?.id) {
            const formData = new FormData();
            formData.append('image', m.imageFile);
            await fetch(`/api/defects/${defect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/inspections`] });
      queryClient.invalidateQueries({ queryKey: ["/api/defects/summary"] });
      setInspDialogOpen(false);
      resetDialog();
    } finally {
      setInspSubmitting(false);
    }
  };

  const isLoading = insLoading || projLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  const projectsNeedingInspection = projects?.filter(p => p.nextInspectionDue && new Date(p.nextInspectionDue) < new Date()) || [];

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <Layout>
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Prüfungsverzeichnis</h1>
          <p className="text-muted-foreground">Alle Prüfungen im Überblick. Klicken Sie auf eine Prüfung, um Details einzusehen.</p>
        </div>

        <Dialog open={inspDialogOpen} onOpenChange={(open) => { setInspDialogOpen(open); if (!open) resetDialog(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" data-testid="button-add-inspection-global">
              <Plus className="w-4 h-4 mr-2" /> Prüfung hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Neue Prüfung erfassen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInspSubmit(onInspSubmit)} className="space-y-5 mt-2">
              <div className="space-y-2">
                <Label>Projekt</Label>
                <Select onValueChange={(val) => setInspValue("projectId", val)}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-inspection-project">
                    <SelectValue placeholder="Projekt wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Art der Prüfung</Label>
                  <Select defaultValue="erstpruefung" onValueChange={(val) => setInspValue("type", val)}>
                    <SelectTrigger className="bg-background border-border" data-testid="select-inspection-type-global">
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
                  <Input type="date" {...inspReg("date")} required className="bg-background border-border" data-testid="input-inspection-date-global" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue="OK" onValueChange={(val) => setInspValue("status", val)}>
                    <SelectTrigger className="bg-background border-border" data-testid="select-inspection-status-global">
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
                  <Input {...inspReg("notes")} placeholder="Kurze Notizen..." className="bg-background border-border" data-testid="input-inspection-notes-global" />
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-display font-bold text-base">Bauteil Prüfung</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomBauteil} className="bg-card border-border hover:bg-muted/60" data-testid="button-add-bauteil">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Bauteil hinzufügen
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
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
                      {bauteilPruefungen.map((bp, index) => {
                        const isDefault = index < BAUTEIL_OPTIONS.length && bp.bauteil === BAUTEIL_OPTIONS[index].label;
                        const isHeader = isDefault && bp.level === 0 && index < BAUTEIL_OPTIONS.length - 1 && BAUTEIL_OPTIONS[index + 1]?.level === 1;
                        return (
                          <BauteilRow
                            key={index}
                            bp={bp}
                            index={index}
                            isDefault={isDefault}
                            isHeader={isHeader}
                            onUpdate={updateBauteilPruefung}
                            onRemove={removeBauteilPruefung}
                            onAddMangel={addMangelToBauteil}
                            onUpdateMangel={updateMangel}
                            onUpdateMangelFile={updateMangelFile}
                            onRemoveMangel={removeMangel}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={inspSubmitting} data-testid="button-submit-inspection-global">
                {inspSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Prüfung erstellen
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
              const hasBauteilMangel = ins.notes?.includes("- Mangel") || false;
              const effectiveStatus = (groberCount > 0 || ins.status === "urgent") ? "urgent" : (leichterCount > 0 || hasBauteilMangel || ins.status === "needs_repair") ? "needs_repair" : "OK";
              const isExpanded = expandedId === ins.id;

              return (
                <div
                  key={ins.id}
                  className={`bg-card border rounded-xl shadow-sm overflow-hidden transition-all ${isExpanded ? 'border-primary/40' : 'border-border hover:border-primary/30'}`}
                  data-testid={`inspection-row-${ins.id}`}
                >
                  <div
                    className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center cursor-pointer"
                    onClick={() => toggleExpand(ins.id)}
                    data-testid={`inspection-toggle-${ins.id}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border
                      ${effectiveStatus === 'OK' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        effectiveStatus === 'urgent' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                      {effectiveStatus === 'OK' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
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
                          {ins.projectName || `Projekt #${ins.projectId}`}
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
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase
                        ${effectiveStatus === 'OK' ? 'text-emerald-600 border-emerald-500/30' :
                          effectiveStatus === 'urgent' ? 'text-destructive border-destructive/30' :
                          'text-amber-600 border-amber-500/30'}`}>
                        {inspStatusLabels[effectiveStatus] || effectiveStatus}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => openEditInspection(ins, e)}
                        title="Prüfung bearbeiten"
                        data-testid={`button-edit-inspection-${ins.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(ins.id); setDeleteConfirmProjectId(ins.projectId); }}
                        title="Prüfung löschen"
                        data-testid={`button-delete-inspection-${ins.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-primary" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <InspectionDetailPanel inspection={ins} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingInspection(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Prüfung bearbeiten</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditInspSubmit(onEditInspSubmit)} className="space-y-5 mt-2">
            {editingInspection && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Building className="w-4 h-4" />
                {editingInspection.projectName || `Projekt #${editingInspection.projectId}`}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Art der Prüfung</Label>
                <Select value={editInspType} onValueChange={(val) => setEditInspValue("type", val)}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-edit-inspection-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="erstpruefung">Erstprüfung</SelectItem>
                    <SelectItem value="folgepruefung">Folgeprüfung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input type="date" {...editInspReg("date")} className="bg-background border-border" data-testid="input-edit-inspection-date" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editInspStatus} onValueChange={(val) => setEditInspValue("status", val)}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-edit-inspection-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="needs_repair">Leichter Mangel</SelectItem>
                    <SelectItem value="urgent">Schwerer Mangel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Anmerkungen</Label>
              <Input {...editInspReg("notes")} placeholder="Anmerkungen zur Prüfung..." className="bg-background border-border" data-testid="input-edit-inspection-notes" />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display font-bold text-base">Bauteil Prüfung</h4>
                <Button type="button" variant="outline" size="sm" onClick={addEditCustomBauteil} className="bg-card border-border hover:bg-muted/60" data-testid="button-edit-add-bauteil">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Bauteil hinzufügen
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
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
                      const isHeader = isDefault && bp.level === 0 && index < BAUTEIL_OPTIONS.length - 1 && BAUTEIL_OPTIONS[index + 1]?.level === 1;
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
                          onUpdateMangelFile={updateEditMangelFile}
                          onRemoveMangel={removeEditMangel}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={editSubmitting} data-testid="button-submit-edit-inspection">
              {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Änderungen speichern
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) { setDeleteConfirmId(null); setDeleteConfirmProjectId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prüfung löschen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Möchten Sie diese Prüfung wirklich löschen? Alle zugehörigen Mängel werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmProjectId(null); }} data-testid="button-cancel-delete">
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              disabled={deleteInspection.isPending}
              onClick={async () => {
                if (deleteConfirmId && deleteConfirmProjectId !== null) {
                  await deleteInspection.mutateAsync({ id: deleteConfirmId, projectId: deleteConfirmProjectId });
                  if (expandedId === deleteConfirmId) setExpandedId(null);
                  setDeleteConfirmId(null);
                  setDeleteConfirmProjectId(null);
                }
              }}
              data-testid="button-confirm-delete"
            >
              {deleteInspection.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function InspectionDetailPanel({ inspection }: { inspection: any }) {
  const primaryDefects = inspection.defects?.filter((d: any) => !d.parentDefectId) || [];
  const followUps = inspection.defects?.filter((d: any) => d.parentDefectId) || [];
  const groberCount = inspection.defects?.filter((d: any) => d.status === "grober_mangel").length || 0;
  const leichterCount = inspection.defects?.filter((d: any) => d.status === "leichter_mangel").length || 0;
  const hasBauteilMangel = inspection.notes?.includes("- Mangel") || false;
  const effectiveStatus = (groberCount > 0 || inspection.status === "urgent") ? "urgent" : (leichterCount > 0 || hasBauteilMangel || inspection.status === "needs_repair") ? "needs_repair" : "OK";

  return (
    <div className="border-t border-border bg-muted/20 p-5 space-y-5" data-testid={`inspection-detail-${inspection.id}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
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
              <span className={`font-bold ${effectiveStatus === 'OK' ? 'text-emerald-600' : effectiveStatus === 'urgent' ? 'text-destructive' : 'text-amber-600'}`}>
                {inspStatusLabels[effectiveStatus] || effectiveStatus}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
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
                <span className="font-medium text-foreground text-right max-w-[180px] text-xs">{inspection.projectAddress}</span>
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
      {(() => {
        const notes = inspection.notes || "";
        const userNotes = notes.includes("| Bauteilprüfung: ") ? notes.split("| Bauteilprüfung: ")[0].trim() : notes;
        return userNotes ? (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anmerkungen</h4>
            <p className="text-sm text-foreground">{userNotes}</p>
          </div>
        ) : null;
      })()}
      {(() => {
        const notes = inspection.notes || "";
        if (!notes.includes("| Bauteilprüfung: ")) return null;
          const bauteilPart = notes.split("| Bauteilprüfung: ")[1];
          const entries = bauteilPart.split("; ").map(entry => {
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
            };
          }).filter(Boolean) as { name: string; ref: string; level: number; geprueft: boolean; mangel: boolean; gegenstand: string; vertieftePruefung: boolean }[];
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
                displayEntries.push({ name: opt.label, ref: "", level: 0, geprueft: false, mangel: false, gegenstand: "", vertieftePruefung: false });
              }
            } else if (entryMap.has(opt.label)) {
              displayEntries.push(entryMap.get(opt.label)!);
            }
          }
          return (
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bauteil Prüfung</h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm" data-testid={`detail-bauteil-table-${inspection.id}`}>
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-semibold w-10">Nr.</th>
                      <th className="text-left px-3 py-2 font-semibold">Bauteil</th>
                      <th className="text-left px-3 py-2 font-semibold">Gegenstand</th>
                      <th className="text-center px-3 py-2 font-semibold w-20">Geprüft</th>
                      <th className="text-center px-3 py-2 font-semibold w-20">Mangel</th>
                      <th className="text-center px-3 py-2 font-semibold w-28">Vert. Prüfung</th>
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
                            {e.mangel ? <span className="text-amber-600 font-medium">Ja</span> : <span className="text-muted-foreground">Nein</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {e.vertieftePruefung ? <span className="text-blue-600 font-medium">Ja</span> : <span className="text-muted-foreground">Nein</span>}
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
          Mängel ({inspection.defects?.length || 0})
        </h4>

        {(!inspection.defects || inspection.defects.length === 0) ? (
          <div className="p-4 text-center border border-dashed border-border rounded-xl text-muted-foreground text-sm">
            Keine Mängel bei dieser Prüfung erfasst.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm" data-testid={`detail-defects-table-${inspection.id}`}>
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
                {primaryDefects.map((defect: any) => {
                  const childDefects = followUps.filter((f: any) => f.parentDefectId === defect.id);
                  return (
                    <DefectRows key={defect.id} defect={defect} followUpDefects={childDefects} />
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
  );
}

function DefectRows({ defect, followUpDefects }: { defect: any; followUpDefects: any[] }) {
  return (
    <>
      <tr className="hover:bg-muted/40 transition-colors" data-testid={`detail-defect-row-${defect.defectId}`}>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono font-semibold text-primary">{defect.defectId}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-foreground">{defect.bauteil && defect.bauteil.length > 0 ? defect.bauteil.join(", ") : "–"}</td>
        <td className="px-4 py-2.5 text-foreground">{format(new Date(defect.dateFound), 'dd.MM.yyyy')}</td>
        <td className="px-4 py-2.5 text-foreground max-w-[200px]">
          <span className="line-clamp-2">{defect.description}</span>
        </td>
        <td className="px-4 py-2.5 text-foreground">{defect.location}</td>
        <td className="px-4 py-2.5">
          <Badge variant={defect.status === "grober_mangel" ? "destructive" : "outline"} className={defect.status === "leichter_mangel" ? "border-amber-500/30 text-amber-600" : ""}>
            {defect.status === "grober_mangel" ? "Schwerer Mangel" : "Leichter Mangel"}
          </Badge>
        </td>
        <td className="px-4 py-2.5 text-foreground">{defect.frist ? fristLabels[defect.frist] || defect.frist : "–"}</td>
        <td className="px-4 py-2.5 text-foreground">{defect.repairDue ? format(new Date(defect.repairDue), 'dd.MM.yyyy') : "–"}</td>
        <td className="px-4 py-2.5">
          {defect.imageUrl ? (
            <a href={defect.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all">
              <img src={defect.imageUrl} alt="Mangel" className="w-full h-full object-cover" />
            </a>
          ) : (
            <span className="text-muted-foreground">–</span>
          )}
        </td>
      </tr>
      {followUpDefects.map((child: any) => (
        <tr key={child.id} className="hover:bg-muted/40 transition-colors bg-muted/10" data-testid={`detail-defect-row-${child.defectId}`}>
          <td className="px-4 py-2.5 pl-8">
            <div className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Hash className="w-3.5 h-3.5 text-primary/60" />
              <span className="font-mono font-semibold text-primary/80">{child.defectId}</span>
            </div>
          </td>
          <td className="px-4 py-2.5 text-foreground">{child.bauteil && child.bauteil.length > 0 ? child.bauteil.join(", ") : "–"}</td>
          <td className="px-4 py-2.5 text-foreground">{format(new Date(child.dateFound), 'dd.MM.yyyy')}</td>
          <td className="px-4 py-2.5 text-foreground max-w-[200px]">
            <span className="line-clamp-2">{child.description}</span>
          </td>
          <td className="px-4 py-2.5 text-foreground">{child.location}</td>
          <td className="px-4 py-2.5">
            <Badge variant={child.status === "grober_mangel" ? "destructive" : "outline"} className={child.status === "leichter_mangel" ? "border-amber-500/30 text-amber-600" : ""}>
              {child.status === "grober_mangel" ? "Schwerer Mangel" : "Leichter Mangel"}
            </Badge>
          </td>
          <td className="px-4 py-2.5 text-foreground">{child.frist ? fristLabels[child.frist] || child.frist : "–"}</td>
          <td className="px-4 py-2.5 text-foreground">{child.repairDue ? format(new Date(child.repairDue), 'dd.MM.yyyy') : "–"}</td>
          <td className="px-4 py-2.5">
            {child.imageUrl ? (
              <a href={child.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                <img src={child.imageUrl} alt="Mangel" className="w-full h-full object-cover" />
              </a>
            ) : (
              <span className="text-muted-foreground">–</span>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
