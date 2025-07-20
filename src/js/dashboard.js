import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "./firebase-config.js";

let procedureCounter = 0;
let currentUser = null;

document.addEventListener("DOMContentLoaded", function () {
  checkAuth();

  setupEventListeners();
});

function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;

      const userInfo = localStorage.getItem("userInfo");
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        document.getElementById("doctor-name").textContent =
          userData.doctorName || "Doctor";
        document.getElementById("doctor-email").textContent = userData.email;
      } else {
        document.getElementById("doctor-name").textContent =
          user.displayName || "Doctor";
        document.getElementById("doctor-email").textContent = user.email;
      }
    } else {
      localStorage.removeItem("userInfo");
      window.location.href = "signin.html";
    }
  });
}

function logout() {
  signOut(auth)
    .then(() => {
      localStorage.removeItem("userInfo");
      window.location.href = "signin.html";
    })
    .catch((error) => {
      showError("Error signing out. Please try again.");
    });
}

window.logout = logout;

function formatDateToDDMMYYYY(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function setupEventListeners() {
  const patientForm = document.getElementById("patient-form");
  if (patientForm) {
    patientForm.addEventListener("submit", handleFormSubmit);
  }

  const patientTypeSelect = document.getElementById("patient-type");
  if (patientTypeSelect) {
    patientTypeSelect.addEventListener("change", handlePatientTypeChange);
  }

  const addProcedureBtn = document.getElementById("add-procedure-btn");
  if (addProcedureBtn) {
    addProcedureBtn.addEventListener("click", addProcedureItem);
  }

  setupSidebarToggle();

  setupDatePicker();
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    showError("You must be logged in to add patients");
    return;
  }

  const formData = new FormData(e.target);
  const patientData = {
    visitDate: formData.get("visit-date"),
    patientType: formData.get("patient-type"),
    patientName: formData.get("patient-name"),
    fileNumber: formData.get("file-number"),
    patientAge: formData.get("patient-age"),
    patientGender: formData.get("patient-gender"),
    insuranceCompany: formData.get("insurance-company") || "",
    procedures: getProceduresData(),
    totalAmount: parseFloat(document.getElementById("total-amount").value) || 0,
    remarks: formData.get("remarks") || "",
    timestamp: new Date().toISOString(),
    userId: currentUser.uid,
  };

  if (
    !patientData.visitDate ||
    !patientData.patientName ||
    !patientData.fileNumber ||
    !patientData.patientAge ||
    !patientData.patientGender ||
    !patientData.patientType
  ) {
    showError("Please fill in all required fields");
    return;
  }

  try {
    const submitBtn = e.target.querySelector(".submit-btn");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = "<span>Adding Patient...</span>";
    submitBtn.disabled = true;

    await addDoc(
      collection(db, "doctors", currentUser.uid, "patients"),
      patientData
    );

    showSuccess("Patient added successfully!");

    e.target.reset();
    clearAllProcedures();
    document.getElementById("selected-date-display").textContent =
      "Select a date";
    document.getElementById("visit-date").value = "";

    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    showError("Failed to add patient. Please try again.");

    const submitBtn = e.target.querySelector(".submit-btn");
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

function handlePatientTypeChange(e) {
  const insuranceRow = document.getElementById("insurance-company-row");
  if (e.target.value === "insurance") {
    insuranceRow.style.display = "block";
  } else {
    insuranceRow.style.display = "none";
    document.getElementById("insurance-company").value = "";
  }
}

function addProcedureItem() {
  procedureCounter++;
  const proceduresList = document.getElementById("procedures-list");

  const procedureItem = document.createElement("div");
  procedureItem.className = "procedure-item";
  procedureItem.id = `procedure-${procedureCounter}`;

  procedureItem.innerHTML = `
    <div class="procedure-item-header">
      <span class="procedure-number">Procedure ${procedureCounter}</span>
      <button type="button" class="remove-procedure-btn" onclick="removeProcedureItem(${procedureCounter})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Remove
      </button>
    </div>
    <div class="procedure-fields">
      <div class="form-group">
        <label for="procedure-name-${procedureCounter}">Procedure Name</label>
        <input type="text" id="procedure-name-${procedureCounter}" name="procedure-name-${procedureCounter}" placeholder="Enter procedure name" required>
      </div>
      <div class="form-group">
        <label for="procedure-price-${procedureCounter}">Price (SAR)</label>
        <input type="number" id="procedure-price-${procedureCounter}" name="procedure-price-${procedureCounter}" placeholder="0.00" step="0.01" min="0" required>
      </div>
    </div>
  `;

  proceduresList.appendChild(procedureItem);

  const priceInput = document.getElementById(
    `procedure-price-${procedureCounter}`
  );
  priceInput.addEventListener("input", () => updateTotalAmount());
}

window.removeProcedureItem = function (procedureId) {
  const procedureItem = document.getElementById(`procedure-${procedureId}`);
  if (procedureItem) {
    procedureItem.remove();
    updateTotalAmount();
  }
};

function getProceduresData() {
  const procedures = [];
  const procedureItems = document.querySelectorAll(".procedure-item");

  procedureItems.forEach((item) => {
    const procedureId = item.id.split("-")[1];
    const name = document.getElementById(`procedure-name-${procedureId}`).value;
    const price =
      parseFloat(
        document.getElementById(`procedure-price-${procedureId}`).value
      ) || 0;

    if (name && price > 0) {
      procedures.push({
        name: name,
        price: price,
      });
    }
  });

  return procedures;
}

function updateTotalAmount() {
  let total = 0;
  const procedureItems = document.querySelectorAll(".procedure-item");

  procedureItems.forEach((item) => {
    const procedureId = item.id.split("-")[1];
    const price =
      parseFloat(
        document.getElementById(`procedure-price-${procedureId}`).value
      ) || 0;
    total += price;
  });

  document.getElementById("total-amount").value = total.toFixed(2);
}

function clearAllProcedures() {
  const proceduresList = document.getElementById("procedures-list");
  proceduresList.innerHTML = "";
  procedureCounter = 0;
  updateTotalAmount();
}

function setupSidebarToggle() {
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function toggleSidebar() {
    if (isMobile()) {
      toggleMobileSidebar();
    } else {
      toggleDesktopSidebar();
    }
  }

  function toggleMobileSidebar() {
    sidebar.classList.toggle("mobile-open");
    sidebarOverlay.classList.toggle("show");
  }

  function closeMobileSidebar() {
    sidebar.classList.remove("mobile-open");
    sidebarOverlay.classList.remove("show");
  }

  function toggleDesktopSidebar() {
    sidebar.classList.toggle("collapsed");
    mainContent.classList.toggle("sidebar-collapsed");
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeMobileSidebar);
  }

  function handleResize() {
    if (!isMobile()) {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("show");
    }
  }

  window.addEventListener("resize", handleResize);
}

function setupDatePicker() {
  const datePickerTrigger = document.getElementById("date-picker-trigger");
  const calendarDropdown = document.getElementById("calendar-dropdown");
  const selectedDateDisplay = document.getElementById("selected-date-display");
  const visitDateInput = document.getElementById("visit-date");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const calendarTitle = document.getElementById("calendar-title");
  const calendarDays = document.getElementById("calendar-days");

  let currentDate = new Date();
  let selectedDate = null;
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();

  function toggleDropdown() {
    const isOpen = calendarDropdown.classList.contains("show");
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function openDropdown() {
    calendarDropdown.classList.add("show");
    datePickerTrigger.setAttribute("aria-expanded", "true");
    renderCalendar();
  }

  function closeDropdown() {
    calendarDropdown.classList.remove("show");
    datePickerTrigger.setAttribute("aria-expanded", "false");
  }

  function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    calendarTitle.textContent = new Date(
      currentYear,
      currentMonth
    ).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    calendarDays.innerHTML = "";

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dayElement = createDayElement(date.getDate(), "");

      if (date.getMonth() !== currentMonth) {
        dayElement.classList.add("other-month");
      }

      if (date.toDateString() === currentDate.toDateString()) {
        dayElement.classList.add("today");
      }

      if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
        dayElement.classList.add("selected");
      }

      dayElement.addEventListener("click", () => selectDate(date));
      calendarDays.appendChild(dayElement);
    }
  }

  function createDayElement(day, className = "") {
    const div = document.createElement("div");
    div.className = `calendar-day ${className}`;
    div.textContent = day;
    return div;
  }

  function selectDate(date) {
    selectedDate = date;
    updateSelectedDate(date);
    closeDropdown();
  }

  function updateSelectedDate(date) {
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    selectedDateDisplay.textContent = formattedDate;
    visitDateInput.value = date.toISOString().split("T")[0];
  }

  if (datePickerTrigger) {
    datePickerTrigger.addEventListener("click", toggleDropdown);
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
  }

  document.addEventListener("click", (e) => {
    if (
      !datePickerTrigger.contains(e.target) &&
      !calendarDropdown.contains(e.target)
    ) {
      closeDropdown();
    }
  });
}

function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22,4 12,14.01 9,11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;

  document.body.appendChild(successDiv);

  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
    <span>${message}</span>
  `;

  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}
