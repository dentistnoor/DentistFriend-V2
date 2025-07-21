import {
  checkAuth,
  setupSidebar,
  showSuccess,
  showError,
  formatDateToDDMMYYYY,
  setupDatePicker,
} from "./common.js";

let allPatients = [];
let filteredPatients = [];
let cashProcedures = [];
let insuranceProcedures = {};

document.addEventListener("DOMContentLoaded", function () {
  checkAuth().then(() => {
    setupSidebar();
    setupEventListeners();
    setupPatientsDatePickers();
    loadPatients();
    loadStoredProcedures();
    // Export button logic
    const exportBtn = document.getElementById("export-patients-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportPatientsToCSV);
    }
  });
});

function setupEventListeners() {
  setupDateFilters();
  setupSearchFilter();
  setupTypeFilter();
  setupModalEventListeners();
}

function setupModalEventListeners() {
  document
    .getElementById("editPatientForm")
    .addEventListener("submit", handleEditFormSubmit);
  document
    .getElementById("edit-add-procedure-btn")
    .addEventListener("click", () => addEditProcedureItem());

  document
    .getElementById("cancelEdit")
    .addEventListener("click", hideEditModal);

  document.getElementById("editPatientModal").addEventListener("click", (e) => {
    if (e.target.id === "editPatientModal") hideEditModal();
  });

  document
    .getElementById("edit-patient-type")
    .addEventListener("change", function () {
      const insuranceGroup = document.getElementById("edit-insurance-group");
      if (this.value === "insurance") {
        insuranceGroup.style.display = "block";
      } else {
        insuranceGroup.style.display = "none";
        document.getElementById("edit-insurance-company").value = "";
      }
    });
}

function setupDateFilters() {
  const presetButtons = document.querySelectorAll(".patients-preset-btn");

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      presetButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const range = button.dataset.range;
      setDateRange(range);
      filterPatients();
    });
  });

  document
    .getElementById("clearDateFilters")
    .addEventListener("click", function () {
      const fromDateInput = document.getElementById("patients-from-date");
      const toDateInput = document.getElementById("patients-to-date");

      fromDateInput.value = "";
      toDateInput.value = "";

      // Update display text
      document.getElementById("patients-from-date-display").textContent =
        "dd/mm/yyyy";
      document.getElementById("patients-to-date-display").textContent =
        "dd/mm/yyyy";

      presetButtons.forEach((btn) => btn.classList.remove("active"));
      document.querySelector('[data-range="all"]').classList.add("active");

      filterPatients();
    });
}

function setupPatientsDatePickers() {
  // Setup "From" date picker
  setupDatePicker({
    triggerId: "patients-from-date-trigger",
    dropdownId: "patients-from-calendar",
    displayId: "patients-from-date-display",
    inputId: "patients-from-date",
    prevMonthId: "patients-from-prev-month",
    nextMonthId: "patients-from-next-month",
    titleId: "patients-from-calendar-title",
    daysId: "patients-from-calendar-days",
    onDateSelect: filterPatients,
  });

  // Setup "To" date picker
  setupDatePicker({
    triggerId: "patients-to-date-trigger",
    dropdownId: "patients-to-calendar",
    displayId: "patients-to-date-display",
    inputId: "patients-to-date",
    prevMonthId: "patients-to-prev-month",
    nextMonthId: "patients-to-next-month",
    titleId: "patients-to-calendar-title",
    daysId: "patients-to-calendar-days",
    onDateSelect: filterPatients,
  });
}

function setDateRange(range) {
  const fromDateInput = document.getElementById("patients-from-date");
  const toDateInput = document.getElementById("patients-to-date");
  const today = new Date();

  switch (range) {
    case "today":
      fromDateInput.value = today.toISOString().split("T")[0];
      toDateInput.value = today.toISOString().split("T")[0];
      break;
    case "7":
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      fromDateInput.value = weekAgo.toISOString().split("T")[0];
      toDateInput.value = today.toISOString().split("T")[0];
      break;
    case "30":
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      fromDateInput.value = monthAgo.toISOString().split("T")[0];
      toDateInput.value = today.toISOString().split("T")[0];
      break;
    case "90":
      const threeMonthsAgo = new Date(
        today.getTime() - 90 * 24 * 60 * 60 * 1000
      );
      fromDateInput.value = threeMonthsAgo.toISOString().split("T")[0];
      toDateInput.value = today.toISOString().split("T")[0];
      break;
    case "365":
      const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      fromDateInput.value = yearAgo.toISOString().split("T")[0];
      toDateInput.value = today.toISOString().split("T")[0];
      break;
    default:
      fromDateInput.value = "";
      toDateInput.value = "";
  }
}

