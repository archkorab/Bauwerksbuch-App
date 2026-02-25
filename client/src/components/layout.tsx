import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { 
  Building2, 
  CalendarDays, 
  ClipboardCheck, 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  UserCog
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();

  const role = profile?.role || "eigentuemer";
  const isAdmin = role === "admin";

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    hausverwaltung: "Hausverwaltung",
    eigentuemer: "Eigentümer",
  };

  const navItems = [
    { name: "Übersicht", id: "dashboard", href: "/projects", icon: LayoutDashboard },
    { name: "Kalender", id: "calendar", href: "/calendar", icon: CalendarDays },
    { name: "Prüfprotokoll", id: "inspections", href: "/inspections", icon: ClipboardCheck },
    ...(role === "admin" ? [{ name: "Benutzerverwaltung", id: "user-management", href: "/admin/users", icon: UserCog }] : []),
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col justify-between hidden md:flex z-20 shadow-xl shadow-black/50">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-lg shadow-primary/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight tracking-tight text-foreground">Archkorab</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bauwerksbuch</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Plattform</div>
            {navItems.map((item) => {
              const isActive = location === item.href || (location === "/" && item.href === "/projects");
              return (
                <Link key={item.id} href={item.href} className="block" data-testid={`link-nav-${item.id}`}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                      ${isActive 
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-inner" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                      }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                    <span className="font-medium text-sm">{item.name}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-border">
            <div className="bg-background/50 border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Benutzer" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email || 'Benutzer'}
                </p>
                <p className="text-xs text-primary font-medium uppercase tracking-wider">{roleLabels[role] || role}</p>
              </div>
            </div>
            <Button 
              data-testid="button-logout"
              variant="ghost" 
              className="w-full justify-start gap-3 mt-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4" />
              Abmelden
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-background to-background">
        <div className="flex-1 overflow-auto p-4 md:p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
