import {
  checkAuth,
  setupSidebar,
  showSuccess,
  showError,
  getCurrentUser,
  setupDatePicker,
  formatDateToDDMMYYYY,
} from "./common.js";

let currentPeriod = "all";
let patientsData = [];
let charts = {};

document.addEventListener("DOMContentLoaded", function () {
  checkAuth().then(() => {
    setupSidebar();
    setupEventListeners();
    setupAnalyticsDatePickers();
    loadAnalyticsData();
  });
});

function setupEventListeners() {
  // Analytics filter buttons
  const presetButtons = document.querySelectorAll(".analytics-preset-btn");
  presetButtons.forEach((button) => {
    button.addEventListener("click", handlePresetFilter);
  });

  // Clear filters
  const clearBtn = document.getElementById("clearAnalyticsFilters");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearFilters);
  }
}

function setupAnalyticsDatePickers() {
  // Setup "From" date picker
  setupDatePicker({
    triggerId: "analytics-from-date-trigger",
    dropdownId: "analytics-from-calendar",
    displayId: "analytics-from-date-display",
    inputId: "analytics-from-date",
    prevMonthId: "analytics-from-prev-month",
    nextMonthId: "analytics-from-next-month",
    titleId: "analytics-from-calendar-title",
    daysId: "analytics-from-calendar-days",
    onDateSelect: handleDateFilter,
  });

  // Setup "To" date picker
  setupDatePicker({
    triggerId: "analytics-to-date-trigger",
    dropdownId: "analytics-to-calendar",
    displayId: "analytics-to-date-display",
    inputId: "analytics-to-date",
    prevMonthId: "analytics-to-prev-month",
    nextMonthId: "analytics-to-next-month",
    titleId: "analytics-to-calendar-title",
    daysId: "analytics-to-calendar-days",
    onDateSelect: handleDateFilter,
  });
}

function handlePresetFilter(e) {
  const range = e.target.dataset.range;

  // Update active button
  document.querySelectorAll(".analytics-preset-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  e.target.classList.add("active");

  // Clear date inputs
  const fromDateInput = document.getElementById("analytics-from-date");
  const toDateInput = document.getElementById("analytics-to-date");
  const fromDateDisplay = document.getElementById(
    "analytics-from-date-display"
  );
  const toDateDisplay = document.getElementById("analytics-to-date-display");

  if (range === "today") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const displayDate = `${dd}/${mm}/${yyyy}`;
    if (fromDateInput) fromDateInput.value = isoDate;
    if (toDateInput) toDateInput.value = isoDate;
    if (fromDateDisplay) fromDateDisplay.textContent = displayDate;
    if (toDateDisplay) toDateDisplay.textContent = displayDate;
  } else {
    if (fromDateInput) fromDateInput.value = "";
    if (toDateInput) toDateInput.value = "";
    if (fromDateDisplay) fromDateDisplay.textContent = "dd/mm/yyyy";
    if (toDateDisplay) toDateDisplay.textContent = "dd/mm/yyyy";
  }

  currentPeriod = range;
  updateAnalytics();
}

