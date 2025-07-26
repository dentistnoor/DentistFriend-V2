"use client";

import { useState } from "react";
import { Sidebar } from "./layout/sidebar";
import { Dashboard } from "./dashboard/dashboard";
import { AnalyticsPage } from "./analytics/analytics";
import { OCRUploadPage } from "./ocr/ocr-upload";
import { SettingsPage } from "./settings/settings";

export function MainApp() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "analytics":
        return <AnalyticsPage />;
      case "ocr-upload":
        return <OCRUploadPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 overflow-auto">{renderPage()}</div>
    </div>
  );
}
