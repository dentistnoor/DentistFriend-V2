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
import type { ProcedureTemplate, InsuranceCompany } from "@/types/patient";
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
} from "lucide-react";
import { formatDateForDisplay } from "@/lib/utils";

interface SettingsPageProps {
  isSidebarCollapsed?: boolean;
}

export function SettingsPage({
  isSidebarCollapsed = false,
}: SettingsPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [procedureTemplates, setProcedureTemplates] = useState<
    ProcedureTemplate[]
  >([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<
    InsuranceCompany[]
  >([]);
  const [editingProcedure, setEditingProcedure] = useState<string | null>(null);
  const [editingInsurance, setEditingInsurance] = useState<string | null>(null);

  const procedureFormRef = useRef<HTMLFormElement>(null);
  const insuranceFormRef = useRef<HTMLFormElement>(null);
  const profileFormRef = useRef<HTMLFormElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProcedureTemplates();
    loadInsuranceCompanies();
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
        await setDoc(
          docRef,
          {
            name: "",
            email: user.email,
            createdAt: new Date(),
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

      const templates: ProcedureTemplate[] = [];
      snapshot.forEach((doc) => {
        templates.push({ id: doc.id, ...doc.data() } as ProcedureTemplate);
      });
      setProcedureTemplates(templates);
    } catch (error) {
      // Silent error handling
    }
  };

  const loadInsuranceCompanies = async () => {
    if (!user?.email) return;
    try {
      const db = getFirestoreInstance();
      const snapshot = await getDocs(
        collection(db, "doctors", user.email, "insurance_companies"),
      );

      const companies: InsuranceCompany[] = [];
      snapshot.forEach((doc) => {
        companies.push({ id: doc.id, ...doc.data() } as InsuranceCompany);
      });
      setInsuranceCompanies(companies);
    } catch (error) {
      // Silent error handling
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
            description:
              "All password fields are required when changing password.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          toast({
            title: "Error",
            description: "New password and confirm password do not match.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (newPassword.length < 6) {
          toast({
            title: "Error",
            description: "New password must be at least 6 characters long.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        try {
          const auth = getAuthInstance();

          await updatePassword(user, newPassword);

          toast({
            title: "Profile updated",
            description:
              "Your name and password have been updated successfully.",
          });
        } catch (error: any) {
          let errorMessage = "Failed to update password.";

          if (error.code === "auth/wrong-password") {
            errorMessage = "Current password is incorrect.";
          } else if (error.code === "auth/weak-password") {
            errorMessage = "New password is too weak.";
          }

          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      } else {
        toast({
          title: "Profile updated",
          description: "Your name has been updated successfully.",
        });
      }

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
        description: "Insurance company has been removed.",
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
    const insurancePrice = formData.get("insurancePrice") as string;

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
      insurancePrice:
        insurancePrice && !isNaN(Number.parseFloat(insurancePrice))
          ? Number.parseFloat(insurancePrice)
          : undefined,
      createdAt: new Date(),
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
    insurancePrice?: number,
  ) => {
    if (!user?.email) return;

    try {
      const db = getFirestoreInstance();
      await updateDoc(
        doc(db, "doctors", user.email, "procedure_templates", procedureId),
        {
          name,
          cashPrice,
          insurancePrice,
        },
      );

      toast({
        title: "Procedure updated",
        description: "Procedure template has been updated successfully.",
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
        description: "Procedure template has been removed.",
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account and practice settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger
            value="procedures"
            className="flex items-center space-x-2"
          >
            <Stethoscope className="h-4 w-4" />
            <span>Procedures</span>
          </TabsTrigger>
          <TabsTrigger
            value="insurance"
            className="flex items-center space-x-2"
          >
            <Building className="h-4 w-4" />
            <span>Insurance</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Information</CardTitle>
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

                <div className="space-y-4">
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

        {/* Procedure Templates */}
        <TabsContent value="procedures">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Procedure Template</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  ref={procedureFormRef}
                  onSubmit={handleAddProcedure}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="procedureName">Procedure Name</Label>
                      <Input
                        id="procedureName"
                        name="procedureName"
                        placeholder="e.g., Dental Cleaning"
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
                        placeholder="100.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurancePrice">
                        Insurance Price (SAR)
                      </Label>
                      <Input
                        id="insurancePrice"
                        name="insurancePrice"
                        type="number"
                        step="0.01"
                        placeholder="80.00"
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Procedure Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedure Name</TableHead>
                      <TableHead>Cash Price</TableHead>
                      <TableHead>Insurance Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedureTemplates.map((procedure) => (
                      <TableRow key={procedure.id} data-id={procedure.id}>
                        <TableCell className="font-medium">
                          {editingProcedure === procedure.id ? (
                            <Input
                              defaultValue={procedure.name}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  const name = target.value;
                                  const cashPriceInput =
                                    target.parentElement?.parentElement?.querySelector(
                                      'input[data-field="cashPrice"]',
                                    ) as HTMLInputElement;
                                  const insurancePriceInput =
                                    target.parentElement?.parentElement?.querySelector(
                                      'input[data-field="insurancePrice"]',
                                    ) as HTMLInputElement;
                                  const cashPrice = parseFloat(
                                    cashPriceInput?.value || "0",
                                  );
                                  const insurancePrice =
                                    insurancePriceInput?.value
                                      ? parseFloat(insurancePriceInput.value)
                                      : undefined;
                                  handleEditProcedure(
                                    procedure.id,
                                    name,
                                    cashPrice,
                                    insurancePrice,
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingProcedure(null);
                                }
                              }}
                              onBlur={(e) => {
                                const name = e.target.value;
                                const cashPriceInput =
                                  e.target.parentElement?.parentElement?.querySelector(
                                    'input[data-field="cashPrice"]',
                                  ) as HTMLInputElement;
                                const insurancePriceInput =
                                  e.target.parentElement?.parentElement?.querySelector(
                                    'input[data-field="insurancePrice"]',
                                  ) as HTMLInputElement;
                                const cashPrice = parseFloat(
                                  cashPriceInput?.value || "0",
                                );
                                const insurancePrice =
                                  insurancePriceInput?.value
                                    ? parseFloat(insurancePriceInput.value)
                                    : undefined;
                                handleEditProcedure(
                                  procedure.id,
                                  name,
                                  cashPrice,
                                  insurancePrice,
                                );
                              }}
                              autoFocus
                            />
                          ) : (
                            procedure.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProcedure === procedure.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              defaultValue={procedure.cashPrice}
                              data-field="cashPrice"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  const cashPrice = parseFloat(target.value);
                                  const nameInput =
                                    target.parentElement?.parentElement?.querySelector(
                                      "input",
                                    ) as HTMLInputElement;
                                  const insurancePriceInput =
                                    target.parentElement?.parentElement?.querySelector(
                                      'input[data-field="insurancePrice"]',
                                    ) as HTMLInputElement;
                                  const name =
                                    nameInput?.value || procedure.name;
                                  const insurancePrice =
                                    insurancePriceInput?.value
                                      ? parseFloat(insurancePriceInput.value)
                                      : undefined;
                                  handleEditProcedure(
                                    procedure.id,
                                    name,
                                    cashPrice,
                                    insurancePrice,
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingProcedure(null);
                                }
                              }}
                            />
                          ) : (
                            `SAR ${procedure.cashPrice.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProcedure === procedure.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              defaultValue={procedure.insurancePrice || ""}
                              data-field="insurancePrice"
                              placeholder="Optional"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  const insurancePrice = target.value
                                    ? parseFloat(target.value)
                                    : undefined;
                                  const nameInput =
                                    target.parentElement?.parentElement?.querySelector(
                                      "input",
                                    ) as HTMLInputElement;
                                  const cashPriceInput =
                                    target.parentElement?.parentElement?.querySelector(
                                      'input[data-field="cashPrice"]',
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
                                    insurancePrice,
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingProcedure(null);
                                }
                              }}
                            />
                          ) : procedure.insurancePrice ? (
                            `SAR ${procedure.insurancePrice.toFixed(2)}`
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {editingProcedure === procedure.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const nameInput = document.querySelector(
                                      `tr[data-id="${procedure.id}"] input`,
                                    ) as HTMLInputElement;
                                    const cashPriceInput =
                                      document.querySelector(
                                        `tr[data-id="${procedure.id}"] input[data-field="cashPrice"]`,
                                      ) as HTMLInputElement;
                                    const insurancePriceInput =
                                      document.querySelector(
                                        `tr[data-id="${procedure.id}"] input[data-field="insurancePrice"]`,
                                      ) as HTMLInputElement;
                                    const name =
                                      nameInput?.value || procedure.name;
                                    const cashPrice = parseFloat(
                                      cashPriceInput?.value || "0",
                                    );
                                    const insurancePrice =
                                      insurancePriceInput?.value
                                        ? parseFloat(insurancePriceInput.value)
                                        : undefined;
                                    handleEditProcedure(
                                      procedure.id,
                                      name,
                                      cashPrice,
                                      insurancePrice,
                                    );
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingProcedure(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setEditingProcedure(procedure.id)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insurance Companies */}
        <TabsContent value="insurance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Insurance Company</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  ref={insuranceFormRef}
                  onSubmit={handleAddInsuranceCompany}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      placeholder="e.g., Bupa Arabia"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Plus className="mr-2 h-4 w-4" />
                    Add Company
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insurance Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insuranceCompanies.map((company) => (
                      <TableRow key={company.id} data-id={company.id}>
                        <TableCell className="font-medium">
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
                              autoFocus
                            />
                          ) : (
                            company.name
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {editingInsurance === company.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
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
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingInsurance(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setEditingInsurance(company.id)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
