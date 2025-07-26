"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type {
  PatientRecord,
  ProcedureItem,
  ProcedureTemplate,
  InsuranceCompany,
  ProcedureInsurancePrice,
} from "@/types/patient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import {
  formatDateForInput,
  getTodayDateForInput,
  formatGender,
  formatGenderForDB,
} from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";
import { Badge } from "@/components/ui/badge";

interface PatientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: PatientRecord;
  onSuccess: () => void;
}

export function PatientForm({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: PatientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [visitDate, setVisitDate] = useState(
    patient?.visitDate || new Date().toISOString().split("T")[0],
  );
  const [patientName, setPatientName] = useState(patient?.patientName || "");
  const [fileNumber, setFileNumber] = useState(patient?.fileNumber || "");
  const [age, setAge] = useState(patient?.age?.toString() || "");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">(
    patient?.gender || "",
  );
  const [insuranceCompany, setInsuranceCompany] = useState(
    patient?.insuranceCompany || "",
  );
  const [remarks, setRemarks] = useState(patient?.remarks || "");
  const [patientType, setPatientType] = useState<"Cash" | "Insurance">(
    patient?.type || "Cash",
  );
  const [procedures, setProcedures] = useState<ProcedureItem[]>(
    patient?.procedures?.map((p) => ({
      ...p,
      templateId: p.templateId || "",
    })) || [
      {
        id: "1",
        name: "",
        price: 0,
        discount: 0,
        finalAmount: 0,
        templateId: "",
      },
    ],
  );
  const [procedureTemplates, setProcedureTemplates] = useState<
    ProcedureTemplate[]
  >([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<
    InsuranceCompany[]
  >([]);
  const [procedureInsurancePrices, setProcedureInsurancePrices] = useState<
    ProcedureInsurancePrice[]
  >([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setVisitDate(new Date().toISOString().split("T")[0]);
    setPatientName("");
    setFileNumber("");
    setAge("");
    setGender("");
    setInsuranceCompany("");
    setRemarks("");
    setPatientType("Cash");
    setProcedures([
      {
        id: "1",
        name: "",
        price: 0,
        discount: 0,
        finalAmount: 0,
        templateId: "",
      },
    ]);
  };

  const loadPatientData = () => {
    if (patient) {
      setVisitDate(patient.visitDate);
      setPatientName(patient.patientName);
      setFileNumber(patient.fileNumber);
      setAge(patient.age.toString());
      setGender(formatGender(patient.gender) as "Male" | "Female" | "Other");
      setInsuranceCompany(patient.insuranceCompany || "");
      setRemarks(patient.remarks || "");
      setPatientType(patient.type);

      // Map procedures to include templateId by matching procedure names
      const mappedProcedures = patient.procedures?.map((p) => {
        // Find matching template by name
        const matchingTemplate = procedureTemplates.find(
          (template) => template.name.toLowerCase() === p.name.toLowerCase(),
        );

        return {
          ...p,
          templateId: matchingTemplate?.id || "",
          // If no matching template found, keep the original name for display
          name: matchingTemplate ? matchingTemplate.name : p.name,
        };
      }) || [
        {
          id: "1",
          name: "",
          price: 0,
          discount: 0,
          finalAmount: 0,
          templateId: "",
        },
      ];

      setProcedures(mappedProcedures);
    } else {
      resetForm();
    }
  };

  useEffect(() => {
    if (open) {
      loadProcedureTemplates();
      loadInsuranceCompanies();
      loadProcedureInsurancePrices();
    }
  }, [open]);

  // Load patient data after procedure templates are loaded
  useEffect(() => {
    if (open && procedureTemplates.length > 0) {
      loadPatientData();
    }
  }, [open, patient, procedureTemplates]);

  // Update procedures when insurance company or patient type changes
  useEffect(() => {
    if (open && procedures.length > 0) {
      updateAllProceduresForInsurance();
    }
  }, [
    insuranceCompany,
    patientType,
    procedureTemplates,
    insuranceCompanies,
    procedureInsurancePrices,
  ]);

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
      toast({
        title: "Error",
        description: "Failed to load procedure templates. Please try again.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to load insurance companies. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadProcedureInsurancePrices = async () => {
    if (!user?.email) return;
    try {
      const db = getFirestoreInstance();
      const snapshot = await getDocs(
        collection(db, "doctors", user.email, "procedure_insurance_prices"),
      );
      const prices: ProcedureInsurancePrice[] = [];
      snapshot.forEach((doc) => {
        prices.push({ id: doc.id, ...doc.data() } as ProcedureInsurancePrice);
      });
      setProcedureInsurancePrices(prices);
    } catch (error) {
      console.error("Error loading procedure insurance prices:", error);
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

  const updateAllProceduresForInsurance = () => {
    if (patientType === "Insurance" && insuranceCompany) {
      const insuranceCompanyObj = insuranceCompanies.find(
        (c) => c.name === insuranceCompany,
      );

      if (insuranceCompanyObj) {
        setProcedures(
          procedures.map((procedure) => {
            if (procedure.templateId) {
              const template = procedureTemplates.find(
                (t) => t.id === procedure.templateId,
              );
              if (template) {
                const insurancePrice = getInsurancePrice(
                  template.id,
                  insuranceCompanyObj.id,
                );
                const price =
                  insurancePrice > 0 ? insurancePrice : template.cashPrice;
                const finalAmount = price - (price * procedure.discount) / 100;

                return {
                  ...procedure,
                  price: price,
                  finalAmount: finalAmount,
                };
              }
            }
            return procedure;
          }),
        );
      }
    }
  };

  const addProcedure = () => {
    const newProcedure: ProcedureItem = {
      id: Date.now().toString(),
      name: "",
      price: 0,
      discount: 0,
      finalAmount: 0,
      templateId: "", // Empty templateId means it will show as dropdown for new procedures
    };
    setProcedures([...procedures, newProcedure]);
  };

  const removeProcedure = (id: string) => {
    if (procedures.length > 1) {
      setProcedures(procedures.filter((p) => p.id !== id));
    }
  };

  const updateProcedure = (
    id: string,
    field: keyof ProcedureItem,
    value: string | number,
  ) => {
    setProcedures(
      procedures.map((p) => {
        if (p.id === id) {
          const updated = { ...p, [field]: value };
          if (field === "discount") {
            // Calculate final amount based on the procedure template price and discount
            const template = procedureTemplates.find(
              (t) => t.id === updated.templateId,
            );
            if (template) {
              let price = template.cashPrice;

              // If patient type is Insurance and insurance company is selected, use insurance price
              if (patientType === "Insurance" && insuranceCompany) {
                const insuranceCompanyObj = insuranceCompanies.find(
                  (c) => c.name === insuranceCompany,
                );
                if (insuranceCompanyObj) {
                  const insurancePrice = getInsurancePrice(
                    template.id,
                    insuranceCompanyObj.id,
                  );
                  if (insurancePrice > 0) {
                    price = insurancePrice;
                  }
                }
              }

              updated.price = price;
              updated.finalAmount = price - (price * Number(value)) / 100;
            }
          }
          return updated;
        }
        return p;
      }),
    );
  };

  const selectProcedureTemplate = (procedureId: string, templateId: string) => {
    const template = procedureTemplates.find((t) => t.id === templateId);
    if (template) {
      let price = template.cashPrice;

      // If patient type is Insurance and insurance company is selected, use insurance price
      if (patientType === "Insurance" && insuranceCompany) {
        const insuranceCompanyObj = insuranceCompanies.find(
          (c) => c.name === insuranceCompany,
        );
        if (insuranceCompanyObj) {
          const insurancePrice = getInsurancePrice(
            template.id,
            insuranceCompanyObj.id,
          );
          if (insurancePrice > 0) {
            price = insurancePrice;
          }
        }
      }

      const procedure = procedures.find((p) => p.id === procedureId);
      const currentDiscount = procedure?.discount || 0;
      const finalAmount = price - (price * currentDiscount) / 100;

      setProcedures(
        procedures.map((p) => {
          if (p.id === procedureId) {
            const updated = {
              ...p,
              name: template.name,
              price: price,
              finalAmount: finalAmount,
              templateId: templateId, // Store the selected template ID
            };
            return updated;
          }
          return p;
        }),
      );
    } else {
      toast({
        title: "Error",
        description: "Template not found for ID: " + templateId,
        variant: "destructive",
      });
    }
  };

  const calculateTotalAmount = () => {
    return procedures.reduce(
      (sum, procedure) => sum + procedure.finalAmount,
      0,
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;

    setIsLoading(true);

    const patientData = {
      visitDate: visitDate,
      patientName: patientName,
      fileNumber: fileNumber,
      age: age && age.trim() !== "" ? Number.parseInt(age) : "",
      gender: formatGenderForDB(gender),
      type: patientType,
      procedures: procedures.filter((p) => p.name.trim() !== ""),
      totalAmount: calculateTotalAmount(),
      remarks: remarks,
      createdAt: serverTimestamp(),
    };

    // Only add insuranceCompany if patient type is Insurance and value exists
    if (patientType === "Insurance") {
      if (insuranceCompany && insuranceCompany.trim() !== "") {
        (patientData as any).insuranceCompany = insuranceCompany;
      }
    }

    // Validate required fields
    if (
      !patientData.visitDate ||
      !patientData.patientName ||
      !patientData.fileNumber ||
      !gender ||
      !patientType
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate insurance company if patient type is Insurance
    if (
      patientType === "Insurance" &&
      (!insuranceCompany || insuranceCompany.trim() === "")
    ) {
      toast({
        title: "Validation Error",
        description: "Please select an insurance company.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate procedures
    const validProcedures = procedures.filter((p) => p.name.trim() !== "");
    if (validProcedures.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one procedure.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Update patientData with validated procedures
    patientData.procedures = validProcedures;

    try {
      const db = getFirestoreInstance();

      // Test if we can read from the collection to check permissions
      try {
        const testSnapshot = await getDocs(
          collection(db, "doctors", user.email, "patient_info"),
        );
      } catch (readError) {
        toast({
          title: "Permission Error",
          description:
            "Cannot access patient records. Please check your Firebase permissions.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (patient) {
        const patientRef = doc(
          db,
          "doctors",
          user.email,
          "patient_info",
          patient.id,
        );
        await updateDoc(patientRef, patientData);
        toast({
          title: "Patient updated",
          description: "Patient record has been updated successfully.",
        });
      } else {
        const docRef = await addDoc(
          collection(db, "doctors", user.email, "patient_info"),
          patientData,
        );
        toast({
          title: "Patient added",
          description: "New patient record has been created successfully.",
        });
        // Reset form after successful submission for new patients
        resetForm();
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save patient record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && !patient) {
      // Reset form when closing dialog for new patients
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {patient ? "Edit Patient Record" : "Add New Patient"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="visitDate">Visit Date</Label>
              <DateInput
                name="visitDate"
                value={visitDate}
                onChange={(date) => setVisitDate(date)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patientType">Patient Type</Label>
              <Select
                value={patientType}
                onValueChange={(value: "Cash" | "Insurance") =>
                  setPatientType(value)
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                name="patientName"
                placeholder="Enter patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileNumber">File Number</Label>
              <Input
                id="fileNumber"
                name="fileNumber"
                placeholder="Enter file number"
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                name="age"
                type="number"
                placeholder="Enter age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                name="gender"
                value={gender}
                onValueChange={(value: "Male" | "Female" | "Other") =>
                  setGender(value)
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Insurance Company (only for Insurance type) */}
          {patientType === "Insurance" && (
            <div className="space-y-2">
              <Label htmlFor="insuranceCompany">Insurance Company</Label>
              <Select
                name="insuranceCompany"
                value={insuranceCompany}
                onValueChange={(value) => setInsuranceCompany(value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select insurance company" />
                </SelectTrigger>
                <SelectContent>
                  {insuranceCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.name}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Procedures */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Procedures</Label>
              <Button
                type="button"
                onClick={addProcedure}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Procedure
              </Button>
            </div>

            {procedures.map((procedure, index) => (
              <Card key={procedure.id} className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Procedure {index + 1}</h4>
                    {procedure.name && !procedure.templateId && (
                      <Badge variant="secondary" className="text-xs">
                        OCR
                      </Badge>
                    )}
                  </div>
                  {procedures.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeProcedure(procedure.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Procedure Name</Label>
                    {procedure.templateId || !procedure.name ? (
                      <Select
                        value={procedure.templateId}
                        onValueChange={(value) => {
                          selectProcedureTemplate(procedure.id, value);
                        }}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select procedure" />
                        </SelectTrigger>
                        <SelectContent>
                          {procedureTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={procedure.name}
                        onChange={(e) =>
                          updateProcedure(procedure.id, "name", e.target.value)
                        }
                        placeholder="Enter procedure name"
                        required
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={procedure.discount}
                      onChange={(e) =>
                        updateProcedure(
                          procedure.id,
                          "discount",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Final Amount (SAR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={procedure.finalAmount.toFixed(2)}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Total Amount */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold text-blue-900">
                Total Amount (SAR)
              </Label>
              <span className="text-2xl font-bold text-blue-900">
                {calculateTotalAmount().toFixed(2)}
              </span>
            </div>
          </Card>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              placeholder="Enter any notes or comments about the patient visit..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              {patient ? "Update" : "Add"} Patient
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
