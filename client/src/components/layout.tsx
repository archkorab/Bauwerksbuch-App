import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import logoPath from "@assets/logo_1772006994795.png";
import { 
  CalendarDays, 
  ClipboardCheck, 
  FolderOpen,
  LayoutDashboard, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  UserCog,
  Settings,
  ArrowLeftRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout, isImpersonating, stopImpersonation } = useAuth();
  const { data: profile } = useProfile();

  const role = profile?.role || "eigentuemer";

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    hausverwaltung: "Hausverwaltung",
    eigentuemer: "Eigentümer",
  };

  const navItems = [
    { name: "Übersicht", id: "dashboard", href: "/projects", icon: LayoutDashboard },
    { name: "Projekte", id: "projekte", href: "/projekte", icon: FolderOpen },
    { name: "Kalender", id: "calendar", href: "/calendar", icon: CalendarDays },
    { name: "Prüfprotokoll", id: "inspections", href: "/inspections", icon: ClipboardCheck },
    ...(role === "admin" && !isImpersonating ? [{ name: "Einstellungen", id: "settings", href: "/settings", icon: Settings }] : []),
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border bg-card flex flex-col justify-between hidden md:flex z-20 shadow-sm">
        <div className="p-6 flex flex-col h-full">
          <div className="px-2 mb-10">
            <img src={logoPath} alt="Bauwerksbuch - Arch Dipl. Ing. Vera Korab ZT GmbH" className="w-full max-w-[200px] h-auto" />
          </div>

          <nav className="flex-1 space-y-2">
            <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Plattform</div>
            {navItems.map((item) => {
              const isActive = location === item.href || (location === "/" && item.href === "/projects") || (item.href === "/settings" && location === "/admin/users");
              return (
                <Link key={item.id} href={item.href} className="block" data-testid={`link-nav-${item.id}`}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                      ${isActive 
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-inner" 
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
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
            <Link href="/profile" className="block" data-testid="link-nav-profile">
              <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/70 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border overflow-hidden">
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
                <Settings className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
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
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background">
        {isImpersonating && (
          <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between z-30 shadow-md" data-testid="banner-impersonation">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ArrowLeftRight className="w-4 h-4" />
              <span>
                Sie sehen die Ansicht von <strong>{user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}</strong> als {roleLabels[role] || role}
              </span>
              <span className="text-amber-100 text-xs ml-1">(Angemeldet als {(user as any)?.adminName || 'Admin'})</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-amber-600 gap-1.5 h-7 text-xs font-semibold"
              onClick={() => stopImpersonation.mutate()}
              disabled={stopImpersonation.isPending}
              data-testid="button-stop-impersonation"
            >
              <X className="w-3.5 h-3.5" />
              Zurück zu meinem Konto
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
