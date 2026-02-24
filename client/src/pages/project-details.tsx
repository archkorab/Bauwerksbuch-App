import { useState, Fragment } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { MapPlaceholder } from "@/components/map-placeholder";
import { useProject } from "@/hooks/use-projects";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import { useEvents, useCreateEvent } from "@/hooks/use-events";
import { useInspections, useCreateInspection } from "@/hooks/use-inspections";
import { useProfile } from "@/hooks/use-profile";
import { format } from "date-fns";
import { 
  Building, MapPin, Calendar, FileText, ChevronRight, Download, Clock, CheckCircle2, AlertTriangle, Plus, Upload, Loader2, CornerDownRight, Hash, MapPinned
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export default function ProjectDetails() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: documents } = useDocuments(projectId);
  const { data: events } = useEvents(projectId);
  const { data: inspections } = useInspections(projectId);
  const { data: profile } = useProfile();
  
  const createDocument = useCreateDocument();
  const createEvent = useCreateEvent();
  const createInspection = useCreateInspection();
  
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const isAdminOrEngineer = profile?.role === "admin" || profile?.role === "engineer";

  const { register: docReg, handleSubmit: handleDocSubmit } = useForm({
    defaultValues: { name: "", type: "pdf", url: "https://example.com/dummy.pdf", uploadedBy: profile?.userId || "" }
  });

  const onDocSubmit = (data: any) => {
    createDocument.mutate({ projectId, data: { ...data, uploadedBy: profile!.userId } }, {
      onSuccess: () => setDocDialogOpen(false)
    });
  };

  const { register: eventReg, handleSubmit: handleEventSubmit } = useForm({
    defaultValues: { title: "", description: "", type: "inspection" }
  });

  const onEventSubmit = (data: any) => {
    // Requires date coercion
    createEvent.mutate({ 
      ...data, 
      projectId, 
      date: new Date(data.date).toISOString() 
    }, {
      onSuccess: () => setEventDialogOpen(false)
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
          <span>Projects</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{project.name}</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">{project.name}</h1>
              <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-widest
                ${project.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                  project.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                  'bg-muted text-muted-foreground border-border'}`}>
                {project.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{project.address}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-display font-bold text-lg mb-4">Project Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Client</p>
                <p className="font-medium">{project.client?.firstName} {project.client?.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Created On</p>
                <p className="font-medium">{format(new Date(project.createdAt!), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Next Inspection</p>
                <p className="font-medium">{project.nextInspectionDue ? format(new Date(project.nextInspectionDue), 'MMMM d, yyyy') : 'Not scheduled'}</p>
              </div>
            </div>
          </div>

          <div className="h-64 rounded-2xl overflow-hidden shadow-sm">
            <MapPlaceholder />
          </div>
        </div>

        {/* Right Column: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="bg-card border border-border p-1 rounded-xl mb-6">
              <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Documents</TabsTrigger>
              <TabsTrigger value="inspections" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Inspections</TabsTrigger>
              <TabsTrigger value="events" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Timeline Events</TabsTrigger>
            </TabsList>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xl">Project Documents</h3>
                {isAdminOrEngineer && (
                  <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-card border-border hover:bg-white/5">
                        <Upload className="w-4 h-4 mr-2" /> Upload
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Upload Document Metadata</DialogTitle></DialogHeader>
                      <form onSubmit={handleDocSubmit(onDocSubmit)} className="space-y-4">
                        <div className="space-y-2"><Label>Document Name</Label><Input {...docReg("name")} required className="bg-background"/></div>
                        <div className="space-y-2"><Label>File Type</Label><Input {...docReg("type")} defaultValue="pdf" className="bg-background"/></div>
                        <Button type="submit" className="w-full" disabled={createDocument.isPending}>Submit</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {documents?.length === 0 ? (
                   <div className="p-8 text-center text-muted-foreground">No documents uploaded yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {documents?.map(doc => (
                      <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(doc.createdAt!), 'MMM d, yyyy')} • {doc.type.toUpperCase()}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Inspections Tab */}
            <TabsContent value="inspections" className="space-y-6" data-testid="tab-inspections">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xl">Inspection Logbook</h3>
              </div>
              <div className="space-y-6">
                {inspections?.length === 0 ? (
                  <div className="p-8 text-center bg-card border border-border rounded-2xl text-muted-foreground">No inspections logged.</div>
                ) : (
                  inspections?.map(ins => {
                    const primaryDefects = ins.defects?.filter((d: any) => !d.parentDefectId) || [];
                    const followUps = ins.defects?.filter((d: any) => d.parentDefectId) || [];
                    
                    return (
                      <div key={ins.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden" data-testid={`inspection-card-${ins.id}`}>
                        {/* Inspection Header */}
                        <div className="p-5 border-b border-border">
                          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border
                                ${ins.status === 'OK' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                  ins.status === 'urgent' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                                  'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                {ins.status === 'OK' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-lg">Primary Inspection — {format(new Date(ins.date), 'MMM d, yyyy')}</p>
                                <p className="text-sm text-muted-foreground mt-1">{ins.notes || 'No notes provided.'}</p>
                                {ins.engineer && (
                                  <p className="text-xs text-muted-foreground mt-2 font-medium">Engineer: {ins.engineer.firstName} {ins.engineer.lastName}</p>
                                )}
                              </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase shrink-0
                              ${ins.status === 'OK' ? 'text-emerald-500 border-emerald-500/30' : 
                                ins.status === 'urgent' ? 'text-destructive border-destructive/30' : 
                                'text-amber-500 border-amber-500/30'}`}>
                              {ins.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Defects Table */}
                        {ins.defects && ins.defects.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" data-testid={`defects-table-${ins.id}`}>
                              <thead>
                                <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                                  <th className="text-left px-5 py-3 font-semibold">Defect ID</th>
                                  <th className="text-left px-5 py-3 font-semibold">Date of Finding</th>
                                  <th className="text-left px-5 py-3 font-semibold">Description</th>
                                  <th className="text-left px-5 py-3 font-semibold">Location</th>
                                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {primaryDefects.map((defect: any) => {
                                  const children = followUps.filter((f: any) => f.parentDefectId === defect.id);
                                  return (
                                    <Fragment key={defect.id}>
                                      <tr key={defect.id} className="hover:bg-white/[0.02] transition-colors" data-testid={`defect-row-${defect.defectId}`}>
                                        <td className="px-5 py-3">
                                          <div className="flex items-center gap-2">
                                            <Hash className="w-3.5 h-3.5 text-primary" />
                                            <span className="font-mono font-semibold text-primary">{defect.defectId}</span>
                                          </div>
                                        </td>
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
                                            ${defect.status === 'resolved' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : 
                                              defect.status === 'in_progress' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : 
                                              'text-destructive border-destructive/30 bg-destructive/10'}`}>
                                            {defect.status.replace('_', ' ')}
                                          </span>
                                        </td>
                                      </tr>
                                      {children.map((child: any) => (
                                        <tr key={child.id} className="bg-muted/10 hover:bg-white/[0.02] transition-colors" data-testid={`defect-row-${child.defectId}`}>
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-2 pl-4">
                                              <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground" />
                                              <span className="font-mono font-semibold text-muted-foreground">{child.defectId}</span>
                                            </div>
                                          </td>
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
                                              ${child.status === 'resolved' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : 
                                                child.status === 'in_progress' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : 
                                                'text-destructive border-destructive/30 bg-destructive/10'}`}>
                                              {child.status.replace('_', ' ')}
                                            </span>
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

                        {(!ins.defects || ins.defects.length === 0) && (
                          <div className="px-5 py-4 text-sm text-muted-foreground">No defects recorded for this inspection.</div>
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
                <h3 className="font-display font-bold text-xl">Project Timeline</h3>
                {isAdminOrEngineer && (
                  <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-card border-border hover:bg-white/5">
                        <Plus className="w-4 h-4 mr-2" /> Add Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Schedule Event</DialogTitle></DialogHeader>
                      <form onSubmit={handleEventSubmit(onEventSubmit)} className="space-y-4">
                        <div className="space-y-2"><Label>Title</Label><Input {...eventReg("title")} required className="bg-background"/></div>
                        <div className="space-y-2"><Label>Date</Label><Input type="date" {...eventReg("date")} required className="bg-background"/></div>
                        <div className="space-y-2"><Label>Description</Label><Input {...eventReg("description")} className="bg-background"/></div>
                        <Button type="submit" className="w-full" disabled={createEvent.isPending}>Add Event</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="bg-card border border-border rounded-2xl p-6">
                {events?.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No upcoming events.</div>
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
      </div>
    </Layout>
  );
}
