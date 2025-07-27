# Excel Import Instructions for Procedure Templates

## 📋 Overview
This guide explains how to import procedure templates from an Excel file into the dental practice management system.

## 📁 File Requirements

### File Format
- **File Type**: Excel (.xlsx) files only
- **File Size**: Maximum 10MB
- **Encoding**: UTF-8 (standard)

### Excel Structure Requirements

#### Required Headers (Row 1)
The first row must contain exactly these headers:
```
| Procedure Name | Cash Price (SAR) |
```

#### Data Format
- **Procedure Name**: Text (required)
- **Cash Price (SAR)**: Number (required, must be positive)

## 📝 Step-by-Step Instructions

### Step 1: Prepare Your Excel File

1. **Open Excel** or any spreadsheet application
2. **Create a new workbook** or open an existing one
3. **Set up headers** in the first row:
   - Column A: `Procedure Name`
   - Column B: `Cash Price (SAR)`

### Step 2: Add Your Data

Starting from row 2, add your procedure data:

| Row | Procedure Name | Cash Price (SAR) |
|-----|----------------|------------------|
| 1   | Composite Filling | 250.00 |
| 2   | Root Canal Treatment | 1200.00 |
| 3   | Dental Cleaning | 150.00 |
| 4   | Tooth Extraction | 300.00 |

### Step 3: Save the File

1. **Save as Excel format** (.xlsx)
2. **File name**: Use a descriptive name (e.g., `procedures_import.xlsx`)
3. **Location**: Save to a location you can easily access

### Step 4: Import into the System

1. **Navigate to Settings** in the application
2. **Click on "Procedures" tab**
3. **Click "Import Excel" button**
4. **Select your Excel file** from the file picker
5. **Wait for validation** - the system will check your file
6. **Review results** - you'll see a success message or error details

## ⚠️ Important Notes

### Data Validation Rules
- **Procedure names** cannot be empty
- **Cash prices** must be positive numbers
- **Duplicate procedures** will be skipped (existing procedures won't be overwritten)
- **Empty rows** will be ignored

### Common Issues and Solutions

#### Issue: "Invalid file format"
**Solution**: Make sure you're using a .xlsx file, not .xls or .csv

#### Issue: "Invalid header"
**Solution**: Check that your first row contains exactly:
- Column A: `Procedure Name`
- Column B: `Cash Price (SAR)`

#### Issue: "No data rows"
**Solution**: Make sure you have at least one row of data after the header

#### Issue: "Invalid cash price"
**Solution**: Ensure all prices are positive numbers (e.g., 250.00, not -250 or text)

#### Issue: "Procedure already exists"
**Solution**: The system won't overwrite existing procedures. Remove duplicates from your Excel file or delete existing procedures first.

## 📊 Example Excel File

Here's a complete example of a valid Excel file:

| Procedure Name | Cash Price (SAR) |
|----------------|------------------|
| Composite Filling | 250.00 |
| Root Canal Treatment | 1200.00 |
| Dental Cleaning | 150.00 |
| Tooth Extraction | 300.00 |
| Dental Crown | 800.00 |
| Dental Bridge | 1500.00 |
| Teeth Whitening | 400.00 |
| Dental Implant | 3000.00 |
| Cavity Filling | 200.00 |
| Dental Checkup | 100.00 |

## 🔧 Troubleshooting

### If Import Fails
1. **Check the console** for detailed error messages
2. **Verify file format** is .xlsx
3. **Check headers** match exactly
4. **Validate data** - no empty cells in required fields
5. **Try with a smaller file** first (1-2 procedures)

### Getting Help
If you continue to have issues:
1. **Export an existing file** first to see the correct format
2. **Use the exported file** as a template
3. **Add your new procedures** to the template
4. **Import the modified template**

## ✅ Success Indicators

When import is successful, you'll see:
- ✅ Green success toast message
- 📊 Updated procedure count
- 📋 New procedures appear in the table
- 💾 Data is automatically saved to the database

## 🚫 What Won't Work

- ❌ CSV files (.csv)
- ❌ Old Excel format (.xls)
- ❌ Files with different headers
- ❌ Files with empty procedure names
- ❌ Files with negative or invalid prices
- ❌ Files larger than 10MB 