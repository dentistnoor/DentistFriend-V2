"use client";

import { useState, useEffect } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { PatientRecord } from "@/types/patient";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDateForDisplay, formatGender } from "@/lib/utils";

interface PatientTableProps {
  patients: PatientRecord[];
  onEdit: (patient: PatientRecord) => void;
  onDelete: () => void;
}

export function PatientTable({
  patients,
  onEdit,
  onDelete,
}: PatientTableProps) {
  const [deletePatient, setDeletePatient] = useState<PatientRecord | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();

  // Reset to first page when patients array changes (due to filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [patients]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(patients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPatients = patients.slice(startIndex, endIndex);

  const handleDelete = async () => {
    if (!deletePatient || !user?.email) return;

    try {
      const db = getFirestoreInstance();
      await deleteDoc(
        doc(db, "doctors", user.email, "patient_info", deletePatient.id),
      );
      toast({
        title: "Patient deleted",
        description: "Patient record has been deleted successfully.",
        variant: "success",
      });
      onDelete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete patient record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletePatient(null);
    }
  };

  const formatAmount = (amount: number) => {
    return `SAR ${amount.toFixed(2)}`;
  };

  const formatAge = (age: number | string) => {
    if (!age || age === "" || age === "NaN" || isNaN(Number(age))) {
      return "-";
    }
    return age.toString();
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Visit Date</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>File Number</TableHead>
              <TableHead className="w-16">Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Patient Type</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Insurance Co.</TableHead>
              <TableHead>Procedure</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPatients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center py-8 text-muted-foreground"
                >
                  No patient records found. Add your first patient record to get
                  started.
                </TableCell>
              </TableRow>
            ) : (
              currentPatients.map((patient, index) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell>
                    {formatDateForDisplay(patient.visitDate)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {patient.patientName}
                  </TableCell>
                  <TableCell>{patient.fileNumber}</TableCell>
                  <TableCell>{formatAge(patient.age)}</TableCell>
                  <TableCell>{formatGender(patient.gender)}</TableCell>
                  <TableCell>{patient.nationality || "-"}</TableCell>
                  <TableCell>{patient.patientType || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        patient.type === "Cash" ? "default" : "secondary"
                      }
                    >
                      {patient.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{patient.insuranceCompany || "-"}</TableCell>
                  <TableCell>
                    {patient.procedures.map((p, idx) => (
                      <div key={p.id} className="text-sm">
                        {p.name} {p.discount > 0 && `(${p.discount}% off)`}
                        {idx < patient.procedures.length - 1 && ", "}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatAmount(patient.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(patient)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletePatient(patient)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, patients.length)} of{" "}
            {patients.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deletePatient}
        onOpenChange={() => setDeletePatient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              patient record for <strong>{deletePatient?.patientName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
