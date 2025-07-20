import {
  checkAuth,
  setupSidebar,
  showSuccess,
  showError,
  formatDateToDDMMYYYY,
} from "./common.js";

let allPatients = [];
let filteredPatients = [];

document.addEventListener("DOMContentLoaded", function () {
  checkAuth().then(() => {
    setupSidebar();
    setupEventListeners();
    loadPatients();
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
  const fromDateInput = document.getElementById("patients-from-date");
  const toDateInput = document.getElementById("patients-to-date");

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      presetButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const range = button.dataset.range;
      setDateRange(range);
      filterPatients();
    });
  });

  fromDateInput.addEventListener("change", filterPatients);
  toDateInput.addEventListener("change", filterPatients);

  document
    .getElementById("clearDateFilters")
    .addEventListener("click", function () {
      fromDateInput.value = "";
      toDateInput.value = "";

      presetButtons.forEach((btn) => btn.classList.remove("active"));
      document.querySelector('[data-range="all"]').classList.add("active");

      filterPatients();
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
      const visitDate = new Date(patient.visitDate);
      if (fromDate) {
        const from = new Date(fromDate);
        dateMatch = dateMatch && visitDate >= from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59); // End of day
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

function populateEditForm(patient) {
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
  const procedureItem = document.createElement("div");
  procedureItem.className = "procedure-item";
  procedureItem.dataset.procedureId = editProcedureCounter;

  const procedureName = existingProcedure
    ? existingProcedure.name || existingProcedure.procedure || ""
    : "";
  const procedurePrice = existingProcedure
    ? existingProcedure.price || existingProcedure.finalAmount || 0
    : 0;

  procedureItem.innerHTML = `
    <div class="procedure-item-header">
      <span class="procedure-number">Procedure ${
        editProcedureCounter + 1
      }</span>
      <button type="button" class="remove-procedure-btn" onclick="removeEditProcedureItem(${editProcedureCounter})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="procedure-fields">
      <div class="form-group">
        <input type="text" name="edit-procedure-name-${editProcedureCounter}" placeholder="Procedure name" value="${procedureName}" oninput="updateEditTotalAmount()" />
      </div>
      <div class="form-group">
        <input type="number" name="edit-procedure-price-${editProcedureCounter}" placeholder="Price (SAR)" step="0.01" min="0" value="${procedurePrice}" oninput="updateEditTotalAmount()" />
      </div>
    </div>
  `;

  proceduresList.appendChild(procedureItem);
  editProcedureCounter++;
  updateEditTotalAmount();
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
    const priceInput = item.querySelector('input[type="number"]');
    if (priceInput && priceInput.value) {
      total += parseFloat(priceInput.value) || 0;
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
    const nameInput = item.querySelector('input[type="text"]');
    const priceInput = item.querySelector('input[type="number"]');

    if (nameInput && nameInput.value.trim()) {
      procedures.push({
        name: nameInput.value.trim(),
        price: parseFloat(priceInput.value) || 0,
        finalAmount: parseFloat(priceInput.value) || 0,
      });
    }
  });

  return procedures;
}
