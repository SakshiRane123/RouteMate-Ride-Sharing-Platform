// Handle booking button clicks
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners to all "Book This Ride" buttons
    const bookButtons = document.querySelectorAll('.book-ride-btn');
    
    bookButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const rideId = this.getAttribute('data-ride-id');
            const seatsAvailable = parseInt(this.getAttribute('data-seats-available'));
            
            // Ask user how many seats they want to book
            let seatsToBook = 1;
            if (seatsAvailable > 1) {
                const input = prompt(`How many seats would you like to book? (1-${seatsAvailable})`, '1');
                if (input === null) return; // User cancelled
                seatsToBook = parseInt(input) || 1;
                
                if (seatsToBook < 1 || seatsToBook > seatsAvailable) {
                    alert(`Please enter a number between 1 and ${seatsAvailable}`);
                    return;
                }
            }

            // Show loading state
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Booking...';
            this.disabled = true;

            try {
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ride_id: rideId,
                        seats_booked: seatsToBook
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Show success message
                    alert(`Success! ${result.message}\nBooking ID: ${result.bookingId}`);
                    
                    // Update the UI - disable button and update seat count
                    this.classList.remove('btn-primary');
                    this.classList.add('btn-success');
                    this.innerHTML = '<i class="bi bi-check-circle"></i> Booked!';
                    
                    // Update the seats available display
                    const seatsBadge = this.closest('.card').querySelector('.seats-badge');
                    if (seatsBadge) {
                        const newSeats = result.seatsRemaining;
                        seatsBadge.textContent = newSeats;
                        seatsBadge.className = `badge bg-${newSeats > 0 ? 'success' : 'danger'} seats-badge`;
                        
                        // If no seats left, disable all book buttons for this ride
                        if (newSeats === 0) {
                            document.querySelectorAll(`.book-ride-btn[data-ride-id="${rideId}"]`).forEach(btn => {
                                btn.disabled = true;
                                btn.innerHTML = 'Fully Booked';
                            });
                        }
                    }
                    
                } else {
                    alert(`Error: ${result.error}`);
                    // Reset button state
                    this.innerHTML = 'Book This Ride';
                    this.disabled = false;
                }

            } catch (error) {
                console.error('Booking error:', error);
                alert('Failed to book ride. Please try again.');
                // Reset button state
                this.innerHTML = 'Book This Ride';
                this.disabled = false;
            }
        });
    });
});