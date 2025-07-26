export interface PatientRecord {
  id: string;
  visitDate: string;
  patientName: string;
  fileNumber: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  type: "Cash" | "Insurance";
  insuranceCompany?: string;
  procedures: ProcedureItem[];
  totalAmount: number;
  remarks?: string;
  createdAt: any; // Firestore timestamp
}

export interface ProcedureItem {
  id: string;
  name: string;
  price: number;
  discount: number;
  finalAmount: number;
  templateId?: string;
}

export interface DoctorInfo {
  name: string;
  email: string;
}

export interface ProcedureTemplate {
  id: string;
  name: string;
  cashPrice: number;
}

export interface InsuranceCompany {
  id: string;
  name: string;
}

export interface ProcedureInsurancePrice {
  id: string;
  procedureId: string;
  insuranceCompanyId: string;
  price: number;
}
