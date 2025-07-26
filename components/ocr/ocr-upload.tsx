"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  X,
  Zap,
  ArrowLeft,
  ArrowRight,
  Check,
  Trash2,
  Edit2,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatGender } from "@/lib/utils";

interface FileWithPreview extends File {
  id: string;
  preview?: string;
}

interface OCRUploadPageProps {}

interface PatientOCRRecord {
  name: string;
  file_number: string;
  gender: string;
  procedure: string;
  amount: string;
  visitDate?: string;
}

export function OCRUploadPage({}: OCRUploadPageProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<PatientOCRRecord[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPatientIndex, setCurrentPatientIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressMessages = [
    "Processing with AI...",
    "Analyzing document structure...",
    "Extracting patient data...",
    "Structuring information...",
    "Validating results...",
    "Finalizing extraction...",
  ];

  const convertDateFormat = (dateString: string): string => {
    if (!dateString) return new Date().toISOString().split("T")[0];
    const [day, month, year] = dateString.split("/");
    if (day && month && year) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return new Date().toISOString().split("T")[0];
  };

  const capitalizeProcedure = (procedure: string): string => {
    if (!procedure) return "";
    return procedure
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: FileWithPreview[] = Array.from(files).map((file) => {
      const fileWithPreview = Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        preview: URL.createObjectURL(file),
      });
      return fileWithPreview;
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setResults([]);
    setCurrentPatientIndex(0);
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const analyzeFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsAnalyzing(true);
    setResults([]);
    setCurrentPatientIndex(0);
    setProgress(0);

    try {
      setProgress(10);
      setProgressMessage(progressMessages[0]);

      const formData = new FormData();
      selectedFiles.forEach((file, idx) => {
        formData.append(`file${idx}`, file, file.name);
      });

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const nextProgress = prev + Math.random() * 15 + 5;
          const messageIndex = Math.floor(
            (nextProgress / 100) * progressMessages.length,
          );
          setProgressMessage(
            progressMessages[
              Math.min(messageIndex, progressMessages.length - 1)
            ],
          );
          return Math.min(Math.round(nextProgress), 90);
        });
      }, 300);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "OCR failed");
      }

      const data = await response.json();

      if (data.records && Array.isArray(data.records)) {
        setProgress(100);
        setProgressMessage(progressMessages[progressMessages.length - 1]);

        setTimeout(() => {
          setResults(data.records);
          setIsAnalyzing(false);
          setProgress(0);
          setProgressMessage("");
        }, 500);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      alert(
        `OCR failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      setIsAnalyzing(false);
      setProgress(0);
      setProgressMessage("");
    }
  };

  const handleEdit = (index: number) => setEditingIndex(index);
  const handleSave = (index: number) => setEditingIndex(null);
  const handleFieldChange = (
    index: number,
    field: keyof PatientOCRRecord,
    value: string,
  ) => {
    const updated = [...results];
    updated[index] = { ...updated[index], [field]: value };
    setResults(updated);
  };
  const handleDeleteRecord = (index: number) => {
    setResults(results.filter((_, i) => i !== index));
    if (currentPatientIndex >= results.length - 1) {
      setCurrentPatientIndex(Math.max(0, results.length - 2));
    }
  };

  const handleConfirm = async () => {
    if (!user?.email) return alert("You must be logged in to save records.");
    setIsSaving(true);
    try {
      for (const record of results) {
        const patientData = {
          visitDate: record.visitDate
            ? convertDateFormat(record.visitDate)
            : new Date().toISOString().split("T")[0],
          patientName: record.name,
          fileNumber: record.file_number,
          age: "",
          gender: record.gender === "Male" ? "M" : "F",
          type: "Cash",
          insuranceCompany: "",
          procedures: [
            {
              id: Math.random().toString(36).substr(2, 9),
              name: capitalizeProcedure(record.procedure || "Not specified"),
              price: Number(record.amount) || 0,
              discount: 0,
              finalAmount: Number(record.amount) || 0,
            },
          ],
          totalAmount: Number(record.amount) || 0,
          remarks: "",
          createdAt: new Date(),
        };
        await addDoc(
          collection(db(), "doctors", user.email, "patient_info"),
          patientData,
        );
      }
      alert("Records saved successfully!");
      clearAllFiles();
    } catch (err) {
      alert("Failed to save records.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentPatient = results[currentPatientIndex];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">OCR Upload</h1>
        <p className="text-gray-600 mt-2">
          Upload patient records for AI-powered data extraction
        </p>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop files here or click to upload
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports JPG, PNG, PDF files • Max 10MB per file
                </p>
              </div>
              <Button variant="outline" onClick={handleSelectFiles}>
                Select Files
              </Button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              handleFileSelect(e.target.files);
            }}
          />

          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Selected Files ({selectedFiles.length})
                </h3>
                <Button variant="outline" size="sm" onClick={clearAllFiles}>
                  Clear All
                </Button>
              </div>
              <div className="space-y-2">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {file.name || "Unknown file"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.size
                            ? formatFileSize(file.size)
                            : "Unknown size"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <Button
                onClick={analyzeFiles}
                disabled={isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                {isAnalyzing ? "Analyzing Records..." : "Analyze Records"}
              </Button>

              {isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{progressMessage}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Results - Patient by Patient View */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Patient Records</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfirm}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save All Records
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Patient Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPatientIndex(Math.max(0, currentPatientIndex - 1))
                }
                disabled={currentPatientIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Patient {currentPatientIndex + 1} of {results.length}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPatientIndex(
                    Math.min(results.length - 1, currentPatientIndex + 1),
                  )
                }
                disabled={currentPatientIndex === results.length - 1}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Current Patient Card */}
            {currentPatient && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Patient Name</Label>
                    {editingIndex === currentPatientIndex ? (
                      <Input
                        id="name"
                        value={currentPatient.name}
                        onChange={(e) =>
                          handleFieldChange(
                            currentPatientIndex,
                            "name",
                            e.target.value,
                          )
                        }
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="font-medium">{currentPatient.name}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fileNumber">File Number</Label>
                    {editingIndex === currentPatientIndex ? (
                      <Input
                        id="fileNumber"
                        value={currentPatient.file_number}
                        onChange={(e) =>
                          handleFieldChange(
                            currentPatientIndex,
                            "file_number",
                            e.target.value,
                          )
                        }
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="font-medium">
                          {currentPatient.file_number}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    {editingIndex === currentPatientIndex ? (
                      <Input
                        id="gender"
                        value={currentPatient.gender}
                        onChange={(e) =>
                          handleFieldChange(
                            currentPatientIndex,
                            "gender",
                            e.target.value,
                          )
                        }
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="font-medium">
                          {formatGender(currentPatient.gender)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="procedure">Procedure</Label>
                    {editingIndex === currentPatientIndex ? (
                      <Input
                        id="procedure"
                        value={currentPatient.procedure}
                        onChange={(e) =>
                          handleFieldChange(
                            currentPatientIndex,
                            "procedure",
                            e.target.value,
                          )
                        }
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="font-medium">
                          {capitalizeProcedure(
                            currentPatient.procedure || "Not specified",
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (SAR)</Label>
                    {editingIndex === currentPatientIndex ? (
                      <Input
                        id="amount"
                        value={currentPatient.amount}
                        onChange={(e) =>
                          handleFieldChange(
                            currentPatientIndex,
                            "amount",
                            e.target.value,
                          )
                        }
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="font-medium">
                          {currentPatient.amount
                            ? `SAR ${currentPatient.amount}`
                            : "Not specified"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visitDate">Visit Date</Label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="font-medium">
                        {currentPatient.visitDate || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    {editingIndex === currentPatientIndex ? (
                      <Button onClick={() => handleSave(currentPatientIndex)}>
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(currentPatientIndex)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteRecord(currentPatientIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
