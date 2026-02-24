import { Link, useLocation } from "wouter";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useMyProfile } from "@/hooks/use-users";
import { Home, FolderKanban, Calendar, FileCheck, LogOut, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: profile } = useMyProfile();
  
  const role = profile?.role || 'client';
  
  const items = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Inspections", url: "/inspections", icon: FileCheck },
  ];

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/50">
        <div className="flex items-center gap-3 w-full px-2">
          <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/20">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight truncate">Bauwerksbuch</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        transition-all duration-200 py-5
                        ${isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground hover:text-foreground"}
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <div className="mt-auto p-4 border-t border-border/50 bg-background/30">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground capitalize">{role}</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent/50 border-border/50"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
        <AppSidebar />
        <div className="flex flex-col flex-1 relative overflow-hidden">
          <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
