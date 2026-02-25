interface MapPlaceholderProps {
  address?: string;
  latitude?: string | null;
  longitude?: string | null;
}

export function MapPlaceholder({ address, latitude, longitude }: MapPlaceholderProps) {
  const query = latitude && longitude
    ? `${latitude},${longitude}`
    : address || "";

  if (!query) {
    return (
      <div className="w-full h-full min-h-[300px] rounded-2xl overflow-hidden relative border border-border bg-muted/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Keine Adresse verfügbar</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px] rounded-2xl overflow-hidden relative border border-border">
      <iframe
        className="w-full h-full min-h-[300px]"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=m&z=15&output=embed&iwloc=near`}
        allowFullScreen
      />
    </div>
  );
}
