import {
  checkAuth,
  setupSidebar,
  showSuccess,
  showError,
  getCurrentUser,
} from "./common.js";

document.addEventListener("DOMContentLoaded", function () {
  checkAuth().then(() => {
    setupSidebar();
    setupEventListeners();
    loadUserProfile();
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

  try {
    const submitBtn = e.target.querySelector(".btn-primary");
    const originalText = submitBtn.innerHTML;
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

    const submitBtn = e.target.querySelector(".btn-primary");
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
    setupFileUpload(cashUploadArea, cashFileInput, "cash-upload-status");
  }

  if (insuranceUploadArea && insuranceFileInput) {
    setupFileUpload(
      insuranceUploadArea,
      insuranceFileInput,
      "insurance-upload-status"
    );
  }
}

function setupFileUpload(uploadArea, fileInput, statusId) {
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
      handleFileSelect(files[0], fileInput, statusElement, uploadArea);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0], fileInput, statusElement, uploadArea);
    }
  });
}

function handleFileSelect(file, fileInput, statusElement, uploadArea) {
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

  showFilePreview(file, uploadArea, statusElement);
  updateStatus(statusElement, "File selected successfully", "success");
}

function showFilePreview(file, uploadArea, statusElement) {
  const existingPreview = uploadArea.querySelector(".file-preview");
  if (existingPreview) {
    existingPreview.remove();
  }

  const filePreview = document.createElement("div");
  filePreview.className = "file-preview";

  const fileSize = formatFileSize(file.size);

  filePreview.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14,2 14,8 20,8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10,9 9,9 8,9"></polyline>
    </svg>
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div class="file-size">${fileSize}</div>
    </div>
    <button type="button" class="remove-file" onclick="removeFile(this)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  uploadArea.appendChild(filePreview);
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function updateStatus(statusElement, message, type) {
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `upload-status ${type}`;
  }
}

window.removeFile = function (button) {
  const filePreview = button.closest(".file-preview");
  const uploadArea = filePreview.closest(".file-upload-area");
  const fileInput = uploadArea.querySelector(".file-input");
  const statusElement =
    uploadArea.parentElement.querySelector(".upload-status");

  filePreview.remove();
  fileInput.value = "";
  updateStatus(statusElement, "", "");
};
