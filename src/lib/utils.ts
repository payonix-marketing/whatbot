import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string | null | undefined) {
  if (!name) return "??";
  const names = name.trim().split(' ');
  if (names.length === 1 && names[0]) return names[0].substring(0, 2).toUpperCase();
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}