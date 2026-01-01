// This script handles the modal behavior and form interactions
document.addEventListener('DOMContentLoaded', function() {
    // Function to show a Bootstrap toast notification
    function showToast(message, type = 'success') {
        // You can add toast notifications later if you want
        console.log(`${type}: ${message}`);
    }

    // Check if there's a success message in the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        showToast(message, 'success');
    }

    // Handle form submissions with basic validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const inputs = this.querySelectorAll('input[required]');
            let valid = true;
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    valid = false;
                    input.classList.add('is-invalid');
                } else {
                    input.classList.remove('is-invalid');
                }
            });

            if (!valid) {
                e.preventDefault();
                showToast('Please fill in all required fields', 'error');
            }
        });
    });

    // Clear error styles when user starts typing
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('is-invalid');
        });
    });
});