"use client";

import { useState } from "react";
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
import { Edit, Trash2 } from "lucide-react";
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
import { formatDateForDisplay } from "@/lib/utils";

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
  const { user } = useAuth();
  const { toast } = useToast();

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
              <TableHead>Type</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Procedures</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center py-8 text-muted-foreground"
                >
                  No patient records found. Add your first patient record to get
                  started.
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient, index) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    {formatDateForDisplay(patient.visitDate)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {patient.patientName}
                  </TableCell>
                  <TableCell>{patient.fileNumber}</TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell>{patient.gender}</TableCell>
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
