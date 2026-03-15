import { useState, useEffect, useRef, Fragment } from "react";
import { Layout } from "@/components/layout";
import { displayName } from "@/lib/utils";
import { useAllInspections, useCreateInspection, useCreateDefect, useUpdateInspection, useDeleteInspection, useUpdateDefect, useDeleteDefect } from "@/hooks/use-inspections";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/hooks/use-projects";
import { useProfile } from "@/hooks/use-profile";
import { useClients } from "@/hooks/use-users";
import {
  ClipboardCheck, Building, Calendar, AlertTriangle, ArrowRight, Loader2,
  ChevronRight, ChevronDown, CheckCircle2, Hash, Eye, User, FileText, Plus, Trash2, Pencil, ImagePlus, X, Download, CornerDownRight, RotateCw, ZoomIn, Search, ArrowUpDown, ArrowUp, ArrowDown
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoPath from "@assets/logo_1772640036077.png";

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
  existingDefectId?: number;
  description: string;
  location: string;
  status: string;
  dateFound: string;
  frist: string;
  repairDue: string;
  imageFiles: File[];
  imageUrls: string[];
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

function calcRepairDue(dateFound: string, frist: string): string {
  if (!dateFound || !frist || frist === "kein_handlungsbedarf") return "";
  const d = new Date(dateFound);
  switch (frist) {
    case "umgehend": break;
    case "6_monate": d.setMonth(d.getMonth() + 6); break;
    case "1_jahr": d.setFullYear(d.getFullYear() + 1); break;
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
  "umgehend": "Umgehend",
  "6_monate": "6 Monate",
  "1_jahr": "1 Jahr",
  "kein_handlungsbedarf": "Information",
};

const PDF_COLORS = {
  primary: [97, 97, 158] as [number, number, number],
  foreground: [33, 33, 49] as [number, number, number],
  accent: [195, 93, 87] as [number, number, number],
  muted: [237, 237, 243] as [number, number, number],
  border: [210, 210, 225] as [number, number, number],
  mutedFg: [120, 120, 145] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  ok: [16, 185, 129] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

async function loadLogoDataUrl(): Promise<string> {
  const response = await fetch(logoPath);
  const blob = await response.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function cleanAddr(addr: string): string {
  return (addr || "")
    .replace(/,?\s*[ÖO]sterreich\s*$/i, "")
    .replace(/,?\s*Austria\s*$/i, "")
    .trim();
}

async function generateBestaetigungEP(inspection: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  let logoDataUrl: string | null = null;
  try { logoDataUrl = await loadLogoDataUrl(); } catch {}

  const address = cleanAddr(inspection.projectAddress || inspection.projectName || "");

  if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", margin, 10, 65, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.mutedFg);
  doc.text("Arch. Dipl.-Ing. Vera Korab ZT GmbH", pageWidth - margin, 13, { align: "right" });
  doc.text("www.bauwerksbuch-archkorab.at", pageWidth - margin, 18, { align: "right" });
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, 28, pageWidth - margin, 28);

  let y = 45;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.foreground);
  doc.text("An das Magistrat der Stadt Wien", margin, y);
  y += 6;
  doc.text("Baupolizei", margin, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.text("Betrifft:", margin, y);
  doc.text(address, margin + 24, y);
  y += 22;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const body = "Ich bestätige hiermit, dass von mir für obige Liegenschaft eine Erstprüfung für das Bauwerksbuch durchgeführt wurde.";
  const bodyLines = doc.splitTextToSize(body, pageWidth - 2 * margin);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 7 + 22;

  const dateStr = format(new Date(inspection.date), "dd.MM.yyyy");
  doc.text(`Datum der Überprüfung :   ${dateStr}`, margin, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.text("Arch.DI.Vera Korab", margin, y);

  const safeName = address.replace(/[^a-zA-Z0-9äöüÄÖÜß\-]/g, "_").replace(/_+/g, "_");
  doc.save(`Best.EP_${safeName}.pdf`);
}

async function generateInspectionPdf(inspection: any) {
  if (inspection.projectAddress) {
    inspection = { ...inspection, projectAddress: inspection.projectAddress.replace(/,?\s*[ÖO]sterreich\s*$/i, "").replace(/,?\s*Austria\s*$/i, "").trim() };
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  let logoDataUrl: string | null = null;
  try { logoDataUrl = await loadLogoDataUrl(); } catch {}

  function drawHeader() {
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", margin, 8, 65, 16);
    }
    doc.setDrawColor(...PDF_COLORS.primary);
    doc.setLineWidth(0.6);
    doc.line(margin, 27, pageWidth - margin, 27);
  }

  function drawFooter(pageNum: number, totalPages: number) {
    const footerY = pageHeight - 10;
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.mutedFg);
    const footerAddress = inspection.projectAddress ? `Bauwerksbuch - ${inspection.projectAddress}` : "Bauwerksbuch";
    doc.text(footerAddress, margin, footerY);
    doc.text(`Seite ${pageNum} von ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  drawHeader();
  y = 33;

  const groberCount = inspection.defects?.filter((d: any) => d.status === "grober_mangel").length || 0;
  const leichterCount = inspection.defects?.filter((d: any) => d.status === "leichter_mangel").length || 0;
  const hasBauteilMangel = inspection.notes?.includes("- Mangel") || false;
  const effectiveStatus = (groberCount > 0 || inspection.status === "urgent") ? "Schwerer Mangel" : (leichterCount > 0 || hasBauteilMangel || inspection.status === "needs_repair") ? "Leichter Mangel" : "OK";

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.foreground);
  doc.text(`${inspTypeLabels[inspection.type] || "Prüfung"} - Überprüfung laut §128a der Bauordnung für Wien`, margin, y);
  y += 9;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const details: [string, string][] = [
    ["Datum", format(new Date(inspection.date), "dd.MM.yyyy")],
    ["Adresse", inspection.projectAddress || inspection.projectName || `Projekt #${inspection.projectId}`],
  ];
  if (inspection.projectName && inspection.projectName !== inspection.projectAddress) details.push(["Projekt", inspection.projectName]);
  if (inspection.engineer) details.push(["Sachverständiger", displayName(inspection.engineer)]);

  for (const [label, value] of details) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.mutedFg);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.foreground);
    doc.text(value, margin + 45, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.mutedFg);
  doc.text("Status:", margin, y);
  const statusColor = effectiveStatus === "OK" ? PDF_COLORS.ok : effectiveStatus === "Schwerer Mangel" ? PDF_COLORS.red : PDF_COLORS.amber;
  doc.setTextColor(...statusColor);
  doc.setFont("helvetica", "bold");
  doc.text(effectiveStatus, margin + 45, y);
  doc.setTextColor(...PDF_COLORS.foreground);
  y += 8;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.mutedFg);
  const hinweisText = "Weitere bei der Besichtigung gemachte Fotos und die Fotos der Mängel in Originalgröße sind dem zur Verfügung gestellten Ordner zu entnehmen.";
  const hinweisLines = doc.splitTextToSize(hinweisText, pageWidth - 2 * margin);
  doc.text(hinweisLines, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.foreground);
  y += hinweisLines.length * 4.5 + 6;

  const notes = inspection.notes || "";
  const userNotes = notes.includes("| Bauteilprüfung: ") ? notes.split("| Bauteilprüfung: ")[0].trim() : notes;
  if (userNotes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text("Anmerkungen", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.foreground);
    const lines = doc.splitTextToSize(userNotes, pageWidth - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  if (notes.includes("| Bauteilprüfung: ")) {
    const bauteilPart = notes.split("| Bauteilprüfung: ")[1];
    const entries = bauteilPart.split("; ").map((entry: string) => {
      const nameMatch = entry.match(/^\[(.+?)\]/);
      if (!nameMatch) return null;
      const name = nameMatch[1];
      const opt = BAUTEIL_OPTIONS.find(b => b.label === name);
      const gegenstandMatch = entry.match(/Gegenstand: (.+?)(?:\s*-|$)/);
      return {
        name,
        ref: opt?.ref || "",
        level: opt?.level ?? 0,
        geprueft: entry.includes("geprüft"),
        mangel: entry.includes("Mangel"),
        gegenstand: gegenstandMatch?.[1]?.trim() || opt?.defaultGegenstand || "",
        vertieftePruefung: entry.includes("vertiefte Prüfung"),
        vertieftePruefungText: (() => { const m = entry.match(/vertiefte Prüfung: (.+)$/); return m ? m[1].trim() : ""; })(),
      };
    }).filter(Boolean) as any[];

    if (entries.length > 0) {
      const headerNames = new Set<string>();
      for (let i = 0; i < BAUTEIL_OPTIONS.length; i++) {
        if (BAUTEIL_OPTIONS[i].level === 0 && BAUTEIL_OPTIONS[i + 1]?.level === 1) headerNames.add(BAUTEIL_OPTIONS[i].label);
      }
      const entryMap = new Map(entries.map((e: any) => [e.name, e]));
      const displayEntries: any[] = [];
      for (const opt of BAUTEIL_OPTIONS) {
        if (headerNames.has(opt.label)) {
          const hasChild = BAUTEIL_OPTIONS.some(o => o.level === 1 && entryMap.has(o.label));
          if (hasChild || entryMap.has(opt.label)) {
            displayEntries.push({ name: opt.label, ref: "", level: 0, geprueft: false, mangel: false, gegenstand: "", vertieftePruefung: false, vertieftePruefungText: "", isHeader: true });
          }
        } else if (entryMap.has(opt.label)) {
          displayEntries.push({ ...entryMap.get(opt.label), isHeader: false });
        }
      }
      const standardLabels = new Set(BAUTEIL_OPTIONS.map(o => o.label));
      const customEntries = entries.filter((e: any) => !standardLabels.has(e.name));
      if (customEntries.length > 0) {
        displayEntries.push({ name: "Sonderbauteile", ref: "", level: 0, geprueft: false, mangel: false, gegenstand: "", vertieftePruefung: false, vertieftePruefungText: "", isHeader: true });
        for (const ce of customEntries) {
          displayEntries.push({ ...ce, level: 1, isHeader: false });
        }
      }

      if (y > 240) { doc.addPage(); drawHeader(); y = 33; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...PDF_COLORS.primary);
      doc.text("Bauteil Prüfung", margin, y);
      doc.setTextColor(...PDF_COLORS.foreground);
      y += 2;

      const pdfPrimary = (inspection.defects || []).filter((d: any) => !d.parentDefectId);
      const pdfFollowUps = (inspection.defects || []).filter((d: any) => d.parentDefectId);
      const defectsInOrder: any[] = [];

      for (const e of displayEntries) {
        if (!e.isHeader) {
          const bp = pdfPrimary.filter((d: any) => d.bauteil?.at(-1) === e.name);
          const orph = pdfFollowUps.filter((f: any) => f.bauteil?.at(-1) === e.name && !pdfPrimary.some((p: any) => p.id === f.parentDefectId));
          for (const defect of [...bp, ...orph]) {
            defectsInOrder.push(defect);
            for (const child of pdfFollowUps.filter((f: any) => f.parentDefectId === defect.id)) defectsInOrder.push(child);
          }
        }
      }

      const IMG_W = 80, IMG_H = 60, IMG_GAP = 4, IMGS_PER_ROW = 2, IMG_LABEL_H = 7;
      const defectImagesList: string[][] = [];
      const defectImageDims: {w: number, h: number}[][] = [];
      const compressImg = (src: string, maxW: number, maxH: number): Promise<{data: string, w: number, h: number}> =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const natW = img.naturalWidth, natH = img.naturalHeight;
            const scale = Math.min(maxW / natW, maxH / natH, 1);
            const cw = Math.round(natW * scale), ch = Math.round(natH * scale);
            const canvas = document.createElement("canvas");
            canvas.width = cw; canvas.height = ch;
            canvas.getContext("2d")!.drawImage(img, 0, 0, cw, ch);
            resolve({ data: canvas.toDataURL("image/jpeg", 0.75), w: natW, h: natH });
          };
          img.onerror = () => resolve({ data: src, w: 4, h: 3 });
          img.src = src;
        });
      for (const defect of defectsInOrder) {
        const urls: string[] = defect.imageUrls?.length ? defect.imageUrls : (defect.imageUrl ? [defect.imageUrl] : []);
        const loaded: string[] = [];
        const dims: {w: number, h: number}[] = [];
        for (const url of urls) {
          try {
            const blob = await (await fetch(url)).blob();
            const raw = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob); });
            const { data, w, h } = await compressImg(raw, 473, 355);
            loaded.push(data);
            dims.push({ w, h });
          } catch { dims.push({ w: 4, h: 3 }); }
        }
        defectImagesList.push(loaded);
        defectImageDims.push(dims);
      }

      const getImgBlockH = (di: number) => {
        const imgs = defectImagesList[di] || [];
        if (!imgs.length) return 0;
        const dims = defectImageDims[di] || [];
        const landscapeCount = dims.filter(d => (d.w || 1) >= (d.h || 1)).length;
        const portraitCount = dims.filter(d => (d.h || 1) > (d.w || 1)).length;
        const landscapeRows = landscapeCount > 0 ? Math.ceil(landscapeCount / IMGS_PER_ROW) : 0;
        const portraitRows = portraitCount > 0 ? Math.ceil(portraitCount / IMGS_PER_ROW) : 0;
        return (landscapeRows + portraitRows) * (IMG_H + IMG_GAP) + IMG_LABEL_H + 4;
      };

      const bauteilRows: any[] = [];
      const rowTypes: string[] = [];
      const rowToDefectIndex: Map<number, number> = new Map();
      let defCounter = 0;
      let groupNum = 0;

      for (const e of displayEntries) {
        if (e.isHeader) {
          groupNum++;
          bauteilRows.push([{ content: `${groupNum}. ${e.name}`, colSpan: 6, styles: { fontStyle: "bold" as const, fillColor: PDF_COLORS.muted } }]);
          rowTypes.push("header");
        } else {
          bauteilRows.push([e.ref, e.name, e.gegenstand, e.geprueft ? "Ja" : "Nein", e.mangel ? "Ja" : "Nein", e.vertieftePruefung ? "Ja" : "Nein"]);
          rowTypes.push(e.level === 1 ? "bauteil-child" : "bauteil");

          if (e.vertieftePruefung && e.vertieftePruefungText) {
            bauteilRows.push([{ content: `Vertiefte Prüfung — ${e.name}: ${e.vertieftePruefungText}`, colSpan: 6 }]);
            rowTypes.push("vp");
          }

          const bauteilPrimary = pdfPrimary.filter((d: any) => d.bauteil?.at(-1) === e.name);
          const orphaned = pdfFollowUps.filter((f: any) => f.bauteil?.at(-1) === e.name && !pdfPrimary.some((p: any) => p.id === f.parentDefectId));
          for (const defect of [...bauteilPrimary, ...orphaned]) {
            const di = defCounter++;
            const statusLabel = defect.status === "grober_mangel" ? "Schwerer Mangel" : "Leichter Mangel";
            let content = `${defect.defectId}   ${statusLabel}   ${format(new Date(defect.dateFound), "dd.MM.yyyy")}`;
            if (defect.description) content += `\n${defect.description}`;
            if (defect.location) content += `   |   Lage: ${defect.location}`;
            if (defect.frist) content += `   |   Frist: ${fristLabels[defect.frist] || defect.frist}`;
            if (defect.repairDue && defect.frist !== "umgehend") content += `   |   bis: ${format(new Date(defect.repairDue), "dd.MM.yyyy")}`;
            rowToDefectIndex.set(bauteilRows.length, di);
            bauteilRows.push([{ content, colSpan: 6 }]);
            rowTypes.push(defect.status === "grober_mangel" ? "defect-grober" : "defect-leichter");
            for (const child of pdfFollowUps.filter((f: any) => f.parentDefectId === defect.id)) {
              const ci = defCounter++;
              const cl = child.status === "grober_mangel" ? "Schwerer Mangel" : "Leichter Mangel";
              let cc = `\u21B3 ${child.defectId}   ${cl}   ${format(new Date(child.dateFound), "dd.MM.yyyy")}`;
              if (child.description) cc += `\n${child.description}`;
              if (child.location) cc += `   |   Lage: ${child.location}`;
              if (child.frist) cc += `   |   Frist: ${fristLabels[child.frist] || child.frist}`;
              if (child.repairDue && child.frist !== "umgehend") cc += `   |   bis: ${format(new Date(child.repairDue), "dd.MM.yyyy")}`;
              rowToDefectIndex.set(bauteilRows.length, ci);
              bauteilRows.push([{ content: cc, colSpan: 6 }]);
              rowTypes.push(child.status === "grober_mangel" ? "child-grober" : "child-leichter");
            }
          }
        }
      }

      const segStarts: number[] = [0];
      for (let ri = 1; ri < bauteilRows.length; ri++) {
        if (rowTypes[ri] === "header") segStarts.push(ri);
      }
      segStarts.push(bauteilRows.length);

      for (let si = 0; si < segStarts.length - 1; si++) {
        const segStart = segStarts[si];
        const segEnd = segStarts[si + 1];
        const segRows = bauteilRows.slice(segStart, segEnd);
        const segTypes = rowTypes.slice(segStart, segEnd);

        if (si > 0) { doc.addPage(); drawHeader(); y = 33; }

        autoTable(doc, {
          startY: y,
          head: [["Nr.", "Bauteil", "Gegenstand", "Geprüft", "Mangel", "Vertiefte Prüfung"]],
          body: segRows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2.5, textColor: PDF_COLORS.foreground },
          headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: "bold" },
          columnStyles: { 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
          rowPageBreak: "avoid",
          didParseCell: (data: any) => {
            if (data.section !== "body") return;
            const rt = segTypes[data.row.index];
            if (rt === "bauteil-child" && data.column.index === 1) data.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, right: 2.5, left: 6 };
            if (rt === "bauteil" || rt === "bauteil-child") {
              if (data.column.index === 3) { if (data.cell.raw === "Ja") { data.cell.styles.textColor = PDF_COLORS.ok; data.cell.styles.fontStyle = "bold"; } else data.cell.styles.textColor = PDF_COLORS.mutedFg; }
              if (data.column.index === 4) { if (data.cell.raw === "Ja") { data.cell.styles.textColor = PDF_COLORS.red; data.cell.styles.fontStyle = "bold"; } else data.cell.styles.textColor = PDF_COLORS.mutedFg; }
              if (data.column.index === 5) { if (data.cell.raw === "Ja" || (typeof data.cell.raw === "string" && data.cell.raw.startsWith("Ja:"))) { data.cell.styles.textColor = PDF_COLORS.primary; data.cell.styles.fontStyle = "bold"; } else data.cell.styles.textColor = PDF_COLORS.mutedFg; }
            }
            if (rt === "vp") { data.cell.styles.fillColor = [219, 234, 254]; data.cell.styles.textColor = [37, 99, 235]; data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 8, right: 2 }; data.cell.styles.fontStyle = "italic"; }
            if (rt === "defect-grober") { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, left: 8, right: 2.5 }; }
            if (rt === "defect-leichter") { data.cell.styles.fillColor = [254, 243, 199]; data.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, left: 8, right: 2.5 }; }
            if (rt === "child-grober") { data.cell.styles.fillColor = [255, 237, 237]; data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 14, right: 2.5 }; data.cell.styles.fontSize = 7.5; }
            if (rt === "child-leichter") { data.cell.styles.fillColor = [255, 250, 225]; data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 14, right: 2.5 }; data.cell.styles.fontSize = 7.5; }
            if ((rt === "defect-grober" || rt === "defect-leichter" || rt === "child-grober" || rt === "child-leichter") && data.column.index === 0) {
              const di = rowToDefectIndex.get(segStart + data.row.index);
              if (di !== undefined && (defectImagesList[di] || []).length > 0) {
                const imgBlockH = getImgBlockH(di);
                const isChild = rt === "child-grober" || rt === "child-leichter";
                const padLeft = isChild ? 14 : 8;
                const usableWidth = (pageWidth - 2 * margin) - padLeft - 2.5;
                const fs = isChild ? 7.5 : 8;
                data.doc.setFontSize(fs);
                const rawContent = String((segRows[data.row.index][0] as any).content || "");
                const lines = data.doc.splitTextToSize(rawContent, usableWidth);
                const lineHeightMm = fs * 0.3528 * 1.3;
                const padV = isChild ? 4 : 5;
                const textH = lines.length * lineHeightMm + padV;
                data.cell.styles.minCellHeight = textH + imgBlockH + 4;
              }
            }
          },
          didDrawCell: (data: any) => {
            if (data.section !== "body") return;
            const rt = segTypes[data.row.index];
            if ((rt === "defect-grober" || rt === "defect-leichter" || rt === "child-grober" || rt === "child-leichter") && data.column.index === 0) {
              const di = rowToDefectIndex.get(segStart + data.row.index);
              if (di === undefined) return;
              const imgList = defectImagesList[di] || [];
              if (!imgList.length) return;
              const imgBlockH = getImgBlockH(di);
              const sx = data.cell.x + 8;
              const imgStartY = data.cell.y + data.cell.height - imgBlockH - 2;
              doc.setFont("helvetica", "italic");
              doc.setFontSize(7);
              doc.setTextColor(...PDF_COLORS.mutedFg);
              doc.text(`Fotos: ${defectsInOrder[di].defectId}`, sx, imgStartY + IMG_LABEL_H - 2);
              const imgDims = defectImageDims[di] || [];
              const landscape: {img: string, dim: {w: number, h: number}}[] = [];
              const portrait: {img: string, dim: {w: number, h: number}}[] = [];
              for (let ii = 0; ii < imgList.length; ii++) {
                const dim = imgDims[ii] || { w: 4, h: 3 };
                (dim.h > dim.w ? portrait : landscape).push({ img: imgList[ii], dim });
              }
              const drawGroup = (group: {img: string, dim: {w: number, h: number}}[], startY: number) => {
                group.forEach(({ img, dim }, ii) => {
                  const col = ii % IMGS_PER_ROW;
                  const row = Math.floor(ii / IMGS_PER_ROW);
                  const ratio = dim.w / (dim.h || 1);
                  let drawW = IMG_W, drawH = IMG_W / ratio;
                  if (drawH > IMG_H) { drawH = IMG_H; drawW = IMG_H * ratio; }
                  const cellX = sx + col * (IMG_W + IMG_GAP);
                  const cellY = startY + row * (IMG_H + IMG_GAP);
                  doc.addImage(img, "JPEG", cellX + (IMG_W - drawW) / 2, cellY + (IMG_H - drawH) / 2, drawW, drawH);
                });
              };
              let rowY = imgStartY + IMG_LABEL_H;
              if (landscape.length) {
                drawGroup(landscape, rowY);
                rowY += Math.ceil(landscape.length / IMGS_PER_ROW) * (IMG_H + IMG_GAP);
              }
              if (portrait.length) { drawGroup(portrait, rowY); }
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }
  doc.setTextColor(0);

  const addressForFilename = (inspection.projectAddress || inspection.projectName || `Projekt_${inspection.projectId}`).replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "_").trim();
  doc.save(`BWB Prüfbericht ${addressForFilename} ${new Date().getFullYear()}.pdf`);
}

