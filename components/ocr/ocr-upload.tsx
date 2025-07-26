"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Zap } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface FileWithPreview extends File {
  id: string;
  preview?: string;
}

interface OCRUploadPageProps {
  isSidebarCollapsed?: boolean;
}

export function OCRUploadPage({
  isSidebarCollapsed = false,
}: OCRUploadPageProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: FileWithPreview[] = Array.from(files).map((file) => ({
      ...file,
      id: Math.random().toString(36).substr(2, 9),
    }));

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
  };

  const handleAnalyzeRecords = () => {
    // TODO: Implement OCR analysis logic
    // For now, just show a placeholder message
    alert("OCR analysis feature coming soon!");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Upload Patient Records
        </h1>
        <p className="text-gray-600 mt-2">
          Upload images of patient records for AI-powered data extraction
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          {/* File Upload Area */}
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
              <Button
                variant="outline"
                onClick={() => document.getElementById("file-input")?.click()}
                className="mt-4"
              >
                Select Files
              </Button>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Selected Files ({selectedFiles.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  className="text-gray-500 hover:text-gray-700"
                >
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
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
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
            <div className="mt-8">
              <Button
                onClick={handleAnalyzeRecords}
                className="w-full bg-black hover:bg-gray-800 text-white"
                size="lg"
              >
                <Zap className="w-4 h-4 mr-2" />
                Analyse Records
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
