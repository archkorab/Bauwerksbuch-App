import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function displayName(user: { firstName?: string | null; lastName?: string | null; email?: string | null; profile?: { company?: string | null } | null }, fallback?: string): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const company = user.profile?.company;
  if (name && company) return `${name}, ${company}`;
  if (name) return name;
  if (company) return company;
  return user.email || fallback || '—';
}

export function displayInitials(user: { firstName?: string | null; lastName?: string | null; profile?: { company?: string | null } | null }): string {
  if (user.firstName || user.lastName) {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  }
  const company = user.profile?.company;
  if (company) return company.substring(0, 2).toUpperCase();
  return '??';
}
