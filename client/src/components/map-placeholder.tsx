import { MapPin } from "lucide-react";

export function MapPlaceholder() {
  return (
    <div className="w-full h-full min-h-[300px] rounded-2xl overflow-hidden relative border border-border group bg-card">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="relative">
          <div className="w-12 h-12 bg-primary/20 rounded-full animate-ping absolute -inset-1 z-0"></div>
          <div className="w-10 h-10 bg-primary rounded-full border-4 border-background flex items-center justify-center relative z-10 shadow-lg shadow-primary/40">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-md border border-border rounded-xl p-3 text-xs text-muted-foreground shadow-lg font-medium">
        Location mapping enabled by system coordinates.
      </div>
    </div>
  );
}