function setupSearchFilter() {
  const searchInput = document.getElementById("search-patients");
  searchInput.addEventListener("input", filterPatients);
}

function setupTypeFilter() {
  const filterButtons = document.querySelectorAll(".filter-btn");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      filterPatients();
    });
  });
}

function loadPatients() {
  const storedPatients = localStorage.getItem("patients");
  if (storedPatients) {
    allPatients = JSON.parse(storedPatients);
    allPatients.forEach((patient, index) => {
      if (!patient.id) {
        patient.id = `patient_${Date.now()}_${index}`;
      }
    });
  } else {
    allPatients = [];
  }

  filteredPatients = [...allPatients];
  renderPatientsTable();
}

function parseLocalDate(dateStr) {
  // dateStr: 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function filterPatients() {
  const searchTerm = document
    .getElementById("search-patients")
    .value.toLowerCase();
  const fromDate = document.getElementById("patients-from-date").value;
  const toDate = document.getElementById("patients-to-date").value;
  const activeFilter =
    document.querySelector(".filter-btn.active").dataset.filter;

  filteredPatients = allPatients.filter((patient) => {
    const searchMatch =
      !searchTerm ||
      (patient.patientName &&
        patient.patientName.toLowerCase().includes(searchTerm)) ||
      (patient.fileNumber &&
        patient.fileNumber.toLowerCase().includes(searchTerm)) ||
      (patient.patientAge &&
        patient.patientAge.toString().includes(searchTerm)) ||
      (patient.patientGender &&
        patient.patientGender.toLowerCase().includes(searchTerm)) ||
      (patient.procedures &&
        Array.isArray(patient.procedures) &&
        patient.procedures.some(
          (proc) => proc.name && proc.name.toLowerCase().includes(searchTerm)
        ));

    // Date filter
    let dateMatch = true;
    if (fromDate || toDate) {
      const visitDate = parseLocalDate(patient.visitDate);
      if (fromDate) {
        const from = parseLocalDate(fromDate);
        dateMatch = dateMatch && visitDate >= from;
      }
      if (toDate) {
        const to = parseLocalDate(toDate);
        to.setHours(23, 59, 59, 999); // End of day
        dateMatch = dateMatch && visitDate <= to;
      }
    }

    // Type filter
    const typeMatch =
      activeFilter === "all" || patient.patientType === activeFilter;

    return searchMatch && dateMatch && typeMatch;
  });

  renderPatientsTable();
}

