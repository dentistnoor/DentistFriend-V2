"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { PatientRecord } from "@/types/patient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PatientTable } from "./patient-table";
import { PatientForm } from "./patient-form";
import { Plus, Search, Filter, Download } from "lucide-react";
import { formatDateForDisplay, formatGender } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {}

export function Dashboard({}: DashboardProps) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<
    PatientRecord | undefined
  >();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.email) return;

    try {
      const db = getFirestoreInstance();
      const q = query(
        collection(db, "doctors", user.email, "patient_info"),
        orderBy("createdAt", "desc"),
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const patientData: PatientRecord[] = [];
        snapshot.forEach((doc) => {
          patientData.push({ id: doc.id, ...doc.data() } as PatientRecord);
        });
        setPatients(patientData);
      });

      return unsubscribe;
    } catch (error) {}
  }, [user?.email]);

  useEffect(() => {
    let filtered = patients;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          patient.patientName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          patient.fileNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.procedures.some((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    // Apply date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case "today":
        filtered = filtered.filter((patient) => {
          const visitDate = new Date(patient.visitDate);
          const visitDateOnly = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());
          return visitDateOnly.getTime() === today.getTime();
        });
        break;
      case "last7days":
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((patient) => {
          const visitDate = new Date(patient.visitDate);
          return visitDate >= last7Days;
        });
        break;
      case "last30days":
        const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((patient) => {
          const visitDate = new Date(patient.visitDate);
          return visitDate >= last30Days;
        });
        break;
      case "last3months":
        const last3Months = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate(),
        );
        filtered = filtered.filter((patient) => {
          const visitDate = new Date(patient.visitDate);
          return visitDate >= last3Months;
        });
        break;
      case "lastyear":
        const lastYear = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
        filtered = filtered.filter((patient) => {
          const visitDate = new Date(patient.visitDate);
          return visitDate >= lastYear;
        });
        break;
      case "custom":
        if (customDateRange.start && customDateRange.end) {
          const startDate = new Date(customDateRange.start);
          const endDate = new Date(customDateRange.end);
          filtered = filtered.filter((patient) => {
            const visitDate = new Date(patient.visitDate);
            return visitDate >= startDate && visitDate <= endDate;
          });
        }
        break;
    }

    // Sort patients by visit date (most recent first)
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.visitDate);
      const dateB = new Date(b.visitDate);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });

    setFilteredPatients(filtered);
  }, [patients, searchTerm, dateFilter, customDateRange]);

  const handleAddPatient = () => {
    setEditingPatient(undefined);
    setShowForm(true);
  };

  const handleEditPatient = (patient: PatientRecord) => {
    setEditingPatient(patient);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPatient(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPatient(undefined);
  };

  const handleExportCSV = () => {
    if (filteredPatients.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no patients to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = [
      "Visit Date",
      "Patient Name",
      "File Number",
      "Age",
      "Gender",
      "Patient Type",
      "Insurance Company",
      "Procedures",
      "Total Amount (SAR)",
      "Remarks",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredPatients.map((patient) =>
        [
          formatDateForDisplay(patient.visitDate),
          `"${patient.patientName}"`,
          patient.fileNumber,
          patient.age,
          formatGender(patient.gender),
          patient.type,
          patient.insuranceCompany || "",
          `"${patient.procedures.map((p) => p.name).join("; ")}"`,
          patient.totalAmount.toFixed(2),
          `"${patient.remarks || ""}"`,
        ].join(","),
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `patient_records_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${filteredPatients.length} patient records to CSV.`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Records</h1>
          <p className="text-gray-600 mt-2">
            Manage your patient records efficiently
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddPatient}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
          <Button
            onClick={handleExportCSV}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search patients, file numbers, or procedures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last3months">Last 3 Months</SelectItem>
                  <SelectItem value="lastyear">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {dateFilter === "custom" && (
            <div className="flex gap-2 mt-4">
              <DateInput
                value={customDateRange.start}
                onChange={(date) =>
                  setCustomDateRange({
                    ...customDateRange,
                    start: date,
                  })
                }
              />
              <DateInput
                value={customDateRange.end}
                onChange={(date) =>
                  setCustomDateRange({
                    ...customDateRange,
                    end: date,
                  })
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>
            {filteredPatients.length} patient
            {filteredPatients.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientTable
            patients={filteredPatients}
            onEdit={handleEditPatient}
            onDelete={handleFormSuccess}
            key={`patient-table-${filteredPatients.length}`}
          />
        </CardContent>
      </Card>

      {/* Patient Form Popup */}
      <PatientForm
        open={showForm}
        onOpenChange={setShowForm}
        patient={editingPatient}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
