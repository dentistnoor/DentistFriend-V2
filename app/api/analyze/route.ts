import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const files = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const allRecords = [];

    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const imagePart = {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: file.type,
          },
        };

        const prompt = `You are an AI assistant specialized in extracting patient data from handwritten medical records. 

Please analyze this image and extract patient information in the following JSON format:

{
  "visit_date": "date from top of image (DD/MM/YY format)",
  "patients": [
    {
      "name": "patient name",
      "file_number": "file number/ID", 
      "gender": "Female or Male",
      "nationality": "nationality/origin",
      "procedure": "procedure name(s)",
      "amount": "numeric amount"
    }
  ]
}

Instructions:
- First, extract the date from the top of the image and use it as the visit_date for all patients
- Extract all columns from the table:
  - Patient name
  - File number/ID
  - Gender (convert to full format: Female/Male)
  - Nationality
  - Procedure(s) performed
  - Amount (numeric value, leave blank if not present)

Important:
- If OCR cannot read a field, keep it blank or null
- Handle multiple procedures in a single cell (separate by commas)
- Convert gender to full format (Female/Male) - NOT abbreviations
- Extract amounts as numbers only
- The date at the top of the image should be used as the visit_date for ALL patients in the table

Return only valid JSON.`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        try {
          // Clean the response to extract JSON
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const json = JSON.parse(jsonMatch[0]);
            if (Array.isArray(json.patients)) {
              // Add visit_date to each patient record and exclude nationality
              const patientsWithDate = json.patients.map((patient: any) => {
                let formattedDate =
                  json.visit_date || new Date().toISOString().split("T")[0];

                // If we have a date like "18/5/25", convert it to proper format
                if (json.visit_date && json.visit_date.includes("/")) {
                  const parts = json.visit_date.split("/");
                  if (parts.length === 3) {
                    const day = parts[0].padStart(2, "0");
                    const month = parts[1].padStart(2, "0");
                    const year =
                      parts[2].length === 2 ? "20" + parts[2] : parts[2];
                    formattedDate = `${day}/${month}/${year}`;
                  }
                }

                // Return only the fields we want (exclude nationality)
                return {
                  name: patient.name,
                  file_number: patient.file_number,
                  gender: patient.gender,
                  procedure: patient.procedure,
                  amount: patient.amount,
                  visitDate: formattedDate,
                };
              });
              allRecords.push(...patientsWithDate);
            }
          }
        } catch (parseError) {
          console.error("Error parsing JSON from Gemini response:", parseError);
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        // Continue with other files even if one fails
      }
    }

    return NextResponse.json({ records: allRecords });
  } catch (error) {
    console.error("Error in analyze API:", error);
    return NextResponse.json(
      { error: "Failed to analyze files" },
      { status: 500 },
    );
  }
}
