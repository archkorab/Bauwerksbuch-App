import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function displayName(user: { title?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; profile?: { company?: string | null } | null }, fallback?: string): string {
  const name = [user.title, user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const company = user.profile?.company;
  if (name) return name;
  if (company) return company;
  return user.email || fallback || '—';
}

export function formatAddr(addr: string | null | undefined): string {
  if (!addr) return "";
  let s = addr
    .replace(/,?\s*[ÖO]sterreich\s*$/i, "")
    .replace(/,?\s*Austria\s*$/i, "")
    .trim();
  const m = s.match(/^(.*?),\s*(\d{4}\s+\S.*)$/);
  if (m) return `${m[2].trim()}, ${m[1].trim()}`;
  return s;
}

export function displayInitials(user: { firstName?: string | null; lastName?: string | null; profile?: { company?: string | null } | null }): string {
  if (user.firstName || user.lastName) {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  }
  const company = user.profile?.company;
  if (company) return company.substring(0, 2).toUpperCase();
  return '??';
}
