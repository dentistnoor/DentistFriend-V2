import { auth, signOut, onAuthStateChanged } from "./firebase-config.js";

let currentUser = null;

// Common authentication check
export function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;

        const userInfo = localStorage.getItem("userInfo");
        if (userInfo) {
          const userData = JSON.parse(userInfo);
          updateUserDisplay(userData.doctorName || "Doctor", userData.email);
        } else {
          updateUserDisplay(user.displayName || "Doctor", user.email);
        }
        resolve(user);
      } else {
        localStorage.removeItem("userInfo");
        window.location.href = "signin.html";
        resolve(null);
      }
    });
  });
}

// Update user display in header
function updateUserDisplay(doctorName, email) {
  const doctorNameElement = document.getElementById("doctor-name");
  const doctorEmailElement = document.getElementById("doctor-email");

  if (doctorNameElement) {
    doctorNameElement.textContent = doctorName;
  }
  if (doctorEmailElement) {
    doctorEmailElement.textContent = email;
  }
}

// Common logout function
export function logout() {
  signOut(auth)
    .then(() => {
      localStorage.removeItem("userInfo");
      window.location.href = "signin.html";
    })
    .catch((error) => {
      showError("Error signing out. Please try again.");
    });
}

// Make logout available globally
window.logout = logout;

// Common sidebar setup
export function setupSidebar() {
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

// Common success message
export function showSuccess(message) {
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

// Common error message
export function showError(message) {
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

// Get current user
export function getCurrentUser() {
  return currentUser;
}

// Common date formatting
export function formatDateToDDMMYYYY(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Reusable date picker setup function
export function setupDatePicker(config) {
  const {
    triggerId,
    dropdownId,
    displayId,
    inputId,
    prevMonthId,
    nextMonthId,
    titleId,
    daysId,
    onDateSelect,
  } = config;

  const datePickerTrigger = document.getElementById(triggerId);
  const calendarDropdown = document.getElementById(dropdownId);
  const selectedDateDisplay = document.getElementById(displayId);
  const dateInput = document.getElementById(inputId);
  const prevMonthBtn = document.getElementById(prevMonthId);
  const nextMonthBtn = document.getElementById(nextMonthId);
  const calendarTitle = document.getElementById(titleId);
  const calendarDays = document.getElementById(daysId);

  if (!datePickerTrigger || !calendarDropdown) {
    return; // Exit if elements don't exist
  }

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

    // Call the callback function if provided
    if (onDateSelect && typeof onDateSelect === "function") {
      onDateSelect(date);
    }
  }

  function updateSelectedDate(date) {
    const formattedDate = formatDateToDDMMYYYY(date);

    selectedDateDisplay.textContent = formattedDate;
    if (dateInput) {
      dateInput.value = formatDateToYYYYMMDDLocal(date);
    }
  }

  // Event listeners
  datePickerTrigger.addEventListener("click", toggleDropdown);

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

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !datePickerTrigger.contains(e.target) &&
      !calendarDropdown.contains(e.target)
    ) {
      closeDropdown();
    }
  });
}

// Utility: format Date as YYYY-MM-DD in local time
export function formatDateToYYYYMMDDLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
