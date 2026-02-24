import { Layout } from "@/components/layout";
import { useProjects } from "@/hooks/use-projects";
// To get all inspections easily, one would ideally have a global endpoint. 
// For UI completeness, we will simulate a view that would fetch from global.
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { FileCheck, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function InspectionsGlobal() {
  const { data: projects, isLoading } = useProjects();
  
  // Aggregate inspections from loaded projects (in real app, use global hook)
  const allInspections = projects?.flatMap(p => 
    p.inspections?.map(i => ({...i, projectName: p.name})) || []
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold">Global Inspection Log</h1>
            <p className="text-muted-foreground mt-2 text-lg">Central registry of all site inspections.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search records..." className="pl-9 bg-card/50 border-border/60" />
            </div>
            <Button variant="outline" size="icon" className="shrink-0 border-border/60">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="bg-card/40 border-border/60 overflow-hidden backdrop-blur-md shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Date</TableHead>
                  <TableHead className="font-semibold text-foreground">Project</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">Inspector</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="animate-pulse w-full h-4 bg-secondary/50 rounded" />
                    </TableCell>
                  </TableRow>
                ) : allInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      <FileCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      No inspections logged across any projects.
                    </TableCell>
                  </TableRow>
                ) : (
                  allInspections.map((insp) => (
                    <TableRow key={insp.id} className="border-border/40 hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {format(new Date(insp.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {insp.projectName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={insp.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {insp.engineer?.firstName || insp.engineer?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
