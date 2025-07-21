import {
  checkAuth,
  setupSidebar,
  showSuccess,
  showError,
  getCurrentUser,
} from "./common.js";

let cashProcedures = [];
let insuranceProcedures = {};

document.addEventListener("DOMContentLoaded", function () {
  checkAuth().then(() => {
    setupSidebar();
    setupEventListeners();
    loadUserProfile();
    loadStoredProcedures();
  });
});

function setupEventListeners() {
  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate);
  }

  setupFileUploads();
}

function loadUserProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const userInfo = localStorage.getItem("userInfo");
  if (userInfo) {
    const userData = JSON.parse(userInfo);

    const nameInput = document.getElementById("doctor-name-input");
    const emailInput = document.getElementById("doctor-email-input");

    if (nameInput) {
      nameInput.value = userData.doctorName || currentUser.displayName || "";
    }
    if (emailInput) {
      emailInput.value = userData.email || currentUser.email || "";
    }
  }
}

function loadStoredProcedures() {
  const storedCash = localStorage.getItem("cashProcedures");
  const storedInsurance = localStorage.getItem("insuranceProcedures");

  if (storedCash) {
    cashProcedures = JSON.parse(storedCash);
  }

  if (storedInsurance) {
    insuranceProcedures = JSON.parse(storedInsurance);
  }

  // Display uploaded files
  displayUploadedFiles();
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const currentUser = getCurrentUser();
  if (!currentUser) {
    showError("You must be logged in to update your profile");
    return;
  }

  const formData = new FormData(e.target);
  const doctorName = formData.get("doctor-name");
  const doctorEmail = formData.get("doctor-email");
  const currentPassword = formData.get("current-password");
  const newPassword = formData.get("new-password");

  if (!doctorName || !doctorEmail) {
    showError("Name and email are required");
    return;
  }

  if (newPassword && !currentPassword) {
    showError("Current password is required to change password");
    return;
  }

  const submitBtn = e.target.querySelector(".btn-primary");
  const originalText = submitBtn.innerHTML;

  try {
    submitBtn.innerHTML = "<span>Updating...</span>";
    submitBtn.disabled = true;

    const userInfo = {
      doctorName: doctorName,
      email: doctorEmail,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem("userInfo", JSON.stringify(userInfo));

    if (newPassword) {
      await updatePassword(currentPassword, newPassword);
    }

    showSuccess("Profile updated successfully!");

    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    showError("Failed to update profile. Please try again.");
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

async function updatePassword(currentPassword, newPassword) {
  const { updatePassword: updatePasswordFn } = await import(
    "./firebase-config.js"
  );
  const currentUser = getCurrentUser();

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const credential = {
    email: currentUser.email,
    password: currentPassword,
  };

  await updatePasswordFn(currentUser, newPassword);
}

function setupFileUploads() {
  const cashUploadArea = document.getElementById("cash-upload-area");
  const insuranceUploadArea = document.getElementById("insurance-upload-area");
  const cashFileInput = document.getElementById("cash-procedures");
  const insuranceFileInput = document.getElementById("insurance-procedures");

  if (cashUploadArea && cashFileInput) {
    setupFileUpload(
      cashUploadArea,
      cashFileInput,
      "cash-upload-status",
      "cash"
    );
  }

  if (insuranceUploadArea && insuranceFileInput) {
    setupFileUpload(
      insuranceUploadArea,
      insuranceFileInput,
      "insurance-upload-status",
      "insurance"
    );
  }
}

function setupFileUpload(uploadArea, fileInput, statusId, type) {
  const statusElement = document.getElementById(statusId);

  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // No preview needed
      for (const file of files) {
        handleFileSelect(file, fileInput, statusElement, uploadArea, type);
      }
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      // No preview needed
      for (const file of e.target.files) {
        handleFileSelect(file, fileInput, statusElement, uploadArea, type);
      }
    }
  });
}

function handleFileSelect(file, fileInput, statusElement, uploadArea, type) {
  const allowedTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  const allowedExtensions = [".xlsx", ".xls", ".csv"];
  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));

  if (
    !allowedTypes.includes(file.type) &&
    !allowedExtensions.includes(fileExtension)
  ) {
    showError("Please select a valid Excel or CSV file");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showError("File size must be less than 10MB");
    return;
  }

  updateStatus(statusElement, "Processing file...", "info");

  parseExcelFile(file, type, statusElement);
}

async function parseExcelFile(file, type, statusElement) {
  try {
    const data = await readExcelFile(file);

    if (type === "cash") {
      parseCashProcedures(data);
    } else if (type === "insurance") {
      parseInsuranceProcedures(data, file.name);
    }

    updateStatus(statusElement, "File processed successfully!", "success");
    showSuccess(
      `${type === "cash" ? "Cash" : "Insurance"} procedures updated!`
    );
  } catch (error) {
    updateStatus(
      statusElement,
      "Error processing file. Please check the format.",
      "error"
    );
    showError("Failed to process file. Please check the format and try again.");
  }
}

