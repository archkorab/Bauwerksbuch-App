import { useParams } from "wouter";
import { Layout } from "@/components/layout";
import { useProject } from "@/hooks/use-projects";
import { useDocuments } from "@/hooks/use-documents";
import { useEvents } from "@/hooks/use-events";
import { useInspections } from "@/hooks/use-inspections";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, FileText, Download, Building2, User, FileCheck, Clock, Plus, Map as MapIcon } from "lucide-react";
import { format } from "date-fns";

export default function ProjectDetails() {
  const { id } = useParams();
  const projectId = parseInt(id || "0", 10);
  
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: documents } = useDocuments(projectId);
  const { data: events } = useEvents(projectId);
  const { data: inspections } = useInspections(projectId);

  if (projectLoading) {
    return <Layout><div className="animate-pulse h-96 bg-secondary/30 rounded-2xl" /></Layout>;
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-24">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <p className="text-muted-foreground">This project doesn't exist or you don't have access.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        {/* Header Header */}
        <div className="bg-card/50 border border-border/60 p-6 lg:p-8 rounded-3xl backdrop-blur-md shadow-lg shadow-black/20">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={project.status} />
                <span className="text-sm text-muted-foreground">ID: PRJ-{project.id.toString().padStart(4, '0')}</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-display font-bold">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {project.address}
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Client: {project.client?.firstName || project.client?.email || 'Unknown'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="border-border/60 hover:bg-secondary/80">
                Generate Report
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-secondary/40 p-1 rounded-xl w-full max-w-2xl h-auto grid grid-cols-4 mb-8 border border-border/50">
            <TabsTrigger value="overview" className="rounded-lg py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary">Overview</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary">Documents</TabsTrigger>
            <TabsTrigger value="inspections" className="rounded-lg py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary">Inspections</TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Map Placeholder */}
              <Card className="lg:col-span-2 overflow-hidden border-border/60 bg-card/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapIcon className="w-5 h-5 text-primary" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full h-[400px] bg-secondary/30 relative flex items-center justify-center">
                    {/* Stylized Grid Background */}
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                      <div className="w-16 h-16 bg-primary/20 rounded-full animate-ping absolute" />
                      <div className="bg-background border-2 border-primary p-3 rounded-full relative z-10 shadow-xl shadow-primary/30">
                        <Building2 className="w-8 h-8 text-primary" />
                      </div>
                      <div className="mt-4 px-4 py-2 bg-card border border-border/50 rounded-lg shadow-lg relative z-10 text-sm font-medium">
                        {project.latitude && project.longitude 
                          ? `${project.latitude}, ${project.longitude}`
                          : project.address}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Info */}
              <div className="space-y-6">
                <Card className="bg-card/40 border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg">Project Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Created</div>
                      <div className="font-medium">
                        {project.createdAt ? format(new Date(project.createdAt), "MMMM d, yyyy") : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Next Inspection</div>
                      <div className="font-medium text-blue-400">
                        {project.nextInspectionDue ? format(new Date(project.nextInspectionDue), "MMMM d, yyyy") : 'Not Scheduled'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/40 border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {documents && documents.length > 0 ? (
                      <div className="space-y-3">
                        {documents.slice(0, 3).map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{doc.name}</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No documents yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-display font-semibold">Project Documents</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Upload Document
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents?.map(doc => (
                <Card key={doc.id} className="bg-card/40 border-border/60 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-primary/10 p-3 rounded-xl text-primary">
                        <FileText className="w-6 h-6" />
                      </div>
                      <Badge variant="outline" className="text-xs font-mono uppercase bg-background border-border/60">{doc.type}</Badge>
                    </div>
                    <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">{doc.name}</h3>
                    <p className="text-xs text-muted-foreground mt-auto pt-4">
                      Uploaded {doc.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy") : 'Unknown'}
                    </p>
                    <Button variant="secondary" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {(!documents || documents.length === 0) && (
                <div className="col-span-full py-16 text-center border border-dashed border-border/60 rounded-xl bg-card/20">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No documents uploaded.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inspections" className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-display font-semibold">Inspection Log</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Log Inspection
              </Button>
            </div>
            <div className="space-y-4">
              {inspections?.map(insp => (
                <Card key={insp.id} className="bg-card/40 border-border/60">
                  <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-secondary p-3 rounded-full border border-border/50 shadow-inner mt-1">
                        <FileCheck className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-lg">
                            {format(new Date(insp.date), "MMMM d, yyyy")}
                          </h4>
                          <StatusBadge status={insp.status} />
                        </div>
                        <p className="text-muted-foreground">
                          Inspector: {insp.engineer?.firstName || insp.engineer?.email || 'Unknown'}
                        </p>
                        {insp.notes && (
                          <div className="mt-3 p-3 bg-background rounded-lg border border-border/40 text-sm italic text-muted-foreground">
                            "{insp.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                    {insp.reportUrl && (
                      <Button variant="outline" className="md:ml-auto whitespace-nowrap">
                        <Download className="w-4 h-4 mr-2" /> Report
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!inspections || inspections.length === 0) && (
                <div className="text-center py-12 bg-secondary/20 rounded-xl border border-border/50">
                  <p className="text-muted-foreground">No inspection records found.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6 animate-in fade-in-50 duration-500">
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-display font-semibold">Project Timeline</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Add Event
              </Button>
            </div>
            <div className="relative pl-6 sm:pl-8 py-4 space-y-8 before:absolute before:inset-0 before:ml-8 sm:before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {events?.map((event, index) => (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 absolute left-0 md:left-1/2 -translate-x-1/2">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] pl-4 md:pl-0 md:group-odd:pr-8 md:group-even:pl-8">
                    <Card className="bg-card/60 backdrop-blur-sm border-border/60 hover:border-primary/40 transition-colors shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="capitalize text-xs font-medium">
                            {event.type}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground">
                            {format(new Date(event.date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <h4 className="font-bold text-foreground mb-1">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
              {(!events || events.length === 0) && (
                <div className="text-center py-12 relative z-10 bg-background">
                  <p className="text-muted-foreground">No events recorded yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

import { Badge } from "@/components/ui/badge";
