import { Layout } from "@/components/layout";
import { useProjects } from "@/hooks/use-projects";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Building2, MapPin, Calendar, ArrowRight, Activity, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useMyProfile } from "@/hooks/use-users";

export default function Dashboard() {
  const { data: projects, isLoading } = useProjects();
  const { data: profile } = useMyProfile();
  const isAdmin = profile?.role === "admin" || profile?.role === "engineer";

  const activeProjects = projects?.filter(p => p.status === "active") || [];
  const urgentCount = projects?.filter(p => p.status === "urgent").length || 0;

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-lg">Overview of your construction portfolio.</p>
          </div>
          {isAdmin && (
            <Button className="shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
              <Building2 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{projects?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
              <Activity className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeProjects.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Urgent Actions</CardTitle>
              <Activity className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{urgentCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Next Inspection</CardTitle>
              <Calendar className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold mt-1 truncate">
                {activeProjects.find(p => p.nextInspectionDue)?.nextInspectionDue 
                  ? format(new Date(activeProjects.find(p => p.nextInspectionDue)!.nextInspectionDue!), "MMM d, yyyy")
                  : "None scheduled"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project List */}
        <div>
          <h2 className="text-2xl font-display font-semibold mb-6">Recent Projects</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 rounded-xl bg-secondary/50 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : projects?.length === 0 ? (
            <div className="text-center py-16 px-4 bg-secondary/20 rounded-2xl border border-border/50 border-dashed">
              <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No projects found</h3>
              <p className="text-muted-foreground mt-1">You don't have any projects assigned yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects?.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="group cursor-pointer bg-card hover:bg-secondary/40 border-border/60 hover:border-primary/30 transition-all duration-300 h-full flex flex-col hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 overflow-hidden">
                    <div className="h-2 w-full bg-gradient-to-r from-primary/40 to-primary/10" />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <StatusBadge status={project.status} />
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
                      </div>
                      <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{project.address}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-4">
                      <div className="bg-background rounded-lg p-3 border border-border/50 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Next Inspection</span>
                        <span className="font-medium text-foreground">
                          {project.nextInspectionDue 
                            ? format(new Date(project.nextInspectionDue), "MMM d, yyyy")
                            : "TBD"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
