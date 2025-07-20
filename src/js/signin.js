import {
  auth,
  db,
  signInWithEmailAndPassword,
  getDoc,
  doc,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("signin-form");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("signin-email").value.trim();
    const password = document.getElementById("signin-password").value.trim();

    if (email && password) {
      const submitBtn = form.querySelector(".login-btn");
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = "<span>Signing In...</span>";
      submitBtn.disabled = true;

      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        let userData = null;
        try {
          const doctorDoc = await getDoc(doc(db, "doctors", user.uid));
          if (doctorDoc.exists()) {
            userData = doctorDoc.data().doctor; // Access the 'doctor' key
          }
        } catch (firestoreError) {
          console.warn(
            "Could not fetch doctor data from Firestore:",
            firestoreError
          );
          // Continue with basic user data
        }

        localStorage.setItem(
          "userInfo",
          JSON.stringify({
            uid: user.uid,
            email: userData?.email || user.email,
            doctorName: userData?.doctorName || "Doctor",
            sheetsUrl: userData?.sheetsUrl || "",
          })
        );

        showSuccess("Sign in successful! Redirecting to dashboard...");

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } catch (error) {
        console.error("Error signing in:", error);
        let errorMessage = "Failed to sign in. Please try again.";

        if (error.code === "auth/user-not-found") {
          errorMessage = "No account found with this email address.";
        } else if (error.code === "auth/wrong-password") {
          errorMessage = "Incorrect password. Please try again.";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Please enter a valid email address.";
        } else if (error.code === "auth/too-many-requests") {
          errorMessage = "Too many failed attempts. Please try again later.";
        }

        showError(errorMessage);

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } else {
      showError("Please fill in all fields");
    }
  });
});

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
