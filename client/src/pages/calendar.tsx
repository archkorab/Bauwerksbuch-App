import { Layout } from "@/components/layout";
import { useEvents } from "@/hooks/use-events";
import { format, isFuture } from "date-fns";
import { Calendar as CalendarIcon, Clock, Building, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function CalendarPage() {
  const { data: events, isLoading } = useEvents();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  // Sort events by date
  const sortedEvents = events ? [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
  const upcomingEvents = sortedEvents.filter(e => isFuture(new Date(e.date)));
  const pastEvents = sortedEvents.filter(e => !isFuture(new Date(e.date))).reverse();

  return (
    <Layout>
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Global Calendar</h1>
        <p className="text-muted-foreground">Timeline of all upcoming inspections, deadlines, and project milestones.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Upcoming */}
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground mb-6 pb-2 border-b border-border">
            <Clock className="w-5 h-5 text-primary" /> Upcoming Events
          </h2>
          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-2xl text-muted-foreground shadow-sm">No upcoming events scheduled.</div>
            ) : (
              upcomingEvents.map(event => (
                <div key={event.id} className="group flex gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm hover-elevate transition-all">
                  <div className="w-16 flex flex-col items-center justify-center shrink-0 border-r border-border/50 pr-4">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">{format(new Date(event.date), 'MMM')}</span>
                    <span className="text-2xl font-display font-bold text-foreground">{format(new Date(event.date), 'd')}</span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-foreground text-lg line-clamp-1">{event.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{event.description || 'No additional details.'}</p>
                    {event.projectId && (
                      <Link href={`/projects/${event.projectId}`}>
                        <div className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:underline cursor-pointer">
                          <Building className="w-3.5 h-3.5" /> View Project <ChevronRight className="w-3 h-3" />
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Past */}
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-muted-foreground mb-6 pb-2 border-b border-border">
            <CalendarIcon className="w-5 h-5 opacity-70" /> Past Events
          </h2>
          <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity duration-300">
            {pastEvents.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">No past events recorded.</div>
            ) : (
              pastEvents.map(event => (
                <div key={event.id} className="flex gap-4 bg-transparent border border-border rounded-2xl p-4">
                  <div className="w-16 flex flex-col items-center justify-center shrink-0 border-r border-border/50 pr-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{format(new Date(event.date), 'MMM')}</span>
                    <span className="text-xl font-display font-bold text-muted-foreground">{format(new Date(event.date), 'd')}</span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold text-muted-foreground line-clamp-1">{event.title}</h3>
                    {event.projectId && (
                      <Link href={`/projects/${event.projectId}`}>
                        <div className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                          <Building className="w-3.5 h-3.5" /> Project Ref
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