function renderPatientsTable() {
  const tbody = document.querySelector("#patients-table tbody");
  tbody.innerHTML = "";

  if (filteredPatients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 40px; color: #64748b;">
          No patients found matching your criteria
        </td>
      </tr>
    `;
    return;
  }

  filteredPatients.forEach((patient) => {
    const row = document.createElement("tr");

    const formattedDate = formatDateToDDMMYYYY(patient.visitDate);

    let proceduresDisplay = "-";
    if (patient.procedures && Array.isArray(patient.procedures)) {
      proceduresDisplay = patient.procedures
        .map((proc) => {
          const procName = proc.name || proc.procedure || "";
          return procName;
        })
        .filter((name) => name)
        .join(",<br>");
    }

    const genderClass = patient.patientGender
      ? patient.patientGender.toLowerCase()
      : "unknown";
    const genderText = patient.patientGender
      ? patient.patientGender.toUpperCase()
      : "N/A";

    const typeClass = patient.patientType
      ? patient.patientType.toLowerCase()
      : "unknown";
    const typeText = patient.patientType
      ? patient.patientType.toUpperCase()
      : "N/A";

    const totalAmount = patient.totalAmount || 0;

    row.innerHTML = `
      <td>${filteredPatients.indexOf(patient) + 1}</td>
      <td>${formattedDate}</td>
      <td>${patient.patientName || "-"}</td>
      <td>${patient.fileNumber || "-"}</td>
      <td>${patient.patientAge || "-"}</td>
      <td><span class="badge ${genderClass}">${genderText}</span></td>
      <td><span class="badge ${typeClass}">${typeText}</span></td>
      <td>${patient.insuranceCompany || "-"}</td>
            <td class="remarks-cell" title="${proceduresDisplay}">${proceduresDisplay}</td>
      <td>SAR ${totalAmount.toFixed(2)}</td>
      <td>
        <button class="action-btn edit" onclick="editPatient('${
          patient.id
        }')" title="Edit Patient">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="action-btn delete" onclick="deletePatient('${
          patient.id
        }')" title="Delete Patient">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
          </svg>
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

let currentEditPatientId = null;
let editProcedureCounter = 0;

function editPatient(patientId) {
  const patient = allPatients.find((p) => p.id === patientId);
  if (!patient) {
    showError("Patient not found!");
    return;
  }

  currentEditPatientId = patientId;
  populateEditForm(patient);
  showEditModal();
}

function deletePatient(patientId) {
  const patient = allPatients.find((p) => p.id === patientId);
  if (!patient) {
    showError("Patient not found!");
    return;
  }

  if (
    confirm(`Are you sure you want to delete patient "${patient.patientName}"?`)
  ) {
    const updatedPatients = allPatients.filter((p) => p.id !== patientId);
    localStorage.setItem("patients", JSON.stringify(updatedPatients));

    allPatients = updatedPatients;
    filterPatients();
    renderPatientsTable();

    showSuccess("Patient deleted successfully!");
  }
}

function showEditModal() {
  document.getElementById("editPatientModal").classList.add("show");
  document.body.style.overflow = "hidden";
}

function hideEditModal() {
  document.getElementById("editPatientModal").classList.remove("show");
  document.body.style.overflow = "auto";
  currentEditPatientId = null;
  editProcedureCounter = 0;
}

// Helper to populate insurance company dropdown in edit modal
function populateEditInsuranceCompanies(selectedCompany = "") {
  const select = document.getElementById("edit-insurance-company");
  if (!select) return;
  select.innerHTML = '<option value="">Select insurance company</option>';
  const companies = Object.keys(insuranceProcedures);
  let found = false;
  companies.forEach((company) => {
    const option = document.createElement("option");
    option.value = company;
    option.textContent = company;
    if (company === selectedCompany) found = true;
    select.appendChild(option);
  });
  // If selectedCompany is not in the list, add it as a temporary option
  if (selectedCompany && !found) {
    const option = document.createElement("option");
    option.value = selectedCompany;
    option.textContent = selectedCompany + " (Not in list)";
    select.appendChild(option);
  }
}

function populateEditForm(patient) {
  populateEditInsuranceCompanies(patient.insuranceCompany || "");
  document.getElementById("edit-visit-date").value = patient.visitDate || "";
  document.getElementById("edit-patient-type").value =
    patient.patientType || "";
  document.getElementById("edit-patient-name").value =
    patient.patientName || "";
  document.getElementById("edit-file-number").value = patient.fileNumber || "";
  document.getElementById("edit-patient-age").value = patient.patientAge || "";
  document.getElementById("edit-patient-gender").value =
    patient.patientGender || "";
  document.getElementById("edit-insurance-company").value =
    patient.insuranceCompany || "";
  document.getElementById("edit-total-amount").value = patient.totalAmount || 0;
  document.getElementById("edit-remarks").value = patient.remarks || "";

  const insuranceGroup = document.getElementById("edit-insurance-group");
  if (patient.patientType === "insurance") {
    insuranceGroup.style.display = "block";
  } else {
    insuranceGroup.style.display = "none";
  }

  populateEditProcedures(patient.procedures || []);
  setTimeout(() => updateEditTotalAmount(), 100);
}

function populateEditProcedures(procedures) {
  const proceduresList = document.getElementById("edit-procedures-list");
  proceduresList.innerHTML = "";
  editProcedureCounter = 0;

  if (procedures && procedures.length > 0) {
    procedures.forEach((procedure) => {
      addEditProcedureItem(procedure);
    });
  } else {
    addEditProcedureItem();
  }

  updateEditTotalAmount();
}

function addEditProcedureItem(existingProcedure = null) {
  const proceduresList = document.getElementById("edit-procedures-list");
  const procedureId = editProcedureCounter;
  const procedureItem = document.createElement("div");
  procedureItem.className = "procedure-item";
  procedureItem.dataset.procedureId = procedureId;

  // Determine patient type and insurance company
  const patientType = document.getElementById("edit-patient-type").value;
  const insuranceCompany = document.getElementById(
    "edit-insurance-company"
  ).value;

  // Prepare options
  let optionsHtml = '<option value="">Select procedure</option>';
  let optionValues = [];
  if (patientType === "cash") {
    cashProcedures.forEach((proc) => {
      optionsHtml += `<option value="${proc.description}" data-price="${proc.price}" data-net="${proc.net}">${proc.description}</option>`;
      optionValues.push(proc.description);
    });
  } else if (patientType === "insurance") {
    const procedures = insuranceProcedures[insuranceCompany] || [];
    procedures.forEach((proc) => {
      optionsHtml += `<option value="${proc.description}" data-price="${proc.price}" data-net="${proc.net}" data-discount="${proc.discount}">${proc.description}</option>`;
      optionValues.push(proc.description);
    });
  }

  const procedureName = existingProcedure
    ? existingProcedure.name || existingProcedure.procedure || ""
    : "";
  const procedurePrice = existingProcedure
    ? existingProcedure.price || existingProcedure.finalAmount || 0
    : 0;
  const procedureDiscount = existingProcedure
    ? existingProcedure.discount || 0
    : 0;
  const procedureFinal = existingProcedure
    ? existingProcedure.finalAmount || existingProcedure.price || 0
    : 0;

  // If the procedureName is not in the options, add it as a temporary option
  if (procedureName && !optionValues.includes(procedureName)) {
    optionsHtml += `<option value="${procedureName}" data-price="${procedurePrice}" data-discount="${procedureDiscount}">${procedureName} (Not in list)</option>`;
  }

  procedureItem.innerHTML = `
    <div class="procedure-item-header">
      <span class="procedure-number">Procedure ${procedureId + 1}</span>
      <button type="button" class="remove-procedure-btn" onclick="removeEditProcedureItem(${procedureId})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="procedure-fields">
      <div class="form-group">
        <label for="edit-procedure-name-${procedureId}">Procedure Name</label>
        <select id="edit-procedure-name-${procedureId}" name="edit-procedure-name-${procedureId}" onchange="onEditProcedureSelect(${procedureId})" required>${optionsHtml}</select>
      </div>
      <div class="form-group">
        <label for="edit-procedure-price-${procedureId}">Price (SAR)</label>
        <input type="number" id="edit-procedure-price-${procedureId}" name="edit-procedure-price-${procedureId}" placeholder="0.00" step="0.01" min="0" value="${procedurePrice}" oninput="onEditProcedurePriceOrDiscountChange(${procedureId})" required />
      </div>
      <div class="form-group">
        <label for="edit-procedure-discount-${procedureId}">Discount (%)</label>
        <input type="number" id="edit-procedure-discount-${procedureId}" name="edit-procedure-discount-${procedureId}" placeholder="0" step="0.01" min="0" max="100" value="${procedureDiscount}" oninput="onEditProcedurePriceOrDiscountChange(${procedureId})" />
      </div>
      <div class="form-group">
        <label for="edit-procedure-final-${procedureId}">Final Amount (SAR)</label>
        <input type="number" id="edit-procedure-final-${procedureId}" name="edit-procedure-final-${procedureId}" placeholder="0.00" step="0.01" min="0" value="${procedureFinal}" readonly />
      </div>
    </div>
  `;

  proceduresList.appendChild(procedureItem);
  editProcedureCounter++;
  updateEditTotalAmount();

  // Set selected value if editing
  if (procedureName) {
    const select = document.getElementById(
      `edit-procedure-name-${procedureId}`
    );
    select.value = procedureName;
    window.onEditProcedureSelect(procedureId);
  }
}

function removeEditProcedureItem(procedureId) {
  const procedureItem = document.querySelector(
    `[data-procedure-id="${procedureId}"]`
  );
  if (procedureItem) {
    procedureItem.remove();
    updateEditTotalAmount();
  }
}

window.removeEditProcedureItem = removeEditProcedureItem;
window.updateEditTotalAmount = updateEditTotalAmount;
window.editPatient = editPatient;
window.deletePatient = deletePatient;

function updateEditTotalAmount() {
  let total = 0;
  const procedureItems = document.querySelectorAll(
    "#edit-procedures-list .procedure-item"
  );

  procedureItems.forEach((item) => {
    const priceInput = item.querySelector(
      'input[name^="edit-procedure-price-"]'
    );
    const discountInput = item.querySelector(
      'input[name^="edit-procedure-discount-"]'
    );
    const finalInput = item.querySelector(
      'input[name^="edit-procedure-final-"]'
    );

    if (
      priceInput &&
      priceInput.value &&
      discountInput &&
      discountInput.value &&
      finalInput &&
      finalInput.value
    ) {
      const price = parseFloat(priceInput.value) || 0;
      const discount = parseFloat(discountInput.value) || 0;
      const final = parseFloat(finalInput.value) || 0;
      const net = price - (price * discount) / 100;
      total += net;
    }
  });

  document.getElementById("edit-total-amount").value = total.toFixed(2);
}

function handleEditFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const patientData = {
    id: currentEditPatientId,
    visitDate: formData.get("visit-date"),
    patientType: formData.get("patient-type"),
    patientName: formData.get("patient-name"),
    fileNumber: formData.get("file-number"),
    patientAge: formData.get("patient-age"),
    patientGender: formData.get("patient-gender"),
    insuranceCompany: formData.get("insurance-company") || "",
    procedures: getEditProceduresData(),
    totalAmount:
      parseFloat(document.getElementById("edit-total-amount").value) || 0,
    remarks: formData.get("remarks") || "",
    timestamp: new Date().toISOString(),
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

  const patientIndex = allPatients.findIndex(
    (p) => p.id === currentEditPatientId
  );
  if (patientIndex !== -1) {
    allPatients[patientIndex] = patientData;
    localStorage.setItem("patients", JSON.stringify(allPatients));

    filterPatients();
    renderPatientsTable();

    hideEditModal();
    showSuccess("Patient updated successfully!");
  } else {
    showError("Patient not found!");
  }
}

function getEditProceduresData() {
  const procedures = [];
  const procedureItems = document.querySelectorAll(
    "#edit-procedures-list .procedure-item"
  );

  procedureItems.forEach((item) => {
    const select = item.querySelector("select");
    const priceInput = item.querySelector(
      'input[name^="edit-procedure-price-"]'
    );
    const discountInput = item.querySelector(
      'input[name^="edit-procedure-discount-"]'
    );
    const finalInput = item.querySelector(
      'input[name^="edit-procedure-final-"]'
    );

    if (select && select.value) {
      procedures.push({
        name: select.value,
        price: parseFloat(priceInput.value) || 0,
        discount: parseFloat(discountInput.value) || 0,
        finalAmount: parseFloat(finalInput.value) || 0,
      });
    }
  });

  return procedures;
}

function loadStoredProcedures() {
  const storedCash = localStorage.getItem("cashProcedures");
  const storedInsurance = localStorage.getItem("insuranceProcedures");
  if (storedCash) cashProcedures = JSON.parse(storedCash);
  if (storedInsurance) insuranceProcedures = JSON.parse(storedInsurance);
}

// Robust autofill handler for edit modal, matching add modal logic
window.onEditProcedureSelect = function (procedureId) {
  const select = document.getElementById(`edit-procedure-name-${procedureId}`);
  const selectedOption = select.options[select.selectedIndex];
  const priceInput = document.getElementById(
    `edit-procedure-price-${procedureId}`
  );
  const discountInput = document.getElementById(
    `edit-procedure-discount-${procedureId}`
  );
  const finalInput = document.getElementById(
    `edit-procedure-final-${procedureId}`
  );
  if (selectedOption && selectedOption.dataset.price) {
    priceInput.value = selectedOption.dataset.price;
    if (selectedOption.dataset.discount !== undefined) {
      discountInput.value = selectedOption.dataset.discount || 0;
    } else {
      discountInput.value = discountInput.value || 0;
    }
    const price = parseFloat(priceInput.value) || 0;
    const discount = parseFloat(discountInput.value) || 0;
    const final = price - (price * discount) / 100;
    finalInput.value = final.toFixed(2);
  } else {
    priceInput.value = "";
    discountInput.value = "";
    finalInput.value = "";
  }
  updateEditTotalAmount();
};

// Handler for price/discount change in edit modal
window.onEditProcedurePriceOrDiscountChange = function (procedureId) {
  const proceduresList = document.getElementById("edit-procedures-list");
  const item = proceduresList.querySelector(
    `[data-procedure-id="${procedureId}"]`
  );
  if (!item) return;
  const priceInput = item.querySelector(
    `input[name="edit-procedure-price-${procedureId}"]`
  );
  const discountInput = item.querySelector(
    `input[name="edit-procedure-discount-${procedureId}"]`
  );
  const finalInput = item.querySelector(
    `input[name="edit-procedure-final-${procedureId}"]`
  );
  const price = parseFloat(priceInput.value) || 0;
  const discount = parseFloat(discountInput.value) || 0;
  const final = price - (price * discount) / 100;
  finalInput.value = final.toFixed(2);
  updateEditTotalAmount();
};

// When patient type or insurance company changes, re-render procedures
const editPatientType = document.getElementById("edit-patient-type");
if (editPatientType) {
  editPatientType.addEventListener("change", function () {
    // Re-render procedures
    const proceduresList = document.getElementById("edit-procedures-list");
    const currentProcedures = [];
    proceduresList.querySelectorAll(".procedure-item").forEach((item) => {
      const select = item.querySelector("select");
      const priceInput = item.querySelector(
        'input[name="edit-procedure-price-"]'
      );
      const discountInput = item.querySelector(
        'input[name="edit-procedure-discount-"]'
      );
      const finalInput = item.querySelector(
        'input[name="edit-procedure-final-"]'
      );
      currentProcedures.push({
        name: select ? select.value : "",
        price: priceInput ? parseFloat(priceInput.value) || 0 : 0,
        discount: discountInput ? parseFloat(discountInput.value) || 0 : 0,
        finalAmount: finalInput ? parseFloat(finalInput.value) || 0 : 0,
      });
    });
    proceduresList.innerHTML = "";
    editProcedureCounter = 0;
    currentProcedures.forEach((proc) => addEditProcedureItem(proc));
  });
}
const editInsuranceCompany = document.getElementById("edit-insurance-company");
if (editInsuranceCompany) {
  editInsuranceCompany.addEventListener("change", function () {
    // Re-render procedures
    const proceduresList = document.getElementById("edit-procedures-list");
    const currentProcedures = [];
    proceduresList.querySelectorAll(".procedure-item").forEach((item) => {
      const select = item.querySelector("select");
      const priceInput = item.querySelector(
        'input[name="edit-procedure-price-"]'
      );
      const discountInput = item.querySelector(
        'input[name="edit-procedure-discount-"]'
      );
      const finalInput = item.querySelector(
        'input[name="edit-procedure-final-"]'
      );
      currentProcedures.push({
        name: select ? select.value : "",
        price: priceInput ? parseFloat(priceInput.value) || 0 : 0,
        discount: discountInput ? parseFloat(discountInput.value) || 0 : 0,
        finalAmount: finalInput ? parseFloat(finalInput.value) || 0 : 0,
      });
    });
    proceduresList.innerHTML = "";
    editProcedureCounter = 0;
    currentProcedures.forEach((proc) => addEditProcedureItem(proc));
  });
}

function exportPatientsToCSV() {
  // Use filteredPatients for export
  const data = filteredPatients.length ? filteredPatients : allPatients;
  if (!data.length) {
    showError("No patient records to export.");
    return;
  }
  const headers = [
    "S.No.",
    "Visit Date",
    "Patient Name",
    "File Number",
    "Age",
    "Gender",
    "Type",
    "Insurance",
    "Procedures",
    "Total Amount",
    "Remarks"
  ];
  const rows = data.map((p, i) => [
    i + 1,
    p.visitDate,
    p.patientName,
    p.fileNumber,
    p.patientAge,
    p.patientGender,
    p.patientType,
    p.insuranceCompany || "",
    (p.procedures || []).map(proc => proc.name).join("; "),
    `SAR ${p.totalAmount}`,
    p.remarks ? p.remarks.replace(/\n/g, " ") : ""
  ]);
  let csvContent = headers.join(",") + "\n" + rows.map(r => r.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `patients_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
