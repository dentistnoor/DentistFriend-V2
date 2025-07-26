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

export function formatGender(gender: string): string {
  if (!gender) return "";

  // Handle different gender formats
  switch (gender.toUpperCase()) {
    case "M":
    case "MALE":
      return "Male";
    case "F":
    case "FEMALE":
      return "Female";
    case "O":
    case "OTHER":
      return "Other";
    default:
      return gender; // Return as-is if it's already in full form
  }
}

export function formatGenderForDB(gender: string): string {
  if (!gender) return "";

  // Convert full form back to single character for database storage
  switch (gender.toLowerCase()) {
    case "male":
      return "M";
    case "female":
      return "F";
    case "other":
      return "O";
    default:
      return gender; // Return as-is if it's already single character
  }
}
