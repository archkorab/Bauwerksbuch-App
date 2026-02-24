import { ShieldCheck, Building2, TrendingUp, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden selection:bg-primary/30">
      
      {/* Left Panel: Hero & Branding */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 lg:p-24 relative z-10 border-r border-border/50 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight text-foreground">Archkorab</h1>
            <p className="text-xs text-primary font-bold uppercase tracking-[0.2em]">Bauwerksbuch</p>
          </div>
        </div>

        <div className="max-w-2xl my-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
            <ShieldCheck className="w-4 h-4" /> Enterprise-Qualität
          </div>
          <h2 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8">
            Der Standard im <br/>
            <span className="text-gradient-primary">Bauwerkszyklus</span> <br/>
            Management.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
            Eine zentrale Plattform für Auftraggeber und Ingenieure zur Einsicht in Projektzeitpläne, zum Zugriff auf wichtige Dokumente und zur nahtlosen Verwaltung der Compliance.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Echtzeit-Verfolgung</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Mehrprojektansichten</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          © {new Date().getFullYear()} Archkorab Bauwerksbuch. Alle Rechte vorbehalten.
        </div>
      </div>

      {/* Right Panel: Login Action */}
      <div className="w-full md:w-[450px] lg:w-[500px] bg-card/30 flex flex-col justify-center items-center p-8 relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.03] mix-blend-luminosity pointer-events-none"></div>
        
        <div className="w-full max-w-sm glass-panel rounded-3xl p-10 flex flex-col relative z-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 border border-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          
          <h3 className="font-display text-2xl font-bold mb-3 text-foreground">Willkommen zurück</h3>
          <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
            Melden Sie sich mit Ihrem Replit-Konto an, um auf Ihre Bauprojekte, Prüfprotokolle und sicher gespeicherte Dokumente zuzugreifen.
          </p>

          <button 
            data-testid="button-login"
            onClick={() => window.location.href = '/api/login'}
            className="w-full py-4 px-6 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            Zur Plattform
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="mt-8 text-center border-t border-border/50 pt-8">
            <p className="text-xs text-muted-foreground">
              Mit dem Zugriff auf die Plattform stimmen Sie den <a href="#" className="text-primary hover:underline">Nutzungsbedingungen</a> zu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
