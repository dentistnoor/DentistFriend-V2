document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('signup-form');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const doctorName = document.getElementById('signup-doctor-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value.trim();
        const sheetsUrl = document.getElementById('signup-sheets-url').value.trim();
        
        if (doctorName && email && password && sheetsUrl) {
            // Store user info in localStorage
            localStorage.setItem('userInfo', JSON.stringify({
                doctorName: doctorName,
                email: email,
                password: password,
                sheetsUrl: sheetsUrl,
                signupTime: new Date().toISOString()
            }));
            
            // Navigate to sign in page
            window.location.href = 'signin.html';
        }
    });
}); 