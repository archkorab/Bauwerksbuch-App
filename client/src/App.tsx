import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "./pages/landing";
import Dashboard from "./pages/dashboard";
import ProjectDetails from "./pages/project-details";
import CalendarPage from "./pages/calendar";
import InspectionsGlobal from "./pages/inspections-global";
import UserManagement from "./pages/user-management";
import SettingsPage from "./pages/settings";
import ProfilePage from "./pages/profile";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";

function RootRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, always show landing page at root
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        {/* Fallback for unauthenticated users */}
        <Route component={LandingPage} />
      </Switch>
    );
  }

  // Authenticated routes mapped accurately
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Dashboard} />
      <Route path="/projects/:id" component={ProjectDetails} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/inspections" component={InspectionsGlobal} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RootRouter />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
