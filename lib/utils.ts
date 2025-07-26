import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  return date.toLocaleDateString("en-GB"); // DD/MM/YYYY format
}

export function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split("T")[0]; // Return today's date if invalid
  }
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format for HTML input
}

export function getTodayDateForInput(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD format for HTML input
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
