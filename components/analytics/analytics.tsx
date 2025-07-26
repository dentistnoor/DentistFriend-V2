"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import type { PatientRecord } from "@/types/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateInput } from "@/components/ui/date-input";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Users, DollarSign, CreditCard, FileText, Wallet } from "lucide-react";
import { formatDateForDisplay } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsPageProps {
  isSidebarCollapsed?: boolean;
}

export function AnalyticsPage({
  isSidebarCollapsed = false,
}: AnalyticsPageProps) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case "today":
        filtered = filtered.filter((patient) => {
          const visitDate = new Date(patient.visitDate);
          return visitDate >= today;
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

    setFilteredPatients(filtered);
  }, [patients, dateFilter, customDateRange]);

  // Calculate metrics
  const totalPatients = filteredPatients.length;
  const cashPatients = filteredPatients.filter((p) => p.type === "Cash").length;
  const insurancePatients = filteredPatients.filter(
    (p) => p.type === "Insurance",
  ).length;
  const totalRevenue = filteredPatients.reduce(
    (sum, patient) => sum + patient.totalAmount,
    0,
  );
  const cashRevenue = filteredPatients
    .filter((p) => p.type === "Cash")
    .reduce((sum, patient) => sum + patient.totalAmount, 0);
  const insuranceRevenue = filteredPatients
    .filter((p) => p.type === "Insurance")
    .reduce((sum, patient) => sum + patient.totalAmount, 0);

  // Chart data
  const patientTypeData = [
    ...(cashPatients > 0
      ? [{ name: "Cash", value: cashPatients, color: "#f97316" }]
      : []),
    ...(insurancePatients > 0
      ? [{ name: "Insurance", value: insurancePatients, color: "#8b5cf6" }]
      : []),
  ];

  const genderData = [
    ...(filteredPatients.filter((p) => p.gender === "Male").length > 0
      ? [
          {
            name: "Male",
            value: filteredPatients.filter((p) => p.gender === "Male").length,
            color: "#3b82f6",
          },
        ]
      : []),
    ...(filteredPatients.filter((p) => p.gender === "Female").length > 0
      ? [
          {
            name: "Female",
            value: filteredPatients.filter((p) => p.gender === "Female").length,
            color: "#ec4899",
          },
        ]
      : []),
    ...(filteredPatients.filter((p) => p.gender === "Other").length > 0
      ? [
          {
            name: "Other",
            value: filteredPatients.filter((p) => p.gender === "Other").length,
            color: "#10b981",
          },
        ]
      : []),
  ];

  const ageGroupData = [
    {
      name: "0-18",
      patients: filteredPatients.filter((p) => p.age >= 0 && p.age <= 18)
        .length,
    },
    {
      name: "19-35",
      patients: filteredPatients.filter((p) => p.age >= 19 && p.age <= 35)
        .length,
    },
    {
      name: "36-50",
      patients: filteredPatients.filter((p) => p.age >= 36 && p.age <= 50)
        .length,
    },
    {
      name: "51-65",
      patients: filteredPatients.filter((p) => p.age >= 51 && p.age <= 65)
        .length,
    },
    {
      name: "65+",
      patients: filteredPatients.filter((p) => p.age > 65).length,
    },
  ];

  // Revenue Trend Data
  const revenueTrendData = filteredPatients
    .reduce(
      (acc, patient) => {
        const date = formatDateForDisplay(patient.visitDate);
        const existing = acc.find((item) => item.date === date);
        if (existing) {
          existing.revenue += patient.totalAmount;
          existing.patients += 1;
        } else {
          acc.push({ date, revenue: patient.totalAmount, patients: 1 });
        }
        return acc;
      },
      [] as { date: string; revenue: number; patients: number }[],
    )
    .sort((a, b) => {
      // Convert DD/MM/YYYY to Date object for proper sorting
      const [dayA, monthA, yearA] = a.date.split("/");
      const [dayB, monthB, yearB] = b.date.split("/");
      const dateA = new Date(
        parseInt(yearA),
        parseInt(monthA) - 1,
        parseInt(dayA),
      );
      const dateB = new Date(
        parseInt(yearB),
        parseInt(monthB) - 1,
        parseInt(dayB),
      );
      return dateA.getTime() - dateB.getTime();
    })
    .slice(-10); // Last 10 days

  const procedureData = filteredPatients
    .flatMap((p) => p.procedures)
    .reduce(
      (acc, procedure) => {
        const existing = acc.find((item) => item.name === procedure.name);
        if (existing) {
          existing.count += 1;
          existing.revenue += procedure.finalAmount;
        } else {
          acc.push({
            name: procedure.name,
            count: 1,
            revenue: procedure.finalAmount,
          });
        }
        return acc;
      },
      [] as { name: string; count: number; revenue: number }[],
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const insuranceData = filteredPatients
    .filter((p) => p.type === "Insurance" && p.insuranceCompany)
    .reduce(
      (acc, patient) => {
        const company = patient.insuranceCompany!;
        const existing = acc.find((item) => item.name === company);
        if (existing) {
          existing.count += 1;
          existing.revenue += patient.totalAmount;
        } else {
          acc.push({ name: company, count: 1, revenue: patient.totalAmount });
        }
        return acc;
      },
      [] as { name: string; count: number; revenue: number }[],
    )
    .sort((a, b) => b.count - a.count);

  const clearFilters = () => {
    setDateFilter("all");
    setCustomDateRange({ start: "", end: "" });
  };

  return (
    <div
      className={`p-6 space-y-6 transition-all duration-300 ${
        isSidebarCollapsed ? "ml-0" : ""
      }`}
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive insights into your practice
        </p>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  From
                </label>
                <DateInput
                  value={customDateRange.start}
                  onChange={(date) => {
                    setCustomDateRange((prev) => ({
                      ...prev,
                      start: date,
                    }));
                    setDateFilter("custom");
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">To</label>
                <DateInput
                  value={customDateRange.end}
                  onChange={(date) => {
                    setCustomDateRange((prev) => ({
                      ...prev,
                      end: date,
                    }));
                    setDateFilter("custom");
                  }}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <Button
                variant={dateFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("all")}
                className="flex-1 min-w-0 text-xs"
              >
                All Time
              </Button>
              <Button
                variant={dateFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("today")}
                className="flex-1 min-w-0 text-xs"
              >
                Today
              </Button>
              <Button
                variant={dateFilter === "last7days" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("last7days")}
                className="flex-1 min-w-0 text-xs"
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateFilter === "last30days" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("last30days")}
                className="flex-1 min-w-0 text-xs"
              >
                Last 30 Days
              </Button>
              <Button
                variant={dateFilter === "last3months" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("last3months")}
                className="flex-1 min-w-0 text-xs"
              >
                Last 3 Months
              </Button>
              <Button
                variant={dateFilter === "lastyear" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("lastyear")}
                className="flex-1 min-w-0 text-xs"
              >
                Last Year
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearFilters}
                className="flex-1 min-w-0 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Patients
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalPatients}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Cash Patients
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {cashPatients}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wallet className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Insurance Patients
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {insurancePatients}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Collection
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  SAR {totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Cash Collection
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  SAR {cashRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wallet className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Insurance Collection
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  SAR {insuranceRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Type Distribution */}
        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle>Patient Type Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            {patientTypeData.length > 0 ? (
              <ChartContainer
                config={{
                  cash: { label: "Cash", color: "#f97316" },
                  insurance: { label: "Insurance", color: "#8b5cf6" },
                }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={patientTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {patientTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center text-gray-500">
                No patient type data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Gender Distribution */}
        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle>Patient Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            {genderData.length > 0 ? (
              <ChartContainer
                config={{
                  male: { label: "Male", color: "#3b82f6" },
                  female: { label: "Female", color: "#ec4899" },
                  other: { label: "Other", color: "#10b981" },
                }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center text-gray-500">
                No gender data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Age Group Distribution */}
        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle>Age Group Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <ChartContainer
              config={{
                patients: { label: "Patients", color: "#3b82f6" },
              }}
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGroupData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="patients" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            {revenueTrendData.length > 0 ? (
              <ChartContainer
                config={{
                  revenue: { label: "Revenue", color: "#10b981" },
                }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="revenue" stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center text-gray-500">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Procedures */}
        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle>Popular Procedures</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            {procedureData.length > 0 ? (
              <ChartContainer
                config={{
                  count: { label: "Patients", color: "#10b981" },
                }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={procedureData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center text-gray-500">
                No procedure data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Insurance Companies */}
        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle>Popular Insurance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            {insuranceData.length > 0 ? (
              <ChartContainer
                config={{
                  count: { label: "Patients", color: "#8b5cf6" },
                }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insuranceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center text-gray-500">
                No insurance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
