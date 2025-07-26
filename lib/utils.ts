import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toLocaleDateString("en-GB");
  }
  return date.toLocaleDateString("en-GB");
}

export function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return date.toISOString().split("T")[0];
}

export function getTodayDateForInput(): string {
  return new Date().toISOString().split("T")[0];
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
      return gender;
  }
}

export function formatGenderForDB(gender: string): string {
  if (!gender) return "";

  switch (gender.toLowerCase()) {
    case "male":
      return "M";
    case "female":
      return "F";
    case "other":
      return "O";
    default:
      return gender;
  }
}
