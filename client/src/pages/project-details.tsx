import { useState, useRef, useEffect, Fragment } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { displayName, displayInitials, formatAddr } from "@/lib/utils";
import { MapPlaceholder } from "@/components/map-placeholder";
import {
  useProject,
  useUpdateProject,
  useDefectSummary,
} from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-users";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import {
  useInspections,
  useCreateInspection,
  useCreateDefect,
  useUpdateInspection,
  useUpdateDefect,
  useDeleteDefect,
  useDeleteInspection,
} from "@/hooks/use-inspections";
import {
  useBauakte,
  useImportBauakt,
  useUploadBauaktFiles,
} from "@/hooks/use-bauakte";
import {
  useProjectImages,
  useUploadProjectImages,
  useDeleteProjectImage,
} from "@/hooks/use-project-images";
import { useProfile } from "@/hooks/use-profile";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import logoPath from "@assets/logo_1772640036077.png";
import {
  Building,
  MapPin,
  Calendar,
  FileText,
  ChevronRight,
  ChevronDown,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Upload,
  Loader2,
  CornerDownRight,
  Hash,
  MapPinned,
  Pencil,
  Archive,
  ExternalLink,
  FileUp,
  Trash2,
  ImagePlus,
  X,
  LayoutGrid,
  List,
  RotateCw,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const fristLabels: Record<string, string> = {
  umgehend: "Umgehend",
  "6_monate": "6 Monate",
  "1_jahr": "1 Jahr",
  kein_handlungsbedarf: "Information",
};

const PDF_COLORS = {
  primary: [97, 97, 158] as [number, number, number],
  foreground: [33, 33, 49] as [number, number, number],
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

async function loadBriefpapierBytes(): Promise<ArrayBuffer> {
  const resp = await fetch("/briefpapier.pdf");
  return resp.arrayBuffer();
}

function pdfLibColor(r: number, g: number, b: number) {
  return rgb(r / 255, g / 255, b / 255);
}

async function generateBestaetigungWithTemplate(
  address: string,
  bodyText: string,
  dateLine: string,
  filename: string,
) {
  const templateBytes = await loadBriefpapierBytes();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();
  const margin = 57;
  const black = pdfLibColor(30, 30, 30);
  const muted = pdfLibColor(120, 120, 120);
  const lineHeight = 15;

  let y = height - 175;

  page.drawText("An das Magistrat der Stadt Wien", {
    x: margin,
    y,
    font: helvetica,
    size: 11,
    color: black,
  });
  y -= lineHeight;
  page.drawText("Baupolizei", {
    x: margin,
    y,
    font: helvetica,
    size: 11,
    color: black,
  });
  y -= lineHeight * 2;

  page.drawText("Betrifft:", {
    x: margin,
    y,
    font: helveticaBold,
    size: 11,
    color: black,
  });
  page.drawText(address, {
    x: margin + 68,
    y,
    font: helveticaBold,
    size: 11,
    color: black,
  });
  y -= lineHeight * 2.2;

  const maxWidth = width - 2 * margin;
  const words = bodyText.split(" ");
  let line = "";
  const bodyLines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (helvetica.widthOfTextAtSize(test, 11) > maxWidth) {
      bodyLines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) bodyLines.push(line);
  for (const bl of bodyLines) {
    page.drawText(bl, {
      x: margin,
      y,
      font: helvetica,
      size: 11,
      color: black,
    });
    y -= lineHeight;
  }
  y -= lineHeight * 1.5;

  page.drawText(dateLine, {
    x: margin,
    y,
    font: helvetica,
    size: 11,
    color: black,
  });
  y -= lineHeight * 2.5;

  page.drawText("Arch.DI.Vera Korab", {
    x: margin,
    y,
    font: helveticaBold,
    size: 11,
    color: black,
  });

  const footerY = 20;
  page.drawLine({
    start: { x: margin, y: footerY + 6 },
    end: { x: width - margin, y: footerY + 6 },
    thickness: 0.3,
    color: muted,
  });
  page.drawText(`Bauwerksbuch - ${address}`, {
    x: margin,
    y: footerY,
    font: helvetica,
    size: 7,
    color: muted,
  });
  const pageLabel = "Seite 1 von 1";
  const labelWidth = helvetica.widthOfTextAtSize(pageLabel, 7);
  page.drawText(pageLabel, {
    x: width - margin - labelWidth,
    y: footerY,
    font: helvetica,
    size: 7,
    color: muted,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function generateBestaetigungBWB(project: any) {
  const address = cleanAddr(project.address || project.name || "");
  const dateStr = project.createdAt
    ? format(new Date(project.createdAt), "dd.MM.yyyy")
    : format(new Date(), "dd.MM.yyyy");
  const safeName = address
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\-]/g, "_")
    .replace(/_+/g, "_");
  await generateBestaetigungWithTemplate(
    address,
    "Ich bestätige hiermit, dass von mir für obige Liegenschaft ein Bauwerksbuch angelegt wurde.",
    `Datum der Erstellung :   ${dateStr}`,
    `Best.BWB_${safeName}.pdf`,
  );
}

async function generateBestaetigungEP(inspection: any, projectAddress: string) {
  const address = cleanAddr(projectAddress);
  const dateStr = format(new Date(inspection.date), "dd.MM.yyyy");
  const safeName = address
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\-]/g, "_")
    .replace(/_+/g, "_");
  await generateBestaetigungWithTemplate(
    address,
    "Ich bestätige hiermit, dass von mir für obige Liegenschaft eine Erstprüfung für das Bauwerksbuch durchgeführt wurde.",
    `Datum der Überprüfung :   ${dateStr}`,
    `Best.EP_${safeName}.pdf`,
  );
}

async function generateInspectionPdf(inspection: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await loadLogoDataUrl();
  } catch {}

  if (inspection.projectAddress) {
    inspection = {
      ...inspection,
      projectAddress: inspection.projectAddress
        .replace(/,?\s*[ÖO]sterreich\s*$/i, "")
        .replace(/,?\s*Austria\s*$/i, "")
        .trim(),
    };
  }

  function drawHeader() {
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", margin, 8, 65, 16);
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
    const footerAddress = inspection.projectAddress
      ? `Bauwerksbuch - ${inspection.projectAddress}`
      : "Bauwerksbuch";
    doc.text(footerAddress, margin, footerY);
    doc.text(
      `Seite ${pageNum} von ${totalPages}`,
      pageWidth - margin,
      footerY,
      { align: "right" },
    );
  }

  drawHeader();
  y = 33;

  const groberCount =
    inspection.defects?.filter((d: any) => d.status === "grober_mangel")
      .length || 0;
  const leichterCount =
    inspection.defects?.filter((d: any) => d.status === "leichter_mangel")
      .length || 0;
  const hasBauteilMangel = inspection.notes?.includes("- Mangel") || false;
  const effectiveStatus =
    groberCount > 0 || inspection.status === "urgent"
      ? "Schwerer Mangel"
      : leichterCount > 0 ||
          hasBauteilMangel ||
          inspection.status === "needs_repair"
        ? "Leichter Mangel"
        : "OK";

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.foreground);
  doc.text(
    `${inspTypeLabels[inspection.type] || "Prüfung"} - Überprüfung laut §128a der Bauordnung für Wien`,
    margin,
    y,
  );
  y += 9;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const details: [string, string][] = [
    ["Datum", format(new Date(inspection.date), "dd.MM.yyyy")],
    [
      "Adresse",
      inspection.projectAddress ||
        inspection.projectName ||
        `Projekt #${inspection.projectId}`,
    ],
  ];
  if (
    inspection.projectName &&
    inspection.projectName !== inspection.projectAddress
  )
    details.push(["Projekt", inspection.projectName]);
  if (inspection.engineer)
    details.push(["Sachverständiger", displayName(inspection.engineer)]);

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
  const statusColor =
    effectiveStatus === "OK"
      ? PDF_COLORS.ok
      : effectiveStatus === "Schwerer Mangel"
        ? PDF_COLORS.red
        : PDF_COLORS.amber;
  doc.setTextColor(...statusColor);
  doc.setFont("helvetica", "bold");
  doc.text(effectiveStatus, margin + 45, y);
  doc.setTextColor(...PDF_COLORS.foreground);
  y += 8;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.mutedFg);
  const hinweisText =
    "Weitere bei der Besichtigung gemachte Fotos und die Fotos der Mängel in Originalgröße sind dem zur Verfügung gestellten Ordner zu entnehmen.";
  const hinweisLines = doc.splitTextToSize(hinweisText, pageWidth - 2 * margin);
  doc.text(hinweisLines, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.foreground);
  y += hinweisLines.length * 4.5 + 6;

  const notes = inspection.notes || "";
  const userNotes = notes.includes("| Bauteilprüfung: ")
    ? notes.split("| Bauteilprüfung: ")[0].trim()
    : notes;
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
    const entries = bauteilPart
      .split("; ")
      .map((entry: string) => {
        const nameMatch = entry.match(/^\[(.+?)\]/);
        if (!nameMatch) return null;
        const name = nameMatch[1];
        const opt = BAUTEIL_OPTIONS.find((b) => b.label === name);
        const gegenstandMatch = entry.match(/Gegenstand: (.+?)(?:\s*-|$)/);
        return {
          name,
          ref: (opt as any)?.ref || "",
          level: opt?.level ?? 0,
          geprueft: entry.includes("geprüft"),
          mangel: entry.includes("Mangel"),
          gegenstand:
            gegenstandMatch?.[1]?.trim() ||
            (opt as any)?.defaultGegenstand ||
            "",
          vertieftePruefung: entry.includes("vertiefte Prüfung"),
          vertieftePruefungText: (() => {
            const m = entry.match(/vertiefte Prüfung: (.+)$/);
            return m ? m[1].trim() : "";
          })(),
        };
      })
      .filter(Boolean) as any[];

    if (entries.length > 0) {
      const headerNames = new Set<string>();
      for (let i = 0; i < BAUTEIL_OPTIONS.length; i++) {
        if (
          BAUTEIL_OPTIONS[i].level === 0 &&
          BAUTEIL_OPTIONS[i + 1]?.level === 1
        )
          headerNames.add(BAUTEIL_OPTIONS[i].label);
      }
      const entryMap = new Map(entries.map((e: any) => [e.name, e]));
      const displayEntries: any[] = [];
      for (const opt of BAUTEIL_OPTIONS) {
        if (headerNames.has(opt.label)) {
          const hasChild = BAUTEIL_OPTIONS.some(
            (o) => o.level === 1 && entryMap.has(o.label),
          );
          if (hasChild || entryMap.has(opt.label)) {
            displayEntries.push({
              name: opt.label,
              ref: "",
              level: 0,
              geprueft: false,
              mangel: false,
              gegenstand: "",
              vertieftePruefung: false,
              vertieftePruefungText: "",
              isHeader: true,
            });
          }
        } else if (entryMap.has(opt.label)) {
          displayEntries.push({ ...entryMap.get(opt.label), isHeader: false });
        }
      }
      const standardLabels = new Set(BAUTEIL_OPTIONS.map((o) => o.label));
      const customEntries = entries.filter(
        (e: any) => !standardLabels.has(e.name),
      );
      if (customEntries.length > 0) {
        displayEntries.push({
          name: "Sonderbauteile",
          ref: "",
          level: 0,
          geprueft: false,
          mangel: false,
          gegenstand: "",
          vertieftePruefung: false,
          vertieftePruefungText: "",
          isHeader: true,
        });
        for (const ce of customEntries)
          displayEntries.push({ ...ce, level: 1, isHeader: false });
      }

      if (y > 240) {
        doc.addPage();
        drawHeader();
        y = 33;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...PDF_COLORS.primary);
      doc.text("Bauteil Prüfung", margin, y);
      doc.setTextColor(...PDF_COLORS.foreground);
      y += 2;

      const pdfPrimary = (inspection.defects || []).filter(
        (d: any) => !d.parentDefectId,
      );
      const pdfFollowUps = (inspection.defects || []).filter(
        (d: any) => d.parentDefectId,
      );
      const defectsInOrder: any[] = [];

      for (const e of displayEntries) {
        if (!e.isHeader) {
          const bp = pdfPrimary.filter(
            (d: any) => d.bauteil?.at(-1) === e.name,
          );
          const orph = pdfFollowUps.filter(
            (f: any) =>
              f.bauteil?.at(-1) === e.name &&
              !pdfPrimary.some((p: any) => p.id === f.parentDefectId),
          );
          for (const defect of [...bp, ...orph]) {
            defectsInOrder.push(defect);
            for (const child of pdfFollowUps.filter(
              (f: any) => f.parentDefectId === defect.id,
            ))
              defectsInOrder.push(child);
          }
        }
      }

      const IMG_W = 80,
        IMG_H = 60,
        IMG_GAP = 4,
        IMGS_PER_ROW = 2,
        IMG_LABEL_H = 7;
      const defectImagesList: string[][] = [];
      const defectImageDims: { w: number; h: number }[][] = [];
      const compressImg = (
        src: string,
        maxW: number,
        maxH: number,
      ): Promise<{ data: string; w: number; h: number }> =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const natW = img.naturalWidth,
              natH = img.naturalHeight;
            const scale = Math.min(maxW / natW, maxH / natH, 1);
            const cw = Math.round(natW * scale),
              ch = Math.round(natH * scale);
            const canvas = document.createElement("canvas");
            canvas.width = cw;
            canvas.height = ch;
            canvas.getContext("2d")!.drawImage(img, 0, 0, cw, ch);
            resolve({
              data: canvas.toDataURL("image/jpeg", 0.75),
              w: natW,
              h: natH,
            });
          };
          img.onerror = () => resolve({ data: src, w: 4, h: 3 });
          img.src = src;
        });

      for (const defect of defectsInOrder) {
        const urls: string[] = defect.imageUrls?.length ? defect.imageUrls : (defect.imageUrl ? [defect.imageUrl] : []);
        const loaded: string[] = [];
        const dims: { w: number; h: number }[] = [];
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
        const landscapeCount = dims.filter(
          (d) => (d.w || 1) >= (d.h || 1),
        ).length;
        const portraitCount = dims.filter(
          (d) => (d.h || 1) > (d.w || 1),
        ).length;
        const landscapeRows =
          landscapeCount > 0 ? Math.ceil(landscapeCount / IMGS_PER_ROW) : 0;
        const portraitRows =
          portraitCount > 0 ? Math.ceil(portraitCount / IMGS_PER_ROW) : 0;
        return (
          (landscapeRows + portraitRows) * (IMG_H + IMG_GAP) + IMG_LABEL_H + 4
        );
      };

      const bauteilRows: any[] = [];
      const rowTypes: string[] = [];
      const rowToDefectIndex: Map<number, number> = new Map();
      let defCounter = 0;
      let groupNum = 0;

      for (const e of displayEntries) {
        if (e.isHeader) {
          groupNum++;
          bauteilRows.push([
            {
              content: `${groupNum}. ${e.name}`,
              colSpan: 6,
              styles: {
                fontStyle: "bold" as const,
                fillColor: PDF_COLORS.muted,
              },
            },
          ]);
          rowTypes.push("header");
        } else {
          bauteilRows.push([
            e.ref,
            e.name,
            e.gegenstand,
            e.geprueft ? "Ja" : "Nein",
            e.mangel ? "Ja" : "Nein",
            e.vertieftePruefung ? "Ja" : "Nein",
          ]);
          rowTypes.push(e.level === 1 ? "bauteil-child" : "bauteil");

          if (e.vertieftePruefung && e.vertieftePruefungText) {
            bauteilRows.push([
              {
                content: `Vertiefte Prüfung — ${e.name}: ${e.vertieftePruefungText}`,
                colSpan: 6,
              },
            ]);
            rowTypes.push("vp");
          }

          const bauteilPrimary = pdfPrimary.filter(
            (d: any) => d.bauteil?.at(-1) === e.name,
          );
          const orphaned = pdfFollowUps.filter(
            (f: any) =>
              f.bauteil?.at(-1) === e.name &&
              !pdfPrimary.some((p: any) => p.id === f.parentDefectId),
          );
          for (const defect of [...bauteilPrimary, ...orphaned]) {
            const di = defCounter++;
            const statusLabel =
              defect.status === "grober_mangel"
                ? "Schwerer Mangel"
                : "Leichter Mangel";
            let content = `${defect.defectId}   ${statusLabel}   ${format(new Date(defect.dateFound), "dd.MM.yyyy")}`;
            if (defect.description) content += `\n${defect.description}`;
            if (defect.location) content += `   |   Lage: ${defect.location}`;
            if (defect.frist)
              content += `   |   Frist: ${fristLabels[defect.frist] || defect.frist}`;
            if (defect.repairDue && defect.frist !== "umgehend")
              content += `   |   bis: ${format(new Date(defect.repairDue), "dd.MM.yyyy")}`;
            rowToDefectIndex.set(bauteilRows.length, di);
            bauteilRows.push([{ content, colSpan: 6 }]);
            rowTypes.push(
              defect.status === "grober_mangel"
                ? "defect-grober"
                : "defect-leichter",
            );
            for (const child of pdfFollowUps.filter(
              (f: any) => f.parentDefectId === defect.id,
            )) {
              const ci = defCounter++;
              const cl =
                child.status === "grober_mangel"
                  ? "Schwerer Mangel"
                  : "Leichter Mangel";
              let cc = `\u21B3 ${child.defectId}   ${cl}   ${format(new Date(child.dateFound), "dd.MM.yyyy")}`;
              if (child.description) cc += `\n${child.description}`;
              if (child.location) cc += `   |   Lage: ${child.location}`;
              if (child.frist)
                cc += `   |   Frist: ${fristLabels[child.frist] || child.frist}`;
              if (child.repairDue && child.frist !== "umgehend")
                cc += `   |   bis: ${format(new Date(child.repairDue), "dd.MM.yyyy")}`;
              rowToDefectIndex.set(bauteilRows.length, ci);
              bauteilRows.push([{ content: cc, colSpan: 6 }]);
              rowTypes.push(
                child.status === "grober_mangel"
                  ? "child-grober"
                  : "child-leichter",
              );
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

        if (si > 0) {
          doc.addPage();
          drawHeader();
          y = 33;
        }

        autoTable(doc, {
          startY: y,
          head: [
            [
              "Nr.",
              "Bauteil",
              "Gegenstand",
              "Geprüft",
              "Mangel",
              "Vertiefte Prüfung",
            ],
          ],
          body: segRows,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: PDF_COLORS.foreground,
          },
          headStyles: {
            fillColor: PDF_COLORS.primary,
            textColor: PDF_COLORS.white,
            fontStyle: "bold",
          },
          columnStyles: {
            3: { halign: "center" },
            4: { halign: "center" },
            5: { halign: "center" },
          },
          rowPageBreak: "avoid",
          didParseCell: (data: any) => {
            if (data.section !== "body") return;
            const rt = segTypes[data.row.index];
            if (rt === "bauteil-child" && data.column.index === 1)
              data.cell.styles.cellPadding = {
                top: 2.5,
                bottom: 2.5,
                right: 2.5,
                left: 6,
              };
            if (rt === "bauteil" || rt === "bauteil-child") {
              if (data.column.index === 3) {
                if (data.cell.raw === "Ja") {
                  data.cell.styles.textColor = PDF_COLORS.ok;
                  data.cell.styles.fontStyle = "bold";
                } else data.cell.styles.textColor = PDF_COLORS.mutedFg;
              }
              if (data.column.index === 4) {
                if (data.cell.raw === "Ja") {
                  data.cell.styles.textColor = PDF_COLORS.red;
                  data.cell.styles.fontStyle = "bold";
                } else data.cell.styles.textColor = PDF_COLORS.mutedFg;
              }
              if (data.column.index === 5) {
                if (
                  data.cell.raw === "Ja" ||
                  (typeof data.cell.raw === "string" &&
                    data.cell.raw.startsWith("Ja:"))
                ) {
                  data.cell.styles.textColor = PDF_COLORS.primary;
                  data.cell.styles.fontStyle = "bold";
                } else data.cell.styles.textColor = PDF_COLORS.mutedFg;
              }
            }
            if (rt === "vp") {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [37, 99, 235];
              data.cell.styles.cellPadding = {
                top: 2,
                bottom: 2,
                left: 8,
                right: 2,
              };
              data.cell.styles.fontStyle = "italic";
            }
            if (rt === "defect-grober") {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.cellPadding = {
                top: 2.5,
                bottom: 2.5,
                left: 8,
                right: 2.5,
              };
            }
            if (rt === "defect-leichter") {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.cellPadding = {
                top: 2.5,
                bottom: 2.5,
                left: 8,
                right: 2.5,
              };
            }
            if (rt === "child-grober") {
              data.cell.styles.fillColor = [255, 237, 237];
              data.cell.styles.cellPadding = {
                top: 2,
                bottom: 2,
                left: 14,
                right: 2.5,
              };
              data.cell.styles.fontSize = 7.5;
            }
            if (rt === "child-leichter") {
              data.cell.styles.fillColor = [255, 250, 225];
              data.cell.styles.cellPadding = {
                top: 2,
                bottom: 2,
                left: 14,
                right: 2.5,
              };
              data.cell.styles.fontSize = 7.5;
            }
            if (
              (rt === "defect-grober" ||
                rt === "defect-leichter" ||
                rt === "child-grober" ||
                rt === "child-leichter") &&
              data.column.index === 0
            ) {
              const di = rowToDefectIndex.get(segStart + data.row.index);
              if (di !== undefined && (defectImagesList[di] || []).length > 0) {
                const imgBlockH = getImgBlockH(di);
                const isChild =
                  rt === "child-grober" || rt === "child-leichter";
                const padLeft = isChild ? 14 : 8;
                const usableWidth = pageWidth - 2 * margin - padLeft - 2.5;
                const fs = isChild ? 7.5 : 8;
                data.doc.setFontSize(fs);
                const rawContent = String(
                  (segRows[data.row.index][0] as any).content || "",
                );
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
            if (
              (rt === "defect-grober" ||
                rt === "defect-leichter" ||
                rt === "child-grober" ||
                rt === "child-leichter") &&
              data.column.index === 0
            ) {
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
              doc.text(
                `Fotos: ${defectsInOrder[di].defectId}`,
                sx,
                imgStartY + IMG_LABEL_H - 2,
              );
              const imgDims = defectImageDims[di] || [];
              const landscape: {
                img: string;
                dim: { w: number; h: number };
              }[] = [];
              const portrait: { img: string; dim: { w: number; h: number } }[] =
                [];
              for (let ii = 0; ii < imgList.length; ii++) {
                const dim = imgDims[ii] || { w: 4, h: 3 };
                (dim.h > dim.w ? portrait : landscape).push({
                  img: imgList[ii],
                  dim,
                });
              }
              const drawGroup = (
                group: { img: string; dim: { w: number; h: number } }[],
                startY: number,
              ) => {
                group.forEach(({ img, dim }, ii) => {
                  const col = ii % IMGS_PER_ROW;
                  const row = Math.floor(ii / IMGS_PER_ROW);
                  const ratio = dim.w / (dim.h || 1);
                  let drawW = IMG_W,
                    drawH = IMG_W / ratio;
                  if (drawH > IMG_H) {
                    drawH = IMG_H;
                    drawW = IMG_H * ratio;
                  }
                  const cellX = sx + col * (IMG_W + IMG_GAP);
                  const cellY = startY + row * (IMG_H + IMG_GAP);
                  doc.addImage(
                    img,
                    "JPEG",
                    cellX + (IMG_W - drawW) / 2,
                    cellY + (IMG_H - drawH) / 2,
                    drawW,
                    drawH,
                  );
                });
              };
              let rowY = imgStartY + IMG_LABEL_H;
              if (landscape.length) {
                drawGroup(landscape, rowY);
                rowY +=
                  Math.ceil(landscape.length / IMGS_PER_ROW) *
                  (IMG_H + IMG_GAP);
              }
              if (portrait.length) {
                drawGroup(portrait, rowY);
              }
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

  const addressForFilename = (
    inspection.projectAddress ||
    inspection.projectName ||
    `Projekt_${inspection.projectId}`
  )
    .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "_")
    .trim();
  doc.save(
    `BWB Prüfbericht ${addressForFilename} ${new Date().getFullYear()}.pdf`,
  );
}

const BAUTEIL_OPTIONS_SIMPLE = [
  "Dach",
  "Fassade/Gesimse",
  "Decken",
  "Treppen",
  "Wände",
] as const;

const BAUTEIL_OPTIONS = [
  { label: "Fassade/Gesimse", level: 0 },
  {
    label: "Verputz",
    level: 1,
    ref: "1.1",
    defaultGegenstand: "Risse, lose Teile, Hohlstellen, Abplatzungen",
  },
  {
    label: "Gesimse",
    level: 1,
    ref: "1.2",
    defaultGegenstand: "Risse, lose Teile, Hohlstellen, Abplatzungen",
  },
  {
    label: "Fenster",
    level: 1,
    ref: "1.3",
    defaultGegenstand:
      "Verformungen, Sprünge, Verglasungen, Rahmen, Absturzsicherung",
  },
  {
    label: "Sonderbauteile",
    level: 1,
    ref: "1.4",
    defaultGegenstand: "z.B. Befestigungen von SAT-Anlagen",
  },
  { label: "Dach", level: 0 },
  { label: "Konstruktion", level: 1, ref: "2.1", defaultGegenstand: "Zustand" },
  {
    label: "Eindeckung, Schneefangeinrichtung",
    level: 1,
    ref: "2.2",
    defaultGegenstand: "lose Teile, Fehlstellen",
  },
  {
    label: "Saum-, Hängerinnen",
    level: 1,
    ref: "2.3",
    defaultGegenstand: "lose Teile, Fehlstellen",
  },
  {
    label: "Kamin-, Lüftungsköpfe",
    level: 1,
    ref: "2.4",
    defaultGegenstand: "Standsicherheit",
  },
  { label: "Decken/Treppen", level: 0 },
  {
    label: "Konstruktion (Decken)",
    level: 1,
    ref: "3.1",
    defaultGegenstand: "Zustand",
  },
  {
    label: "Treppen, Außentreppen, Rampen, sonst. Rettungswege",
    level: 1,
    ref: "3.2",
    defaultGegenstand: "Zustand (Risse, Schäden an Stufen)",
  },
  {
    label: "Geländer, Absturzsicherungen",
    level: 1,
    ref: "3.3",
    defaultGegenstand: "Befestigungen, Handlauf, Füllung, Steher",
  },
  { label: "Sonderbauteile (Decken/Treppen)", level: 1, ref: "3.4" },
  { label: "Wände", level: 0 },
  {
    label: "Konstruktion (Wände)",
    level: 1,
    ref: "4.1",
    defaultGegenstand: "Zustand",
  },
  {
    label: "Wände Brandabschnitte",
    level: 1,
    ref: "4.2",
    defaultGegenstand: "Zustand (Leichtbauwand, Rohrdurchführungen)",
  },
  {
    label: "Türen und sonst. Öffnungen Brandabschnitte",
    level: 1,
    ref: "4.3",
    defaultGegenstand: "Funktionskontrolle",
  },
  { label: "Sonderbauteile (Wände)", level: 1, ref: "4.4" },
];

function getParentBauteil(label: string): string | null {
  const idx = BAUTEIL_OPTIONS.findIndex((b) => b.label === label);
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

async function rotateImageFile(src: string | File): Promise<File> {
  const blob =
    src instanceof File
      ? src
      : await fetch(src, { credentials: "include" }).then((r) => r.blob());
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
    canvas.toBlob(
      (b) => resolve(new File([b!], "rotated.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.92,
    );
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
  onUpdateMangel: (
    bauteilIndex: number,
    mangelIndex: number,
    field: keyof BauteilMangel,
    value: string,
  ) => void;
  onAddMangelImages: (
    bauteilIndex: number,
    mangelIndex: number,
    files: File[],
  ) => void;
  onRemoveMangelFile: (
    bauteilIndex: number,
    mangelIndex: number,
    fileIndex: number,
  ) => void;
  onRemoveMangelUrl: (
    bauteilIndex: number,
    mangelIndex: number,
    url: string,
  ) => void;
  onRotateMangelFile: (
    bauteilIndex: number,
    mangelIndex: number,
    fileIndex: number,
  ) => void;
  onRotateMangelUrl: (
    bauteilIndex: number,
    mangelIndex: number,
    url: string,
  ) => void;
  onRemoveMangel: (bauteilIndex: number, mangelIndex: number) => void;
}

function BauteilRow({
  bp,
  index,
  isDefault,
  isHeader,
  onUpdate,
  onRemove,
  onAddMangel,
  onUpdateMangel,
  onAddMangelImages,
  onRemoveMangelFile,
  onRemoveMangelUrl,
  onRotateMangelFile,
  onRotateMangelUrl,
  onRemoveMangel,
}: BauteilRowProps) {
  const [expanded, setExpanded] = useState(bp.maengel.length > 0);
  const hasMaengel = bp.maengel.length > 0;
  const prevLenRef = useRef(bp.maengel.length);
  useEffect(() => {
    if (bp.maengel.length > prevLenRef.current) setExpanded(true);
    prevLenRef.current = bp.maengel.length;
  }, [bp.maengel.length]);

  return (
    <>
      <tr
        className={`border-b border-border hover:bg-muted/20 transition-colors ${bp.level > 0 ? "bg-muted/5" : ""}`}
        data-testid={`bauteil-row-${index}`}
      >
        <td className="px-2 py-2.5 w-[45px]">
          {bp.refNr ? (
            <span className="text-xs font-mono text-muted-foreground">
              {bp.refNr}
            </span>
          ) : null}
        </td>
        <td className="px-3 py-2.5">
          <div
            className="flex items-center gap-1.5"
            style={{
              paddingLeft: bp.level > 0 ? `${bp.level * 8}px` : undefined,
            }}
          >
            {isDefault || isHeader ? (
              <span
                className={
                  bp.level > 0
                    ? "text-sm text-muted-foreground"
                    : "font-medium text-foreground"
                }
              >
                {bp.bauteil}
              </span>
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
                {expanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
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
              <Input
                value={bp.artDesMangels}
                onChange={(e) =>
                  onUpdate(index, "artDesMangels", e.target.value)
                }
                placeholder="Gegenstand..."
                className="h-8 text-sm bg-background border-border"
                data-testid={`input-art-mangel-${index}`}
              />
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center">
                <Checkbox
                  checked={bp.geprueft}
                  onCheckedChange={(checked) =>
                    onUpdate(index, "geprueft", !!checked)
                  }
                  data-testid={`checkbox-geprueft-${index}`}
                />
              </div>
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center">
                <Checkbox
                  checked={bp.mangel}
                  onCheckedChange={(checked) =>
                    onUpdate(index, "mangel", !!checked)
                  }
                  data-testid={`checkbox-mangel-${index}`}
                />
              </div>
            </td>
            <td className="px-3 py-2.5 text-center">
              <div className="flex justify-center">
                <Checkbox
                  checked={bp.vertieftePruefung}
                  onCheckedChange={(checked) =>
                    onUpdate(index, "vertieftePruefung", !!checked)
                  }
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(index)}
                    data-testid={`button-remove-bauteil-${index}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </td>
          </>
        )}
      </tr>
      {bp.vertieftePruefung && (
        <tr
          className="border-b border-border bg-blue-50/20 dark:bg-blue-900/10"
          data-testid={`vertiefte-pruefung-row-${index}`}
        >
          <td colSpan={7} className="px-3 py-3">
            <div className="ml-4 border-l-2 border-blue-500/40 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Vertiefte Prüfung — {bp.bauteil || "Bauteil"}
                </span>
              </div>
              <Input
                value={bp.vertieftePruefungText || ""}
                onChange={(e) =>
                  onUpdate(index, "vertieftePruefungText", e.target.value)
                }
                placeholder="Beschreibung der vertieften Prüfung..."
                className="h-8 text-sm bg-background border-border"
                data-testid={`input-vertiefte-pruefung-${index}`}
              />
            </div>
          </td>
        </tr>
      )}
      {hasMaengel &&
        expanded &&
        bp.maengel.map((m, mi) => (
          <tr
            key={`mangel-${index}-${mi}`}
            className="border-b border-border bg-muted/10"
            data-testid={`mangel-row-${index}-${mi}`}
          >
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
                      onChange={(e) =>
                        onUpdateMangel(index, mi, "defectId", e.target.value)
                      }
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
                      onChange={(e) =>
                        onUpdateMangel(index, mi, "dateFound", e.target.value)
                      }
                      className="h-8 text-sm mt-1"
                      data-testid={`input-mangel-date-${index}-${mi}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Beschreibung *</Label>
                    <Input
                      value={m.description}
                      onChange={(e) =>
                        onUpdateMangel(index, mi, "description", e.target.value)
                      }
                      placeholder="Beschreibung des Mangels..."
                      className="h-8 text-sm mt-1"
                      data-testid={`input-mangel-desc-${index}-${mi}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Ort *</Label>
                    <Input
                      value={m.location}
                      onChange={(e) =>
                        onUpdateMangel(index, mi, "location", e.target.value)
                      }
                      placeholder="z.B. 2. OG links"
                      className="h-8 text-sm mt-1"
                      data-testid={`input-mangel-location-${index}-${mi}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={m.status}
                      onValueChange={(v) =>
                        onUpdateMangel(index, mi, "status", v)
                      }
                    >
                      <SelectTrigger
                        className="h-8 text-sm mt-1"
                        data-testid={`select-mangel-status-${index}-${mi}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leichter_mangel">
                          Leichter Mangel
                        </SelectItem>
                        <SelectItem value="grober_mangel">
                          Schwerer Mangel
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Frist</Label>
                    <Select
                      value={m.frist}
                      onValueChange={(v) =>
                        onUpdateMangel(index, mi, "frist", v)
                      }
                    >
                      <SelectTrigger
                        className="h-8 text-sm mt-1"
                        data-testid={`select-mangel-frist-${index}-${mi}`}
                      >
                        <SelectValue placeholder="Keine" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(fristLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
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
                      <label
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors text-xs"
                        data-testid={`button-add-mangel-image-${index}-${mi}`}
                      >
                        <ImagePlus className="w-4 h-4" />
                        Foto hinzufügen
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length)
                              onAddMangelImages(index, mi, files);
                          }}
                        />
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

function calcRepairDue(dateFound: string, frist: string): string {
  if (!dateFound || !frist || frist === "kein_handlungsbedarf") return "";
  const d = new Date(dateFound);
  switch (frist) {
    case "umgehend":
      break;
    case "6_monate":
      d.setMonth(d.getMonth() + 6);
      break;
    case "1_jahr":
      d.setFullYear(d.getFullYear() + 1);
      break;
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
  const [deleteInspectionId, setDeleteInspectionId] = useState<number | null>(
    null,
  );
  const [bauaktSearch, setBauaktSearch] = useState("");

  const isAdmin = profile?.role === "admin";
  const epInspection = inspections?.find(
    (ins: any) => !ins.type || ins.type === "erstpruefung",
  );

  const [defectEntries, setDefectEntries] = useState<DefectEntry[]>([]);
  const [editInspDialogOpen, setEditInspDialogOpen] = useState(false);
  const [expandedInspId, setExpandedInspId] = useState<number | null>(null);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [editDefectEntries, setEditDefectEntries] = useState<
    (DefectEntry & { existingId?: number })[]
  >([]);
  const [editInspSubmitting, setEditInspSubmitting] = useState(false);
  const [deletedDefectIds, setDeletedDefectIds] = useState<number[]>([]);
  const [editBauteilPruefungen, setEditBauteilPruefungen] = useState<
    BauteilPruefung[]
  >([]);

  const [bauteilPruefungen, setBauteilPruefungen] = useState<BauteilPruefung[]>(
    BAUTEIL_OPTIONS.map((b) => ({
      bauteil: b.label,
      level: b.level,
      refNr: (b as any).ref || "",
      artDesMangels: (b as any).defaultGegenstand || "",
      geprueft: !b.label.startsWith("Sonderbauteil"),
      mangel: false,
      vertieftePruefung: false,
      vertieftePruefungText: "",
      maengel: [],
    })),
  );

  const updateBauteilPruefung = (
    index: number,
    field: keyof BauteilPruefung,
    value: any,
  ) => {
    setBauteilPruefungen((prev) =>
      prev.map((bp, i) => (i === index ? { ...bp, [field]: value } : bp)),
    );
  };

  const addBauteilPruefung = () => {
    setBauteilPruefungen((prev) => {
      const hasSonderbauteileHeader = prev.some(
        (b) => b.bauteil === "Sonderbauteile" && b.level === 0,
      );
      const customCount = prev.filter((b) => b.refNr.startsWith("5.")).length;
      const nextRef = `5.${customCount + 1}`;
      const newChild = {
        bauteil: "",
        level: 1,
        refNr: nextRef,
        artDesMangels: "",
        geprueft: false,
        mangel: false,
        vertieftePruefung: false,
        vertieftePruefungText: "",
        maengel: [],
      };
      if (!hasSonderbauteileHeader) {
        const header = {
          bauteil: "Sonderbauteile",
          level: 0,
          refNr: "",
          artDesMangels: "",
          geprueft: false,
          mangel: false,
          vertieftePruefung: false,
          vertieftePruefungText: "",
          maengel: [],
        };
        return [...prev, header, newChild];
      }
      return [...prev, newChild];
    });
  };

  const addBauteilMangel = (bauteilIndex: number) => {
    setBauteilPruefungen((prev) => {
      const updated = [...prev];
      updated[bauteilIndex] = {
        ...updated[bauteilIndex],
        mangel: true,
        maengel: [
          ...updated[bauteilIndex].maengel,
          {
            defectId: "",
            description: "",
            location: "",
            status: "leichter_mangel",
            dateFound: "",
            frist: "1_jahr",
            repairDue: "",
            imageFiles: [],
            imageUrls: [],
          },
        ],
      };
      return updated;
    });
  };

  const updateBauteilMangel = (
    bauteilIndex: number,
    mangelIndex: number,
    field: keyof BauteilMangel,
    value: string,
  ) => {
    setBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
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
      }),
    );
  };

  const addBauteilMangelImages = (
    bauteilIndex: number,
    mangelIndex: number,
    files: File[],
  ) => {
    setBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const maengel = bp.maengel.map((m, mi) =>
          mi === mangelIndex
            ? { ...m, imageFiles: [...(m.imageFiles || []), ...files] }
            : m,
        );
        return { ...bp, maengel };
      }),
    );
  };

  const removeBauteilMangelFile = (
    bauteilIndex: number,
    mangelIndex: number,
    fileIndex: number,
  ) => {
    setBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const maengel = bp.maengel.map((m, mi) =>
          mi === mangelIndex
            ? {
                ...m,
                imageFiles: (m.imageFiles || []).filter(
                  (_, i) => i !== fileIndex,
                ),
              }
            : m,
        );
        return { ...bp, maengel };
      }),
    );
  };

  const removeBauteilMangelUrl = (
    bauteilIndex: number,
    mangelIndex: number,
    url: string,
  ) => {
    setBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const maengel = bp.maengel.map((m, mi) =>
          mi === mangelIndex
            ? { ...m, imageUrls: (m.imageUrls || []).filter((u) => u !== url) }
            : m,
        );
        return { ...bp, maengel };
      }),
    );
  };

  const rotateBauteilMangelFile = async (
    bauteilIndex: number,
    mangelIndex: number,
    fileIndex: number,
  ) => {
    const file =
      bauteilPruefungen[bauteilIndex]?.maengel[mangelIndex]?.imageFiles?.[
        fileIndex
      ];
    if (!file) return;
    const rotated = await rotateImageFile(file);
    setBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const updated = bp.maengel.map((m, mi) => {
          if (mi !== mangelIndex) return m;
          const files = [...(m.imageFiles || [])];
          files[fileIndex] = rotated;
          return { ...m, imageFiles: files };
        });
        return { ...bp, maengel: updated };
      }),
    );
  };

  const rotateBauteilMangelUrl = async (
    bauteilIndex: number,
    mangelIndex: number,
    url: string,
  ) => {
    const rotated = await rotateImageFile(url);
    setBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const updated = bp.maengel.map((m, mi) => {
          if (mi !== mangelIndex) return m;
          return {
            ...m,
            imageUrls: (m.imageUrls || []).filter((u) => u !== url),
            imageFiles: [...(m.imageFiles || []), rotated],
          };
        });
        return { ...bp, maengel: updated };
      }),
    );
  };

  const removeBauteilMangel = (bauteilIndex: number, mangelIndex: number) => {
    setBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const maengel = bp.maengel.filter((_, mi) => mi !== mangelIndex);
        return {
          ...bp,
          maengel,
          mangel: maengel.length > 0 ? bp.mangel : false,
        };
      }),
    );
  };

  const removeBauteilPruefung = (index: number) => {
    setBauteilPruefungen((prev) => prev.filter((_, i) => i !== index));
  };

  const resetBauteilPruefungen = () => {
    setBauteilPruefungen(
      BAUTEIL_OPTIONS.map((b) => ({
        bauteil: b.label,
        level: b.level,
        refNr: (b as any).ref || "",
        artDesMangels: (b as any).defaultGegenstand || "",
        geprueft: !b.label.startsWith("Sonderbauteil"),
        mangel: false,
        vertieftePruefung: false,
        vertieftePruefungText: "",
        maengel: [],
      })),
    );
  };

  const addDefectEntry = () => {
    setDefectEntries((prev) => [
      ...prev,
      {
        defectId: "",
        bauteil: [],
        dateFound: "",
        description: "",
        location: "",
        status: "leichter_mangel",
        frist: "1_jahr",
        repairDue: "",
      },
    ]);
  };

  const updateDefectEntry = (
    index: number,
    field: keyof DefectEntry,
    value: string,
  ) => {
    setDefectEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const updated = { ...entry, [field]: value };
        if (field === "frist" || field === "dateFound") {
          const df = field === "dateFound" ? value : updated.dateFound;
          const fr = field === "frist" ? value : updated.frist;
          updated.repairDue = calcRepairDue(df, fr);
        }
        return updated;
      }),
    );
  };

  const removeDefectEntry = (index: number) => {
    setDefectEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const [docFiles, setDocFiles] = useState<File[]>([]);
  const {
    register: docReg,
    handleSubmit: handleDocSubmit,
    reset: resetDocForm,
  } = useForm({
    defaultValues: { name: "" },
  });

  const onDocSubmit = (data: any) => {
    if (docFiles.length === 0) return;
    const formData = new FormData();
    docFiles.forEach((f) => formData.append("file", f));
    if (docFiles.length === 1 && data.name) {
      formData.append("name", data.name);
    }
    createDocument.mutate(
      { projectId, formData },
      {
        onSuccess: () => {
          setDocDialogOpen(false);
          setDocFiles([]);
          resetDocForm();
        },
      },
    );
  };

  const {
    register: inspReg,
    handleSubmit: handleInspSubmit,
    setValue: setInspValue,
    reset: resetInspForm,
    watch: watchInsp,
  } = useForm({
    defaultValues: {
      date: "",
      status: "OK",
      type: "erstpruefung",
      notes: "",
      engineerId: "",
    },
  });
  const newInspEngineerId = watchInsp("engineerId");

  const [inspSubmitting, setInspSubmitting] = useState(false);

  const onInspSubmit = async (data: any) => {
    setInspSubmitting(true);
    try {
      const bauteilNotes = bauteilPruefungen
        .filter((bp) => bp.geprueft || bp.mangel || bp.vertieftePruefung)
        .map((bp) => {
          const parts = [`[${bp.bauteil}]`];
          if (bp.artDesMangels) parts.push(`Gegenstand: ${bp.artDesMangels}`);
          if (bp.geprueft) parts.push("geprüft");
          if (bp.mangel) parts.push("Mangel");
          if (bp.vertieftePruefung)
            parts.push(
              bp.vertieftePruefungText
                ? `vertiefte Prüfung: ${bp.vertieftePruefungText}`
                : "vertiefte Prüfung erforderlich",
            );
          return parts.join(" - ");
        })
        .join("; ");

      const fullNotes = bauteilNotes
        ? `${data.notes || ""} | Bauteilprüfung: ${bauteilNotes}`.trim()
        : data.notes || "";

      const hasGroberMangel = bauteilPruefungen.some((bp) =>
        bp.maengel.some((m) => m.status === "grober_mangel"),
      );
      const hasMangel = bauteilPruefungen.some(
        (bp) => bp.mangel || bp.maengel.length > 0,
      );
      const autoStatus = hasGroberMangel
        ? "urgent"
        : hasMangel
          ? "needs_repair"
          : data.status;

      const inspection = await createInspection.mutateAsync({
        projectId,
        data: {
          projectId,
          engineerId: data.engineerId || profile!.userId,
          date: new Date(data.date),
          status: autoStatus,
          type: data.type,
          notes: fullNotes || null,
        },
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
              bauteil: getParentBauteil(bp.bauteil)
                ? [getParentBauteil(bp.bauteil)!, bp.bauteil]
                : [bp.bauteil],
              dateFound: new Date(m.dateFound),
              description: m.description || bp.bauteil,
              location: m.location || "–",
              status: m.status as "leichter_mangel" | "grober_mangel",
              frist: (m.frist || null) as any,
              repairDue: m.repairDue ? new Date(m.repairDue) : null,
            },
          });
          if (defect?.id && m.imageFiles?.length) {
            for (const imgFile of m.imageFiles) {
              const formData = new FormData();
              formData.append("image", imgFile);
              await fetch(`/api/defects/${defect.id}/image`, {
                method: "POST",
                body: formData,
                credentials: "include",
              });
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects/:projectId/inspections", projectId],
      });
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

  const updateEditBauteilPruefung = (
    index: number,
    field: keyof BauteilPruefung,
    value: any,
  ) => {
    setEditBauteilPruefungen((prev) =>
      prev.map((bp, i) => (i === index ? { ...bp, [field]: value } : bp)),
    );
  };

  const addEditCustomBauteil = () => {
    setEditBauteilPruefungen((prev) => {
      const hasSonderbauteileHeader = prev.some(
        (b) => b.bauteil === "Sonderbauteile" && b.level === 0,
      );
      const customCount = prev.filter((b) => b.refNr.startsWith("5.")).length;
      const nextRef = `5.${customCount + 1}`;
      const newChild = {
        bauteil: "",
        level: 1,
        refNr: nextRef,
        artDesMangels: "",
        geprueft: false,
        mangel: false,
        vertieftePruefung: false,
        vertieftePruefungText: "",
        maengel: [],
      };
      if (!hasSonderbauteileHeader) {
        const header = {
          bauteil: "Sonderbauteile",
          level: 0,
          refNr: "",
          artDesMangels: "",
          geprueft: false,
          mangel: false,
          vertieftePruefung: false,
          vertieftePruefungText: "",
          maengel: [],
        };
        return [...prev, header, newChild];
      }
      return [...prev, newChild];
    });
  };

  const removeEditBauteilPruefung = (index: number) => {
    setEditBauteilPruefungen((prev) => prev.filter((_, i) => i !== index));
  };

  const addEditMangelToBauteil = (bauteilIndex: number) => {
    setEditBauteilPruefungen((prev) => {
      const bp = prev[bauteilIndex];
      const opt = BAUTEIL_OPTIONS.find((o) => o.label === bp.bauteil);
      const ref = opt?.ref || "";
      const nextNum = bp.maengel.length + 1;
      const autoId = ref ? `M ${ref}.${nextNum}` : `M-${nextNum}`;
      const inspDate =
        watchEditInsp("date") || new Date().toISOString().split("T")[0];
      return prev.map((b, i) =>
        i === bauteilIndex
          ? {
              ...b,
              mangel: true,
              maengel: [
                ...b.maengel,
                {
                  defectId: autoId,
                  description: "",
                  location: "",
                  status: "leichter_mangel",
                  dateFound: inspDate,
                  frist: "1_jahr",
                  repairDue: "",
                  imageFiles: [],
                  imageUrls: [],
                },
              ],
            }
          : b,
      );
    });
  };

  const updateEditMangel = (
    bauteilIndex: number,
    mangelIndex: number,
    field: keyof BauteilMangel,
    value: string,
  ) => {
    setEditBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const updated = bp.maengel.map((m, mi) => {
          if (mi !== mangelIndex) return m;
          const newM = { ...m, [field]: value };
          if (field === "dateFound" || field === "frist") {
            newM.repairDue = calcRepairDue(
              field === "dateFound" ? value : m.dateFound,
              field === "frist" ? value : m.frist,
            );
          }
          return newM;
        });
        return { ...bp, maengel: updated };
      }),
    );
  };

  const removeEditMangel = (bauteilIndex: number, mangelIndex: number) => {
    setEditBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const newMaengel = bp.maengel.filter((_, mi) => mi !== mangelIndex);
        return { ...bp, maengel: newMaengel, mangel: newMaengel.length > 0 };
      }),
    );
  };

  const addEditMangelImages = (
    bauteilIndex: number,
    mangelIndex: number,
    files: File[],
  ) => {
    setEditBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const updated = bp.maengel.map((m, mi) =>
          mi === mangelIndex
            ? { ...m, imageFiles: [...(m.imageFiles || []), ...files] }
            : m,
        );
        return { ...bp, maengel: updated };
      }),
    );
  };

  const removeEditMangelFile = (
    bauteilIndex: number,
    mangelIndex: number,
    fileIndex: number,
  ) => {
    setEditBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const updated = bp.maengel.map((m, mi) =>
          mi === mangelIndex
            ? {
                ...m,
                imageFiles: (m.imageFiles || []).filter(
                  (_, i) => i !== fileIndex,
                ),
              }
            : m,
        );
        return { ...bp, maengel: updated };
      }),
    );
  };

  const removeEditMangelUrl = (
    bauteilIndex: number,
    mangelIndex: number,
    url: string,
  ) => {
    setEditBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const updated = bp.maengel.map((m, mi) =>
          mi === mangelIndex
            ? { ...m, imageUrls: (m.imageUrls || []).filter((u) => u !== url) }
            : m,
        );
        return { ...bp, maengel: updated };
      }),
    );
  };

  const rotateEditMangelFile = async (
    bauteilIndex: number,
    mangelIndex: number,
    fileIndex: number,
  ) => {
    const file =
      editBauteilPruefungen[bauteilIndex]?.maengel[mangelIndex]?.imageFiles?.[
        fileIndex
      ];
    if (!file) return;
    const rotated = await rotateImageFile(file);
    setEditBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const updated = bp.maengel.map((m, mi) => {
          if (mi !== mangelIndex) return m;
          const files = [...(m.imageFiles || [])];
          files[fileIndex] = rotated;
          return { ...m, imageFiles: files };
        });
        return { ...bp, maengel: updated };
      }),
    );
  };

  const rotateEditMangelUrl = async (
    bauteilIndex: number,
    mangelIndex: number,
    url: string,
  ) => {
    const rotated = await rotateImageFile(url);
    setEditBauteilPruefungen((prev) =>
      prev.map((bp, bi) => {
        if (bi !== bauteilIndex) return bp;
        const updated = bp.maengel.map((m, mi) => {
          if (mi !== mangelIndex) return m;
          return {
            ...m,
            imageUrls: (m.imageUrls || []).filter((u) => u !== url),
            imageFiles: [...(m.imageFiles || []), rotated],
          };
        });
        return { ...bp, maengel: updated };
      }),
    );
  };

  const buildEditBauteilState = (ins: any): BauteilPruefung[] => {
    const base: BauteilPruefung[] = BAUTEIL_OPTIONS.map((b) => ({
      bauteil: b.label,
      level: b.level,
      refNr: (b as any).ref || "",
      artDesMangels: (b as any).defaultGegenstand || "",
      geprueft: false,
      mangel: false,
      vertieftePruefung: false,
      vertieftePruefungText: "",
      maengel: [] as BauteilMangel[],
    }));
    let customCounter = 1;
    const getOrCreate = (name: string): BauteilPruefung => {
      let bp = base.find((b) => b.bauteil === name);
      if (!bp) {
        if (
          !base.some((b) => b.bauteil === "Sonderbauteile" && b.level === 0)
        ) {
          base.push({
            bauteil: "Sonderbauteile",
            level: 0,
            refNr: "",
            artDesMangels: "",
            geprueft: false,
            mangel: false,
            vertieftePruefung: false,
            vertieftePruefungText: "",
            maengel: [],
          });
        }
        bp = {
          bauteil: name,
          level: 1,
          refNr: `5.${customCounter++}`,
          artDesMangels: "",
          geprueft: false,
          mangel: false,
          vertieftePruefung: false,
          vertieftePruefungText: "",
          maengel: [],
        };
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
        const knownEntry = BAUTEIL_OPTIONS.find((b) => b.label === name);
        const bp = knownEntry
          ? base.find((b) => b.bauteil === name)
          : getOrCreate(name);
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
      const knownEntry = BAUTEIL_OPTIONS.find((b) => b.label === targetName);
      const bp = knownEntry
        ? base.find((b) => b.bauteil === targetName)
        : getOrCreate(targetName);
      if (!bp) continue;
      bp.mangel = true;
      const existingUrls: string[] = d.imageUrls?.length
        ? d.imageUrls
        : d.imageUrl
          ? [d.imageUrl]
          : [];
      bp.maengel.push({
        defectId: d.defectId || "",
        description: d.description || "",
        location: d.location || "",
        status: d.status || "leichter_mangel",
        dateFound: d.dateFound
          ? format(new Date(d.dateFound), "yyyy-MM-dd")
          : "",
        frist: d.frist || "",
        repairDue: d.repairDue
          ? format(new Date(d.repairDue), "yyyy-MM-dd")
          : "",
        imageFiles: [],
        imageUrls: existingUrls,
        existingDefectId: d.id,
      });
    }
    return base;
  };

  const openEditInspection = (ins: any) => {
    setEditingInspection(ins);
    const userNotes = ins.notes?.includes("| Bauteilprüfung: ")
      ? ins.notes.split("| Bauteilprüfung: ")[0].trim()
      : ins.notes || "";
    resetEditInspForm({
      date: ins.date ? format(new Date(ins.date), "yyyy-MM-dd") : "",
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

  const {
    register: editInspReg,
    handleSubmit: handleEditInspSubmit,
    setValue: setEditInspValue,
    reset: resetEditInspForm,
    watch: watchEditInsp,
  } = useForm({
    defaultValues: {
      date: "",
      status: "OK",
      type: "erstpruefung",
      notes: "",
      engineerId: "",
    },
  });
  const editInspType = watchEditInsp("type");
  const editInspStatus = watchEditInsp("status");
  const editInspEngineerId = watchEditInsp("engineerId");

  const onEditInspSubmit = async (data: any) => {
    if (!editingInspection) return;
    setEditInspSubmitting(true);
    try {
      const bauteilNotes = editBauteilPruefungen
        .filter((bp) => bp.geprueft || bp.mangel || bp.vertieftePruefung)
        .map((bp) => {
          const parts = [`[${bp.bauteil}]`];
          if (bp.artDesMangels) parts.push(`Gegenstand: ${bp.artDesMangels}`);
          if (bp.geprueft) parts.push("geprüft");
          if (bp.mangel) parts.push("Mangel");
          if (bp.vertieftePruefung)
            parts.push(
              bp.vertieftePruefungText
                ? `vertiefte Prüfung: ${bp.vertieftePruefungText}`
                : "vertiefte Prüfung erforderlich",
            );
          return parts.join(" - ");
        })
        .join("; ");

      const fullNotes = bauteilNotes
        ? `${data.notes || ""} | Bauteilprüfung: ${bauteilNotes}`.trim()
        : data.notes || "";

      const hasGroberMangel = editBauteilPruefungen.some((bp) =>
        bp.maengel.some((m) => m.status === "grober_mangel"),
      );
      const hasMangel = editBauteilPruefungen.some(
        (bp) => bp.mangel || bp.maengel.length > 0,
      );
      const autoStatus = hasGroberMangel
        ? "urgent"
        : hasMangel
          ? "needs_repair"
          : data.status;

      await updateInspection.mutateAsync({
        id: editingInspection.id,
        projectId,
        data: {
          date: new Date(data.date),
          status: autoStatus,
          type: data.type,
          notes: fullNotes || null,
          engineerId: data.engineerId || editingInspection.engineerId,
        },
      });

      for (const id of deletedDefectIds) {
        await deleteDefect.mutateAsync({ id, projectId });
      }

      for (const bp of editBauteilPruefungen) {
        for (const m of bp.maengel) {
          if (!m.defectId || !m.dateFound) continue;
          const existingDefect = m.existingDefectId
            ? editingInspection.defects?.find(
                (d: any) => d.id === m.existingDefectId,
              )
            : editingInspection.defects?.find(
                (d: any) => d.defectId === m.defectId,
              );
          if (existingDefect) {
            const originalUrls: string[] = existingDefect.imageUrls?.length
              ? existingDefect.imageUrls
              : existingDefect.imageUrl
                ? [existingDefect.imageUrl]
                : [];
            const currentUrls: string[] = m.imageUrls || [];
            for (const removedUrl of originalUrls.filter(
              (u: string) => !currentUrls.includes(u),
            )) {
              await fetch(`/api/defects/${existingDefect.id}/image`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: removedUrl }),
                credentials: "include",
              });
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
              },
            });
            for (const imgFile of m.imageFiles || []) {
              const formData = new FormData();
              formData.append("image", imgFile);
              await fetch(`/api/defects/${existingDefect.id}/image`, {
                method: "POST",
                body: formData,
                credentials: "include",
              });
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
              },
            });
            if (defect?.id && m.imageFiles?.length) {
              for (const imgFile of m.imageFiles) {
                const formData = new FormData();
                formData.append("image", imgFile);
                await fetch(`/api/defects/${defect.id}/image`, {
                  method: "POST",
                  body: formData,
                  credentials: "include",
                });
              }
            }
          }
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["/api/projects/:projectId/inspections", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/defects/summary"] });
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

  const {
    register: editReg,
    handleSubmit: handleEditSubmit,
    setValue: setEditValue,
    watch: watchEdit,
    reset: resetEditForm,
  } = useForm({
    defaultValues: {
      name: "",
      address: "",
      status: "active",
      verwaltungId: "",
      nextInspectionDue: "",
      createdAt: "",
    },
  });

  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

  const openEditDialog = () => {
    if (!project) return;
    resetEditForm({
      name: project.name,
      address: project.address,
      status: project.status,
      verwaltungId: project.verwaltungId || "",
      createdAt: project.createdAt
        ? format(new Date(project.createdAt), "yyyy-MM-dd")
        : "",
      nextInspectionDue: project.nextInspectionDue
        ? format(new Date(project.nextInspectionDue), "yyyy-MM-dd")
        : project.createdAt
          ? format(
              new Date(
                new Date(project.createdAt).setFullYear(
                  new Date(project.createdAt).getFullYear() + 1,
                ),
              ),
              "yyyy-MM-dd",
            )
          : "",
    });
    const existing =
      (project as any).assignedUsers?.map((u: any) => u.id) || [];
    setAssignedUserIds(
      existing.length > 0
        ? existing
        : project.clientId
          ? [project.clientId]
          : [],
    );
    setEditDialogOpen(true);
  };

  const toggleAssignedUser = (userId: string) => {
    setAssignedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const onEditSubmit = (data: any) => {
    const primaryClient = assignedUserIds[0] || project?.clientId || "";
    const updates: any = {
      name: data.name,
      address: data.address,
      status: data.status,
      clientId: primaryClient || null,
      verwaltungId: data.verwaltungId || null,
      assignedUserIds,
    };
    if (data.createdAt) {
      updates.createdAt = data.createdAt;
    }
    if (data.nextInspectionDue) {
      updates.nextInspectionDue = new Date(data.nextInspectionDue);
    } else {
      updates.nextInspectionDue = null;
    }
    updateProject.mutate(
      { id: projectId, updates },
      {
        onSuccess: () => setEditDialogOpen(false),
      },
    );
  };

  if (projectLoading || !project) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-4">
          <Building className="w-4 h-4" />
          <Link
            href="/projects"
            className="hover:text-primary transition-colors cursor-pointer"
            data-testid="link-breadcrumb-projects"
          >
            Projekte
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{project.name}</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
                {project.name}
              </h1>
              {(() => {
                const mangel =
                  defectSummary?.find((s) => s.projectId === projectId)
                    ?.mangelStatus || "kein_mangel";
                const mangelLabels: Record<string, string> = {
                  kein_mangel: "Kein Mangel",
                  leichter_mangel: "Leichter Mangel",
                  grober_mangel: "Schwerer Mangel",
                };
                return (
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-widest
                    ${
                      mangel === "grober_mangel"
                        ? "bg-red-500/10 text-red-600 border-red-500/20"
                        : mangel === "leichter_mangel"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    }`}
                    data-testid="badge-mangel-status"
                  >
                    {mangelLabels[mangel]}
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{formatAddr(project.address)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={openEditDialog}
                  className="bg-card border-border hover:bg-muted/60"
                  data-testid="button-edit-project"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Projekt bearbeiten
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Projekt bearbeiten
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleEditSubmit((data) =>
                onEditSubmit({ ...data, name: data.address }),
              )}
              className="space-y-5 mt-2"
            >
              <input type="hidden" {...editReg("name")} />
              <div className="space-y-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <AddressAutocomplete
                  id="edit-address"
                  value={watchEdit("address")}
                  onChange={(val) => {
                    setEditValue("address", val);
                    setEditValue("name", val);
                  }}
                  required
                  className="bg-background border-border"
                  data-testid="input-edit-address"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  defaultValue={project.status}
                  onValueChange={(val) => setEditValue("status", val)}
                >
                  <SelectTrigger
                    className="bg-background border-border"
                    data-testid="select-edit-status"
                  >
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
                <Select
                  defaultValue={project.verwaltungId || "__privat__"}
                  onValueChange={(val) => setEditValue("verwaltungId", val === "__privat__" ? "" : val)}
                >
                  <SelectTrigger
                    className="bg-background border-border"
                    data-testid="select-edit-verwaltung"
                  >
                    <SelectValue placeholder="Verwaltung wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__privat__">Privat</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {displayName(client)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>User zuweisen</Label>
                <div
                  className="max-h-48 overflow-y-auto border border-border rounded-md p-2 space-y-1 bg-background"
                  data-testid="user-assign-list"
                >
                  {clients?.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/30 cursor-pointer"
                      onClick={() => toggleAssignedUser(client.id)}
                    >
                      <Checkbox
                        id={`assign-${client.id}`}
                        checked={assignedUserIds.includes(client.id)}
                        onCheckedChange={() => toggleAssignedUser(client.id)}
                        data-testid={`checkbox-assign-user-${client.id}`}
                      />
                      <label
                        htmlFor={`assign-${client.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {displayName(client)}
                      </label>
                    </div>
                  ))}
                </div>
                {assignedUserIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {assignedUserIds.length} User ausgewählt
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-createdAt">Erstellt am</Label>
                <Input
                  id="edit-createdAt"
                  type="date"
                  {...editReg("createdAt")}
                  className="bg-background border-border"
                  data-testid="input-edit-created-at"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nextInspection">Nächste Prüfung</Label>
                <Input
                  id="edit-nextInspection"
                  type="date"
                  {...editReg("nextInspectionDue")}
                  className="bg-background border-border"
                  data-testid="input-edit-next-inspection"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={updateProject.isPending}
                data-testid="button-submit-edit"
              >
                {updateProject.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Änderungen speichern
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 max-w-4xl">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-4">
            Projektdetails
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Verwaltung
              </p>
              <p className="font-medium" data-testid="text-verwaltung">
                {project.verwaltung ? displayName(project.verwaltung) : "Privat"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Erstellt am
              </p>
              <p className="font-medium">
                {format(new Date(project.createdAt!), "dd.MM.yyyy")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Nächste Prüfung
              </p>
              {project.nextInspectionDue ? (
                (() => {
                  const due = new Date(project.nextInspectionDue);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  due.setHours(0, 0, 0, 0);
                  const days = Math.round(
                    (due.getTime() - today.getTime()) / 86400000,
                  );
                  const label =
                    days === 0
                      ? "heute"
                      : days > 0
                        ? `in ${days} Tag${days === 1 ? "" : "en"}`
                        : `${Math.abs(days)} Tag${Math.abs(days) === 1 ? "" : "e"} überfällig`;
                  const color =
                    days < 0
                      ? "text-destructive"
                      : days <= 30
                        ? "text-amber-500"
                        : "text-emerald-600";
                  return (
                    <div className="flex items-baseline gap-2">
                      <p className="font-medium">
                        {format(
                          new Date(project.nextInspectionDue),
                          "dd.MM.yyyy",
                        )}
                      </p>
                      <span
                        className={`text-xs font-semibold ${color}`}
                        data-testid="text-next-inspection-days"
                      >
                        {label}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <p className="font-medium text-muted-foreground">
                  Nicht geplant
                </p>
              )}
            </div>
            {isAdmin && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                  User
                </p>
                <div
                  className="flex flex-wrap gap-1.5"
                  data-testid="text-client-name"
                >
                  {(project as any).assignedUsers &&
                  (project as any).assignedUsers.length > 0 ? (
                    (project as any).assignedUsers.map((u: any) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium"
                      >
                        {displayName(u)}
                      </span>
                    ))
                  ) : project.client ? (
                    <span className="font-medium">
                      {displayName(project.client)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-full min-h-[280px] rounded-2xl overflow-hidden shadow-sm">
          <MapPlaceholder
            address={project.address}
            latitude={project.latitude}
            longitude={project.longitude}
          />
        </div>
      </div>

      <div>
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="bg-card border border-border p-1 rounded-xl mb-6">
            <TabsTrigger
              value="documents"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Dokumente
            </TabsTrigger>
            <TabsTrigger
              value="bauakt"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-trigger-bauakt"
            >
              Digitaler Bauakt
            </TabsTrigger>
            <TabsTrigger
              value="inspections"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Prüfungen
            </TabsTrigger>
            <TabsTrigger
              value="images"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-trigger-images"
            >
              Bilder
            </TabsTrigger>
            <TabsTrigger
              value="bestaetigungen"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-trigger-bestaetigungen"
            >
              Bestätigungen
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-xl">
                Projektdokumente
              </h3>
              {isAdmin && (
                <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-card border-border hover:bg-muted/60"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Hochladen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Dokumente hochladen</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={handleDocSubmit(onDocSubmit)}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label>Dateien auswählen</Label>
                        <Input
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files
                              ? Array.from(e.target.files)
                              : [];
                            setDocFiles(files);
                          }}
                          required
                          className="bg-background"
                          data-testid="input-doc-file"
                        />
                        {docFiles.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {docFiles.length} Dateien ausgewählt
                          </p>
                        )}
                      </div>
                      {docFiles.length <= 1 && (
                        <div className="space-y-2">
                          <Label>Dokumentname (optional)</Label>
                          <Input
                            {...docReg("name")}
                            placeholder={
                              docFiles[0]?.name ||
                              "Wird aus Dateiname übernommen"
                            }
                            className="bg-background"
                            data-testid="input-doc-name"
                          />
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={
                          createDocument.isPending || docFiles.length === 0
                        }
                        data-testid="button-doc-submit"
                      >
                        {createDocument.isPending
                          ? "Wird hochgeladen..."
                          : docFiles.length > 1
                            ? `${docFiles.length} Dateien hochladen`
                            : "Hochladen"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {documents?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Noch keine Dokumente hochgeladen.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {documents?.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
                      data-testid={`doc-row-${doc.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          {doc.url && doc.url.startsWith("/api/") ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-primary hover:text-primary/80"
                              data-testid={`doc-link-${doc.id}`}
                            >
                              {doc.name}
                            </a>
                          ) : (
                            <p className="font-semibold text-foreground">
                              {doc.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.createdAt!), "MMM d, yyyy")} •{" "}
                            {doc.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      {doc.url && doc.url.startsWith("/api/") && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`doc-download-${doc.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary"
                          >
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
          <TabsContent
            value="images"
            className="space-y-4"
            data-testid="tab-images"
          >
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
                  <label
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-card border border-border rounded-lg cursor-pointer hover:bg-muted/60 transition-colors"
                    data-testid="button-upload-images"
                  >
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

            {!projectImages || projectImages.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
                Keine Bilder vorhanden.
              </div>
            ) : imageViewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {projectImages.map((img: any) => (
                  <div
                    key={img.id}
                    className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm"
                    data-testid={`project-image-${img.id}`}
                  >
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square"
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </a>
                    <div className="p-2.5">
                      <p
                        className="text-xs font-medium text-foreground truncate"
                        title={img.name}
                      >
                        {img.name}
                      </p>
                      {img.createdAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(img.createdAt), "dd.MM.yyyy")}
                        </p>
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
                              deleteProjectImage.mutate({
                                id: img.id,
                                projectId,
                              });
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
                      <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs w-16">
                        Bild
                      </th>
                      <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                        Dateiname
                      </th>
                      <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                        Datum
                      </th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projectImages.map((img: any) => (
                      <tr
                        key={img.id}
                        className="hover:bg-muted/40 transition-colors group"
                        data-testid={`project-image-row-${img.id}`}
                      >
                        <td className="px-6 py-3">
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-10 h-10 rounded-lg overflow-hidden border border-border"
                          >
                            <img
                              src={img.url}
                              alt={img.name}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        </td>
                        <td className="px-6 py-3">
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {img.name}
                          </a>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {img.createdAt
                            ? format(new Date(img.createdAt), "dd.MM.yyyy")
                            : "—"}
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
                                    deleteProjectImage.mutate({
                                      id: img.id,
                                      projectId,
                                    });
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
          <TabsContent
            value="bauakt"
            className="space-y-4"
            data-testid="tab-bauakt"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h3 className="font-display font-bold text-xl">
                Digitaler Bauakt
              </h3>
              <div className="flex items-center gap-2">
                {profile?.role === "admin" && (
                  <>
                    <label
                      htmlFor="bauakt-file-upload"
                      className="cursor-pointer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-card border-border hover:bg-muted/60"
                        asChild
                      >
                        <span>
                          <FileUp className="w-4 h-4 mr-2" /> Dateien hochladen
                        </span>
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
                            uploadBauaktFiles.mutate({
                              projectId,
                              files: e.target.files,
                            });
                          }
                        }}
                      />
                    </label>
                    <label
                      htmlFor="bauakt-excel-import"
                      className="cursor-pointer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-card border-border hover:bg-muted/60"
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" /> Excel importieren
                        </span>
                      </Button>
                      <input
                        id="bauakt-excel-import"
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        data-testid="input-bauakt-excel-import"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            importBauakt.mutate({
                              projectId,
                              file: e.target.files[0],
                            });
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
                {importBauakt.isPending
                  ? "Excel wird importiert..."
                  : "Dateien werden hochgeladen..."}
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
                  {profile?.role === "admin" && (
                    <p className="text-sm mt-1">
                      Importieren Sie eine Excel-Datei, um Einträge
                      hinzuzufügen.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-bauakt">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="text-left px-5 py-3 font-semibold">
                          Dateiname
                        </th>
                        <th className="text-left px-5 py-3 font-semibold">
                          Jahr
                        </th>
                        <th className="text-left px-5 py-3 font-semibold">
                          Beschreibung
                        </th>
                        <th className="text-left px-5 py-3 font-semibold">
                          Art
                        </th>
                        <th className="text-left px-5 py-3 font-semibold">
                          Anmerkung
                        </th>
                        <th className="text-left px-5 py-3 font-semibold w-16">
                          Datei
                        </th>
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
                          <tr
                            key={entry.id}
                            className="hover:bg-muted/40 transition-colors"
                            data-testid={`bauakt-row-${entry.id}`}
                          >
                            <td className="px-5 py-3 font-medium text-foreground">
                              {entry.dateiname}
                            </td>
                            <td className="px-5 py-3 text-foreground">
                              {entry.jahr || "—"}
                            </td>
                            <td className="px-5 py-3 text-foreground max-w-xs">
                              {entry.beschreibung || "—"}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase
                                  ${
                                    entry.art === "Plan"
                                      ? "text-indigo-600 border-indigo-500/30 bg-indigo-500/10"
                                      : entry.art === "Bescheid"
                                        ? "text-amber-600 border-amber-500/30 bg-amber-500/10"
                                        : "text-muted-foreground border-border bg-muted/20"
                                  }`}
                              >
                                {entry.art || "—"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-foreground text-xs max-w-xs">
                              {entry.anmerkung || "—"}
                            </td>
                            <td className="px-5 py-3">
                              {entry.fileUrl ? (
                                <a
                                  href={entry.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80"
                                  data-testid={`bauakt-file-link-${entry.id}`}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground/30">
                                  —
                                </span>
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
              <p className="text-xs text-muted-foreground">
                {
                  bauakte.filter((e: any) => {
                    if (!bauaktSearch) return true;
                    const s = bauaktSearch.toLowerCase();
                    return (
                      e.dateiname?.toLowerCase().includes(s) ||
                      e.beschreibung?.toLowerCase().includes(s) ||
                      e.art?.toLowerCase().includes(s) ||
                      e.anmerkung?.toLowerCase().includes(s) ||
                      e.jahr?.includes(s)
                    );
                  }).length
                }{" "}
                von {bauakte.length} Einträgen
              </p>
            )}
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent
            value="inspections"
            className="space-y-6"
            data-testid="tab-inspections"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-xl">Prüfprotokoll</h3>
              {isAdmin && (
                <Dialog
                  open={inspDialogOpen}
                  onOpenChange={(open) => {
                    setInspDialogOpen(open);
                    if (!open) {
                      setDefectEntries([]);
                      resetInspForm();
                      resetBauteilPruefungen();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-card border-border hover:bg-muted/60"
                      data-testid="button-add-inspection"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Prüfung hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display text-xl">
                        Neue Prüfung erfassen
                      </DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={handleInspSubmit(onInspSubmit)}
                      className="space-y-6 mt-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Art der Prüfung</Label>
                          <Select
                            defaultValue="erstpruefung"
                            onValueChange={(val) => setInspValue("type", val)}
                          >
                            <SelectTrigger
                              className="bg-background border-border"
                              data-testid="select-inspection-type"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="erstpruefung">
                                Erstprüfung
                              </SelectItem>
                              <SelectItem value="folgepruefung">
                                Folgeprüfung
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Prüfdatum</Label>
                          <Input
                            type="date"
                            {...inspReg("date")}
                            required
                            className="bg-background border-border"
                            data-testid="input-inspection-date"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Sachverständiger</Label>
                          <Select
                            value={newInspEngineerId}
                            onValueChange={(val) =>
                              setInspValue("engineerId", val)
                            }
                          >
                            <SelectTrigger
                              className="bg-background border-border"
                              data-testid="select-inspection-engineer"
                            >
                              <SelectValue placeholder="Sachverständigen wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {(clients || []).map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {displayName(c)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Anmerkungen</Label>
                          <Input
                            {...inspReg("notes")}
                            placeholder="Kurze Notizen..."
                            className="bg-background border-border"
                            data-testid="input-inspection-notes"
                          />
                        </div>
                      </div>

                      <div className="border-t border-border pt-5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-display font-bold text-base">
                            Bauteilprüfung
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addBauteilPruefung}
                            className="bg-card border-border hover:bg-muted/60"
                            data-testid="button-add-bauteil"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />{" "}
                            Sonderbauteil hinzufügen
                          </Button>
                        </div>
                        <div className="overflow-x-auto border border-border rounded-xl">
                          <table
                            className="w-full text-sm"
                            data-testid="bauteil-pruefung-table"
                          >
                            <thead>
                              <tr className="bg-muted/30 border-b border-border">
                                <th className="text-left px-2 py-2 font-semibold w-[45px]">
                                  Nr.
                                </th>
                                <th className="text-left px-3 py-2 font-semibold">
                                  Bauteil
                                </th>
                                <th className="text-left px-3 py-2 font-semibold">
                                  Gegenstand
                                </th>
                                <th className="text-center px-3 py-2 font-semibold w-20">
                                  Geprüft
                                </th>
                                <th className="text-center px-3 py-2 font-semibold w-20">
                                  Mangel
                                </th>
                                <th className="text-center px-3 py-2 font-semibold w-28">
                                  Vertiefte Prüfung
                                </th>
                                <th className="px-2 py-2 w-20"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {bauteilPruefungen.map((bp, index) => {
                                const defaultOpt = BAUTEIL_OPTIONS.find(
                                  (o) => o.label === bp.bauteil,
                                );
                                const isDefault = !!defaultOpt;
                                const isHeader =
                                  (isDefault && defaultOpt.level === 0) ||
                                  (!isDefault && bp.level === 0);
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
                                    onRotateMangelFile={rotateBauteilMangelFile}
                                    onRotateMangelUrl={rotateBauteilMangelUrl}
                                    onRemoveMangel={removeBauteilMangel}
                                  />
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={inspSubmitting}
                        data-testid="button-submit-inspection"
                      >
                        {inspSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Prüfung erfassen
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <Dialog
              open={editInspDialogOpen}
              onOpenChange={(open) => {
                setEditInspDialogOpen(open);
                if (!open) {
                  setEditingInspection(null);
                  setEditDefectEntries([]);
                  setDeletedDefectIds([]);
                  setEditBauteilPruefungen([]);
                }
              }}
            >
              <DialogContent className="bg-card border-border sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">
                    Prüfung bearbeiten
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleEditInspSubmit(onEditInspSubmit)}
                  className="space-y-6 mt-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Art der Prüfung</Label>
                      <Select
                        value={editInspType}
                        onValueChange={(val) => setEditInspValue("type", val)}
                      >
                        <SelectTrigger
                          className="bg-background border-border"
                          data-testid="edit-select-inspection-type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="erstpruefung">
                            Erstprüfung
                          </SelectItem>
                          <SelectItem value="folgepruefung">
                            Folgeprüfung
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prüfdatum</Label>
                      <Input
                        type="date"
                        {...editInspReg("date")}
                        required
                        className="bg-background border-border"
                        data-testid="edit-input-inspection-date"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editInspStatus}
                        onValueChange={(val) => setEditInspValue("status", val)}
                      >
                        <SelectTrigger
                          className="bg-background border-border"
                          data-testid="edit-select-inspection-status"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OK">OK</SelectItem>
                          <SelectItem value="needs_repair">
                            Leichter Mangel
                          </SelectItem>
                          <SelectItem value="urgent">
                            Schwerer Mangel
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sachverständiger</Label>
                      <Select
                        value={editInspEngineerId}
                        onValueChange={(val) =>
                          setEditInspValue("engineerId", val)
                        }
                      >
                        <SelectTrigger
                          className="bg-background border-border"
                          data-testid="edit-select-inspection-engineer"
                        >
                          <SelectValue placeholder="Sachverständigen wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {(clients || []).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {displayName(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Anmerkungen</Label>
                      <Input
                        {...editInspReg("notes")}
                        placeholder="Kurze Notizen..."
                        className="bg-background border-border"
                        data-testid="edit-input-inspection-notes"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-display font-bold text-base">
                        Bauteil Prüfung
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEditCustomBauteil}
                        className="bg-card border-border hover:bg-muted/60"
                        data-testid="edit-button-add-bauteil"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Sonderbauteil
                        hinzufügen
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border mb-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                            <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">
                              Nr.
                            </th>
                            <th className="text-left px-3 py-2.5 font-semibold">
                              Bauteil
                            </th>
                            <th className="text-left px-3 py-2.5 font-semibold">
                              Gegenstand
                            </th>
                            <th className="text-center px-3 py-2.5 font-semibold">
                              Geprüft
                            </th>
                            <th className="text-center px-3 py-2.5 font-semibold">
                              Mangel
                            </th>
                            <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">
                              Vertiefte Prüfung
                            </th>
                            <th className="px-2 py-2.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editBauteilPruefungen.map((bp, index) => {
                            const isDefault =
                              index < BAUTEIL_OPTIONS.length &&
                              bp.bauteil === BAUTEIL_OPTIONS[index].label;
                            const isHeader =
                              (isDefault &&
                                bp.level === 0 &&
                                index < BAUTEIL_OPTIONS.length - 1 &&
                                BAUTEIL_OPTIONS[index + 1]?.level === 1) ||
                              (!isDefault && bp.level === 0);
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

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={editInspSubmitting}
                    data-testid="button-submit-edit-inspection"
                  >
                    {editInspSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Änderungen speichern
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <div className="space-y-6">
              {inspections?.length === 0 ? (
                <div className="p-8 text-center bg-card border border-border rounded-2xl text-muted-foreground">
                  Keine Prüfungen erfasst.
                </div>
              ) : (
                inspections?.map((ins) => {
                  const primaryDefects =
                    ins.defects?.filter((d: any) => !d.parentDefectId) || [];
                  const followUps =
                    ins.defects?.filter((d: any) => d.parentDefectId) || [];
                  const isInsExpanded = expandedInspId === ins.id;
                  const insGroberCount =
                    ins.defects?.filter(
                      (d: any) => d.status === "grober_mangel",
                    ).length || 0;
                  const insLeichterCount =
                    ins.defects?.filter(
                      (d: any) => d.status === "leichter_mangel",
                    ).length || 0;
                  const insHasBauteilMangel =
                    ins.notes?.includes("- Mangel") || false;
                  const insEffectiveStatus =
                    insGroberCount > 0 || ins.status === "urgent"
                      ? "urgent"
                      : insLeichterCount > 0 ||
                          insHasBauteilMangel ||
                          ins.status === "needs_repair"
                        ? "needs_repair"
                        : "OK";

                  return (
                    <div
                      key={ins.id}
                      className={`bg-card border rounded-2xl shadow-sm overflow-hidden transition-all ${isInsExpanded ? "border-primary/40" : "border-border"}`}
                      data-testid={`inspection-card-${ins.id}`}
                    >
                      <div
                        className="p-5 cursor-pointer"
                        onClick={() =>
                          setExpandedInspId((prev) =>
                            prev === ins.id ? null : ins.id,
                          )
                        }
                        data-testid={`inspection-toggle-${ins.id}`}
                      >
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border
                                ${
                                  insEffectiveStatus === "OK"
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : insEffectiveStatus === "urgent"
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                }`}
                            >
                              {insEffectiveStatus === "OK" ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <AlertTriangle className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-lg">
                                {inspTypeLabels[(ins as any).type] ||
                                  "Erstprüfung"}{" "}
                                — {format(new Date(ins.date), "dd.MM.yyyy")}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {(ins.notes?.includes("| Bauteilprüfung: ")
                                  ? ins.notes
                                      .split("| Bauteilprüfung: ")[0]
                                      .trim()
                                  : ins.notes) || "Keine Anmerkungen."}
                              </p>
                              {ins.engineer && (
                                <p className="text-xs text-muted-foreground mt-2 font-medium">
                                  Sachverständiger: {displayName(ins.engineer)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                generateInspectionPdf({
                                  ...ins,
                                  projectAddress: project?.address,
                                  projectName: project?.name,
                                });
                              }}
                              title="PDF herunterladen"
                              data-testid={`button-pdf-inspection-${ins.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditInspection(ins);
                                  }}
                                  data-testid={`button-edit-inspection-${ins.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteInspectionId(ins.id);
                                  }}
                                  data-testid={`button-delete-inspection-${ins.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <span
                              className={`px-3 py-1 text-xs font-bold rounded-full border uppercase
                                ${
                                  insEffectiveStatus === "OK"
                                    ? "text-emerald-500 border-emerald-500/30"
                                    : insEffectiveStatus === "urgent"
                                      ? "text-destructive border-destructive/30"
                                      : "text-amber-500 border-amber-500/30"
                                }`}
                            >
                              {inspStatusLabels[insEffectiveStatus] ||
                                insEffectiveStatus}
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
                        <div
                          className="border-t border-border bg-muted/20 p-5 space-y-5"
                          data-testid={`inspection-detail-${ins.id}`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Prüfungsdetails
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Art
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {inspTypeLabels[(ins as any).type] ||
                                      (ins as any).type}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Datum
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {format(new Date(ins.date), "dd.MM.yyyy")}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Status
                                  </span>
                                  <span
                                    className={`font-bold ${insEffectiveStatus === "OK" ? "text-emerald-600" : insEffectiveStatus === "urgent" ? "text-destructive" : "text-amber-600"}`}
                                  >
                                    {inspStatusLabels[insEffectiveStatus] ||
                                      insEffectiveStatus}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Zuordnung
                              </h4>
                              <div className="space-y-2 text-sm">
                                {ins.engineer && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Sachverständiger
                                    </span>
                                    <span className="font-medium text-foreground">
                                      {displayName(ins.engineer)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {(() => {
                            const notes = ins.notes || "";
                            const userNotes = notes.includes(
                              "| Bauteilprüfung: ",
                            )
                              ? notes.split("| Bauteilprüfung: ")[0].trim()
                              : notes;
                            return userNotes ? (
                              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                  Anmerkungen
                                </h4>
                                <p className="text-sm text-foreground">
                                  {userNotes}
                                </p>
                              </div>
                            ) : null;
                          })()}

                          {(() => {
                            const notes = ins.notes || "";
                            if (!notes.includes("| Bauteilprüfung: "))
                              return null;
                            const bauteilPart =
                              notes.split("| Bauteilprüfung: ")[1];
                            const entries = bauteilPart
                              .split("; ")
                              .map((entry: string) => {
                                const nameMatch = entry.match(/^\[(.+?)\]/);
                                if (!nameMatch) return null;
                                const name = nameMatch[1];
                                const opt = BAUTEIL_OPTIONS.find(
                                  (b) => b.label === name,
                                );
                                const gegenstandMatch = entry.match(
                                  /Gegenstand: (.+?)(?:\s*-|$)/,
                                );
                                const legacyMangelMatch = entry.match(
                                  /Mangel: (.+?)(?:\s*-|$)/,
                                );
                                return {
                                  name,
                                  ref: opt?.ref || "",
                                  level: opt?.level ?? 0,
                                  geprueft: entry.includes("geprüft"),
                                  mangel: entry.includes("Mangel"),
                                  gegenstand:
                                    gegenstandMatch?.[1]?.trim() ||
                                    legacyMangelMatch?.[1]?.trim() ||
                                    opt?.defaultGegenstand ||
                                    "",
                                  vertieftePruefung:
                                    entry.includes("vertiefte Prüfung"),
                                  vertieftePruefungText: (() => {
                                    const m = entry.match(
                                      /vertiefte Prüfung: (.+)$/,
                                    );
                                    return m ? m[1].trim() : "";
                                  })(),
                                };
                              })
                              .filter(Boolean) as {
                              name: string;
                              ref: string;
                              level: number;
                              geprueft: boolean;
                              mangel: boolean;
                              gegenstand: string;
                              vertieftePruefung: boolean;
                              vertieftePruefungText: string;
                            }[];
                            if (entries.length === 0) return null;
                            const headerNames = new Set<string>();
                            for (let i = 0; i < BAUTEIL_OPTIONS.length; i++) {
                              if (
                                BAUTEIL_OPTIONS[i].level === 0 &&
                                BAUTEIL_OPTIONS[i + 1]?.level === 1
                              )
                                headerNames.add(BAUTEIL_OPTIONS[i].label);
                            }
                            const entryMap = new Map(
                              entries.map((e) => [e.name, e]),
                            );
                            const displayEntries: any[] = [];
                            for (const opt of BAUTEIL_OPTIONS) {
                              if (headerNames.has(opt.label)) {
                                const hasChildInEntries = BAUTEIL_OPTIONS.some(
                                  (o) =>
                                    o.level === 1 &&
                                    entryMap.has(o.label) &&
                                    BAUTEIL_OPTIONS.indexOf(o) >
                                      BAUTEIL_OPTIONS.indexOf(opt) &&
                                    (BAUTEIL_OPTIONS.indexOf(o) ===
                                      BAUTEIL_OPTIONS.indexOf(opt) + 1 ||
                                      BAUTEIL_OPTIONS.slice(
                                        BAUTEIL_OPTIONS.indexOf(opt) + 1,
                                        BAUTEIL_OPTIONS.indexOf(o),
                                      ).every((s) => s.level === 1)),
                                );
                                if (
                                  hasChildInEntries ||
                                  entryMap.has(opt.label)
                                ) {
                                  displayEntries.push({
                                    name: opt.label,
                                    ref: "",
                                    level: 0,
                                    geprueft: false,
                                    mangel: false,
                                    gegenstand: "",
                                    vertieftePruefung: false,
                                    vertieftePruefungText: "",
                                  });
                                }
                              } else if (entryMap.has(opt.label)) {
                                displayEntries.push(entryMap.get(opt.label)!);
                              }
                            }
                            const standardLabels = new Set(
                              BAUTEIL_OPTIONS.map((o) => o.label),
                            );
                            const customEntries = entries.filter(
                              (e) => !standardLabels.has(e.name),
                            );
                            if (customEntries.length > 0) {
                              displayEntries.push({
                                name: "Sonderbauteile",
                                ref: "",
                                level: 0,
                                geprueft: false,
                                mangel: false,
                                gegenstand: "",
                                vertieftePruefung: false,
                                vertieftePruefungText: "",
                                isCustomHeader: true,
                              });
                              for (const ce of customEntries) {
                                displayEntries.push({ ...ce, level: 1 });
                              }
                            }
                            return (
                              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                  Bauteil Prüfung
                                </h4>
                                <div className="overflow-x-auto rounded-lg border border-border">
                                  <table
                                    className="w-full text-sm"
                                    data-testid={`detail-bauteil-table-${ins.id}`}
                                  >
                                    <thead>
                                      <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                                        <th className="text-left px-3 py-2 font-semibold w-10">
                                          Nr.
                                        </th>
                                        <th className="text-left px-3 py-2 font-semibold">
                                          Bauteil
                                        </th>
                                        <th className="text-left px-3 py-2 font-semibold">
                                          Gegenstand
                                        </th>
                                        <th className="text-center px-3 py-2 font-semibold w-20">
                                          Geprüft
                                        </th>
                                        <th className="text-center px-3 py-2 font-semibold w-20">
                                          Mangel
                                        </th>
                                        <th className="text-center px-3 py-2 font-semibold w-28">
                                          Vertiefte Prüfung
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {(() => {
                                        let gNum = 0;
                                        return displayEntries.map((e, i) => {
                                          const isHeader =
                                            headerNames.has(e.name) ||
                                            !!e.isCustomHeader;
                                          if (isHeader) gNum++;
                                          return isHeader ? (
                                            <tr key={i} className="bg-muted/30">
                                              <td
                                                colSpan={6}
                                                className="px-3 py-2 font-bold text-foreground"
                                              >
                                                {gNum}. {e.name}
                                              </td>
                                            </tr>
                                          ) : (
                                            <Fragment key={i}>
                                              <tr className="hover:bg-muted/10">
                                                <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                                                  {e.ref}
                                                </td>
                                                <td
                                                  className={`px-3 py-2 ${e.level === 1 ? "pl-8" : ""}`}
                                                >
                                                  {e.name}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                  {e.gegenstand}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                  {e.geprueft ? (
                                                    <span className="text-emerald-600 font-medium">
                                                      Ja
                                                    </span>
                                                  ) : (
                                                    <span className="text-muted-foreground">
                                                      Nein
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                  {e.mangel ? (
                                                    <span className="text-red-600 font-medium">
                                                      Ja
                                                    </span>
                                                  ) : (
                                                    <span className="text-muted-foreground">
                                                      Nein
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                  {e.vertieftePruefung ? (
                                                    <span className="text-blue-600 font-medium">
                                                      Ja
                                                    </span>
                                                  ) : (
                                                    <span className="text-muted-foreground">
                                                      Nein
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                              {e.vertieftePruefung &&
                                                e.vertieftePruefungText && (
                                                  <tr className="border-b border-border bg-blue-50/20 dark:bg-blue-900/10">
                                                    <td
                                                      colSpan={6}
                                                      className="px-3 py-3"
                                                    >
                                                      <div className="ml-4 border-l-2 border-blue-500/40 pl-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                            Vertiefte Prüfung —{" "}
                                                            {e.name}
                                                          </span>
                                                        </div>
                                                        <p className="text-sm text-foreground">
                                                          {
                                                            e.vertieftePruefungText
                                                          }
                                                        </p>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )}
                                              {(() => {
                                                const bauteilPrimary =
                                                  primaryDefects.filter(
                                                    (d: any) =>
                                                      d.bauteil?.at(-1) ===
                                                      e.name,
                                                  );
                                                const orphanedFollowUps =
                                                  followUps.filter(
                                                    (f: any) =>
                                                      f.bauteil?.at(-1) ===
                                                        e.name &&
                                                      !primaryDefects.some(
                                                        (p: any) =>
                                                          p.id ===
                                                          f.parentDefectId,
                                                      ),
                                                  );
                                                const allForBauteil = [
                                                  ...bauteilPrimary,
                                                  ...orphanedFollowUps,
                                                ];
                                                if (allForBauteil.length === 0)
                                                  return null;
                                                return allForBauteil.map(
                                                  (defect: any) => {
                                                    const children =
                                                      followUps.filter(
                                                        (f: any) =>
                                                          f.parentDefectId ===
                                                          defect.id,
                                                      );
                                                    const imgs: string[] =
                                                      defect.imageUrls?.length
                                                        ? defect.imageUrls
                                                        : defect.imageUrl
                                                          ? [defect.imageUrl]
                                                          : [];
                                                    const isGrober =
                                                      defect.status ===
                                                      "grober_mangel";
                                                    return (
                                                      <Fragment
                                                        key={`defect-inline-${defect.id}`}
                                                      >
                                                        <tr
                                                          className={`border-b border-border/40 ${isGrober ? "bg-red-50/20 dark:bg-red-950/15" : "bg-amber-50/10 dark:bg-amber-950/5"}`}
                                                        >
                                                          <td
                                                            colSpan={6}
                                                            className="px-3 py-2.5"
                                                          >
                                                            <div
                                                              className={`ml-4 pl-4 border-l-2 ${isGrober ? "border-red-500/40" : "border-amber-500/40"}`}
                                                            >
                                                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-0.5">
                                                                <span className="font-mono font-semibold text-xs text-primary">
                                                                  {
                                                                    defect.defectId
                                                                  }
                                                                </span>
                                                                <span
                                                                  className={`px-1.5 py-0.5 text-xs font-bold rounded-full border uppercase ${isGrober ? "text-red-500 border-red-500/30 bg-red-500/10" : "text-amber-500 border-amber-500/30 bg-amber-500/10"}`}
                                                                >
                                                                  {isGrober
                                                                    ? "Schwerer Mangel"
                                                                    : "Leichter Mangel"}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                  {format(
                                                                    new Date(
                                                                      defect.dateFound,
                                                                    ),
                                                                    "dd.MM.yyyy",
                                                                  )}
                                                                </span>
                                                                {defect.frist && (
                                                                  <span className="text-xs text-muted-foreground">
                                                                    · Frist:{" "}
                                                                    {fristLabels[
                                                                      defect
                                                                        .frist
                                                                    ] ||
                                                                      defect.frist}
                                                                  </span>
                                                                )}
                                                                {defect.repairDue && (
                                                                  <span className="text-xs text-muted-foreground">
                                                                    · bis{" "}
                                                                    {format(
                                                                      new Date(
                                                                        defect.repairDue,
                                                                      ),
                                                                      "dd.MM.yyyy",
                                                                    )}
                                                                  </span>
                                                                )}
                                                              </div>
                                                              <p className="text-xs text-foreground leading-snug">
                                                                {
                                                                  defect.description
                                                                }
                                                              </p>
                                                              {defect.location && (
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                  {
                                                                    defect.location
                                                                  }
                                                                </p>
                                                              )}
                                                              {imgs.length >
                                                                0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                  {imgs.map(
                                                                    (
                                                                      src: string,
                                                                      ii: number,
                                                                    ) => (
                                                                      <ExpandableImage
                                                                        key={ii}
                                                                        src={
                                                                          src
                                                                        }
                                                                        alt="Mangel"
                                                                        testId={`defect-image-${defect.defectId}-${ii}`}
                                                                      />
                                                                    ),
                                                                  )}
                                                                </div>
                                                              )}
                                                            </div>
                                                          </td>
                                                        </tr>
                                                        {children.map(
                                                          (child: any) => {
                                                            const childImgs: string[] =
                                                              child.imageUrls
                                                                ?.length
                                                                ? child.imageUrls
                                                                : child.imageUrl
                                                                  ? [
                                                                      child.imageUrl,
                                                                    ]
                                                                  : [];
                                                            const childGrober =
                                                              child.status ===
                                                              "grober_mangel";
                                                            return (
                                                              <tr
                                                                key={`followup-${child.id}`}
                                                                className="bg-muted/10 border-b border-border/30"
                                                              >
                                                                <td
                                                                  colSpan={6}
                                                                  className="px-3 py-2"
                                                                >
                                                                  <div className="ml-8 pl-4 border-l-2 border-muted-foreground/20">
                                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-0.5">
                                                                      <CornerDownRight className="w-3 h-3 text-muted-foreground" />
                                                                      <span className="font-mono text-xs text-muted-foreground">
                                                                        {
                                                                          child.defectId
                                                                        }
                                                                      </span>
                                                                      <span
                                                                        className={`px-1.5 py-0.5 text-xs font-bold rounded-full border uppercase ${childGrober ? "text-red-500 border-red-500/30 bg-red-500/10" : "text-amber-500 border-amber-500/30 bg-amber-500/10"}`}
                                                                      >
                                                                        {childGrober
                                                                          ? "Schwerer Mangel"
                                                                          : "Leichter Mangel"}
                                                                      </span>
                                                                      <span className="text-xs text-muted-foreground">
                                                                        {format(
                                                                          new Date(
                                                                            child.dateFound,
                                                                          ),
                                                                          "dd.MM.yyyy",
                                                                        )}
                                                                      </span>
                                                                      {child.frist && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                          ·
                                                                          Frist:{" "}
                                                                          {fristLabels[
                                                                            child
                                                                              .frist
                                                                          ] ||
                                                                            child.frist}
                                                                        </span>
                                                                      )}
                                                                      {child.repairDue && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                          · bis{" "}
                                                                          {format(
                                                                            new Date(
                                                                              child.repairDue,
                                                                            ),
                                                                            "dd.MM.yyyy",
                                                                          )}
                                                                        </span>
                                                                      )}
                                                                    </div>
                                                                    <p className="text-xs text-foreground leading-snug">
                                                                      {
                                                                        child.description
                                                                      }
                                                                    </p>
                                                                    {child.location && (
                                                                      <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {
                                                                          child.location
                                                                        }
                                                                      </p>
                                                                    )}
                                                                    {childImgs.length >
                                                                      0 && (
                                                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                                                        {childImgs.map(
                                                                          (
                                                                            src: string,
                                                                            ii: number,
                                                                          ) => (
                                                                            <ExpandableImage
                                                                              key={
                                                                                ii
                                                                              }
                                                                              src={
                                                                                src
                                                                              }
                                                                              alt="Mangel"
                                                                              testId={`defect-image-${child.defectId}-${ii}`}
                                                                            />
                                                                          ),
                                                                        )}
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                </td>
                                                              </tr>
                                                            );
                                                          },
                                                        )}
                                                      </Fragment>
                                                    );
                                                  },
                                                );
                                              })()}
                                            </Fragment>
                                          );
                                        });
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Bestätigungen Tab */}
          <TabsContent
            value="bestaetigungen"
            className="space-y-4"
            data-testid="tab-bestaetigungen"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                <div className="font-semibold text-sm">
                  Bestätigung Bauwerksbuch
                </div>
                <div className="text-xs text-muted-foreground">
                  Bestätigung, dass ein Bauwerksbuch für diese Liegenschaft
                  angelegt wurde.
                </div>
                <Button
                  variant="outline"
                  onClick={() => generateBestaetigungBWB(project)}
                  className="w-full bg-card border-border hover:bg-muted/60"
                  data-testid="button-best-bwb"
                >
                  <Download className="w-4 h-4 mr-2" /> Best. BWB herunterladen
                </Button>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                <div className="font-semibold text-sm">
                  Bestätigung Erstprüfung
                </div>
                <div className="text-xs text-muted-foreground">
                  Bestätigung, dass eine Erstprüfung für diese Liegenschaft
                  durchgeführt wurde.
                </div>
                {epInspection ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      generateBestaetigungEP(
                        epInspection,
                        project?.address || "",
                      )
                    }
                    className="w-full bg-card border-border hover:bg-muted/60"
                    data-testid="button-best-ep"
                  >
                    <Download className="w-4 h-4 mr-2" /> Best. EP herunterladen
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    Keine Erstprüfung vorhanden.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog
        open={deleteInspectionId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteInspectionId(null);
        }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Prüfung löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Prüfung wirklich löschen? Alle zugehörigen
              Mängel werden ebenfalls gelöscht. Diese Aktion kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-border"
              data-testid="button-cancel-delete-inspection"
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteInspection.isPending}
              onClick={() => {
                if (deleteInspectionId) {
                  deleteInspection.mutate(
                    { id: deleteInspectionId, projectId },
                    {
                      onSuccess: () => setDeleteInspectionId(null),
                    },
                  );
                }
              }}
              data-testid="button-confirm-delete-inspection"
            >
              {deleteInspection.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function ZoomableLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const posAtDrag = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((z) => Math.min(Math.max(z * factor, 0.5), 10));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    posAtDrag.current = pos;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPos({
      x: posAtDrag.current.x + (e.clientX - dragOrigin.current.x),
      y: posAtDrag.current.y + (e.clientY - dragOrigin.current.y),
    });
  };
  const handleMouseUp = () => setDragging(false);
  const reset = () => {
    setZoom(1);
    setPos({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative overflow-hidden rounded-xl select-none"
        style={{
          width: "90vw",
          height: "85vh",
          cursor: dragging ? "grabbing" : "grab",
        }}
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
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-card/90 border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors z-10"
        data-testid="button-close-image"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/90 border border-border rounded-full px-3 py-1.5 z-10 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.5))}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground font-semibold text-lg leading-none"
        >
          −
        </button>
        <span className="text-xs text-foreground w-12 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z * 1.25, 10))}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground font-semibold text-lg leading-none"
        >
          +
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={reset}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          title="Zurücksetzen"
        >
          <ZoomIn className="w-3.5 h-3.5 text-foreground" />
        </button>
      </div>
    </div>
  );
}

function EditThumb({
  src,
  alt,
  onRotate,
  onRemove,
  testIdRotate,
  testIdRemove,
}: {
  src: string;
  alt: string;
  onRotate: () => void;
  onRemove: () => void;
  testIdRotate?: string;
  testIdRemove?: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <div className="relative group">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="w-16 h-16 rounded-lg border border-border overflow-hidden block cursor-zoom-in"
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            style={{ imageOrientation: "none" }}
          />
        </button>
        <button
          type="button"
          onClick={onRotate}
          className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid={testIdRotate}
        >
          <RotateCw className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid={testIdRemove}
        >
          <X className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-card border border-border text-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
      </div>
      {zoomed && (
        <ZoomableLightbox
          src={src}
          alt={alt}
          onClose={() => setZoomed(false)}
        />
      )}
    </>
  );
}

function ExpandableImage({
  src,
  alt,
  testId,
}: {
  src: string;
  alt: string;
  testId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="block w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-zoom-in"
        data-testid={testId ?? "button-expand-image"}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          style={{ imageOrientation: "none" }}
        />
      </button>
      {expanded && (
        <ZoomableLightbox
          src={src}
          alt={alt}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}