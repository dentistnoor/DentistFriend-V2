import {
  checkAuth,
  setupSidebar,
  showSuccess,
  showError,
  getCurrentUser,
  formatDateToYYYYMMDDLocal,
} from "./common.js";

let procedureCounter = 0;
let cashProcedures = [];
let insuranceProcedures = {};

document.addEventListener("DOMContentLoaded", function () {
  checkAuth().then(() => {
    setupSidebar();
    setupEventListeners();
    loadStoredProcedures();
  });
});

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

  const insuranceCompanySelect = document.getElementById("insurance-company");
  if (insuranceCompanySelect) {
    insuranceCompanySelect.addEventListener(
      "change",
      handleInsuranceCompanyChange
    );
  }

  setupDatePicker();
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
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const currentUser = getCurrentUser();
  if (!currentUser) {
    showError("You must be logged in to add patients");
    return;
  }

  const formData = new FormData(e.target);
  const patientData = {
    id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

    // TODO: Integrate with Google Sheets API
    const existingPatients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );
    existingPatients.push(patientData);
    localStorage.setItem("patients", JSON.stringify(existingPatients));

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
    populateInsuranceCompanies();
  } else {
    insuranceRow.style.display = "none";
    document.getElementById("insurance-company").value = "";
  }

  // Clear all existing procedure data and update dropdowns
  const procedureItems = document.querySelectorAll(".procedure-item");
  procedureItems.forEach((item) => {
    const procedureId = item.id.split("-")[1];
    clearProcedureFields(procedureId);
    populateProcedureDropdown(procedureId);
  });

  // Update field editability based on patient type
  updateFieldEditability(e.target.value);
}

function populateInsuranceCompanies() {
  const select = document.getElementById("insurance-company");
  const companies = Object.keys(insuranceProcedures);

  select.innerHTML = '<option value="">Select insurance company</option>';
  companies.forEach((company) => {
    const option = document.createElement("option");
    option.value = company;
    option.textContent = company;
    select.appendChild(option);
  });
}

function handleInsuranceCompanyChange() {
  // Clear all existing procedure data and update dropdowns
  const procedureItems = document.querySelectorAll(".procedure-item");
  procedureItems.forEach((item) => {
    const procedureId = item.id.split("-")[1];
    clearProcedureFields(procedureId);
    populateProcedureDropdown(procedureId);
  });

  // Update field editability based on current patient type
  const patientType = document.getElementById("patient-type").value;
  updateFieldEditability(patientType);
}

function clearProcedureFields(procedureId) {
  const priceInput = document.getElementById(`procedure-price-${procedureId}`);
  const discountInput = document.getElementById(
    `procedure-discount-${procedureId}`
  );
  const finalInput = document.getElementById(`procedure-final-${procedureId}`);
  const nameSelect = document.getElementById(`procedure-name-${procedureId}`);

  if (priceInput) priceInput.value = "";
  if (discountInput) discountInput.value = "";
  if (finalInput) finalInput.value = "";
  if (nameSelect) nameSelect.value = "";
}

