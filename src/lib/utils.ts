// src/lib/utils.ts (CLEANED)

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// Removed axios import

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Renamed function, uses KES
export function formatCurrency(price: number | string | null | undefined, currency = "KES"): string {
  const numericAmount = typeof price === 'string' ? parseFloat(price) : price;
  if (numericAmount === null || numericAmount === undefined || isNaN(numericAmount)) {
     return new Intl.NumberFormat("en-KE", { style: "currency", currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0);
  }
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency, // Use KES or the passed currency
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

// Kept truncateString as it might be useful
export function truncateString(str: string, length: number): string {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

// --- REMOVED ALL PESAPAL RELATED FUNCTIONS ---