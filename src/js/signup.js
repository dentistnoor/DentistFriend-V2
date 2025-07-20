import {
  auth,
  db,
  createUserWithEmailAndPassword,
  setDoc,
  doc,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("signup-form");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const doctorName = document
      .getElementById("signup-doctor-name")
      .value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const sheetsUrl = document.getElementById("signup-sheets-url").value.trim();

    if (doctorName && email && password && sheetsUrl) {
      const submitBtn = form.querySelector(".login-btn");
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = "<span>Creating Account...</span>";
      submitBtn.disabled = true;

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        try {
          await setDoc(doc(db, "doctors", user.uid), {
            doctor: {
              doctorName: doctorName,
              email: email,
              sheetsUrl: sheetsUrl,
              uid: user.uid,
            },
          });
        } catch (firestoreError) {
          console.error("Firestore error:", firestoreError);
          // Continue anyway - user is created, just Firestore failed
        }

        showSuccess("Account created successfully! Redirecting to sign in...");

        setTimeout(() => {
          window.location.href = "signin.html";
        }, 2000);
      } catch (error) {
        console.error("Error creating account:", error);
        let errorMessage = "Failed to create account. Please try again.";

        if (error.code === "auth/email-already-in-use") {
          errorMessage = "An account with this email already exists.";
        } else if (error.code === "auth/weak-password") {
          errorMessage = "Password should be at least 6 characters long.";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Please enter a valid email address.";
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
