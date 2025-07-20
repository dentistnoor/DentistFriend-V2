document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("signin-form");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("signin-email").value.trim();
    const password = document.getElementById("signin-password").value.trim();

    if (email && password) {
      // Store user info in localStorage
      localStorage.setItem(
        "userInfo",
        JSON.stringify({
          email: email,
          loginTime: new Date().toISOString(),
        })
      );

      // Navigate to main dashboard
      window.location.href = "dashboard.html";
    }
  });

  // Check if user is already logged in
  const userInfo = localStorage.getItem("userInfo");
  if (userInfo) {
    const user = JSON.parse(userInfo);
    document.getElementById("signin-email").value = user.email;
  }
});
