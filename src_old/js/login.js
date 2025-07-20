document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const doctorName = document.getElementById('doctor-name').value.trim();
        const doctorEmail = document.getElementById('doctor-email').value.trim();
        
        if (doctorName && doctorEmail) {
            // Store doctor info in localStorage
            localStorage.setItem('doctorInfo', JSON.stringify({
                name: doctorName,
                email: doctorEmail,
                loginTime: new Date().toISOString()
            }));
            
            // Navigate to main dashboard
            window.location.href = 'dashboard.html';
        }
    });
    
    // Check if doctor is already logged in
    const doctorInfo = localStorage.getItem('doctorInfo');
    if (doctorInfo) {
        const doctor = JSON.parse(doctorInfo);
        document.getElementById('doctor-name').value = doctor.name;
        document.getElementById('doctor-email').value = doctor.email;
    }
});