function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function parseCashProcedures(data) {
  if (!data || data.length < 3) {
    throw new Error(
      "Invalid file format - need at least 3 rows (title, headers, data)"
    );
  }

  // Find the row with actual headers (skip title row)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(3, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      const firstCell = row[0] ? row[0].toString().trim().toLowerCase() : "";
      if (firstCell.includes("product") || firstCell.includes("code")) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const headers = data[headerRowIndex].map((h) =>
    h ? h.toString().trim() : ""
  );

  const descriptionIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("description")
  );
  const priceIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("price")
  );
  const netIndex = headers.findIndex((h) => h.toLowerCase().includes("net"));
  const discountIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("discount")
  );

  if (descriptionIndex === -1 || priceIndex === -1 || netIndex === -1) {
    throw new Error(
      "Required columns not found. Please check the file format."
    );
  }
  if (discountIndex !== -1) {
    throw new Error(
      "This file appears to be for insurance, not cash. Please upload it in the correct section."
    );
  }

  cashProcedures = [];

  // Start reading data from the row after headers
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[descriptionIndex] && row[priceIndex]) {
      cashProcedures.push({
        description: row[descriptionIndex].toString().trim(),
        price: parseFloat(row[priceIndex]) || 0,
        net: parseFloat(row[netIndex]) || parseFloat(row[priceIndex]) || 0,
        discount: 0,
      });
    }
  }
  localStorage.setItem("cashProcedures", JSON.stringify(cashProcedures));
  displayUploadedFiles();
}

function parseInsuranceProcedures(data, fileName) {
  if (!data || data.length < 3) {
    throw new Error(
      "Invalid file format - need at least 3 rows (title, headers, data)"
    );
  }

  // Find the row with actual headers (skip title row)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(3, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      const firstCell = row[0] ? row[0].toString().trim().toLowerCase() : "";
      if (firstCell.includes("product") || firstCell.includes("code")) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const headers = data[headerRowIndex].map((h) =>
    h ? h.toString().trim() : ""
  );

  const descriptionIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("description")
  );
  const priceIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("price")
  );
  const netIndex = headers.findIndex((h) => h.toLowerCase().includes("net"));
  const discountIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("discount")
  );

  if (
    descriptionIndex === -1 ||
    priceIndex === -1 ||
    netIndex === -1 ||
    discountIndex === -1
  ) {
    throw new Error(
      "Required columns not found. Please check the file format."
    );
  }

  const companyName = fileName.replace(/\.(xlsx|xls|csv)$/i, "").trim();

  const procedures = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[descriptionIndex] && row[priceIndex]) {
      procedures.push({
        description: row[descriptionIndex].toString().trim(),
        price: parseFloat(row[priceIndex]) || 0,
        net: parseFloat(row[netIndex]) || 0,
        discount: parseFloat(row[discountIndex]) || 0,
      });
    }
  }
  insuranceProcedures[companyName] = procedures;
  localStorage.setItem(
    "insuranceProcedures",
    JSON.stringify(insuranceProcedures)
  );
  displayUploadedFiles();
}

function updateStatus(statusElement, message, type) {
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `upload-status ${type}`;
  }
}

// Export functions for use in other modules
window.getCashProcedures = function () {
  return cashProcedures;
};

window.getInsuranceProcedures = function () {
  return insuranceProcedures;
};

window.getInsuranceCompanies = function () {
  return Object.keys(insuranceProcedures);
};

function displayUploadedFiles() {
  displayCashFiles();
  displayInsuranceFiles();
}

function displayCashFiles() {
  const container = document.getElementById("uploaded-cash-files");
  if (!container) return;

  if (cashProcedures.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10,9 9,9 8,9"></polyline>
        </svg>
        <p>No cash procedures uploaded yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="uploaded-file-item">
      <div class="uploaded-file-info">
        <svg class="uploaded-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10,9 9,9 8,9"></polyline>
        </svg>
        <div class="uploaded-file-details">
          <div class="uploaded-file-name">Cash Procedures</div>
          <div class="uploaded-file-stats">${cashProcedures.length} procedures uploaded</div>
        </div>
      </div>
      <div class="uploaded-file-actions">
        <button type="button" class="remove-file-btn" onclick="removeCashProcedures()" title="Remove cash procedures">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function displayInsuranceFiles() {
  const container = document.getElementById("uploaded-insurance-files");
  if (!container) return;

  const companies = Object.keys(insuranceProcedures);

  if (companies.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10,9 9,9 8,9"></polyline>
        </svg>
        <p>No insurance procedures uploaded yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = companies
    .map((company) => {
      const procedures = insuranceProcedures[company];
      return `
      <div class="uploaded-file-item">
        <div class="uploaded-file-info">
          <svg class="uploaded-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          <div class="uploaded-file-details">
            <div class="uploaded-file-name">${company}</div>
            <div class="uploaded-file-stats">${procedures.length} procedures uploaded</div>
          </div>
        </div>
        <div class="uploaded-file-actions">
          <button type="button" class="remove-file-btn" onclick="removeInsuranceProcedures('${company}')" title="Remove ${company} procedures">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

window.removeCashProcedures = function () {
  if (
    confirm(
      "Are you sure you want to remove all cash procedures? This action cannot be undone."
    )
  ) {
    cashProcedures = [];
    localStorage.removeItem("cashProcedures");
    displayUploadedFiles();
    showSuccess("Cash procedures removed successfully!");
  }
};

window.removeInsuranceProcedures = function (company) {
  if (
    confirm(
      `Are you sure you want to remove all ${company} procedures? This action cannot be undone.`
    )
  ) {
    delete insuranceProcedures[company];
    localStorage.setItem(
      "insuranceProcedures",
      JSON.stringify(insuranceProcedures)
    );
    displayUploadedFiles();
    showSuccess(`${company} procedures removed successfully!`);
  }
};
