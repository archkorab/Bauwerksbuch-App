import { Layout } from "@/components/layout";
import { useEvents } from "@/hooks/use-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, MapPin, Building2 } from "lucide-react";
import { format, isSameDay } from "date-fns";

export default function CalendarPage() {
  const { data: events, isLoading } = useEvents();

  // Basic grouped by date representation for a list-view calendar approach
  const sortedEvents = events?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl lg:text-4xl font-display font-bold">Calendar & Events</h1>
          <p className="text-muted-foreground mt-2 text-lg">Upcoming deadlines, inspections, and milestones.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary/30 rounded-xl animate-pulse" />)}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="text-center py-20 bg-secondary/10 rounded-3xl border border-dashed border-border/50">
            <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-medium">No upcoming events</h3>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border/50">
            {sortedEvents.map(event => (
              <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-primary text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 absolute left-6 md:left-1/2 -translate-x-1/2">
                </div>
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] pl-10 md:pl-0 md:group-odd:pr-8 md:group-even:pl-8">
                  <Card className="bg-card/40 backdrop-blur-sm border-border/60 shadow-lg shadow-black/10 hover:border-primary/40 transition-colors group-hover:shadow-primary/5">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-primary font-mono text-sm">
                          {format(new Date(event.date), "EEEE, MMM d")}
                        </span>
                        <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{event.type}</Badge>
                      </div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {event.description && <p className="text-sm text-muted-foreground mb-4">{event.description}</p>}
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground bg-secondary/50 inline-flex px-3 py-1.5 rounded-md border border-border/50">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Project ID: {event.projectId}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
import { Badge } from "@/components/ui/badge";
