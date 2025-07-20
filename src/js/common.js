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

// Common date formatting
export function formatDateToDDMMYYYY(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}