async function rotateImageFile(src: string | File): Promise<File> {
  const blob = src instanceof File ? src : await fetch(src, { credentials: "include" }).then(r => r.blob());
  const blobUrl = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = blobUrl;
  });
  URL.revokeObjectURL(blobUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return new Promise<File>((resolve) => {
    canvas.toBlob((b) => resolve(new File([b!], "rotated.jpg", { type: "image/jpeg" })), "image/jpeg", 0.92);
  });
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
  onRotateMangelFile: (bauteilIndex: number, mangelIndex: number, fileIndex: number) => void;
  onRotateMangelUrl: (bauteilIndex: number, mangelIndex: number, url: string) => void;
  onRemoveMangel: (bauteilIndex: number, mangelIndex: number) => void;
}

function BauteilRow({ bp, index, isDefault, isHeader, onUpdate, onRemove, onAddMangel, onUpdateMangel, onAddMangelImages, onRemoveMangelFile, onRemoveMangelUrl, onRotateMangelFile, onRotateMangelUrl, onRemoveMangel }: BauteilRowProps) {
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
            {isDefault || isHeader ? (
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
                  <Label className="text-xs">Fotos</Label>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {(m.imageUrls || []).map((url, ui) => (
                      <EditThumb
                        key={`url-${ui}`}
                        src={url}
                        alt="Mangel"
                        onRotate={() => onRotateMangelUrl(index, mi, url)}
                        onRemove={() => onRemoveMangelUrl(index, mi, url)}
                        testIdRotate={`button-rotate-mangel-url-${index}-${mi}-${ui}`}
                        testIdRemove={`button-remove-mangel-url-${index}-${mi}-${ui}`}
                      />
                    ))}
                    {(m.imageFiles || []).map((file, fi) => (
                      <EditThumb
                        key={`file-${fi}`}
                        src={URL.createObjectURL(file)}
                        alt="Mangel"
                        onRotate={() => onRotateMangelFile(index, mi, fi)}
                        onRemove={() => onRemoveMangelFile(index, mi, fi)}
                        testIdRotate={`button-rotate-mangel-file-${index}-${mi}-${fi}`}
                        testIdRemove={`button-remove-mangel-file-${index}-${mi}-${fi}`}
                      />
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

export default function InspectionsGlobal() {
  const queryClient = useQueryClient();
  const { data: allInspections, isLoading: insLoading } = useAllInspections();
  const { data: projects, isLoading: projLoading } = useProjects();
  const { data: profile } = useProfile();
  const { data: clients } = useClients();
  const createInspection = useCreateInspection();
  const createDefect = useCreateDefect();
  const updateDefect = useUpdateDefect();
  const deleteDefect = useDeleteDefect();
  const updateInspection = useUpdateInspection();
  const deleteInspection = useDeleteInspection();
  const [deletedDefectIds, setDeletedDefectIds] = useState<number[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "address">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [inspDialogOpen, setInspDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editBauteilPruefungen, setEditBauteilPruefungen] = useState<BauteilPruefung[]>(
    BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: b.ref || "", artDesMangels: b.defaultGegenstand || "", geprueft: !b.label.startsWith("Sonderbauteil"), mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] }))
  );
  const [bauteilPruefungen, setBauteilPruefungen] = useState<BauteilPruefung[]>(
    BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: b.ref || "", artDesMangels: b.defaultGegenstand || "", geprueft: !b.label.startsWith("Sonderbauteil"), mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] }))
  );

  const { register: inspReg, handleSubmit: handleInspSubmit, setValue: setInspValue, reset: resetInspForm, getValues: getInspValues, watch: watchInsp } = useForm({
    defaultValues: { projectId: "", date: "", status: "OK", type: "erstpruefung", notes: "", engineerId: "" }
  });
  const newInspEngineerId = watchInsp("engineerId");

  const updateBauteilPruefung = (index: number, field: keyof BauteilPruefung, value: any) => {
    setBauteilPruefungen(prev => prev.map((bp, i) => i === index ? { ...bp, [field]: value } : bp));
  };

  const addCustomBauteil = () => {
    setBauteilPruefungen(prev => {
      const hasSonderbauteileHeader = prev.some(b => b.bauteil === "Sonderbauteile" && b.level === 0);
      const customCount = prev.filter(b => b.refNr.startsWith("5.")).length;
      const nextRef = `5.${customCount + 1}`;
      const newChild = { bauteil: "", level: 1, refNr: nextRef, artDesMangels: "", geprueft: false, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
      if (!hasSonderbauteileHeader) {
        const header = { bauteil: "Sonderbauteile", level: 0, refNr: "", artDesMangels: "", geprueft: false, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
        return [...prev, header, newChild];
      }
      return [...prev, newChild];
    });
  };

  const addMangelToBauteil = (bauteilIndex: number) => {
    setBauteilPruefungen(prev => {
      const bp = prev[bauteilIndex];
      const opt = BAUTEIL_OPTIONS.find(o => o.label === bp.bauteil);
      const ref = opt?.ref || bp.refNr || "";
      const nextNum = bp.maengel.length + 1;
      const autoId = ref ? `M ${ref}.${nextNum}` : `M-${nextNum}`;
      const inspDate = getInspValues("date") || new Date().toISOString().split("T")[0];
      return prev.map((b, i) => i === bauteilIndex
        ? { ...b, mangel: true, maengel: [...b.maengel, { defectId: autoId, description: "", location: "", status: "leichter_mangel", dateFound: inspDate, frist: "1_jahr", repairDue: "", imageFiles: [], imageUrls: [] }] }
        : b
      );
    });
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

  const addMangelImages = (bauteilIndex: number, mangelIndex: number, files: File[]) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFiles: [...(m.imageFiles || []), ...files] } : m);
      return { ...bp, maengel: updated };
    }));
  };

  const removeMangelFile = (bauteilIndex: number, mangelIndex: number, fileIndex: number) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFiles: (m.imageFiles || []).filter((_, fi) => fi !== fileIndex) } : m);
      return { ...bp, maengel: updated };
    }));
  };

  const removeMangelUrl = (bauteilIndex: number, mangelIndex: number, url: string) => {
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageUrls: (m.imageUrls || []).filter(u => u !== url) } : m);
      return { ...bp, maengel: updated };
    }));
  };

  const rotateMangelFile = async (bauteilIndex: number, mangelIndex: number, fileIndex: number) => {
    const file = bauteilPruefungen[bauteilIndex]?.maengel[mangelIndex]?.imageFiles?.[fileIndex];
    if (!file) return;
    const rotated = await rotateImageFile(file);
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => {
        if (mi !== mangelIndex) return m;
        const files = [...(m.imageFiles || [])];
        files[fileIndex] = rotated;
        return { ...m, imageFiles: files };
      });
      return { ...bp, maengel: updated };
    }));
  };

  const rotateMangelUrl = async (bauteilIndex: number, mangelIndex: number, url: string) => {
    const rotated = await rotateImageFile(url);
    setBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => {
        if (mi !== mangelIndex) return m;
        return { ...m, imageUrls: (m.imageUrls || []).filter(u => u !== url), imageFiles: [...(m.imageFiles || []), rotated] };
      });
      return { ...bp, maengel: updated };
    }));
  };

  const removeBauteilPruefung = (index: number) => {
    setBauteilPruefungen(prev => prev.filter((_, i) => i !== index));
  };

  const resetDialog = () => {
    resetInspForm();
    setBauteilPruefungen(BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: b.ref || "", artDesMangels: b.defaultGegenstand || "", geprueft: !b.label.startsWith("Sonderbauteil"), mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] })));
  };

  const { register: editInspReg, handleSubmit: handleEditInspSubmit, setValue: setEditInspValue, reset: resetEditInspForm, watch: watchEditInsp, getValues: getEditInspValues } = useForm({
    defaultValues: { date: "", status: "OK", type: "erstpruefung", notes: "", engineerId: "" }
  });
  const editInspType = watchEditInsp("type");
  const editInspStatus = watchEditInsp("status");
  const editInspEngineerId = watchEditInsp("engineerId");

  const updateEditBauteilPruefung = (index: number, field: keyof BauteilPruefung, value: any) => {
    setEditBauteilPruefungen(prev => prev.map((bp, i) => i === index ? { ...bp, [field]: value } : bp));
  };

  const addEditCustomBauteil = () => {
    setEditBauteilPruefungen(prev => {
      const hasSonderbauteileHeader = prev.some(b => b.bauteil === "Sonderbauteile" && b.level === 0);
      const customCount = prev.filter(b => b.refNr.startsWith("5.")).length;
      const nextRef = `5.${customCount + 1}`;
      const newChild = { bauteil: "", level: 1, refNr: nextRef, artDesMangels: "", geprueft: false, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
      if (!hasSonderbauteileHeader) {
        const header = { bauteil: "Sonderbauteile", level: 0, refNr: "", artDesMangels: "", geprueft: false, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
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
      const ref = opt?.ref || bp.refNr || "";
      const nextNum = bp.maengel.length + 1;
      const autoId = ref ? `M ${ref}.${nextNum}` : `M-${nextNum}`;
      const inspDate = getEditInspValues("date") || new Date().toISOString().split("T")[0];
      return prev.map((b, i) => i === bauteilIndex
        ? { ...b, mangel: true, maengel: [...b.maengel, { defectId: autoId, description: "", location: "", status: "leichter_mangel", dateFound: inspDate, frist: "1_jahr", repairDue: "", imageFiles: [], imageUrls: [] }] }
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
    setEditBauteilPruefungen(prev => {
      const bp = prev[bauteilIndex];
      if (bp) {
        const m = bp.maengel[mangelIndex];
        if (m?.existingDefectId) {
          setDeletedDefectIds(ids => [...ids, m.existingDefectId!]);
        }
      }
      return prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const newMaengel = bp.maengel.filter((_, mi) => mi !== mangelIndex);
        return { ...bp, maengel: newMaengel, mangel: newMaengel.length > 0 };
      });
    });
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
      const updated = bp.maengel.map((m, mi) => mi === mangelIndex ? { ...m, imageFiles: (m.imageFiles || []).filter((_, fi) => fi !== fileIndex) } : m);
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

  const rotateEditMangelFile = async (bauteilIndex: number, mangelIndex: number, fileIndex: number) => {
    const file = editBauteilPruefungen[bauteilIndex]?.maengel[mangelIndex]?.imageFiles?.[fileIndex];
    if (!file) return;
    const rotated = await rotateImageFile(file);
    setEditBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => {
        if (mi !== mangelIndex) return m;
        const files = [...(m.imageFiles || [])];
        files[fileIndex] = rotated;
        return { ...m, imageFiles: files };
      });
      return { ...bp, maengel: updated };
    }));
  };

  const rotateEditMangelUrl = async (bauteilIndex: number, mangelIndex: number, url: string) => {
    const rotated = await rotateImageFile(url);
    setEditBauteilPruefungen(prev => prev.map((bp, bi) => {
      if (bi !== bauteilIndex) return bp;
      const updated = bp.maengel.map((m, mi) => {
        if (mi !== mangelIndex) return m;
        return { ...m, imageUrls: (m.imageUrls || []).filter(u => u !== url), imageFiles: [...(m.imageFiles || []), rotated] };
      });
      return { ...bp, maengel: updated };
    }));
  };

  const buildEditBauteilState = (ins: any): BauteilPruefung[] => {
    const base: BauteilPruefung[] = BAUTEIL_OPTIONS.map(b => ({ bauteil: b.label, level: b.level, refNr: b.ref || "", artDesMangels: b.defaultGegenstand || "", geprueft: false, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] as BauteilMangel[] }));
    let customCounter = 1;
    const getOrCreate = (name: string): BauteilPruefung => {
      let bp = base.find(b => b.bauteil === name);
      if (!bp) {
        if (!base.some(b => b.bauteil === "Sonderbauteile" && b.level === 0)) {
          base.push({ bauteil: "Sonderbauteile", level: 0, refNr: "", artDesMangels: "", geprueft: false, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] });
        }
        bp = { bauteil: name, level: 1, refNr: `5.${customCounter++}`, artDesMangels: "", geprueft: false, mangel: false, vertieftePruefung: false, vertieftePruefungText: "", maengel: [] };
        base.push(bp);
      }
      return bp;
    };
    const notes = ins.notes || "";
    if (notes.includes("| Bauteilprüfung: ")) {
      const bauteilPart = notes.split("| Bauteilprüfung: ")[1];
      const entries = bauteilPart.split("; ");
      for (const entry of entries) {
        const match = entry.match(/^\[(.+?)\]/);
        if (!match) continue;
        const name = match[1];
        const knownEntry = BAUTEIL_OPTIONS.find(b => b.label === name);
        const bp = knownEntry ? base.find(b => b.bauteil === name) : getOrCreate(name);
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
      const targetName = bauteilNames.at(-1);
      if (!targetName) continue;
      const knownEntry = BAUTEIL_OPTIONS.find(b => b.label === targetName);
      const bp = knownEntry ? base.find(b => b.bauteil === targetName) : getOrCreate(targetName);
      if (!bp) continue;
      bp.mangel = true;
      bp.maengel.push({
        defectId: d.defectId || "",
        existingDefectId: d.id,
        description: d.description || "",
        location: d.location || "",
        status: d.status || "leichter_mangel",
        dateFound: d.dateFound ? format(new Date(d.dateFound), 'yyyy-MM-dd') : "",
        frist: d.frist || "",
        repairDue: d.repairDue ? format(new Date(d.repairDue), 'yyyy-MM-dd') : "",
        imageFiles: [],
        imageUrls: d.imageUrls?.length ? d.imageUrls : (d.imageUrl ? [d.imageUrl] : []),
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
      engineerId: ins.engineerId || "",
    });
    setEditBauteilPruefungen(buildEditBauteilState(ins));
    setDeletedDefectIds([]);
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
        projectId: editingInspection.projectId,
        data: {
          date: new Date(data.date),
          status: autoStatus,
          type: data.type,
          notes: fullNotes || null,
          engineerId: data.engineerId || editingInspection.engineerId,
        }
      });

      for (const id of deletedDefectIds) {
        await deleteDefect.mutateAsync({ id, projectId: editingInspection.projectId });
      }

      for (const bp of editBauteilPruefungen) {
        for (const m of bp.maengel) {
          if (!m.defectId || !m.dateFound) continue;
          const defects = editingInspection.defects || [];
          const matchingDefect = defects.find((d: any) => d.defectId === m.defectId);
          if (matchingDefect?.id) {
            if (matchingDefect.status !== m.status || matchingDefect.description !== m.description || matchingDefect.location !== m.location || matchingDefect.frist !== (m.frist || null)) {
              await updateDefect.mutateAsync({
                id: matchingDefect.id,
                projectId: editingInspection.projectId,
                data: {
                  bauteil: getParentBauteil(bp.bauteil) ? [getParentBauteil(bp.bauteil)!, bp.bauteil] : [bp.bauteil],
                  status: m.status as "leichter_mangel" | "grober_mangel",
                  description: m.description,
                  location: m.location,
                  frist: (m.frist || null) as any,
                  repairDue: m.repairDue ? new Date(m.repairDue) : null,
                },
              });
            }
            const originalUrls: string[] = matchingDefect.imageUrls?.length ? matchingDefect.imageUrls : (matchingDefect.imageUrl ? [matchingDefect.imageUrl] : []);
            const currentUrls: string[] = m.imageUrls || [];
            for (const removedUrl of originalUrls.filter((u: string) => !currentUrls.includes(u))) {
              await fetch(`/api/defects/${matchingDefect.id}/image`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: removedUrl }), credentials: 'include' });
            }
            for (const imgFile of (m.imageFiles || [])) {
              const formData = new FormData();
              formData.append('image', imgFile);
              await fetch(`/api/defects/${matchingDefect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
            }
          } else {
            const defect = await createDefect.mutateAsync({
              inspectionId: editingInspection.id,
              projectId: editingInspection.projectId,
              data: {
                inspectionId: editingInspection.id,
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
            for (const imgFile of (m.imageFiles || [])) {
              if (defect?.id) {
                const formData = new FormData();
                formData.append('image', imgFile);
                await fetch(`/api/defects/${defect.id}/image`, { method: 'POST', body: formData, credentials: 'include' });
              }
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${editingInspection.projectId}/inspections`] });
      queryClient.invalidateQueries({ queryKey: ["/api/defects/summary"] });
      setEditDialogOpen(false);
      setEditingInspection(null);
      setDeletedDefectIds([]);
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
          engineerId: data.engineerId || profile.userId,
          date: new Date(data.date),
          status: autoStatus,
          type: data.type,
          notes: fullNotes || null,
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
          for (const imgFile of (m.imageFiles || [])) {
            if (defect?.id) {
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

  const _q = searchQuery.trim().toLowerCase();
  const filteredInspections: any[] = (() => {
    const base = _q ? (allInspections || []).filter((ins: any) => {
      const projectName = (ins.projectName || "").toLowerCase();
      const dateStr = format(new Date(ins.date), 'dd.MM.yyyy');
      const typeLabel = (inspTypeLabels[ins.type] || ins.type || "").toLowerCase();
      const engineer = ins.engineer ? displayName(ins.engineer).toLowerCase() : "";
      return projectName.includes(_q) || dateStr.includes(_q) || typeLabel.includes(_q) || engineer.includes(_q);
    }) : [...(allInspections || [])];
    const extractPlz = (addr: string): number => {
      const m = addr.match(/\b(\d{4})\b/);
      return m ? parseInt(m[1]) : 9999;
    };
    base.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        const aAddr = a.projectName || "";
        const bAddr = b.projectName || "";
        const aPlz = extractPlz(aAddr);
        const bPlz = extractPlz(bAddr);
        if (aPlz !== bPlz) {
          cmp = aPlz - bPlz;
        } else {
          cmp = aAddr.localeCompare(bAddr, "de");
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return base;
  })();

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
            <form onSubmit={handleInspSubmit(onInspSubmit)} className="space-y-6 mt-2">
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
                  <Label>Sachverständiger</Label>
                  <Select value={newInspEngineerId} onValueChange={(val) => setInspValue("engineerId", val)}>
                    <SelectTrigger className="bg-background border-border" data-testid="select-inspection-engineer-global">
                      <SelectValue placeholder="Sachverständigen wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {(clients || []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{displayName(c)}</SelectItem>
                      ))}
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
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Sonderbauteil hinzufügen
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
                        const isHeader = (isDefault && bp.level === 0 && index < BAUTEIL_OPTIONS.length - 1 && BAUTEIL_OPTIONS[index + 1]?.level === 1) || (!isDefault && bp.level === 0);
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
                            onAddMangelImages={addMangelImages}
                            onRemoveMangelFile={removeMangelFile}
                            onRemoveMangelUrl={removeMangelUrl}
                            onRotateMangelFile={rotateMangelFile}
                            onRotateMangelUrl={rotateMangelUrl}
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <h2 className="font-display text-xl font-bold text-foreground">Alle Prüfungen</h2>
          <div className="flex items-center gap-2 sm:ml-auto">
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
              <button
                onClick={() => {
                  if (sortBy === "date") {
                    setSortDir(d => d === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("date");
                    setSortDir("desc");
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${sortBy === "date" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                data-testid="button-sort-date"
              >
                <Calendar className="w-3.5 h-3.5" />
                Datum
                {sortBy === "date" && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                {sortBy !== "date" && <ArrowUpDown className="w-3 h-3 opacity-40" />}
              </button>
              <button
                onClick={() => {
                  if (sortBy === "address") {
                    setSortDir(d => d === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("address");
                    setSortDir("asc");
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${sortBy === "address" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                data-testid="button-sort-address"
              >
                <Building className="w-3.5 h-3.5" />
                Adresse
                {sortBy === "address" && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                {sortBy !== "address" && <ArrowUpDown className="w-3 h-3 opacity-40" />}
              </button>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Suche nach Projekt, Datum, Typ…"
                className="w-full pl-9 pr-8 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                data-testid="input-inspection-search"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-clear-search">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {(!allInspections || allInspections.length === 0) ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
            Keine Prüfungen im Verzeichnis vorhanden.
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
            Keine Prüfungen gefunden für „{searchQuery}".
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInspections.map((ins: any) => {
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
                            {displayName(ins.engineer)}
                          </span>
                        )}
                        {ins.notes && (ins.notes.includes("| Bauteilprüfung: ") ? ins.notes.split("| Bauteilprüfung: ")[0].trim() : ins.notes) && (
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{ins.notes.includes("| Bauteilprüfung: ") ? ins.notes.split("| Bauteilprüfung: ")[0].trim() : ins.notes}</span>
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
                        onClick={(e) => { e.stopPropagation(); generateInspectionPdf(ins); }}
                        title="PDF erstellen"
                        data-testid={`button-pdf-inspection-${ins.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
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
          <form onSubmit={handleEditInspSubmit(onEditInspSubmit)} className="space-y-6 mt-2">
            {editingInspection && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Building className="w-4 h-4" />
                {editingInspection.projectName || `Projekt #${editingInspection.projectId}`}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Art der Prüfung</Label>
                <Select value={editInspType} onValueChange={(val) => {
                  setEditInspValue("type", val);
                  setEditBauteilPruefungen(prev => prev.map(bp => ({ ...bp, geprueft: val === "folgepruefung" ? true : bp.geprueft })));
                }}>
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
                <Label>Prüfdatum</Label>
                <Input type="date" {...editInspReg("date")} required className="bg-background border-border" data-testid="input-edit-inspection-date" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Sachverständiger</Label>
                <Select value={editInspEngineerId} onValueChange={(val) => setEditInspValue("engineerId", val)}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-edit-inspection-engineer">
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
                <Input {...editInspReg("notes")} placeholder="Kurze Notizen..." className="bg-background border-border" data-testid="input-edit-inspection-notes" />
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display font-bold text-base">Bauteil Prüfung</h4>
                <Button type="button" variant="outline" size="sm" onClick={addEditCustomBauteil} className="bg-card border-border hover:bg-muted/60" data-testid="button-edit-add-bauteil">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Sonderbauteil hinzufügen
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
                          onRotateMangelFile={rotateEditMangelFile}
                          onRotateMangelUrl={rotateEditMangelUrl}
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
                <span className="text-muted-foreground">Sachverständiger</span>
                <span className="font-medium text-foreground">{displayName(inspection.engineer)}</span>
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
              vertieftePruefungText: (() => { const m = entry.match(/vertiefte Prüfung: (.+)$/); return m ? m[1].trim() : ""; })(),
            };
          }).filter(Boolean) as { name: string; ref: string; level: number; geprueft: boolean; mangel: boolean; gegenstand: string; vertieftePruefung: boolean; vertieftePruefungText: string }[];
          if (entries.length === 0) return null;
          const headerNames = new Set<string>();
          for (let i = 0; i < BAUTEIL_OPTIONS.length; i++) {
            if (BAUTEIL_OPTIONS[i].level === 0 && BAUTEIL_OPTIONS[i + 1]?.level === 1) headerNames.add(BAUTEIL_OPTIONS[i].label);
          }
          const entryMap = new Map(entries.map(e => [e.name, e]));
          const displayEntries: any[] = [];
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
          const standardLabels2 = new Set(BAUTEIL_OPTIONS.map(o => o.label));
          const customEntries2 = entries.filter(e => !standardLabels2.has(e.name));
          if (customEntries2.length > 0) {
            displayEntries.push({ name: "Sonderbauteile", ref: "", level: 0, geprueft: false, mangel: false, gegenstand: "", vertieftePruefung: false, isCustomHeader: true });
            for (const ce of customEntries2) {
              displayEntries.push({ ...ce, level: 1 });
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
                      <th className="text-center px-3 py-2 font-semibold w-28">Vertiefte Prüfung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(() => { let gNum = 0; return displayEntries.map((e, i) => {
                      const isHeader = headerNames.has(e.name) || !!e.isCustomHeader;
                      if (isHeader) gNum++;
                      return isHeader ? (
                        <tr key={i} className="bg-muted/30">
                          <td colSpan={6} className="px-3 py-2 font-bold text-foreground">{gNum}. {e.name}</td>
                        </tr>
                      ) : (
                        <Fragment key={i}>
                          <tr className="hover:bg-muted/10">
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
                              {e.vertieftePruefung ? <span className="text-blue-600 font-medium">Ja</span> : <span className="text-muted-foreground">Nein</span>}
                            </td>
                          </tr>
                          {e.vertieftePruefung && e.vertieftePruefungText && (
                            <tr className="border-b border-border bg-blue-50/20 dark:bg-blue-900/10">
                              <td colSpan={6} className="px-3 py-3">
                                <div className="ml-4 border-l-2 border-blue-500/40 pl-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Vertiefte Prüfung — {e.name}</span>
                                  </div>
                                  <p className="text-sm text-foreground">{e.vertieftePruefungText}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                          {(() => {
                            const bauteilPrimary = primaryDefects.filter((d: any) => d.bauteil?.at(-1) === e.name);
                            const orphanedFollowUps = followUps.filter((f: any) => f.bauteil?.at(-1) === e.name && !primaryDefects.some((p: any) => p.id === f.parentDefectId));
                            const allForBauteil = [...bauteilPrimary, ...orphanedFollowUps];
                            if (allForBauteil.length === 0) return null;
                            return allForBauteil.map((defect: any) => {
                              const children = followUps.filter((f: any) => f.parentDefectId === defect.id);
                              const imgs: string[] = defect.imageUrls?.length ? defect.imageUrls : (defect.imageUrl ? [defect.imageUrl] : []);
                              const isGrober = defect.status === 'grober_mangel';
                              return (
                                <Fragment key={`defect-inline-${defect.id}`}>
                                  <tr className={`border-b border-border/40 ${isGrober ? 'bg-red-50/20 dark:bg-red-950/15' : 'bg-amber-50/10 dark:bg-amber-950/5'}`}>
                                    <td colSpan={6} className="px-3 py-2.5">
                                      <div className={`ml-4 pl-4 border-l-2 ${isGrober ? 'border-red-500/40' : 'border-amber-500/40'}`}>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-0.5">
                                          <span className="font-mono font-semibold text-xs text-primary">{defect.defectId}</span>
                                          <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full border uppercase ${isGrober ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-amber-500 border-amber-500/30 bg-amber-500/10'}`}>
                                            {isGrober ? 'Schwerer Mangel' : 'Leichter Mangel'}
                                          </span>
                                          <span className="text-xs text-muted-foreground">{format(new Date(defect.dateFound), 'dd.MM.yyyy')}</span>
                                          {defect.frist && <span className="text-xs text-muted-foreground">· Frist: {fristLabels[defect.frist] || defect.frist}</span>}
                                          {defect.repairDue && <span className="text-xs text-muted-foreground">· bis {format(new Date(defect.repairDue), 'dd.MM.yyyy')}</span>}
                                        </div>
                                        <p className="text-xs text-foreground leading-snug">{defect.description}</p>
                                        {defect.location && <p className="text-xs text-muted-foreground mt-0.5">{defect.location}</p>}
                                        {imgs.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{imgs.map((src: string, ii: number) => <ExpandableImage key={ii} src={src} alt="Mangel" />)}</div>}
                                      </div>
                                    </td>
                                  </tr>
                                  {children.map((child: any) => {
                                    const childImgs: string[] = child.imageUrls?.length ? child.imageUrls : (child.imageUrl ? [child.imageUrl] : []);
                                    const childGrober = child.status === 'grober_mangel';
                                    return (
                                      <tr key={`followup-${child.id}`} className="bg-muted/10 border-b border-border/30">
                                        <td colSpan={6} className="px-3 py-2">
                                          <div className="ml-8 pl-4 border-l-2 border-muted-foreground/20">
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-0.5">
                                              <CornerDownRight className="w-3 h-3 text-muted-foreground" />
                                              <span className="font-mono text-xs text-muted-foreground">{child.defectId}</span>
                                              <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full border uppercase ${childGrober ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-amber-500 border-amber-500/30 bg-amber-500/10'}`}>
                                                {childGrober ? 'Schwerer Mangel' : 'Leichter Mangel'}
                                              </span>
                                              <span className="text-xs text-muted-foreground">{format(new Date(child.dateFound), 'dd.MM.yyyy')}</span>
                                              {child.frist && <span className="text-xs text-muted-foreground">· Frist: {fristLabels[child.frist] || child.frist}</span>}
                                              {child.repairDue && <span className="text-xs text-muted-foreground">· bis {format(new Date(child.repairDue), 'dd.MM.yyyy')}</span>}
                                            </div>
                                            <p className="text-xs text-foreground leading-snug">{child.description}</p>
                                            {child.location && <p className="text-xs text-muted-foreground mt-0.5">{child.location}</p>}
                                            {childImgs.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{childImgs.map((src: string, ii: number) => <ExpandableImage key={ii} src={src} alt="Mangel" />)}</div>}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </Fragment>
                              );
                            });
                          })()}
                        </Fragment>
                      );
                    }); })()}
                  </tbody>
                </table>
              </div>
            </div>
          );
      })()}

    </div>
  );
}

function ZoomableLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const posAtDrag = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom(z => Math.min(Math.max(z * factor, 0.5), 10));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    posAtDrag.current = pos;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPos({ x: posAtDrag.current.x + (e.clientX - dragOrigin.current.x), y: posAtDrag.current.y + (e.clientY - dragOrigin.current.y) });
  };
  const handleMouseUp = () => setDragging(false);
  const reset = () => { setZoom(1); setPos({ x: 0, y: 0 }); };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center" onClick={onClose}>
      <div
        className="relative overflow-hidden rounded-xl select-none"
        style={{ width: "90vw", height: "85vh", cursor: dragging ? "grabbing" : "grab" }}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          data-testid="img-expanded"
          style={{
            imageOrientation: "none",
            position: "absolute",
            top: "50%",
            left: "50%",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${zoom})`,
            transition: dragging ? "none" : "transform 0.12s ease",
            userSelect: "none",
          }}
        />
      </div>
      <button type="button" onClick={onClose} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-card/90 border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors z-10" data-testid="button-close-image">
        <X className="w-5 h-5" />
      </button>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/90 border border-border rounded-full px-3 py-1.5 z-10 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => setZoom(z => Math.max(z * 0.8, 0.5))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground font-semibold text-lg leading-none">−</button>
        <span className="text-xs text-foreground w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(z => Math.min(z * 1.25, 10))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground font-semibold text-lg leading-none">+</button>
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button" onClick={reset} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors" title="Zurücksetzen">
          <ZoomIn className="w-3.5 h-3.5 text-foreground" />
        </button>
      </div>
    </div>
  );
}

function EditThumb({ src, alt, onRotate, onRemove, testIdRotate, testIdRemove }: {
  src: string; alt: string;
  onRotate: () => void; onRemove: () => void;
  testIdRotate?: string; testIdRemove?: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <div className="relative group">
        <button type="button" onClick={() => setZoomed(true)} className="w-16 h-16 rounded-lg border border-border overflow-hidden block cursor-zoom-in">
          <img src={src} alt={alt} className="w-full h-full object-cover" style={{ imageOrientation: "none" }} />
        </button>
        <button type="button" onClick={onRotate} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid={testIdRotate}>
          <RotateCw className="w-3 h-3" />
        </button>
        <button type="button" onClick={onRemove} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid={testIdRemove}>
          <X className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => setZoomed(true)} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-card border border-border text-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-3 h-3" />
        </button>
      </div>
      {zoomed && <ZoomableLightbox src={src} alt={alt} onClose={() => setZoomed(false)} />}
    </>
  );
}

function ExpandableImage({ src, alt }: { src: string; alt: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="block w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-zoom-in"
        data-testid="button-expand-image"
      >
        <img src={src} alt={alt} className="w-full h-full object-cover" style={{ imageOrientation: "none" }} />
      </button>
      {expanded && <ZoomableLightbox src={src} alt={alt} onClose={() => setExpanded(false)} />}
    </>
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
          {(() => {
            const imgs: string[] = defect.imageUrls?.length ? defect.imageUrls : (defect.imageUrl ? [defect.imageUrl] : []);
            return imgs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {imgs.map((src: string, ii: number) => <ExpandableImage key={ii} src={src} alt="Mangel" />)}
              </div>
            ) : <span className="text-muted-foreground">–</span>;
          })()}
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
            {(() => {
              const imgs: string[] = child.imageUrls?.length ? child.imageUrls : (child.imageUrl ? [child.imageUrl] : []);
              return imgs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {imgs.map((src: string, ii: number) => <ExpandableImage key={ii} src={src} alt="Mangel" />)}
                </div>
              ) : <span className="text-muted-foreground">–</span>;
            })()}
          </td>
        </tr>
      ))}
    </>
  );
}
