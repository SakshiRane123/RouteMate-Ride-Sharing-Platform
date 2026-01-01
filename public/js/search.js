// Set minimum date to today for date filter
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        
        // If no date is set, don't show past dates in the picker
        if (!dateInput.value) {
            dateInput.value = today;
        }
    }
});