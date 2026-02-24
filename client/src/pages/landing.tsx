import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, ShieldCheck, FileCheck, CalendarClock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      <header className="h-20 border-b border-border/40 bg-background/50 backdrop-blur-xl fixed top-0 w-full z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Bauwerksbuch</span>
        </div>
        <Button 
          onClick={() => window.location.href = '/api/login'}
          className="rounded-full px-6 font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
        >
          Client Portal Login
        </Button>
      </header>

      <main className="flex-1 flex flex-col mt-20">
        {/* Hero Section */}
        <section className="relative flex-1 flex items-center justify-center py-20 lg:py-32 px-6 overflow-hidden">
          {/* Abstract background gradient */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-white/10 backdrop-blur-md mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-muted-foreground">Secure Architecture Management</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1] mb-8 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
              Elevate your <br className="hidden sm:block" /> construction overview.
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              The central hub for clients and engineers to manage building logs, track inspections, and securely share critical architectural documentation.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                size="lg" 
                className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1"
              >
                Access Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Bento */}
        <section className="py-24 px-6 bg-secondary/30 border-t border-border/50">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <FileCheck className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-3">Inspection Logs</h3>
                <p className="text-muted-foreground leading-relaxed">Access real-time reports and status updates from on-site engineers instantly.</p>
              </div>
              
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <ShieldCheck className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-3">Secure Documents</h3>
                <p className="text-muted-foreground leading-relaxed">End-to-end encrypted storage for blueprints, permits, and sensitive files.</p>
              </div>
              
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CalendarClock className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-3">Project Timeline</h3>
                <p className="text-muted-foreground leading-relaxed">Track critical milestones, upcoming deadlines, and scheduled site visits.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 border-t border-border/40 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Bauwerksbuch-Archkorab Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
