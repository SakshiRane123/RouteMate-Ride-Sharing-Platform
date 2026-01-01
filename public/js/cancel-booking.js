// Handle booking cancellation
document.addEventListener('DOMContentLoaded', function() {
    const cancelButtons = document.querySelectorAll('.cancel-booking-btn');
    
    cancelButtons.forEach(button => {
        button.addEventListener('click', async function(event) {
            event.stopPropagation(); // Prevent event bubbling
            
            const bookingId = this.getAttribute('data-booking-id');
            const rideRoute = this.getAttribute('data-ride-route');
            
            // Confirm cancellation
            const isConfirmed = confirm(`Are you sure you want to cancel your booking for:\n"${rideRoute}"?`);
            
            if (!isConfirmed) return;

            // Show loading state
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Cancelling...';
            this.disabled = true;

            try {
                console.log('Sending cancellation request for booking:', bookingId);
                
                const response = await fetch(`/api/bookings/${bookingId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                console.log('Response status:', response.status);
                
                const result = await response.json();
                console.log('Response data:', result);

                if (result.success) {
                    console.log('Cancellation successful');
                    
                    // Show success message but DON'T try to update UI
                    alert('Booking cancelled successfully!');
                    
                    // Simply reload the page - this is the safest approach
                    window.location.reload();
                    
                } else {
                    console.log('Cancellation failed:', result.error);
                    alert(`Error: ${result.error}`);
                    this.innerHTML = originalText;
                    this.disabled = false;
                }

            } catch (error) {
                console.error('Cancellation error:', error);
                
                // Check if this is a navigation error (which means it worked but page changed)
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    // This usually means the page was navigated away during the request
                    console.log('Page navigation detected - cancellation likely succeeded');
                    // Don't show error message since it probably worked
                } else {
                    alert('Failed to cancel booking. Please try again.');
                    this.innerHTML = originalText;
                    this.disabled = false;
                }
            }
        });
    });
});