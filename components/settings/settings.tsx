"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { updatePassword } from "firebase/auth";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { getAuthInstance, getFirestoreInstance } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type {
  ProcedureTemplate,
  InsuranceCompany,
  ProcedureInsurancePrice,
} from "@/types/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  User,
  Stethoscope,
  Building,
  Edit,
  X,
  Check,
  DollarSign,
  Download,
  Upload,
} from "lucide-react";
import { formatDateForDisplay } from "@/lib/utils";
import * as XLSX from "xlsx";

interface SettingsPageProps {}

export function SettingsPage({}: SettingsPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [procedureTemplates, setProcedureTemplates] = useState<
    ProcedureTemplate[]
  >([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<
    InsuranceCompany[]
  >([]);
  const [procedureInsurancePrices, setProcedureInsurancePrices] = useState<
    ProcedureInsurancePrice[]
  >([]);
  const [editingProcedure, setEditingProcedure] = useState<string | null>(null);
  const [editingInsurance, setEditingInsurance] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);

  const procedureFormRef = useRef<HTMLFormElement>(null);
  const insuranceFormRef = useRef<HTMLFormElement>(null);
  const profileFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProcedureTemplates();
    loadInsuranceCompanies();
    loadProcedureInsurancePrices();
    loadDoctorProfile();
  }, []);

  const loadDoctorProfile = async () => {
    if (!user?.email) return;
    try {
      const db = getFirestoreInstance();
      const docRef = doc(db, "doctors", user.email, "doctor_info", "info");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setDoctorName(data.name || "");
      } else {
        // If the document doesn't exist, create it with empty name
        await setDoc(
          docRef,
          {
            name: "",
            email: user.email,
          },
          { merge: true },
        );
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const loadProcedureTemplates = async () => {
    if (!user?.email) return;
    try {
      const db = getFirestoreInstance();
      const snapshot = await getDocs(
        collection(db, "doctors", user.email, "procedure_templates"),
      );
      const procedures = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProcedureTemplate[];
      setProcedureTemplates(procedures);
    } catch (error) {
      console.error("Error loading procedures:", error);
    }
  };

  const loadInsuranceCompanies = async () => {
    if (!user?.email) return;
    try {
      const db = getFirestoreInstance();
      const snapshot = await getDocs(
        collection(db, "doctors", user.email, "insurance_companies"),
      );
      const companies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as InsuranceCompany[];
      setInsuranceCompanies(companies);
    } catch (error) {
      console.error("Error loading insurance companies:", error);
    }
  };

  const loadProcedureInsurancePrices = async () => {
    if (!user?.email) return;
    try {
      const db = getFirestoreInstance();
      const snapshot = await getDocs(
        collection(db, "doctors", user.email, "procedure_insurance_prices"),
      );
      const prices = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProcedureInsurancePrice[];
      setProcedureInsurancePrices(prices);
    } catch (error) {
      console.error("Error loading procedure insurance prices:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const isUpdatingPassword =
      currentPassword || newPassword || confirmPassword;

    if (!name || name.trim() === "") {
      toast({
        title: "Error",
        description: "Full name is required.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const db = getFirestoreInstance();
      await setDoc(
        doc(db, "doctors", user.email, "doctor_info", "info"),
        {
          name: name.trim(),
          email: user.email,
        },
        { merge: true },
      );

      setDoctorName(name.trim());

      if (isUpdatingPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          toast({
            title: "Error",
            description: "All password fields are required.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          toast({
            title: "Error",
            description: "New passwords do not match.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const auth = getAuthInstance();
        await updatePassword(auth.currentUser!, newPassword);

        toast({
          title: "Password updated",
          description: "Your password has been updated successfully.",
          variant: "success",
        });
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
        variant: "success",
      });

      if (profileFormRef.current) {
        profileFormRef.current.reset();
        const nameInput = profileFormRef.current.querySelector(
          'input[name="name"]',
        ) as HTMLInputElement;
        if (nameInput) {
          nameInput.value = name.trim();
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInsuranceCompany = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!user?.email) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    const companyName = formData.get("companyName") as string;

    if (!companyName || companyName.trim() === "") {
      toast({
        title: "Error",
        description: "Company name is required.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const exists = insuranceCompanies.some(
      (c) => c.name.trim().toLowerCase() === companyName.trim().toLowerCase(),
    );
    if (exists) {
      toast({
        title: "Error",
        description: "This insurance company already exists.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const db = getFirestoreInstance();
      const companyData = {
        name: companyName.trim(),
        email: user.email,
      };

      const docRef = await addDoc(
        collection(db, "doctors", user.email, "insurance_companies"),
        companyData,
      );

      if (insuranceFormRef.current) {
        insuranceFormRef.current.reset();
      }

      await loadInsuranceCompanies();

      toast({
        title: "Insurance company added",
        description: "New insurance company has been created.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add insurance company.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInsuranceCompany = async (
    companyId: string,
    name: string,
  ) => {
    if (!user?.email) return;

    try {
      const db = getFirestoreInstance();
      await updateDoc(
        doc(db, "doctors", user.email, "insurance_companies", companyId),
        {
          name,
        },
      );

      toast({
        title: "Insurance company updated",
        description: "Insurance company has been updated successfully.",
        variant: "success",
      });

      setEditingInsurance(null);
      await loadInsuranceCompanies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update insurance company.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInsuranceCompany = async (id: string) => {
    if (!user?.email) return;

    try {
      const db = getFirestoreInstance();
      await deleteDoc(
        doc(db, "doctors", user.email, "insurance_companies", id),
      );

      toast({
        title: "Insurance company deleted",
        description: "Insurance company has been deleted successfully.",
        variant: "success",
      });

      await loadInsuranceCompanies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete insurance company.",
        variant: "destructive",
      });
    }
  };

  const handleAddProcedure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    const procedureName = formData.get("procedureName") as string;
    const cashPrice = formData.get("cashPrice") as string;

    if (!procedureName || procedureName.trim() === "") {
      toast({
        title: "Error",
        description: "Procedure name is required.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const exists = procedureTemplates.some(
      (p) => p.name.trim().toLowerCase() === procedureName.trim().toLowerCase(),
    );
    if (exists) {
      toast({
        title: "Error",
        description: "This procedure already exists.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!cashPrice || isNaN(Number.parseFloat(cashPrice))) {
      toast({
        title: "Error",
        description: "Valid cash price is required.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const procedureData = {
      name: procedureName.trim(),
      cashPrice: Number.parseFloat(cashPrice),
    };

    try {
      const db = getFirestoreInstance();
      const docRef = await addDoc(
        collection(db, "doctors", user.email, "procedure_templates"),
        procedureData,
      );

      if (procedureFormRef.current) {
        procedureFormRef.current.reset();
      }

      await loadProcedureTemplates();

      toast({
        title: "Procedure added",
        description: "New procedure template has been created.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add procedure template.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProcedure = async (
    procedureId: string,
    name: string,
    cashPrice: number,
  ) => {
    if (!user?.email) return;

    try {
      const db = getFirestoreInstance();
      await updateDoc(
        doc(db, "doctors", user.email, "procedure_templates", procedureId),
        {
          name,
          cashPrice,
        },
      );

      toast({
        title: "Procedure updated",
        description: "Procedure template has been updated successfully.",
        variant: "success",
      });

      setEditingProcedure(null);
      await loadProcedureTemplates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update procedure template.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProcedure = async (id: string) => {
    if (!user?.email) return;

    try {
      const db = getFirestoreInstance();
      await deleteDoc(
        doc(db, "doctors", user.email, "procedure_templates", id),
      );

      toast({
        title: "Procedure deleted",
        description: "Procedure template has been deleted successfully.",
        variant: "success",
      });

      await loadProcedureTemplates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete procedure template.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateInsurancePrice = async (
    procedureId: string,
    insuranceCompanyId: string,
    price: number,
  ) => {
    if (!user?.email) return;

    try {
      const db = getFirestoreInstance();

      // Check if price already exists
      const existingPrice = procedureInsurancePrices.find(
        (p) =>
          p.procedureId === procedureId &&
          p.insuranceCompanyId === insuranceCompanyId,
      );

      if (existingPrice) {
        // Update existing price
        await updateDoc(
          doc(
            db,
            "doctors",
            user.email,
            "procedure_insurance_prices",
            existingPrice.id,
          ),
          {
            price,
          },
        );
      } else {
        // Create new price
        const priceData = {
          procedureId,
          insuranceCompanyId,
          price,
        };
        await addDoc(
          collection(db, "doctors", user.email, "procedure_insurance_prices"),
          priceData,
        );
      }

      await loadProcedureInsurancePrices();
      setEditingPrice(null);

      toast({
        title: "Price updated",
        description: "Insurance price has been updated successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update insurance price.",
        variant: "destructive",
      });
    }
  };

  const getInsurancePrice = (
    procedureId: string,
    insuranceCompanyId: string,
  ) => {
    const price = procedureInsurancePrices.find(
      (p) =>
        p.procedureId === procedureId &&
        p.insuranceCompanyId === insuranceCompanyId,
    );
    return price?.price || 0;
  };

  const handleExportProcedures = () => {
    if (procedureTemplates.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no procedures to export.",
        variant: "destructive",
      });
      return;
    }

    // Format data for Excel export
    const exportData = procedureTemplates.map((procedure) => ({
      "Procedure Name": procedure.name,
      "Cash Price (SAR)": procedure.cashPrice,
    }));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Procedure Templates");

    // Generate Excel file
    XLSX.writeFile(
      workbook,
      `procedure_templates_${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    toast({
      title: "Export successful",
      description: `Exported ${procedureTemplates.length} procedure templates to Excel.`,
      variant: "success",
    });
  };

  const handleImportProcedures = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast({
        title: "Invalid file format",
        description: "Please select an Excel (.xlsx) file.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet) as Array<{
        "Procedure Name": string;
        "Cash Price (SAR)": string | number;
      }>;

      if (data.length === 0) {
        toast({
          title: "Invalid file",
          description: "Excel file is empty or does not contain data.",
          variant: "destructive",
        });
        return;
      }

      // Validate header
      const firstRow = data[0];
      if (!firstRow["Procedure Name"] || !firstRow["Cash Price (SAR)"]) {
        toast({
          title: "Invalid header",
          description:
            "Excel must have headers: 'Procedure Name' and 'Cash Price (SAR)' in the first row",
          variant: "destructive",
        });
        return;
      }

      // Check if there are any data rows
      if (data.length < 2) {
        toast({
          title: "No data rows",
          description:
            "Excel file must contain at least one data row after the header.",
          variant: "destructive",
        });
        return;
      }

      // Process data rows (skip header row)
      const proceduresToAdd: { name: string; cashPrice: number }[] = [];
      const errors: string[] = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row["Procedure Name"] || !row["Cash Price (SAR)"]) continue;

        const procedureName = String(row["Procedure Name"]).trim();
        const cashPriceStr = String(row["Cash Price (SAR)"]).trim();

        if (!procedureName) {
          errors.push(`Row ${i + 1}: Procedure name is required`);
          continue;
        }

        const cashPrice = parseFloat(cashPriceStr);
        if (isNaN(cashPrice) || cashPrice < 0) {
          errors.push(`Row ${i + 1}: Invalid cash price`);
          continue;
        }

        // Check for duplicates
        const exists = procedureTemplates.some(
          (p) => p.name.trim().toLowerCase() === procedureName.toLowerCase(),
        );
        if (exists) {
          errors.push(
            `Row ${i + 1}: Procedure '${procedureName}' already exists`,
          );
          continue;
        }

        proceduresToAdd.push({
          name: procedureName,
          cashPrice: cashPrice,
        });
      }

      if (errors.length > 0) {
        toast({
          title: "Import errors",
          description: `Found ${errors.length} errors. Please check your Excel file. Check browser console for details.`,
          variant: "destructive",
        });
        console.error("Import errors:", errors);
        console.error("Raw data:", data);
        return;
      }

      if (proceduresToAdd.length === 0) {
        toast({
          title: "No valid procedures",
          description: "No valid procedures found in the Excel file.",
          variant: "destructive",
        });
        return;
      }

      // Add procedures to database
      if (!user?.email) {
        toast({
          title: "Error",
          description: "User not authenticated.",
          variant: "destructive",
        });
        return;
      }

      const db = getFirestoreInstance();
      for (const procedure of proceduresToAdd) {
        await addDoc(
          collection(db, "doctors", user.email, "procedure_templates"),
          procedure,
        );
      }

      await loadProcedureTemplates();

      toast({
        title: "Import successful",
        description: `Successfully imported ${proceduresToAdd.length} procedure templates.`,
        variant: "success",
      });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description:
          "Failed to import procedures. Please check your file format.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account and practice settings.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="procedures" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Procedures
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Insurance Companies
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleUpdateProfile}
                className="space-y-4"
                ref={profileFormRef}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={doctorName}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">
                      Current Password (Optional)
                    </Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password (Optional)</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="Enter your new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm New Password (Optional)
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Procedure Templates
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportProcedures}
                    disabled={isLoading || procedureTemplates.length === 0}
                    title="Export all procedures to Excel file"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    title="Import procedures from Excel file (.xlsx format)"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Excel
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleImportProcedures}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleAddProcedure}
                className="space-y-4 mb-6"
                ref={procedureFormRef}
              >
                <div className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-md">
                  <strong>💡 Tip:</strong> You can import multiple procedures at
                  once using the "Import Excel" button. The Excel file should
                  have headers "Procedure Name" and "Cash Price (SAR)" in the
                  first row.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="procedureName">Procedure Name</Label>
                    <Input
                      id="procedureName"
                      name="procedureName"
                      placeholder="Enter procedure name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashPrice">Cash Price (SAR)</Label>
                    <Input
                      id="cashPrice"
                      name="cashPrice"
                      type="number"
                      step="0.01"
                      placeholder="Enter cash price"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Plus className="mr-2 h-4 w-4" />
                  Add Procedure
                </Button>
              </form>

              {/* Total Procedures Summary */}
              <div className="text-sm text-gray-500 mb-2">
                Total Procedures: {procedureTemplates.length}
              </div>

              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedure Name</TableHead>
                      <TableHead>Cash Price (SAR)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedureTemplates.map((procedure) => (
                      <TableRow key={procedure.id}>
                        <TableCell>
                          {editingProcedure === procedure.id ? (
                            <Input
                              defaultValue={procedure.name}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  const cashPriceInput =
                                    target.parentElement?.parentElement?.querySelector(
                                      'input[data-field="cashPrice"]',
                                    ) as HTMLInputElement;
                                  const cashPrice = parseFloat(
                                    cashPriceInput?.value || "0",
                                  );
                                  handleEditProcedure(
                                    procedure.id,
                                    target.value,
                                    cashPrice,
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingProcedure(null);
                                }
                              }}
                              onBlur={(e) => {
                                const cashPriceInput =
                                  e.target.parentElement?.parentElement?.querySelector(
                                    'input[data-field="cashPrice"]',
                                  ) as HTMLInputElement;
                                const cashPrice = parseFloat(
                                  cashPriceInput?.value || "0",
                                );
                                handleEditProcedure(
                                  procedure.id,
                                  e.target.value,
                                  cashPrice,
                                );
                              }}
                            />
                          ) : (
                            procedure.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProcedure === procedure.id ? (
                            <Input
                              data-field="cashPrice"
                              type="number"
                              step="0.01"
                              defaultValue={procedure.cashPrice}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  const nameInput =
                                    target.parentElement?.parentElement?.querySelector(
                                      "input",
                                    ) as HTMLInputElement;
                                  handleEditProcedure(
                                    procedure.id,
                                    nameInput?.value || procedure.name,
                                    parseFloat(target.value),
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingProcedure(null);
                                }
                              }}
                              onBlur={(e) => {
                                const target = e.target as HTMLInputElement;
                                const nameInput =
                                  target.parentElement?.parentElement?.querySelector(
                                    "input",
                                  ) as HTMLInputElement;
                                const name = nameInput?.value || procedure.name;
                                handleEditProcedure(
                                  procedure.id,
                                  name,
                                  parseFloat(target.value),
                                );
                              }}
                            />
                          ) : (
                            `SAR ${procedure.cashPrice.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {editingProcedure === procedure.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const nameInput = document.querySelector(
                                      `tr[data-id="${procedure.id}"] input`,
                                    ) as HTMLInputElement;
                                    const cashPriceInput =
                                      document.querySelector(
                                        `tr[data-id="${procedure.id}"] input[data-field="cashPrice"]`,
                                      ) as HTMLInputElement;
                                    const name =
                                      nameInput?.value || procedure.name;
                                    const cashPrice = parseFloat(
                                      cashPriceInput?.value || "0",
                                    );
                                    handleEditProcedure(
                                      procedure.id,
                                      name,
                                      cashPrice,
                                    );
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingProcedure(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setEditingProcedure(procedure.id)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleDeleteProcedure(procedure.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Insurance Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleAddInsuranceCompany}
                className="space-y-4 mb-6"
                ref={insuranceFormRef}
              >
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="companyName"
                      name="companyName"
                      placeholder="Enter insurance company name"
                      required
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Plus className="mr-2 h-4 w-4" />
                      Add Company
                    </Button>
                  </div>
                </div>
              </form>

              {/* Total Insurance Companies Summary */}
              <div className="text-sm text-gray-500 mb-2">
                Total Insurance Companies: {insuranceCompanies.length}
              </div>

              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insuranceCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          {editingInsurance === company.id ? (
                            <Input
                              defaultValue={company.name}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  handleEditInsuranceCompany(
                                    company.id,
                                    target.value,
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingInsurance(null);
                                }
                              }}
                              onBlur={(e) => {
                                handleEditInsuranceCompany(
                                  company.id,
                                  e.target.value,
                                );
                              }}
                            />
                          ) : (
                            company.name
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {editingInsurance === company.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const nameInput = document.querySelector(
                                      `tr[data-id="${company.id}"] input`,
                                    ) as HTMLInputElement;
                                    handleEditInsuranceCompany(
                                      company.id,
                                      nameInput?.value || company.name,
                                    );
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingInsurance(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setEditingInsurance(company.id)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleDeleteInsuranceCompany(company.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Insurance Pricing Matrix
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Set different prices for each procedure with each insurance
                company. Cash prices are set in the Procedures tab.
              </p>
            </CardHeader>
            <CardContent>
              {procedureTemplates.length === 0 ||
              insuranceCompanies.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Data Available
                  </h3>
                  <p className="text-gray-600">
                    {procedureTemplates.length === 0 &&
                    insuranceCompanies.length === 0
                      ? "Please add procedures and insurance companies first."
                      : procedureTemplates.length === 0
                        ? "Please add procedures first."
                        : "Please add insurance companies first."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Procedure</TableHead>
                        <TableHead>Cash Price</TableHead>
                        {insuranceCompanies.map((company) => (
                          <TableHead key={company.id}>{company.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedureTemplates.map((procedure) => (
                        <TableRow key={procedure.id}>
                          <TableCell className="font-medium">
                            {procedure.name}
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            SAR {procedure.cashPrice.toFixed(2)}
                          </TableCell>
                          {insuranceCompanies.map((company) => {
                            const currentPrice = getInsurancePrice(
                              procedure.id,
                              company.id,
                            );
                            const priceKey = `${procedure.id}-${company.id}`;

                            return (
                              <TableCell key={company.id}>
                                {editingPrice === priceKey ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    defaultValue={currentPrice}
                                    className="w-20"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const target =
                                          e.target as HTMLInputElement;
                                        handleUpdateInsurancePrice(
                                          procedure.id,
                                          company.id,
                                          parseFloat(target.value),
                                        );
                                      } else if (e.key === "Escape") {
                                        setEditingPrice(null);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      handleUpdateInsurancePrice(
                                        procedure.id,
                                        company.id,
                                        parseFloat(e.target.value),
                                      );
                                    }}
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-blue-600">
                                      SAR {currentPrice.toFixed(2)}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingPrice(priceKey)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
