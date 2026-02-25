import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  let colorClass = "bg-secondary text-secondary-foreground";
  
  if (status === "active" || status === "OK") {
    colorClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
  } else if (status === "needs_repair") {
    colorClass = "bg-amber-500/15 text-amber-400 border border-amber-500/30";
  } else if (status === "urgent") {
    colorClass = "bg-destructive/15 text-destructive border border-destructive/30";
  } else if (status === "completed") {
    colorClass = "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30";
  }

  return (
    <Badge variant="outline" className={`font-medium px-2.5 py-0.5 capitalize shadow-sm ${colorClass} no-default-hover-elevate no-default-active-elevate`}>
      {status.replace("_", " ")}
    </Badge>
  );
}