function handleDateFilter() {
  const fromDateInput = document.getElementById("analytics-from-date");
  const toDateInput = document.getElementById("analytics-to-date");

  // Remove active state from preset buttons
  document.querySelectorAll(".analytics-preset-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  currentPeriod = "custom";
  updateAnalytics();
}

function clearFilters() {
  // Clear date inputs
  const fromDateInput = document.getElementById("analytics-from-date");
  const toDateInput = document.getElementById("analytics-to-date");
  if (fromDateInput) fromDateInput.value = "";
  if (toDateInput) toDateInput.value = "";

  // Reset display text
  const fromDateDisplay = document.getElementById(
    "analytics-from-date-display"
  );
  const toDateDisplay = document.getElementById("analytics-to-date-display");
  if (fromDateDisplay) fromDateDisplay.textContent = "dd/mm/yyyy";
  if (toDateDisplay) toDateDisplay.textContent = "dd/mm/yyyy";

  // Set to "All Time"
  document.querySelectorAll(".analytics-preset-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector('[data-range="all"]').classList.add("active");

  currentPeriod = "all";
  updateAnalytics();
}

function loadAnalyticsData() {
  const storedPatients = localStorage.getItem("patients");
  if (storedPatients) {
    patientsData = JSON.parse(storedPatients);
  }

  // Initialize charts first, then update analytics
  initializeCharts();
  updateAnalytics();
}

function updateAnalytics() {
  const filteredData = filterDataByPeriod(patientsData, currentPeriod);
  updateMetrics(filteredData);
  updateCharts(filteredData);
}

function parseLocalDate(dateStr) {
  // dateStr: 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function filterDataByPeriod(data, period) {
  if (period === "all") return data;

  const now = new Date();
  let cutoffDate;

  if (period === "custom") {
    const fromDateInput = document.getElementById("analytics-from-date");
    const toDateInput = document.getElementById("analytics-to-date");

    const fromDate = fromDateInput.value
      ? parseLocalDate(fromDateInput.value)
      : null;
    const toDate = toDateInput.value ? parseLocalDate(toDateInput.value) : null;

    return data.filter((patient) => {
      const visitDate = parseLocalDate(patient.visitDate);
      // For fromDate: visit should be >= fromDate (start of day)
      const fromMatch = !fromDate || visitDate >= fromDate;
      // For toDate: visit should be <= toDate (end of day)
      let toMatch = true;
      if (toDate) {
        const toDateEndOfDay = new Date(toDate);
        toDateEndOfDay.setHours(23, 59, 59, 999); // End of day
        toMatch = visitDate <= toDateEndOfDay;
      }
      return fromMatch && toMatch;
    });
  } else {
    const daysAgo = parseInt(period);
    cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return data.filter((patient) => {
      const visitDate = parseLocalDate(patient.visitDate);
      return visitDate >= cutoffDate;
    });
  }
}

function updateMetrics(data) {
  // Calculate metrics
  const totalPatients = data.length;
  const cashPatients = data.filter((p) => p.patientType === "cash").length;
  const insurancePatients = data.filter(
    (p) => p.patientType === "insurance"
  ).length;

  const totalCollection = data.reduce(
    (sum, p) => sum + (p.totalAmount || 0),
    0
  );
  const cashCollection = data
    .filter((p) => p.patientType === "cash")
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const insuranceCollection = data
    .filter((p) => p.patientType === "insurance")
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  // Update DOM
  document.getElementById("total-patients").textContent = totalPatients;
  document.getElementById("cash-patients").textContent = cashPatients;
  document.getElementById("insurance-patients").textContent = insurancePatients;
  document.getElementById(
    "total-collection"
  ).textContent = `SAR ${totalCollection.toFixed(2)}`;
  document.getElementById(
    "cash-collection"
  ).textContent = `SAR ${cashCollection.toFixed(2)}`;
  document.getElementById(
    "insurance-collection"
  ).textContent = `SAR ${insuranceCollection.toFixed(2)}`;
}

function initializeCharts() {
  // Patient Type Distribution Chart
  const patientTypeCtx = document.getElementById("patientTypeChart");
  if (patientTypeCtx) {
    charts.patientType = new Chart(patientTypeCtx, {
      type: "doughnut",
      data: {
        labels: ["Cash", "Insurance"],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ["#f59e0b", "#8b5cf6"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  // Gender Distribution Chart
  const genderCtx = document.getElementById("genderChart");
  if (genderCtx) {
    charts.gender = new Chart(genderCtx, {
      type: "doughnut",
      data: {
        labels: ["Male", "Female"],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ["#3b82f6", "#ec4899"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  // Age Group Distribution Chart
  const ageGroupCtx = document.getElementById("ageGroupChart");
  if (ageGroupCtx) {
    charts.ageGroup = new Chart(ageGroupCtx, {
      type: "bar",
      data: {
        labels: ["0-18", "19-30", "31-50", "51-70", "70+"],
        datasets: [
          {
            label: "Patients",
            data: [0, 0, 0, 0, 0],
            backgroundColor: "#10b981",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  // Revenue Trend Chart
  const revenueCtx = document.getElementById("revenueChart");
  if (revenueCtx) {
    charts.revenue = new Chart(revenueCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Revenue",
            data: [],
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "SAR " + value.toFixed(2);
              },
            },
          },
        },
      },
    });
  }

  // Popular Procedures Chart
  const proceduresCtx = document.getElementById("proceduresChart");
  if (proceduresCtx) {
    charts.procedures = new Chart(proceduresCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Count",
            data: [],
            backgroundColor: "#8b5cf6",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  // Popular Insurance Chart
  const insuranceCtx = document.getElementById("insuranceChart");
  if (insuranceCtx) {
    charts.insurance = new Chart(insuranceCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Patients",
            data: [],
            backgroundColor: "#8b5cf6",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }
}

function updateCharts(data) {
  updatePatientTypeChart(data);
  updateGenderChart(data);
  updateAgeGroupChart(data);
  updateRevenueChart(data);
  updateProceduresChart(data);
  updateInsuranceChart(data);
}

function updatePatientTypeChart(data) {
  if (!charts.patientType) return;

  const cashCount = data.filter((p) => p.patientType === "cash").length;
  const insuranceCount = data.filter(
    (p) => p.patientType === "insurance"
  ).length;

  charts.patientType.data.datasets[0].data = [cashCount, insuranceCount];
  charts.patientType.update();
}

function updateGenderChart(data) {
  if (!charts.gender) return;

  const maleCount = data.filter((p) => p.patientGender === "male").length;
  const femaleCount = data.filter((p) => p.patientGender === "female").length;

  charts.gender.data.datasets[0].data = [maleCount, femaleCount];
  charts.gender.update();
}

function updateAgeGroupChart(data) {
  if (!charts.ageGroup) return;

  const ageGroups = [0, 0, 0, 0, 0]; // 0-18, 19-30, 31-50, 51-70, 70+

  data.forEach((patient) => {
    const age = parseInt(patient.patientAge);
    if (age <= 18) ageGroups[0]++;
    else if (age <= 30) ageGroups[1]++;
    else if (age <= 50) ageGroups[2]++;
    else if (age <= 70) ageGroups[3]++;
    else ageGroups[4]++;
  });

  charts.ageGroup.data.datasets[0].data = ageGroups;
  charts.ageGroup.update();
}

function updateRevenueChart(data) {
  if (!charts.revenue) return;
  // Group by date and calculate daily revenue
  const dailyRevenue = {};
  data.forEach((patient) => {
    const date = patient.visitDate;
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = 0;
    }
    dailyRevenue[date] += patient.totalAmount || 0;
  });
  // Sort by date
  const sortedDates = Object.keys(dailyRevenue).sort();
  const revenueData = sortedDates.map((date) => dailyRevenue[date]);
  charts.revenue.data.labels = sortedDates.map((date) => {
    return formatDateToDDMMYYYY(parseLocalDate(date));
  });
  charts.revenue.data.datasets[0].data = revenueData;
  charts.revenue.update();
}

function updateProceduresChart(data) {
  if (!charts.procedures) return;

  // Count procedure occurrences
  const procedureCounts = {};
  data.forEach((patient) => {
    if (patient.procedures) {
      patient.procedures.forEach((proc) => {
        if (!procedureCounts[proc.name]) {
          procedureCounts[proc.name] = 0;
        }
        procedureCounts[proc.name]++;
      });
    }
  });

  // Sort by count and get top 10
  const sortedProcedures = Object.entries(procedureCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const procedureNames = sortedProcedures.map(([name]) => name);
  const procedureCountsArray = sortedProcedures.map(([, count]) => count);

  charts.procedures.data.labels = procedureNames;
  charts.procedures.data.datasets[0].data = procedureCountsArray;
  charts.procedures.update();
}

function updateInsuranceChart(data) {
  if (!charts.insurance) return;
  // Count insurance occurrences
  const insuranceCounts = {};
  data.forEach((patient) => {
    if (patient.insuranceCompany) {
      if (!insuranceCounts[patient.insuranceCompany]) {
        insuranceCounts[patient.insuranceCompany] = 0;
      }
      insuranceCounts[patient.insuranceCompany]++;
    }
  });
  const sorted = Object.entries(insuranceCounts).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([name]) => name);
  const counts = sorted.map(([, count]) => count);
  charts.insurance.data.labels = labels;
  charts.insurance.data.datasets[0].data = counts;
  charts.insurance.update();
}
