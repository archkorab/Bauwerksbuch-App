import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { displayName, displayInitials, formatAddr } from "@/lib/utils";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, useDefectSummary } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-users";
import { useProfile } from "@/hooks/use-profile";
import { Link, useLocation } from "wouter";
import {
  Building,
  MapPin,
  Calendar as CalendarIcon,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LayoutGrid,
  List,
  Search,
  ChevronRight,
  Trash2,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  Map
} from "lucide-react";
import { format } from "date-fns";
import type { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useToast } from "@/hooks/use-toast";
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

const mangelLabels: Record<string, string> = {
  kein_mangel: "Kein Mangel",
  leichter_mangel: "Leichter Mangel",
  grober_mangel: "Schwerer Mangel",
};

function ProjectMapDialog({ projects, open, onOpenChange }: { projects: Project[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  const initMap = useCallback(async () => {
    if (!mapRef.current || !open) return;
    setLoading(true);

    try {
      const res = await fetch("/api/maps-key", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch maps key");
      const { key } = await res.json();

      if (!(window as any).google?.maps) {
        await new Promise<void>((resolve, reject) => {
          if ((window as any).google?.maps) return resolve();
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker`;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Google Maps"));
          document.head.appendChild(script);
        });
      }

      const google = (window as any).google;
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 48.2082, lng: 16.3738 },
        zoom: 12,
        mapId: "project-map",
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      });
      mapInstanceRef.current = map;

      const bounds = new google.maps.LatLngBounds();
      let markersPlaced = 0;

      const geocodeQueue: Project[] = [];

      for (const p of projects) {
        if (p.latitude && p.longitude) {
          const lat = parseFloat(p.latitude);
          const lng = parseFloat(p.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            addMarker(google, map, lat, lng, p, navigate, onOpenChange);
            bounds.extend({ lat, lng });
            markersPlaced++;
            continue;
          }
        }
        geocodeQueue.push(p);
      }

      for (const p of geocodeQueue) {
        try {
          const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(p.address)}`, { credentials: "include" });
          const geo = await geoRes.json();
          if (geo.lat && geo.lng) {
            addMarker(google, map, geo.lat, geo.lng, p, navigate, onOpenChange);
            bounds.extend({ lat: geo.lat, lng: geo.lng });
            markersPlaced++;
          }
        } catch {
        }
      }

      if (markersPlaced > 1) {
        map.fitBounds(bounds, 60);
      } else if (markersPlaced === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(15);
      }
    } catch (err) {
      console.error("Map init error:", err);
    } finally {
      setLoading(false);
    }
  }, [open, projects, navigate, onOpenChange]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(initMap, 100);
      return () => clearTimeout(t);
    }
  }, [open, initMap]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[80vh] flex flex-col p-0 gap-0 bg-card border-border">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" /> Kartenansicht
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex-1">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full rounded-b-lg" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function addMarker(google: any, map: any, lat: number, lng: number, project: Project, navigate: (path: string) => void, closeDialog: (open: boolean) => void) {
  const marker = new google.maps.Marker({
    position: { lat, lng },
    map,
    title: project.name,
  });

  const infoContent = `
    <div style="font-family:sans-serif;max-width:250px;padding:4px 0">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#333">${project.name}</div>
      <div style="font-size:12px;color:#666;margin-bottom:8px">${formatAddr(project.address)}</div>
      <a href="/projects/${project.id}" style="font-size:12px;color:#61619e;font-weight:600;text-decoration:none" id="map-link-${project.id}">Projekt ansehen →</a>
    </div>
  `;

  const infoWindow = new google.maps.InfoWindow({ content: infoContent });

  marker.addListener("click", () => {
    infoWindow.open(map, marker);
    setTimeout(() => {
      const link = document.getElementById(`map-link-${project.id}`);
      if (link) {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          closeDialog(false);
          navigate(`/projects/${project.id}`);
        });
      }
    }, 100);
  });
}

export default function ProjektePage() {
  const { data: projects, isLoading } = useProjects();
  const { data: profile } = useProfile();
  const { data: clients } = useClients();
  const { data: defectSummary } = useDefectSummary();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { toast } = useToast();

  const [, navigate] = useLocation();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [mapOpen, setMapOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "address">("address");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterClientId, setFilterClientId] = useState<string>("all");
  const [filterPlz, setFilterPlz] = useState<string>("all");

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

  const { setValue: setEditVal, handleSubmit: handleEditSubmit, reset: resetEditForm, watch: watchEdit } = useForm({
    defaultValues: {
      name: "",
      address: "",
      status: "active",
      clientId: "",
      verwaltungId: "",
      nextInspectionDue: "",
    }
  });

  const openEditProject = (project: any) => {
    resetEditForm({
      name: project.name,
      address: project.address,
      status: project.status,
      clientId: project.clientId || "",
      verwaltungId: project.verwaltungId || "",
      nextInspectionDue: project.nextInspectionDue ? format(new Date(project.nextInspectionDue), 'yyyy-MM-dd') : "",
    });
    setEditProjectId(project.id);
  };

  const onEditSubmit = (data: any) => {
    if (!editProjectId) return;
    const updates: any = {
      name: data.address,
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
    updateProject.mutate({ id: editProjectId, updates }, {
      onSuccess: () => {
        setEditProjectId(null);
        toast({ title: "Projekt aktualisiert", description: "Die Änderungen wurden gespeichert." });
      },
      onError: () => {
        toast({ title: "Fehler", description: "Das Projekt konnte nicht aktualisiert werden.", variant: "destructive" });
      },
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

  const getPlzStr = (addr: string): string => {
    const m = (addr || "").match(/\b(\d{4})\b/);
    return m ? m[1] : "";
  };

  const availablePlzs = Array.from(
    new Set((projects || []).map(p => getPlzStr(p.address || p.name || "")).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const filteredProjects = (() => {
    const base = (projects || []).filter(p => {
      const s = search.toLowerCase().trim();
      if (s && !p.name.toLowerCase().includes(s) && !(p.address || "").toLowerCase().includes(s)) return false;
      if (filterClientId !== "all" && p.clientId !== filterClientId) return false;
      if (filterPlz !== "all" && getPlzStr(p.address || p.name || "") !== filterPlz) return false;
      return true;
    });
    const extractPlz = (addr: string): number => {
      const m = addr.match(/\b(\d{4})\b/);
      return m ? parseInt(m[1]) : 9999;
    };
    base.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "address") {
        const aAddr = a.address || a.name || "";
        const bAddr = b.address || b.name || "";
        const aPlz = extractPlz(aAddr);
        const bPlz = extractPlz(bAddr);
        if (aPlz !== bPlz) {
          cmp = aPlz - bPlz;
        } else {
          cmp = aAddr.localeCompare(bAddr, "de");
        }
      } else {
        const aDate = a.nextInspectionDue ? new Date(a.nextInspectionDue).getTime() : Infinity;
        const bDate = b.nextInspectionDue ? new Date(b.nextInspectionDue).getTime() : Infinity;
        cmp = aDate - bDate;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return base;
  })();
  const deleteConfirmProject = projects?.find(p => p.id === deleteConfirmId);

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2" data-testid="text-projekte-title">
            Projekte
          </h1>
          <p className="text-muted-foreground">Alle Bauwerksbücher verwalten</p>
        </div>

        {canCreateProject && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" data-testid="button-add-project-projekte">
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
                  <Label htmlFor="address-projekte">Adresse</Label>
                  <AddressAutocomplete
                    id="address-projekte"
                    value={addressValue}
                    onChange={(val) => { setValue("address", val); setValue("name", val); }}
                    className="bg-background border-border focus:ring-primary/20"
                    data-testid="input-address-projekte"
                  />
                  {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>User zuweisen</Label>
                  <Select onValueChange={(val) => setValue("clientId", val)}>
                    <SelectTrigger className="bg-background border-border" data-testid="select-client-projekte">
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
                    <SelectTrigger className="bg-background border-border" data-testid="select-verwaltung-projekte">
                      <SelectValue placeholder="Verwaltung wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName}{client.profile?.company ? `, ${client.profile.company}` : ''}
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

      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Projekt suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 bg-card border-border"
            data-testid="input-search-projekte"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-clear-search-projekte">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
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
              data-testid="button-sort-address-projekte"
            >
              <Building className="w-3.5 h-3.5" />
              Adresse
              {sortBy === "address" && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
              {sortBy !== "address" && <ArrowUpDown className="w-3 h-3 opacity-40" />}
            </button>
            <button
              onClick={() => {
                if (sortBy === "date") {
                  setSortDir(d => d === "asc" ? "desc" : "asc");
                } else {
                  setSortBy("date");
                  setSortDir("asc");
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${sortBy === "date" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              data-testid="button-sort-date-projekte"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Datum
              {sortBy === "date" && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
              {sortBy !== "date" && <ArrowUpDown className="w-3 h-3 opacity-40" />}
            </button>
          </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="px-3 h-8"
            data-testid="button-view-list-projekte"
          >
            <List className="w-4 h-4 mr-1.5" />
            <span className="text-xs">Liste</span>
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="px-3 h-8"
            data-testid="button-view-grid-projekte"
          >
            <LayoutGrid className="w-4 h-4 mr-1.5" />
            <span className="text-xs">Kacheln</span>
          </Button>
        </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMapOpen(true)}
            className="px-3 h-8"
            data-testid="button-map-view"
          >
            <Map className="w-4 h-4 mr-1.5" />
            <span className="text-xs">Kartenansicht</span>
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      {(filterClientId !== "all" || filterPlz !== "all" || clients?.length > 0 || availablePlzs.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 mb-5 px-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter:
          </div>
          {clients && clients.length > 0 && (
            <Select value={filterClientId} onValueChange={setFilterClientId}>
              <SelectTrigger className="h-8 w-52 text-xs bg-card border-border" data-testid="select-filter-client">
                <SelectValue placeholder="Alle Eigentümer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Eigentümer</SelectItem>
                {clients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {displayName(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {availablePlzs.length > 0 && (
            <Select value={filterPlz} onValueChange={setFilterPlz}>
              <SelectTrigger className="h-8 w-40 text-xs bg-card border-border" data-testid="select-filter-plz">
                <SelectValue placeholder="Alle PLZ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle PLZ</SelectItem>
                {availablePlzs.map(plz => (
                  <SelectItem key={plz} value={plz}>{plz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(filterClientId !== "all" || filterPlz !== "all") && (
            <button
              onClick={() => { setFilterClientId("all"); setFilterPlz("all"); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-clear-filters"
            >
              <X className="w-3.5 h-3.5" /> Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {filteredProjects?.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card/30">
          <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-no-projects">{search ? "Keine Ergebnisse" : "Keine Projekte gefunden"}</h3>
          <p className="text-muted-foreground">{search ? "Versuchen Sie einen anderen Suchbegriff." : "Ihnen sind noch keine Projekte zugewiesen."}</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm" data-testid="projekte-list-view">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Projekt</th>
                <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Adresse</th>
                <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Nächste Prüfung</th>
                <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Status</th>
                {isAdmin && <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">User</th>}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProjects?.map((project) => {
                const mangel = getMangelStatus(project.id);
                return (
                    <tr key={project.id} className="hover:bg-muted/40 transition-colors cursor-pointer group" onClick={() => navigate(`/projects/${project.id}`)} data-testid={`row-project-projekte-${project.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center border border-border shrink-0">
                            <Building className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{formatAddr(project.address)}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {project.nextInspectionDue ? format(new Date(project.nextInspectionDue), 'dd.MM.yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border uppercase tracking-wider
                          ${mangel === 'grober_mangel' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                            mangel === 'leichter_mangel' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}
                          data-testid={`badge-mangel-projekte-${project.id}`}>
                          {mangelLabels[mangel]}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-muted-foreground">
                          {project.client ? displayName(project.client) : '—'}
                        </td>
                      )}
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); openEditProject(project); }}
                              data-testid={`button-edit-project-${project.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(project.id); }}
                              data-testid={`button-delete-project-${project.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="projekte-grid-view">
          {filteredProjects?.map((project) => {
            const mangel = getMangelStatus(project.id);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group bg-card border border-border rounded-2xl p-6 hover-elevate cursor-pointer h-full flex flex-col" data-testid={`card-project-projekte-${project.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center border border-border">
                      <Building className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider
                        ${mangel === 'grober_mangel' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                          mangel === 'leichter_mangel' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}
                        data-testid={`badge-mangel-grid-projekte-${project.id}`}>
                        {mangelLabels[mangel]}
                      </span>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditProject(project); }}
                          data-testid={`button-edit-project-grid-${project.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmId(project.id); }}
                          data-testid={`button-delete-project-grid-${project.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                  <div className="space-y-3 mt-auto pt-4">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{formatAddr(project.address)}</span>
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
      )}

      <Dialog open={editProjectId !== null} onOpenChange={(open) => { if (!open) setEditProjectId(null); }}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Projekt bearbeiten</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label>Adresse</Label>
              <AddressAutocomplete
                value={watchEdit("address")}
                onChange={(val) => { setEditVal("address", val); setEditVal("name", val); }}
                required
                className="bg-background border-border"
                data-testid="input-edit-address-projekte"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watchEdit("status")} onValueChange={(val) => setEditVal("status", val)}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-status-projekte">
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
              <Label>User zuweisen</Label>
              <Select value={watchEdit("clientId")} onValueChange={(val) => setEditVal("clientId", val)}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-client-projekte">
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
              <Label>Verwaltung</Label>
              <Select value={watchEdit("verwaltungId")} onValueChange={(val) => setEditVal("verwaltungId", val)}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-verwaltung-projekte">
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
              <Label>Nächste Prüfung</Label>
              <Input type="date" value={watchEdit("nextInspectionDue")} onChange={(e) => setEditVal("nextInspectionDue", e.target.value)} className="bg-background border-border" data-testid="input-edit-next-inspection-projekte" />
            </div>
            <Button type="submit" className="w-full" disabled={updateProject.isPending} data-testid="button-submit-edit-projekte">
              {updateProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Änderungen speichern
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Projekt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das Projekt <strong>"{deleteConfirmProject?.name}"</strong> wirklich löschen? Alle zugehörigen Prüfungen, Mängel, Dokumente und Bauakte werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border" data-testid="button-cancel-delete-project">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProject.isPending}
              onClick={() => {
                if (deleteConfirmId) {
                  deleteProject.mutate(deleteConfirmId, {
                    onSuccess: () => {
                      setDeleteConfirmId(null);
                      toast({ title: "Projekt gelöscht", description: "Das Projekt wurde erfolgreich gelöscht." });
                    },
                    onError: () => {
                      toast({ title: "Fehler", description: "Das Projekt konnte nicht gelöscht werden.", variant: "destructive" });
                    },
                  });
                }
              }}
              data-testid="button-confirm-delete-project"
            >
              {deleteProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectMapDialog projects={projects || []} open={mapOpen} onOpenChange={setMapOpen} />
    </Layout>
  );
}
