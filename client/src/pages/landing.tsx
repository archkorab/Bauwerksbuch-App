import { useState } from "react";
import { ShieldCheck, Building2, TrendingUp, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import logoPath from "@assets/logo_1772006994795.png";
import { useAuth } from "@/hooks/use-auth";

export default function LandingPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      login.mutate({ email, password }, {
        onError: (err: any) => setError(err.message),
      });
    } else {
      if (password.length < 6) {
        setError("Passwort muss mindestens 6 Zeichen lang sein");
        return;
      }
      register.mutate({ email, password, firstName, lastName }, {
        onError: (err: any) => setError(err.message),
      });
    }
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden selection:bg-primary/20">
      
      {/* Left Panel: Hero & Branding */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 lg:p-24 relative z-10 border-r border-border/50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-3xl"></div>
          <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-accent/[0.05] blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.02] blur-3xl"></div>
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>
        </div>
        <div className="relative z-10">
          <img src={logoPath} alt="Archkorab Bauwerksbuch" className="max-w-[220px] h-auto" data-testid="img-landing-logo" />
        </div>

        <div className="max-w-2xl my-20 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
            <ShieldCheck className="w-4 h-4" /> Enterprise-Qualität
          </div>
          <h2 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8 text-foreground">
            Der Standard im <br/>
            <span className="text-gradient-primary">Bauwerksbuch</span> <br/>
            Management.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
            Eine zentrale Plattform für Hausverwaltungen, Eigentümer und Sachverständige zur Einsicht in Projektzeitpläne, zum Zugriff auf wichtige Dokumente und zur nahtlosen Verwaltung der Compliance.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Echtzeit-Verfolgung</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Mehrprojektansichten</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground font-medium relative z-10">
          © {new Date().getFullYear()} Archkorab Bauwerksbuch. Alle Rechte vorbehalten.
        </div>
      </div>

      {/* Right Panel: Login/Register */}
      <div className="w-full md:w-[450px] lg:w-[500px] bg-muted/30 flex flex-col justify-center items-center p-8 relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.04] pointer-events-none"></div>
        
        <div className="w-full max-w-sm glass-panel rounded-3xl p-10 flex flex-col relative z-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 border border-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          
          <h3 className="font-display text-2xl font-bold mb-3 text-foreground">
            {mode === "login" ? "Willkommen zurück" : "Konto erstellen"}
          </h3>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            {mode === "login" 
              ? "Melden Sie sich an, um auf Ihre Bauprojekte, Prüfprotokolle und Dokumente zuzugreifen."
              : "Registrieren Sie sich, um Zugang zur Plattform zu erhalten."
            }
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm" data-testid="text-auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vorname</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="Max"
                    data-testid="input-register-firstname"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nachname</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="Mustermann"
                    data-testid="input-register-lastname"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="name@beispiel.at"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-12"
                  placeholder="••••••••"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 px-6 rounded-xl font-semibold bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:pointer-events-none"
              data-testid="button-submit-auth"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Anmelden" : "Registrieren"}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? (
                <>Noch kein Konto? <button onClick={() => { setMode("register"); setError(""); }} className="text-primary font-semibold hover:underline" data-testid="button-switch-register">Registrieren</button></>
              ) : (
                <>Bereits ein Konto? <button onClick={() => { setMode("login"); setError(""); }} className="text-primary font-semibold hover:underline" data-testid="button-switch-login">Anmelden</button></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