function updateFieldEditability(patientType) {
  const procedureItems = document.querySelectorAll(".procedure-item");

  procedureItems.forEach((item) => {
    const procedureId = item.id.split("-")[1];
    const priceInput = document.getElementById(
      `procedure-price-${procedureId}`
    );
    const discountInput = document.getElementById(
      `procedure-discount-${procedureId}`
    );
    const finalInput = document.getElementById(
      `procedure-final-${procedureId}`
    );

    if (patientType === "insurance") {
      // Make fields read-only for insurance
      if (priceInput) priceInput.readOnly = true;
      if (discountInput) discountInput.readOnly = true;
      if (finalInput) finalInput.readOnly = true;
    } else {
      // Make fields editable for cash
      if (priceInput) priceInput.readOnly = false;
      if (discountInput) discountInput.readOnly = false;
      if (finalInput) finalInput.readOnly = false;
    }
  });
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
        <select id="procedure-name-${procedureCounter}" name="procedure-name-${procedureCounter}" onchange="onProcedureSelect(${procedureCounter})" required>
          <option value="">Select procedure</option>
        </select>
      </div>
      <div class="form-group">
        <label for="procedure-price-${procedureCounter}">Price (SAR)</label>
        <input type="number" id="procedure-price-${procedureCounter}" name="procedure-price-${procedureCounter}" placeholder="0.00" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="procedure-discount-${procedureCounter}">Discount (%)</label>
        <input type="number" id="procedure-discount-${procedureCounter}" name="procedure-discount-${procedureCounter}" placeholder="0" step="0.01" min="0" max="100" onchange="onDiscountChange(${procedureCounter})">
      </div>
      <div class="form-group">
        <label for="procedure-final-${procedureCounter}">Final Amount (SAR)</label>
        <input type="number" id="procedure-final-${procedureCounter}" name="procedure-final-${procedureCounter}" placeholder="0.00" step="0.01" min="0" readonly>
      </div>
    </div>
  `;

  proceduresList.appendChild(procedureItem);
  populateProcedureDropdown(procedureCounter);

  // Set field editability based on current patient type
  const patientType = document.getElementById("patient-type").value;
  updateFieldEditability(patientType);
}

window.removeProcedureItem = function (procedureId) {
  const procedureItem = document.getElementById(`procedure-${procedureId}`);
  if (procedureItem) {
    procedureItem.remove();
    updateTotalAmount();
  }
};

window.onProcedureSelect = onProcedureSelect;
window.onDiscountChange = onDiscountChange;

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
    const discount =
      parseFloat(
        document.getElementById(`procedure-discount-${procedureId}`).value
      ) || 0;
    const finalAmount =
      parseFloat(
        document.getElementById(`procedure-final-${procedureId}`).value
      ) || 0;

    if (name && finalAmount > 0) {
      procedures.push({
        name: name,
        price: price,
        discount: discount,
        finalAmount: finalAmount,
      });
    }
  });

  return procedures;
}

function populateProcedureDropdown(procedureId) {
  const select = document.getElementById(`procedure-name-${procedureId}`);
  const patientType = document.getElementById("patient-type").value;

  select.innerHTML = '<option value="">Select procedure</option>';

  if (patientType === "cash") {
    cashProcedures.forEach((proc) => {
      const option = document.createElement("option");
      option.value = proc.description;
      option.textContent = proc.description;
      option.dataset.price = proc.price;
      option.dataset.net = proc.net;
      select.appendChild(option);
    });
  } else if (patientType === "insurance") {
    const insuranceCompany = document.getElementById("insurance-company").value;
    const procedures = insuranceProcedures[insuranceCompany] || [];

    procedures.forEach((proc) => {
      const option = document.createElement("option");
      option.value = proc.description;
      option.textContent = proc.description;
      option.dataset.price = proc.price;
      option.dataset.net = proc.net;
      option.dataset.discount = proc.discount;
      select.appendChild(option);
    });
  }
}

function onProcedureSelect(procedureId) {
  const select = document.getElementById(`procedure-name-${procedureId}`);
  const selectedOption = select.options[select.selectedIndex];

  if (selectedOption && selectedOption.dataset.price) {
    const priceInput = document.getElementById(
      `procedure-price-${procedureId}`
    );
    const discountInput = document.getElementById(
      `procedure-discount-${procedureId}`
    );
    const finalInput = document.getElementById(
      `procedure-final-${procedureId}`
    );

    priceInput.value = selectedOption.dataset.price;
    discountInput.value = selectedOption.dataset.discount || 0;

    const price = parseFloat(selectedOption.dataset.price) || 0;
    const discount = parseFloat(selectedOption.dataset.discount) || 0;
    const final = price - (price * discount) / 100;

    finalInput.value = final.toFixed(2);
    updateTotalAmount();

    // Update field editability after filling data
    const patientType = document.getElementById("patient-type").value;
    updateFieldEditability(patientType);
  }
}

function onDiscountChange(procedureId) {
  const priceInput = document.getElementById(`procedure-price-${procedureId}`);
  const discountInput = document.getElementById(
    `procedure-discount-${procedureId}`
  );
  const finalInput = document.getElementById(`procedure-final-${procedureId}`);

  const price = parseFloat(priceInput.value) || 0;
  const discount = parseFloat(discountInput.value) || 0;
  const final = price - (price * discount) / 100;

  finalInput.value = final.toFixed(2);
  updateTotalAmount();
}

function updateTotalAmount() {
  let total = 0;
  const procedureItems = document.querySelectorAll(".procedure-item");

  procedureItems.forEach((item) => {
    const procedureId = item.id.split("-")[1];
    const finalAmount =
      parseFloat(
        document.getElementById(`procedure-final-${procedureId}`).value
      ) || 0;
    total += finalAmount;
  });

  document.getElementById("total-amount").value = total.toFixed(2);
}

function clearAllProcedures() {
  const proceduresList = document.getElementById("procedures-list");
  proceduresList.innerHTML = "";
  procedureCounter = 0;
  updateTotalAmount();
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
  let selectedDate = new Date(); // Set default to today
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();

  // Set initial display and input to today
  updateSelectedDate(selectedDate);

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
    ).toLocaleDateString("en-GB", {
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
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    selectedDateDisplay.textContent = formattedDate;
    visitDateInput.value = formatDateToYYYYMMDDLocal(date);
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
