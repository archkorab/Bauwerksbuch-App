import { useState } from "react";
import { Layout } from "@/components/layout";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-users";
import { useProfile } from "@/hooks/use-profile";
import { Link } from "wouter";
import { 
  Building, 
  MapPin, 
  Calendar as CalendarIcon, 
  Plus, 
  FolderGit2, 
  CheckCircle2, 
  Clock,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  clientId: z.string().min(1, "Client is required"),
  status: z.enum(["active", "completed", "archived"]),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

export default function Dashboard() {
  const { data: projects, isLoading } = useProjects();
  const { data: profile } = useProfile();
  const { data: clients } = useClients();
  const createProject = useCreateProject();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { status: "active" }
  });

  const onSubmit = (data: CreateProjectForm) => {
    createProject.mutate(data, {
      onSuccess: () => setIsDialogOpen(false)
    });
  };

  const isAdminOrEngineer = profile?.role === "admin" || profile?.role === "engineer";

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const activeProjects = projects?.filter(p => p.status === 'active')?.length || 0;
  const completedProjects = projects?.filter(p => p.status === 'completed')?.length || 0;

  return (
    <Layout>
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Projects Dashboard</h1>
          <p className="text-muted-foreground">Overview of all active construction sites and documentation.</p>
        </div>
        
        {isAdminOrEngineer && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" data-testid="button-add-project">
                <Plus className="w-4 h-4 mr-2" /> Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input id="name" {...register("name")} className="bg-background border-border focus:ring-primary/20" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...register("address")} className="bg-background border-border focus:ring-primary/20" />
                  {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Assign Client</Label>
                  <Select onValueChange={(val) => setValue("clientId", val)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={createProject.isPending}>
                  {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Project
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <FolderGit2 className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Projects</p>
            <h3 className="text-3xl font-display font-bold text-foreground">{projects?.length || 0}</h3>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Active Projects</p>
            <h3 className="text-3xl font-display font-bold text-foreground">{activeProjects}</h3>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Needs Inspection</p>
            <h3 className="text-3xl font-display font-bold text-foreground">
              {projects?.filter(p => p.nextInspectionDue && new Date(p.nextInspectionDue) < new Date()).length || 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects?.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card/30">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-foreground mb-1">No projects found</h3>
            <p className="text-muted-foreground">You don't have any assigned projects yet.</p>
          </div>
        ) : (
          projects?.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="group bg-card border border-border rounded-2xl p-6 hover-elevate cursor-pointer h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center border border-border">
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider
                    ${project.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      project.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                      'bg-muted text-muted-foreground border-border'}`}>
                    {project.status}
                  </span>
                </div>
                
                <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                
                <div className="space-y-3 mt-auto pt-4">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{project.address}</span>
                  </div>
                  
                  {project.nextInspectionDue && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="w-4 h-4 shrink-0" />
                      <span>Next Inspection: <strong className="text-foreground">{format(new Date(project.nextInspectionDue), 'MMM d, yyyy')}</strong></span>
                    </div>
                  )}
                  
                  {isAdminOrEngineer && project.client && (
                    <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">
                        {project.client.firstName?.[0]}{project.client.lastName?.[0]}
                      </div>
                      <div className="text-xs">
                        <p className="text-muted-foreground font-medium uppercase tracking-wider">Client</p>
                        <p className="text-foreground font-semibold">{project.client.firstName} {project.client.lastName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </Layout>
  );
}
