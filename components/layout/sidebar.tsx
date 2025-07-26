"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  Stethoscope,
  Menu,
  X,
  Upload,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({
  currentPage,
  onPageChange,
  isCollapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [doctorName, setDoctorName] = useState("");

  // Add state for current date and time
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
      };
      const datePart = now.toLocaleDateString("en-US", options);
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const timePart = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
      setDateTime(`${datePart} | ${timePart}`);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadDoctorName = async () => {
      if (!user?.email) return;
      try {
        const db = getFirestoreInstance();
        const docRef = doc(db, "doctors", user.email, "doctor_info", "info");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setDoctorName(data.name || "");
        }
      } catch (error) {
        // Silent error handling
      }
    };

    loadDoctorName();
  }, [user?.email]);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "ocr-upload",
      label: "OCR Upload",
      icon: Upload,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Stethoscope className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <span className="font-bold text-gray-900">DentistFriend</span>
                <div className="text-xs text-gray-500">
                  Patient Record Management
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            className="p-2"
          >
            {isCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isCollapsed ? "px-2" : "px-3",
                )}
                onClick={() => onPageChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">{item.label}</span>}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900">
              Dr. {doctorName || user?.email}
            </p>
            <p className="text-xs text-gray-500">{dateTime}</p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className={cn("w-full", isCollapsed ? "px-2" : "px-3")}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );
}
